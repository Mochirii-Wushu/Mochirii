create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.discord_resources (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  label text not null,
  discord_id text not null,
  discord_parent_id text,
  url text,
  description text,
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_resources_kind_check
    check (
      kind in (
        'guild',
        'role',
        'text_channel',
        'voice_channel',
        'forum_channel',
        'forum_thread',
        'announcement_channel',
        'scheduled_event',
        'webhook',
        'bot',
        'external'
      )
    ),
  constraint discord_resources_kind_discord_id_key unique (kind, discord_id)
);

comment on table public.discord_resources is
  'Registry of Discord guild resources and safe deep links. Do not store bot tokens, webhook tokens, client secrets, or passwords.';

create index if not exists discord_resources_kind_idx
on public.discord_resources (kind);

create index if not exists discord_resources_enabled_idx
on public.discord_resources (enabled);

create index if not exists discord_resources_discord_id_idx
on public.discord_resources (discord_id);

do $$
begin
  if exists (
    select 1
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    drop trigger if exists set_discord_resources_updated_at on public.discord_resources;
    create trigger set_discord_resources_updated_at
    before update on public.discord_resources
    for each row
    execute function public.set_updated_at();
  else
    raise notice 'public.set_updated_at() was not found; discord_resources.updated_at will not auto-update.';
  end if;
end
$$;

create table if not exists public.discord_sync_log (
  id uuid primary key default gen_random_uuid(),
  sync_type text not null,
  resource_id uuid references public.discord_resources(id) on delete set null,
  status text not null,
  message text,
  details jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint discord_sync_log_sync_type_check
    check (
      sync_type in (
        'scheduled_events',
        'forum_threads',
        'webhook_notification',
        'slash_command',
        'role_check',
        'manual_test',
        'other'
      )
    ),
  constraint discord_sync_log_status_check
    check (
      status in (
        'pending',
        'success',
        'warning',
        'failed',
        'skipped'
      )
    )
);

comment on table public.discord_sync_log is
  'Audit log for Discord sync attempts, webhook sends, imports, and future integration jobs. Details must not contain secrets.';

create index if not exists discord_sync_log_sync_type_idx
on public.discord_sync_log (sync_type);

create index if not exists discord_sync_log_status_idx
on public.discord_sync_log (status);

create index if not exists discord_sync_log_started_at_idx
on public.discord_sync_log (started_at desc);

alter table public.discord_resources enable row level security;
alter table public.discord_sync_log enable row level security;

revoke all on table public.discord_resources from public;
revoke all on table public.discord_resources from anon;
revoke all on table public.discord_resources from authenticated;
grant all on table public.discord_resources to service_role;

revoke all on table public.discord_sync_log from public;
revoke all on table public.discord_sync_log from anon;
revoke all on table public.discord_sync_log from authenticated;
grant all on table public.discord_sync_log to service_role;

insert into public.discord_resources (
  kind,
  label,
  discord_id,
  discord_parent_id,
  enabled,
  description
)
values
  (
    'guild',
    'Mochirii Discord Server',
    '1078630751077142608',
    null,
    true,
    'Primary Mōchirīī Discord guild.'
  ),
  (
    'role',
    'Mōchirīī - WWM',
    '1468659807736299520',
    '1078630751077142608',
    true,
    'Required upload-access guild role.'
  ),
  (
    'role',
    '✅Verified',
    '1078630751077142615',
    '1078630751077142608',
    true,
    'Required upload-access verification role.'
  ),
  (
    'role',
    'Moderator',
    '1078630751165222984',
    '1078630751077142608',
    true,
    'Discord role required for gallery moderation workflows.'
  )
on conflict (kind, discord_id) do update
set
  label = excluded.label,
  discord_parent_id = excluded.discord_parent_id,
  enabled = excluded.enabled,
  description = excluded.description,
  updated_at = now();
