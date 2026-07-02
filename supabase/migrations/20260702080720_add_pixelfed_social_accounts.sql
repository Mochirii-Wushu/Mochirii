-- Pixelfed guild social account mapping.
-- Supabase remains the identity and membership authority. Pixelfed identity
-- fields are written only by trusted server/operator workflows after the SSO
-- compatibility gate passes; members can only read their own mapping and
-- choose whether an active profile link is visible on member pages.

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  member_profile_id uuid references public.member_profiles(id) on delete set null,
  provider text not null default 'pixelfed',
  provider_subject text,
  provider_user_id text,
  username text,
  profile_url text,
  status text not null default 'pending_sso',
  profile_link_visible boolean not null default false,
  federation_enabled boolean not null default false,
  last_login_at timestamptz,
  last_synced_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_accounts_provider_check check (provider in ('pixelfed')),
  constraint social_accounts_provider_subject_check
    check (provider_subject is null or char_length(trim(provider_subject)) between 1 and 255),
  constraint social_accounts_provider_user_id_check
    check (provider_user_id is null or char_length(trim(provider_user_id)) between 1 and 255),
  constraint social_accounts_username_check
    check (username is null or username ~ '^[a-z0-9_][a-z0-9_.-]{1,63}$'),
  constraint social_accounts_profile_url_check
    check (profile_url is null or profile_url like 'https://social.mochirii.com/%'),
  constraint social_accounts_status_check
    check (status in ('pending_sso', 'active', 'revoked', 'suspended', 'archived')),
  constraint social_accounts_visible_requires_active_check
    check (profile_link_visible is false or (status = 'active' and profile_url is not null)),
  constraint social_accounts_federation_requires_active_check
    check (federation_enabled is false or status = 'active')
);

create unique index if not exists social_accounts_user_provider_key
on public.social_accounts (user_id, provider);

create unique index if not exists social_accounts_provider_subject_key
on public.social_accounts (provider, provider_subject)
where provider_subject is not null;

create index if not exists social_accounts_user_status_idx
on public.social_accounts (user_id, status, provider);

create index if not exists social_accounts_visible_profile_idx
on public.social_accounts (member_profile_id, provider, profile_link_visible)
where status = 'active' and profile_link_visible is true;

drop trigger if exists set_social_accounts_updated_at on public.social_accounts;
create trigger set_social_accounts_updated_at
before update on public.social_accounts
for each row
execute function public.set_updated_at();

alter table public.social_accounts enable row level security;

revoke all on table public.social_accounts from public, anon, authenticated;
grant select on table public.social_accounts to authenticated;
grant update (profile_link_visible) on table public.social_accounts to authenticated;
grant all on table public.social_accounts to service_role;

drop policy if exists "Members can read their own social accounts" on public.social_accounts;
create policy "Members can read their own social accounts"
on public.social_accounts
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members can update social account visibility" on public.social_accounts;
create policy "Members can update social account visibility"
on public.social_accounts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
