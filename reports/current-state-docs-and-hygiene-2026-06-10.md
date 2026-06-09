# Current State Docs And Branch Hygiene - 2026-06-10

## Summary

This report records Packet 1 of the full-stack improvement plan: current-state documentation cleanup and local branch hygiene. No app behavior, public copy, protected content, routes, images, Supabase schema, Discord settings, Cloudflare settings, Vercel settings, or secrets changed in this packet.

## Branch Hygiene

Working branch:

- `codex/current-state-docs-and-hygiene`
- Base: `origin/main` at `78da5f3 Fix events image aspect ratio`

Before cleanup, the checkout was on `codex/events-image-ratio-fix` tracking a gone remote branch. Local `main` is checked out in the sibling worktree `C:\Users\xtyty\Documents\Mochirii-discord-upload-hotfix`, so this packet branched directly from `origin/main`.

Deleted local-only stale branches whose remote branches were gone and whose release titles are present on current `origin/main` history:

- `codex/discord-event-covers-recurrence`
- `codex/events-board-scroll-panel`
- `codex/events-image-ratio-fix`
- `codex/events-page-discord-schedule-sync`
- `codex/replace-discord-event-cover-panels`
- `codex/sitewide-visual-quality-polish`

Preserved branch:

- `feature/discord-vote-reminder`, because it still tracks `origin/feature/discord-vote-reminder`.

## Documentation Changes

- Updated `apps/web/README.md` so active app docs say production CSP is enforced with `Content-Security-Policy`.
- Added `docs/current-live-state.md` as the short index for current production truth across Vercel, Supabase, Discord/Reaper, Cloudflare, GitHub checks, observability, and known improvement queue items.
- Left historical reports intact. Reports may still mention report-only CSP where they describe earlier rollout phases.

## Guardrail Changes

- Extended `scripts/check-security-hardening.mjs` to read `apps/web/README.md` and `docs/current-live-state.md`.
- Added stale-active-doc checks for phrases that would incorrectly claim the current or production CSP is report-only.

## Validation Results

Completed locally on 2026-06-10:

- `git diff --check`: passed. Git printed CRLF working-copy warnings for edited text files only.
- `npm run check`: passed. Known warning: `assets/audio/mochiriiiiii.mp3` is 5.20 MB and intentionally preserved.
- `npm run check:production`: passed.
- `npm run smoke:supabase-edge-functions`: passed.
- `cd apps/web && npm run lint`: passed.
- `cd apps/web && npm run build`: passed with Next.js 16.2.6.
- `cd apps/web && npm audit --audit-level=moderate`: passed with 0 vulnerabilities.

## Remaining Improvement Packets

The next packet should be `codex/security-gates-and-headers`: investigate the live wildcard CORS header, run a CSP browser pass, and tighten GitHub/security gates without changing provider settings unless explicitly approved.
