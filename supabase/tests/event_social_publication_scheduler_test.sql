begin;
select plan(80);

select has_table('public', 'event_social_occurrences', 'event-social occurrences exist');
select has_table('public', 'event_social_destination_settings', 'independent destination settings exist');
select has_table('public', 'event_social_publication_templates', 'reusable publication templates exist');
select has_table('public', 'event_social_publication_jobs', 'destination publication jobs exist');
select has_table('public', 'event_social_publication_events', 'immutable server audit exists');
select has_column(
  'public', 'event_social_publication_jobs', 'preparation_fingerprint',
  'Instagram preparation is bound to an immutable fingerprint'
);
select has_column(
  'public', 'event_social_publication_jobs', 'prepared_at',
  'Instagram readiness is persisted across scheduler invocations'
);
select has_column(
  'public', 'event_social_publication_jobs', 'provider_mutation_started_at',
  'the final public provider mutation has an explicit start boundary'
);
select has_column(
  'public', 'event_social_publication_jobs', 'reconciled_by',
  'reconciliation records the moderator actor'
);
select has_column(
  'public', 'event_social_publication_jobs', 'reconciled_at',
  'reconciliation records its server timestamp'
);
select has_column(
  'public', 'event_social_publication_jobs', 'reconciliation_resolution',
  'reconciliation records its bounded resolution'
);
select has_column(
  'public', 'event_social_publication_jobs', 'reconciliation_note',
  'reconciliation preserves the private bounded moderator note'
);
select has_index(
  'public',
  'event_social_destination_settings',
  'event_social_destination_settings_confirmed_by_idx',
  array['confirmed_by'],
  'destination confirmation actor references use a covering index'
);
select has_index(
  'public',
  'event_social_publication_templates',
  'event_social_publication_templates_approved_by_idx',
  array['approved_by'],
  'template approval actor references use a covering index'
);
select has_index(
  'public',
  'event_social_publication_jobs',
  'event_social_publication_jobs_template_id_idx',
  array['template_id'],
  'publication template references use a covering index'
);
select has_index(
  'public',
  'event_social_publication_jobs',
  'event_social_publication_jobs_approved_by_idx',
  array['approved_by'],
  'publication approval actor references use a covering index'
);
select has_index(
  'public',
  'event_social_publication_jobs',
  'event_social_publication_jobs_reconciled_by_idx',
  array['reconciled_by'],
  'publication reconciliation actor references use a covering index'
);
select has_index(
  'public',
  'event_social_publication_events',
  'event_social_publication_events_occurrence_id_idx',
  array['occurrence_id'],
  'publication event occurrence references use a covering index'
);
select has_index(
  'public',
  'event_social_publication_events',
  'event_social_publication_events_actor_id_idx',
  array['actor_id'],
  'publication event actor references use a covering index'
);
select is(
  (
    select constraint_record.confdeltype::text
    from pg_catalog.pg_constraint constraint_record
    where constraint_record.conrelid =
      'public.event_social_publication_events'::regclass
      and constraint_record.conname =
        'event_social_publication_events_actor_id_fkey'
  ),
  'r',
  'immutable publication event actors use explicit delete restriction'
);
select ok(
  position(
    'publish_at - interval ''15 minutes'''
    in pg_get_functiondef(
      'public.claim_due_event_social_instagram_preparations(uuid,integer)'::regprocedure
    )
  ) > 0
  and position(
    'publish_at - interval ''10 minutes'''
    in pg_get_functiondef(
      'public.claim_due_event_social_instagram_preparations(uuid,integer)'::regprocedure
    )
  ) > 0
  and position(
    'publish_at + interval ''2 minutes'''
    in pg_get_functiondef(
      'public.start_event_social_provider_mutation(uuid,uuid,text)'::regprocedure
    )
  ) > 0
  and position(
    'pg_sleep'
    in pg_get_functiondef(
      'public.claim_due_event_social_instagram_preparations(uuid,integer)'::regprocedure
    )
  ) = 0,
  'Instagram stages at T-75 to T-70 and final mutation starts only at T-60 to T-58 without sleeps'
);

select ok(
  (select bool_and(relrowsecurity) from pg_class where oid in (
    'public.event_social_occurrences'::regclass,
    'public.event_social_destination_settings'::regclass,
    'public.event_social_publication_templates'::regclass,
    'public.event_social_publication_jobs'::regclass,
    'public.event_social_publication_events'::regclass
  )),
  'all event-social tables have RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'public.event_social_occurrences', 'select')
  and not has_table_privilege('authenticated', 'public.event_social_occurrences', 'select')
  and not has_table_privilege('authenticated', 'public.event_social_publication_templates', 'select')
  and not has_table_privilege('anon', 'public.event_social_publication_jobs', 'select')
  and not has_table_privilege('authenticated', 'public.event_social_publication_events', 'select')
  and has_table_privilege('service_role', 'public.event_social_occurrences', 'select')
  and not has_table_privilege('service_role', 'public.event_social_occurrences', 'insert')
  and not has_table_privilege('service_role', 'public.event_social_publication_jobs', 'update')
  and not has_table_privilege('service_role', 'public.event_social_publication_events', 'insert'),
  'browser roles are denied and service role writes only through reviewed RPCs'
);

