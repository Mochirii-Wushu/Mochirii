# Six-Step Implementation Report - 2026-06-07

## Summary

The six-step packet is implemented through the code, docs, GitHub, Vercel, and Supabase surfaces that are inside this repository's control.

Current live truth:

- `https://mochirii.com` serves the Vercel/Next app from `apps/web`.
- `https://www.mochirii.com` redirects to the apex domain.
- PR #198 is merged and live on `main`.
- Supabase production project `deyvmtncimmcinldjyqe` has the Instagram publishing migration and Edge Functions deployed.
- Reaper slash-command registration, Instagram production secrets, and any real Instagram post remain pending external/operator steps.
- Shopify launch QA is captured in a separate draft PR and still has launch blockers.

No Instagram content was posted. No secret values are recorded here.

## Step 1 - PR #198 Release Packet

Completed.

- PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/198>
- Title: `[codex] Add moderator-controlled Instagram gallery publishing`
- Merge commit: `684d5f054f04242d24f4626107b6f1c1d394bd3f`
- Merged: `2026-06-07T12:53:48Z`
- Final PR checks before merge: `validate`, `validate-next`, CodeQL, Supabase Preview, and Vercel all passed.

The deployment runbook is tracked at [`docs/instagram-gallery-publishing-deployment-runbook.md`](../docs/instagram-gallery-publishing-deployment-runbook.md). The runbook remains useful for future redeployments and for the still-pending Reaper/Meta steps.

## Step 2 - Instagram Deployment Runbook And Supabase Deployment

Completed for repository code and Supabase production infrastructure.

Supabase production evidence:

- Project: `deyvmtncimmcinldjyqe`
- Migration present: `20260607125027 add_instagram_gallery_publishing`
- Existing Gallery functions updated:
  - `verify-discord-member`, active, version `59`, `verify_jwt = true`
  - `list-gallery-review-queue`, active, version `59`, `verify_jwt = true`
  - `moderate-gallery-submission`, active, version `57`, `verify_jwt = true`
  - `list-approved-gallery-submissions`, active, version `58`, `verify_jwt = false`
  - `submit-discord-gallery-image`, active, version `17`, `verify_jwt = false`
- New Instagram functions deployed:
  - `list-instagram-publish-queue`, active, version `1`, `verify_jwt = true`
  - `publish-instagram-gallery-submission`, active, version `1`, `verify_jwt = true`

Fail-closed checks:

- `scripts/smoke-supabase-edge-functions.mjs` passed.
- Unauthenticated `POST` requests to both Instagram queue functions returned `401 Unauthorized`.

Credential handling:

- A temporary Supabase access token was created only to deploy the two new Edge Functions through the Supabase CLI.
- The temporary token was deleted/revoked from the Supabase account token page after deployment.
- The local temporary token file was removed and the shell environment variable was unset.
- No token value is stored in docs, GitHub, Vercel, browser code, or reports.

Still pending:

- Set real `INSTAGRAM_*` secrets in Supabase only after Meta account readiness is confirmed.
- Update/register Reaper's slash command outside this repository.
- Run a dry-run Reaper payload.
- Perform one live Instagram test post only after explicit action-time owner approval.

## Step 3 - Duplicate Vercel Status Noise

Completed.

Chrome dashboard verification showed:

- Duplicate project `mochirii/web` is not connected to a Git repository.
- Canonical project `mochirii/mochirii` is connected to `Mochirii-Wushu/Mochirii`.
- Canonical Root Directory is `apps/web`.
- Canonical Framework Preset is `Next.js`.
- Canonical GitHub commit status posting is enabled.

Fresh PR evidence after the cleanup showed only the canonical `Vercel` status, not a failing `Vercel - web` status.

Current Vercel production evidence for `main`:

- Commit: `684d5f054f04242d24f4626107b6f1c1d394bd3f`
- Commit status: `success`
- Production deployment: <https://vercel.com/mochirii/mochirii/HMqLcxLot19i1MUY2U7L5a9QKrXr>

## Step 4 - Dependabot PR Triage

Completed. Each PR was merged one at a time after required checks passed and Vercel production remained healthy.

- #186 `actions/checkout` 5 -> 6, merge commit `88ae6f1fc7c71682c30cae9f22305383c3cdd7dc`
- #187 `actions/setup-node` 5 -> 6, merge commit `6838cd29fa1434b80ca33ddb288c3581530e9572`
- #188 `actions/upload-artifact` 6 -> 7, merge commit `0eab84320ce09dab2e691354d2fdda7b5e8dffcd`
- #189 `@types/node` 20.19.41 -> 25.9.2, merge commit `6332b3f4ef9bbe2b25487665bf2c32496691b65e`
- #191 `eslint-config-next` 16.2.6 -> 16.2.7, merge commit `a1d46c1068a2eec976ba62d20577261e4764d162`
- #192 `react` and `@types/react`, merge commit `f9bc2bf21274a68f713a63fd6d0db361dbdf9b11`
- #193 `@supabase/supabase-js` 2.105.4 -> 2.107.0, merge commit `66e7bcfff49432fdd46e5020188b474399870fd3`
- #190 `react-dom` 19.2.4 -> 19.2.7, merge commit `a25e0e84db9bda6a228562332f39866f2e919837`

