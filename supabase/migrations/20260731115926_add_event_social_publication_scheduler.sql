create table public.event_social_occurrences (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_event_id text not null,
  source_kind text not null check (source_kind in ('monthly', 'weekly')),
  title text not null,
  local_date date not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  publish_at timestamptz not null,
  state text not null default 'scheduled'
    check (state in ('scheduled', 'superseded', 'suppressed', 'canceled')),
  superseded_by_source_key text,
  schedule_contract_version text not null,
  schedule_sha256 text not null check (schedule_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_social_occurrence_source_key_format
    check (source_key ~ '^[a-z0-9-]{1,80}:[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  constraint event_social_occurrence_source_id_format
    check (source_event_id ~ '^[a-z0-9-]{1,80}$'),
  constraint event_social_occurrence_title_bounds
    check (char_length(title) between 1 and 100),
  constraint event_social_occurrence_time_order
    check (ends_at > starts_at and publish_at = starts_at - interval '1 hour'),
  constraint event_social_occurrence_supersession_shape
    check (
      (state = 'superseded' and superseded_by_source_key is not null)
      or (state <> 'superseded' and superseded_by_source_key is null)
    )
);

create index event_social_occurrences_publish_idx
  on public.event_social_occurrences (publish_at, state);

create table public.event_social_destination_settings (
  destination text primary key
    check (destination in ('facebook_page', 'instagram', 'discord')),
  enabled boolean not null default false,
  confirmed_by uuid references auth.users(id) on delete restrict,
  confirmed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint event_social_destination_confirmation
    check (
      (enabled = false)
      or (confirmed_by is not null and confirmed_at is not null)
    )
);

insert into public.event_social_destination_settings (destination, enabled)
values ('facebook_page', false), ('instagram', false), ('discord', false);

create table public.event_social_publication_templates (
  id uuid primary key default gen_random_uuid(),
  source_event_id text not null
    check (source_event_id ~ '^[a-z0-9-]{1,80}$'),
  destination text not null
    check (destination in ('facebook_page', 'instagram', 'discord')),
  template_contract_version text not null
    check (template_contract_version ~ '^[a-z0-9-]{1,80}$'),
  schedule_sha256 text not null check (schedule_sha256 ~ '^[0-9a-f]{64}$'),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  message_template text not null check (char_length(message_template) between 1 and 500),
  alt_text_template text not null check (char_length(alt_text_template) between 1 and 500),
  media_path text not null,
  media_sha256 text check (media_sha256 is null or media_sha256 ~ '^[0-9a-f]{64}$'),
  template_revision text not null check (template_revision ~ '^[0-9a-f]{64}$'),
  approved boolean not null default false,
  enabled boolean not null default false,
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_event_id, destination),
  constraint event_social_template_media_path check (
    media_path ~ '^/assets/[A-Za-z0-9_./-]+\.(jpg|jpeg|png|webp)$'
    and char_length(regexp_replace(
      media_path, '^/assets/|\.(jpg|jpeg|png|webp)$', '', 'g'
    )) between 1 and 280
    and position('..' in media_path) = 0
    and (
      (destination in ('facebook_page', 'instagram') and media_path ~ '\.(jpg|jpeg)$')
      or (destination = 'discord' and media_path ~ '\.png$')
    )
  ),
  constraint event_social_template_approval_shape check (
    (
      approved = false and enabled = false and approved_by is null
      and approved_at is null
    ) or (
      approved = true and media_sha256 is not null
      and approved_by is not null and approved_at is not null
    )
  ),
  constraint event_social_template_enablement check (enabled = false or approved = true)
);

create table public.event_social_publication_jobs (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references public.event_social_occurrences(id) on delete restrict,
  destination text not null
    check (destination in ('facebook_page', 'instagram', 'discord')),
  status text not null default 'pending_approval'
    check (status in (
      'pending_approval', 'approved', 'preparing', 'prepared',
      'publishing', 'published',
      'reconcile_required', 'failed', 'canceled'
    )),
  content_version text,
  message text,
  alt_text text,
  media_path text,
  media_sha256 text,
  approval_mode text check (
    approval_mode is null or approval_mode = 'template'
  ),
  template_id uuid references public.event_social_publication_templates(id) on delete restrict,
  template_revision text check (
    template_revision is null or template_revision ~ '^[0-9a-f]{64}$'
  ),
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  approved_occurrence_updated_at timestamptz,
  confirmation_fingerprint text,
  claim_token uuid,
  claim_expires_at timestamptz,
  preparation_attempt_count integer not null default 0
    check (preparation_attempt_count between 0 and 1),
  preparation_started_at timestamptz,
  prepared_at timestamptz,
  preparation_fingerprint text,
  attempt_count integer not null default 0 check (attempt_count between 0 and 1),
  provider_mutation_started_at timestamptz,
  provider_primary_id text,
  provider_secondary_id text,
  provider_permalink text,
  published_at timestamptz,
  failure_category text,
  reconciled_by uuid references auth.users(id) on delete restrict,
  reconciled_at timestamptz,
  reconciliation_resolution text check (
    reconciliation_resolution is null
    or reconciliation_resolution in ('confirmed_published', 'confirmed_not_published')
  ),
  reconciliation_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (occurrence_id, destination),
  constraint event_social_job_copy_bounds check (
    (message is null or char_length(message) between 1 and 500)
    and (alt_text is null or char_length(alt_text) between 1 and 500)
  ),
  constraint event_social_job_media_path check (
    media_path is null or (
      media_path ~ '^/assets/[A-Za-z0-9_./-]+\.(jpg|jpeg|png|webp)$'
      and char_length(regexp_replace(
        media_path, '^/assets/|\.(jpg|jpeg|png|webp)$', '', 'g'
      )) between 1 and 280
      and position('..' in media_path) = 0
    )
  ),
  constraint event_social_job_media_hash check (
    media_sha256 is null or media_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint event_social_job_fingerprint check (
    confirmation_fingerprint is null or confirmation_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint event_social_job_reconciliation_shape check (
    (
      reconciliation_resolution is null
      and reconciled_by is null
      and reconciled_at is null
      and reconciliation_note is null
    ) or (
      reconciliation_resolution is not null
      and reconciled_at is not null
      and reconciliation_note is not null
      and btrim(reconciliation_note) <> ''
      and char_length(reconciliation_note) between 1 and 500
      and (
        (reconciliation_resolution = 'confirmed_published' and status = 'published')
        or (reconciliation_resolution = 'confirmed_not_published' and status = 'failed')
      )
    )
  ),
  constraint event_social_job_preparation_fingerprint check (
    preparation_fingerprint is null or preparation_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint event_social_job_preparation_shape check (
    (
      preparation_attempt_count = 0
      and preparation_started_at is null
      and prepared_at is null
      and preparation_fingerprint is null
    ) or (
      destination = 'instagram'
      and preparation_attempt_count = 1
      and preparation_started_at is not null
      and (
        prepared_at is null
        or (
          provider_secondary_id is not null
          and preparation_fingerprint is not null
        )
      )
    )
  ),
  constraint event_social_job_provider_mutation_shape check (
    (attempt_count = 0 and provider_mutation_started_at is null)
    or (attempt_count = 1 and provider_mutation_started_at is not null)
  ),
  constraint event_social_job_prepared_status_shape check (
    status <> 'prepared'
    or (
      destination = 'instagram'
      and preparation_attempt_count = 1
      and preparation_started_at is not null
      and prepared_at is not null
      and provider_secondary_id is not null
      and preparation_fingerprint is not null
      and attempt_count = 0
      and provider_mutation_started_at is null
    )
  ),
  constraint event_social_job_approval_shape check (
    status in ('pending_approval', 'canceled')
    or (
      content_version is not null
      and message is not null
      and alt_text is not null
      and media_path is not null
      and media_sha256 is not null
      and approved_by is not null
      and approved_at is not null
      and approved_occurrence_updated_at is not null
      and confirmation_fingerprint is not null
      and approval_mode = 'template'
      and template_id is not null
      and template_revision is not null
    )
  )
);

create index event_social_publication_jobs_due_idx
  on public.event_social_publication_jobs (status, destination, occurrence_id);

create table public.event_social_publication_events (
  id bigint generated always as identity primary key,
  occurrence_id uuid references public.event_social_occurrences(id) on delete restrict,
  job_id uuid references public.event_social_publication_jobs(id) on delete restrict,
  destination text check (
    destination is null or destination in ('facebook_page', 'instagram', 'discord')
  ),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action ~ '^[a-z][a-z0-9_]{0,79}$'),
  detail jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint event_social_event_detail_object
    check (jsonb_typeof(detail) = 'object' and pg_column_size(detail) <= 4096)
);

create index event_social_publication_events_job_idx
  on public.event_social_publication_events (job_id, occurred_at desc);

alter table public.event_social_occurrences enable row level security;
alter table public.event_social_destination_settings enable row level security;
alter table public.event_social_publication_templates enable row level security;
alter table public.event_social_publication_jobs enable row level security;
alter table public.event_social_publication_events enable row level security;

revoke all on table public.event_social_occurrences from public, anon, authenticated;
revoke all on table public.event_social_destination_settings from public, anon, authenticated;
revoke all on table public.event_social_publication_templates from public, anon, authenticated;
revoke all on table public.event_social_publication_jobs from public, anon, authenticated;
revoke all on table public.event_social_publication_events from public, anon, authenticated;
revoke all on sequence public.event_social_publication_events_id_seq from public, anon, authenticated;
revoke all on sequence public.event_social_publication_events_id_seq from service_role;
grant select on table public.event_social_occurrences to service_role;
grant select on table public.event_social_destination_settings to service_role;
grant select on table public.event_social_publication_templates to service_role;
grant select on table public.event_social_publication_jobs to service_role;
grant select on table public.event_social_publication_events to service_role;

create policy event_social_occurrences_service_only_default_deny
on public.event_social_occurrences as restrictive for all to public using (false) with check (false);
create policy event_social_destination_settings_service_only_default_deny
on public.event_social_destination_settings as restrictive for all to public using (false) with check (false);
create policy event_social_publication_templates_service_only_default_deny
on public.event_social_publication_templates as restrictive for all to public using (false) with check (false);
create policy event_social_publication_jobs_service_only_default_deny
on public.event_social_publication_jobs as restrictive for all to public using (false) with check (false);
create policy event_social_publication_events_service_only_default_deny
on public.event_social_publication_events as restrictive for all to public using (false) with check (false);

create trigger set_event_social_occurrences_updated_at
before update on public.event_social_occurrences
for each row execute function public.set_updated_at();

create trigger set_event_social_destination_settings_updated_at
before update on public.event_social_destination_settings
for each row execute function public.set_updated_at();

create trigger set_event_social_publication_templates_updated_at
before update on public.event_social_publication_templates
for each row execute function public.set_updated_at();

create trigger set_event_social_publication_jobs_updated_at
before update on public.event_social_publication_jobs
for each row execute function public.set_updated_at();

create or replace function private.event_social_events_are_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'event social publication events are immutable';
end;
$$;

revoke all on function private.event_social_events_are_immutable() from public, anon, authenticated;
grant execute on function private.event_social_events_are_immutable() to service_role;

create trigger event_social_publication_events_immutable
before update or delete on public.event_social_publication_events
for each row execute function private.event_social_events_are_immutable();

create or replace function private.event_social_disable_on_reconciliation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  destination_was_enabled boolean := false;
begin
  if new.status = 'reconcile_required'
    and old.status is distinct from new.status
  then
    select setting.enabled into destination_was_enabled
    from public.event_social_destination_settings setting
    where setting.destination = new.destination
    for update;

    update public.event_social_destination_settings setting
    set enabled = false,
      confirmed_by = null,
      confirmed_at = null
    where setting.destination = new.destination
      and (
        setting.enabled = true
        or setting.confirmed_by is not null
        or setting.confirmed_at is not null
      );

    insert into public.event_social_publication_events (
      occurrence_id, job_id, destination, action, detail
    ) values (
      new.occurrence_id, new.id, new.destination,
      'destination_auto_disabled',
      jsonb_build_object(
        'category', coalesce(new.failure_category, 'reconciliation_fail_closed'),
        'wasEnabled', coalesce(destination_was_enabled, false)
      )
    );
  end if;
  return new;
end;
$$;

revoke all on function private.event_social_disable_on_reconciliation()
  from public, anon, authenticated;
grant execute on function private.event_social_disable_on_reconciliation()
  to service_role;

create trigger event_social_reconciliation_disables_destination
after update of status on public.event_social_publication_jobs
for each row execute function private.event_social_disable_on_reconciliation();

create or replace function private.render_event_social_template(
  p_template text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  local_start timestamp := p_starts_at at time zone 'Asia/Singapore';
  local_end timestamp := p_ends_at at time zone 'Asia/Singapore';
  event_date text;
  event_time_range text;
  rendered text;
begin
  if p_template is null or char_length(p_template) not between 1 and 500 then
    raise exception 'invalid event social template';
  end if;
  event_date := trim(to_char(local_start, 'FMMonth FMDD, YYYY'));
  event_time_range := trim(to_char(local_start, 'FMHH12:MI AM')) || ' – '
    || trim(to_char(local_end, 'FMHH12:MI AM'))
    || case when local_end::date > local_start::date then ' (next day)' else '' end;
  rendered := replace(replace(
    p_template,
    '{{EVENT_DATE}}', event_date
  ), '{{EVENT_TIME_RANGE}}', event_time_range);
  if char_length(rendered) not between 1 and 500 or rendered ~ '\{\{' then
    raise exception 'invalid rendered event social template';
  end if;
  return rendered;
end;
$$;

revoke all on function private.render_event_social_template(text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function private.render_event_social_template(text, timestamptz, timestamptz)
  to service_role;

create or replace function public.materialize_event_social_occurrences(
  p_occurrences jsonb,
  p_schedule_contract_version text,
  p_schedule_sha256 text,
  p_templates jsonb,
  p_content_contract_version text,
  p_content_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate jsonb;
  template_candidate jsonb;
  previous_template public.event_social_publication_templates%rowtype;
  occurrence_row public.event_social_occurrences%rowtype;
  source_key_value text;
  source_event_id_value text;
  source_kind_value text;
  title_value text;
  local_date_value date;
  starts_at_value timestamptz;
  ends_at_value timestamptz;
  publish_at_value timestamptz;
  state_value text;
  superseded_value text;
  monthly_slot_owner text;
  template_source_event_id text;
  template_destination text;
  template_message text;
  template_alt_text text;
  template_media_path text;
  template_media_sha256 text;
  template_revision_value text;
  materialized_count integer := 0;
begin
  if jsonb_typeof(p_occurrences) <> 'array'
    or jsonb_array_length(p_occurrences) > 512
    or jsonb_typeof(p_templates) <> 'array'
    or jsonb_array_length(p_templates) <> 24
    or p_schedule_contract_version !~ '^[a-z0-9-]{1,80}$'
    or p_schedule_sha256 !~ '^[0-9a-f]{64}$'
    or p_content_contract_version !~ '^[a-z0-9-]{1,80}$'
    or p_content_sha256 !~ '^[0-9a-f]{64}$'
  then
    raise exception 'invalid event social schedule packet';
  end if;
  if (
    select count(distinct concat(value ->> 'sourceEventId', ':', value ->> 'destination')) <> 24
      or bool_or((value ->> 'sourceEventId') not in (
        'monthly-gathering', 'monthly-raffle', 'guild-party', 'breaking-army',
        'showdown', 'guild-wars', 'guild-heros-realm', 'united-resolve'
      ))
    from jsonb_array_elements(p_templates)
  ) then
    raise exception 'invalid event social template inventory';
  end if;

  for template_candidate in select value from jsonb_array_elements(p_templates)
  loop
    template_source_event_id := template_candidate ->> 'sourceEventId';
    template_destination := template_candidate ->> 'destination';
    template_message := template_candidate ->> 'messageTemplate';
    template_alt_text := template_candidate ->> 'altTextTemplate';
    template_media_path := template_candidate ->> 'mediaPath';
    template_media_sha256 := nullif(template_candidate ->> 'mediaSha256', '');
    if template_source_event_id !~ '^[a-z0-9-]{1,80}$'
      or template_destination not in ('facebook_page', 'instagram', 'discord')
      or char_length(template_message) not between 1 and 500
      or char_length(template_alt_text) not between 1 and 500
      or position('{{EVENT_DATE}}' in template_message) = 0
      or position('{{EVENT_TIME_RANGE}}' in template_message) = 0
      or regexp_replace(
        template_message,
        '\{\{(EVENT_DATE|EVENT_TIME_RANGE)\}\}', '', 'g'
      ) ~ '\{\{'
      or template_alt_text ~ '\{\{'
      or template_message ~* '(https?://|www\.|[[:alnum:]-]+\.[a-z]{2,})'
      or template_alt_text ~* '(https?://|www\.|[[:alnum:]-]+\.[a-z]{2,})'
      or template_media_path !~ '^/assets/[A-Za-z0-9_./-]+\.(jpg|jpeg|png|webp)$'
      or char_length(regexp_replace(
        template_media_path,
        '^/assets/|\.(jpg|jpeg|png|webp)$', '', 'g'
      )) not between 1 and 280
      or position('..' in template_media_path) > 0
      or (template_destination in ('facebook_page', 'instagram') and template_media_path !~ '\.(jpg|jpeg)$')
      or (template_destination = 'discord' and template_media_path !~ '\.png$')
      or (template_media_sha256 is not null and template_media_sha256 !~ '^[0-9a-f]{64}$')
    then
      raise exception 'invalid event social template packet';
    end if;

    template_revision_value := encode(extensions.digest(concat_ws(E'\n',
      template_source_event_id,
      template_destination,
      p_schedule_sha256,
      p_content_sha256,
      template_message,
      template_alt_text,
      template_media_path,
      coalesce(template_media_sha256, '')
    ), 'sha256'), 'hex');

    select * into previous_template
    from public.event_social_publication_templates template
    where template.source_event_id = template_source_event_id
      and template.destination = template_destination
    for update;

    if not found then
      insert into public.event_social_publication_templates (
        source_event_id, destination, template_contract_version,
        schedule_sha256, content_sha256, message_template,
        alt_text_template, media_path, media_sha256, template_revision
      ) values (
        template_source_event_id, template_destination,
        p_content_contract_version, p_schedule_sha256, p_content_sha256,
        template_message, template_alt_text, template_media_path,
        template_media_sha256, template_revision_value
      );
    elsif (
      previous_template.template_contract_version,
      previous_template.schedule_sha256,
      previous_template.content_sha256,
      previous_template.message_template,
      previous_template.alt_text_template,
      previous_template.media_path,
      previous_template.media_sha256,
      previous_template.template_revision
    ) is distinct from (
      p_content_contract_version,
      p_schedule_sha256,
      p_content_sha256,
      template_message,
      template_alt_text,
      template_media_path,
      template_media_sha256,
      template_revision_value
    ) then
      update public.event_social_publication_templates template
      set template_contract_version = p_content_contract_version,
        schedule_sha256 = p_schedule_sha256,
        content_sha256 = p_content_sha256,
        message_template = template_message,
        alt_text_template = template_alt_text,
        media_path = template_media_path,
        media_sha256 = template_media_sha256,
        template_revision = template_revision_value,
        approved = false,
        enabled = false,
        approved_by = null,
        approved_at = null
      where template.id = previous_template.id;

      if previous_template.approved or previous_template.enabled then
        insert into public.event_social_publication_events (
          destination, actor_id, action, detail
        ) values (
          template_destination, null, 'template_invalidated',
          jsonb_build_object(
            'category', 'schedule_content_or_asset_projection_drift',
            'sourceEventId', template_source_event_id
          )
        );
      end if;
    end if;
    previous_template := null;
  end loop;

  for candidate in select value from jsonb_array_elements(p_occurrences)
  loop
    source_key_value := candidate ->> 'sourceKey';
    source_event_id_value := candidate ->> 'sourceEventId';
    source_kind_value := candidate ->> 'sourceKind';
    title_value := candidate ->> 'title';
    local_date_value := (candidate ->> 'localDate')::date;
    starts_at_value := (candidate ->> 'startsAt')::timestamptz;
    ends_at_value := (candidate ->> 'endsAt')::timestamptz;
    publish_at_value := (candidate ->> 'publishAt')::timestamptz;
    state_value := candidate ->> 'state';
    superseded_value := nullif(candidate ->> 'supersededBySourceKey', '');

    -- A monthly occurrence owns its matching Guild Party slot regardless of
    -- packet order. A canceled monthly occurrence also remains the slot owner
    -- if a later projection contains only the weekly Party candidate. This
    -- prevents duplicate or replacement posts for a substituted monthly slot.
    if source_event_id_value = 'guild-party' and state_value = 'scheduled' then
      select projected ->> 'sourceKey' into monthly_slot_owner
      from jsonb_array_elements(p_occurrences) projected
      where projected ->> 'sourceKind' = 'monthly'
        and projected ->> 'sourceEventId' in ('monthly-gathering', 'monthly-raffle')
        and projected ->> 'state' = 'scheduled'
        and (projected ->> 'startsAt')::timestamptz = starts_at_value
        and (projected ->> 'endsAt')::timestamptz = ends_at_value
      order by projected ->> 'sourceKey'
      limit 1;

      if monthly_slot_owner is null then
        select occurrence.source_key into monthly_slot_owner
        from public.event_social_occurrences occurrence
        where occurrence.source_kind = 'monthly'
          and occurrence.source_event_id in ('monthly-gathering', 'monthly-raffle')
          and occurrence.state = 'canceled'
          and occurrence.starts_at = starts_at_value
          and occurrence.ends_at = ends_at_value
        order by occurrence.source_key
        limit 1;
      end if;

      if monthly_slot_owner is not null then
        state_value := 'superseded';
        superseded_value := monthly_slot_owner;
      end if;
    end if;

    if source_key_value !~ '^[a-z0-9-]{1,80}:[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      or source_event_id_value !~ '^[a-z0-9-]{1,80}$'
      or source_kind_value not in ('monthly', 'weekly')
      or char_length(title_value) not between 1 and 100
      or ends_at_value <= starts_at_value
      or publish_at_value <> starts_at_value - interval '1 hour'
      or state_value not in ('scheduled', 'superseded', 'suppressed')
      or (state_value = 'superseded') <> (superseded_value is not null)
    then
      raise exception 'invalid event social occurrence';
    end if;

    insert into public.event_social_occurrences (
      source_key, source_event_id, source_kind, title, local_date,
      starts_at, ends_at, publish_at, state, superseded_by_source_key,
      schedule_contract_version, schedule_sha256
    ) values (
      source_key_value, source_event_id_value, source_kind_value, title_value,
      local_date_value, starts_at_value, ends_at_value, publish_at_value,
      state_value, superseded_value, p_schedule_contract_version,
      p_schedule_sha256
    )
    on conflict (source_key) do update set
      source_event_id = excluded.source_event_id,
      source_kind = excluded.source_kind,
      title = excluded.title,
      local_date = excluded.local_date,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      publish_at = excluded.publish_at,
      state = case
        when public.event_social_occurrences.state = 'canceled' then 'canceled'
        else excluded.state
      end,
      superseded_by_source_key = case
        when public.event_social_occurrences.state = 'canceled' then null
        else excluded.superseded_by_source_key
      end,
      schedule_contract_version = excluded.schedule_contract_version,
      schedule_sha256 = excluded.schedule_sha256
    where (
      public.event_social_occurrences.source_event_id,
      public.event_social_occurrences.source_kind,
      public.event_social_occurrences.title,
      public.event_social_occurrences.local_date,
      public.event_social_occurrences.starts_at,
      public.event_social_occurrences.ends_at,
      public.event_social_occurrences.publish_at,
      public.event_social_occurrences.state,
      public.event_social_occurrences.superseded_by_source_key,
      public.event_social_occurrences.schedule_contract_version,
      public.event_social_occurrences.schedule_sha256
    ) is distinct from (
      excluded.source_event_id,
      excluded.source_kind,
      excluded.title,
      excluded.local_date,
      excluded.starts_at,
      excluded.ends_at,
      excluded.publish_at,
      case when public.event_social_occurrences.state = 'canceled'
        then 'canceled' else excluded.state end,
      case when public.event_social_occurrences.state = 'canceled'
        then null else excluded.superseded_by_source_key end,
      excluded.schedule_contract_version,
      excluded.schedule_sha256
    )
    returning * into occurrence_row;

    if occurrence_row.id is null then
      select * into strict occurrence_row
      from public.event_social_occurrences occurrence
      where occurrence.source_key = source_key_value;
    end if;

    if occurrence_row.state = 'scheduled' then
      insert into public.event_social_publication_jobs (occurrence_id, destination)
      values
        (occurrence_row.id, 'facebook_page'),
        (occurrence_row.id, 'instagram'),
        (occurrence_row.id, 'discord')
      on conflict (occurrence_id, destination) do nothing;

      with invalidated as (
        update public.event_social_publication_jobs job
        set status = case
            when job.status = 'publishing' then 'reconcile_required'
            when job.status = 'preparing'
              and job.preparation_started_at is not null
              and job.provider_secondary_id is null
            then 'failed'
            else 'pending_approval' end,
          content_version = case when job.status = 'publishing'
              or (job.status = 'preparing' and job.provider_secondary_id is null)
              then job.content_version else null end,
          message = case when job.status = 'publishing'
              or (job.status = 'preparing' and job.provider_secondary_id is null)
              then job.message else null end,
          alt_text = case when job.status = 'publishing'
              or (job.status = 'preparing' and job.provider_secondary_id is null)
              then job.alt_text else null end,
          media_path = case when job.status = 'publishing'
              or (job.status = 'preparing' and job.provider_secondary_id is null)
              then job.media_path else null end,
          media_sha256 = case when job.status = 'publishing'
              or (job.status = 'preparing' and job.provider_secondary_id is null)
              then job.media_sha256 else null end,
          approval_mode = case when job.status = 'publishing'
              or (job.status = 'preparing' and job.provider_secondary_id is null)
              then job.approval_mode else null end,
          template_id = case when job.status = 'publishing'
              or (job.status = 'preparing' and job.provider_secondary_id is null)
              then job.template_id else null end,
          template_revision = case when job.status = 'publishing'
              or (job.status = 'preparing' and job.provider_secondary_id is null)
              then job.template_revision else null end,
          approved_by = case when job.status = 'publishing'
              or (job.status = 'preparing' and job.provider_secondary_id is null)
              then job.approved_by else null end,
          approved_at = case when job.status = 'publishing'
              or (job.status = 'preparing' and job.provider_secondary_id is null)
              then job.approved_at else null end,
          approved_occurrence_updated_at = case when job.status = 'publishing'
              or (job.status = 'preparing' and job.provider_secondary_id is null)
              then job.approved_occurrence_updated_at else null end,
          confirmation_fingerprint = case when job.status = 'publishing'
              or (job.status = 'preparing' and job.provider_secondary_id is null)
              then job.confirmation_fingerprint else null end,
          claim_token = null,
          claim_expires_at = null,
          preparation_attempt_count = case when job.status = 'publishing'
              or (job.status = 'preparing' and job.provider_secondary_id is null)
              then job.preparation_attempt_count else 0 end,
          preparation_started_at = case when job.status = 'publishing'
              or (job.status = 'preparing' and job.provider_secondary_id is null)
              then job.preparation_started_at else null end,
          prepared_at = case when job.status = 'publishing'
              then job.prepared_at else null end,
          preparation_fingerprint = case when job.status = 'publishing'
              then job.preparation_fingerprint else null end,
          attempt_count = case when job.status = 'publishing'
              then job.attempt_count else 0 end,
          provider_mutation_started_at = case when job.status = 'publishing'
              then job.provider_mutation_started_at else null end,
          provider_primary_id = case when job.status = 'publishing'
              then job.provider_primary_id else null end,
          provider_secondary_id = case when job.status = 'publishing'
              then job.provider_secondary_id else null end,
          provider_permalink = case when job.status = 'publishing'
              then job.provider_permalink else null end,
          failure_category = case
            when job.status = 'publishing' then 'template_drift_while_publishing'
            when job.status = 'preparing' and job.provider_secondary_id is null
              then 'template_drift_while_container_creation_uncertain'
            else null end
        where job.occurrence_id = occurrence_row.id
          and job.approval_mode = 'template'
          and job.status in ('approved', 'preparing', 'prepared', 'publishing')
          and not exists (
            select 1
            from public.event_social_publication_templates template
            where template.id = job.template_id
              and template.source_event_id = occurrence_row.source_event_id
              and template.destination = job.destination
              and template.approved = true
              and template.enabled = true
              and template.schedule_sha256 = p_schedule_sha256
              and template.content_sha256 = p_content_sha256
              and template.template_revision = job.template_revision
          )
        returning job.id, job.destination, job.status
      )
      insert into public.event_social_publication_events (
        occurrence_id, job_id, destination, action, detail
      )
      select occurrence_row.id, invalidated.id, invalidated.destination,
        case
          when invalidated.status = 'reconcile_required' then 'reconcile_required'
          when invalidated.status = 'failed' then 'failed'
          else 'template_job_invalidated'
        end,
        jsonb_build_object('category', 'template_approval_drift')
      from invalidated;

      with eligible as (
        select template.*,
          private.render_event_social_template(
            template.message_template, occurrence_row.starts_at, occurrence_row.ends_at
          ) as rendered_message,
          private.render_event_social_template(
            template.alt_text_template, occurrence_row.starts_at, occurrence_row.ends_at
          ) as rendered_alt_text
        from public.event_social_publication_templates template
        where template.source_event_id = occurrence_row.source_event_id
          and template.approved = true
          and template.enabled = true
          and template.schedule_sha256 = p_schedule_sha256
          and template.content_sha256 = p_content_sha256
          and template.media_sha256 is not null
      ), approved_jobs as (
        update public.event_social_publication_jobs job
        set status = 'approved',
          content_version = eligible.template_contract_version,
          message = eligible.rendered_message,
          alt_text = eligible.rendered_alt_text,
          media_path = eligible.media_path,
          media_sha256 = eligible.media_sha256,
          approval_mode = 'template',
          template_id = eligible.id,
          template_revision = eligible.template_revision,
          approved_by = eligible.approved_by,
          approved_at = now(),
          approved_occurrence_updated_at = occurrence_row.updated_at,
          confirmation_fingerprint = encode(extensions.digest(concat_ws(E'\n',
            occurrence_row.id::text,
            job.destination,
            occurrence_row.publish_at::text,
            occurrence_row.updated_at::text,
            eligible.rendered_message,
            eligible.rendered_alt_text,
            eligible.media_path,
            eligible.media_sha256,
            eligible.approved_by::text,
            'template',
            eligible.template_revision
          ), 'sha256'), 'hex'),
          claim_token = null,
          claim_expires_at = null,
          preparation_attempt_count = 0,
          preparation_started_at = null,
          prepared_at = null,
          preparation_fingerprint = null,
          attempt_count = 0,
          provider_mutation_started_at = null,
          provider_primary_id = null,
          provider_secondary_id = null,
          provider_permalink = null,
          published_at = null,
          failure_category = null
        from eligible
        where job.occurrence_id = occurrence_row.id
          and job.destination = eligible.destination
          and job.status = 'pending_approval'
        returning job.id, job.destination, job.content_version
      )
      insert into public.event_social_publication_events (
        occurrence_id, job_id, destination, actor_id, action, detail
      )
      select occurrence_row.id, approved_jobs.id, approved_jobs.destination,
        null, 'template_auto_approved', jsonb_build_object(
          'contentVersion', approved_jobs.content_version,
          'publishAt', occurrence_row.publish_at,
          'approvalMode', 'template'
        )
      from approved_jobs;
    else
      with changed as (
        update public.event_social_publication_jobs job
        set status = case when job.status = 'publishing'
            then 'reconcile_required' else 'canceled' end,
          claim_token = null,
          claim_expires_at = null,
          failure_category = case
            when job.status = 'publishing'
              then 'occurrence_superseded_after_provider_mutation_start'
            else 'occurrence_not_publishable' end
        where job.occurrence_id = occurrence_row.id
          and job.status in (
            'pending_approval', 'approved', 'preparing', 'prepared',
            'failed', 'publishing'
          )
          and job.reconciliation_resolution is null
        returning job.id, job.destination, job.status
      )
      insert into public.event_social_publication_events (
        occurrence_id, job_id, destination, action, detail
      )
      select occurrence_row.id, changed.id, changed.destination,
        case when changed.status = 'reconcile_required'
          then 'reconcile_required' else 'canceled' end,
        jsonb_build_object('category', 'occurrence_not_publishable')
      from changed;
    end if;

    materialized_count := materialized_count + 1;
    occurrence_row := null;
    monthly_slot_owner := null;
  end loop;

  return jsonb_build_object('ok', true, 'materialized', materialized_count);
end;
$$;

revoke all on function public.materialize_event_social_occurrences(
  jsonb, text, text, jsonb, text, text
)
  from public, anon, authenticated;
grant execute on function public.materialize_event_social_occurrences(
  jsonb, text, text, jsonb, text, text
)
  to service_role;

create or replace function public.event_social_projection_is_current(
  p_schedule_sha256 text,
  p_content_sha256 text
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select
    p_schedule_sha256 ~ '^[0-9a-f]{64}$'
    and p_content_sha256 ~ '^[0-9a-f]{64}$'
    and (
      select count(*) = 24
        and coalesce(bool_and(
          template.schedule_sha256 = p_schedule_sha256
          and template.content_sha256 = p_content_sha256
        ), false)
      from public.event_social_publication_templates template
    )
    and (
      select coalesce(max(occurrence.starts_at), '-infinity'::timestamptz)
          >= clock_timestamp() + interval '45 days'
        and coalesce(bool_and(
          occurrence.schedule_sha256 = p_schedule_sha256
        ), false)
      from public.event_social_occurrences occurrence
      where occurrence.starts_at >= clock_timestamp() - interval '1 day'
    );
$$;

revoke all on function public.event_social_projection_is_current(text, text)
  from public, anon, authenticated;
grant execute on function public.event_social_projection_is_current(text, text)
  to service_role;

create or replace function public.revoke_event_social_destination_approval(
  p_occurrence_id uuid,
  p_destination text,
  p_actor_id uuid,
  p_confirm boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_job public.event_social_publication_jobs%rowtype;
begin
  if p_confirm is not true
    or p_destination not in ('facebook_page', 'instagram', 'discord')
  then raise exception 'invalid event social approval revocation'; end if;

  select job.* into changed_job
  from public.event_social_publication_jobs job
  where job.occurrence_id = p_occurrence_id
    and job.destination = p_destination
    and job.status in ('approved', 'preparing', 'prepared', 'failed')
    and job.reconciliation_resolution is null
  for update;
  if not found then return false; end if;

  update public.event_social_publication_jobs job
    set status = 'canceled', content_version = null, message = null,
      alt_text = null, media_path = null, media_sha256 = null,
      approval_mode = null, template_id = null, template_revision = null,
      approved_by = null, approved_at = null,
      approved_occurrence_updated_at = null, confirmation_fingerprint = null,
      claim_token = null, claim_expires_at = null,
      preparation_attempt_count = 0, preparation_started_at = null,
      prepared_at = null, preparation_fingerprint = null,
      attempt_count = 0, provider_mutation_started_at = null,
      provider_primary_id = null, provider_secondary_id = null,
      provider_permalink = null, failure_category = null
    where job.id = changed_job.id;
  insert into public.event_social_publication_events (
    occurrence_id, job_id, destination, actor_id, action
  ) values (
    p_occurrence_id, changed_job.id, p_destination, p_actor_id,
    'approval_revoked'
  );
  return true;
end;
$$;

revoke all on function public.revoke_event_social_destination_approval(
  uuid, text, uuid, boolean
) from public, anon, authenticated;
grant execute on function public.revoke_event_social_destination_approval(
  uuid, text, uuid, boolean
) to service_role;

create or replace function public.cancel_event_social_occurrence(
  p_occurrence_id uuid,
  p_actor_id uuid,
  p_confirm boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed boolean := false;
  locked_occurrence public.event_social_occurrences%rowtype;
begin
  if p_confirm is not true then raise exception 'event cancellation requires confirmation'; end if;

  select occurrence.* into locked_occurrence
  from public.event_social_occurrences occurrence
  where occurrence.id = p_occurrence_id
  for update;
  if not found or locked_occurrence.state <> 'scheduled' then return false; end if;

  update public.event_social_occurrences occurrence
  set state = 'canceled', superseded_by_source_key = null
  where occurrence.id = p_occurrence_id
    and occurrence.state = 'scheduled';
  changed := found;
  if not changed then return false; end if;

  with jobs as (
    update public.event_social_publication_jobs job
    set status = case when job.status = 'publishing'
        then 'reconcile_required' else 'canceled' end,
      claim_token = null, claim_expires_at = null,
      failure_category = case
        when job.status = 'publishing'
          then 'occurrence_canceled_after_provider_mutation_start'
        else 'occurrence_canceled' end
    where job.occurrence_id = p_occurrence_id
      and job.status in (
        'pending_approval', 'approved', 'preparing', 'prepared',
        'failed', 'publishing'
      )
      and job.reconciliation_resolution is null
    returning job.id, job.destination, job.status
  )
  insert into public.event_social_publication_events (
    occurrence_id, job_id, destination, actor_id, action, detail
  )
  select p_occurrence_id, jobs.id, jobs.destination, p_actor_id,
    case when jobs.status = 'reconcile_required'
      then 'reconcile_required' else 'canceled' end,
    jsonb_build_object('category', 'occurrence_canceled')
  from jobs;

  insert into public.event_social_publication_events (
    occurrence_id, actor_id, action, detail
  ) values (
    p_occurrence_id, p_actor_id, 'occurrence_canceled',
    jsonb_build_object('partyRevivalAllowed', false)
  );
  return true;
end;
$$;

revoke all on function public.cancel_event_social_occurrence(uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.cancel_event_social_occurrence(uuid, uuid, boolean)
  to service_role;

create or replace function public.set_event_social_destination_enabled(
  p_destination text,
  p_enabled boolean,
  p_actor_id uuid,
  p_confirm boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_confirm is not true
    or p_destination not in ('facebook_page', 'instagram', 'discord')
    or (p_enabled and p_actor_id is null)
  then raise exception 'invalid event social destination activation'; end if;

  if p_enabled and exists (
    select 1
    from public.event_social_publication_jobs job
    where job.destination = p_destination
      and job.status = 'reconcile_required'
  ) then
    raise exception 'event social destination has unresolved reconciliation';
  end if;

  update public.event_social_destination_settings setting
  set enabled = p_enabled,
    confirmed_by = case when p_enabled then p_actor_id else null end,
    confirmed_at = case when p_enabled then now() else null end
  where setting.destination = p_destination;

  insert into public.event_social_publication_events (
    destination, actor_id, action, detail
  ) values (
    p_destination, p_actor_id,
    case when p_enabled then 'destination_enabled' else 'destination_disabled' end,
    jsonb_build_object('enabled', p_enabled)
  );
  return found;
end;
$$;

revoke all on function public.set_event_social_destination_enabled(text, boolean, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.set_event_social_destination_enabled(text, boolean, uuid, boolean)
  to service_role;

create or replace function public.set_event_social_template_approval(
  p_source_event_id text,
  p_destination text,
  p_approved boolean,
  p_enabled boolean,
  p_expected_revision text,
  p_actor_id uuid,
  p_confirm boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_confirm is not true
    or p_source_event_id !~ '^[a-z0-9-]{1,80}$'
    or p_destination not in ('facebook_page', 'instagram', 'discord')
    or p_expected_revision !~ '^[0-9a-f]{64}$'
    or p_actor_id is null
    or (p_enabled and not p_approved)
  then raise exception 'invalid event social template approval'; end if;

  update public.event_social_publication_templates template
  set approved = p_approved,
    enabled = p_enabled,
    approved_by = case when p_approved then p_actor_id else null end,
    approved_at = case when p_approved then now() else null end
  where template.source_event_id = p_source_event_id
    and template.destination = p_destination
    and template.template_revision = p_expected_revision
    and (p_approved = false or template.media_sha256 is not null);

  if not found then return false; end if;
  insert into public.event_social_publication_events (
    destination, actor_id, action, detail
  ) values (
    p_destination, p_actor_id,
    case when p_approved then 'template_approved' else 'template_revoked' end,
    jsonb_build_object(
      'sourceEventId', p_source_event_id,
      'enabled', p_enabled
    )
  );
  return true;
end;
$$;

revoke all on function public.set_event_social_template_approval(
  text, text, boolean, boolean, text, uuid, boolean
) from public, anon, authenticated;
grant execute on function public.set_event_social_template_approval(
  text, text, boolean, boolean, text, uuid, boolean
) to service_role;

create or replace function public.sweep_event_social_publication_leases()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  released_job record;
  preparation_job record;
  expired_job record;
  missed_preparation_job record;
  missed_job record;
  released_count integer := 0;
  preparation_failure_count integer := 0;
  expired_count integer := 0;
  missed_preparation_count integer := 0;
  missed_count integer := 0;
begin
  for preparation_job in
    update public.event_social_publication_jobs job
    set status = 'failed',
      claim_token = null,
      claim_expires_at = null,
      failure_category = 'instagram_container_mutation_lease_expired'
    where job.status = 'preparing'
      and job.destination = 'instagram'
      and job.preparation_started_at is not null
      and job.provider_secondary_id is null
      and job.claim_expires_at <= clock_timestamp()
    returning job.id, job.occurrence_id, job.destination
  loop
    insert into public.event_social_publication_events (
      occurrence_id, job_id, destination, action, detail
    ) values (
      preparation_job.occurrence_id, preparation_job.id,
      preparation_job.destination, 'failed',
      jsonb_build_object(
        'category', 'instagram_container_mutation_lease_expired'
      )
    );
    preparation_failure_count := preparation_failure_count + 1;
  end loop;

  for expired_job in
    update public.event_social_publication_jobs job
    set status = 'reconcile_required',
      claim_token = null,
      claim_expires_at = null,
      failure_category = 'provider_mutation_lease_expired'
    where job.status = 'publishing'
      and job.provider_mutation_started_at is not null
      and job.claim_expires_at <= clock_timestamp()
    returning job.id, job.occurrence_id, job.destination
  loop
    insert into public.event_social_publication_events (
      occurrence_id, job_id, destination, action, detail
    ) values (
      expired_job.occurrence_id, expired_job.id, expired_job.destination,
      'reconcile_required',
      jsonb_build_object('category', 'provider_mutation_lease_expired')
    );
    expired_count := expired_count + 1;
  end loop;

  for released_job in
    update public.event_social_publication_jobs job
    set claim_token = null,
      claim_expires_at = null
    where job.claim_token is not null
      and job.claim_expires_at <= clock_timestamp()
      and job.provider_mutation_started_at is null
      and (
        job.status in ('approved', 'prepared')
        or (
          job.status = 'preparing'
          and job.provider_secondary_id is not null
          and job.preparation_fingerprint is not null
        )
      )
    returning job.id, job.occurrence_id, job.destination
  loop
    insert into public.event_social_publication_events (
      occurrence_id, job_id, destination, action, detail
    ) values (
      released_job.occurrence_id, released_job.id,
      released_job.destination, 'pre_mutation_lease_released',
      jsonb_build_object('category', 'pre_mutation_lease_expired')
    );
    released_count := released_count + 1;
  end loop;

  for missed_preparation_job in
    update public.event_social_publication_jobs job
    set status = 'failed',
      claim_token = null,
      claim_expires_at = null,
      failure_category = 'instagram_preparation_window_missed'
    from public.event_social_occurrences occurrence
    where job.occurrence_id = occurrence.id
      and job.destination = 'instagram'
      and job.status = 'approved'
      and job.preparation_attempt_count = 0
      and job.provider_mutation_started_at is null
      and occurrence.publish_at - interval '10 minutes' <= clock_timestamp()
    returning job.id, job.occurrence_id, job.destination
  loop
    insert into public.event_social_publication_events (
      occurrence_id, job_id, destination, action, detail
    ) values (
      missed_preparation_job.occurrence_id, missed_preparation_job.id,
      missed_preparation_job.destination, 'failed',
      jsonb_build_object('category', 'instagram_preparation_window_missed')
    );
    missed_preparation_count := missed_preparation_count + 1;
  end loop;

  for missed_job in
    update public.event_social_publication_jobs job
    set status = 'failed',
      claim_token = null,
      claim_expires_at = null,
      failure_category = 'missed_exact_publish_window'
    from public.event_social_occurrences occurrence
    where job.occurrence_id = occurrence.id
      and job.status in ('approved', 'preparing', 'prepared')
      and job.provider_mutation_started_at is null
      and occurrence.publish_at + interval '2 minutes' <= clock_timestamp()
    returning job.id, job.occurrence_id, job.destination
  loop
    insert into public.event_social_publication_events (
      occurrence_id, job_id, destination, action, detail
    ) values (
      missed_job.occurrence_id, missed_job.id, missed_job.destination,
      'failed', jsonb_build_object('category', 'missed_exact_publish_window')
    );
    missed_count := missed_count + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'releasedPreMutationLeases', released_count,
    'expiredPreparationFailures', preparation_failure_count,
    'expiredProviderReconciliations', expired_count,
    'missedPreparationWindows', missed_preparation_count,
    'missedPublishWindows', missed_count,
    'expiredReconciliations', expired_count,
    'missedWindows', missed_preparation_count + missed_count
  );
end;
$$;

revoke all on function public.sweep_event_social_publication_leases()
  from public, anon, authenticated;
grant execute on function public.sweep_event_social_publication_leases()
  to service_role;

create or replace function public.claim_due_event_social_instagram_preparations(
  p_claim_token uuid,
  p_limit integer default 3
)
returns table (
  id uuid,
  occurrence_id uuid,
  destination text,
  message text,
  alt_text text,
  media_path text,
  media_sha256 text,
  approval_mode text,
  template_id uuid,
  template_revision text,
  source_event_id text,
  title text,
  starts_at timestamptz,
  publish_at timestamptz,
  provider_secondary_id text,
  preparation_fingerprint text,
  preparation_action text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_claim_token is null or p_limit not between 1 and 9
  then raise exception 'invalid event social Instagram preparation claim'; end if;

  return query
  with candidates as (
    select job.id,
      case when job.status = 'approved' then 'create' else 'poll' end
        as preparation_action
    from public.event_social_publication_jobs job
    join public.event_social_occurrences occurrence
      on occurrence.id = job.occurrence_id
    join public.event_social_destination_settings setting
      on setting.destination = 'instagram' and setting.enabled = true
    join public.event_social_publication_templates template
      on template.id = job.template_id
    where job.destination = 'instagram'
      and job.claim_token is null
      and job.attempt_count = 0
      and job.provider_mutation_started_at is null
      and occurrence.state = 'scheduled'
      and occurrence.updated_at = job.approved_occurrence_updated_at
      and template.source_event_id = occurrence.source_event_id
      and template.destination = 'instagram'
      and template.approved = true
      and template.enabled = true
      and template.template_revision = job.template_revision
      and template.media_sha256 = job.media_sha256
      and job.confirmation_fingerprint = encode(extensions.digest(concat_ws(E'\n',
        occurrence.id::text,
        job.destination,
        occurrence.publish_at::text,
        occurrence.updated_at::text,
        job.message,
        coalesce(job.alt_text, ''),
        job.media_path,
        job.media_sha256,
        job.approved_by::text,
        job.approval_mode,
        coalesce(job.template_revision, '')
      ), 'sha256'), 'hex')
      and (
        (
          job.status = 'approved'
          and job.preparation_attempt_count = 0
          and job.preparation_started_at is null
          and job.provider_secondary_id is null
          and clock_timestamp() >= occurrence.publish_at - interval '15 minutes'
          and clock_timestamp() < occurrence.publish_at - interval '10 minutes'
        ) or (
          job.status = 'preparing'
          and job.preparation_attempt_count = 1
          and job.preparation_started_at is not null
          and job.provider_secondary_id ~ '^[A-Za-z0-9_.:-]{1,255}$'
          and job.preparation_fingerprint = encode(extensions.digest(concat_ws(E'\n',
            job.confirmation_fingerprint,
            job.provider_secondary_id,
            job.template_revision,
            'instagram_container'
          ), 'sha256'), 'hex')
          and clock_timestamp() < occurrence.publish_at + interval '2 minutes'
        )
      )
    order by occurrence.publish_at, job.id
    for update of job skip locked
    limit p_limit
  ), claimed as (
    update public.event_social_publication_jobs job
    set claim_token = p_claim_token,
      claim_expires_at = clock_timestamp() + interval '2 minutes'
    from candidates
    where job.id = candidates.id
    returning job.*, candidates.preparation_action
  )
  select claimed.id, claimed.occurrence_id, claimed.destination,
    claimed.message, claimed.alt_text, claimed.media_path,
    claimed.media_sha256, claimed.approval_mode, claimed.template_id,
    claimed.template_revision, occurrence.source_event_id, occurrence.title,
    occurrence.starts_at, occurrence.publish_at,
    claimed.provider_secondary_id, claimed.preparation_fingerprint,
    claimed.preparation_action
  from claimed
  join public.event_social_occurrences occurrence
    on occurrence.id = claimed.occurrence_id;
end;
$$;

revoke all on function public.claim_due_event_social_instagram_preparations(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_event_social_instagram_preparations(uuid, integer)
  to service_role;

create or replace function public.start_event_social_instagram_preparation(
  p_job_id uuid,
  p_claim_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_occurrence public.event_social_occurrences%rowtype;
  changed_job public.event_social_publication_jobs%rowtype;
  started_at_value timestamptz := clock_timestamp();
begin
  select occurrence.* into locked_occurrence
  from public.event_social_occurrences occurrence
  join public.event_social_publication_jobs job
    on job.occurrence_id = occurrence.id
  where job.id = p_job_id
  for update of occurrence;
  if not found then return false; end if;

  update public.event_social_publication_jobs job
  set status = 'preparing',
    preparation_attempt_count = 1,
    preparation_started_at = started_at_value,
    claim_expires_at = started_at_value + interval '2 minutes'
  from public.event_social_destination_settings setting,
    public.event_social_publication_templates template
  where job.id = p_job_id
    and job.destination = 'instagram'
    and job.status = 'approved'
    and job.claim_token = p_claim_token
    and job.claim_expires_at > started_at_value
    and job.preparation_attempt_count = 0
    and job.preparation_started_at is null
    and job.provider_secondary_id is null
    and job.attempt_count = 0
    and job.provider_mutation_started_at is null
    and locked_occurrence.state = 'scheduled'
    and locked_occurrence.updated_at = job.approved_occurrence_updated_at
    and started_at_value >= locked_occurrence.publish_at - interval '15 minutes'
    and started_at_value < locked_occurrence.publish_at - interval '10 minutes'
    and setting.destination = 'instagram'
    and setting.enabled = true
    and template.id = job.template_id
    and template.source_event_id = locked_occurrence.source_event_id
    and template.destination = 'instagram'
    and template.approved = true
    and template.enabled = true
    and template.template_revision = job.template_revision
    and template.media_sha256 = job.media_sha256
  returning job.* into changed_job;
  if not found then return false; end if;

  insert into public.event_social_publication_events (
    occurrence_id, job_id, destination, action, detail
  ) values (
    changed_job.occurrence_id, changed_job.id, changed_job.destination,
    'instagram_container_mutation_started',
    jsonb_build_object('window', 'publish_minus_15_to_10_minutes')
  );
  return true;
end;
$$;

revoke all on function public.start_event_social_instagram_preparation(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.start_event_social_instagram_preparation(uuid, uuid)
  to service_role;

create or replace function public.finish_event_social_instagram_preparation(
  p_job_id uuid,
  p_claim_token uuid,
  p_outcome text,
  p_provider_secondary_id text default null,
  p_failure_category text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_job public.event_social_publication_jobs%rowtype;
begin
  if p_outcome not in (
      'container_created', 'pending', 'prepared', 'failed',
      'reconcile_required'
    )
    or (
      p_provider_secondary_id is not null
      and p_provider_secondary_id !~ '^[A-Za-z0-9_.:-]{1,255}$'
    )
    or (
      p_failure_category is not null
      and p_failure_category !~ '^[a-z][a-z0-9_]{0,79}$'
    )
  then raise exception 'invalid event social Instagram preparation completion'; end if;

  select job.* into changed_job
  from public.event_social_publication_jobs job
  where job.id = p_job_id
    and job.destination = 'instagram'
    and job.status = 'preparing'
    and job.claim_token = p_claim_token
    and job.preparation_attempt_count = 1
    and job.preparation_started_at is not null
  for update;
  if not found then return false; end if;

  if p_outcome = 'container_created' then
    if changed_job.provider_secondary_id is not null
      or p_provider_secondary_id is null
    then raise exception 'invalid event social Instagram container completion'; end if;
    update public.event_social_publication_jobs job
    set provider_secondary_id = p_provider_secondary_id,
      preparation_fingerprint = encode(extensions.digest(concat_ws(E'\n',
        job.confirmation_fingerprint,
        p_provider_secondary_id,
        job.template_revision,
        'instagram_container'
      ), 'sha256'), 'hex'),
      claim_token = null,
      claim_expires_at = null,
      failure_category = null
    where job.id = p_job_id
    returning * into changed_job;
  elsif p_outcome in ('pending', 'prepared') then
    if changed_job.provider_secondary_id is null
      or changed_job.preparation_fingerprint is null
      or p_provider_secondary_id is distinct from changed_job.provider_secondary_id
    then raise exception 'invalid event social Instagram poll completion'; end if;
    update public.event_social_publication_jobs job
    set status = case when p_outcome = 'prepared' then 'prepared' else 'preparing' end,
      prepared_at = case when p_outcome = 'prepared' then now() else null end,
      claim_token = null,
      claim_expires_at = null,
      failure_category = case when p_outcome = 'pending'
        then p_failure_category else null end
    where job.id = p_job_id
      and job.preparation_fingerprint = encode(extensions.digest(concat_ws(E'\n',
        job.confirmation_fingerprint,
        job.provider_secondary_id,
        job.template_revision,
        'instagram_container'
      ), 'sha256'), 'hex')
    returning * into changed_job;
    if not found then return false; end if;
  else
    if p_failure_category is null then
      raise exception 'event social Instagram preparation failure requires category';
    end if;
    if p_outcome = 'reconcile_required' and (
      changed_job.provider_secondary_id is null
      or p_provider_secondary_id is distinct from changed_job.provider_secondary_id
      or p_failure_category <> 'instagram_container_unexpectedly_published'
    ) then
      raise exception 'invalid event social Instagram preparation reconciliation';
    end if;
    if p_outcome = 'failed' and (
      (changed_job.provider_secondary_id is null and p_provider_secondary_id is not null)
      or (changed_job.provider_secondary_id is not null
        and p_provider_secondary_id is distinct from changed_job.provider_secondary_id)
    ) then
      raise exception 'invalid event social Instagram preparation failure identity';
    end if;
    update public.event_social_publication_jobs job
    set status = p_outcome,
      claim_token = null,
      claim_expires_at = null,
      failure_category = p_failure_category
    where job.id = p_job_id
    returning * into changed_job;
  end if;

  insert into public.event_social_publication_events (
    occurrence_id, job_id, destination, action, detail
  ) values (
    changed_job.occurrence_id, changed_job.id, changed_job.destination,
    case p_outcome
      when 'container_created' then 'instagram_container_created'
      when 'pending' then 'instagram_container_polled'
      when 'prepared' then 'instagram_container_prepared'
      else p_outcome
    end,
    jsonb_build_object(
      'outcome', p_outcome,
      'category', p_failure_category
    )
  );
  return true;
end;
$$;

revoke all on function public.finish_event_social_instagram_preparation(
  uuid, uuid, text, text, text
) from public, anon, authenticated;
grant execute on function public.finish_event_social_instagram_preparation(
  uuid, uuid, text, text, text
) to service_role;

create or replace function public.claim_due_event_social_publications(
  p_claim_token uuid,
  p_enabled_destinations text[],
  p_limit integer default 3
)
returns table (
  id uuid,
  occurrence_id uuid,
  destination text,
  message text,
  alt_text text,
  media_path text,
  media_sha256 text,
  approval_mode text,
  template_id uuid,
  template_revision text,
  source_event_id text,
  title text,
  starts_at timestamptz,
  publish_at timestamptz,
  provider_secondary_id text,
  preparation_fingerprint text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_claim_token is null
    or p_limit not between 1 and 9
    or p_enabled_destinations is null
    or p_enabled_destinations && array['facebook_page', 'instagram', 'discord']::text[] is false
    or exists (
      select 1 from unnest(p_enabled_destinations) value
      where value not in ('facebook_page', 'instagram', 'discord')
    )
  then raise exception 'invalid event social claim'; end if;

  return query
  with candidates as (
    select job.id
    from public.event_social_publication_jobs job
    join public.event_social_occurrences occurrence on occurrence.id = job.occurrence_id
    join public.event_social_destination_settings setting
      on setting.destination = job.destination and setting.enabled = true
    where (
        (job.destination = 'instagram' and job.status = 'prepared')
        or (job.destination in ('facebook_page', 'discord') and job.status = 'approved')
      )
      and job.destination = any(p_enabled_destinations)
      and job.claim_token is null
      and occurrence.state = 'scheduled'
      and occurrence.publish_at <= clock_timestamp()
      and occurrence.publish_at + interval '2 minutes' > clock_timestamp()
      and occurrence.updated_at = job.approved_occurrence_updated_at
      and job.attempt_count = 0
      and job.provider_mutation_started_at is null
      and job.approval_mode = 'template'
      and exists (
        select 1
        from public.event_social_publication_templates template
        where template.id = job.template_id
          and template.source_event_id = occurrence.source_event_id
          and template.destination = job.destination
          and template.approved = true
          and template.enabled = true
          and template.template_revision = job.template_revision
          and template.media_sha256 = job.media_sha256
      )
      and (
        job.destination <> 'instagram'
        or (
          job.preparation_attempt_count = 1
          and job.preparation_started_at is not null
          and job.prepared_at is not null
          and job.provider_secondary_id ~ '^[A-Za-z0-9_.:-]{1,255}$'
          and job.preparation_fingerprint = encode(extensions.digest(concat_ws(E'\n',
            job.confirmation_fingerprint,
            job.provider_secondary_id,
            job.template_revision,
            'instagram_container'
          ), 'sha256'), 'hex')
        )
      )
      and job.confirmation_fingerprint = encode(extensions.digest(concat_ws(E'\n',
        occurrence.id::text,
        job.destination,
        occurrence.publish_at::text,
        occurrence.updated_at::text,
        job.message,
        coalesce(job.alt_text, ''),
        job.media_path,
        job.media_sha256,
        job.approved_by::text,
        job.approval_mode,
        coalesce(job.template_revision, '')
      ), 'sha256'), 'hex')
    order by occurrence.publish_at, job.destination
    for update of job skip locked
    limit p_limit
  ), claimed as (
    update public.event_social_publication_jobs job
    set claim_token = p_claim_token,
      claim_expires_at = clock_timestamp() + interval '2 minutes'
    from candidates
    where job.id = candidates.id
    returning job.*
  )
  select claimed.id, claimed.occurrence_id, claimed.destination,
    claimed.message, claimed.alt_text, claimed.media_path,
    claimed.media_sha256, claimed.approval_mode, claimed.template_id,
    claimed.template_revision, occurrence.source_event_id, occurrence.title,
    occurrence.starts_at, occurrence.publish_at,
    claimed.provider_secondary_id, claimed.preparation_fingerprint
  from claimed
  join public.event_social_occurrences occurrence on occurrence.id = claimed.occurrence_id;
end;
$$;

revoke all on function public.claim_due_event_social_publications(uuid, text[], integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_event_social_publications(uuid, text[], integer)
  to service_role;

create or replace function public.start_event_social_provider_mutation(
  p_job_id uuid,
  p_claim_token uuid,
  p_destination text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_occurrence public.event_social_occurrences%rowtype;
  changed_job public.event_social_publication_jobs%rowtype;
  started_at_value timestamptz := clock_timestamp();
begin
  if p_destination not in ('facebook_page', 'instagram', 'discord')
  then raise exception 'invalid event social provider mutation start'; end if;

  select occurrence.* into locked_occurrence
  from public.event_social_occurrences occurrence
  join public.event_social_publication_jobs job
    on job.occurrence_id = occurrence.id
  where job.id = p_job_id
  for update of occurrence;
  if not found then return false; end if;

  update public.event_social_publication_jobs job
  set status = 'publishing',
    attempt_count = 1,
    provider_mutation_started_at = started_at_value,
    claim_expires_at = started_at_value + interval '5 minutes'
  from public.event_social_destination_settings setting,
    public.event_social_publication_templates template
  where job.id = p_job_id
    and (
      (p_destination = 'instagram' and job.status = 'prepared')
      or (p_destination in ('facebook_page', 'discord') and job.status = 'approved')
    )
    and job.claim_token = p_claim_token
    and job.claim_expires_at > started_at_value
    and job.destination = p_destination
    and job.attempt_count = 0
    and job.provider_mutation_started_at is null
    and locked_occurrence.state = 'scheduled'
    and locked_occurrence.updated_at = job.approved_occurrence_updated_at
    and started_at_value >= locked_occurrence.publish_at
    and started_at_value < locked_occurrence.publish_at + interval '2 minutes'
    and setting.destination = job.destination
    and setting.enabled = true
    and template.id = job.template_id
    and template.source_event_id = locked_occurrence.source_event_id
    and template.destination = job.destination
    and template.approved = true
    and template.enabled = true
    and template.template_revision = job.template_revision
    and template.media_sha256 = job.media_sha256
    and job.confirmation_fingerprint = encode(extensions.digest(concat_ws(E'\n',
      locked_occurrence.id::text,
      job.destination,
      locked_occurrence.publish_at::text,
      locked_occurrence.updated_at::text,
      job.message,
      coalesce(job.alt_text, ''),
      job.media_path,
      job.media_sha256,
      job.approved_by::text,
      job.approval_mode,
      coalesce(job.template_revision, '')
    ), 'sha256'), 'hex')
    and (
      p_destination <> 'instagram'
      or (
        job.preparation_attempt_count = 1
        and job.prepared_at is not null
        and job.provider_secondary_id ~ '^[A-Za-z0-9_.:-]{1,255}$'
        and job.preparation_fingerprint = encode(extensions.digest(concat_ws(E'\n',
          job.confirmation_fingerprint,
          job.provider_secondary_id,
          job.template_revision,
          'instagram_container'
        ), 'sha256'), 'hex')
      )
    )
  returning job.* into changed_job;
  if not found then return false; end if;

  insert into public.event_social_publication_events (
    occurrence_id, job_id, destination, action, detail
  ) values (
    changed_job.occurrence_id, changed_job.id, changed_job.destination,
    'provider_mutation_started',
    jsonb_build_object('window', 'event_minus_60_to_58_minutes')
  );
  return true;
end;
$$;

revoke all on function public.start_event_social_provider_mutation(
  uuid, uuid, text
) from public, anon, authenticated;
grant execute on function public.start_event_social_provider_mutation(
  uuid, uuid, text
) to service_role;

create or replace function public.finish_event_social_pre_mutation(
  p_job_id uuid,
  p_claim_token uuid,
  p_outcome text,
  p_failure_category text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_job public.event_social_publication_jobs%rowtype;
begin
  if p_outcome not in ('failed', 'reconcile_required')
    or p_failure_category !~ '^[a-z][a-z0-9_]{0,79}$'
  then raise exception 'invalid event social pre-mutation completion'; end if;

  update public.event_social_publication_jobs job
  set status = p_outcome,
    claim_token = null,
    claim_expires_at = null,
    failure_category = p_failure_category
  where job.id = p_job_id
    and job.status in ('approved', 'prepared')
    and job.claim_token = p_claim_token
    and job.attempt_count = 0
    and job.provider_mutation_started_at is null
  returning * into changed_job;
  if not found then return false; end if;

  insert into public.event_social_publication_events (
    occurrence_id, job_id, destination, action, detail
  ) values (
    changed_job.occurrence_id, changed_job.id, changed_job.destination,
    p_outcome,
    jsonb_build_object('category', p_failure_category, 'providerMutationStarted', false)
  );
  return true;
end;
$$;

revoke all on function public.finish_event_social_pre_mutation(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.finish_event_social_pre_mutation(uuid, uuid, text, text)
  to service_role;

create or replace function public.fail_event_social_template_attestation(
  p_job_id uuid,
  p_claim_token uuid,
  p_failure_category text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_job public.event_social_publication_jobs%rowtype;
begin
  if p_failure_category not in (
    'template_media_attestation_unavailable',
    'template_media_attestation_mismatch'
  ) then raise exception 'invalid event social template attestation failure'; end if;

  update public.event_social_publication_jobs job
  set status = 'failed',
    claim_token = null,
    claim_expires_at = null,
    failure_category = p_failure_category
  where job.id = p_job_id
    and job.status in ('approved', 'prepared')
    and job.claim_token = p_claim_token
    and job.attempt_count = 0
    and job.provider_mutation_started_at is null
    and job.approval_mode = 'template'
    and job.template_id is not null
  returning * into changed_job;

  if not found then return false; end if;

  update public.event_social_publication_templates template
  set approved = false,
    enabled = false,
    approved_by = null,
    approved_at = null
  where template.id = changed_job.template_id;

  with invalidated as (
    update public.event_social_publication_jobs job
    set status = 'pending_approval',
      content_version = null,
      message = null,
      alt_text = null,
      media_path = null,
      media_sha256 = null,
      approval_mode = null,
      template_id = null,
      template_revision = null,
      approved_by = null,
      approved_at = null,
      approved_occurrence_updated_at = null,
      confirmation_fingerprint = null,
      claim_token = null,
      claim_expires_at = null,
      preparation_attempt_count = 0,
      preparation_started_at = null,
      prepared_at = null,
      preparation_fingerprint = null,
      provider_secondary_id = null,
      failure_category = null
    where job.template_id = changed_job.template_id
      and job.id <> changed_job.id
      and job.status in ('approved', 'prepared')
    returning job.id, job.occurrence_id, job.destination
  )
  insert into public.event_social_publication_events (
    occurrence_id, job_id, destination, action, detail
  )
  select invalidated.occurrence_id, invalidated.id, invalidated.destination,
    'template_job_invalidated',
    jsonb_build_object('category', p_failure_category)
  from invalidated;

  insert into public.event_social_publication_events (
    occurrence_id, job_id, destination, action, detail
  ) values (
    changed_job.occurrence_id, changed_job.id, changed_job.destination,
    'template_invalidated', jsonb_build_object('category', p_failure_category)
  );
  return true;
end;
$$;

revoke all on function public.fail_event_social_template_attestation(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.fail_event_social_template_attestation(uuid, uuid, text)
  to service_role;

create or replace function public.finish_event_social_publication(
  p_job_id uuid,
  p_claim_token uuid,
  p_outcome text,
  p_provider_primary_id text default null,
  p_provider_secondary_id text default null,
  p_provider_permalink text default null,
  p_failure_category text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_job public.event_social_publication_jobs%rowtype;
begin
  if p_outcome not in ('published', 'failed', 'reconcile_required')
    or (p_provider_primary_id is not null and char_length(p_provider_primary_id) > 255)
    or (p_provider_secondary_id is not null and char_length(p_provider_secondary_id) > 255)
    or (p_provider_permalink is not null and char_length(p_provider_permalink) > 1000)
    or (p_failure_category is not null and p_failure_category !~ '^[a-z][a-z0-9_]{0,79}$')
  then raise exception 'invalid event social completion'; end if;

  update public.event_social_publication_jobs job
  set status = p_outcome,
    provider_primary_id = case when p_outcome in ('published', 'reconcile_required')
      then nullif(btrim(p_provider_primary_id), '') else null end,
    provider_secondary_id = case when p_outcome in ('published', 'reconcile_required')
      then nullif(btrim(p_provider_secondary_id), '') else null end,
    provider_permalink = case when p_outcome in ('published', 'reconcile_required')
      then nullif(btrim(p_provider_permalink), '') else null end,
    published_at = case when p_outcome = 'published' then now() else null end,
    failure_category = case when p_outcome = 'published' then null
      else coalesce(nullif(p_failure_category, ''), 'provider_failure') end,
    claim_token = null,
    claim_expires_at = null
  where job.id = p_job_id
    and job.status = 'publishing'
    and job.claim_token = p_claim_token
    and job.attempt_count = 1
    and job.provider_mutation_started_at is not null
  returning * into changed_job;

  if not found then return false; end if;
  insert into public.event_social_publication_events (
    occurrence_id, job_id, destination, action, detail
  ) values (
    changed_job.occurrence_id, changed_job.id, changed_job.destination,
    p_outcome, jsonb_build_object(
      'outcome', p_outcome,
      'category', changed_job.failure_category
    )
  );
  return true;
end;
$$;

revoke all on function public.finish_event_social_publication(
  uuid, uuid, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.finish_event_social_publication(
  uuid, uuid, text, text, text, text, text
) to service_role;

create or replace function public.get_event_social_publication_reconciliation_snapshot(
  p_job_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  snapshot jsonb;
begin
  if p_job_id is null then
    return jsonb_build_object('found', false);
  end if;

  select jsonb_build_object(
    'found', true,
    'destination_enabled', setting.enabled,
    'job', jsonb_build_object(
      'id', job.id,
      'destination', job.destination,
      'status', job.status,
      'message', job.message,
      'alt_text', job.alt_text,
      'media_path', job.media_path,
      'media_sha256', job.media_sha256,
      'provider_primary_id', job.provider_primary_id,
      'provider_secondary_id', job.provider_secondary_id,
      'provider_permalink', job.provider_permalink,
      'updated_at', job.updated_at
    )
  ) into snapshot
  from public.event_social_publication_jobs job
  join public.event_social_destination_settings setting
    on setting.destination = job.destination
  where job.id = p_job_id
    and job.status = 'reconcile_required';

  return coalesce(snapshot, jsonb_build_object('found', false));
end;
$$;

revoke all on function public.get_event_social_publication_reconciliation_snapshot(uuid)
  from public, anon, authenticated;
grant execute on function public.get_event_social_publication_reconciliation_snapshot(uuid)
  to service_role;

create or replace function public.resolve_event_social_publication_reconciliation(
  p_job_id uuid,
  p_destination text,
  p_expected_updated_at timestamptz,
  p_resolution text,
  p_actor_id uuid,
  p_note text,
  p_provider_primary_id text default null,
  p_provider_secondary_id text default null,
  p_provider_permalink text default null,
  p_confirm boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_job public.event_social_publication_jobs%rowtype;
  changed_job public.event_social_publication_jobs%rowtype;
  destination_enabled boolean;
  normalized_note text := btrim(p_note);
begin
  if p_confirm is not true
    or p_job_id is null
    or p_destination not in ('facebook_page', 'instagram', 'discord')
    or p_expected_updated_at is null
    or p_resolution not in ('confirmed_published', 'confirmed_not_published')
    or p_actor_id is null
    or normalized_note is null
    or char_length(normalized_note) not between 1 and 500
    or (p_provider_primary_id is not null
      and p_provider_primary_id !~ '^[A-Za-z0-9_.:-]{1,255}$')
    or (p_provider_secondary_id is not null
      and p_provider_secondary_id !~ '^[A-Za-z0-9_.:-]{1,255}$')
    or (p_provider_permalink is not null
      and (char_length(p_provider_permalink) > 1000
        or p_provider_permalink !~ '^https://'))
  then raise exception 'invalid event social reconciliation'; end if;

  select job.* into locked_job
  from public.event_social_publication_jobs job
  where job.id = p_job_id
  for update;

  if not found then
    return jsonb_build_object('committed', false, 'destination_enabled', false);
  end if;

  select setting.enabled into destination_enabled
  from public.event_social_destination_settings setting
  where setting.destination = locked_job.destination
  for update;

  if locked_job.destination <> p_destination
    or locked_job.status <> 'reconcile_required'
    or locked_job.updated_at <> p_expected_updated_at
    or destination_enabled is distinct from false
  then
    return jsonb_build_object(
      'committed', false,
      'destination_enabled', coalesce(destination_enabled, false)
    );
  end if;

  if p_resolution = 'confirmed_published' then
    if p_provider_primary_id is null
      or (locked_job.provider_primary_id is not null
        and locked_job.provider_primary_id <> p_provider_primary_id)
      or (locked_job.provider_secondary_id is not null
        and locked_job.provider_secondary_id is distinct from p_provider_secondary_id)
      or (locked_job.provider_permalink is not null
        and locked_job.provider_permalink is distinct from p_provider_permalink)
      or (p_destination in ('facebook_page', 'instagram')
        and p_provider_permalink is null)
      or (p_destination = 'facebook_page'
        and p_provider_permalink !~ '^https://(www\.)?facebook\.com/')
      or (p_destination = 'instagram'
        and p_provider_permalink !~ '^https://(www\.)?instagram\.com/')
      or (p_destination = 'instagram'
        and (locked_job.provider_secondary_id is null
          or p_provider_secondary_id is distinct from locked_job.provider_secondary_id))
      or (p_destination = 'discord'
        and (p_provider_secondary_id is not null or p_provider_permalink is not null))
    then raise exception 'invalid verified event social publication'; end if;

    update public.event_social_publication_jobs job
    set status = 'published',
      provider_primary_id = p_provider_primary_id,
      provider_secondary_id = p_provider_secondary_id,
      provider_permalink = p_provider_permalink,
      published_at = coalesce(job.published_at, now()),
      failure_category = null,
      claim_token = null,
      claim_expires_at = null,
      reconciled_by = p_actor_id,
      reconciled_at = now(),
      reconciliation_resolution = p_resolution,
      reconciliation_note = normalized_note
    where job.id = locked_job.id
    returning job.* into changed_job;
  else
    if p_provider_primary_id is not null
      or p_provider_secondary_id is not null
      or p_provider_permalink is not null
      or locked_job.provider_primary_id is not null
      or locked_job.provider_secondary_id is not null
      or locked_job.provider_permalink is not null
    then raise exception 'invalid absent event social publication'; end if;

    update public.event_social_publication_jobs job
    set status = 'failed',
      provider_primary_id = null,
      provider_secondary_id = null,
      provider_permalink = null,
      published_at = null,
      failure_category = 'reconciled_not_published',
      claim_token = null,
      claim_expires_at = null,
      reconciled_by = p_actor_id,
      reconciled_at = now(),
      reconciliation_resolution = p_resolution,
      reconciliation_note = normalized_note
    where job.id = locked_job.id
    returning job.* into changed_job;
  end if;

  insert into public.event_social_publication_events (
    occurrence_id, job_id, destination, actor_id, action, detail
  ) values (
    changed_job.occurrence_id,
    changed_job.id,
    changed_job.destination,
    p_actor_id,
    case p_resolution
      when 'confirmed_published' then 'reconciliation_confirmed_published'
      else 'reconciliation_confirmed_not_published'
    end,
    jsonb_build_object(
      'resolution', p_resolution,
      'category', case p_resolution
        when 'confirmed_published' then 'provider_publication_verified'
        else 'provider_absence_verified'
      end
    )
  );

  return jsonb_build_object(
    'committed', true,
    'destination_enabled', false,
    'job', jsonb_build_object(
      'id', changed_job.id,
      'destination', changed_job.destination,
      'status', changed_job.status,
      'updated_at', changed_job.updated_at
    )
  );
end;
$$;

revoke all on function public.resolve_event_social_publication_reconciliation(
  uuid, text, timestamptz, text, uuid, text, text, text, text, boolean
) from public, anon, authenticated;
grant execute on function public.resolve_event_social_publication_reconciliation(
  uuid, text, timestamptz, text, uuid, text, text, text, text, boolean
) to service_role;

create or replace function private.event_social_invoke_scheduler()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  scheduler_secret text;
  request_id bigint;
begin
  select secret.decrypted_secret into project_url
  from vault.decrypted_secrets secret
  where secret.name = 'project_url'
  order by secret.updated_at desc limit 1;

  select secret.decrypted_secret into scheduler_secret
  from vault.decrypted_secrets secret
  where secret.name = 'event_social_scheduler_secret'
  order by secret.updated_at desc limit 1;

  if project_url <> 'https://deyvmtncimmcinldjyqe.supabase.co'
    or scheduler_secret is null
    or char_length(scheduler_secret) not between 32 and 512
  then return null; end if;

  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/run-event-social-publication',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-mochirii-event-social-secret', scheduler_secret
    ),
    timeout_milliseconds := 5000
  ) into request_id;
  return request_id;
end;
$$;

revoke all on function private.event_social_invoke_scheduler() from public, anon, authenticated;
grant execute on function private.event_social_invoke_scheduler() to service_role;

comment on table public.event_social_occurrences is
  'Service-only occurrences derived from the committed UTC+8 guild schedule. Monthly ownership survives cancellation so same-time Guild Party rows do not revive.';
comment on table public.event_social_destination_settings is
  'Independent database kill switches. Every destination is disabled by default and also requires its exact Edge secret flag.';
comment on table public.event_social_publication_jobs is
  'One independently approved, single-attempt job per occurrence and destination. Ambiguous public-provider outcomes require reconciliation; uncertain non-public Instagram container creation fails terminally.';
comment on table public.event_social_publication_events is
  'Immutable server-authored audit categories; publication copy, tokens, private identifiers, and raw provider bodies are excluded.';
