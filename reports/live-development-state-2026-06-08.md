# Live Development State - 2026-06-08

## Production State

- Canonical domain: `https://mochirii.com`
- `www` behavior: `https://www.mochirii.com` redirects to the apex domain.
- Production app: Vercel/Next.js from `apps/web`.
- Rollback/reference surface: root static files and GitHub Pages material remain tracked but are not current production.

## GitHub And Supabase Preview Repair

GitHub showed `Supabase / Supabase Preview` failing on `main` commit `e1fe73f` with:

```text
Remote migration versions not found in local migrations directory.
```

Root cause: an earlier Instagram publishing migration version was represented in remote Supabase migration history, then the local migration was renamed to `20260607125027_add_instagram_gallery_publishing.sql`.

Fix in PR #214:

- Restored the remote-applied timestamp as `supabase/migrations/20260607094500_restore_instagram_gallery_publishing_history.sql`.
- Left the canonical Instagram publishing schema in `supabase/migrations/20260607125027_add_instagram_gallery_publishing.sql`.
- Updated `scripts/check-instagram-gallery-publishing.mjs` so the compatibility migration remains guarded.
- Updated `supabase/README.md` and `docs/deployment.md` with the migration-history rule.

Follow-up evidence from the Supabase SQL editor showed one additional remote-only migration version:

```text
20260608093407 add_manual_instagram_share_status
```

Follow-up fix:

- Restored that remote-applied timestamp as `supabase/migrations/20260608093407_restore_manual_instagram_share_history.sql`.
- Left the canonical manual sharing status schema in `supabase/migrations/20260608173000_add_manual_instagram_share_status.sql`.
- Updated the same guardrail script and source-of-truth docs.

## Final Live Release State - Member Directory Baseline

Previous live `main` head for the member-directory baseline:

```text
2a9973d Add members-only profile directory
```

Merged in this release window:

- PR #214: `Restore Supabase migration history`
- PR #215: `Restore manual share migration history`
- PR #211: `Record meenarii moderator verification state`
- PR #212: `Add Reaper vanity rank role sync`
- PR #216: `Add members-only profile directory`

PR #213 was the earlier stacked member-profile PR. It was closed unmerged after PR #212 merged; the same profile work was rebased onto `main`, reopened as PR #216, and merged from there.

Production checks passed on `2a9973d`:

- `validate`
- `validate-next`
- CodeQL `Analyze (actions)`
- CodeQL `Analyze (javascript-typescript)`
- `Supabase Preview`
- Vercel `build`
- Vercel `deploy`

Live domain smoke passed after deployment:

- `https://mochirii.com` serves the Vercel/Next app.
- `https://www.mochirii.com` redirects to `https://mochirii.com`.
- Clean routes and legacy `.html` redirects passed `scripts/smoke-dns-cutover-post.mjs`.
- `scripts/smoke-vercel-production.mjs` passed for the Vercel fallback URL.
- `https://mochirii.com/members` returns `200 OK`.
- `https://mochirii.com/members/test-profile` resolves through the dynamic profile route.

No active Codex development PRs remain open from this release packet. Older draft PRs #178 and #180 are pre-existing Vercel observability drafts and were not part of this release; observability is already documented as live in `apps/web/README.md` and `reports/vercel-observability-verification-2026-06-08.md`.

Owner-gated actions still require explicit action-time approval:

- Running Discord `/sync-ranks mode:apply confirm:true`
- Any real Instagram API publish action

## Final Live Release State - PR #218

Current live `main` head after the profile identity/media refinement:

```text
079940b Refine member profile identity and media
```

Merged in this follow-up release window:

- PR #218: `Refine member profile identity and media`

PR #218 changed the active member-profile surface so Discord handle is read-only and refreshed from Discord verification, profile bios allow up to 1,000 characters, avatar/banner profile media limits are documented and guarded at 50 MB per file, and profile titles continue to come from verified Discord rank-role mapping.

Production checks passed on `079940b`:

- `validate`
- `validate-next`
- CodeQL
- Vercel production deployment
- GitHub Pages rollback/reference deployment

Live domain smoke passed after deployment:

- `https://mochirii.com/` returns `200 OK` from Vercel.
- `https://mochirii.com/account` returns `200 OK` from Vercel.
- `https://mochirii.com/members` returns `200 OK` from Vercel.
- `https://mochirii.com/members/test-profile` resolves through the dynamic profile route.
- `https://www.mochirii.com/` redirects to `https://mochirii.com/`.

Chrome live smoke confirmed:

- `/account` renders the Discord handle field as read-only with the value sourced from the signed-in Discord account.
- `/account` renders the Bio field with `maxlength="1000"`.
- `/members` loads the members-only directory surface and currently reports no published profiles.
- `/members/test-profile` resolves to the profile route and reports the profile is not published.

Local and network validation after merge:

- `git diff --check`
- `scripts/check-all.mjs` with bundled Node on PATH
- `scripts/check-production.mjs`
- `scripts/smoke-supabase-edge-functions.mjs`
- `apps/web` ESLint via bundled Node
- `apps/web` Next production build via bundled Node

Notes:

- Running `scripts/check-all.mjs` without the bundled Node directory on PATH fails on this workstation because child `node` lookup is unavailable; rerunning with `C:\Users\xtyty\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin` prepended passes.
- Supabase CLI `2.105.0` is installed, but this checkout is not locally linked, so direct `supabase migration list --linked` was not available from the shell. Production Supabase behavior was verified through the live Edge Function contract smoke and live browser behavior instead.
- Stale PRs #178, #180, and #1 were closed after confirming they were superseded or obsolete.
- Remote-tracking refs were pruned and stale local branches were removed. The only remaining local and remote branch is `main`.

## Verification Notes

- GitHub CLI is authenticated as `xartaiusx`.
- Supabase CLI `2.105.0` is available at `C:\Users\xtyty\.bun\install\cache\@supabase\cli-windows-x64@2.105.0@@@1\bin\supabase.exe`, but local CLI auth is not configured in this shell.
- Because the CLI has no local Supabase access token, remote migration history was confirmed through the logged-in Supabase SQL Editor and guarded through local files.

