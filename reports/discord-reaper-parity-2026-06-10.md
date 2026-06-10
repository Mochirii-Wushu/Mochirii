# Discord/Reaper Parity Verification - 2026-06-10

## Summary
- Packet: `codex/discord-reaper-parity`.
- Scope: read-only source parity for Discord scheduled events and Reaper runtime boundaries.
- Result: added `npm run check:discord-reaper-parity`, a static-safe validation script that verifies the guild schedule, mirrored public data, Reaper event-sync safety hooks, event cover presence, and runtime checklist documentation.
- No `/sync-events apply`, Discord mutation, token rotation, Supabase deploy, secret change, Vercel setting change, Cloudflare change, schedule change, or event-time change was performed.

## Event Parity
- Schedule source: `data/guild-schedule.json`.
- Next public mirror: `apps/web/public/data/guild-schedule.json`.
- Timezone: `UTC+8`, `offsetMinutes: 480`.
- Managed event types: `8`.
- Managed event instances: `17`.
- Monthly Guild Raffle remains the single canonical recurring raffle event in source data.
- Duplicate raffle retirement remains limited to `discordDuplicateEventIds`.
- Event covers are required in both root `assets/img/discord-events/` and `apps/web/public/assets/img/discord-events/`.

## Runtime Parity
- Supabase Edge `reaper-discord-interactions` remains the slash-command/component runtime.
- Reaper Gateway worker remains welcome-DM-only.
- `/sync-events mode:preview confirm:false` remains the safe first command.
- `/sync-events mode:apply confirm:true` remains an owner-approved provider mutation.
- Dynamic Discord responses remain mention-safe.
- Discord API rate-limit handling remains checked through `Retry-After` and `retry_after` guard snippets.

## Validation
- `npm run check:discord-reaper-parity`: passed.
- Live Discord readback was intentionally skipped in local validation because it requires `DISCORD_REAPER_PARITY_LIVE=1` and a local `DISCORD_BOT_TOKEN`; CI and PRs must not require bot tokens.

## Remaining Notes
- To run a read-only live Discord event read, use a trusted local shell with `DISCORD_REAPER_PARITY_LIVE=1`, `DISCORD_BOT_TOKEN`, and optionally `DISCORD_GUILD_ID=1078630751077142608`.
- The checker prints counts/status only and must not print token values.
- The next planned packet is `codex/observability-metadata-smoke`.
