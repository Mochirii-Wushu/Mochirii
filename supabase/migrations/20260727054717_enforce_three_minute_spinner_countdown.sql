-- Keep the v1 command and receipt contracts unchanged while replacing the
-- released two-second lead with the authoritative three-minute countdown.
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
      or started_at_value <> receipt_timestamp_value + interval '3 minutes'
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
