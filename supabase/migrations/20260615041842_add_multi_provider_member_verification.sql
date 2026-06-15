-- Add multi-provider sign-in evidence and moderator-reviewed gallery access.
-- Social/phone auth proves account control only; Discord role checks remain the
-- only automatic member verification path.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table if not exists public.member_auth_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_subject text not null,
  provider_email text,
  provider_email_verified boolean not null default false,
  provider_phone text,
  provider_phone_verified boolean not null default false,
  display_label text,
  active boolean not null default true,
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_auth_identities_provider_check
    check (provider in ('discord', 'phone', 'apple', 'facebook', 'google', 'kakao', 'twitch', 'spotify')),
  constraint member_auth_identities_provider_subject_check
    check (char_length(trim(provider_subject)) between 1 and 255),
  constraint member_auth_identities_display_label_check
    check (display_label is null or char_length(display_label) <= 120),
  constraint member_auth_identities_provider_email_check
    check (provider_email is null or char_length(provider_email) <= 320),
  constraint member_auth_identities_provider_phone_check
    check (provider_phone is null or char_length(provider_phone) <= 40),
  constraint member_auth_identities_user_provider_subject_key
    unique (user_id, provider, provider_subject)
);

create index if not exists member_auth_identities_user_active_idx
on public.member_auth_identities (user_id, active, provider);

create table if not exists public.member_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  gallery_access_status text not null default 'pending_review',
  gallery_access_method text,
  gallery_access_verified_at timestamptz,
  gallery_access_expires_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  redacted_reason text,
  last_identity_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_verifications_gallery_access_status_check
    check (gallery_access_status in ('pending_review', 'approved', 'rejected', 'revoked', 'expired')),
  constraint member_verifications_gallery_access_method_check
    check (
      gallery_access_method is null
      or gallery_access_method in ('manual_review', 'phone', 'apple', 'facebook', 'google', 'kakao', 'twitch', 'spotify')
    ),
  constraint member_verifications_redacted_reason_check
    check (redacted_reason is null or char_length(redacted_reason) <= 500)
);

create index if not exists member_verifications_gallery_access_idx
on public.member_verifications (gallery_access_status, gallery_access_expires_at, user_id);

alter table public.member_auth_identities enable row level security;
alter table public.member_verifications enable row level security;

revoke all on table public.member_auth_identities from public, anon, authenticated;
revoke all on table public.member_verifications from public, anon, authenticated;
grant all on table public.member_auth_identities to service_role;
grant all on table public.member_verifications to service_role;

drop trigger if exists set_member_auth_identities_updated_at on public.member_auth_identities;
create trigger set_member_auth_identities_updated_at
before update on public.member_auth_identities
for each row
execute function public.set_updated_at();

drop trigger if exists set_member_verifications_updated_at on public.member_verifications;
create trigger set_member_verifications_updated_at
before update on public.member_verifications
for each row
execute function public.set_updated_at();

create or replace function private.member_has_gallery_upload_access(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.member_profiles as profile
    where profile.id = target_user_id
      and profile.member_status = 'active'
      and (
        (
          profile.has_required_discord_roles is true
          and profile.discord_verified_at >= now() - interval '7 days'
        )
        or exists (
          select 1
          from public.member_verifications as verification
          where verification.user_id = target_user_id
            and verification.gallery_access_status = 'approved'
            and verification.gallery_access_verified_at is not null
            and (
              verification.gallery_access_expires_at is null
              or verification.gallery_access_expires_at >= now()
            )
        )
      )
  );
$$;

revoke all on function private.member_has_gallery_upload_access(uuid) from public, anon;
grant execute on function private.member_has_gallery_upload_access(uuid) to authenticated, service_role;

drop policy if exists "Active verified users can create their own gallery submissions" on public.gallery_submissions;
create policy "Active verified users can create their own gallery submissions"
on public.gallery_submissions
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and storage_bucket = 'member-gallery'
  and status = 'pending'
  and private.member_has_gallery_upload_access((select auth.uid()))
);

drop policy if exists "Members upload own gallery objects" on storage.objects;
create policy "Members upload own gallery objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'member-gallery'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.member_has_gallery_upload_access((select auth.uid()))
);

drop policy if exists "Members update own gallery objects" on storage.objects;
create policy "Members update own gallery objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'member-gallery'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.member_has_gallery_upload_access((select auth.uid()))
)
with check (
  bucket_id = 'member-gallery'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.member_has_gallery_upload_access((select auth.uid()))
);

drop policy if exists "Members delete own gallery objects" on storage.objects;
create policy "Members delete own gallery objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'member-gallery'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.member_has_gallery_upload_access((select auth.uid()))
);
