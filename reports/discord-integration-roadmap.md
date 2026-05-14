# Discord Integration Roadmap

Date: 2026-05-13 local / 2026-05-14 UTC

## feature/discord-events-sync

Goal:
- Sync Discord Scheduled Event metadata into Supabase.
- Let the Events page display synced Discord events with Open in Discord links.

Expected files, tables, and functions:
- Migration for `discord_scheduled_events`.
- Edge Function or Reaper job: `sync-discord-scheduled-events`.
- Possible reads from `discord_resources` for guild/channel/event targets.
- Later static page changes to `events.js` only after a safe read model exists.

Hard stops:
- Do not replace Discord Scheduled Events.
- Do not implement RSVP or attendance yet.
- Do not mirror event discussion messages.
- Do not expose bot tokens or service-role keys to browser code.

Validation:
- `npm run check`
- `npm run check:production`
- `git diff --check`
- `deno check` for changed Edge Functions.
- `supabase db reset`
- `supabase migration list --local`
- Events page smoke for filters, UTC date handling, and Open in Discord links.

Deployment needs:
- Confirm `DISCORD_GUILD_ID`.
- Add any channel/event resource IDs to `discord_resources`.
- Configure `DISCORD_EVENTS_CHANNEL_ID` only if the sync job needs it.
- Run `supabase db push --dry-run`, then deploy only with explicit approval.

## feature/discord-webhook-notifications

Goal:
- Send selected website events into configured Discord channels via webhooks.

Possible notifications:
- New pending gallery submission to a moderator channel.
- Gallery approval or rejection to mod log.
- Approved image to gallery channel.
- New member verified.

Expected files, tables, and functions:
- Use `discord_resources` for webhook resource labels and enabled state.
- Write send attempts to `discord_sync_log` with `sync_type = 'webhook_notification'`.
- Edge Function or Reaper helper for webhook sends.
- Optional new shared helper for webhook payload shape.

Hard stops:
- Do not spam every profile update.
- Do not expose webhook tokens.
- Do not store full webhook URLs in `discord_resources`.
- Do not send private Storage URLs outside approved moderation contexts.

Validation:
- `npm run check`
- `git diff --check`
- `deno check` for changed Edge Functions.
- Local dry-run mode that logs `skipped` or `manual_test` without sending.
- Secret scan for real webhook URLs.

Deployment needs:
- Set webhook secrets manually in the trusted runtime.
- Confirm destination channel ownership in Discord.
- Deploy functions only after explicit approval.

## feature/discord-forum-index

Goal:
- Index Discord forum/thread metadata for guides and Codex candidates.

Sync only:
- thread id
- title
- tags
- URL
- safe author metadata if approved
- created/updated timestamps

Expected files, tables, and functions:
- Migration for `discord_forum_threads` or similarly scoped metadata table.
- Edge Function or Reaper job: `sync-discord-forum-index`.
- Optional future Codex/admin curation report before any public page change.

Hard stops:
- Do not mirror full message content.
- Do not require privileged message-content access.
- Do not publish private or internal-only forum threads.
- Do not add a public forum browser without a separate UI branch.

Validation:
- `npm run check`
- `git diff --check`
- `deno check` for changed Edge Functions.
- `supabase db reset`
- `supabase migration list --local`
- Manual metadata audit against allowed forum/channel IDs.

Deployment needs:
- Set forum channel IDs per environment.
- Confirm bot permissions can list forum/thread metadata without message-content privileged access.
- Run database dry-run before remote mutation.

## feature/discord-slash-commands

Goal:
- Add Reaper slash commands that point users to website pages:
  - `/events`
  - `/gallery`
  - `/submit`
  - `/profile`
  - `/codex`
  - `/join`

Expected files, tables, and functions:
- Reaper command definitions.
- Optional `discord_sync_log` rows for slash-command setup or manual tests.
- Optional website deep-link docs.
- No public site UI change required unless command target pages need stable anchors.

Hard stops:
- Do not add moderation commands yet.
- Do not assign roles yet.
- Do not let slash commands bypass website/Supabase permissions.
- Do not require a backend server in this static site repo.

Validation:
- `npm run check`
- `git diff --check`
- Reaper command registration dry-run if available.
- Manual Discord command test in a safe guild/channel after approval.

Deployment needs:
- Discord application command registration through Reaper.
- Bot token stays in Reaper/trusted runtime only.
- Explicit approval before registering commands in production.

## feature/event-rsvp-attendance

Goal:
- Build website RSVP and attendance records connected to Discord Scheduled Events.

Potential tables:
- `guild_events`
- `event_rsvps`
- `event_attendance`

Expected files, tables, and functions:
- Migration for website-owned event records and member participation state.
- RLS policies for member-owned RSVP writes and leader/admin reads.
- Edge Functions or trusted jobs for leader attendance updates.
- Later `events.js` changes only after the data model and RLS are validated.

Hard stops:
- Do not replace Discord Scheduled Events.
- Do not infer attendance from chat messages.
- Do not publish private RSVP data.
- Do not expose member participation history publicly without explicit scope.

Validation:
- `npm run check`
- `npm run check:production`
- `git diff --check`
- `node --check` for changed browser scripts.
- `deno check` for changed Edge Functions.
- `supabase db reset`
- RLS checks for member, anon, and service-role paths.

Deployment needs:
- Database dry-run before remote migration.
- Explicit approval before `supabase db push`.
- Later Edge Function deployments only after secrets and RLS are reviewed.
