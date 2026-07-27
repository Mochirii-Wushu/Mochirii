BEGIN;
SELECT plan(22);

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) VALUES (
  '60606060-6060-4060-8060-606060606060',
  'authenticated', 'authenticated', 'spinner-media-test@example.invalid', '', now(), now(), now()
);

SELECT ok(to_regclass('public.spinner_media_jobs') IS NOT NULL, 'media job table exists');

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.spinner_media_jobs'::regclass),
  'media jobs have RLS enabled'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.spinner_media_jobs', 'select')
  AND NOT has_table_privilege('authenticated', 'public.spinner_media_jobs', 'select'),
  'browser roles have no direct media job access'
);

SELECT ok(
  has_table_privilege('service_role', 'public.spinner_media_jobs', 'select')
  AND has_table_privilege('service_role', 'public.spinner_media_jobs', 'insert')
  AND has_table_privilege('service_role', 'public.spinner_media_jobs', 'update')
  AND has_table_privilege('service_role', 'public.spinner_media_jobs', 'delete'),
  'service role owns the media job lifecycle'
);

SELECT has_index(
  'public',
  'spinner_media_jobs',
  'spinner_media_jobs_dispatch_ready_idx',
  ARRAY['status', 'next_attempt_at', 'created_at'],
  'dispatch claims use a bounded ready index'
);

SELECT has_index(
  'public',
  'spinner_media_jobs',
  'spinner_media_jobs_fallback_ready_idx',
  ARRAY['fallback_after', 'next_attempt_at'],
  'fallback claims use a bounded ready index'
);

SELECT ok(
  NOT has_function_privilege('anon', 'public.spinner_claim_media_jobs(uuid,text,integer)', 'execute')
  AND NOT has_function_privilege('authenticated', 'public.spinner_authorize_media_manifest(uuid,text)', 'execute')
  AND NOT has_function_privilege('authenticated', 'public.spinner_reserve_media_attachment(uuid,text,uuid,text,integer,text,text)', 'execute'),
  'browser roles cannot invoke media authority functions'
);

SELECT ok(
  has_function_privilege('service_role', 'public.spinner_claim_media_jobs(uuid,text,integer)', 'execute')
  AND has_function_privilege('service_role', 'public.spinner_bind_media_capability(uuid,uuid,text,timestamp with time zone)', 'execute')
  AND has_function_privilege('service_role', 'public.spinner_authorize_media_manifest(uuid,text)', 'execute')
  AND has_function_privilege('service_role', 'public.spinner_reserve_media_attachment(uuid,text,uuid,text,integer,text,text)', 'execute')
  AND has_function_privilege('service_role', 'public.spinner_finish_media_attachment(uuid,uuid,text,text,text,timestamp with time zone)', 'execute'),
  'service role can invoke every atomic media transition'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.spinner_discord_outbox'::regclass
      AND tgname = 'spinner_discord_outbox_create_media_job'
      AND NOT tgisinternal
  )
  AND EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.spinner_media_jobs'::regclass
      AND tgname = 'spinner_media_jobs_manifest_immutable'
      AND NOT tgisinternal
  ),
  'draw insertion creates a job and immutable fields are protected'
);

SELECT ok(
  position('delete from public.spinner_media_jobs' in pg_get_functiondef(
    'public.spinner_cleanup_expired(timestamp with time zone)'::regprocedure
  )) > 0,
  'retention cleanup removes media metadata before its parent evidence'
);

SELECT ok(
  position('outbox.phase = ''completed''' in pg_get_functiondef(
    'public.spinner_claim_media_jobs(uuid,text,integer)'::regprocedure
  )) > 0,
  'render work cannot begin before the winner message is complete'
);

SELECT ok(
  position('render_attempt_count < 12' in pg_get_functiondef(
    'public.spinner_claim_media_jobs(uuid,text,integer)'::regprocedure
  )) > 0
  AND position('render_attempt_count = job.render_attempt_count +' in pg_get_functiondef(
    'public.spinner_claim_media_jobs(uuid,text,integer)'::regprocedure
  )) > 0,
  'pre-reserve renderer failures consume a bounded claim budget'
);

