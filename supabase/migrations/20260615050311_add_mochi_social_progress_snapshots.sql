-- Account-linked Mochi Social alpha progress snapshots.
-- Written only by the trusted game server via Edge Functions; no real value.

create table if not exists public.mochi_social_progress_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  authority text not null default 'mochirii-edge' check (authority = 'mochirii-edge'),
  revision integer not null default 0 check (revision >= 0),
  state jsonb not null default '{}'::jsonb,
  last_request_id text,
  last_action_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mochi_social_progress_snapshots enable row level security;

create policy "mochi_social_progress_read_own"
  on public.mochi_social_progress_snapshots
  for select
  using (auth.uid() = user_id);

grant select on table public.mochi_social_progress_snapshots to authenticated;
grant all on table public.mochi_social_progress_snapshots to service_role;

create index if not exists mochi_social_progress_updated_idx
  on public.mochi_social_progress_snapshots(updated_at desc);
