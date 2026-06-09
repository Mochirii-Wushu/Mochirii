create extension if not exists pgcrypto with schema extensions;

create table if not exists public.vote_confirmations (
  id uuid primary key default gen_random_uuid(),
  discord_user_id text not null,
  discord_username text,
  vote_date date not null,
  confirmed_at timestamptz not null default now(),
  source text not null default 'discord_button',
  discord_guild_id text not null default '1078630751077142608',
  discord_channel_id text,
  discord_interaction_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint vote_confirmations_user_date_key unique (discord_user_id, vote_date),
  constraint vote_confirmations_discord_user_id_check check (discord_user_id ~ '^[0-9]{16,22}$'),
  constraint vote_confirmations_discord_ids_check check (
    (discord_channel_id is null or discord_channel_id ~ '^[0-9]{16,22}$')
    and (discord_interaction_id is null or discord_interaction_id ~ '^[0-9]{16,22}$')
  ),
  constraint vote_confirmations_source_check check (source in ('discord_button', 'slash_command')),
  constraint vote_confirmations_expected_guild_check check (discord_guild_id = '1078630751077142608')
);

comment on table public.vote_confirmations is
  'Manual daily vote confirmations recorded after members click Done voting. This table must not store third-party credentials, vote-site sessions, or automated vote results.';

create index if not exists vote_confirmations_vote_date_idx
on public.vote_confirmations (vote_date desc);

create index if not exists vote_confirmations_user_date_idx
on public.vote_confirmations (discord_user_id, vote_date desc);

create table if not exists public.vote_reminder_sends (
  id uuid primary key default gen_random_uuid(),
  vote_date date not null,
  discord_guild_id text not null,
  discord_channel_id text not null,
  discord_message_id text,
  link_count integer not null default 0,
  status text not null default 'pending',
  message text,
  details jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint vote_reminder_sends_link_count_check check (link_count >= 0 and link_count <= 20),
  constraint vote_reminder_sends_status_check check (status in ('pending', 'preview', 'sent', 'skipped', 'failed')),
  constraint vote_reminder_sends_expected_guild_check check (discord_guild_id = '1078630751077142608'),
  constraint vote_reminder_sends_expected_channel_check check (discord_channel_id = '1082802012095266866'),
  constraint vote_reminder_sends_discord_message_id_check check (
    discord_message_id is null
    or discord_message_id ~ '^[0-9]{16,22}$'
  )
);

comment on table public.vote_reminder_sends is
  'Audit log for manual vote reminder sends. Rows track reminder delivery only; no third-party voting action is automated or asserted.';

create unique index if not exists vote_reminder_sends_once_per_date_channel_idx
on public.vote_reminder_sends (vote_date, discord_channel_id)
where status in ('pending', 'sent');

create index if not exists vote_reminder_sends_status_created_idx
on public.vote_reminder_sends (status, created_at desc);

create or replace view public.vote_confirmation_daily_counts as
select
  vote_date,
  count(*)::integer as confirmation_count,
  min(confirmed_at) as first_confirmed_at,
  max(confirmed_at) as last_confirmed_at
from public.vote_confirmations
group by vote_date;

alter table public.vote_confirmations enable row level security;
alter table public.vote_reminder_sends enable row level security;

revoke all on table public.vote_confirmations from public;
revoke all on table public.vote_confirmations from anon;
revoke all on table public.vote_confirmations from authenticated;
grant all on table public.vote_confirmations to service_role;

revoke all on table public.vote_reminder_sends from public;
revoke all on table public.vote_reminder_sends from anon;
revoke all on table public.vote_reminder_sends from authenticated;
grant all on table public.vote_reminder_sends to service_role;

revoke all on table public.vote_confirmation_daily_counts from public;
revoke all on table public.vote_confirmation_daily_counts from anon;
revoke all on table public.vote_confirmation_daily_counts from authenticated;
grant select on table public.vote_confirmation_daily_counts to service_role;

insert into public.discord_resources (
  kind,
  label,
  discord_id,
  discord_parent_id,
  url,
  enabled,
  description,
  metadata
)
values (
  'text_channel',
  'Daily Vote Reminders',
  '1082802012095266866',
  '1078630751077142608',
  'https://discord.com/channels/1078630751077142608/1082802012095266866',
  true,
  'Channel for manual daily vote reminders and Done voting confirmations.',
  jsonb_build_object(
    'managedBy', 'manual-vote-reminder',
    'automationBoundary', 'manual reminder only',
    'noAutomatedVoting', true
  )
)
on conflict (kind, discord_id) do update
set
  label = excluded.label,
  discord_parent_id = excluded.discord_parent_id,
  url = excluded.url,
  enabled = excluded.enabled,
  description = excluded.description,
  metadata = excluded.metadata,
  updated_at = now();