select ok(
  not has_function_privilege('anon', 'public.materialize_event_social_occurrences(jsonb,text,text,jsonb,text,text)', 'execute')
  and not has_function_privilege('authenticated', 'public.set_event_social_template_approval(text,text,boolean,boolean,text,uuid,boolean)', 'execute')
  and not has_function_privilege('authenticated', 'public.claim_due_event_social_publications(uuid,text[],integer)', 'execute')
  and not has_function_privilege('authenticated', 'public.claim_due_event_social_instagram_preparations(uuid,integer)', 'execute')
  and not has_function_privilege('authenticated', 'public.start_event_social_instagram_preparation(uuid,uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.finish_event_social_instagram_preparation(uuid,uuid,text,text,text)', 'execute')
  and not has_function_privilege('authenticated', 'public.start_event_social_provider_mutation(uuid,uuid,text)', 'execute')
  and not has_function_privilege('authenticated', 'public.finish_event_social_pre_mutation(uuid,uuid,text,text)', 'execute')
  and not has_function_privilege('authenticated', 'public.sweep_event_social_publication_leases()', 'execute')
  and not has_function_privilege('authenticated', 'public.get_event_social_publication_reconciliation_snapshot(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.resolve_event_social_publication_reconciliation(uuid,text,timestamptz,text,uuid,text,text,text,text,boolean)', 'execute')
  and not has_function_privilege('anon', 'public.get_event_social_publication_reconciliation_snapshot(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.resolve_event_social_publication_reconciliation(uuid,text,timestamptz,text,uuid,text,text,text,text,boolean)', 'execute')
  and has_function_privilege('service_role', 'public.materialize_event_social_occurrences(jsonb,text,text,jsonb,text,text)', 'execute')
  and has_function_privilege('service_role', 'public.event_social_projection_is_current(text,text)', 'execute')
  and has_function_privilege('service_role', 'public.set_event_social_template_approval(text,text,boolean,boolean,text,uuid,boolean)', 'execute')
  and has_function_privilege('service_role', 'public.claim_due_event_social_instagram_preparations(uuid,integer)', 'execute')
  and has_function_privilege('service_role', 'public.start_event_social_instagram_preparation(uuid,uuid)', 'execute')
  and has_function_privilege('service_role', 'public.finish_event_social_instagram_preparation(uuid,uuid,text,text,text)', 'execute')
  and has_function_privilege('service_role', 'public.start_event_social_provider_mutation(uuid,uuid,text)', 'execute')
  and has_function_privilege('service_role', 'public.finish_event_social_pre_mutation(uuid,uuid,text,text)', 'execute')
  and has_function_privilege('service_role', 'public.sweep_event_social_publication_leases()', 'execute')
  and has_function_privilege('service_role', 'public.finish_event_social_publication(uuid,uuid,text,text,text,text,text)', 'execute')
  and has_function_privilege('service_role', 'public.get_event_social_publication_reconciliation_snapshot(uuid)', 'execute')
  and has_function_privilege('service_role', 'public.resolve_event_social_publication_reconciliation(uuid,text,timestamptz,text,uuid,text,text,text,text,boolean)', 'execute'),
  'all event-social mutation functions are service-role only'
);

select ok(
  to_regprocedure(
    'public.approve_event_social_destination(uuid,text,text,text,text,text,timestamptz,uuid,boolean)'
  ) is null
  and to_regprocedure(
    'public.preflight_event_social_publication(uuid,uuid,text)'
  ) is null,
  'no per-occurrence approval or legacy non-atomic provider preflight exists'
);

select is(
  (select count(*)::integer from public.event_social_destination_settings where enabled = false),
  3,
  'all three destination database flags default false'
);

select ok(
  exists (
    select 1 from cron.job
    where jobname = 'event-social-publication-every-minute'
      and schedule = '* * * * *'
  ),
  'the due-time scheduler ticks once per minute'
);