SELECT ok(
  position('discord_message_id !~ ''^[0-9]{16,22}$''' in pg_get_functiondef(
    'public.spinner_reserve_media_attachment(uuid,text,uuid,text,integer,text,text)'::regprocedure
  )) > 0
  AND position('p_media_type = ''image/png'' and p_filename not like ''%.png''' in pg_get_functiondef(
    'public.spinner_reserve_media_attachment(uuid,text,uuid,text,integer,text,text)'::regprocedure
  )) > 0,
  'attachment reservation requires a valid message and type-bound filename'
);

INSERT INTO public.spinner_commands (
  command_id, action, actor_id, expected_revision, request_hash_sha256, status, staged_payload
) VALUES (
  '11111111-aaaa-4aaa-8aaa-111111111111',
  'spin',
  '60606060-6060-4060-8060-606060606060',
  0,
  repeat('a', 64),
  'applied',
  jsonb_build_object(
    'animationManifestHashSha256', repeat('c', 64),
    'animationManifest', jsonb_build_object(
      'version', 1,
      'styleVersion', 'mochirii-raffle-film-v1',
      'width', 1280,
      'height', 720,
      'durationMs', 10600,
      'drawId', '22222222-bbbb-4bbb-8bbb-222222222222',
      'startAt', '2026-07-27T00:02:53.200Z',
      'revealAt', '2026-07-27T00:02:58.000Z',
      'startRotation', 0,
      'finalRotation', 2160,
      'rosterHashSha256', repeat('b', 64),
      'participants', jsonb_build_array(
        jsonb_build_object('version', 1, 'number', 1, 'label', '1. Lotus'),
        jsonb_build_object('version', 1, 'number', 2, 'label', '2. Jade')
      ),
      'selectedIndex', 1,
      'winner', jsonb_build_object('version', 1, 'number', 2, 'displayName', 'Jade'),
      'visualSeedSha256', repeat('d', 64)
    )
  )
);

INSERT INTO public.spinner_draw_receipts (
  draw_id, command_id, session_id, revision, actor_id, timestamp_iso, singapore_time,
  app_version, algorithm_version, roster_snapshot, roster_hash_sha256,
  rejection_limit, sampled_words, accepted_word, selected_index, winner, receipt
) VALUES (
  '22222222-bbbb-4bbb-8bbb-222222222222',
  '11111111-aaaa-4aaa-8aaa-111111111111',
  '33333333-cccc-4ccc-8ccc-333333333333',
  1,
  '60606060-6060-4060-8060-606060606060',
  '2026-07-26T23:59:53.200Z',
  '27 Jul 2026, 07:59:53 SGT',
  '1.0.0',
  'uniform-uint32-rejection-v1',
  jsonb_build_object(
    'version', 1,
    'participants', jsonb_build_array(
      jsonb_build_object('version', 1, 'id', '44444444-dddd-4ddd-8ddd-444444444444', 'displayName', 'Lotus'),
      jsonb_build_object('version', 1, 'id', '55555555-eeee-4eee-8eee-555555555555', 'displayName', 'Jade')
    )
  ),
  repeat('b', 64),
  4294967296,
  '[1]'::jsonb,
  1,
  1,
  jsonb_build_object('version', 1, 'id', '55555555-eeee-4eee-8eee-555555555555', 'displayName', 'Jade'),
  jsonb_build_object(
    'version', 1,
    'drawMode', 'official',
    'drawId', '22222222-bbbb-4bbb-8bbb-222222222222',
    'winner', jsonb_build_object('version', 1, 'id', '55555555-eeee-4eee-8eee-555555555555', 'displayName', 'Jade')
  )
);

INSERT INTO public.spinner_discord_outbox (
  id, draw_id, channel_key, channel_id, start_payload, result_payload, reveal_after
) VALUES (
  '66666666-ffff-4fff-8fff-666666666666',
  '22222222-bbbb-4bbb-8bbb-222222222222',
  'raffle_spins',
  '1468667003366674721',
  jsonb_build_object(
    'content', E'A Mōchirīī monthly guild raffle begins <t:1785110573:R>.\nWatch the moonwheel live: https://mochirii.com/account?open=live-draw',
    'nonce', '22222222bbbb4bbb8bbb22222',
    'enforce_nonce', true,
    'allowed_mentions', jsonb_build_object(
      'parse', '[]'::jsonb, 'users', '[]'::jsonb, 'roles', '[]'::jsonb, 'replied_user', false
    )
  ),
  jsonb_build_object(
    'content', 'Mōchirīī raffle complete.',
    'allowed_mentions', jsonb_build_object(
      'parse', '[]'::jsonb, 'users', '[]'::jsonb, 'roles', '[]'::jsonb, 'replied_user', false
    )
  ),
  '2026-07-27T00:02:58.000Z'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.spinner_media_jobs
    WHERE draw_id = '22222222-bbbb-4bbb-8bbb-222222222222'
      AND status = 'pending'
      AND fallback_after = reveal_after + interval '60 seconds'
  ),
  'a valid immutable manifest creates exactly one media job'
);

