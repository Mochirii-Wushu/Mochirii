create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.spinner_live_state (
  singleton_id smallint primary key default 1,
  session_id uuid not null default gen_random_uuid(),
  revision bigint not null default 0,
  phase text not null default 'idle',
  participants jsonb not null default '[]'::jsonb,
  roster_hash_sha256 text,
  draw_id uuid,
  started_at timestamptz,
  reveal_at timestamptz,
  duration_ms integer not null default 0,
  start_rotation numeric not null default 0,
  final_rotation numeric not null default 0,
  selected_index integer,
  winner jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint spinner_live_state_singleton_check check (singleton_id = 1),
  constraint spinner_live_state_revision_check check (revision >= 0),
  constraint spinner_live_state_phase_check check (phase in ('idle', 'spinning', 'revealed')),
  constraint spinner_live_state_participants_check check (
    jsonb_typeof(participants) = 'array'
    and jsonb_array_length(participants) between 0 and 100
  ),
  constraint spinner_live_state_hash_check check (
    roster_hash_sha256 is null or roster_hash_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint spinner_live_state_duration_check check (duration_ms between 0 and 30000),
  constraint spinner_live_state_selection_check check (
    selected_index is null
    or (selected_index >= 0 and selected_index < jsonb_array_length(participants))
  ),
  constraint spinner_live_state_draw_shape_check check (
    (phase = 'idle' and draw_id is null and started_at is null and reveal_at is null and selected_index is null and winner is null)
    or
    (phase in ('spinning', 'revealed') and draw_id is not null and started_at is not null and reveal_at is not null
      and duration_ms > 0 and selected_index is not null and winner is not null)
  )
);

insert into public.spinner_live_state (singleton_id)
values (1)
on conflict (singleton_id) do nothing;

create table if not exists public.spinner_commands (
  command_id uuid primary key,
  action text not null,
  actor_id uuid references auth.users(id) on delete set null,
  expected_revision bigint not null,
  request_hash_sha256 text not null,
  status text not null default 'pending',
  staged_payload jsonb,
  response_snapshot jsonb,
  response_receipt jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  lease_expires_at timestamptz not null default (now() + interval '60 seconds'),
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  constraint spinner_commands_action_check check (action in ('set_roster', 'spin', 'reset')),
  constraint spinner_commands_expected_revision_check check (expected_revision >= 0),
  constraint spinner_commands_hash_check check (request_hash_sha256 ~ '^[0-9a-f]{64}$'),
  constraint spinner_commands_status_check check (status in ('pending', 'applied', 'rejected')),
  constraint spinner_commands_lease_check check (lease_expires_at >= created_at),
  constraint spinner_commands_retention_check check (expires_at >= created_at + interval '30 days')
);

create index if not exists spinner_commands_expires_at_idx
on public.spinner_commands (expires_at);

create index if not exists spinner_commands_pending_lease_idx
on public.spinner_commands (lease_expires_at)
where status = 'pending';

create table if not exists public.spinner_draw_receipts (
  draw_id uuid primary key,
  command_id uuid not null unique references public.spinner_commands(command_id) on delete restrict,
  session_id uuid not null,
  revision bigint not null,
  actor_id uuid references auth.users(id) on delete set null,
  timestamp_iso timestamptz not null,
  singapore_time text not null,
  app_version text not null,
  algorithm_version text not null,
  roster_snapshot jsonb not null,
  roster_hash_sha256 text not null,
  rejection_limit bigint not null,
  sampled_words jsonb not null,
  accepted_word bigint not null,
  selected_index integer not null,
  winner jsonb not null,
  receipt jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  constraint spinner_draw_receipts_revision_check check (revision > 0),
  constraint spinner_draw_receipts_versions_check check (
    app_version = '1.0.0' and algorithm_version = 'uniform-uint32-rejection-v1'
  ),
  constraint spinner_draw_receipts_roster_check check (
    jsonb_typeof(roster_snapshot) = 'object'
    and jsonb_typeof(roster_snapshot -> 'participants') = 'array'
    and jsonb_array_length(roster_snapshot -> 'participants') between 2 and 100
  ),
  constraint spinner_draw_receipts_hash_check check (roster_hash_sha256 ~ '^[0-9a-f]{64}$'),
  constraint spinner_draw_receipts_words_check check (
    rejection_limit between 1 and 4294967296
    and jsonb_typeof(sampled_words) = 'array'
    and jsonb_array_length(sampled_words) >= 1
    and accepted_word between 0 and 4294967295
  ),
  constraint spinner_draw_receipts_selection_check check (
    selected_index >= 0 and selected_index < jsonb_array_length(roster_snapshot -> 'participants')
  ),
  constraint spinner_draw_receipts_retention_check check (expires_at >= created_at + interval '30 days')
);

create index if not exists spinner_draw_receipts_expires_at_idx
on public.spinner_draw_receipts (expires_at);

create table if not exists public.spinner_discord_outbox (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.spinner_draw_receipts(draw_id) on delete restrict,
  channel_key text not null,
  channel_id text not null,
  phase text not null default 'start_pending',
  start_payload jsonb not null,
  result_payload jsonb not null,
  reveal_after timestamptz not null,
  discord_message_id text,
  attempt_count integer not null default 0,
  last_error_code text,
  next_attempt_at timestamptz not null default now(),
  claim_token uuid,
  claim_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  constraint spinner_discord_outbox_draw_channel_key unique (draw_id, channel_key),
  constraint spinner_discord_outbox_channel_allowlist_check check (
    channel_key = 'raffle_spins' and channel_id = '1468667003366674721'
  ),
  constraint spinner_discord_outbox_phase_check check (
    phase in ('start_pending', 'result_waiting', 'result_pending', 'completed', 'failed')
  ),
  constraint spinner_discord_outbox_attempt_count_check check (attempt_count between 0 and 20),
  constraint spinner_discord_outbox_payload_check check (
    jsonb_typeof(start_payload) = 'object'
    and jsonb_typeof(result_payload) = 'object'
    and start_payload #>> '{enforce_nonce}' = 'true'
    and length(start_payload #>> '{nonce}') between 1 and 25
    and start_payload #> '{allowed_mentions,parse}' = '[]'::jsonb
    and start_payload #> '{allowed_mentions,users}' = '[]'::jsonb
    and start_payload #> '{allowed_mentions,roles}' = '[]'::jsonb
    and start_payload #>> '{allowed_mentions,replied_user}' = 'false'
    and result_payload #> '{allowed_mentions,parse}' = '[]'::jsonb
    and result_payload #> '{allowed_mentions,users}' = '[]'::jsonb
    and result_payload #> '{allowed_mentions,roles}' = '[]'::jsonb
    and result_payload #>> '{allowed_mentions,replied_user}' = 'false'
  ),
  constraint spinner_discord_outbox_retention_check check (expires_at >= created_at + interval '30 days')
);

create index if not exists spinner_discord_outbox_ready_idx
on public.spinner_discord_outbox (phase, next_attempt_at, reveal_after);

create table if not exists public.spinner_moderator_authorizations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verified_at timestamptz not null,
  expires_at timestamptz not null,
  constraint spinner_moderator_authorizations_window_check check (
    expires_at > verified_at
    and expires_at <= verified_at + interval '5 minutes'
  )
);

create index if not exists spinner_moderator_authorizations_expires_at_idx
on public.spinner_moderator_authorizations (expires_at);

alter table public.spinner_live_state enable row level security;
alter table public.spinner_commands enable row level security;
alter table public.spinner_draw_receipts enable row level security;
alter table public.spinner_discord_outbox enable row level security;
alter table public.spinner_moderator_authorizations enable row level security;

revoke all on table public.spinner_live_state from public, anon, authenticated;
revoke all on table public.spinner_commands from public, anon, authenticated;
revoke all on table public.spinner_draw_receipts from public, anon, authenticated;
revoke all on table public.spinner_discord_outbox from public, anon, authenticated;
revoke all on table public.spinner_moderator_authorizations from public, anon, authenticated;

grant all on table public.spinner_live_state to service_role;
grant all on table public.spinner_commands to service_role;
grant all on table public.spinner_draw_receipts to service_role;
grant all on table public.spinner_discord_outbox to service_role;
grant all on table public.spinner_moderator_authorizations to service_role;

drop policy if exists service_only_default_deny on public.spinner_live_state;
create policy service_only_default_deny on public.spinner_live_state
as restrictive for all to anon, authenticated
using (false) with check (false);

drop policy if exists service_only_default_deny on public.spinner_commands;
create policy service_only_default_deny on public.spinner_commands
as restrictive for all to anon, authenticated
using (false) with check (false);

drop policy if exists service_only_default_deny on public.spinner_draw_receipts;
create policy service_only_default_deny on public.spinner_draw_receipts
as restrictive for all to anon, authenticated
using (false) with check (false);

drop policy if exists service_only_default_deny on public.spinner_discord_outbox;
create policy service_only_default_deny on public.spinner_discord_outbox
as restrictive for all to anon, authenticated
using (false) with check (false);

drop policy if exists service_only_default_deny on public.spinner_moderator_authorizations;
create policy service_only_default_deny on public.spinner_moderator_authorizations
as restrictive for all to anon, authenticated
using (false) with check (false);

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

create or replace function public.spinner_reserve_command(
  p_command_id uuid,
  p_action text,
  p_actor_id uuid,
  p_expected_revision bigint,
  p_request_hash_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.spinner_commands%rowtype;
  current_state public.spinner_live_state%rowtype;
  state_revision bigint;
  state_phase text;
  state_reveal_at timestamptz;
begin
  if p_action not in ('set_roster', 'spin', 'reset')
    or p_actor_id is null
    or p_expected_revision < 0
    or p_request_hash_sha256 !~ '^[0-9a-f]{64}$'
  then
    return jsonb_build_object('ok', false, 'error', 'invalid_command');
  end if;

  select * into existing
  from public.spinner_commands
  where command_id = p_command_id
  for update;

  if found then
    if existing.action <> p_action
      or existing.actor_id is distinct from p_actor_id
      or existing.expected_revision <> p_expected_revision
      or existing.request_hash_sha256 <> p_request_hash_sha256
    then
      return jsonb_build_object('ok', false, 'error', 'command_id_conflict');
    end if;

    if existing.status = 'pending'
      and existing.staged_payload is null
      and existing.lease_expires_at <= now()
    then
      if existing.action = 'spin' then
        update public.spinner_commands
        set status = 'rejected',
          error_code = 'spin_result_not_durable',
          completed_at = now()
        where command_id = p_command_id
        returning * into existing;

        return jsonb_build_object(
          'ok', true,
          'reserved', false,
          'status', existing.status,
          'error', existing.error_code
        );
      end if;

      update public.spinner_commands
      set lease_expires_at = now() + interval '60 seconds',
        error_code = null
      where command_id = p_command_id
      returning * into existing;

      return jsonb_build_object(
        'ok', true,
        'reserved', true,
        'recoveredReservation', true,
        'status', 'pending'
      );
    end if;

    if existing.status = 'applied' then
      select * into current_state
      from public.spinner_live_state
      where singleton_id = 1;
    end if;

    return jsonb_build_object(
      'ok', true,
      'reserved', false,
      'status', existing.status,
      'snapshot', case
        when existing.status = 'applied' then private.spinner_snapshot_json(current_state, true)
        else existing.response_snapshot
      end,
      'receipt', existing.response_receipt,
      'staged', existing.staged_payload is not null,
      'error', existing.error_code
    );
  end if;

  select revision, phase, reveal_at into state_revision, state_phase, state_reveal_at
  from public.spinner_live_state
  where singleton_id = 1
  for update;

  if state_revision <> p_expected_revision then
    return jsonb_build_object('ok', false, 'error', 'revision_conflict', 'revision', state_revision);
  end if;

  if state_phase = 'spinning' and state_reveal_at > now() then
    return jsonb_build_object('ok', false, 'error', 'draw_in_progress');
  end if;

  update public.spinner_commands
  set status = 'rejected',
    error_code = case
      when action = 'spin' then 'spin_result_not_durable'
      else 'unstaged_lease_expired'
    end,
    completed_at = now()
  where status = 'pending'
    and expected_revision = p_expected_revision
    and staged_payload is null
    and lease_expires_at <= now();

  if exists (
    select 1 from public.spinner_commands
    where status = 'pending'
      and expected_revision = p_expected_revision
      and command_id <> p_command_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'command_in_progress');
  end if;

  insert into public.spinner_commands (
    command_id, action, actor_id, expected_revision, request_hash_sha256
  ) values (
    p_command_id, p_action, p_actor_id, p_expected_revision, p_request_hash_sha256
  )
  on conflict (command_id) do nothing
  returning * into existing;

  if found then
    return jsonb_build_object('ok', true, 'reserved', true, 'status', 'pending');
  end if;

  select * into existing
  from public.spinner_commands
  where command_id = p_command_id
  for update;

  if existing.action <> p_action
    or existing.actor_id is distinct from p_actor_id
    or existing.expected_revision <> p_expected_revision
    or existing.request_hash_sha256 <> p_request_hash_sha256
  then
    return jsonb_build_object('ok', false, 'error', 'command_id_conflict');
  end if;

  if existing.status = 'applied' then
    select * into current_state
    from public.spinner_live_state
    where singleton_id = 1;
  end if;

  return jsonb_build_object(
    'ok', true,
    'reserved', false,
    'status', existing.status,
    'snapshot', case
      when existing.status = 'applied' then private.spinner_snapshot_json(current_state, true)
      else existing.response_snapshot
    end,
    'receipt', existing.response_receipt,
    'staged', existing.staged_payload is not null,
    'error', existing.error_code
  );
end;
$$;

revoke all on function public.spinner_reserve_command(uuid, text, uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.spinner_reserve_command(uuid, text, uuid, bigint, text) to service_role;

create or replace function public.spinner_stage_command(
  p_command_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_row public.spinner_commands%rowtype;
begin
  select * into command_row
  from public.spinner_commands
  where command_id = p_command_id
  for update;

  if not found or command_row.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'command_not_pending');
  end if;

  if command_row.staged_payload is not null then
    return jsonb_build_object('ok', true, 'staged', false);
  end if;

  update public.spinner_commands
  set staged_payload = p_payload,
    lease_expires_at = now() + interval '60 seconds'
  where command_id = p_command_id;

  return jsonb_build_object('ok', true, 'staged', true);
end;
$$;

revoke all on function public.spinner_stage_command(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.spinner_stage_command(uuid, jsonb) to service_role;

create or replace function public.spinner_reject_unstaged_spin(
  p_command_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_row public.spinner_commands%rowtype;
begin
  select * into command_row
  from public.spinner_commands
  where command_id = p_command_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'command_not_reserved');
  end if;
  if command_row.action <> 'spin' then
    return jsonb_build_object('ok', false, 'error', 'invalid_action');
  end if;

  if command_row.status = 'pending' and command_row.staged_payload is null then
    update public.spinner_commands
    set status = 'rejected',
      error_code = 'spin_result_not_durable',
      completed_at = now()
    where command_id = p_command_id;
    return jsonb_build_object('ok', true, 'rejected', true);
  end if;

  return jsonb_build_object(
    'ok', true,
    'rejected', false,
    'status', command_row.status,
    'staged', command_row.staged_payload is not null,
    'error', command_row.error_code
  );
end;
$$;

revoke all on function public.spinner_reject_unstaged_spin(uuid) from public, anon, authenticated;
grant execute on function public.spinner_reject_unstaged_spin(uuid) to service_role;

create or replace function public.spinner_apply_command(
  p_command_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_row public.spinner_commands%rowtype;
  state_row public.spinner_live_state%rowtype;
  snapshot jsonb;
  receipt_value jsonb;
  participant_count integer;
  next_revision bigint;
  next_session_id uuid;
  draw_id_value uuid;
  receipt_timestamp_value timestamptz;
  started_at_value timestamptz;
  reveal_at_value timestamptz;
  p_payload jsonb;
begin
  select * into command_row
  from public.spinner_commands
  where command_id = p_command_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'command_not_reserved');
  end if;

  if command_row.status = 'applied' then
    return jsonb_build_object(
      'ok', true,
      'snapshot', command_row.response_snapshot,
      'receipt', command_row.response_receipt,
      'idempotentReplay', true
    );
  end if;

  if command_row.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', coalesce(command_row.error_code, 'command_rejected'));
  end if;

  p_payload := command_row.staged_payload;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'command_not_staged');
  end if;

  select * into state_row
  from public.spinner_live_state
  where singleton_id = 1
  for update;

  if state_row.revision <> command_row.expected_revision then
    update public.spinner_commands
    set status = 'rejected', error_code = 'revision_conflict', completed_at = now()
    where command_id = p_command_id;
    return jsonb_build_object('ok', false, 'error', 'revision_conflict', 'revision', state_row.revision);
  end if;

  next_revision := state_row.revision + 1;

  if command_row.action = 'set_roster' then
    if state_row.phase = 'spinning' and state_row.reveal_at > now() then
      update public.spinner_commands
      set status = 'rejected', error_code = 'draw_in_progress', completed_at = now()
      where command_id = p_command_id;
      return jsonb_build_object('ok', false, 'error', 'draw_in_progress');
    end if;

    if jsonb_typeof(p_payload -> 'participants') <> 'array' then
      update public.spinner_commands
      set status = 'rejected', error_code = 'invalid_roster', completed_at = now()
      where command_id = p_command_id;
      return jsonb_build_object('ok', false, 'error', 'invalid_roster');
    end if;

    participant_count := jsonb_array_length(p_payload -> 'participants');
    if participant_count > 100 then
      update public.spinner_commands
      set status = 'rejected', error_code = 'invalid_roster', completed_at = now()
      where command_id = p_command_id;
      return jsonb_build_object('ok', false, 'error', 'invalid_roster');
    end if;

    update public.spinner_live_state
    set revision = next_revision,
      phase = 'idle',
      participants = p_payload -> 'participants',
      roster_hash_sha256 = p_payload ->> 'rosterHashSha256',
      draw_id = null,
      started_at = null,
      reveal_at = null,
      duration_ms = 0,
      start_rotation = 0,
      final_rotation = 0,
      selected_index = null,
      winner = null,
      updated_by = command_row.actor_id,
      updated_at = now()
    where singleton_id = 1
    returning * into state_row;

  elsif command_row.action = 'spin' then
    if state_row.phase = 'spinning' and state_row.reveal_at > now() then
      update public.spinner_commands
      set status = 'rejected', error_code = 'draw_in_progress', completed_at = now()
      where command_id = p_command_id;
      return jsonb_build_object('ok', false, 'error', 'draw_in_progress');
    end if;

    participant_count := jsonb_array_length(state_row.participants);
    if participant_count < 2 or participant_count > 100 then
      update public.spinner_commands
      set status = 'rejected', error_code = 'invalid_roster', completed_at = now()
      where command_id = p_command_id;
      return jsonb_build_object('ok', false, 'error', 'invalid_roster');
    end if;

    receipt_value := p_payload -> 'receipt';
    draw_id_value := (receipt_value ->> 'drawId')::uuid;
    receipt_timestamp_value := (receipt_value ->> 'timestampIso')::timestamptz;
    started_at_value := (p_payload ->> 'startAt')::timestamptz;
    reveal_at_value := (p_payload ->> 'revealAt')::timestamptz;

    if receipt_value is null
      or jsonb_typeof(receipt_value) <> 'object'
      or receipt_value -> 'rosterSnapshot' -> 'participants' <> state_row.participants
      or receipt_value ->> 'rosterHashSha256' <> state_row.roster_hash_sha256
      or (receipt_value ->> 'selectedIndex')::integer < 0
      or (receipt_value ->> 'selectedIndex')::integer >= participant_count
      or receipt_value -> 'winner' <> state_row.participants -> ((receipt_value ->> 'selectedIndex')::integer)
      or started_at_value <> receipt_timestamp_value + interval '2 seconds'
      or reveal_at_value <= started_at_value
      or extract(epoch from (reveal_at_value - started_at_value)) * 1000 <> (p_payload ->> 'durationMs')::integer
    then
      update public.spinner_commands
      set status = 'rejected', error_code = 'invalid_receipt', completed_at = now()
      where command_id = p_command_id;
      return jsonb_build_object('ok', false, 'error', 'invalid_receipt');
    end if;

    insert into public.spinner_draw_receipts (
      draw_id,
      command_id,
      session_id,
      revision,
      actor_id,
      timestamp_iso,
      singapore_time,
      app_version,
      algorithm_version,
      roster_snapshot,
      roster_hash_sha256,
      rejection_limit,
      sampled_words,
      accepted_word,
      selected_index,
      winner,
      receipt
    ) values (
      draw_id_value,
      command_row.command_id,
      state_row.session_id,
      next_revision,
      command_row.actor_id,
      receipt_timestamp_value,
      receipt_value ->> 'singaporeTime',
      receipt_value ->> 'appVersion',
      receipt_value ->> 'algorithmVersion',
      receipt_value -> 'rosterSnapshot',
      receipt_value ->> 'rosterHashSha256',
      (receipt_value ->> 'rejectionLimit')::bigint,
      receipt_value -> 'sampledWords',
      (receipt_value ->> 'acceptedWord')::bigint,
      (receipt_value ->> 'selectedIndex')::integer,
      receipt_value -> 'winner',
      receipt_value
    );

    insert into public.spinner_discord_outbox (
      draw_id,
      channel_key,
      channel_id,
      start_payload,
      result_payload,
      reveal_after
    ) values (
      draw_id_value,
      p_payload ->> 'discordChannelKey',
      p_payload ->> 'discordChannelId',
      p_payload -> 'discordStartPayload',
      p_payload -> 'discordResultPayload',
      reveal_at_value
    );

    update public.spinner_live_state
    set revision = next_revision,
      phase = 'spinning',
      roster_hash_sha256 = receipt_value ->> 'rosterHashSha256',
      draw_id = draw_id_value,
      started_at = started_at_value,
      reveal_at = reveal_at_value,
      duration_ms = (p_payload ->> 'durationMs')::integer,
      start_rotation = (p_payload ->> 'startRotation')::numeric,
      final_rotation = (p_payload ->> 'finalRotation')::numeric,
      selected_index = (receipt_value ->> 'selectedIndex')::integer,
      winner = receipt_value -> 'winner',
      updated_by = command_row.actor_id,
      updated_at = now()
    where singleton_id = 1
    returning * into state_row;

  elsif command_row.action = 'reset' then
    next_session_id := gen_random_uuid();
    update public.spinner_live_state
    set session_id = next_session_id,
      revision = next_revision,
      phase = 'idle',
      draw_id = null,
      started_at = null,
      reveal_at = null,
      duration_ms = 0,
      start_rotation = final_rotation,
      selected_index = null,
      winner = null,
      updated_by = command_row.actor_id,
      updated_at = now()
    where singleton_id = 1
    returning * into state_row;
  end if;

  -- Persist the full selected result. The Edge serializer suppresses it until
  -- reveal_at, which keeps command replay deterministic without early display.
  snapshot := private.spinner_snapshot_json(state_row, true);

  update public.spinner_commands
  set status = 'applied',
    response_snapshot = snapshot,
    response_receipt = case when command_row.action = 'spin' then receipt_value else null end,
    completed_at = now()
  where command_id = p_command_id;

  return jsonb_build_object(
    'ok', true,
    'snapshot', snapshot,
    'receipt', case when command_row.action = 'spin' then receipt_value else null end,
    'idempotentReplay', false
  );
exception
  when invalid_text_representation or numeric_value_out_of_range or check_violation then
    update public.spinner_commands
    set status = 'rejected', error_code = 'invalid_payload', completed_at = now()
    where command_id = p_command_id;
    return jsonb_build_object('ok', false, 'error', 'invalid_payload');
end;
$$;

revoke all on function public.spinner_apply_command(uuid) from public, anon, authenticated;
grant execute on function public.spinner_apply_command(uuid) to service_role;

create or replace function public.spinner_recover_commands()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_record record;
  apply_result jsonb;
  applied_count integer := 0;
  rejected_count integer := 0;
  deferred_count integer := 0;
  reclaimable_count integer := 0;
begin
  for command_record in
    select command_id, action, staged_payload
    from public.spinner_commands
    where status = 'pending'
      and lease_expires_at <= now()
      and (staged_payload is not null or error_code is distinct from 'unstaged_lease_expired')
    order by created_at asc
    for update skip locked
  loop
    if command_record.staged_payload is null then
      if command_record.action = 'spin' then
        update public.spinner_commands
        set status = 'rejected',
          error_code = 'spin_result_not_durable',
          completed_at = now()
        where command_id = command_record.command_id and status = 'pending';
        rejected_count := rejected_count + 1;
      else
        update public.spinner_commands
        set error_code = 'unstaged_lease_expired'
        where command_id = command_record.command_id and status = 'pending';
        reclaimable_count := reclaimable_count + 1;
      end if;
      continue;
    end if;

    begin
      apply_result := public.spinner_apply_command(command_record.command_id);
      if coalesce((apply_result ->> 'ok')::boolean, false) then
        applied_count := applied_count + 1;
      elsif exists (
        select 1 from public.spinner_commands
        where command_id = command_record.command_id and status = 'pending'
      ) then
        update public.spinner_commands
        set lease_expires_at = now() + interval '60 seconds'
        where command_id = command_record.command_id;
        deferred_count := deferred_count + 1;
      else
        rejected_count := rejected_count + 1;
      end if;
    exception when others then
      -- spinner_apply_command is atomic inside this subtransaction. Retain the
      -- frozen staged payload and retry instead of ever sampling again.
      update public.spinner_commands
      set lease_expires_at = now() + interval '60 seconds'
      where command_id = command_record.command_id and status = 'pending';
      deferred_count := deferred_count + 1;
    end;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'applied', applied_count,
    'rejected', rejected_count,
    'deferred', deferred_count,
    'reclaimable', reclaimable_count
  );
end;
$$;

revoke all on function public.spinner_recover_commands() from public, anon, authenticated;
grant execute on function public.spinner_recover_commands() to service_role;

create or replace function public.spinner_finalize_reveal()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  state_row public.spinner_live_state%rowtype;
begin
  select * into state_row
  from public.spinner_live_state
  where singleton_id = 1
  for update;

  if state_row.phase = 'spinning' and state_row.reveal_at <= now() then
    update public.spinner_live_state
    set phase = 'revealed', revision = revision + 1, updated_at = now()
    where singleton_id = 1
    returning * into state_row;

    update public.spinner_discord_outbox
    set phase = case when phase = 'result_waiting' then 'result_pending' else phase end,
      next_attempt_at = least(next_attempt_at, now()),
      updated_at = now()
    where draw_id = state_row.draw_id;

    update public.spinner_commands command
    set response_snapshot = private.spinner_snapshot_json(state_row, true)
    from public.spinner_draw_receipts receipt
    where receipt.draw_id = state_row.draw_id
      and command.command_id = receipt.command_id;
  end if;

  return private.spinner_snapshot_json(state_row, state_row.phase = 'revealed');
end;
$$;

revoke all on function public.spinner_finalize_reveal() from public, anon, authenticated;
grant execute on function public.spinner_finalize_reveal() to service_role;

create or replace function public.spinner_claim_discord_outbox(
  p_claim_token uuid,
  p_limit integer default 10
)
returns setof public.spinner_discord_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit < 1 or p_limit > 10 then
    raise exception 'Spinner outbox claim limit is invalid.' using errcode = '22023';
  end if;

  update public.spinner_discord_outbox outbox
  set phase = 'failed',
    claim_token = null,
    claim_expires_at = null,
    last_error_code = 'delivery_attempts_exhausted',
    updated_at = now()
  where outbox.phase in ('start_pending', 'result_waiting', 'result_pending')
    and outbox.attempt_count >= 20
    and (outbox.claim_token is null or outbox.claim_expires_at <= now());

  return query
  with ready as (
    select outbox.id
    from public.spinner_discord_outbox outbox
    where outbox.phase in ('start_pending', 'result_waiting', 'result_pending')
      and outbox.next_attempt_at <= now()
      and (outbox.phase <> 'result_waiting' or outbox.reveal_after <= now())
      and (outbox.claim_token is null or outbox.claim_expires_at <= now())
      and outbox.attempt_count < 20
    order by outbox.created_at asc
    for update skip locked
    limit p_limit
  )
  update public.spinner_discord_outbox outbox
  set phase = case
        when outbox.phase = 'result_waiting' then 'result_pending'
        else outbox.phase
      end,
      claim_token = p_claim_token,
      claim_expires_at = now() + interval '60 seconds',
      attempt_count = outbox.attempt_count + 1,
      updated_at = now()
  from ready
  where outbox.id = ready.id
  returning outbox.*;
end;
$$;

revoke all on function public.spinner_claim_discord_outbox(uuid, integer) from public, anon, authenticated;
grant execute on function public.spinner_claim_discord_outbox(uuid, integer) to service_role;

create or replace function public.spinner_finish_discord_outbox_claim(
  p_id uuid,
  p_claim_token uuid,
  p_outcome text,
  p_message_id text default null,
  p_error_code text default null,
  p_retry_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  outbox public.spinner_discord_outbox%rowtype;
begin
  select * into outbox
  from public.spinner_discord_outbox
  where id = p_id and claim_token = p_claim_token
  for update;

  if not found then return false; end if;

  if p_outcome = 'start_sent' and outbox.phase = 'start_pending' and p_message_id ~ '^[0-9]{16,22}$' then
    update public.spinner_discord_outbox
    set phase = case when reveal_after <= now() then 'result_pending' else 'result_waiting' end,
      discord_message_id = p_message_id,
      next_attempt_at = greatest(reveal_after, now()),
      claim_token = null,
      claim_expires_at = null,
      last_error_code = null,
      updated_at = now()
    where id = p_id;
    return true;
  end if;

  if p_outcome = 'result_sent' and outbox.phase = 'result_pending' and outbox.discord_message_id is not null then
    update public.spinner_discord_outbox
    set phase = 'completed',
      completed_at = now(),
      claim_token = null,
      claim_expires_at = null,
      last_error_code = null,
      updated_at = now()
    where id = p_id;
    return true;
  end if;

  if p_outcome = 'retry' and outbox.attempt_count < 20 and p_retry_at is not null and p_retry_at > now() then
    update public.spinner_discord_outbox
    set next_attempt_at = p_retry_at,
      claim_token = null,
      claim_expires_at = null,
      last_error_code = left(coalesce(p_error_code, 'delivery_failed'), 100),
      updated_at = now()
    where id = p_id;
    return true;
  end if;

  update public.spinner_discord_outbox
  set phase = 'failed',
    claim_token = null,
    claim_expires_at = null,
    last_error_code = left(coalesce(p_error_code, 'delivery_failed'), 100),
    updated_at = now()
  where id = p_id;
  return true;
end;
$$;

revoke all on function public.spinner_finish_discord_outbox_claim(uuid, uuid, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.spinner_finish_discord_outbox_claim(uuid, uuid, text, text, text, timestamptz) to service_role;

create or replace function private.spinner_receipt_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if old.actor_id is not null
      and new.actor_id is null
      and (to_jsonb(new) - 'actor_id') = (to_jsonb(old) - 'actor_id')
    then
      return new;
    end if;
    raise exception 'Spinner draw receipts are immutable.' using errcode = '55000';
  end if;
  if old.expires_at > now() then
    raise exception 'Spinner draw receipts must be retained for 30 days.' using errcode = '55000';
  end if;
  return old;
end;
$$;

revoke all on function private.spinner_receipt_immutable() from public, anon, authenticated;
grant execute on function private.spinner_receipt_immutable() to service_role;

drop trigger if exists spinner_draw_receipts_immutable on public.spinner_draw_receipts;
create trigger spinner_draw_receipts_immutable
before update or delete on public.spinner_draw_receipts
for each row execute function private.spinner_receipt_immutable();

create or replace function public.spinner_cleanup_expired(
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleanup_at timestamptz := least(coalesce(p_now, now()), now());
  authorization_count integer;
  outbox_count integer;
  receipt_count integer;
  command_count integer;
begin
  delete from public.spinner_moderator_authorizations
  where expires_at <= cleanup_at;
  get diagnostics authorization_count = row_count;

  delete from public.spinner_discord_outbox
  where expires_at <= cleanup_at;
  get diagnostics outbox_count = row_count;

  delete from public.spinner_draw_receipts
  where expires_at <= cleanup_at;
  get diagnostics receipt_count = row_count;

  delete from public.spinner_commands command
  where command.expires_at <= cleanup_at
    and not exists (
      select 1 from public.spinner_draw_receipts receipt
      where receipt.command_id = command.command_id
    );
  get diagnostics command_count = row_count;

  return jsonb_build_object(
    'ok', true,
    'moderatorAuthorizations', authorization_count,
    'outbox', outbox_count,
    'receipts', receipt_count,
    'commands', command_count
  );
end;
$$;

revoke all on function public.spinner_cleanup_expired(timestamptz) from public, anon, authenticated;
grant execute on function public.spinner_cleanup_expired(timestamptz) to service_role;

create or replace function private.spinner_invoke_reaper_dispatcher()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  dispatch_secret text;
  request_id bigint;
begin
  -- Do not spend an Edge invocation when no unclaimed delivery is ready.
  if not exists (
    select 1
    from public.spinner_discord_outbox outbox
    where outbox.phase in ('start_pending', 'result_waiting', 'result_pending')
      and outbox.next_attempt_at <= now()
      and (outbox.phase <> 'result_waiting' or outbox.reveal_after <= now())
      and (outbox.claim_token is null or outbox.claim_expires_at <= now())
  ) then
    return null;
  end if;

  select secrets.decrypted_secret into project_url
  from vault.decrypted_secrets secrets
  where secrets.name = 'project_url'
  order by secrets.updated_at desc
  limit 1;

  select secrets.decrypted_secret into dispatch_secret
  from vault.decrypted_secrets secrets
  where secrets.name = 'reaper_spinner_dispatch_secret'
  order by secrets.updated_at desc
  limit 1;

  if project_url is null
    or project_url !~ '^https://[^[:space:]]+$'
    or dispatch_secret is null
    or char_length(dispatch_secret) < 32
    or char_length(dispatch_secret) > 512
  then
    return null;
  end if;

  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/reaper-spinner-dispatch',
    body := jsonb_build_object('limit', 10),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-mochirii-reaper-spinner-secret', dispatch_secret
    ),
    timeout_milliseconds := 5000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function private.spinner_invoke_reaper_dispatcher() from public, anon, authenticated;
grant execute on function private.spinner_invoke_reaper_dispatcher() to service_role;

create or replace function private.spinner_queue_reaper_dispatcher()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- pg_net queues the request transactionally and performs network I/O after
  -- commit, so the authoritative draw response never waits on delivery.
  perform private.spinner_invoke_reaper_dispatcher();
  return null;
end;
$$;

revoke all on function private.spinner_queue_reaper_dispatcher() from public, anon, authenticated;
grant execute on function private.spinner_queue_reaper_dispatcher() to service_role;

drop trigger if exists spinner_discord_outbox_queue_dispatch on public.spinner_discord_outbox;
create trigger spinner_discord_outbox_queue_dispatch
after insert on public.spinner_discord_outbox
for each statement execute function private.spinner_queue_reaper_dispatcher();

create or replace function private.spinner_maintenance_tick()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  recovery jsonb;
  dispatcher_request_id bigint;
begin
  recovery := public.spinner_recover_commands();
  perform public.spinner_finalize_reveal();
  delete from public.spinner_moderator_authorizations where expires_at <= now();
  dispatcher_request_id := private.spinner_invoke_reaper_dispatcher();
  return jsonb_build_object(
    'ok', true,
    'recovery', recovery,
    'dispatcherQueued', dispatcher_request_id is not null
  );
end;
$$;

revoke all on function private.spinner_maintenance_tick() from public, anon, authenticated;
grant execute on function private.spinner_maintenance_tick() to service_role;

do $spinner_cron$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid from cron.job
    where jobname in ('spinner-maintenance-every-5-seconds', 'spinner-cleanup-daily')
  loop
    perform cron.unschedule(existing_job_id);
  end loop;

  perform cron.schedule(
    'spinner-maintenance-every-5-seconds',
    '5 seconds',
    $job$select private.spinner_maintenance_tick();$job$
  );
  perform cron.schedule(
    'spinner-cleanup-daily',
    '17 3 * * *',
    $job$select public.spinner_cleanup_expired();$job$
  );
end;
$spinner_cron$;

comment on table public.spinner_live_state is
  'Service-only authoritative live Mōchirīī spinner state. Participant names remain until a moderator explicitly clears or replaces the roster.';
comment on table public.spinner_draw_receipts is
  'Service-only replayable DrawReceiptV1 records retained for at least 30 days; receipts are not independently tamper-proof.';
comment on table public.spinner_discord_outbox is
  'Service-only Reaper delivery state. One row posts the live link and later edits that same Discord message with the result.';
comment on table public.spinner_moderator_authorizations is
  'Service-only cache populated only after exact moderator authority. Controller reads and commands may reuse it for no longer than five minutes before exact revalidation.';
