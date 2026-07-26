create index spinner_commands_actor_id_idx
on public.spinner_commands (actor_id);

create index spinner_draw_receipts_actor_id_idx
on public.spinner_draw_receipts (actor_id);

create index spinner_live_state_updated_by_idx
on public.spinner_live_state (updated_by);
