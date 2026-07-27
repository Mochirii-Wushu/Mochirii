-- Classify every future live-spinner draw at the server boundary and publish
-- only deliberately confirmed official monthly results. Historical receipts
-- remain unclassified until an exact, reviewed backfill is recorded.

alter table public.spinner_live_state
add column if not exists draw_mode text not null default 'unclassified';

alter table public.spinner_draw_receipts
add column if not exists draw_mode text not null default 'unclassified';

alter table public.spinner_discord_outbox
add column if not exists draw_mode text not null default 'unclassified';

alter table public.spinner_live_state
drop constraint if exists spinner_live_state_draw_mode_check;
alter table public.spinner_live_state
add constraint spinner_live_state_draw_mode_check
check (draw_mode in ('unclassified', 'official', 'test'));

alter table public.spinner_draw_receipts
drop constraint if exists spinner_draw_receipts_draw_mode_check;
alter table public.spinner_draw_receipts
add constraint spinner_draw_receipts_draw_mode_check
check (draw_mode in ('unclassified', 'official', 'test'));

alter table public.spinner_discord_outbox
drop constraint if exists spinner_discord_outbox_draw_mode_check;
alter table public.spinner_discord_outbox
add constraint spinner_discord_outbox_draw_mode_check
check (draw_mode in ('unclassified', 'official'));

create table if not exists public.spinner_raffle_result_publications (
  source_draw_id uuid primary key,
  cycle_month date not null unique,
  source_mode text not null,
  selected_at timestamptz not null,
  reveal_at timestamptz not null,
  winner_display_name text not null,
  approved_by uuid not null,
  approved_at timestamptz not null default now(),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint spinner_raffle_publications_cycle_month_check check (
    cycle_month = date_trunc('month', cycle_month)::date
  ),
  constraint spinner_raffle_publications_source_mode_check check (
    source_mode in ('official', 'legacy-reviewed')
  ),
  constraint spinner_raffle_publications_window_check check (
    selected_at <= reveal_at
    and approved_at >= selected_at
    and (published_at is null or published_at >= reveal_at)
  ),
  constraint spinner_raffle_publications_name_check check (
    char_length(winner_display_name) between 1 and 40
    and winner_display_name = btrim(winner_display_name)
    and winner_display_name !~ '[[:cntrl:]]'
    and winner_display_name !~ U&'[\202A-\202E\2066-\2069]'
  )
);

create table if not exists public.spinner_raffle_result_revocations (
  source_draw_id uuid primary key references public.spinner_raffle_result_publications(source_draw_id) on delete restrict,
  reason_code text not null,
  revoked_by uuid not null,
  revoked_at timestamptz not null default now(),
  constraint spinner_raffle_revocations_reason_check check (
    reason_code ~ '^[a-z][a-z0-9_]{2,63}$'
  )
);

alter table public.spinner_raffle_result_publications enable row level security;
alter table public.spinner_raffle_result_revocations enable row level security;

revoke all on table public.spinner_raffle_result_publications from public, anon, authenticated;
revoke all on table public.spinner_raffle_result_revocations from public, anon, authenticated;
grant all on table public.spinner_raffle_result_publications to service_role;
grant all on table public.spinner_raffle_result_revocations to service_role;

drop policy if exists service_only_default_deny on public.spinner_raffle_result_publications;
create policy service_only_default_deny on public.spinner_raffle_result_publications
as restrictive for all to anon, authenticated
using (false) with check (false);

drop policy if exists service_only_default_deny on public.spinner_raffle_result_revocations;
create policy service_only_default_deny on public.spinner_raffle_result_revocations
as restrictive for all to anon, authenticated
using (false) with check (false);

create or replace function private.spinner_set_receipt_draw_mode()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_mode text := new.receipt ->> 'drawMode';
begin
  if requested_mode is null or requested_mode not in ('official', 'test') then
    raise exception 'Spinner draw mode is required.' using errcode = '23514';
  end if;
  new.draw_mode := requested_mode;
  return new;
