-- Tighten the member profile-link contract after the first preview migration.
-- Authenticated writes use bounded, transactional functions; the table remains
-- directly readable/deletable under RLS and visibility remains private by
-- default.

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
      when 'instagram' then
        link_url ~* '^https://(www\.)?instagram\.com/[a-z0-9._]+/?$'
        and link_url !~* '^https://(www\.)?instagram\.com/(about|accounts|developer|direct|emails|explore|legal|login|oauth|p|privacy|reels?|stories|terms)/?$'
      when 'facebook' then
        link_url ~* '^https://(www\.)?facebook\.com/[a-z0-9._-]+/?$'
        and link_url !~* '^https://(www\.)?facebook\.com/(about|business|events|groups|help|legal|login|marketplace|pages|privacy|reel|settings|terms|watch)/?$'
      when 'tiktok' then link_url ~* '^https://(www\.)?tiktok\.com/@[a-z0-9._-]+/?$'
      when 'twitch' then
        link_url ~* '^https://(www\.)?twitch\.tv/[a-z0-9_]+/?$'
        and link_url !~* '^https://(www\.)?twitch\.tv/(directory|downloads|jobs|login|settings|signup|subscriptions|videos|wallet)/?$'
      when 'youtube' then link_url ~* '^https://(www\.)?youtube\.com/(?:@[a-z0-9._-]+|channel/[a-z0-9_-]+|c/[a-z0-9._-]+|user/[a-z0-9._-]+)/?$'
      when 'x' then
        link_url ~* '^https://(www\.)?x\.com/[a-z0-9_]+/?$'
        and link_url !~* '^https://(www\.)?x\.com/(compose|explore|home|i|login|messages|notifications|search|settings)/?$'
      when 'bluesky' then link_url ~* '^https://bsky\.app/profile/[a-z0-9.-]+/?$'
      when 'mastodon' then
        link_url ~* '^https://([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})/(?:@[a-z0-9._-]+|users/[a-z0-9._-]+)/?$'
        and link_url !~* '^https://[^/]+\.(?:example|internal|invalid|local|localhost|onion|test)/'
      when 'spotify' then link_url ~* '^https://open\.spotify\.com/user/[a-z0-9]+/?$'
      when 'linkedin' then link_url ~* '^https://(www\.)?linkedin\.com/(?:in|company)/[a-z0-9._-]+/?$'
      when 'custom' then
        link_url ~* '^https://([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})(?:/[^[:space:]?#]*)?$'
        and link_url !~* '^https://[^/]+\.(?:example|internal|invalid|local|localhost|onion|test)(?:/|$)'
      else false
    end;
$$;

create or replace function private.member_social_link_label_is_valid(
  link_provider text,
  link_label text
)
returns boolean
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select case link_provider
    when 'instagram' then link_label = 'Instagram'
    when 'facebook' then link_label = 'Facebook'
    when 'tiktok' then link_label = 'TikTok'
    when 'twitch' then link_label = 'Twitch'
    when 'youtube' then link_label = 'YouTube'
    when 'x' then link_label = 'X'
    when 'bluesky' then link_label = 'Bluesky'
    when 'mastodon' then link_label = 'Mastodon'
    when 'spotify' then link_label = 'Spotify'
    when 'linkedin' then link_label = 'LinkedIn'
    when 'custom' then
      char_length(link_label) between 1 and 40
      and link_label = regexp_replace(btrim(link_label), '[[:space:]]+', ' ', 'g')
      and link_label ~ '^[[:alnum:] .&''’_+()-]+$'
      and position(chr(8203) in link_label) = 0
      and position(chr(8204) in link_label) = 0
      and position(chr(8205) in link_label) = 0
      and position(chr(8234) in link_label) = 0
      and position(chr(8235) in link_label) = 0
      and position(chr(8236) in link_label) = 0
      and position(chr(8237) in link_label) = 0
      and position(chr(8238) in link_label) = 0
      and position(chr(8288) in link_label) = 0
      and position(chr(8294) in link_label) = 0
      and position(chr(8295) in link_label) = 0
      and position(chr(8296) in link_label) = 0
      and position(chr(8297) in link_label) = 0
      and position(chr(65279) in link_label) = 0
    else false
  end;
