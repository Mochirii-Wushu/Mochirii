# Manual Instagram Share Queue - 2026-06-08

## Summary

This packet changes the near-term Instagram workflow from direct Meta API publishing to a moderator-controlled manual share packet. Website and Discord opt-in behavior remains unchanged: approval creates an Instagram Queue job only when the member explicitly opted in. Moderators can now download the image, copy caption and alt text, post manually from the official Instagram account or Meta Business Suite, and mark the job `shared_manually`.

The official Meta API publishing function remains in the repo for the future, but the Leader Dashboard labels that path unavailable until Meta developer registration and `INSTAGRAM_*` Supabase secrets are ready.

## Implemented

- Added Supabase migration `20260608173000_add_manual_instagram_share_status.sql`.
- Added Edge Function `mark-instagram-gallery-submission-shared` with moderator auth, `confirmManualShare:true`, and no Meta/Instagram credential usage.
- Added `shared_manually` queue status and audit event action.
- Updated Next and rollback Leader Dashboard flows with:
  - Download image
  - Copy caption
  - Copy alt text
  - Optional Instagram permalink
  - Optional moderator note
  - Mark shared manually
  - Disabled `Meta API unavailable` button
- Updated validation scripts and docs/runbooks so manual sharing is documented as current launch mode.

## Verification To Run

```text
git diff --check
node scripts/check-instagram-gallery-publishing.mjs
node scripts/smoke-supabase-edge-functions.mjs
node scripts/check-production.mjs
cd apps/web && node node_modules/eslint/bin/eslint.js .
cd apps/web && node node_modules/next/dist/bin/next build
```

Use the bundled Node runtime if the workstation resolves `node.exe` to the blocked WindowsApps stub.

## Verification Completed

Local checks passed on 2026-06-08:

- `git diff --check`
- `node scripts/check-instagram-gallery-publishing.mjs`
- `node scripts/smoke-supabase-edge-functions.mjs`
- `node scripts/check-production.mjs`
- `node scripts/check-all.mjs`
- `cd apps/web && node node_modules/eslint/bin/eslint.js .`
- `cd apps/web && node node_modules/next/dist/bin/next build`

`scripts/check-all.mjs` reported the existing large-asset warning for `assets/audio/mochiriiiiii.mp3` only. A first parallel run of `check-all` raced with `next build` while `.next` was being rewritten; the sequential rerun passed.

## Provider Evidence

- Supabase production project: `deyvmtncimmcinldjyqe`.
- Production migration list includes `add_manual_instagram_share_status` as version `20260608093407`.
- Edge Function `mark-instagram-gallery-submission-shared` is active in production at version `1`, with `verify_jwt=true`.
- Edge Function contract smoke passes against production and confirms protected functions fail closed without auth.
- `list-instagram-publish-queue` remains active. The source in this packet includes `shared_manually`; the dashboard also requests `all` and filters locally for the `Shared manually` tab so the UI remains compatible if an older deployed queue-reader version is still serving.

## Release Notes

- Requires normal Supabase migration deployment before production can store `shared_manually`.
- Requires deployment of `mark-instagram-gallery-submission-shared` before the live dashboard button can succeed.
- The production migration and manual-share function were deployed during this pass.
- No Instagram token, account ID, API version, or Meta secret is needed for manual mode.
- No live Instagram post is performed by this code path.
- Future direct API publishing still requires Meta developer verification and Supabase-only `INSTAGRAM_*` secrets.
