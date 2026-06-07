alter table public.gallery_submissions
  add column if not exists instagram_opt_in boolean not null default false,
  add column if not exists instagram_opt_in_at timestamptz,
  add column if not exists instagram_opt_in_source text,
  add column if not exists instagram_opt_in_copy_version text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gallery_submissions_instagram_opt_in_source_check'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_instagram_opt_in_source_check
      check (
        instagram_opt_in_source is null
        or instagram_opt_in_source in ('website_upload', 'discord_slash_command')
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gallery_submissions_instagram_opt_in_consistency_check'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_instagram_opt_in_consistency_check
      check (
        (
          instagram_opt_in is false
          and instagram_opt_in_at is null
          and instagram_opt_in_source is null
          and instagram_opt_in_copy_version is null
        )
        or (
          instagram_opt_in is true
          and instagram_opt_in_at is not null
          and instagram_opt_in_copy_version is not null
          and (
            (submission_source = 'website' and instagram_opt_in_source = 'website_upload')
            or (submission_source = 'discord' and instagram_opt_in_source = 'discord_slash_command')
          )
        )
      ) not valid;
  end if;
end
$$;

alter table public.gallery_submissions
  validate constraint gallery_submissions_instagram_opt_in_source_check;

alter table public.gallery_submissions
  validate constraint gallery_submissions_instagram_opt_in_consistency_check;

grant insert (
  instagram_opt_in,
  instagram_opt_in_at,
  instagram_opt_in_source,
  instagram_opt_in_copy_version
) on table public.gallery_submissions to authenticated;

create table if not exists public.gallery_instagram_publish_jobs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.gallery_submissions(id) on delete cascade,
  status text not null default 'queued',
  eligibility_reason text,
  caption text,
  alt_text text,
  instagram_container_id text,
  instagram_media_id text,
  instagram_permalink text,
  last_error text,
  attempt_count integer not null default 0,
  queued_by uuid references auth.users(id),
  published_by uuid references auth.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gallery_instagram_publish_jobs_submission_key'
  ) then
    alter table public.gallery_instagram_publish_jobs
      add constraint gallery_instagram_publish_jobs_submission_key unique (submission_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gallery_instagram_publish_jobs_status_check'
  ) then
    alter table public.gallery_instagram_publish_jobs
      add constraint gallery_instagram_publish_jobs_status_check
      check (status in ('queued', 'ineligible', 'publishing', 'published', 'failed', 'canceled')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gallery_instagram_publish_jobs_attempt_count_check'
  ) then
    alter table public.gallery_instagram_publish_jobs
      add constraint gallery_instagram_publish_jobs_attempt_count_check
      check (attempt_count >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gallery_instagram_publish_jobs_caption_length'
  ) then
    alter table public.gallery_instagram_publish_jobs
      add constraint gallery_instagram_publish_jobs_caption_length
      check (caption is null or char_length(caption) <= 2200) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gallery_instagram_publish_jobs_alt_text_length'
  ) then
    alter table public.gallery_instagram_publish_jobs
      add constraint gallery_instagram_publish_jobs_alt_text_length
      check (alt_text is null or char_length(alt_text) <= 1000) not valid;
  end if;
end
$$;

alter table public.gallery_instagram_publish_jobs
  validate constraint gallery_instagram_publish_jobs_status_check;

alter table public.gallery_instagram_publish_jobs
  validate constraint gallery_instagram_publish_jobs_attempt_count_check;

alter table public.gallery_instagram_publish_jobs
  validate constraint gallery_instagram_publish_jobs_caption_length;

alter table public.gallery_instagram_publish_jobs
  validate constraint gallery_instagram_publish_jobs_alt_text_length;

drop trigger if exists set_gallery_instagram_publish_jobs_updated_at on public.gallery_instagram_publish_jobs;
create trigger set_gallery_instagram_publish_jobs_updated_at
before update on public.gallery_instagram_publish_jobs
for each row
execute function public.set_updated_at();

create index if not exists gallery_instagram_publish_jobs_status_idx
on public.gallery_instagram_publish_jobs (status, created_at desc);

create index if not exists gallery_instagram_publish_jobs_submission_id_idx
on public.gallery_instagram_publish_jobs (submission_id);

alter table public.gallery_instagram_publish_jobs enable row level security;

revoke all on table public.gallery_instagram_publish_jobs from anon;
revoke all on table public.gallery_instagram_publish_jobs from authenticated;
grant all on table public.gallery_instagram_publish_jobs to service_role;

create table if not exists public.gallery_instagram_publish_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.gallery_instagram_publish_jobs(id) on delete cascade,
  submission_id uuid not null references public.gallery_submissions(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gallery_instagram_publish_events_action_check'
  ) then
    alter table public.gallery_instagram_publish_events
      add constraint gallery_instagram_publish_events_action_check
      check (action in ('queued', 'ineligible', 'publishing', 'published', 'failed', 'retry', 'canceled')) not valid;
  end if;
end
$$;

alter table public.gallery_instagram_publish_events
  validate constraint gallery_instagram_publish_events_action_check;

create index if not exists gallery_instagram_publish_events_job_id_idx
on public.gallery_instagram_publish_events (job_id, created_at desc);

create index if not exists gallery_instagram_publish_events_submission_id_idx
on public.gallery_instagram_publish_events (submission_id, created_at desc);

alter table public.gallery_instagram_publish_events enable row level security;

revoke all on table public.gallery_instagram_publish_events from anon;
revoke all on table public.gallery_instagram_publish_events from authenticated;
grant all on table public.gallery_instagram_publish_events to service_role;
