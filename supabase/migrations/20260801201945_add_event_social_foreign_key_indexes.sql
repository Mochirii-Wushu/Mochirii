create index event_social_destination_settings_confirmed_by_idx
  on public.event_social_destination_settings (confirmed_by);

create index event_social_publication_templates_approved_by_idx
  on public.event_social_publication_templates (approved_by);

create index event_social_publication_jobs_template_id_idx
  on public.event_social_publication_jobs (template_id);

create index event_social_publication_jobs_approved_by_idx
  on public.event_social_publication_jobs (approved_by);

create index event_social_publication_jobs_reconciled_by_idx
  on public.event_social_publication_jobs (reconciled_by);

create index event_social_publication_events_occurrence_id_idx
  on public.event_social_publication_events (occurrence_id);

create index event_social_publication_events_actor_id_idx
  on public.event_social_publication_events (actor_id);