$$;

revoke all on function private.member_social_link_label_is_valid(text, text) from public, anon;
grant execute on function private.member_social_link_label_is_valid(text, text) to authenticated, service_role;

alter table public.member_social_links
  drop constraint if exists member_social_links_display_label_check;
alter table public.member_social_links
  add constraint member_social_links_display_label_check
  check (private.member_social_link_label_is_valid(provider, display_label));

alter table public.member_social_links
  drop constraint if exists member_social_links_sort_order_check;
alter table public.member_social_links
  add constraint member_social_links_sort_order_check
  check (sort_order between 0 and 19);

alter table public.member_social_links
  add constraint member_social_links_user_sort_order_key
  unique (user_id, sort_order)
  deferrable initially deferred;

create or replace function private.enforce_member_social_link_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.user_id::text, 671145605223460117)
  );

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

create or replace function public.create_member_social_link(
  link_provider text,
  link_display_label text,
  link_profile_url text,
  link_is_visible boolean default false
)
returns setof public.member_social_links
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  current_user_id uuid := auth.uid();
  next_sort_order smallint;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = 'insufficient_privilege';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 671145605223460117)
  );

  if link_is_visible and not private.member_has_gallery_upload_access(current_user_id) then
    raise exception 'current member verification required' using errcode = 'insufficient_privilege';
  end if;

  select (coalesce(max(sort_order), -1) + 1)::smallint
  into next_sort_order
  from public.member_social_links
  where user_id = current_user_id;

  if next_sort_order >= 20 then
    raise exception 'member social link limit reached' using errcode = 'check_violation';
  end if;

  return query
  insert into public.member_social_links (
    user_id,
    provider,
    display_label,
    profile_url,
    sort_order,
    is_visible
  )
  values (
    current_user_id,
    link_provider,
    link_display_label,
    link_profile_url,
    next_sort_order,
    link_is_visible
  )
  returning *;
end;
$$;

revoke all on function public.create_member_social_link(text, text, text, boolean) from public, anon;
grant execute on function public.create_member_social_link(text, text, text, boolean) to authenticated;

create or replace function public.reorder_member_social_links(link_ids uuid[])
returns setof public.member_social_links
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  requested_count integer := coalesce(cardinality(link_ids), 0);
  distinct_count integer;
  owned_count integer;
  matched_count integer;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = 'insufficient_privilege';
  end if;

  if requested_count < 1 or requested_count > 20 or array_position(link_ids, null) is not null then
    raise exception 'invalid profile link order' using errcode = 'check_violation';
  end if;

  select count(distinct requested_id)
  into distinct_count
  from unnest(link_ids) as requested(requested_id);

  if distinct_count <> requested_count then
    raise exception 'invalid profile link order' using errcode = 'check_violation';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 671145605223460117)
  );

  select
    count(*),
    count(*) filter (where id = any(link_ids))
  into owned_count, matched_count
  from public.member_social_links
  where user_id = current_user_id;

  if owned_count <> requested_count or matched_count <> requested_count then
    raise exception 'profile link order must contain the current owned set' using errcode = 'check_violation';
  end if;

  update public.member_social_links as links
  set sort_order = requested.ordinality - 1
  from unnest(link_ids) with ordinality as requested(id, ordinality)
  where links.id = requested.id
    and links.user_id = current_user_id;

  return query
  select links.*
  from public.member_social_links as links
  where links.user_id = current_user_id
  order by links.sort_order, links.created_at;
end;
$$;

revoke all on function public.reorder_member_social_links(uuid[]) from public, anon;
grant execute on function public.reorder_member_social_links(uuid[]) to authenticated;

revoke insert (user_id, provider, display_label, profile_url, sort_order, is_visible)
  on table public.member_social_links from authenticated;
revoke update (display_label, profile_url, sort_order, is_visible)
  on table public.member_social_links from authenticated;
grant update (is_visible) on table public.member_social_links to authenticated;
