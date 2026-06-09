# Monthly Schedule, Profile Spotlight, Spotify, And Reaper Event Sync

## Current Packet

- Branch: `codex/monthly-schedule-profile-event-sync`
- PR: `#228`
- Merged commit: `218a845 Add schedule-driven events and profile cards`
- Vercel production deployment: `https://vercel.com/mochirii/mochirii/ARsbjqkWxjLCZGX9YG3THKyoRVpf`
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

- Vercel production is deployed from `main` at commit `218a845`.
- Production `list-visible-profile-cards` responded `200 OK` with a safe empty profile-card result for `meenari`.
- `reaper-discord-interactions` contract smoke passed against production.
- Discord `/sync-events` command registration is still pending because the local token file `C:\Users\xtyty\Desktop\DC Bot.txt` was not present during the release pass.
- `/sync-events mode:preview confirm:false` has not been run live yet.
- `/sync-events mode:apply confirm:true` was not run; live Discord Scheduled Event mutation remains gated behind clean preview evidence and fresh owner approval.

## Validation Completed

- `git diff --check`
- `npm run check`
- `npm run check:production`
- `npm run check:reaper-discord-interactions`
- `npm run smoke:supabase-edge-functions`
- `cd apps/web && npm run lint && npm run build`
- GitHub PR checks: `validate`, `validate-next`, `CodeQL`, `Supabase Preview`, and `Vercel`.
- Vercel preview browser QA for `/`, `/raffles`, `/spotlight`, `/leaders`, `/spotify`, `/announcements`, and `/events`.
- Live browser QA for `/`, `/raffles`, `/spotlight`, `/leaders`, `/spotify`, `/announcements`, and `/events` at `390` and `1440` viewport widths.
- Live route headers returned `200` with `Server: Vercel` for `/`, `/raffles`, `/spotlight`, `/leaders`, `/spotify`, `/announcements`, and `/events`.

## Live Smoke Notes

- Home and Raffles show the derived next UTC+8 first Saturday date, currently `07/04/2026`.
- Spotlight shows the first day of the current UTC+8 month, currently `June 01, 2026`.
- Announcements show `Breaking Army` and `Showdown` at `10 PM - 12 AM`.
- Events shows `Guild Hero's Realm` at `10 PM - 11 PM`.
- Spotify is two columns on desktop and one column at the mobile media query. A focused `390px` check returned `grid-template-columns: 301.6px`.
- Leaders shows only the available Twills `Open profile` link until other configured leader profiles are published and filled.