select ok(
  position(
    'https://deyvmtncimmcinldjyqe.supabase.co'
    in pg_get_functiondef('private.event_social_invoke_scheduler()'::regprocedure)
  ) > 0,
  'the scheduler invocation is pinned to the exact Mochirii Supabase project URL'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values (
  '81818181-8181-4818-8818-818181818181',
  'authenticated', 'authenticated', 'event-social-test@example.invalid', '', now(), now(), now()
);

insert into public.event_social_publication_events (actor_id, action)
values ('81818181-8181-4818-8818-818181818181', 'actor_retention_contract');

select lives_ok(
  $command$do $actor_retention$
  declare
    violated_constraint text;
  begin
    begin
      delete from auth.users
      where id = '81818181-8181-4818-8818-818181818181';
      raise exception 'event social actor deletion unexpectedly succeeded';
    exception when foreign_key_violation then
      get stacked diagnostics violated_constraint = constraint_name;
      if violated_constraint <>
        'event_social_publication_events_actor_id_fkey'
      then
        raise;
      end if;
    end;
  end;
  $actor_retention$;$command$,
  'referenced event-social audit actors cannot be deleted'
);

select is(
  (
    select event.actor_id::text
    from public.event_social_publication_events event
    where event.action = 'actor_retention_contract'
  ),
  '81818181-8181-4818-8818-818181818181',
  'failed actor deletion preserves immutable attribution'
);

create temporary view event_social_test_template_packet as
select jsonb_agg(jsonb_build_object(
  'sourceEventId', source_event_id,
  'destination', destination,
  'messageTemplate', source_event_id || ' {{EVENT_DATE}} {{EVENT_TIME_RANGE}} starts in one hour',
  'altTextTemplate', source_event_id || ' reminder artwork',
  'mediaPath', '/assets/img/event-social/' || source_event_id || '/'
    || case destination
      when 'facebook_page' then 'facebook.jpg'
      when 'instagram' then 'instagram.jpg'
      else 'discord.png'
    end,
  'mediaSha256', repeat('f', 64)
) order by source_event_id, destination) as packet
from unnest(array[
  'monthly-gathering', 'monthly-raffle', 'guild-party', 'breaking-army',
  'showdown', 'guild-wars', 'guild-heros-realm', 'united-resolve'
]) source_event_id
cross join unnest(array['facebook_page', 'instagram', 'discord']) destination;

select lives_ok(
  $$insert into public.event_social_publication_templates (
    source_event_id, destination, template_contract_version,
    schedule_sha256, content_sha256, message_template, alt_text_template,
    media_path, media_sha256, template_revision
  ) values (
    'path-boundary', 'facebook_page', 'event-social-content-v1',
    repeat('a', 64), repeat('b', 64),
    'Boundary {{EVENT_DATE}} {{EVENT_TIME_RANGE}}', 'Boundary reminder artwork',
    '/assets/' || repeat('a', 280) || '.jpg', repeat('f', 64), repeat('c', 64)
  )$$,
  'a 280-character event-social media path component is accepted'
);

delete from public.event_social_publication_templates
where source_event_id = 'path-boundary' and destination = 'facebook_page';

select throws_ok(
  $$select public.materialize_event_social_occurrences(
    '[]'::jsonb,
    'guild-schedule-event-social-v3', repeat('a', 64),
    (
      select jsonb_agg(
        case
          when value ->> 'sourceEventId' = 'monthly-gathering'
            and value ->> 'destination' = 'facebook_page'
          then value || jsonb_build_object(
            'mediaPath', '/assets/' || repeat('a', 281) || '.jpg'
          )
          else value
        end
      )
      from jsonb_array_elements(
        (select packet from event_social_test_template_packet)
      ) value
    ),
    'event-social-content-v1', repeat('b', 64)
  )$$,
  'P0001', 'invalid event social template packet',
  'a 281-character event-social media path component is rejected'
);

select throws_ok(
  $$select public.materialize_event_social_occurrences(
    '[]'::jsonb,
    'guild-schedule-event-social-v3', repeat('a', 64),
    (
      select jsonb_agg(
        case
          when value ->> 'sourceEventId' = 'monthly-gathering'
            and value ->> 'destination' = 'facebook_page'
          then value || jsonb_build_object(
            'mediaPath', '/assets/invalid+character.jpg'
          )
          else value
        end
      )
      from jsonb_array_elements(
        (select packet from event_social_test_template_packet)
      ) value
    ),
    'event-social-content-v1', repeat('b', 64)
  )$$,
  'P0001', 'invalid event social template packet',
  'an event-social media path with a non-allowlisted character is rejected'
);

select throws_ok(
  $$select public.materialize_event_social_occurrences(
    '[]'::jsonb,
    'guild-schedule-event-social-v3', repeat('a', 64),
    (
      select jsonb_agg(
        case
          when value ->> 'sourceEventId' = 'monthly-gathering'
            and value ->> 'destination' = 'facebook_page'
          then value || jsonb_build_object(
            'mediaPath', '/assets/safe/../unsafe.jpg'
          )
          else value
        end
      )
      from jsonb_array_elements(
        (select packet from event_social_test_template_packet)
      ) value
    ),
    'event-social-content-v1', repeat('b', 64)
  )$$,
  'P0001', 'invalid event social template packet',
  'an event-social media path containing traversal is rejected'
);

select lives_ok(
  $$select public.materialize_event_social_occurrences(
    '[
      {
        "sourceKey":"guild-party:2026-08-05",
        "sourceEventId":"guild-party",
        "sourceKind":"weekly",
        "title":"Guild Party",
        "localDate":"2026-08-05",
        "startsAt":"2026-08-05T13:30:00.000Z",
        "endsAt":"2026-08-05T14:00:00.000Z",
        "publishAt":"2026-08-05T12:30:00.000Z",
        "state":"scheduled",
        "supersededBySourceKey":null
      },
      {
        "sourceKey":"monthly-gathering:2026-08-05",
        "sourceEventId":"monthly-gathering",
        "sourceKind":"monthly",
        "title":"Monthly Guild Gathering",
        "localDate":"2026-08-05",
        "startsAt":"2026-08-05T13:30:00.000Z",
        "endsAt":"2026-08-05T14:00:00.000Z",
        "publishAt":"2026-08-05T12:30:00.000Z",
        "state":"scheduled",
        "supersededBySourceKey":null
      },
      {
        "sourceKey":"breaking-army:2026-08-05",
        "sourceEventId":"breaking-army",
        "sourceKind":"weekly",
        "title":"Breaking Army",
        "localDate":"2026-08-05",
        "startsAt":"2026-08-05T14:00:00.000Z",
        "endsAt":"2026-08-05T16:00:00.000Z",
        "publishAt":"2026-08-05T13:00:00.000Z",
        "state":"suppressed",
        "supersededBySourceKey":null
      }
    ]'::jsonb,
    'guild-schedule-event-social-v3',
    repeat('a', 64),
    (select packet from event_social_test_template_packet),
    'event-social-content-v1',
    repeat('b', 64)
  )$$,
  'monthly and weekly collision materializes atomically'
);

