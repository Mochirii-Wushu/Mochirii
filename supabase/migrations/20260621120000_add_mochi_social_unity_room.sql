-- Mochi Social Unity shared-room authority mirrors.
-- UGS remains the primary runtime save authority; Supabase stores member mapping
-- and audit mirrors for Mochirii moderation and alpha review.

create table if not exists public.mochi_social_unity_players (
  user_id uuid primary key references auth.users(id) on delete cascade,
  unity_player_id text not null unique,
  custom_id text not null unique,
  room_key text not null default 'jade-lantern-room-alpha',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(unity_player_id) between 1 and 160),
  check (custom_id like 'mochirii:%'),
  check (room_key = 'jade-lantern-room-alpha')
);

create table if not exists public.mochi_social_shared_pet_snapshots (
  pet_key text primary key,
  room_key text not null default 'jade-lantern-room-alpha',
  revision integer not null default 0 check (revision >= 0),
  state jsonb not null default '{}'::jsonb,
  source_request_id text,
  last_actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (pet_key = 'lirabao'),
  check (room_key = 'jade-lantern-room-alpha'),
  check (jsonb_typeof(state) = 'object')
);

alter table public.mochi_social_unity_players enable row level security;
alter table public.mochi_social_shared_pet_snapshots enable row level security;

grant select on public.mochi_social_unity_players to authenticated;
grant select on public.mochi_social_shared_pet_snapshots to authenticated;
grant select, insert, update, delete on public.mochi_social_unity_players to service_role;
grant select, insert, update, delete on public.mochi_social_shared_pet_snapshots to service_role;

drop policy if exists mochi_social_unity_players_read_own on public.mochi_social_unity_players;
create policy mochi_social_unity_players_read_own
on public.mochi_social_unity_players
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists mochi_social_shared_pet_read_authenticated on public.mochi_social_shared_pet_snapshots;
create policy mochi_social_shared_pet_read_authenticated
on public.mochi_social_shared_pet_snapshots
for select
to authenticated
using (true);

create index if not exists mochi_social_unity_players_updated_idx
on public.mochi_social_unity_players(updated_at desc);

create index if not exists mochi_social_shared_pet_updated_idx
on public.mochi_social_shared_pet_snapshots(updated_at desc);
