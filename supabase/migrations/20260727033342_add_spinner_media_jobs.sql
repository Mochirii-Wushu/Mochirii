-- Additive, service-only media delivery for private live raffle draws.
-- The existing start/result outbox remains authoritative. Media jobs never
-- block, roll back, or alter that delivery state.

create table if not exists public.spinner_media_jobs (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null unique references public.spinner_draw_receipts(draw_id) on delete restrict,
  outbox_id uuid not null unique references public.spinner_discord_outbox(id) on delete restrict,
  status text not null default 'pending',
  animation_manifest jsonb not null,
  manifest_hash_sha256 text not null,
  reveal_after timestamptz not null,
  fallback_after timestamptz not null,
  capability_token_hash_sha256 text,
  capability_expires_at timestamptz,
  manifest_authorization_count integer not null default 0,
  dispatch_attempt_count integer not null default 0,
  render_attempt_count integer not null default 0,
  attachment_attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  claim_token uuid,
  claim_expires_at timestamptz,
  media_type text,
  media_size_bytes integer,
  media_sha256 text,
  media_filename text,
  discord_attachment_id text,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  constraint spinner_media_jobs_status_check check (
    status in ('pending', 'dispatching', 'awaiting_media', 'attaching', 'attached', 'failed')
  ),
  constraint spinner_media_jobs_manifest_hash_check check (manifest_hash_sha256 ~ '^[0-9a-f]{64}$'),
  constraint spinner_media_jobs_manifest_shape_check check (
    jsonb_typeof(animation_manifest) = 'object'
    and animation_manifest ? 'participants'
    and coalesce(animation_manifest #>> '{version}', '') = '1'
    and coalesce(animation_manifest #>> '{styleVersion}', '') = 'mochirii-raffle-film-v1'
    and coalesce(animation_manifest #>> '{width}', '') = '1280'
    and coalesce(animation_manifest #>> '{height}', '') = '720'
    and coalesce(animation_manifest #>> '{durationMs}', '') = '10600'
    and jsonb_typeof(animation_manifest -> 'participants') = 'array'
    and jsonb_array_length(animation_manifest -> 'participants') between 2 and 100
    and not jsonb_path_exists(animation_manifest, '$.participants[*].id')
    and not jsonb_path_exists(animation_manifest, '$.participants[*].displayName')
  ),
  constraint spinner_media_jobs_timing_check check (
    fallback_after = reveal_after + interval '60 seconds'
  ),
  constraint spinner_media_jobs_token_check check (
    (capability_token_hash_sha256 is null and capability_expires_at is null)
    or
    (capability_token_hash_sha256 ~ '^[0-9a-f]{64}$' and capability_expires_at > reveal_after)
  ),
  constraint spinner_media_jobs_attachment_id_check check (
    discord_attachment_id is null or discord_attachment_id ~ '^[0-9]{16,22}$'
  ),
  constraint spinner_media_jobs_attempts_check check (
    manifest_authorization_count between 0 and 20
    and dispatch_attempt_count between 0 and 8
    and render_attempt_count between 0 and 12
    and attachment_attempt_count between 0 and 20
  ),
  constraint spinner_media_jobs_media_check check (
    (media_type is null and media_size_bytes is null and media_sha256 is null and media_filename is null)
    or
    (
      media_type in ('image/png', 'video/mp4')
      and media_size_bytes between 1 and case when media_type = 'image/png' then 3000000 else 4250000 end
      and media_sha256 ~ '^[0-9a-f]{64}$'
      and media_filename ~ '^mochirii-raffle-[0-9a-f-]{36}\.(png|mp4)$'
      and (
        (media_type = 'image/png' and media_filename like '%.png')
        or (media_type = 'video/mp4' and media_filename like '%.mp4')
      )
    )
  ),
  constraint spinner_media_jobs_retention_check check (expires_at >= created_at + interval '30 days')
);

create index if not exists spinner_media_jobs_dispatch_ready_idx
on public.spinner_media_jobs (status, next_attempt_at, created_at)
where status in ('pending', 'dispatching');

create index if not exists spinner_media_jobs_fallback_ready_idx
on public.spinner_media_jobs (fallback_after, next_attempt_at)
where status in ('awaiting_media', 'attaching');

create index if not exists spinner_media_jobs_expires_at_idx
on public.spinner_media_jobs (expires_at);

alter table public.spinner_media_jobs enable row level security;
revoke all on table public.spinner_media_jobs from public, anon, authenticated;
grant all on table public.spinner_media_jobs to service_role;

drop policy if exists service_only_default_deny on public.spinner_media_jobs;
create policy service_only_default_deny on public.spinner_media_jobs
as restrictive for all to anon, authenticated
using (false) with check (false);

create or replace function private.spinner_create_media_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  staged jsonb;
  manifest jsonb;
  manifest_hash text;
begin
  begin
    select command.staged_payload into staged
    from public.spinner_draw_receipts receipt
    join public.spinner_commands command on command.command_id = receipt.command_id
    where receipt.draw_id = new.draw_id;

    manifest := staged -> 'animationManifest';
    manifest_hash := staged ->> 'animationManifestHashSha256';

    -- Additive rollout safety: draws staged by the prior function version retain
    -- their normal live and message delivery without receiving a media job.
    if manifest is null or manifest_hash is null then return new; end if;

    if jsonb_typeof(manifest) <> 'object'
      or manifest ->> 'drawId' is distinct from new.draw_id::text
      or manifest ->> 'revealAt' is distinct from to_char(new.reveal_after at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      or manifest_hash !~ '^[0-9a-f]{64}$'
    then
      raise exception 'invalid media manifest';
    end if;

    insert into public.spinner_media_jobs (
      draw_id,
      outbox_id,
      animation_manifest,
      manifest_hash_sha256,
      reveal_after,
      fallback_after
    ) values (
      new.draw_id,
      new.id,
      manifest,
      manifest_hash,
      new.reveal_after,
      new.reveal_after + interval '60 seconds'
    );
  exception when others then
    -- Media is optional. Never roll back the authoritative draw or its primary
    -- start/result message. The warning intentionally contains no roster data.
    raise warning 'Spinner media job was skipped.';
  end;
  return new;
end;
$$;

revoke all on function private.spinner_create_media_job() from public, anon, authenticated;
grant execute on function private.spinner_create_media_job() to service_role;

drop trigger if exists spinner_discord_outbox_create_media_job on public.spinner_discord_outbox;
create trigger spinner_discord_outbox_create_media_job
after insert on public.spinner_discord_outbox
for each row execute function private.spinner_create_media_job();

create or replace function private.spinner_media_manifest_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.expires_at > now() then
      raise exception 'Spinner media jobs must be retained for 30 days.' using errcode = '55000';
    end if;
    return old;
  end if;
  if new.draw_id <> old.draw_id
    or new.outbox_id <> old.outbox_id
    or new.animation_manifest <> old.animation_manifest
    or new.manifest_hash_sha256 <> old.manifest_hash_sha256
    or new.reveal_after <> old.reveal_after
    or new.fallback_after <> old.fallback_after
    or new.created_at <> old.created_at
    or new.expires_at <> old.expires_at
  then
    raise exception 'Spinner media manifest is immutable.' using errcode = '55000';
  end if;
  return new;
end;
$$;

revoke all on function private.spinner_media_manifest_immutable() from public, anon, authenticated;
grant execute on function private.spinner_media_manifest_immutable() to service_role;

drop trigger if exists spinner_media_jobs_manifest_immutable on public.spinner_media_jobs;
create trigger spinner_media_jobs_manifest_immutable
before update or delete on public.spinner_media_jobs
for each row execute function private.spinner_media_manifest_immutable();

create or replace function public.spinner_claim_media_jobs(
  p_claim_token uuid,
  p_mode text,
  p_limit integer default 5
)
returns setof public.spinner_media_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit < 1 or p_limit > 5 or p_mode not in ('dispatch', 'fallback') then
    raise exception 'Spinner media claim is invalid.' using errcode = '22023';
  end if;

  update public.spinner_media_jobs job
  set status = 'failed',
    claim_token = null,
    claim_expires_at = null,
    last_error_code = 'media_dispatch_exhausted',
    updated_at = now()
  where p_mode = 'dispatch'
    and job.status in ('pending', 'dispatching')
    and job.dispatch_attempt_count >= 8
    and (job.claim_token is null or job.claim_expires_at <= now());

  update public.spinner_media_jobs job
  set status = 'failed',
    claim_token = null,
    claim_expires_at = null,
    last_error_code = 'media_render_exhausted',
    updated_at = now()
  where p_mode = 'fallback'
    and job.status in ('awaiting_media', 'attaching')
    and job.render_attempt_count >= 12
    and (job.claim_token is null or job.claim_expires_at <= now());

  return query
  with ready as (
    select job.id
    from public.spinner_media_jobs job
    join public.spinner_discord_outbox outbox on outbox.id = job.outbox_id
    where job.next_attempt_at <= now()
      and (job.claim_token is null or job.claim_expires_at <= now())
      and (
        (p_mode = 'dispatch' and job.status in ('pending', 'dispatching')
          and job.dispatch_attempt_count < 8 and outbox.phase = 'completed')
        or
        (p_mode = 'fallback' and job.status in ('awaiting_media', 'attaching')
          and job.fallback_after <= now()
          and outbox.phase = 'completed'
          and job.render_attempt_count < 12
          and job.attachment_attempt_count < 20)
      )
    order by job.created_at asc
    for update of job skip locked
    limit p_limit
  )
  update public.spinner_media_jobs job
  set status = case when p_mode = 'dispatch' then 'dispatching' else 'awaiting_media' end,
    claim_token = p_claim_token,
    claim_expires_at = now() + interval '60 seconds',
    dispatch_attempt_count = job.dispatch_attempt_count + case when p_mode = 'dispatch' then 1 else 0 end,
    render_attempt_count = job.render_attempt_count + case when p_mode = 'fallback' then 1 else 0 end,
    updated_at = now()
  from ready
  where job.id = ready.id
  returning job.*;
end;
$$;

revoke all on function public.spinner_claim_media_jobs(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.spinner_claim_media_jobs(uuid, text, integer) to service_role;

create or replace function public.spinner_bind_media_capability(
  p_id uuid,
  p_claim_token uuid,
  p_token_hash_sha256 text,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_token_hash_sha256 !~ '^[0-9a-f]{64}$'
    or p_expires_at <= now()
    or p_expires_at > now() + interval '20 minutes'
  then return false; end if;

  update public.spinner_media_jobs
  set status = 'awaiting_media',
    capability_token_hash_sha256 = p_token_hash_sha256,
    capability_expires_at = p_expires_at,
    claim_token = null,
    claim_expires_at = null,
    last_error_code = null,
    updated_at = now()
  where id = p_id
    and status in ('dispatching', 'awaiting_media')
    and claim_token = p_claim_token
    and manifest_hash_sha256 ~ '^[0-9a-f]{64}$';
  return found;
end;
$$;

revoke all on function public.spinner_bind_media_capability(uuid, uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.spinner_bind_media_capability(uuid, uuid, text, timestamptz) to service_role;

create or replace function public.spinner_authorize_media_manifest(
  p_id uuid,
  p_token_hash_sha256 text
)
returns table (
  animation_manifest jsonb,
  manifest_hash_sha256 text,
  reveal_after timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  job public.spinner_media_jobs%rowtype;
begin
  select * into job
  from public.spinner_media_jobs
  where id = p_id
  for update;

  if not found
    or job.status not in ('awaiting_media', 'attaching')
    or job.capability_token_hash_sha256 is distinct from p_token_hash_sha256
    or job.capability_expires_at <= now()
    or job.manifest_authorization_count >= 20
  then return; end if;

  update public.spinner_media_jobs
  set manifest_authorization_count = manifest_authorization_count + 1,
    updated_at = now()
  where id = p_id;

  return query select job.animation_manifest, job.manifest_hash_sha256, job.reveal_after;
end;
$$;

revoke all on function public.spinner_authorize_media_manifest(uuid, text) from public, anon, authenticated;
grant execute on function public.spinner_authorize_media_manifest(uuid, text) to service_role;

create or replace function public.spinner_reserve_media_attachment(
  p_id uuid,
  p_token_hash_sha256 text,
  p_claim_token uuid,
  p_media_type text,
  p_size_bytes integer,
  p_media_sha256 text,
  p_filename text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  job public.spinner_media_jobs%rowtype;
  outbox public.spinner_discord_outbox%rowtype;
begin
  select * into job from public.spinner_media_jobs where id = p_id for update;
  if not found
    or job.capability_token_hash_sha256 is distinct from p_token_hash_sha256
    or job.capability_expires_at <= now()
  then return jsonb_build_object('ok', false); end if;

  if job.status = 'attached' then
    return jsonb_build_object(
      'ok', true,
      'alreadyAttached', true,
      'filename', job.media_filename,
      'sha256', job.media_sha256
    );
  end if;

  select * into outbox from public.spinner_discord_outbox where id = job.outbox_id;
  if outbox.phase <> 'completed'
    or outbox.discord_message_id is null
    or outbox.discord_message_id !~ '^[0-9]{16,22}$'
    or now() < job.reveal_after
    or job.status not in ('awaiting_media', 'attaching')
    or (job.claim_token is not null and job.claim_expires_at > now() and job.claim_token <> p_claim_token)
    or p_media_type not in ('image/png', 'video/mp4')
    or p_size_bytes < 1
    or p_size_bytes > (case when p_media_type = 'image/png' then 3000000 else 4250000 end)
    or p_media_sha256 !~ '^[0-9a-f]{64}$'
    or p_filename !~ ('^mochirii-raffle-' || job.draw_id::text || '\.(png|mp4)$')
    or (p_media_type = 'image/png' and p_filename not like '%.png')
    or (p_media_type = 'video/mp4' and p_filename not like '%.mp4')
  then return jsonb_build_object('ok', false); end if;

  update public.spinner_media_jobs
  set status = 'attaching',
    claim_token = p_claim_token,
    claim_expires_at = now() + interval '60 seconds',
    attachment_attempt_count = attachment_attempt_count + 1,
    media_type = p_media_type,
    media_size_bytes = p_size_bytes,
    media_sha256 = p_media_sha256,
    media_filename = p_filename,
    updated_at = now()
  where id = p_id;

  return jsonb_build_object(
    'ok', true,
    'alreadyAttached', false,
    'channelId', outbox.channel_id,
    'messageId', outbox.discord_message_id,
    'drawId', job.draw_id
  );
end;
$$;

revoke all on function public.spinner_reserve_media_attachment(uuid, text, uuid, text, integer, text, text) from public, anon, authenticated;
grant execute on function public.spinner_reserve_media_attachment(uuid, text, uuid, text, integer, text, text) to service_role;

create or replace function public.spinner_finish_media_attachment(
  p_id uuid,
  p_claim_token uuid,
  p_outcome text,
  p_attachment_id text default null,
  p_error_code text default null,
  p_retry_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  job public.spinner_media_jobs%rowtype;
begin
  select * into job
  from public.spinner_media_jobs
  where id = p_id and claim_token = p_claim_token
  for update;
  if not found then return false; end if;

  if p_outcome = 'attached'
    and job.status = 'attaching'
    and p_attachment_id ~ '^[0-9]{16,22}$'
  then
    update public.spinner_media_jobs
    set status = 'attached',
      discord_attachment_id = left(nullif(p_attachment_id, ''), 64),
      completed_at = now(),
      claim_token = null,
      claim_expires_at = null,
      last_error_code = null,
      updated_at = now()
    where id = p_id;
    return true;
  end if;

  if p_outcome = 'retry' and job.attachment_attempt_count < 20
    and p_retry_at is not null and p_retry_at > now()
  then
    update public.spinner_media_jobs
    set status = 'awaiting_media',
      next_attempt_at = p_retry_at,
      claim_token = null,
      claim_expires_at = null,
      last_error_code = left(coalesce(p_error_code, 'media_attachment_failed'), 100),
      updated_at = now()
    where id = p_id;
    return true;
  end if;

  update public.spinner_media_jobs
  set status = 'failed',
    claim_token = null,
    claim_expires_at = null,
    last_error_code = left(coalesce(p_error_code, 'media_attachment_failed'), 100),
    updated_at = now()
  where id = p_id;
  return true;
end;
$$;

revoke all on function public.spinner_finish_media_attachment(uuid, uuid, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.spinner_finish_media_attachment(uuid, uuid, text, text, text, timestamptz) to service_role;

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
  media_count integer;
  outbox_count integer;
  receipt_count integer;
  command_count integer;
begin
  delete from public.spinner_moderator_authorizations where expires_at <= cleanup_at;
  get diagnostics authorization_count = row_count;
  delete from public.spinner_media_jobs where expires_at <= cleanup_at;
  get diagnostics media_count = row_count;
  delete from public.spinner_discord_outbox where expires_at <= cleanup_at;
  get diagnostics outbox_count = row_count;
  delete from public.spinner_draw_receipts where expires_at <= cleanup_at;
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
    'mediaJobs', media_count,
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
  if not exists (
    select 1 from public.spinner_discord_outbox outbox
    where outbox.phase in ('start_pending', 'result_waiting', 'result_pending')
      and outbox.next_attempt_at <= now()
      and (outbox.phase <> 'result_waiting' or outbox.reveal_after <= now())
      and (outbox.claim_token is null or outbox.claim_expires_at <= now())
    union all
    select 1 from public.spinner_media_jobs job
    join public.spinner_discord_outbox outbox on outbox.id = job.outbox_id
    where job.next_attempt_at <= now()
      and (job.claim_token is null or job.claim_expires_at <= now())
      and (
        (job.status in ('pending', 'dispatching') and outbox.phase = 'completed')
        or (job.status in ('awaiting_media', 'attaching') and job.fallback_after <= now() and outbox.phase = 'completed')
      )
  ) then return null; end if;

  select secrets.decrypted_secret into project_url
  from vault.decrypted_secrets secrets
  where secrets.name = 'project_url'
  order by secrets.updated_at desc limit 1;
  select secrets.decrypted_secret into dispatch_secret
  from vault.decrypted_secrets secrets
  where secrets.name = 'reaper_spinner_dispatch_secret'
  order by secrets.updated_at desc limit 1;

  if project_url is null or project_url !~ '^https://[^[:space:]]+$'
    or dispatch_secret is null or char_length(dispatch_secret) < 32 or char_length(dispatch_secret) > 512
  then return null; end if;

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
