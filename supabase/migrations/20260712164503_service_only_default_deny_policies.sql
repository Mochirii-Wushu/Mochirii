begin;

set local lock_timeout = '5s';

-- These tables are intentionally service-only. Revoked Data API grants are
-- the primary boundary; a restrictive false policy documents and preserves
-- that boundary even if a permissive client policy is added later.

revoke all on table public.discord_managed_permission_overwrites from public, anon, authenticated;
grant all on table public.discord_managed_permission_overwrites to service_role;
drop policy if exists service_only_default_deny on public.discord_managed_permission_overwrites;
create policy service_only_default_deny on public.discord_managed_permission_overwrites
  as restrictive for all to anon, authenticated using (false) with check (false);

revoke all on table public.discord_resources from public, anon, authenticated;
grant all on table public.discord_resources to service_role;
drop policy if exists service_only_default_deny on public.discord_resources;
create policy service_only_default_deny on public.discord_resources
  as restrictive for all to anon, authenticated using (false) with check (false);

revoke all on table public.discord_sync_log from public, anon, authenticated;
grant all on table public.discord_sync_log to service_role;
drop policy if exists service_only_default_deny on public.discord_sync_log;
create policy service_only_default_deny on public.discord_sync_log
  as restrictive for all to anon, authenticated using (false) with check (false);

revoke all on table public.gallery_instagram_publish_events from public, anon, authenticated;
grant all on table public.gallery_instagram_publish_events to service_role;
drop policy if exists service_only_default_deny on public.gallery_instagram_publish_events;
create policy service_only_default_deny on public.gallery_instagram_publish_events
  as restrictive for all to anon, authenticated using (false) with check (false);

revoke all on table public.gallery_instagram_publish_jobs from public, anon, authenticated;
grant all on table public.gallery_instagram_publish_jobs to service_role;
drop policy if exists service_only_default_deny on public.gallery_instagram_publish_jobs;
create policy service_only_default_deny on public.gallery_instagram_publish_jobs
  as restrictive for all to anon, authenticated using (false) with check (false);

revoke all on table public.gallery_moderation_events from public, anon, authenticated;
grant all on table public.gallery_moderation_events to service_role;
drop policy if exists service_only_default_deny on public.gallery_moderation_events;
create policy service_only_default_deny on public.gallery_moderation_events
  as restrictive for all to anon, authenticated using (false) with check (false);

revoke all on table public.member_auth_identities from public, anon, authenticated;
grant all on table public.member_auth_identities to service_role;
drop policy if exists service_only_default_deny on public.member_auth_identities;
create policy service_only_default_deny on public.member_auth_identities
  as restrictive for all to anon, authenticated using (false) with check (false);

revoke all on table public.member_verifications from public, anon, authenticated;
grant all on table public.member_verifications to service_role;
drop policy if exists service_only_default_deny on public.member_verifications;
create policy service_only_default_deny on public.member_verifications
  as restrictive for all to anon, authenticated using (false) with check (false);

revoke all on table public.spotlight_poll_candidates from public, anon, authenticated;
grant all on table public.spotlight_poll_candidates to service_role;
drop policy if exists service_only_default_deny on public.spotlight_poll_candidates;
create policy service_only_default_deny on public.spotlight_poll_candidates
  as restrictive for all to anon, authenticated using (false) with check (false);

revoke all on table public.spotlight_poll_cycles from public, anon, authenticated;
grant all on table public.spotlight_poll_cycles to service_role;
drop policy if exists service_only_default_deny on public.spotlight_poll_cycles;
create policy service_only_default_deny on public.spotlight_poll_cycles
  as restrictive for all to anon, authenticated using (false) with check (false);

revoke all on table public.spotlight_poll_results from public, anon, authenticated;
grant all on table public.spotlight_poll_results to service_role;
drop policy if exists service_only_default_deny on public.spotlight_poll_results;
create policy service_only_default_deny on public.spotlight_poll_results
  as restrictive for all to anon, authenticated using (false) with check (false);

revoke all on table public.vote_confirmations from public, anon, authenticated;
grant all on table public.vote_confirmations to service_role;
drop policy if exists service_only_default_deny on public.vote_confirmations;
create policy service_only_default_deny on public.vote_confirmations
  as restrictive for all to anon, authenticated using (false) with check (false);

revoke all on table public.vote_reminder_sends from public, anon, authenticated;
grant all on table public.vote_reminder_sends to service_role;
drop policy if exists service_only_default_deny on public.vote_reminder_sends;
create policy service_only_default_deny on public.vote_reminder_sends
  as restrictive for all to anon, authenticated using (false) with check (false);

do $$
declare
  target_table text;
  target_relation text;
  privilege_name text;
  target_tables constant text[] := array[
    'discord_managed_permission_overwrites',
    'discord_resources',
    'discord_sync_log',
    'gallery_instagram_publish_events',
    'gallery_instagram_publish_jobs',
    'gallery_moderation_events',
    'member_auth_identities',
    'member_verifications',
    'spotlight_poll_candidates',
    'spotlight_poll_cycles',
    'spotlight_poll_results',
    'vote_confirmations',
    'vote_reminder_sends'
  ];
begin
  foreach target_table in array target_tables loop
    target_relation := format('public.%I', target_table);

    if to_regclass(target_relation) is null then
      raise exception 'Required service-only relation is missing: %', target_relation;
    end if;

    if not exists (
      select 1
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = target_table
        and c.relrowsecurity
    ) then
      raise exception 'RLS must remain enabled on %', target_relation;
    end if;

    if not exists (
      select 1
      from pg_catalog.pg_policies p
      where p.schemaname = 'public'
        and p.tablename = target_table
        and p.policyname = 'service_only_default_deny'
        and p.permissive = 'RESTRICTIVE'
        and p.cmd = 'ALL'
        and p.roles @> array['anon', 'authenticated']::name[]
        and p.qual = 'false'
        and p.with_check = 'false'
    ) then
      raise exception 'Explicit service-only policy is incomplete on %', target_relation;
    end if;

    foreach privilege_name in array array[
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
    ] loop
      if has_table_privilege('anon', target_relation, privilege_name)
        or has_table_privilege('authenticated', target_relation, privilege_name) then
        raise exception 'Client role retained % on %', privilege_name, target_relation;
      end if;

      if not has_table_privilege('service_role', target_relation, privilege_name) then
        raise exception 'service_role is missing % on %', privilege_name, target_relation;
      end if;
    end loop;
  end loop;
end
$$;

commit;
