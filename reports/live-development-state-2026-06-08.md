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

## Current Open Development Packets

These remain PR-gated until merged and deployed:

- PR #211: `Record meenarii moderator verification state`
- PR #212: `Add Reaper vanity rank role sync`
- PR #213: `Add members-only profile directory`, stacked on PR #212

Owner-gated actions still require explicit action-time approval:

- Running Discord `/sync-ranks mode:apply confirm:true`
- Deploying new production Supabase migrations/functions for member profiles if not handled by the GitHub/Supabase integration
- Any real Instagram API publish action

## Verification Notes

- GitHub CLI is authenticated as `xartaiusx`.
- Supabase CLI `2.105.0` is available at `C:\Users\xtyty\.bun\install\cache\@supabase\cli-windows-x64@2.105.0@@@1\bin\supabase.exe`, but local CLI auth is not configured in this shell.
- Because the CLI has no local Supabase access token, remote migration history was inferred from Git history plus the Supabase Preview error and guarded through local files.

