# Monthly Schedule, Profile Spotlight, Spotify, And Reaper Event Sync

## Current Packet

- Branch: `codex/monthly-schedule-profile-event-sync`
- Scope: website schedule derivation, public-safe profile cards, Spotify layout, Reaper event-sync command, docs, and guardrails.
- No image assets, Supabase secrets, Vercel dashboard settings, DNS records, or Discord live event mutations are changed by the repo commit.

## Source Of Truth

- Schedule source: `data/guild-schedule.json`
- Next public mirror: `apps/web/public/data/guild-schedule.json`
- Profile card public function: `list-visible-profile-cards`
- Discord event sync command: `/sync-events mode:<preview|apply> confirm:<true|false>`

## Website Behavior

- Home monthly gathering and raffle dates derive from the next UTC+8 first Saturday.
- Raffles uses the same monthly raffle date.
- Spotlight date derives from the first day of the current UTC+8 month.
- Events shows Hero's Realm as the next Friday, 10 PM - 11 PM UTC+8.
- Announcements derives the weekly schedule lines from the shared schedule source.
- Spotify embeds are two columns on desktop/tablet and one column on mobile.
- Public spotlight/profile cards only show configured published profiles with approved avatar media.

## Live Gates

- Deploy `list-visible-profile-cards` and `reaper-discord-interactions` after PR merge.
- Register or update `/sync-events` in Discord.
- Run `/sync-events mode:preview confirm:false` after live deployment.
- Run `/sync-events mode:apply confirm:true` only after clean preview evidence and fresh owner approval.

## Validation Plan

- `git diff --check`
- `npm run check`
- `npm run check:production`
- `npm run check:reaper-discord-interactions`
- `npm run smoke:supabase-edge-functions`
- `cd apps/web && npm run lint && npm run build`
- Browser QA for `/`, `/raffles`, `/spotlight`, `/leaders`, `/spotify`, `/announcements`, and `/events`.
