# Reaper Runtime Health Checklist

Use this checklist for read-only operations reviews. It does not authorize token rotation, Discord event mutation, role mutation, live reminder sends, or provider setting changes.

## Runtime Split

- Supabase Edge Function `reaper-discord-interactions` handles slash commands, message components, gallery ingest, rank sync, event sync, pending-verification containment, native ModMail audit, and vote reminder interactions.
- Supabase scheduled Edge Functions handle manual vote reminders and monthly native Discord spotlight polls; these scheduled functions use cron secrets and server-side Discord bot access only.
- Reaper Gateway worker handles `guildMemberAdd` welcome DMs and, after the second release is approved, redacted pending-verification member-event forwarding.
- Vercel/Next does not run Discord bot tokens, service-role keys, webhooks, or Gateway connections.

## Gateway Worker

- Persistent host selected and documented privately.
- `Server Members Intent` is enabled in Discord Developer Portal.
- Bot does not have `Administrator`.
- Bot does not use `Message Content` or `Presences` intents.
- Bot does not mutate roles for welcome DMs or pending-verification sync.
- Pending-containment automation through Gateway calls `reaper-discord-member-sync`; the worker must not mutate channel permissions directly.
- `REAPER_PENDING_VERIFICATION_SYNC_ENABLED=false` remains the safe default until the second release is approved.
- `WELCOME_DM_ENABLED=true` is set only in runtime secrets.
- `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID` are runtime secrets only.
- Welcome DM failures are logged with redacted IDs and no public fallback post.

## Supabase Interactions

- Discord Interactions Endpoint URL remains:

```text
https://deyvmtncimmcinldjyqe.supabase.co/functions/v1/reaper-discord-interactions
```

- Discord signatures are validated before JSON parsing.
- PING returns PONG.
- Dynamic responses use `allowed_mentions: { parse: [] }`.
- `/sync-events mode:preview confirm:false` is the only safe first event-sync command.
- `/sync-pending-verification mode:preview confirm:false` is the only safe first pending-containment command.
- `/audit-modmail` is read-only and metadata-only; use it before live ModMail ticket tests.
- `/sync-events mode:apply confirm:true` remains an owner-approved provider mutation.
- `/sync-pending-verification mode:apply confirm:true`, `/sync-ranks mode:apply confirm:true`, token rotation, and live reminder sends also remain owner-approved provider mutations.
- Pending-containment apply mutates only tracked member-specific containment overwrites and records owned bits in `discord_managed_permission_overwrites`.
- `reaper-discord-member-sync` requires `x-mochirii-reaper-member-sync-secret`, fetches current Discord member state before planning, and logs only redacted counts/IDs.

## Monthly Spotlight Polls

- `send-member-spotlight-poll` creates one native Discord poll per month after validating `SPOTLIGHT_POLL_CRON_SECRET`.
- `DISCORD_SPOTLIGHT_POLL_CHANNEL_ID` is the only configured poll destination.
- Candidate snapshots include up to 10 active, recently verified, Discord-linked website members because Discord native polls support up to 10 answers.
- `publish-member-spotlight-winner` waits for finalized Discord poll results before publishing a winner.
- Public website reads use `get-current-spotlight-winner` and expose only the winner name and month.

## Scheduled Events

- Source of truth is `data/guild-schedule.json`, mirrored to `apps/web/public/data/guild-schedule.json`.
- Event timezone remains `UTC+8` with `offsetMinutes: 480`.
- Reaper manages 8 event types and 17 scheduled event instances.
- Monthly Guild Raffle remains the single canonical recurring raffle event.
- Duplicate removal is limited to IDs explicitly listed in `discordDuplicateEventIds`.
- Event cover URLs are public Vercel asset URLs with the schedule `discordCoverVersion` cache key.

## Evidence To Record

- Last read-only `/sync-events mode:preview confirm:false` date.
- Last owner-approved `/sync-events mode:apply confirm:true` date, if any.
- Last welcome DM test date.
- Last token rotation date, recorded as a date only.
- Current persistent host status, without process logs that expose tokens or private IDs.
