-- Rename the closed-alpha game data model from Mochi Social to Mochi Pets.
--
-- Historical migrations retain their original names as immutable history.
-- Current code, Edge Functions, and public copy use the mochi_pets prefix.

do $$
declare
  rename_spec record;
begin
  for rename_spec in
    select *
    from (values
      ('mochi_social_alpha_testers', 'mochi_pets_alpha_testers'),
      ('mochi_social_terms_acknowledgements', 'mochi_pets_terms_acknowledgements'),
      ('mochi_social_profiles', 'mochi_pets_profiles'),
      ('mochi_social_spirits', 'mochi_pets_spirits'),
      ('mochi_social_pets', 'mochi_pets_pets'),
      ('mochi_social_inventory', 'mochi_pets_inventory'),
      ('mochi_social_market_listings', 'mochi_pets_market_listings'),
      ('mochi_social_trades', 'mochi_pets_trades'),
      ('mochi_social_chat_messages', 'mochi_pets_chat_messages'),
      ('mochi_social_chat_reports', 'mochi_pets_chat_reports'),
      ('mochi_social_chain_operations', 'mochi_pets_chain_operations'),
      ('mochi_social_ledger_events', 'mochi_pets_ledger_events'),
      ('mochi_social_progress_snapshots', 'mochi_pets_progress_snapshots'),
      ('mochi_social_unity_players', 'mochi_pets_unity_players'),
      ('mochi_social_shared_pet_snapshots', 'mochi_pets_shared_pet_snapshots'),
      ('mochi_social_feedback', 'mochi_pets_feedback')
    ) as renames(old_name, new_name)
  loop
    if to_regclass(format('public.%I', rename_spec.old_name)) is not null
       and to_regclass(format('public.%I', rename_spec.new_name)) is null then
      execute format('alter table public.%I rename to %I', rename_spec.old_name, rename_spec.new_name);
    end if;
  end loop;
end $$;

do $$
declare
  index_spec record;
begin
  for index_spec in
    select *
    from (values
      ('mochi_social_ledger_request_idx', 'mochi_pets_ledger_request_idx'),
      ('mochi_social_chat_expires_idx', 'mochi_pets_chat_expires_idx'),
      ('mochi_social_market_status_idx', 'mochi_pets_market_status_idx'),
      ('mochi_social_progress_updated_idx', 'mochi_pets_progress_updated_idx'),
      ('mochi_social_unity_players_updated_idx', 'mochi_pets_unity_players_updated_idx'),
      ('mochi_social_shared_pet_updated_idx', 'mochi_pets_shared_pet_updated_idx'),
      ('mochi_social_alpha_testers_invited_by_idx', 'mochi_pets_alpha_testers_invited_by_idx'),
      ('mochi_social_chain_operations_user_id_idx', 'mochi_pets_chain_operations_user_id_idx'),
      ('mochi_social_chat_messages_user_id_idx', 'mochi_pets_chat_messages_user_id_idx'),
      ('mochi_social_chat_reports_message_id_idx', 'mochi_pets_chat_reports_message_id_idx'),
      ('mochi_social_chat_reports_reporter_id_idx', 'mochi_pets_chat_reports_reporter_id_idx'),
      ('mochi_social_feedback_user_id_idx', 'mochi_pets_feedback_user_id_idx'),
      ('mochi_social_inventory_owner_id_idx', 'mochi_pets_inventory_owner_id_idx'),
      ('mochi_social_ledger_events_actor_id_idx', 'mochi_pets_ledger_events_actor_id_idx'),
      ('mochi_social_market_listings_inventory_id_idx', 'mochi_pets_market_listings_inventory_id_idx'),
      ('mochi_social_market_listings_seller_id_idx', 'mochi_pets_market_listings_seller_id_idx'),
      ('mochi_social_shared_pet_snapshots_last_actor_id_idx', 'mochi_pets_shared_pet_snapshots_last_actor_id_idx'),
      ('mochi_social_trades_recipient_id_idx', 'mochi_pets_trades_recipient_id_idx'),
      ('mochi_social_trades_requester_id_idx', 'mochi_pets_trades_requester_id_idx'),
      ('mochi_social_spirits_owner_id_idx', 'mochi_pets_spirits_owner_id_idx'),
      ('mochi_social_pets_owner_id_idx', 'mochi_pets_pets_owner_id_idx')
    ) as renames(old_name, new_name)
  loop
    if to_regclass(format('public.%I', index_spec.old_name)) is not null
       and to_regclass(format('public.%I', index_spec.new_name)) is null then
      execute format('alter index public.%I rename to %I', index_spec.old_name, index_spec.new_name);
    end if;
  end loop;
end $$;

do $$
declare
  policy_spec record;