select is(
  (select state from public.event_social_occurrences where source_key = 'guild-party:2026-08-05'),
  'superseded',
  'same-time Guild Party is explicitly superseded'
);

select is(
  (select superseded_by_source_key from public.event_social_occurrences where source_key = 'guild-party:2026-08-05'),
  'monthly-gathering:2026-08-05',
  'monthly occurrence owns the collision'
);

select is(
  (select state from public.event_social_occurrences where source_key = 'breaking-army:2026-08-05'),
  'suppressed',
  'the manual Breaking Army one-off creates no publishable Wednesday occurrence'
);

select is(
  (select count(*)::integer from public.event_social_publication_jobs),
  3,
  'one independent job is created per destination only for the owning occurrence'
);

select is(
  (
    select count(*)::integer
    from public.event_social_publication_templates
    where approved = false and enabled = false
  ),
  24,
  'every reusable event template defaults to unapproved and disabled'
);

select ok(
  public.set_event_social_template_approval(
    'monthly-gathering',
    'discord',
    true,
    true,
    (
      select template_revision
      from public.event_social_publication_templates
      where source_event_id = 'monthly-gathering' and destination = 'discord'
    ),
    '81818181-8181-4818-8818-818181818181',
    true
  ),
  'an owner/operator can approve one exact reusable template revision'
);

select lives_ok(
  $$select public.materialize_event_social_occurrences(
    (
      select jsonb_agg(jsonb_build_object(
        'sourceKey', occurrence.source_key,
        'sourceEventId', occurrence.source_event_id,
        'sourceKind', occurrence.source_kind,
        'title', occurrence.title,
        'localDate', occurrence.local_date,
        'startsAt', occurrence.starts_at,
        'endsAt', occurrence.ends_at,
        'publishAt', occurrence.publish_at,
        'state', occurrence.state,
        'supersededBySourceKey', occurrence.superseded_by_source_key
      ) order by occurrence.starts_at, occurrence.source_kind)
      from public.event_social_occurrences occurrence
    ),
    'guild-schedule-event-social-v3', repeat('a', 64),
    (select packet from event_social_test_template_packet),
    'event-social-content-v1', repeat('b', 64)
  )$$,
  'an unchanged approved template auto-materializes its destination job'
);

select is(
  (
    select status || ':' || approval_mode
    from public.event_social_publication_jobs job
    join public.event_social_occurrences occurrence on occurrence.id = job.occurrence_id
    where occurrence.source_key = 'monthly-gathering:2026-08-05'
      and job.destination = 'discord'
  ),
  'approved:template',
  'normal recurring automation uses reusable template approval without a per-occurrence confirmation'
);

select lives_ok(
  $$select public.materialize_event_social_occurrences(
    (
      select jsonb_agg(jsonb_build_object(
        'sourceKey', occurrence.source_key,
        'sourceEventId', occurrence.source_event_id,
        'sourceKind', occurrence.source_kind,
        'title', occurrence.title,
        'localDate', occurrence.local_date,
        'startsAt', occurrence.starts_at,
        'endsAt', occurrence.ends_at,
        'publishAt', occurrence.publish_at,
        'state', occurrence.state,
        'supersededBySourceKey', occurrence.superseded_by_source_key
      ) order by occurrence.starts_at, occurrence.source_kind)
      from public.event_social_occurrences occurrence
    ),
    'guild-schedule-event-social-v3', repeat('a', 64),
    (
      select jsonb_agg(
        case
          when value ->> 'sourceEventId' = 'monthly-gathering'
            and value ->> 'destination' = 'discord'
          then value || jsonb_build_object('mediaSha256', repeat('e', 64))
          else value
        end
      )
      from jsonb_array_elements(
        (select packet from event_social_test_template_packet)
      ) value
    ),
    'event-social-content-v1', repeat('b', 64)
  )$$,
  'asset-hash drift is processed without reviving or publishing a job'
);

