# Member Workflow QA And Status Verification - 2026-06-10

## Summary
- Packet: `codex/member-workflow-qa-and-status`.
- Scope: production-safe QA documentation, source-level Supabase/member workflow parity, and guardrail coverage.
- Result: added `npm run check:member-workflow-qa` to protect the current member, profile, gallery upload, moderation, and signed-media workflow contracts.
- No live upload, moderation action, Supabase schema change, Edge Function deploy, secret change, Discord mutation, Vercel setting change, Cloudflare setting change, copy rewrite, or route change was performed.

## Source-Level Parity
- Account keeps Discord handle read-only and server-derived.
- Editable profile fields remain limited to display name, game UID, region, timezone, and bio.
- Bio remains capped at `1,000` characters in UI and migration constraints.
- Avatar/banner profile media remains capped at `50 MB` and is moderated before display.
- `/members` and `/members/[slug]` remain members-only Edge Function DTO flows.
- `list-visible-profile-cards` remains the only public-safe profile card exception and returns limited configured-card data.
- Approved gallery feed returns only approved submissions with signed URLs; private Storage paths stay out of browser display.
- Gallery moderation and profile media moderation remain Edge-mediated, moderator-gated workflows.
- `public.handle_new_member_profile()` remains a locked-down security-definer helper, not a browser-callable API.

## Documentation Updates
- Updated `docs/member-workflow-production-qa-runbook.md` to use the current production auth route: `https://mochirii.com/auth`.
- Updated `docs/gallery-guide.md` from the old 39-image baseline to the current 73-image static source and documented runtime approved member submissions.
- Updated `docs/current-live-state.md` to mark Gallery render-window work complete and point to the new member workflow QA guardrail.
- Added `scripts/check-member-workflow-qa.mjs` and wired it into `package.json` plus `scripts/check-all.mjs`.

## Validation
- `npm run check:member-workflow-qa`: passed.
- `git diff --check`: passed with existing CRLF normalization warnings only.
- `npm run check:production`: passed.
- `npm run smoke:supabase-edge-functions`: passed.
- `npm run check`: passed with the known preserved `assets/audio/mochiriiiiii.mp3` size warning only.
- `cd apps/web && npm run lint`: passed.
- `cd apps/web && npm run build`: passed.
- `cd apps/web && npm audit --audit-level=moderate`: passed with `0 vulnerabilities`.
- `npm run smoke:supabase-auth-boundary`: not runnable locally because Playwright is not installed in this workstation runtime.

## Operational Notes
- D02 live OAuth/account smoke and D03 upload/moderation smoke remain operator-gated workflows in `docs/member-workflow-production-qa-runbook.md`.
- Completed private result packets, cleanup notes, screenshots, submission IDs, Storage paths, signed URLs, and account identifiers must stay outside the repository.
- The next planned packet is `codex/discord-reaper-parity`.
