-- Refine member profile identity, bio, and media boundaries.
-- Discord remains the identity source of truth; members can edit only safe profile fields.

alter table public.member_profiles
  drop constraint if exists member_profiles_bio_length;

alter table public.member_profiles
  add constraint member_profiles_bio_length
  check (bio is null or char_length(bio) <= 1000) not valid;

alter table public.member_profiles
  validate constraint member_profiles_bio_length;

update public.member_profiles
set discord_handle = nullif(left(trim(coalesce(discord_username, discord_global_name, '')), 80), '')
where discord_username is not null
  or discord_global_name is not null;

revoke update (discord_handle, avatar_url) on table public.member_profiles from authenticated;

grant update (
  display_name,
  game_uid,
  region,
  timezone,
  bio,
  profile_public_enabled
) on table public.member_profiles to authenticated;

alter table public.member_profile_media
  drop constraint if exists member_profile_media_size_check;

alter table public.member_profile_media
  add constraint member_profile_media_size_check
  check (
    size_bytes > 0
    and media_kind in ('avatar', 'banner')
    and size_bytes <= 52428800
  ) not valid;

alter table public.member_profile_media
  validate constraint member_profile_media_size_check;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-profile-media',
  'member-profile-media',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
