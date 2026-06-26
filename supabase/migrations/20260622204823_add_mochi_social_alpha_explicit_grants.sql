-- Explicit Data API grants for Mochi Social closed alpha.
-- RLS policies in the original migrations still decide which rows are visible.

grant select on table public.mochi_social_alpha_testers to authenticated;
grant select on table public.mochi_social_terms_acknowledgements to authenticated;
grant select, insert, update on table public.mochi_social_profiles to authenticated;
grant select on table public.mochi_social_spirits to authenticated;
grant select on table public.mochi_social_inventory to authenticated;
grant select on table public.mochi_social_chat_messages to authenticated;
grant insert on table public.mochi_social_chat_reports to authenticated;
grant select on table public.mochi_social_chain_operations to authenticated;
grant select on table public.mochi_social_ledger_events to authenticated;
grant select on table public.mochi_social_progress_snapshots to authenticated;
grant insert on table public.mochi_social_feedback to authenticated;
grant select on table public.mochi_social_unity_players to authenticated;
grant select on table public.mochi_social_shared_pet_snapshots to authenticated;

grant select, insert, update, delete on table public.mochi_social_alpha_testers to service_role;
grant select, insert, update, delete on table public.mochi_social_terms_acknowledgements to service_role;
grant select, insert, update, delete on table public.mochi_social_profiles to service_role;
grant select, insert, update, delete on table public.mochi_social_spirits to service_role;
grant select, insert, update, delete on table public.mochi_social_inventory to service_role;
grant select, insert, update, delete on table public.mochi_social_chat_messages to service_role;
grant select, insert, update, delete on table public.mochi_social_chat_reports to service_role;
grant select, insert, update, delete on table public.mochi_social_chain_operations to service_role;
grant select, insert, update, delete on table public.mochi_social_ledger_events to service_role;
grant select, insert, update, delete on table public.mochi_social_progress_snapshots to service_role;
grant select, insert, update, delete on table public.mochi_social_feedback to service_role;
grant select, insert, update, delete on table public.mochi_social_unity_players to service_role;
grant select, insert, update, delete on table public.mochi_social_shared_pet_snapshots to service_role;
