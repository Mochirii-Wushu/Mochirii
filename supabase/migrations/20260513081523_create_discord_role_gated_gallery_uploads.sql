create extension if not exists pgcrypto with schema extensions;

create table if not exists public.member_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  discord_user_id text unique,
  discord_username text,
  discord_global_name text,
  discord_avatar_url text,
  discord_roles text[] not null default '{}',
  has_required_discord_roles boolean not null default false,
  discord_member_pending boolean,
  discord_verified_at timestamptz,
  discord_checked_at timestamptz,
  display_name text not null default 'Mochirii Member',
  game_uid text,
  discord_handle text,
  region text,
  timezone text,
  avatar_url text,
  bio text,
  member_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.member_profiles
  add column if not exists discord_user_id text,
  add column if not exists discord_username text,
  add column if not exists discord_global_name text,
  add column if not exists discord_avatar_url text,
  add column if not exists discord_roles text[] not null default '{}',
  add column if not exists has_required_discord_roles boolean not null default false,
  add column if not exists discord_member_pending boolean,
  add column if not exists discord_verified_at timestamptz,
  add column if not exists discord_checked_at timestamptz,
  add column if not exists display_name text not null default 'Mochirii Member',
  add column if not exists game_uid text,
  add column if not exists discord_handle text,
  add column if not exists region text,
  add column if not exists timezone text,
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists member_status text not null default 'pending',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.member_profiles
set
  display_name = coalesce(nullif(trim(display_name), ''), 'Mochirii Member'),
  discord_roles = coalesce(discord_roles, '{}'),
  has_required_discord_roles = coalesce(has_required_discord_roles, false),
  member_status = coalesce(nullif(trim(member_status), ''), 'pending'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.member_profiles
  alter column display_name set default 'Mochirii Member',
  alter column display_name set not null,
  alter column discord_roles set default '{}',
  alter column discord_roles set not null,
  alter column has_required_discord_roles set default false,
  alter column has_required_discord_roles set not null,
  alter column member_status set default 'pending',
  alter column member_status set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'member_profiles_discord_user_id_key'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_discord_user_id_key unique (discord_user_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'member_profiles_display_name_length'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_display_name_length
      check (char_length(display_name) between 2 and 40) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'member_profiles_game_uid_length'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_game_uid_length
      check (game_uid is null or char_length(game_uid) <= 40) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'member_profiles_discord_handle_length'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_discord_handle_length
      check (discord_handle is null or char_length(discord_handle) <= 80) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'member_profiles_region_length'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_region_length
      check (region is null or char_length(region) <= 80) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'member_profiles_timezone_length'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_timezone_length
      check (timezone is null or char_length(timezone) <= 80) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'member_profiles_avatar_url_length'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_avatar_url_length
      check (avatar_url is null or char_length(avatar_url) <= 500) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'member_profiles_bio_length'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_bio_length
      check (bio is null or char_length(bio) <= 500) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'member_profiles_discord_user_id_length'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_discord_user_id_length
      check (discord_user_id is null or char_length(discord_user_id) <= 40) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'member_profiles_discord_username_length'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_discord_username_length
      check (discord_username is null or char_length(discord_username) <= 80) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'member_profiles_discord_global_name_length'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_discord_global_name_length
      check (discord_global_name is null or char_length(discord_global_name) <= 100) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'member_profiles_discord_avatar_url_length'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_discord_avatar_url_length
      check (discord_avatar_url is null or char_length(discord_avatar_url) <= 500) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'member_profiles_member_status_check'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_member_status_check
      check (member_status in ('pending', 'active', 'suspended', 'archived')) not valid;
  end if;
end
$$;

create table if not exists public.gallery_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_bucket text not null default 'member-gallery',
  storage_path text not null,
  original_filename text,
  mime_type text not null,
  size_bytes bigint not null,
  title text,
  caption text,
  category text,
  status text not null default 'pending',
  rejection_reason text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gallery_submissions_bucket_path_key'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_bucket_path_key unique (storage_bucket, storage_path);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gallery_submissions_status_check'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_status_check
      check (status in ('pending', 'approved', 'rejected', 'archived')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gallery_submissions_mime_type_check'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_mime_type_check
      check (mime_type in ('image/jpeg', 'image/png', 'image/webp')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gallery_submissions_size_bytes_check'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_size_bytes_check
      check (size_bytes > 0 and size_bytes <= 5242880) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gallery_submissions_title_length'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_title_length
      check (title is null or char_length(title) <= 80) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gallery_submissions_caption_length'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_caption_length
      check (caption is null or char_length(caption) <= 300) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gallery_submissions_category_length'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_category_length
      check (category is null or char_length(category) <= 40) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gallery_submissions_storage_bucket_check'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_storage_bucket_check
      check (storage_bucket = 'member-gallery') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gallery_submissions_storage_path_owner_check'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_storage_path_owner_check
      check (storage_path like (user_id::text || '/%')) not valid;
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_member_profiles_updated_at on public.member_profiles;
create trigger set_member_profiles_updated_at
before update on public.member_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_gallery_submissions_updated_at on public.gallery_submissions;
create trigger set_gallery_submissions_updated_at
before update on public.gallery_submissions
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_member_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  identity_data jsonb := '{}'::jsonb;
  discord_id text;
  discord_username_value text;
  discord_global_name_value text;
  discord_avatar_value text;
  display_value text;
  email_prefix text;
begin
  select coalesce(i.identity_data, '{}'::jsonb)
  into identity_data
  from auth.identities as i
  where i.user_id = new.id
    and i.provider = 'discord'
  order by i.created_at desc
  limit 1;

  identity_data := coalesce(identity_data, '{}'::jsonb);

  discord_id := nullif(left(trim(coalesce(
    identity_data->>'provider_id',
    identity_data->>'sub',
    identity_data->>'id',
    new.raw_user_meta_data->>'provider_id',
    new.raw_user_meta_data->>'sub',
    new.raw_user_meta_data->>'id',
    ''
  )), 40), '');

  discord_username_value := nullif(left(trim(coalesce(
    identity_data->>'preferred_username',
    identity_data->>'user_name',
    identity_data->>'username',
    new.raw_user_meta_data->>'preferred_username',
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'username',
    ''
  )), 80), '');

  discord_global_name_value := nullif(left(trim(coalesce(
    identity_data->>'global_name',
    identity_data->>'full_name',
    identity_data->>'name',
    new.raw_user_meta_data->>'global_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    ''
  )), 100), '');

  discord_avatar_value := nullif(left(trim(coalesce(
    identity_data->>'avatar_url',
    identity_data->>'picture',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture',
    ''
  )), 500), '');

  email_prefix := nullif(left(trim(split_part(coalesce(new.email, ''), '@', 1)), 40), '');
  display_value := left(trim(coalesce(
    discord_global_name_value,
    discord_username_value,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    email_prefix,
    'Mochirii Member'
  )), 40);

  if char_length(display_value) < 2 then
    display_value := 'Mochirii Member';
  end if;

  insert into public.member_profiles (
    id,
    discord_user_id,
    discord_username,
    discord_global_name,
    discord_avatar_url,
    display_name,
    avatar_url,
    discord_handle
  )
  values (
    new.id,
    discord_id,
    discord_username_value,
    discord_global_name_value,
    discord_avatar_value,
    display_value,
    discord_avatar_value,
    discord_username_value
  )
  on conflict (id) do update
  set
    discord_user_id = coalesce(excluded.discord_user_id, public.member_profiles.discord_user_id),
    discord_username = coalesce(excluded.discord_username, public.member_profiles.discord_username),
    discord_global_name = coalesce(excluded.discord_global_name, public.member_profiles.discord_global_name),
    discord_avatar_url = coalesce(excluded.discord_avatar_url, public.member_profiles.discord_avatar_url),
    avatar_url = coalesce(public.member_profiles.avatar_url, excluded.avatar_url),
    discord_handle = coalesce(public.member_profiles.discord_handle, excluded.discord_handle),
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.handle_new_member_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_member_profile on auth.users;
create trigger on_auth_user_created_member_profile
after insert on auth.users
for each row
execute function public.handle_new_member_profile();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-gallery',
  'member-gallery',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

alter table public.member_profiles enable row level security;
alter table public.gallery_submissions enable row level security;

revoke all on table public.member_profiles from anon;
revoke all on table public.member_profiles from authenticated;
grant select on table public.member_profiles to authenticated;
grant update (
  display_name,
  game_uid,
  discord_handle,
  region,
  timezone,
  avatar_url,
  bio
) on table public.member_profiles to authenticated;
grant all on table public.member_profiles to service_role;

drop policy if exists "Users can read their own member profile" on public.member_profiles;
create policy "Users can read their own member profile"
on public.member_profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update their own editable member profile" on public.member_profiles;
create policy "Users can update their own editable member profile"
on public.member_profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke all on table public.gallery_submissions from anon;
revoke all on table public.gallery_submissions from authenticated;
grant select on table public.gallery_submissions to authenticated;
grant insert (
  user_id,
  storage_bucket,
  storage_path,
  original_filename,
  mime_type,
  size_bytes,
  title,
  caption,
  category
) on table public.gallery_submissions to authenticated;
grant update (
  title,
  caption,
  category
) on table public.gallery_submissions to authenticated;
grant all on table public.gallery_submissions to service_role;

drop policy if exists "Users can read their own gallery submissions" on public.gallery_submissions;
create policy "Users can read their own gallery submissions"
on public.gallery_submissions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Active verified users can create their own gallery submissions" on public.gallery_submissions;
create policy "Active verified users can create their own gallery submissions"
on public.gallery_submissions
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and storage_bucket = 'member-gallery'
  and status = 'pending'
  and exists (
    select 1
    from public.member_profiles as profile
    where profile.id = (select auth.uid())
      and profile.member_status = 'active'
      and profile.has_required_discord_roles is true
      and profile.discord_verified_at >= now() - interval '7 days'
  )
);

drop policy if exists "Users can update their own pending submission metadata" on public.gallery_submissions;
create policy "Users can update their own pending submission metadata"
on public.gallery_submissions
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and status = 'pending'
)
with check (
  (select auth.uid()) = user_id
  and status = 'pending'
);

revoke all on storage.objects from public;
revoke all on storage.objects from anon;
revoke all on storage.objects from authenticated;
grant select, insert, update, delete on storage.objects to authenticated;

drop policy if exists "Members upload own gallery objects" on storage.objects;
create policy "Members upload own gallery objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'member-gallery'
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

drop policy if exists "Members read own gallery objects" on storage.objects;
create policy "Members read own gallery objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'member-gallery'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Members update own gallery objects" on storage.objects;
create policy "Members update own gallery objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'member-gallery'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.member_profiles as profile
    where profile.id = (select auth.uid())
      and profile.member_status = 'active'
      and profile.has_required_discord_roles is true
      and profile.discord_verified_at >= now() - interval '7 days'
  )
)
with check (
  bucket_id = 'member-gallery'
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

drop policy if exists "Members delete own gallery objects" on storage.objects;
create policy "Members delete own gallery objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'member-gallery'
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