begin
  for policy_spec in
    select *
    from (values
      ('mochi_pets_alpha_testers', 'mochi_social_alpha_testers_read_own', 'mochi_pets_alpha_testers_read_own'),
      ('mochi_pets_terms_acknowledgements', 'mochi_social_terms_read_own', 'mochi_pets_terms_read_own'),
      ('mochi_pets_profiles', 'mochi_social_profiles_manage_own', 'mochi_pets_profiles_manage_own'),
      ('mochi_pets_spirits', 'mochi_social_spirits_read_own', 'mochi_pets_spirits_read_own'),
      ('mochi_pets_pets', 'mochi_social_pets_read_own', 'mochi_pets_pets_read_own'),
      ('mochi_pets_inventory', 'mochi_social_inventory_read_own', 'mochi_pets_inventory_read_own'),
      ('mochi_pets_market_listings', 'mochi_social_market_read_active', 'mochi_pets_market_read_active'),
      ('mochi_pets_trades', 'mochi_social_trades_read_participant', 'mochi_pets_trades_read_participant'),
      ('mochi_pets_chat_messages', 'mochi_social_chat_read_authenticated', 'mochi_pets_chat_read_authenticated'),
      ('mochi_pets_chat_reports', 'mochi_social_chat_reports_insert_own', 'mochi_pets_chat_reports_insert_own'),
      ('mochi_pets_chain_operations', 'mochi_social_chain_operations_read_own', 'mochi_pets_chain_operations_read_own'),
      ('mochi_pets_ledger_events', 'mochi_social_ledger_read_own', 'mochi_pets_ledger_read_own'),
      ('mochi_pets_progress_snapshots', 'mochi_social_progress_read_own', 'mochi_pets_progress_read_own'),
      ('mochi_pets_feedback', 'mochi_social_feedback_insert_own', 'mochi_pets_feedback_insert_own'),
      ('mochi_pets_unity_players', 'mochi_social_unity_players_read_own', 'mochi_pets_unity_players_read_own'),
      ('mochi_pets_shared_pet_snapshots', 'mochi_social_shared_pet_read_authenticated', 'mochi_pets_shared_pet_read_authenticated')
    ) as renames(table_name, old_name, new_name)
  loop
    if to_regclass(format('public.%I', policy_spec.table_name)) is not null
       and exists (
         select 1
         from pg_policies
         where schemaname = 'public'
           and tablename = policy_spec.table_name
           and policyname = policy_spec.old_name
       )
       and not exists (
         select 1
         from pg_policies
         where schemaname = 'public'
           and tablename = policy_spec.table_name
           and policyname = policy_spec.new_name
       ) then
      execute format(
        'alter policy %I on public.%I rename to %I',
        policy_spec.old_name,
        policy_spec.table_name,
        policy_spec.new_name
      );
    end if;
  end loop;
end $$;

do $$
declare
  grant_spec record;
begin
  for grant_spec in
    select *
    from (values
      ('mochi_pets_alpha_testers', 'select', 'authenticated'),
      ('mochi_pets_terms_acknowledgements', 'select', 'authenticated'),
      ('mochi_pets_profiles', 'select, insert, update', 'authenticated'),
      ('mochi_pets_ledger_events', 'select', 'authenticated'),
      ('mochi_pets_progress_snapshots', 'select', 'authenticated'),
      ('mochi_pets_feedback', 'insert', 'authenticated'),
      ('mochi_pets_unity_players', 'select', 'authenticated'),
      ('mochi_pets_shared_pet_snapshots', 'select', 'authenticated'),
      ('mochi_pets_spirits', 'select', 'authenticated'),
      ('mochi_pets_pets', 'select', 'authenticated'),
      ('mochi_pets_inventory', 'select', 'authenticated'),
      ('mochi_pets_market_listings', 'select', 'authenticated'),
      ('mochi_pets_trades', 'select', 'authenticated'),
      ('mochi_pets_chat_messages', 'select', 'authenticated'),
      ('mochi_pets_chat_reports', 'insert', 'authenticated'),
      ('mochi_pets_chain_operations', 'select', 'authenticated'),
      ('mochi_pets_alpha_testers', 'select, insert, update, delete', 'service_role'),
      ('mochi_pets_terms_acknowledgements', 'select, insert, update, delete', 'service_role'),
      ('mochi_pets_profiles', 'select, insert, update, delete', 'service_role'),
      ('mochi_pets_ledger_events', 'select, insert, update, delete', 'service_role'),
      ('mochi_pets_progress_snapshots', 'select, insert, update, delete', 'service_role'),
      ('mochi_pets_feedback', 'select, insert, update, delete', 'service_role'),
      ('mochi_pets_unity_players', 'select, insert, update, delete', 'service_role'),
      ('mochi_pets_shared_pet_snapshots', 'select, insert, update, delete', 'service_role'),
      ('mochi_pets_spirits', 'select, insert, update, delete', 'service_role'),
      ('mochi_pets_pets', 'select, insert, update, delete', 'service_role'),
      ('mochi_pets_inventory', 'select, insert, update, delete', 'service_role'),
      ('mochi_pets_market_listings', 'select, insert, update, delete', 'service_role'),
      ('mochi_pets_trades', 'select, insert, update, delete', 'service_role'),
      ('mochi_pets_chat_messages', 'select, insert, update, delete', 'service_role'),
      ('mochi_pets_chat_reports', 'select, insert, update, delete', 'service_role'),
      ('mochi_pets_chain_operations', 'select, insert, update, delete', 'service_role')
    ) as grants(table_name, privileges, role_name)
  loop
    if to_regclass(format('public.%I', grant_spec.table_name)) is not null then
      execute format(
        'grant %s on table public.%I to %I',
        grant_spec.privileges,
        grant_spec.table_name,
        grant_spec.role_name
      );
    end if;
  end loop;
end $$;
