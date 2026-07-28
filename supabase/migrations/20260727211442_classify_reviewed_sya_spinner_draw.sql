-- Repair only the reviewed July 2026 production draw that was published before
-- draw classifications were introduced. The immutable publication is the
-- source of the draw ID; no identifier is guessed or copied from runtime logs.
-- A fresh Preview database has no reviewed publication and safely skips this
-- repair. Any populated but non-exact state aborts the migration.

begin;

lock table public.spinner_raffle_result_publications in share row exclusive mode;
lock table public.spinner_raffle_result_revocations in share mode;
lock table public.spinner_draw_receipts in share row exclusive mode;
lock table public.spinner_discord_outbox in share row exclusive mode;
lock table public.spinner_live_state in share row exclusive mode;

do $migration$
declare
  reviewed_draw_id uuid;
  exact_match_count integer;
  updated_count integer;
  receipt_mode text;
  outbox_mode text;
  live_mode text;
begin
  select count(*)::integer
  into exact_match_count
  from public.spinner_raffle_result_publications publication
  join public.spinner_draw_receipts receipt
    on receipt.draw_id = publication.source_draw_id
  join public.spinner_discord_outbox outbox
    on outbox.draw_id = publication.source_draw_id
   and outbox.channel_key = 'raffle_spins'
  join public.spinner_live_state live
    on live.singleton_id = 1
   and live.draw_id = publication.source_draw_id
  where publication.source_mode = 'legacy-reviewed'
    and publication.cycle_month = '2026-07-01'::date
    and publication.selected_at = '2026-07-27 15:29:29.763+00'::timestamptz
    and publication.reveal_at = '2026-07-27 15:32:34.563+00'::timestamptz
    and publication.published_at = '2026-07-27 15:32:39.181748+00'::timestamptz
    and publication.winner_display_name = 'Sya'
    and publication.approved_by = receipt.actor_id
    and not exists (
      select 1
      from public.spinner_raffle_result_revocations revocation
      where revocation.source_draw_id = publication.source_draw_id
    )
    and receipt.timestamp_iso = publication.selected_at
    and receipt.winner ->> 'displayName' = publication.winner_display_name
    and receipt.receipt ->> 'drawId' = receipt.draw_id::text
    and receipt.roster_snapshot -> 'participants' -> receipt.selected_index = receipt.winner
    and outbox.phase = 'completed'
    and outbox.reveal_after = publication.reveal_at
    and outbox.completed_at = publication.published_at
    and live.phase = 'revealed'
    and live.reveal_at = publication.reveal_at
    and live.selected_index = receipt.selected_index
    and live.winner = receipt.winner
    and live.participants = receipt.roster_snapshot -> 'participants';

  if exact_match_count = 0 then
    if not exists (
      select 1 from public.spinner_raffle_result_publications
    ) and not exists (
      select 1
      from public.spinner_discord_outbox
      where channel_key = 'raffle_spins' and phase = 'completed'
    ) then
      return;
    end if;

    raise exception 'The reviewed July 2026 spinner classification state did not match.'
      using errcode = '23514';
  end if;

  if exact_match_count <> 1 then
    raise exception 'The reviewed July 2026 spinner classification state was not unique.'
      using errcode = '23514';
  end if;

  select
    publication.source_draw_id,
    receipt.draw_mode,
    outbox.draw_mode,
    live.draw_mode
  into strict
    reviewed_draw_id,
    receipt_mode,
    outbox_mode,
    live_mode
  from public.spinner_raffle_result_publications publication
  join public.spinner_draw_receipts receipt
    on receipt.draw_id = publication.source_draw_id
  join public.spinner_discord_outbox outbox
    on outbox.draw_id = publication.source_draw_id
   and outbox.channel_key = 'raffle_spins'
  join public.spinner_live_state live
    on live.singleton_id = 1
   and live.draw_id = publication.source_draw_id
  where publication.source_mode = 'legacy-reviewed'
    and publication.cycle_month = '2026-07-01'::date
    and publication.selected_at = '2026-07-27 15:29:29.763+00'::timestamptz
    and publication.reveal_at = '2026-07-27 15:32:34.563+00'::timestamptz
    and publication.published_at = '2026-07-27 15:32:39.181748+00'::timestamptz
    and publication.winner_display_name = 'Sya'
    and publication.approved_by = receipt.actor_id
    and not exists (
      select 1
      from public.spinner_raffle_result_revocations revocation
      where revocation.source_draw_id = publication.source_draw_id
    )
    and receipt.timestamp_iso = publication.selected_at
    and receipt.winner ->> 'displayName' = publication.winner_display_name
    and receipt.receipt ->> 'drawId' = receipt.draw_id::text
    and receipt.roster_snapshot -> 'participants' -> receipt.selected_index = receipt.winner
    and outbox.phase = 'completed'
    and outbox.reveal_after = publication.reveal_at
    and outbox.completed_at = publication.published_at
    and live.phase = 'revealed'
    and live.reveal_at = publication.reveal_at
    and live.selected_index = receipt.selected_index
    and live.winner = receipt.winner
    and live.participants = receipt.roster_snapshot -> 'participants';

  if receipt_mode = 'official' and outbox_mode = 'official' and live_mode = 'official' then
    return;
  end if;

  if receipt_mode <> 'unclassified'
    or outbox_mode <> 'unclassified'
    or live_mode <> 'unclassified'
  then
    raise exception 'The reviewed July 2026 spinner classification was partially changed.'
      using errcode = '23514';
  end if;

  -- The receipt is otherwise immutable by design. Disable only its row guard
  -- inside this locked, exact-match migration transaction; any exception
  -- rolls the trigger state and every row update back together.
  execute 'alter table public.spinner_draw_receipts disable trigger spinner_draw_receipts_immutable';
  update public.spinner_draw_receipts
  set draw_mode = 'official'
  where draw_id = reviewed_draw_id
    and draw_mode = 'unclassified';
  get diagnostics updated_count = row_count;
  if updated_count <> 1 then
    raise exception 'The reviewed spinner receipt classification was not updated exactly once.'
      using errcode = '23514';
  end if;
  execute 'alter table public.spinner_draw_receipts enable trigger spinner_draw_receipts_immutable';

  -- These guards protect normal application writes. Disable them only inside
  -- this locked, exact-match migration transaction; an exception rolls the
  -- trigger state and every row update back together.
  execute 'alter table public.spinner_discord_outbox disable trigger spinner_discord_outbox_draw_mode_immutable';
  update public.spinner_discord_outbox
  set draw_mode = 'official'
  where draw_id = reviewed_draw_id
    and channel_key = 'raffle_spins'
    and draw_mode = 'unclassified';
  get diagnostics updated_count = row_count;
  if updated_count <> 1 then
    raise exception 'The reviewed spinner delivery classification was not updated exactly once.'
      using errcode = '23514';
  end if;
  execute 'alter table public.spinner_discord_outbox enable trigger spinner_discord_outbox_draw_mode_immutable';

  execute 'alter table public.spinner_live_state disable trigger spinner_live_state_set_draw_mode';
  update public.spinner_live_state
  set draw_mode = 'official'
  where singleton_id = 1
    and draw_id = reviewed_draw_id
    and phase = 'revealed'
    and draw_mode = 'unclassified';
  get diagnostics updated_count = row_count;
  if updated_count <> 1 then
    raise exception 'The reviewed live spinner classification was not updated exactly once.'
      using errcode = '23514';
  end if;
  execute 'alter table public.spinner_live_state enable trigger spinner_live_state_set_draw_mode';

  if not exists (
    select 1
    from public.spinner_draw_receipts receipt
    join public.spinner_discord_outbox outbox
      on outbox.draw_id = receipt.draw_id
     and outbox.channel_key = 'raffle_spins'
    join public.spinner_live_state live
      on live.singleton_id = 1
     and live.draw_id = receipt.draw_id
    where receipt.draw_id = reviewed_draw_id
      and receipt.draw_mode = 'official'
      and outbox.draw_mode = 'official'
      and live.draw_mode = 'official'
  ) then
    raise exception 'The reviewed spinner classification postcondition failed.'
      using errcode = '23514';
  end if;
end;
$migration$;

comment on column public.spinner_draw_receipts.draw_mode is
  'Server-authoritative draw classification. Historical rows remain unclassified except for exact reviewed backfills recorded by later migrations; future rows require official or test.';

commit;
