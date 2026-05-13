create table if not exists public.gallery_moderation_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.gallery_submissions(id) on delete cascade,
  moderator_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  reason text,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gallery_moderation_events_action_check'
  ) then
    alter table public.gallery_moderation_events
      add constraint gallery_moderation_events_action_check
      check (action in ('approved', 'rejected', 'archived')) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'gallery_moderation_events_reason_length'
  ) then
    alter table public.gallery_moderation_events
      add constraint gallery_moderation_events_reason_length
      check (reason is null or char_length(reason) <= 500) not valid;
  end if;
end
$$;

create index if not exists gallery_moderation_events_submission_id_idx
on public.gallery_moderation_events (submission_id);

create index if not exists gallery_moderation_events_moderator_id_idx
on public.gallery_moderation_events (moderator_id);

alter table public.gallery_moderation_events enable row level security;

revoke all on table public.gallery_moderation_events from anon;
revoke all on table public.gallery_moderation_events from authenticated;
grant all on table public.gallery_moderation_events to service_role;
