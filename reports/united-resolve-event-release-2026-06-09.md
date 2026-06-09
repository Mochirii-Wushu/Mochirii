# United Resolve Event Release

## Scope

- Branch: `codex/add-united-resolve-event`
- Source of truth: `data/guild-schedule.json`
- Public mirror: `apps/web/public/data/guild-schedule.json`
- Event page data: `data/events.json`
- Discord sync command: `/sync-events mode:<preview|apply> confirm:<true|false>`

## Intended Behavior

- `United Resolve` appears on the Events page as a Friday recurring event.
- Time: `11 PM - 12 AM UTC+8`.
- Discord event key: `united-resolve-5`.
- Discord external event location: `https://mochirii.com/events`.
- Announcements weekly schedule does not include United Resolve.

## Verification Plan

- Run schedule, JSON mirror, production, Reaper, lint, and build checks.
- Browser-smoke `/events`, `/announcements`, and `/spotify`.
- Release through GitHub PR and Vercel production.
- After production serves `united-resolve` from `/data/guild-schedule.json`, run Reaper event sync preview, then apply only after preview is clean.

## Local Verification

- `npm run check:guild-schedule`: passed.
- `npm run check:next-public-sync`: passed.
- `git diff --check`: passed.
- `npm run check`: passed with the existing large-audio warning for `assets/audio/mochiriiiiii.mp3`.
- `npm run check:production`: passed.
- `npm run check:reaper-discord-interactions`: passed.
- `cd apps/web && npm run lint`: passed.
- `cd apps/web && npm run build`: passed.
- Local rendered route smoke:
  - `/events`: contains `United Resolve` and `11 PM - 12 AM`.
  - `/announcements`: does not contain `United Resolve`; keeps the approved weekly schedule lines.
  - `/spotify`: still renders Spotify iframe embeds and does not contain `United Resolve`.

## Browser Note

The in-app browser blocked localhost with `ERR_BLOCKED_BY_CLIENT`, and Chrome automation was unavailable in this Codex session. Vercel Preview and production browser verification remain the authoritative visual gates after push.

## Pending Live Evidence

- PR: `#233` (`https://github.com/Mochirii-Wushu/Mochirii/pull/233`).
- Branch commit: `95cd5ea Add United Resolve event`.
- Vercel Preview: Ready at `https://mochirii-git-codex-add-united-resolve-event-mochirii.vercel.app`, but deployment-protected for anonymous HTTP checks.
- Merge commit: pending.
- Vercel production deployment: pending.
- Discord event ID: pending.
- Discord sync result: pending.
