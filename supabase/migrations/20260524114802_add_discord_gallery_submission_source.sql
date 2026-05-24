alter table public.gallery_submissions
  add column if not exists submission_source text not null default 'website',
  add column if not exists discord_guild_id text,
  add column if not exists discord_channel_id text,
  add column if not exists discord_message_id text,
  add column if not exists discord_attachment_id text,
  add column if not exists discord_user_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gallery_submissions_submission_source_check'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_submission_source_check
      check (submission_source in ('website', 'discord')) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gallery_submissions_discord_source_required_check'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_discord_source_required_check
      check (
        submission_source <> 'discord'
        or (
          discord_guild_id = '1078630751077142608'
          and discord_channel_id is not null
          and discord_message_id is not null
          and discord_attachment_id is not null
          and discord_user_id is not null
        )
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gallery_submissions_discord_id_format_check'
  ) then
    alter table public.gallery_submissions
      add constraint gallery_submissions_discord_id_format_check
      check (
        (discord_guild_id is null or discord_guild_id ~ '^[0-9]{16,22}$')
        and (discord_channel_id is null or discord_channel_id ~ '^[0-9]{16,22}$')
        and (discord_message_id is null or discord_message_id ~ '^[0-9]{16,22}$')
        and (discord_attachment_id is null or discord_attachment_id ~ '^[0-9]{16,22}$')
        and (discord_user_id is null or discord_user_id ~ '^[0-9]{16,22}$')
      ) not valid;
  end if;
end
$$;

alter table public.gallery_submissions
  validate constraint gallery_submissions_submission_source_check;

alter table public.gallery_submissions
  validate constraint gallery_submissions_discord_source_required_check;

alter table public.gallery_submissions
  validate constraint gallery_submissions_discord_id_format_check;

create unique index if not exists gallery_submissions_discord_attachment_key
on public.gallery_submissions (discord_message_id, discord_attachment_id)
where submission_source = 'discord'
  and discord_message_id is not null
  and discord_attachment_id is not null;

create index if not exists gallery_submissions_discord_user_id_idx
on public.gallery_submissions (discord_user_id)
where submission_source = 'discord'
  and discord_user_id is not null;