select is(
  (
    select concat_ws(':', template.approved, template.enabled, job.status)
    from public.event_social_publication_templates template
    join public.event_social_occurrences occurrence
      on occurrence.source_event_id = template.source_event_id
    join public.event_social_publication_jobs job
      on job.occurrence_id = occurrence.id
      and job.destination = template.destination
    where occurrence.source_key = 'monthly-gathering:2026-08-05'
      and template.destination = 'discord'
  ),
  'f:f:pending_approval',
  'asset drift revokes reusable approval and invalidates the auto-approved job'
);

select is(
  (select count(*)::integer from public.event_social_publication_jobs where destination = 'facebook_page'),
  1,
  'Facebook Page has one job'
);
select is(
  (select count(*)::integer from public.event_social_publication_jobs where destination = 'instagram'),
  1,
  'Instagram has one job'
);
select is(
  (select count(*)::integer from public.event_social_publication_jobs where destination = 'discord'),
  1,
  'Discord has one job'
);

select ok(
  public.cancel_event_social_occurrence(
    (select id from public.event_social_occurrences where source_key = 'monthly-gathering:2026-08-05'),
    '81818181-8181-4818-8818-818181818181', true
  ),
  'monthly occurrence cancellation succeeds'
);

select lives_ok(
  $$select public.materialize_event_social_occurrences(
    '[
      {
        "sourceKey":"monthly-gathering:2026-08-05",
        "sourceEventId":"monthly-gathering",
        "sourceKind":"monthly",
        "title":"Monthly Guild Gathering",
        "localDate":"2026-08-05",
        "startsAt":"2026-08-05T13:30:00.000Z",
        "endsAt":"2026-08-05T14:00:00.000Z",
        "publishAt":"2026-08-05T12:30:00.000Z",
        "state":"scheduled",
        "supersededBySourceKey":null
      },
      {
        "sourceKey":"guild-party:2026-08-05",
        "sourceEventId":"guild-party",
        "sourceKind":"weekly",
        "title":"Guild Party",
        "localDate":"2026-08-05",
        "startsAt":"2026-08-05T13:30:00.000Z",
        "endsAt":"2026-08-05T14:00:00.000Z",
        "publishAt":"2026-08-05T12:30:00.000Z",
        "state":"superseded",
        "supersededBySourceKey":"monthly-gathering:2026-08-05"
      }
    ]'::jsonb,
    'guild-schedule-event-social-v3',
    repeat('a', 64),
    (select packet from event_social_test_template_packet),
    'event-social-content-v1',
    repeat('b', 64)
  )$$,
  'a weekly-only re-materialization after monthly cancellation succeeds'
);

select is(
  (select state from public.event_social_occurrences where source_key = 'monthly-gathering:2026-08-05'),
  'canceled',
  'canceled monthly occurrence is not revived'
);

select is(
  (select state from public.event_social_occurrences where source_key = 'guild-party:2026-08-05'),
  'superseded',
  'canceled monthly occurrence does not revive the same-time Guild Party'
);

select is(
  (select count(*)::integer from public.event_social_publication_jobs where status = 'canceled'),
  3,
  'cancellation atomically makes every unattempted destination non-publishable'
);

insert into public.event_social_occurrences (
  source_key, source_event_id, source_kind, title, local_date,
  starts_at, ends_at, publish_at, state,
  schedule_contract_version, schedule_sha256
) values (
  'preparation-probe:2099-01-01', 'preparation-probe', 'weekly',
  'Preparation Probe', '2099-01-01',
  now() + interval '1 day', now() + interval '1 day 30 minutes',
  now() + interval '23 hours', 'scheduled',
  'event-social-test-v1', repeat('c', 64)
);

insert into public.event_social_publication_jobs (
  occurrence_id, destination, status, content_version, message, alt_text,
  media_path, media_sha256, approval_mode, template_id, template_revision,
  approved_by, approved_at, approved_occurrence_updated_at,
  confirmation_fingerprint, claim_token, claim_expires_at,
  preparation_attempt_count, preparation_started_at
)
select occurrence.id, 'instagram', 'preparing', 'event-social-v1',
  'Preparation expiry test', 'Preparation expiry reminder artwork',
  '/assets/img/events/preparation-probe.jpg', repeat('d', 64),
  'template', template.id, template.template_revision,
  '81818181-8181-4818-8818-818181818181', now(), occurrence.updated_at,
  repeat('e', 64), '83838383-8383-4838-8838-838383838383',
  clock_timestamp() - interval '1 minute', 1,
  clock_timestamp() - interval '5 minutes'
from public.event_social_occurrences occurrence
cross join public.event_social_publication_templates template
where occurrence.source_key = 'preparation-probe:2099-01-01'
  and template.source_event_id = 'monthly-gathering'
  and template.destination = 'instagram';

update public.event_social_destination_settings
set enabled = true,
  confirmed_by = '81818181-8181-4818-8818-818181818181',
  confirmed_at = now()
where destination = 'instagram';

