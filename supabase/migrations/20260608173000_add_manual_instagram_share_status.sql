alter table public.gallery_instagram_publish_jobs
  drop constraint if exists gallery_instagram_publish_jobs_status_check;

alter table public.gallery_instagram_publish_jobs
  add constraint gallery_instagram_publish_jobs_status_check
  check (status in ('queued', 'ineligible', 'publishing', 'published', 'failed', 'canceled', 'shared_manually')) not valid;

alter table public.gallery_instagram_publish_jobs
  validate constraint gallery_instagram_publish_jobs_status_check;

alter table public.gallery_instagram_publish_events
  drop constraint if exists gallery_instagram_publish_events_action_check;

alter table public.gallery_instagram_publish_events
  add constraint gallery_instagram_publish_events_action_check
  check (action in ('queued', 'ineligible', 'publishing', 'published', 'failed', 'retry', 'canceled', 'shared_manually')) not valid;

alter table public.gallery_instagram_publish_events
  validate constraint gallery_instagram_publish_events_action_check;
