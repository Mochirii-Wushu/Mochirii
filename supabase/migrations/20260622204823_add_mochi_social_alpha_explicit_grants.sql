-- Explicit Data API grants for Mochi Social closed alpha.
-- RLS policies in the original migrations still decide which rows are visible.

-- Preview branches may be created from databases that omit older alpha tables.
-- Keep every intended grant explicit while applying only to tables that exist.
do $$
declare
  grant_spec record;
begin
  for grant_spec in
    select *
    from (values
      ('mochi_social_alpha_testers', 'select', 'authenticated'),
      ('mochi_social_terms_acknowledgements', 'select', 'authenticated'),
      ('mochi_social_profiles', 'select, insert, update', 'authenticated'),
      ('mochi_social_ledger_events', 'select', 'authenticated'),
      ('mochi_social_progress_snapshots', 'select', 'authenticated'),
      ('mochi_social_feedback', 'insert', 'authenticated'),
      ('mochi_social_unity_players', 'select', 'authenticated'),
      ('mochi_social_shared_pet_snapshots', 'select', 'authenticated'),
      ('mochi_social_spirits', 'select', 'authenticated'),
      ('mochi_social_inventory', 'select', 'authenticated'),
      ('mochi_social_chat_messages', 'select', 'authenticated'),
      ('mochi_social_chat_reports', 'insert', 'authenticated'),
      ('mochi_social_chain_operations', 'select', 'authenticated'),
      ('mochi_social_alpha_testers', 'select, insert, update, delete', 'service_role'),
      ('mochi_social_terms_acknowledgements', 'select, insert, update, delete', 'service_role'),
      ('mochi_social_profiles', 'select, insert, update, delete', 'service_role'),
      ('mochi_social_ledger_events', 'select, insert, update, delete', 'service_role'),
      ('mochi_social_progress_snapshots', 'select, insert, update, delete', 'service_role'),
      ('mochi_social_feedback', 'select, insert, update, delete', 'service_role'),
      ('mochi_social_unity_players', 'select, insert, update, delete', 'service_role'),
      ('mochi_social_shared_pet_snapshots', 'select, insert, update, delete', 'service_role'),
      ('mochi_social_spirits', 'select, insert, update, delete', 'service_role'),
      ('mochi_social_inventory', 'select, insert, update, delete', 'service_role'),
      ('mochi_social_chat_messages', 'select, insert, update, delete', 'service_role'),
      ('mochi_social_chat_reports', 'select, insert, update, delete', 'service_role'),
      ('mochi_social_chain_operations', 'select, insert, update, delete', 'service_role')
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
