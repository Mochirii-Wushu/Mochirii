-- Harden Mochi Social advisor findings.
-- FK indexes are additive. Policy rewrites preserve access while wrapping auth
-- helper calls in SELECT so Postgres can initplan them once per statement.

create index if not exists mochi_social_alpha_testers_invited_by_idx
on public.mochi_social_alpha_testers(invited_by);

create index if not exists mochi_social_chain_operations_user_id_idx
on public.mochi_social_chain_operations(user_id);

create index if not exists mochi_social_chat_messages_user_id_idx
on public.mochi_social_chat_messages(user_id);

create index if not exists mochi_social_chat_reports_message_id_idx
on public.mochi_social_chat_reports(message_id);

create index if not exists mochi_social_chat_reports_reporter_id_idx
on public.mochi_social_chat_reports(reporter_id);

create index if not exists mochi_social_feedback_user_id_idx
on public.mochi_social_feedback(user_id);

create index if not exists mochi_social_inventory_owner_id_idx
on public.mochi_social_inventory(owner_id);

create index if not exists mochi_social_ledger_events_actor_id_idx
on public.mochi_social_ledger_events(actor_id);

create index if not exists mochi_social_market_listings_inventory_id_idx
on public.mochi_social_market_listings(inventory_id);

create index if not exists mochi_social_market_listings_seller_id_idx
on public.mochi_social_market_listings(seller_id);

create index if not exists mochi_social_spirits_owner_id_idx
on public.mochi_social_spirits(owner_id);

create index if not exists mochi_social_shared_pet_snapshots_last_actor_id_idx
on public.mochi_social_shared_pet_snapshots(last_actor_id);

create index if not exists mochi_social_trades_recipient_id_idx
on public.mochi_social_trades(recipient_id);

create index if not exists mochi_social_trades_requester_id_idx
on public.mochi_social_trades(requester_id);

-- The current local migration contract uses mochi_social_spirits. Current linked
-- advisor output also reports mochi_social_pets on production, so keep this
-- block guarded to support remote drift without breaking local/preview resets.
do $$
begin
  if to_regclass('public.mochi_social_pets') is not null then
    execute 'create index if not exists mochi_social_pets_owner_id_idx on public.mochi_social_pets(owner_id)';
    execute 'drop policy if exists "mochi_social_pets_read_own" on public.mochi_social_pets';
    execute 'create policy "mochi_social_pets_read_own" on public.mochi_social_pets for select to authenticated using ((select auth.uid()) = owner_id)';
  end if;
end $$;

drop policy if exists "mochi_social_alpha_testers_read_own" on public.mochi_social_alpha_testers;
create policy "mochi_social_alpha_testers_read_own"
on public.mochi_social_alpha_testers
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "mochi_social_terms_read_own" on public.mochi_social_terms_acknowledgements;
create policy "mochi_social_terms_read_own"
on public.mochi_social_terms_acknowledgements
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "mochi_social_profiles_manage_own" on public.mochi_social_profiles;
create policy "mochi_social_profiles_manage_own"
on public.mochi_social_profiles
for all
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "mochi_social_spirits_read_own" on public.mochi_social_spirits;
create policy "mochi_social_spirits_read_own"
on public.mochi_social_spirits
for select
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "mochi_social_inventory_read_own" on public.mochi_social_inventory;
create policy "mochi_social_inventory_read_own"
on public.mochi_social_inventory
for select
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "mochi_social_market_read_active" on public.mochi_social_market_listings;
create policy "mochi_social_market_read_active"
on public.mochi_social_market_listings
for select
to authenticated
using (status = 'active' or (select auth.uid()) = seller_id);

drop policy if exists "mochi_social_trades_read_participant" on public.mochi_social_trades;
create policy "mochi_social_trades_read_participant"
on public.mochi_social_trades
for select
to authenticated
using ((select auth.uid()) = requester_id or (select auth.uid()) = recipient_id);

drop policy if exists "mochi_social_chat_read_authenticated" on public.mochi_social_chat_messages;
create policy "mochi_social_chat_read_authenticated"
on public.mochi_social_chat_messages
for select
to authenticated
using ((select auth.role()) = 'authenticated' and expires_at > now());

drop policy if exists "mochi_social_chat_reports_insert_own" on public.mochi_social_chat_reports;
create policy "mochi_social_chat_reports_insert_own"
on public.mochi_social_chat_reports
for insert
to authenticated
with check ((select auth.uid()) = reporter_id);

drop policy if exists "mochi_social_chain_operations_read_own" on public.mochi_social_chain_operations;
create policy "mochi_social_chain_operations_read_own"
on public.mochi_social_chain_operations
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "mochi_social_ledger_read_own" on public.mochi_social_ledger_events;
create policy "mochi_social_ledger_read_own"
on public.mochi_social_ledger_events
for select
to authenticated
using ((select auth.uid()) = actor_id);

drop policy if exists "mochi_social_progress_read_own" on public.mochi_social_progress_snapshots;
create policy "mochi_social_progress_read_own"
on public.mochi_social_progress_snapshots
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "mochi_social_feedback_insert_own" on public.mochi_social_feedback;
create policy "mochi_social_feedback_insert_own"
on public.mochi_social_feedback
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "mochi_social_unity_players_read_own" on public.mochi_social_unity_players;
create policy "mochi_social_unity_players_read_own"
on public.mochi_social_unity_players
for select
to authenticated
using ((select auth.uid()) = user_id);