PR #190 was handled after the React peer update from PR #192 made it safe to rebase and validate.

## Step 5 - Shopify Storefront Launch QA

Completed as a verification and evidence pass. No Shopify publish, password removal, checkout, payment, order, domain, inventory, or product-data mutation was performed during this step.

Shopify docs-only PR:

- PR: <https://github.com/Anthyphera/Velesari-Holdings/pull/39>
- Branch: `codex/shopify-launch-qa-evidence`
- Base: `shopify-theme`
- Commit: `d2a1df8 Record Shopify launch QA blockers`
- Status: draft
- Checks: Theme Check, brand-residue, and CodeQL passed.

Authenticated Shopify evidence:

- Active products filter showed `Select all 20 on page`.
- Active products showed vendor `Mochirii` and inventory `Not tracked`.
- Visible product table had no old brand, supplier-name, third-party cosmetics brand, `private label`, or `dropshipping` text.
- `Mōchirīī Daily Care` exists with handle `mochirii-daily-care`.
- `https://shop.mochirii.com/` redirects to `/password`.
- `https://shop.velesari.trade/password` redirects to `https://shop.mochirii.com/password`.

Shopify launch blockers:

- Active products still show category `Uncategorized`.
- Routine collections are not present yet: `routine-cleanse`, `routine-hydrate`, `routine-treat`, `routine-moisturize`, `routine-body`, `routine-hair`, and `routine-makeup`.
- Old or unrelated admin collections still exist and need review: `Exfoliators`, `Body Care`, `Face Care`, `Skin Care Essentials`, `Hydrogen`, `Automated Collection`, `Home page`, `Small Home Supplies`, `Pet Cleanup`, `Cleaning Refills`, and `Household Essentials`.
- Exact Selfnamed mockup comparison remains pending because the Selfnamed profile page redirected to an error page during this session.
- About/contact placeholders remain launch blockers before password removal.

Local Shopify checks:

- `git diff --check`: passed.
- `bun scripts\scan-brand-residue.mjs`: passed.
- `bun scripts\scan-claims.mjs`: passed.
- Cached Shopify CLI `theme check`: passed.
- Cached Shopify CLI `theme package`: passed.

## Step 6 - Cross-Site Source Of Truth

Completed in this report branch.

Updated source-of-truth surfaces:

- [`apps/web/README.md`](../apps/web/README.md)
- [`supabase/README.md`](../supabase/README.md)
- [`docs/instagram-gallery-publishing-deployment-runbook.md`](../docs/instagram-gallery-publishing-deployment-runbook.md)
- [`reports/live-site-verification-2026-06-07.md`](./live-site-verification-2026-06-07.md)
- This final report.

The current production story is:

- Vercel/Next owns `mochirii.com`.
- Supabase owns Auth, Postgres, RLS, Storage, Edge Functions, Discord verification, gallery moderation, and the Instagram queue backend.
- Discord/Reaper remains the external bot surface for slash-command submissions.
- Shopify remains a separate password-gated storefront launch project at `shop.mochirii.com`.

## Live Verification

`https://mochirii.com/`:

- HTTP `200`
- `Server: Vercel`
- `X-Vercel-Cache: HIT`
- `X-Matched-Path: /`

`https://www.mochirii.com/`:

- HTTP `308`
- `Location: https://mochirii.com/`
- `Server: Vercel`

Open PRs remaining in the guild repo:

- #178 Vercel Web Analytics draft, dirty/stale
- #180 Vercel Speed Insights draft, dirty/stale
- #1 old typo/codebase task PR, blocked/stale

## Validation Commands

Guild repo checks run during this sequence:

- `node scripts/check-instagram-gallery-publishing.mjs`
- `node scripts/check-production.mjs`
- `git diff --check`
- `cd apps/web && node node_modules/eslint/bin/eslint.js .`
- `cd apps/web && node node_modules/next/dist/bin/next build`
- `node scripts/smoke-supabase-edge-functions.mjs`
- `curl -I -L https://mochirii.com/`
- `curl -I -L https://www.mochirii.com/`
- `node scripts/check-all.mjs` with bundled Node on `PATH`: all non-Deno child checks passed; `check:supabase-edge-types` was blocked locally because `deno` is not installed on this workstation path.

GitHub checks on merged `main` commit `684d5f054f04242d24f4626107b6f1c1d394bd3f`:

- `Validate static site`: passed.
- `Validate Next app`: passed.
- CodeQL: passed.
- Vercel production deployment: passed.

## Remaining Owner Actions

- Provide or confirm the Reaper bot repository/runtime so `/submit` can be updated with `share_to_instagram`.
- Register the updated Reaper command and run a non-live dry-run payload.
- Confirm the official Instagram account, Meta app permissions, and Supabase `INSTAGRAM_*` secrets.
- Approve one live Instagram test post only when ready.
- Finish Shopify product categories, routine collections, old collection cleanup, exact Selfnamed image comparison, and placeholder About/Contact content before password removal.
- Decide later whether to close or refresh stale Vercel analytics PRs #178 and #180.
