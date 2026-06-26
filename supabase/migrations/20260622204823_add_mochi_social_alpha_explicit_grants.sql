-- Explicit Data API grants for Mochi Social closed alpha.
-- RLS policies in the original migrations still decide which rows are visible.

grant select on table public.mochi_social_alpha_testers to authenticated;
grant select on table public.mochi_social_terms_acknowledgements to authenticated;
grant select, insert, update on table public.mochi_social_profiles to authenticated;
grant select on table public.mochi_social_ledger_events to authenticated;
grant select on table public.mochi_social_progress_snapshots to authenticated;
grant insert on table public.mochi_social_feedback to authenticated;
grant select on table public.mochi_social_unity_players to authenticated;
grant select on table public.mochi_social_shared_pet_snapshots to authenticated;

grant select, insert, update, delete on table public.mochi_social_alpha_testers to service_role;
grant select, insert, update, delete on table public.mochi_social_terms_acknowledgements to service_role;
grant select, insert, update, delete on table public.mochi_social_profiles to service_role;
grant select, insert, update, delete on table public.mochi_social_ledger_events to service_role;
grant select, insert, update, delete on table public.mochi_social_progress_snapshots to service_role;
grant select, insert, update, delete on table public.mochi_social_feedback to service_role;
grant select, insert, update, delete on table public.mochi_social_unity_players to service_role;
grant select, insert, update, delete on table public.mochi_social_shared_pet_snapshots to service_role;

-- Preview branches may omit retired legacy alpha tables. Grant them only when
-- present so the current Unity alpha grants can still apply cleanly.
do $$
declare
  grant_spec record;
begin
  for grant_spec in
    select *
    from (values
      ('mochi_social_spirits', 'select', 'authenticated'),
      ('mochi_social_inventory', 'select', 'authenticated'),
      ('mochi_social_chat_messages', 'select', 'authenticated'),
      ('mochi_social_chat_reports', 'insert', 'authenticated'),
      ('mochi_social_chain_operations', 'select', 'authenticated'),
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
