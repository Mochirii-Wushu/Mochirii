create index if not exists gallery_submissions_user_id_idx
on public.gallery_submissions (user_id);

create index if not exists gallery_submissions_reviewed_by_idx
on public.gallery_submissions (reviewed_by);

create index if not exists gallery_instagram_publish_jobs_queued_by_idx
on public.gallery_instagram_publish_jobs (queued_by);

create index if not exists gallery_instagram_publish_jobs_published_by_idx
on public.gallery_instagram_publish_jobs (published_by);

create index if not exists gallery_instagram_publish_events_actor_id_idx
on public.gallery_instagram_publish_events (actor_id);

create index if not exists member_profile_media_reviewed_by_idx
on public.member_profile_media (reviewed_by);

create index if not exists member_profile_media_events_actor_id_idx
on public.member_profile_media_events (actor_id);

create index if not exists member_verifications_reviewed_by_idx
on public.member_verifications (reviewed_by);

create index if not exists member_profiles_approved_avatar_media_id_idx
on public.member_profiles (approved_avatar_media_id);

create index if not exists member_profiles_approved_banner_media_id_idx
on public.member_profiles (approved_banner_media_id);

create index if not exists discord_sync_log_resource_id_idx
on public.discord_sync_log (resource_id);

create index if not exists spotlight_poll_cycles_winner_profile_id_idx
on public.spotlight_poll_cycles (winner_profile_id);

create index if not exists spotlight_poll_candidates_member_profile_id_idx
on public.spotlight_poll_candidates (member_profile_id);

create index if not exists spotlight_poll_results_member_profile_id_idx
on public.spotlight_poll_results (member_profile_id);