SELECT is(
  (SELECT count(*)::integer FROM public.spinner_claim_media_jobs(
    '77777777-1111-4111-8111-777777777777', 'dispatch', 1
  )),
  0,
  'media rendering cannot claim before the winner message completes'
);

UPDATE public.spinner_discord_outbox
SET phase = 'completed',
  discord_message_id = '1468667003366674722',
  completed_at = now()
WHERE id = '66666666-ffff-4fff-8fff-666666666666';

SELECT is(
  (SELECT count(*)::integer FROM public.spinner_claim_media_jobs(
    '77777777-1111-4111-8111-777777777777', 'dispatch', 1
  )),
  1,
  'completed winner text unlocks one atomic render claim'
);

SELECT ok(
  public.spinner_bind_media_capability(
    (SELECT id FROM public.spinner_media_jobs WHERE draw_id = '22222222-bbbb-4bbb-8bbb-222222222222'),
    '77777777-1111-4111-8111-777777777777',
    repeat('e', 64),
    now() + interval '10 minutes'
  ),
  'a claimed job binds only the capability hash and expiry'
);

WITH authorized_call AS MATERIALIZED (
  SELECT count(*) = 1 AS authorized FROM public.spinner_authorize_media_manifest(
    (SELECT id FROM public.spinner_media_jobs WHERE draw_id = '22222222-bbbb-4bbb-8bbb-222222222222'),
    repeat('e', 64)
  )
)
SELECT ok(
  (SELECT authorized FROM authorized_call),
  'manifest authorization returns only for the stored capability hash'
);

SELECT ok(
  (SELECT manifest_authorization_count = 1 FROM public.spinner_media_jobs
    WHERE draw_id = '22222222-bbbb-4bbb-8bbb-222222222222'),
  'manifest authorization consumes its bounded request budget'
);

SELECT ok(
  NOT (public.spinner_reserve_media_attachment(
    (SELECT id FROM public.spinner_media_jobs WHERE draw_id = '22222222-bbbb-4bbb-8bbb-222222222222'),
    repeat('e', 64),
    '88888888-2222-4222-8222-888888888888',
    'image/png',
    8,
    repeat('f', 64),
    'mochirii-raffle-22222222-bbbb-4bbb-8bbb-222222222222.mp4'
  ) ->> 'ok')::boolean
  AND (public.spinner_reserve_media_attachment(
    (SELECT id FROM public.spinner_media_jobs WHERE draw_id = '22222222-bbbb-4bbb-8bbb-222222222222'),
    repeat('e', 64),
    '88888888-2222-4222-8222-888888888888',
    'image/png',
    8,
    repeat('f', 64),
    'mochirii-raffle-22222222-bbbb-4bbb-8bbb-222222222222.png'
  ) ->> 'ok')::boolean,
  'reservation rejects a mismatched extension and accepts exact validated media'
);

SELECT ok(
  public.spinner_finish_media_attachment(
    (SELECT id FROM public.spinner_media_jobs WHERE draw_id = '22222222-bbbb-4bbb-8bbb-222222222222'),
    '88888888-2222-4222-8222-888888888888',
    'attached',
    '1468667003366674723'
  ),
  'a valid numeric attachment ID completes the job once'
);

SELECT ok(
  (public.spinner_reserve_media_attachment(
    (SELECT id FROM public.spinner_media_jobs WHERE draw_id = '22222222-bbbb-4bbb-8bbb-222222222222'),
    repeat('e', 64),
    '99999999-3333-4333-8333-999999999999',
    'image/png',
    8,
    repeat('f', 64),
    'mochirii-raffle-22222222-bbbb-4bbb-8bbb-222222222222.png'
  ) ->> 'alreadyAttached')::boolean
  AND (SELECT attachment_attempt_count = 1 FROM public.spinner_media_jobs
    WHERE draw_id = '22222222-bbbb-4bbb-8bbb-222222222222'),
  'a repeated exact completion reconciles without a second attachment attempt'
);

SELECT * FROM finish();
ROLLBACK;