select throws_ok(
  $$select public.finish_event_social_instagram_preparation(
    (
      select job.id
      from public.event_social_publication_jobs job
      join public.event_social_occurrences occurrence on occurrence.id = job.occurrence_id
      where occurrence.source_key = 'preparation-probe:2099-01-01'
        and job.destination = 'instagram'
    ),
    '83838383-8383-4838-8838-838383838383',
    'reconcile_required', null,
    'instagram_container_unexpectedly_published'
  )$$,
  'P0001', 'invalid event social Instagram preparation reconciliation',
  'a missing server-recorded Instagram container cannot enter reconciliation'
);

create temporary table event_social_preparation_sweep_result as
select public.sweep_event_social_publication_leases() as result;

select is(
  (
    select concat(
      result ->> 'expiredPreparationFailures', ':',
      result ->> 'expiredReconciliations'
    )
    from event_social_preparation_sweep_result
  ),
  '1:0',
  'an expired non-public container lease fails without creating reconciliation'
);

select is(
  (
    select concat_ws(':', job.status, job.failure_category)
    from public.event_social_publication_jobs job
    join public.event_social_occurrences occurrence on occurrence.id = job.occurrence_id
    where occurrence.source_key = 'preparation-probe:2099-01-01'
      and job.destination = 'instagram'
  ),
  'failed:instagram_container_mutation_lease_expired',
  'the uncertain container creation is terminally failed and never retried'
);

select is(
  (select enabled from public.event_social_destination_settings where destination = 'instagram'),
  true,
  'a non-public container failure does not disable Instagram'
);

select ok(
  exists (
    select 1
    from public.event_social_publication_events event
    join public.event_social_occurrences occurrence on occurrence.id = event.occurrence_id
    where occurrence.source_key = 'preparation-probe:2099-01-01'
      and event.action = 'failed'
      and event.detail = '{"category":"instagram_container_mutation_lease_expired"}'::jsonb
  )
  and not exists (
    select 1
    from public.event_social_publication_events event
    join public.event_social_occurrences occurrence on occurrence.id = event.occurrence_id
    where occurrence.source_key = 'preparation-probe:2099-01-01'
      and event.action = 'destination_auto_disabled'
  ),
  'the non-public container failure is audited without an auto-disable event'
);

update public.event_social_publication_jobs job
set status = 'reconcile_required',
  provider_secondary_id = '17900000000000000',
  failure_category = 'instagram_transport_ambiguous'
from public.event_social_occurrences occurrence
where occurrence.id = job.occurrence_id
  and occurrence.source_key = 'preparation-probe:2099-01-01'
  and job.destination = 'instagram';

select throws_ok(
  $$select public.resolve_event_social_publication_reconciliation(
    (
      select job.id
      from public.event_social_publication_jobs job
      join public.event_social_occurrences occurrence on occurrence.id = job.occurrence_id
      where occurrence.source_key = 'preparation-probe:2099-01-01'
        and job.destination = 'instagram'
    ),
    'instagram',
    (
      select job.updated_at
      from public.event_social_publication_jobs job
      join public.event_social_occurrences occurrence on occurrence.id = job.occurrence_id
      where occurrence.source_key = 'preparation-probe:2099-01-01'
        and job.destination = 'instagram'
    ),
    'confirmed_published',
    '81818181-8181-4818-8818-818181818181',
    'The pinned Instagram account and exact media object were inspected.',
    '18000000000000000', '17999999999999999',
    'https://www.instagram.com/p/TestCode123/', true
  )$$,
  'P0001', 'invalid verified event social publication',
  'Instagram reconciliation rejects a container that differs from the server record'
);

insert into public.event_social_occurrences (
  source_key, source_event_id, source_kind, title, local_date,
  starts_at, ends_at, publish_at, state,
  schedule_contract_version, schedule_sha256
) values (
  'lease-probe:2099-01-01', 'lease-probe', 'weekly', 'Lease Probe', '2099-01-01',
  now() + interval '1 day', now() + interval '1 day 30 minutes',
  now() + interval '23 hours', 'scheduled',
  'event-social-test-v1', repeat('c', 64)
);

insert into public.event_social_publication_jobs (
  occurrence_id, destination, status, content_version, message, alt_text,
  media_path, media_sha256, approval_mode, template_id, template_revision,
  approved_by, approved_at, approved_occurrence_updated_at,
  confirmation_fingerprint, claim_token, claim_expires_at, attempt_count,
  provider_mutation_started_at
)
select occurrence.id, 'facebook_page', 'publishing', 'event-social-v1',
  'Lease expiry test', 'Lease expiry reminder artwork',
  '/assets/img/events/lease-probe.jpg', repeat('d', 64),
  'template', template.id, template.template_revision,
  '81818181-8181-4818-8818-818181818181', now(), occurrence.updated_at,
  repeat('e', 64), '82828282-8282-4828-8828-828282828282',
  clock_timestamp() - interval '1 minute', 1,
  clock_timestamp() - interval '6 minutes'
from public.event_social_occurrences occurrence
cross join public.event_social_publication_templates template
where occurrence.source_key = 'lease-probe:2099-01-01'
  and template.source_event_id = 'monthly-gathering'
  and template.destination = 'facebook_page';

update public.event_social_destination_settings
set enabled = true,
  confirmed_by = '81818181-8181-4818-8818-818181818181',
  confirmed_at = now()
