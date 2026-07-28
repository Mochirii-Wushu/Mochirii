-- Read-only, public-safe release readback for the reviewed July 2026 draw.
-- This intentionally returns only aggregate checks and never returns draw,
-- member, receipt, roster, command, or delivery identifiers.

with reviewed as (
  select publication.source_draw_id
  from public.spinner_raffle_result_publications publication
  where publication.source_mode = 'legacy-reviewed'
    and publication.cycle_month = '2026-07-01'::date
    and publication.selected_at = '2026-07-27 15:29:29.763+00'::timestamptz
    and publication.reveal_at = '2026-07-27 15:32:34.563+00'::timestamptz
    and publication.published_at = '2026-07-27 15:32:39.181748+00'::timestamptz
    and publication.winner_display_name = 'Sya'
), reviewed_state as (
  select
    receipt.draw_mode as receipt_mode,
    outbox.draw_mode as outbox_mode,
    live.draw_mode as live_mode
  from reviewed
  join public.spinner_raffle_result_publications publication
    on publication.source_draw_id = reviewed.source_draw_id
  join public.spinner_draw_receipts receipt
    on receipt.draw_id = reviewed.source_draw_id
  join public.spinner_discord_outbox outbox
    on outbox.draw_id = reviewed.source_draw_id
   and outbox.channel_key = 'raffle_spins'
  join public.spinner_live_state live
    on live.singleton_id = 1
   and live.draw_id = reviewed.source_draw_id
  where publication.approved_by = receipt.actor_id
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
    and live.participants = receipt.roster_snapshot -> 'participants'
), checks as (
  select
    (select count(*) from reviewed) as publication_count,
    (select count(*) from reviewed_state) as exact_state_count,
    (
      select count(*)
      from public.spinner_raffle_result_revocations revocation
      join reviewed on reviewed.source_draw_id = revocation.source_draw_id
    ) as revocation_count,
    (select count(*) from reviewed_state where receipt_mode = 'unclassified'
      and outbox_mode = 'unclassified' and live_mode = 'unclassified') as wholly_unclassified_count,
    (select count(*) from reviewed_state where receipt_mode = 'official'
      and outbox_mode = 'official' and live_mode = 'official') as wholly_official_count
)
select
  publication_count = 1 as publication_exact,
  exact_state_count = 1 as evidence_exact,
  revocation_count = 0 as not_revoked,
  wholly_unclassified_count = 1 as wholly_unclassified,
  wholly_official_count = 1 as wholly_official,
  publication_count = 1
    and exact_state_count = 1
    and revocation_count = 0
    and (wholly_unclassified_count = 1 or wholly_official_count = 1) as migration_ready,
  publication_count = 1
    and exact_state_count = 1
    and revocation_count = 0
    and wholly_official_count = 1 as all_checks_pass
from checks;
