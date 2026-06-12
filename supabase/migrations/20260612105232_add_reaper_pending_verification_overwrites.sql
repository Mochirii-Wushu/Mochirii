create extension if not exists pgcrypto with schema extensions;

create table if not exists public.discord_managed_permission_overwrites (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  channel_id text not null,
  discord_user_id text not null,
  managed_by text not null,
  owned_allow text not null default '0',
  owned_deny text not null default '0',
  active boolean not null default true,
  applied_at timestamptz,
  cleared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_managed_permission_overwrites_snowflake_check
    check (
      guild_id ~ '^[0-9]{16,22}$'
      and channel_id ~ '^[0-9]{16,22}$'
      and discord_user_id ~ '^[0-9]{16,22}$'
    ),
  constraint discord_managed_permission_overwrites_managed_by_check
    check (managed_by ~ '^[a-z0-9][a-z0-9_-]{2,80}$'),
  constraint discord_managed_permission_overwrites_allow_check
    check (owned_allow ~ '^[0-9]+$'),
  constraint discord_managed_permission_overwrites_deny_check
    check (owned_deny ~ '^[0-9]+$'),
  constraint discord_managed_permission_overwrites_unique_owner
    unique (guild_id, channel_id, discord_user_id, managed_by)
);

comment on table public.discord_managed_permission_overwrites is
  'Service-role-only registry of Reaper-owned Discord permission overwrite bits. Stores IDs and owned allow/deny bitfields only; never store Discord tokens, webhook URLs, message content, or interaction tokens.';

comment on column public.discord_managed_permission_overwrites.owned_allow is
  'Decimal string bitfield for permission allow bits owned by the managed_by service.';

comment on column public.discord_managed_permission_overwrites.owned_deny is
  'Decimal string bitfield for permission deny bits owned by the managed_by service.';

create index if not exists discord_managed_permission_overwrites_guild_idx
on public.discord_managed_permission_overwrites (guild_id);

create index if not exists discord_managed_permission_overwrites_channel_idx
on public.discord_managed_permission_overwrites (channel_id);

create index if not exists discord_managed_permission_overwrites_user_idx
on public.discord_managed_permission_overwrites (discord_user_id);

create index if not exists discord_managed_permission_overwrites_active_idx
on public.discord_managed_permission_overwrites (managed_by, active);

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
    drop trigger if exists set_discord_managed_permission_overwrites_updated_at
      on public.discord_managed_permission_overwrites;
    create trigger set_discord_managed_permission_overwrites_updated_at
    before update on public.discord_managed_permission_overwrites
    for each row
    execute function public.set_updated_at();
  else
    raise notice 'public.set_updated_at() was not found; discord_managed_permission_overwrites.updated_at will not auto-update.';
  end if;
end
$$;

alter table public.discord_managed_permission_overwrites enable row level security;

revoke all on table public.discord_managed_permission_overwrites from public;
revoke all on table public.discord_managed_permission_overwrites from anon;
revoke all on table public.discord_managed_permission_overwrites from authenticated;
grant all on table public.discord_managed_permission_overwrites to service_role;