end;
$$;

revoke all on function private.spinner_set_receipt_draw_mode() from public, anon, authenticated;
grant execute on function private.spinner_set_receipt_draw_mode() to service_role;

drop trigger if exists spinner_draw_receipts_set_draw_mode on public.spinner_draw_receipts;
create trigger spinner_draw_receipts_set_draw_mode
before insert on public.spinner_draw_receipts
for each row execute function private.spinner_set_receipt_draw_mode();

create or replace function private.spinner_prepare_outbox_draw_mode()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  receipt_mode text;
begin
  select receipt.draw_mode into receipt_mode
  from public.spinner_draw_receipts receipt
  where receipt.draw_id = new.draw_id;

  if receipt_mode is null then
    raise exception 'Spinner receipt classification is missing.' using errcode = '23514';
  end if;

  -- Test draws remain durable and visible on the private live stage, but never
  -- create Discord, media, or public-result side effects.
  if receipt_mode = 'test' then return null; end if;
  if receipt_mode <> 'official' then
    raise exception 'Unclassified draws cannot create live delivery.' using errcode = '23514';
  end if;

  new.draw_mode := 'official';
  return new;
end;
$$;

revoke all on function private.spinner_prepare_outbox_draw_mode() from public, anon, authenticated;
grant execute on function private.spinner_prepare_outbox_draw_mode() to service_role;

drop trigger if exists spinner_discord_outbox_prepare_draw_mode on public.spinner_discord_outbox;
create trigger spinner_discord_outbox_prepare_draw_mode
before insert on public.spinner_discord_outbox
for each row execute function private.spinner_prepare_outbox_draw_mode();

-- The original dispatcher hook was statement-level. PostgreSQL executes an
-- AFTER STATEMENT trigger even when a BEFORE ROW trigger suppresses every
-- candidate row, which meant a test draw could wake delivery for an unrelated
-- pending official draw. Bind dispatch to a surviving official row instead.
create or replace function private.spinner_queue_reaper_dispatcher()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_level <> 'ROW' or new.draw_mode <> 'official' then
    return null;
  end if;

  -- pg_net queues the request transactionally and performs network I/O after
  -- commit, so the authoritative draw response never waits on delivery.
  perform private.spinner_invoke_reaper_dispatcher();
  return new;
end;
$$;

revoke all on function private.spinner_queue_reaper_dispatcher() from public, anon, authenticated;
grant execute on function private.spinner_queue_reaper_dispatcher() to service_role;

drop trigger if exists spinner_discord_outbox_queue_dispatch on public.spinner_discord_outbox;
create trigger spinner_discord_outbox_queue_dispatch
after insert on public.spinner_discord_outbox
for each row execute function private.spinner_queue_reaper_dispatcher();

create or replace function private.spinner_set_live_draw_mode()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  receipt_mode text;
begin
  if new.phase = 'idle' or new.draw_id is null then
    new.draw_mode := 'unclassified';
    return new;
  end if;

  if new.draw_id is not distinct from old.draw_id
    and new.phase is not distinct from old.phase
  then
    new.draw_mode := old.draw_mode;
    return new;
  end if;

  select receipt.draw_mode into receipt_mode
  from public.spinner_draw_receipts receipt
  where receipt.draw_id = new.draw_id;
  if receipt_mode is null or receipt_mode not in ('official', 'test') then
    raise exception 'Spinner live draw classification is missing.' using errcode = '23514';
  end if;
  new.draw_mode := receipt_mode;
  return new;
end;
$$;

revoke all on function private.spinner_set_live_draw_mode() from public, anon, authenticated;
grant execute on function private.spinner_set_live_draw_mode() to service_role;

drop trigger if exists spinner_live_state_set_draw_mode on public.spinner_live_state;
create trigger spinner_live_state_set_draw_mode
before update on public.spinner_live_state
for each row execute function private.spinner_set_live_draw_mode();

