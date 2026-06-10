create extension if not exists pgcrypto with schema extensions;

create table if not exists public.spotlight_poll_cycles (
  id uuid primary key default gen_random_uuid(),
  cycle_month date not null,
  poll_date date not null,
  vote_open_at timestamptz not null,
  vote_close_at timestamptz not null,
  status text not null default 'pending',
  discord_guild_id text not null default '1078630751077142608',
  discord_channel_id text not null,
  discord_message_id text,
  poll_question text not null,
  winner_profile_id uuid references public.member_profiles(id) on delete set null,
  winner_discord_user_id text,
  winner_answer_id integer,
  winner_display_name text,
  tie_breaker text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  finalized_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spotlight_poll_cycles_cycle_month_first_day_check check (extract(day from cycle_month) = 1),
  constraint spotlight_poll_cycles_status_check check (status in ('pending', 'open', 'closed', 'published', 'void', 'failed')),
  constraint spotlight_poll_cycles_expected_guild_check check (discord_guild_id = '1078630751077142608'),
  constraint spotlight_poll_cycles_discord_ids_check check (
    discord_channel_id ~ '^[0-9]{16,22}$'
    and (discord_message_id is null or discord_message_id ~ '^[0-9]{16,22}$')
    and (winner_discord_user_id is null or winner_discord_user_id ~ '^[0-9]{16,22}$')
  ),
  constraint spotlight_poll_cycles_vote_window_check check (vote_close_at > vote_open_at),
  constraint spotlight_poll_cycles_question_check check (char_length(poll_question) between 1 and 300),
  constraint spotlight_poll_cycles_winner_name_check check (winner_display_name is null or char_length(winner_display_name) between 1 and 120),
  constraint spotlight_poll_cycles_cycle_month_key unique (cycle_month)
);

comment on table public.spotlight_poll_cycles is
  'Server-owned Discord native poll cycles for monthly member spotlight. Browser clients receive only public-safe winner names through an Edge Function.';

create index if not exists spotlight_poll_cycles_status_close_idx
on public.spotlight_poll_cycles (status, vote_close_at);

create index if not exists spotlight_poll_cycles_published_idx
on public.spotlight_poll_cycles (cycle_month desc)
where status = 'published' and winner_display_name is not null;

create table if not exists public.spotlight_poll_candidates (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.spotlight_poll_cycles(id) on delete cascade,
  member_profile_id uuid not null references public.member_profiles(id) on delete cascade,
  discord_user_id text not null,
  display_name text not null,
  answer_label text not null,
  answer_id integer,
  candidate_order integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint spotlight_poll_candidates_user_check check (discord_user_id ~ '^[0-9]{16,22}$'),
  constraint spotlight_poll_candidates_answer_label_check check (char_length(answer_label) between 1 and 55),
  constraint spotlight_poll_candidates_display_name_check check (char_length(display_name) between 1 and 120),
  constraint spotlight_poll_candidates_answer_id_check check (answer_id is null or answer_id > 0),
  constraint spotlight_poll_candidates_order_check check (candidate_order between 1 and 10),
  constraint spotlight_poll_candidates_member_key unique (cycle_id, member_profile_id),
  constraint spotlight_poll_candidates_user_key unique (cycle_id, discord_user_id),
  constraint spotlight_poll_candidates_order_key unique (cycle_id, candidate_order),
  constraint spotlight_poll_candidates_answer_key unique (cycle_id, answer_id)
);

comment on table public.spotlight_poll_candidates is
  'Snapshot of up to 10 eligible website members selected for a native Discord spotlight poll cycle.';

create index if not exists spotlight_poll_candidates_cycle_idx
on public.spotlight_poll_candidates (cycle_id, candidate_order);

create table if not exists public.spotlight_poll_results (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.spotlight_poll_cycles(id) on delete cascade,
  answer_id integer not null,
  member_profile_id uuid references public.member_profiles(id) on delete set null,
  discord_user_id text,
  vote_count integer not null default 0,
  voter_count_verified integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spotlight_poll_results_answer_id_check check (answer_id > 0),
  constraint spotlight_poll_results_vote_count_check check (vote_count >= 0),
  constraint spotlight_poll_results_verified_count_check check (voter_count_verified is null or voter_count_verified >= 0),
  constraint spotlight_poll_results_discord_user_check check (discord_user_id is null or discord_user_id ~ '^[0-9]{16,22}$'),
  constraint spotlight_poll_results_answer_key unique (cycle_id, answer_id)
);

comment on table public.spotlight_poll_results is
  'Private Discord poll result audit rows. Vote counts are server-owned and are not exposed through public website payloads.';

create index if not exists spotlight_poll_results_cycle_idx
on public.spotlight_poll_results (cycle_id, vote_count desc);

alter table public.spotlight_poll_cycles enable row level security;
alter table public.spotlight_poll_candidates enable row level security;
alter table public.spotlight_poll_results enable row level security;

revoke all on table public.spotlight_poll_cycles from public;
revoke all on table public.spotlight_poll_cycles from anon;
revoke all on table public.spotlight_poll_cycles from authenticated;
grant all on table public.spotlight_poll_cycles to service_role;

revoke all on table public.spotlight_poll_candidates from public;
revoke all on table public.spotlight_poll_candidates from anon;
revoke all on table public.spotlight_poll_candidates from authenticated;
grant all on table public.spotlight_poll_candidates to service_role;

revoke all on table public.spotlight_poll_results from public;
revoke all on table public.spotlight_poll_results from anon;
revoke all on table public.spotlight_poll_results from authenticated;
grant all on table public.spotlight_poll_results to service_role;
