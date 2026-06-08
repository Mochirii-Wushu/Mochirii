create extension if not exists pgcrypto with schema extensions;

create or replace function public.mochirii_member_profile_slug(source_name text, source_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  base text;
begin
  base := lower(regexp_replace(coalesce(nullif(trim(source_name), ''), 'member'), '[^a-zA-Z0-9]+', '-', 'g'));
  base := trim(both '-' from base);
  if base = '' then
    base := 'member';
  end if;
  return left(base, 48) || '-' || left(replace(source_id::text, '-', ''), 8);
end;
$$;

alter table public.member_profiles
  add column if not exists profile_slug text,
  add column if not exists profile_public_enabled boolean not null default false,
  add column if not exists profile_published_at timestamptz;

update public.member_profiles
set profile_slug = public.mochirii_member_profile_slug(display_name, id)
where profile_slug is null or trim(profile_slug) = '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'member_profiles_profile_slug_key'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_profile_slug_key unique (profile_slug);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'member_profiles_profile_slug_format'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_profile_slug_format
      check (profile_slug ~ '^[a-z0-9][a-z0-9-]{1,63}$') not valid;
  end if;
end
$$;

alter table public.member_profiles
  alter column profile_slug set not null,
  alter column profile_public_enabled set default false,
  alter column profile_public_enabled set not null;

create or replace function public.set_member_profile_publication_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.profile_slug is null or trim(new.profile_slug) = '' then
    new.profile_slug := public.mochirii_member_profile_slug(new.display_name, new.id);
  end if;

  if new.profile_public_enabled is false then
    new.profile_published_at := null;
  elsif TG_OP = 'INSERT' then
    new.profile_published_at := coalesce(new.profile_published_at, now());
  elsif coalesce(old.profile_public_enabled, false) is false then
    new.profile_published_at := coalesce(new.profile_published_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists set_member_profile_publication_fields on public.member_profiles;
create trigger set_member_profile_publication_fields
before insert or update on public.member_profiles
for each row
execute function public.set_member_profile_publication_fields();

create table if not exists public.member_profile_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_bucket text not null default 'member-profile-media',
  storage_path text not null,
  original_filename text,
  media_kind text not null,
  mime_type text not null,
  size_bytes bigint not null,
  status text not null default 'pending',
  rejection_reason text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_profile_media_bucket_path_key unique (storage_bucket, storage_path),
  constraint member_profile_media_kind_check check (media_kind in ('avatar', 'banner')),
  constraint member_profile_media_status_check check (status in ('pending', 'approved', 'rejected', 'archived')),
  constraint member_profile_media_mime_type_check check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint member_profile_media_size_check check (
    size_bytes > 0
    and (
      (media_kind = 'avatar' and size_bytes <= 2097152)
      or (media_kind = 'banner' and size_bytes <= 5242880)
    )
  ),
  constraint member_profile_media_storage_bucket_check check (storage_bucket = 'member-profile-media'),
  constraint member_profile_media_storage_path_owner_check check (split_part(storage_path, '/', 1) = user_id::text)
);

drop trigger if exists set_member_profile_media_updated_at on public.member_profile_media;
create trigger set_member_profile_media_updated_at
before update on public.member_profile_media
for each row
execute function public.set_updated_at();

alter table public.member_profiles
  add column if not exists approved_avatar_media_id uuid references public.member_profile_media(id) on delete set null,
  add column if not exists approved_banner_media_id uuid references public.member_profile_media(id) on delete set null;

create index if not exists member_profiles_profile_public_idx
on public.member_profiles (profile_public_enabled, member_status, profile_slug);

create index if not exists member_profile_media_user_kind_status_idx
on public.member_profile_media (user_id, media_kind, status, created_at desc);

create table if not exists public.member_profile_media_events (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.member_profile_media(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint member_profile_media_events_action_check check (action in ('submitted', 'approved', 'rejected', 'archived'))
);

create index if not exists member_profile_media_events_media_idx
on public.member_profile_media_events (media_id, created_at desc);

alter table public.member_profile_media enable row level security;
alter table public.member_profile_media_events enable row level security;

revoke all on table public.member_profile_media from public;
revoke all on table public.member_profile_media from anon;
revoke all on table public.member_profile_media from authenticated;
grant select on table public.member_profile_media to authenticated;
grant all on table public.member_profile_media to service_role;

revoke all on table public.member_profile_media_events from public;
revoke all on table public.member_profile_media_events from anon;
revoke all on table public.member_profile_media_events from authenticated;
grant all on table public.member_profile_media_events to service_role;

grant update (profile_public_enabled) on table public.member_profiles to authenticated;

drop policy if exists "Members can read their own profile media" on public.member_profile_media;
create policy "Members can read their own profile media"
on public.member_profile_media
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "No direct member profile media event reads" on public.member_profile_media_events;
create policy "No direct member profile media event reads"
on public.member_profile_media_events
for select
to authenticated
using (false);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-profile-media',
  'member-profile-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members upload own profile media objects" on storage.objects;
create policy "Members upload own profile media objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'member-profile-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.member_profiles as profile
    where profile.id = (select auth.uid())
      and profile.member_status = 'active'
      and profile.has_required_discord_roles is true
      and profile.discord_verified_at >= now() - interval '7 days'
  )
);

drop policy if exists "Members read own profile media objects" on storage.objects;
create policy "Members read own profile media objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'member-profile-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