create or replace function private.spinner_validate_raffle_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  receipt_row public.spinner_draw_receipts%rowtype;
  outbox_row public.spinner_discord_outbox%rowtype;
  expected_month date;
  selected_winner jsonb;
begin
  select * into receipt_row
  from public.spinner_draw_receipts
  where draw_id = new.source_draw_id;
  if not found then
    raise exception 'The authoritative spinner receipt does not exist.' using errcode = '23514';
  end if;

  if receipt_row.draw_mode = 'test' then
    raise exception 'Test draws cannot become official raffle results.' using errcode = '23514';
  end if;
  if new.source_mode = 'official' and receipt_row.draw_mode <> 'official' then
    raise exception 'Only an official draw can publish automatically.' using errcode = '23514';
  end if;
  if new.source_mode = 'legacy-reviewed' and receipt_row.draw_mode <> 'unclassified' then
    raise exception 'Legacy review is limited to unclassified historical receipts.' using errcode = '23514';
  end if;

  select * into outbox_row
  from public.spinner_discord_outbox
  where draw_id = new.source_draw_id and channel_key = 'raffle_spins';
  if not found then
    raise exception 'The authoritative reveal record does not exist.' using errcode = '23514';
  end if;

  if new.source_mode = 'legacy-reviewed' and (
    outbox_row.phase <> 'completed'
    or outbox_row.completed_at is null
    or outbox_row.reveal_after > now()
  ) then
    raise exception 'Historical publication requires completed delivery evidence.' using errcode = '23514';
  end if;

  expected_month := date_trunc(
    'month',
    receipt_row.timestamp_iso at time zone 'Asia/Singapore'
  )::date;
  if new.cycle_month <> expected_month then
    raise exception 'The raffle month must match the Singapore selection month.' using errcode = '23514';
  end if;

  selected_winner := receipt_row.roster_snapshot -> 'participants' -> receipt_row.selected_index;
  if selected_winner is null or receipt_row.winner <> selected_winner then
    raise exception 'The authoritative winner does not match the frozen roster.' using errcode = '23514';
  end if;

  new.selected_at := receipt_row.timestamp_iso;
  new.reveal_at := outbox_row.reveal_after;
  new.published_at := case
    when new.source_mode = 'legacy-reviewed' then outbox_row.completed_at
    else outbox_row.reveal_after
  end;
  new.winner_display_name := receipt_row.winner ->> 'displayName';
  if new.winner_display_name is null or btrim(new.winner_display_name) = '' then
    raise exception 'The authoritative winner label is missing.' using errcode = '23514';
  end if;
  if new.approved_by is distinct from receipt_row.actor_id then
    raise exception 'The publication approver must be the authoritative draw moderator.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.spinner_validate_raffle_publication() from public, anon, authenticated;
grant execute on function private.spinner_validate_raffle_publication() to service_role;

drop trigger if exists spinner_raffle_publication_validate on public.spinner_raffle_result_publications;
create trigger spinner_raffle_publication_validate
before insert on public.spinner_raffle_result_publications
for each row execute function private.spinner_validate_raffle_publication();

create or replace function private.spinner_publish_official_raffle_result()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  receipt_row public.spinner_draw_receipts%rowtype;
  raffle_month date;
begin
  if new.draw_mode <> 'official' then return new; end if;
  select * into receipt_row
  from public.spinner_draw_receipts
  where draw_id = new.draw_id;
  if not found or receipt_row.actor_id is null then
    raise exception 'Official draw authority is missing.' using errcode = '23514';
  end if;

  raffle_month := date_trunc(
    'month',
    receipt_row.timestamp_iso at time zone 'Asia/Singapore'
  )::date;
  if exists (
    select 1 from public.spinner_raffle_result_publications publication
    where publication.cycle_month = raffle_month
  ) then
    raise exception 'This Singapore raffle month already has an official result.' using errcode = '23514';
  end if;

  insert into public.spinner_raffle_result_publications (
    source_draw_id, cycle_month, source_mode, approved_by
  ) values (
    new.draw_id, raffle_month, 'official', receipt_row.actor_id
  );
  return new;
