# Discord/Reaper Parity Evidence - 2026-06-18

## Summary
- Packet: `6C Discord/Reaper Parity Evidence`.
- Branch: `codex/packet6-reaper-parity-evidence`.
- Scope: read-only repo parity and test evidence for Reaper slash commands, scheduled events, rank roles, pending-verification containment, vote reminders, spotlight poll, ModMail audit, and runtime separation.
- Result: static parity checks and unit tests passed without Discord provider mutation.
- No `/sync-* apply`, command registration, token rotation, live reminder send, live poll send, Discord scheduled event mutation, Supabase deploy, Vercel setting change, Cloudflare change, secret change, or monetization-tier edit was performed.

## Runtime Boundaries
- Supabase Edge `reaper-discord-interactions` remains the command/component webhook runtime for `/submit`, `/sync-events`, `/sync-ranks`, vote commands, spotlight poll buttons, pending-verification containment, and ModMail audit commands.
- The Reaper Gateway worker remains separate from Supabase Edge and is the member-join welcome-DM runtime only.
- Discord provider mutations remain preview-first and owner-approved.
- Subscription monetization row/channel edits remain Discord Dashboard-only and are not automated through Reaper or Discord API scripts.

## Scheduled Events And UTC+8
- Schedule source remains `data/guild-schedule.json`.
- Next public mirror remains `apps/web/public/data/guild-schedule.json`.
- The checker verified `17` managed event instances across `8` managed event types.
- The live Discord readback was intentionally skipped because `DISCORD_REAPER_PARITY_LIVE=1` and a local bot token were not provided in this no-secret lane.
- `/sync-events mode:preview confirm:false` remains the required live preview before any owner-approved apply.

## Rank Roles
- Rank-role sync remains governed by the Reaper-managed role records and `/sync-ranks` preview/apply contract.
- `/sync-ranks mode:apply confirm:true` remains an owner-approved live Discord mutation.
- Subscriber roles are not website verification roles, rank roles, moderator roles, or Leader Dashboard roles.

## Pending Verification
- Pending-verification containment remains channel-specific and guardrailed by `npm run check:reaper-pending-verification`.
- Apply remains owner-approved and must be preceded by `/sync-pending-verification mode:preview confirm:false`.
- Verified users, moderators, bots, and users with extra roles remain out of the WWM-only containment target set.

## Vote Reminders
- Vote reminder scope remains manual reminders, safe vote links, manual `Done voting` confirmations, and track-only status/streak reporting.
- No third-party vote automation, CAPTCHA bypass, vote-site browser clicking, vote-site sessions, or result scraping is part of Reaper.
- `npm run check:vote-reminder` and `npm run test:vote-reminder` passed.

## Spotlight Poll
- Native Discord poll behavior remains guarded by `npm run check:spotlight-poll`.
- `npm run test:spotlight-poll` now runs through a minimal Deno import map so `@supabase/supabase-js` resolves in fresh worktrees while keeping the frozen lockfile.
- The unit test confirms the native poll candidate cap, Twills exclusion, safe answer labels, and single-choice payload shape.
- No live poll was posted in this packet.

## ModMail Audit
- ModMail audit validation remains static/unit-test based in this lane.
- The checks cover missing bot, missing Moderator role, missing or public log channel, missing Moderator read permission, missing bot write permission, and unsafe mentionability/mention permission.
- `npm run check:reaper-modmail-audit` and `npm run test:modmail-audit` passed.

## Validation
- `npm run check:discord-reaper-parity`: passed.
- `npm run check:reaper-discord-interactions`: passed.
- `npm run check:reaper-pending-verification`: passed.
- `npm run check:reaper-modmail-audit`: passed.
- `npm run check:vote-reminder`: passed.
- `npm run check:spotlight-poll`: passed.
- `npm run test:vote-reminder`: passed.
- `npm run test:spotlight-poll`: passed.
- `npm run test:modmail-audit`: passed.

## Remaining Live-Read Options
- To perform optional read-only Discord event parity later, use a trusted local shell with `DISCORD_REAPER_PARITY_LIVE=1`, `DISCORD_BOT_TOKEN`, and optionally `DISCORD_GUILD_ID=1078630751077142608`.
- The live checker must not print token values.
- Any apply/sync/register command remains outside this evidence packet unless explicitly approved at action time.
