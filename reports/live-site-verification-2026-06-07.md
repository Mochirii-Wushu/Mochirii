# Live Site Verification - 2026-06-07

## Summary

`https://mochirii.com` is live on the Vercel/Next.js app from `apps/web`. `https://www.mochirii.com` redirects to the apex domain. Root static GitHub Pages files and the tracked `CNAME` remain rollback/reference material only.

No DNS, Supabase, Discord, GitHub Pages, Vercel dashboard, or live data mutations were made during this docs/source-of-truth pass.

## Merged PRs

- PR #196, `Add guild site quality audit`, merged to `main` at `63c8194b3b72da0e7805f0caa2bec6514d714467`.
- PR #195, `Clean guild shell emblem treatment`, merged to `main` at `c6112197444fc9d986d57702b422b9d5510f9668`.
- Main head verified after those merges: `c6112197444fc9d986d57702b422b9d5510f9668`.

## GitHub And Vercel Evidence

- GitHub Actions on `main` after PR #195: `Validate static site` passed.
- GitHub Actions on `main` after PR #195: `Validate Next app` passed.
- GitHub Actions on `main` after PR #195: CodeQL passed.
- Vercel commit status for `c6112197444fc9d986d57702b422b9d5510f9668` passed.
- Vercel deployment evidence: `https://vercel.com/mochirii/mochirii/7FVZC5Nm7HA582D2kuujghqfhMFE`.

## Live Domain Evidence

Observed from the local workstation after the PR #195 production deployment:

- `https://mochirii.com/`: HTTP `200`, `Server: Vercel`, `X-Vercel-Cache: PRERENDER`.
- `https://www.mochirii.com/`: HTTP `308`, `Location: https://mochirii.com/`, `Server: Vercel`.
- Apex DNS answer: `mochirii.com A 76.76.21.21`.
- `www` DNS answer: `www.mochirii.com CNAME c4b58a30d23b9df3.vercel-dns-017.com`.

## Route Verification Scope

Primary Vercel/Next routes are now the clean routes:

- `/`
- `/join`
- `/gallery`
- `/auth`
- `/account`
- `/gallery-submit`
- `/leader-dashboard`

Legacy `.html` paths remain redirect checks through `apps/web/next.config.ts`, not the primary production route shape.

## Local Validation

Commands run for this docs branch:

- `git diff --check`: passed. Git reported only expected local line-ending warnings.
- Bundled Node fallback: `node scripts/check-refs.mjs`: passed, `749` references checked.
- Bundled Node fallback: `node scripts/check-json.mjs`: passed, `16` JSON files checked.
- Bundled Node fallback: `node scripts/check-protected-content.mjs`: passed, `4` protected fields checked.
- Bundled Node fallback: `node scripts/check-production.mjs`: passed.
- Bundled Node fallback: `node scripts/smoke-supabase-edge-functions.mjs`: passed.
- Bundled Node fallback: `node scripts/smoke-dns-cutover-post.mjs --base-url=https://mochirii.com --www-mode=redirect`: passed. Clean routes returned `200`; legacy `.html` paths returned `308` to clean routes; `www` redirected to apex.
- `cd apps/web && node node_modules/eslint/bin/eslint.js .`: passed.
- `cd apps/web && node node_modules/next/dist/bin/next build`: passed; `20` static pages generated.
- `npm run check`: blocked locally because `npm` is not installed on this workstation path. GitHub Actions remains the canonical aggregate `npm ci`/Deno validation gate.

Local `npm`, Deno, Playwright, and Lighthouse gaps remain workstation/toolchain issues when they appear locally. GitHub Actions remains the canonical clean `npm ci`, Deno-backed validation, lint, and build gate until the workstation is repaired.

## Browser Viewport Evidence

In-app browser viewport smoke passed for `35` route/viewport combinations:

- Widths: `360`, `390`, `768`, `1024`, and `1440`.
- Routes: `/`, `/join`, `/gallery`, `/auth`, `/account`, `/gallery-submit`, and `/leader-dashboard`.
- Checks: document title present, exactly one `h1`, header/main/footer rendered, at least one focusable control/link, and no horizontal overflow.

## Rollback And Reference State

- Root static files remain in the repository.
- The tracked `CNAME` remains available as rollback/reference material.
- GitHub Pages-specific docs and scripts should be treated as rollback/reference unless a later approved task retires or rewrites them.
- No rollback action was needed during this verification pass.

## Remaining Follow-Ups

- Keep tracking the open Dependabot `postcss` alert as a separate dependency task.
- Confirm any duplicate Vercel `web` project/status posting is cleaned up in the dashboard before using duplicate Vercel contexts as release evidence.
- Decide later, after stabilization, whether to retire GitHub Pages/root static rollback artifacts.
- Reconfirm Supabase redirect allowlist and Discord OAuth callback settings in their dashboards before any future auth/provider mutation.