where destination = 'facebook_page';

select lives_ok(
  $$select public.sweep_event_social_publication_leases()$$,
  'the unconditional sweep quarantines an expired in-flight lease'
);

select is(
  (
    select job.status
    from public.event_social_publication_jobs job
    join public.event_social_occurrences occurrence on occurrence.id = job.occurrence_id
    where occurrence.source_key = 'lease-probe:2099-01-01'
      and job.destination = 'facebook_page'
  ),
  'reconcile_required',
  'an expired publishing lease is quarantined instead of retried'
);

select is(
  (select enabled from public.event_social_destination_settings where destination = 'facebook_page'),
  false,
  'reconciliation atomically disables the affected database destination'
);

select is(
  public.start_event_social_provider_mutation(
    (
      select job.id
      from public.event_social_publication_jobs job
      join public.event_social_occurrences occurrence on occurrence.id = job.occurrence_id
      where occurrence.source_key = 'lease-probe:2099-01-01'
        and job.destination = 'facebook_page'
    ),
    '82828282-8282-4828-8828-828282828282',
    'facebook_page'
  ),
  false,
  'a quarantined job cannot pass the final atomic provider-mutation gate'
);

select throws_ok(
  $$select public.set_event_social_destination_enabled(
    'facebook_page', true,
    '81818181-8181-4818-8818-818181818181', true
  )$$,
  'P0001', 'event social destination has unresolved reconciliation',
  'a destination cannot reactivate while reconciliation is unresolved'
);

select ok(
  exists (
    select 1
    from public.event_social_publication_events event
    join public.event_social_occurrences occurrence on occurrence.id = event.occurrence_id
    where occurrence.source_key = 'lease-probe:2099-01-01'
      and event.action = 'reconcile_required'
      and event.detail = '{"category":"provider_mutation_lease_expired"}'::jsonb
  ),
  'expired-lease quarantine is recorded in the immutable audit log'
);

select ok(
  exists (
    select 1
    from public.event_social_publication_events event
    where event.destination = 'facebook_page'
      and event.action = 'destination_auto_disabled'
      and event.detail ->> 'category' = 'provider_mutation_lease_expired'
  ),
  'reconciliation-triggered shutdown is recorded in the immutable audit log'
);

create temporary table event_social_absent_reconciliation_probe as
select job.id, job.updated_at
from public.event_social_publication_jobs job
join public.event_social_occurrences occurrence on occurrence.id = job.occurrence_id
where occurrence.source_key = 'lease-probe:2099-01-01'
  and job.destination = 'facebook_page';

select is(
  (
    select concat(
      snapshot ->> 'found', ':', snapshot ->> 'destination_enabled'
    )
    from (
      select public.get_event_social_publication_reconciliation_snapshot(
        probe.id
      ) as snapshot
      from event_social_absent_reconciliation_probe probe
    ) value
  ),
  'true:false',
  'the service-only snapshot exposes one disabled reconcilable job'
);

select is(
  (
    select public.resolve_event_social_publication_reconciliation(
      probe.id,
      'facebook_page',
      probe.updated_at - interval '1 second',
      'confirmed_not_published',
      '81818181-8181-4818-8818-818181818181',
      'The pinned Page was inspected and no matching publication exists.',
      null, null, null, true
    ) ->> 'committed'
    from event_social_absent_reconciliation_probe probe
  ),
  'false',
  'a stale expected revision is rejected while reconciliation remains open'
);

select is(
  (
    select public.resolve_event_social_publication_reconciliation(
      probe.id,
      'facebook_page',
      probe.updated_at,
      'confirmed_not_published',
      '81818181-8181-4818-8818-818181818181',
      'The pinned Page was inspected and no matching publication exists.',
      null, null, null, true
    ) ->> 'committed'
    from event_social_absent_reconciliation_probe probe
  ),
  'true',
  'a moderator-verified absent publication resolves atomically'
);

select is(
  (
    select concat_ws(
      ':', job.status, job.reconciliation_resolution,
      job.reconciled_by::text, job.reconciliation_note
    )
    from public.event_social_publication_jobs job
    join event_social_absent_reconciliation_probe probe on probe.id = job.id
  ),
  'failed:confirmed_not_published:81818181-8181-4818-8818-818181818181:The pinned Page was inspected and no matching publication exists.',
  'the absent-publication result preserves its private moderator evidence'
);

select is(
  (select enabled from public.event_social_destination_settings where destination = 'facebook_page'),
  false,
  'resolving an absent publication does not reactivate the destination'
);

select ok(
  exists (
    select 1
    from public.event_social_publication_events event
    join event_social_absent_reconciliation_probe probe on probe.id = event.job_id
    where event.action = 'reconciliation_confirmed_not_published'
      and event.detail = jsonb_build_object(
        'resolution', 'confirmed_not_published',
        'category', 'provider_absence_verified'
      )
      and not (event.detail ?| array['note', 'providerPrimaryId', 'provider_permalink'])
  ),
  'the immutable absent-publication audit excludes notes and provider identifiers'
);