end;
$$;

revoke all on function private.spinner_publish_official_raffle_result() from public, anon, authenticated;
grant execute on function private.spinner_publish_official_raffle_result() to service_role;

drop trigger if exists spinner_discord_outbox_publish_official_result on public.spinner_discord_outbox;
create trigger spinner_discord_outbox_publish_official_result
after insert on public.spinner_discord_outbox
for each row execute function private.spinner_publish_official_raffle_result();

create or replace function private.spinner_publication_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Official raffle publication records are immutable.' using errcode = '55000';
end;
$$;

revoke all on function private.spinner_publication_immutable() from public, anon, authenticated;
grant execute on function private.spinner_publication_immutable() to service_role;

drop trigger if exists spinner_raffle_publication_immutable on public.spinner_raffle_result_publications;
create trigger spinner_raffle_publication_immutable
before update or delete on public.spinner_raffle_result_publications
for each row execute function private.spinner_publication_immutable();

drop trigger if exists spinner_raffle_revocation_immutable on public.spinner_raffle_result_revocations;
create trigger spinner_raffle_revocation_immutable
before update or delete on public.spinner_raffle_result_revocations
for each row execute function private.spinner_publication_immutable();

create or replace function private.spinner_outbox_draw_mode_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.draw_mode <> old.draw_mode then
    raise exception 'Spinner outbox draw mode is immutable.' using errcode = '55000';
  end if;
  return new;
end;
$$;

revoke all on function private.spinner_outbox_draw_mode_immutable() from public, anon, authenticated;
grant execute on function private.spinner_outbox_draw_mode_immutable() to service_role;

drop trigger if exists spinner_discord_outbox_draw_mode_immutable on public.spinner_discord_outbox;
create trigger spinner_discord_outbox_draw_mode_immutable
before update on public.spinner_discord_outbox
for each row execute function private.spinner_outbox_draw_mode_immutable();

