alter table public.event_social_publication_events
  drop constraint event_social_publication_events_actor_id_fkey;

alter table public.event_social_publication_events
  add constraint event_social_publication_events_actor_id_fkey
  foreign key (actor_id)
  references auth.users(id)
  on delete restrict;