select is(
  (
    select public.resolve_event_social_publication_reconciliation(
      probe.id,
      'facebook_page',
      probe.updated_at,
      'confirmed_not_published',
      '81818181-8181-4818-8818-818181818181',
      'The pinned Page was inspected and no matching publication exists.',
      null, null, null, true
    ) ->> 'committed'
    from event_social_absent_reconciliation_probe probe
  ),
  'false',
  'a resolved or stale reconciliation cannot be committed again'
);

insert into public.event_social_occurrences (
  source_key, source_event_id, source_kind, title, local_date,
  starts_at, ends_at, publish_at, state,
  schedule_contract_version, schedule_sha256
) values (
  'published-reconciliation-probe:2099-01-02',
  'published-reconciliation-probe', 'weekly',
  'Published Reconciliation Probe', '2099-01-02',
  now() + interval '2 days', now() + interval '2 days 30 minutes',
  now() + interval '47 hours', 'scheduled',
  'event-social-test-v1', repeat('c', 64)
);

insert into public.event_social_publication_jobs (
  occurrence_id, destination, status, content_version, message, alt_text,
  media_path, media_sha256, approval_mode, template_id, template_revision,
  approved_by, approved_at, approved_occurrence_updated_at,
  confirmation_fingerprint, attempt_count, provider_mutation_started_at,
  provider_primary_id, failure_category
)
select occurrence.id, 'facebook_page', 'reconcile_required', 'event-social-v1',
  'Published reconciliation test', 'Published reconciliation artwork',
  '/assets/img/events/published-reconciliation-probe.jpg', repeat('d', 64),
  'template', template.id, template.template_revision,
  '81818181-8181-4818-8818-818181818181', now(), occurrence.updated_at,
  repeat('e', 64), 1, clock_timestamp() - interval '1 minute',
  '6234567890123456', 'facebook_ownership_unverified'
from public.event_social_occurrences occurrence
cross join public.event_social_publication_templates template
where occurrence.source_key = 'published-reconciliation-probe:2099-01-02'
  and template.source_event_id = 'monthly-gathering'
  and template.destination = 'facebook_page';

create temporary table event_social_published_reconciliation_probe as
select job.id, job.updated_at
from public.event_social_publication_jobs job
join public.event_social_occurrences occurrence on occurrence.id = job.occurrence_id
where occurrence.source_key = 'published-reconciliation-probe:2099-01-02'
  and job.destination = 'facebook_page';

select is(
  (
    select public.resolve_event_social_publication_reconciliation(
      probe.id,
      'facebook_page',
      probe.updated_at,
      'confirmed_published',
      '81818181-8181-4818-8818-818181818181',
      'The exact pinned Page photo was verified against its canonical permalink.',
      '6234567890123456', null,
      'https://www.facebook.com/photo.php?fbid=6234567890123456',
      true
    ) ->> 'committed'
    from event_social_published_reconciliation_probe probe
  ),
  'true',
  'a provider-verified publication resolves atomically'
);

select is(
  (
    select concat_ws(':', job.status, job.reconciliation_resolution)
    from public.event_social_publication_jobs job
    join event_social_published_reconciliation_probe probe on probe.id = job.id
  ),
  'published:confirmed_published',
  'the verified publication is recorded as published and reconciled'
);

select is(
  (
    select concat_ws(':', job.provider_primary_id, job.provider_permalink)
    from public.event_social_publication_jobs job
    join event_social_published_reconciliation_probe probe on probe.id = job.id
  ),
  '6234567890123456:https://www.facebook.com/photo.php?fbid=6234567890123456',
  'only the verified provider identity and canonical permalink are stored'
);

select is(
  (select enabled from public.event_social_destination_settings where destination = 'facebook_page'),
  false,
  'resolving a verified publication does not reactivate the destination'
);

select ok(
  exists (
    select 1
    from public.event_social_publication_events event
    join event_social_published_reconciliation_probe probe on probe.id = event.job_id
    where event.action = 'reconciliation_confirmed_published'
      and event.detail = jsonb_build_object(
        'resolution', 'confirmed_published',
        'category', 'provider_publication_verified'
      )
      and not (event.detail ?| array['note', 'providerPrimaryId', 'provider_permalink'])
  ),
  'the immutable published audit excludes notes and provider identifiers'
);

select is(
  (
    select public.resolve_event_social_publication_reconciliation(
      probe.id,
      'facebook_page',
      probe.updated_at,
      'confirmed_published',
      '81818181-8181-4818-8818-818181818181',
      'The exact pinned Page photo was verified against its canonical permalink.',
      '6234567890123456', null,
      'https://www.facebook.com/photo.php?fbid=6234567890123456',
      true
    ) ->> 'committed'
    from event_social_published_reconciliation_probe probe
  ),
  'false',
  'a published reconciliation cannot be replayed'
);

select throws_ok(
  $$update public.event_social_publication_events set detail = '{}'::jsonb$$,
  'P0001', 'event social publication events are immutable',
  'server audit events cannot be rewritten'
);

select * from finish();
rollback;