create or replace function public.get_latest_official_raffle_winner()
returns table (
  public_label text,
  cycle_month date,
  selected_at timestamptz,
  display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    'Winner Confirmed'::text,
    publication.cycle_month,
    publication.selected_at,
    case
      when (select auth.uid()) is not null
        and private.member_has_gallery_upload_access((select auth.uid()))
      then publication.winner_display_name
      else null
    end
  from public.spinner_raffle_result_publications publication
  where publication.reveal_at <= now()
    and publication.published_at is not null
    and not exists (
      select 1
      from public.spinner_raffle_result_revocations revocation
      where revocation.source_draw_id = publication.source_draw_id
    )
  order by publication.cycle_month desc
  limit 1;
$$;

revoke all on function public.get_latest_official_raffle_winner() from public;
grant execute on function public.get_latest_official_raffle_winner() to anon, authenticated, service_role;

create or replace function private.spinner_snapshot_json(
  p_state public.spinner_live_state,
  p_include_winner boolean default true
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'version', 1,
    'sessionId', p_state.session_id,
    'revision', p_state.revision,
    'phase', p_state.phase,
    'drawMode', p_state.draw_mode,
    'participants', p_state.participants,
    'startedAt', p_state.started_at,
    'revealAt', p_state.reveal_at,
    'durationMs', p_state.duration_ms,
    'startRotation', p_state.start_rotation,
    'finalRotation', p_state.final_rotation,
    'selectedIndex', case when p_include_winner then p_state.selected_index else null end,
    'winner', case when p_include_winner then p_state.winner else null end,
    'drawId', p_state.draw_id,
    'updatedAt', p_state.updated_at
  );
$$;

revoke all on function private.spinner_snapshot_json(public.spinner_live_state, boolean) from public, anon, authenticated;
grant execute on function private.spinner_snapshot_json(public.spinner_live_state, boolean) to service_role;

comment on column public.spinner_draw_receipts.draw_mode is
  'Server-authoritative draw classification. Historical rows remain unclassified; future rows require official or test.';
comment on table public.spinner_raffle_result_publications is
  'Immutable service-only bridge from one reviewed spinner receipt to one official Singapore monthly raffle result.';
comment on table public.spinner_raffle_result_revocations is
  'Append-only suppression records for official results that must no longer be displayed.';
comment on function public.get_latest_official_raffle_winner() is
  'Returns only a public label and selection date; a current verified member may also receive the stored guild display name.';

-- Publish the one completed production draw that predates explicit draw modes.
-- A fresh Preview database has no historical outbox and skips this step. Any
-- populated database must contain exactly the reviewed receipt below or the
-- migration aborts without publishing a result.
create or replace function private.spinner_backfill_2026_07_reviewed_result()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_count integer;
  reviewed_receipt public.spinner_draw_receipts%rowtype;
begin
  if not exists (
    select 1
    from public.spinner_discord_outbox
    where channel_key = 'raffle_spins' and phase = 'completed'
  ) then
    return;
  end if;

  select count(*)::integer into matched_count
  from public.spinner_draw_receipts receipt
  join public.spinner_discord_outbox outbox on outbox.draw_id = receipt.draw_id
  where receipt.draw_mode = 'unclassified'
    and outbox.draw_mode = 'unclassified'
    and outbox.channel_key = 'raffle_spins'
    and outbox.phase = 'completed'
    and receipt.actor_id is not null
    and receipt.timestamp_iso = '2026-07-27 15:29:29.763+00'::timestamptz
    and outbox.reveal_after = '2026-07-27 15:32:34.563+00'::timestamptz
    and outbox.completed_at = '2026-07-27 15:32:39.181748+00'::timestamptz
    and receipt.winner ->> 'displayName' = 'Sya';

  if matched_count <> 1 then
    raise exception 'The reviewed July 2026 raffle receipt did not match exactly once.'
      using errcode = '23514';
  end if;

  select receipt.* into strict reviewed_receipt
  from public.spinner_draw_receipts receipt
  join public.spinner_discord_outbox outbox on outbox.draw_id = receipt.draw_id
  where receipt.draw_mode = 'unclassified'
    and outbox.draw_mode = 'unclassified'
    and outbox.channel_key = 'raffle_spins'
    and outbox.phase = 'completed'
    and receipt.actor_id is not null
    and receipt.timestamp_iso = '2026-07-27 15:29:29.763+00'::timestamptz
    and outbox.reveal_after = '2026-07-27 15:32:34.563+00'::timestamptz
    and outbox.completed_at = '2026-07-27 15:32:39.181748+00'::timestamptz
    and receipt.winner ->> 'displayName' = 'Sya';

  if exists (
    select 1
    from public.spinner_raffle_result_publications publication
    where publication.source_draw_id = reviewed_receipt.draw_id
      and publication.source_mode = 'legacy-reviewed'
      and publication.selected_at = reviewed_receipt.timestamp_iso
      and publication.winner_display_name = reviewed_receipt.winner ->> 'displayName'
  ) then
    return;
  end if;

  insert into public.spinner_raffle_result_publications (
    source_draw_id,
    cycle_month,
    source_mode,
    approved_by
  ) values (
    reviewed_receipt.draw_id,
    date_trunc('month', reviewed_receipt.timestamp_iso at time zone 'Asia/Singapore')::date,
    'legacy-reviewed',
    reviewed_receipt.actor_id
  );
end;
$$;

revoke all on function private.spinner_backfill_2026_07_reviewed_result() from public, anon, authenticated, service_role;

select private.spinner_backfill_2026_07_reviewed_result();
drop function private.spinner_backfill_2026_07_reviewed_result();
