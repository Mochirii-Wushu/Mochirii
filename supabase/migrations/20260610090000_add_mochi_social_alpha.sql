-- Mochi Social closed alpha tables.
-- Alpha posture: no real value, Enjin Canary only, curated assets only.

create table if not exists public.mochi_social_alpha_testers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked', 'invited')),
  notes text,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mochi_social_terms_acknowledgements (
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  acknowledged_at timestamptz not null default now(),
  user_agent text,
  primary key (user_id, terms_version)
);

create table if not exists public.mochi_social_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  managed_wallet_external_id text unique,
  test_currency integer not null default 100 check (test_currency >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mochi_social_spirits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  spirit_id text not null check (spirit_id in ('lirabao', 'jintari', 'aozhen')),
  nickname text,
  bond integer not null default 1 check (bond between 0 and 5),
  growth_stage text not null default 'seed' check (growth_stage in ('seed', 'sprout', 'glow')),
  journal jsonb not null default '{}'::jsonb,
  care jsonb not null default '{}'::jsonb,
  certificate_eligible boolean not null default false,
  tradeable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, spirit_id)
);

create table if not exists public.mochi_social_inventory (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  quantity integer not null default 1 check (quantity > 0),
  location text not null default 'hot' check (location in ('hot', 'cold_pending', 'cold')),
  tradeable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mochi_social_market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  inventory_id uuid references public.mochi_social_inventory(id) on delete set null,
  item_id text not null,
  price_soft integer not null check (price_soft > 0),
  status text not null default 'active' check (status in ('active', 'filled', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mochi_social_trades (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid references auth.users(id) on delete set null,
  offered jsonb not null default '[]'::jsonb,
  requested jsonb not null default '[]'::jsonb,
  status text not null default 'offered' check (status in ('offered', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mochi_social_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  room text not null default 'town',
  message text not null check (char_length(message) <= 500),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days')
);

create table if not exists public.mochi_social_chat_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid references public.mochi_social_chat_messages(id) on delete set null,
  reason text not null check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.mochi_social_chain_operations (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  operation_type text not null,
  network text not null default 'CANARY' check (network = 'CANARY'),
  status text not null default 'pending' check (status in ('pending', 'broadcast', 'finalized', 'failed', 'abandoned', 'timeout')),
  enjin_transaction_uuid text,
  enjin_listing_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);

create table if not exists public.mochi_social_ledger_events (
  id bigserial primary key,
  request_id text,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id text,
  delta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.mochi_social_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'general',
  message text not null check (char_length(message) between 1 and 2000),
  session_id text,
  created_at timestamptz not null default now()
);

alter table public.mochi_social_alpha_testers enable row level security;
alter table public.mochi_social_terms_acknowledgements enable row level security;
alter table public.mochi_social_profiles enable row level security;
alter table public.mochi_social_spirits enable row level security;
alter table public.mochi_social_inventory enable row level security;
alter table public.mochi_social_market_listings enable row level security;
alter table public.mochi_social_trades enable row level security;
alter table public.mochi_social_chat_messages enable row level security;
alter table public.mochi_social_chat_reports enable row level security;
alter table public.mochi_social_chain_operations enable row level security;
alter table public.mochi_social_ledger_events enable row level security;
alter table public.mochi_social_feedback enable row level security;

create policy "mochi_social_alpha_testers_read_own" on public.mochi_social_alpha_testers for select using (auth.uid() = user_id);
create policy "mochi_social_terms_read_own" on public.mochi_social_terms_acknowledgements for select using (auth.uid() = user_id);
create policy "mochi_social_profiles_manage_own" on public.mochi_social_profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "mochi_social_spirits_read_own" on public.mochi_social_spirits for select using (auth.uid() = owner_id);
create policy "mochi_social_inventory_read_own" on public.mochi_social_inventory for select using (auth.uid() = owner_id);
create policy "mochi_social_market_read_active" on public.mochi_social_market_listings for select using (status = 'active' or auth.uid() = seller_id);
create policy "mochi_social_trades_read_participant" on public.mochi_social_trades for select using (auth.uid() = requester_id or auth.uid() = recipient_id);
create policy "mochi_social_chat_read_authenticated" on public.mochi_social_chat_messages for select using (auth.role() = 'authenticated' and expires_at > now());
create policy "mochi_social_chat_reports_insert_own" on public.mochi_social_chat_reports for insert with check (auth.uid() = reporter_id);
create policy "mochi_social_chain_operations_read_own" on public.mochi_social_chain_operations for select using (auth.uid() = user_id);
create policy "mochi_social_ledger_read_own" on public.mochi_social_ledger_events for select using (auth.uid() = actor_id);
create policy "mochi_social_feedback_insert_own" on public.mochi_social_feedback for insert with check (auth.uid() = user_id);

grant select on table public.mochi_social_alpha_testers to authenticated;
grant select on table public.mochi_social_terms_acknowledgements to authenticated;
grant select, insert, update on table public.mochi_social_profiles to authenticated;
grant select on table public.mochi_social_spirits to authenticated;
grant select on table public.mochi_social_inventory to authenticated;
grant select on table public.mochi_social_market_listings to authenticated;
grant select on table public.mochi_social_trades to authenticated;
grant select on table public.mochi_social_chat_messages to authenticated;
grant insert on table public.mochi_social_chat_reports to authenticated;
grant select on table public.mochi_social_chain_operations to authenticated;
grant select on table public.mochi_social_ledger_events to authenticated;
grant insert on table public.mochi_social_feedback to authenticated;

grant all on table public.mochi_social_alpha_testers to service_role;
grant all on table public.mochi_social_terms_acknowledgements to service_role;
grant all on table public.mochi_social_profiles to service_role;
grant all on table public.mochi_social_spirits to service_role;
grant all on table public.mochi_social_inventory to service_role;
grant all on table public.mochi_social_market_listings to service_role;
grant all on table public.mochi_social_trades to service_role;
grant all on table public.mochi_social_chat_messages to service_role;
grant all on table public.mochi_social_chat_reports to service_role;
grant all on table public.mochi_social_chain_operations to service_role;
grant all on table public.mochi_social_ledger_events to service_role;
grant all on table public.mochi_social_feedback to service_role;
grant usage, select on sequence public.mochi_social_ledger_events_id_seq to service_role;

create index if not exists mochi_social_ledger_request_idx on public.mochi_social_ledger_events(request_id);
create index if not exists mochi_social_chat_expires_idx on public.mochi_social_chat_messages(expires_at);
create index if not exists mochi_social_market_status_idx on public.mochi_social_market_listings(status, created_at desc);
create index if not exists mochi_social_spirits_owner_idx on public.mochi_social_spirits(owner_id, spirit_id);
