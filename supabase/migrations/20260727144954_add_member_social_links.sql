-- Optional member-owned profile links.
--
-- This table is deliberately separate from public.social_accounts, which is
-- reserved for trusted Mochirii Social identity mappings. It stores URLs and
-- presentation state only: never provider credentials, access tokens, or
-- imported profile content.

create table if not exists public.member_social_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  display_label text not null,
  profile_url text not null,
  sort_order smallint not null default 0,
  is_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_social_links_provider_check check (
    provider in (
      'instagram',
      'facebook',
      'tiktok',
      'twitch',
      'youtube',
      'x',
      'bluesky',
      'mastodon',
      'spotify',
      'linkedin',
      'custom'
    )
  ),
  constraint member_social_links_display_label_check check (
    char_length(display_label) between 1 and 40
    and display_label !~ '[[:cntrl:]<>]'
  ),
  constraint member_social_links_profile_url_length_check check (
    char_length(profile_url) between 12 and 2048
  ),
  constraint member_social_links_sort_order_check check (
    sort_order between 0 and 32767
  )
);

create or replace function private.member_social_link_url_is_valid(
  link_provider text,
  link_url text
)
returns boolean
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select
    link_url = btrim(link_url)
    and link_url !~ '[[:space:][:cntrl:]\\]'
    and link_url !~ '[?#]'
    and link_url ~* '^https://'
    and case link_provider
      when 'instagram' then link_url ~* '^https://(www\.)?instagram\.com/[a-z0-9._]+/?$'
      when 'facebook' then link_url ~* '^https://(www\.)?facebook\.com/[a-z0-9._-]+/?$'
      when 'tiktok' then link_url ~* '^https://(www\.)?tiktok\.com/@[a-z0-9._-]+/?$'
      when 'twitch' then link_url ~* '^https://(www\.)?twitch\.tv/[a-z0-9_]+/?$'
      when 'youtube' then link_url ~* '^https://(www\.)?youtube\.com/(?:@[a-z0-9._-]+|channel/[a-z0-9_-]+|c/[a-z0-9._-]+|user/[a-z0-9._-]+)/?$'
      when 'x' then link_url ~* '^https://(www\.)?x\.com/[a-z0-9_]+/?$'
      when 'bluesky' then link_url ~* '^https://bsky\.app/profile/[a-z0-9.-]+/?$'
      when 'mastodon' then link_url ~* '^https://([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}/(?:@[a-z0-9._-]+|users/[a-z0-9._-]+)/?$'
      when 'spotify' then link_url ~* '^https://open\.spotify\.com/user/[a-z0-9]+/?$'
      when 'linkedin' then link_url ~* '^https://(www\.)?linkedin\.com/(?:in|company)/[a-z0-9._-]+/?$'
      when 'custom' then link_url ~* '^https://([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}(?:/[^[:space:]?#]*)?$'
      else false
    end;
$$;

revoke all on function private.member_social_link_url_is_valid(text, text) from public, anon;
grant execute on function private.member_social_link_url_is_valid(text, text) to authenticated, service_role;

alter table public.member_social_links
  drop constraint if exists member_social_links_profile_url_check;
alter table public.member_social_links
  add constraint member_social_links_profile_url_check
  check (private.member_social_link_url_is_valid(provider, profile_url));

create unique index if not exists member_social_links_user_url_key
on public.member_social_links (user_id, lower(profile_url));

create index if not exists member_social_links_owner_order_idx
on public.member_social_links (user_id, sort_order, created_at);

create index if not exists member_social_links_visible_member_idx
on public.member_social_links (user_id, sort_order)
where is_visible is true;

create or replace function private.enforce_member_social_link_limit()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if (
    select count(*)
    from public.member_social_links
    where user_id = new.user_id
  ) >= 20 then
    raise exception 'member social link limit reached' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_member_social_link_limit() from public, anon, authenticated;
grant execute on function private.enforce_member_social_link_limit() to service_role;

drop trigger if exists enforce_member_social_link_limit on public.member_social_links;
create trigger enforce_member_social_link_limit
before insert on public.member_social_links
for each row
execute function private.enforce_member_social_link_limit();

drop trigger if exists set_member_social_links_updated_at on public.member_social_links;
create trigger set_member_social_links_updated_at
before update on public.member_social_links
for each row
execute function public.set_updated_at();

alter table public.member_social_links enable row level security;

revoke all on table public.member_social_links from public, anon, authenticated;
grant select on table public.member_social_links to authenticated;
grant insert (user_id, provider, display_label, profile_url, sort_order, is_visible)
  on table public.member_social_links to authenticated;
grant update (display_label, profile_url, sort_order, is_visible)
  on table public.member_social_links to authenticated;
grant delete on table public.member_social_links to authenticated;
grant all on table public.member_social_links to service_role;

drop policy if exists "Members can read their own profile links" on public.member_social_links;
create policy "Members can read their own profile links"
on public.member_social_links
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Verified members can read shared profile links" on public.member_social_links;
create policy "Verified members can read shared profile links"
on public.member_social_links
for select
to authenticated
using (
  is_visible is true
  and private.member_has_gallery_upload_access((select auth.uid()))
  and private.member_has_gallery_upload_access(user_id)
);

drop policy if exists "Members can create their own profile links" on public.member_social_links;
create policy "Members can create their own profile links"
on public.member_social_links
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and (
    is_visible is false
    or private.member_has_gallery_upload_access((select auth.uid()))
  )
);

drop policy if exists "Members can update their own profile links" on public.member_social_links;
create policy "Members can update their own profile links"
on public.member_social_links
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    is_visible is false
    or private.member_has_gallery_upload_access((select auth.uid()))
  )
);

drop policy if exists "Members can delete their own profile links" on public.member_social_links;
create policy "Members can delete their own profile links"
on public.member_social_links
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
