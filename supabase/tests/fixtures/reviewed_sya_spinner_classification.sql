begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values (
  '91919191-9191-4919-8919-919191919191',
  'authenticated', 'authenticated', 'reviewed-sya-test@example.invalid', '', now(), now(), now()
);

insert into public.spinner_commands (
  command_id, action, actor_id, expected_revision, request_hash_sha256,
  status, staged_payload, completed_at
) values (
  '10101010-1010-4010-8010-101010101010', 'spin',
  '91919191-9191-4919-8919-919191919191', 0, repeat('1', 64),
  'applied', '{}'::jsonb, '2026-07-27 15:32:34.563+00'::timestamptz
);

alter table public.spinner_draw_receipts
  disable trigger spinner_draw_receipts_set_draw_mode;
insert into public.spinner_draw_receipts (
  draw_id, command_id, session_id, revision, actor_id, timestamp_iso,
  singapore_time, app_version, algorithm_version, roster_snapshot,
  roster_hash_sha256, rejection_limit, sampled_words, accepted_word,
  selected_index, winner, receipt, draw_mode
) values (
  '11111111-1010-4010-8010-101010101010',
  '10101010-1010-4010-8010-101010101010',
  '12121212-1010-4010-8010-101010101010', 1,
  '91919191-9191-4919-8919-919191919191',
  '2026-07-27 15:29:29.763+00'::timestamptz,
  '2026-07-27 23:29:29 SGT', '1.0.0', 'uniform-uint32-rejection-v1',
  jsonb_build_object('version', 1, 'participants', jsonb_build_array(
    jsonb_build_object('version', 1, 'id', '13131313-1010-4010-8010-101010101010', 'displayName', 'Sya'),
    jsonb_build_object('version', 1, 'id', '14141414-1010-4010-8010-101010101010', 'displayName', 'Lotus')
  )),
  repeat('1', 64), 4294967296, jsonb_build_array(0), 0, 0,
  jsonb_build_object('version', 1, 'id', '13131313-1010-4010-8010-101010101010', 'displayName', 'Sya'),
  jsonb_build_object(
    'version', 1,
    'drawId', '11111111-1010-4010-8010-101010101010',
    'winner', jsonb_build_object('version', 1, 'id', '13131313-1010-4010-8010-101010101010', 'displayName', 'Sya')
  ),
  'unclassified'
);
alter table public.spinner_draw_receipts
  enable trigger spinner_draw_receipts_set_draw_mode;

alter table public.spinner_discord_outbox
  disable trigger spinner_discord_outbox_prepare_draw_mode;
insert into public.spinner_discord_outbox (
  draw_id, channel_key, channel_id, phase, start_payload, result_payload,
  reveal_after, created_at, updated_at, completed_at, draw_mode
) values (
  '11111111-1010-4010-8010-101010101010',
  'raffle_spins', '1468667003366674721', 'completed',
  jsonb_build_object(
    'content', 'reviewed draw', 'nonce', 'reviewedsyadrawfixture', 'enforce_nonce', true,
    'allowed_mentions', jsonb_build_object(
      'parse', '[]'::jsonb, 'users', '[]'::jsonb,
      'roles', '[]'::jsonb, 'replied_user', false
    )
  ),
  jsonb_build_object(
    'content', 'reviewed result',
    'allowed_mentions', jsonb_build_object(
      'parse', '[]'::jsonb, 'users', '[]'::jsonb,
      'roles', '[]'::jsonb, 'replied_user', false
    )
  ),
  '2026-07-27 15:32:34.563+00'::timestamptz,
  '2026-07-27 15:29:29.763+00'::timestamptz,
  '2026-07-27 15:32:39.181748+00'::timestamptz,
  '2026-07-27 15:32:39.181748+00'::timestamptz,
  'unclassified'
);
alter table public.spinner_discord_outbox
  enable trigger spinner_discord_outbox_prepare_draw_mode;

alter table public.spinner_live_state
  disable trigger spinner_live_state_set_draw_mode;
update public.spinner_live_state
set session_id = '12121212-1010-4010-8010-101010101010',
  revision = 1,
  phase = 'revealed',
  participants = jsonb_build_array(
    jsonb_build_object('version', 1, 'id', '13131313-1010-4010-8010-101010101010', 'displayName', 'Sya'),
    jsonb_build_object('version', 1, 'id', '14141414-1010-4010-8010-101010101010', 'displayName', 'Lotus')
  ),
  roster_hash_sha256 = repeat('1', 64),
  draw_id = '11111111-1010-4010-8010-101010101010',
  started_at = '2026-07-27 15:32:29.763+00'::timestamptz,
  reveal_at = '2026-07-27 15:32:34.563+00'::timestamptz,
  duration_ms = 4800,
  start_rotation = 0,
  final_rotation = 2160,
  selected_index = 0,
  winner = jsonb_build_object(
    'version', 1, 'id', '13131313-1010-4010-8010-101010101010', 'displayName', 'Sya'
  ),
  draw_mode = 'unclassified',
  updated_by = '91919191-9191-4919-8919-919191919191',
  updated_at = '2026-07-27 15:32:39.181748+00'::timestamptz
where singleton_id = 1;
alter table public.spinner_live_state
  enable trigger spinner_live_state_set_draw_mode;

insert into public.spinner_raffle_result_publications (
  source_draw_id, cycle_month, source_mode, approved_by
) values (
  '11111111-1010-4010-8010-101010101010',
  '2026-07-01'::date,
  'legacy-reviewed',
  '91919191-9191-4919-8919-919191919191'
);

commit;
