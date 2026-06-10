# Security Gates And Headers - 2026-06-10

## Summary

This report records Packet 2 of the full-stack improvement plan: app-controlled security header tightening and GitHub gate verification. No public copy, protected content, route paths, images, Supabase schema, Discord settings, Cloudflare DNS, Vercel project settings, or secrets changed in the repo portion of this packet.

## Header Changes

- Live production showed `Access-Control-Allow-Origin: *` on Vercel-served HTML responses.
- Repo search found no existing app-level Next header setting for that wildcard.
- `apps/web/next.config.ts` now sets `Access-Control-Allow-Origin: https://mochirii.com` for the Vercel app routes.
- CSP script policy removed `unsafe-eval` and keeps `unsafe-inline` for the next dedicated browser pass.

## Active Docs Updated

- `SECURITY.md` now states production CSP is enforced.
- `docs/current-live-state.md` now reflects the narrowed CORS header and first CSP tightening step.

## GitHub Gate Targets

Completed GitHub API verification for this packet:

- Keep required status checks: `validate`, `validate-next`, `CodeQL`, `Vercel`, and `Supabase Preview`.
- Enabled strict required status checks so branches must be up to date before merge.
- Required review thread resolution before merge.
- Keep required approval count at `0` for now to avoid blocking the current solo-maintainer release flow; revisit one required approval when a second reviewer is available.
- Verified secret scanning and push protection remain enabled.
- Attempted to enable non-provider secret patterns and validity checks through the GitHub API. The API accepted the request but the repository still reports both settings as disabled, so this remains a dashboard/plan availability item rather than a code blocker.

## Validation Results

Completed locally before PR:

- `git diff --check`: passed. Git printed CRLF working-copy warnings for edited text files only.
- `npm run check`: passed. Known warning: `assets/audio/mochiriiiiii.mp3` is 5.20 MB and intentionally preserved.
- `npm run check:production`: passed.
- `npm run smoke:supabase-edge-functions`: passed.
- `cd apps/web && npm run lint`: passed.
- `cd apps/web && npm run build`: passed with Next.js 16.2.6.
- `cd apps/web && npm audit --audit-level=moderate`: passed with 0 vulnerabilities.
- Local production server on `http://127.0.0.1:3020`: response headers showed `Access-Control-Allow-Origin: https://mochirii.com` and CSP without `unsafe-eval`.
- In-app browser route pass found no CSP, blocked-script, or unsafe-eval console logs on `/`, `/events`, `/gallery`, `/auth`, `/account`, `/members`, `/gallery-submit`, `/leader-dashboard`, or `/spotify`.

GitHub ruleset readback after update:

- `required_review_thread_resolution`: `true`
- `required_approving_review_count`: `0`
- `strict_required_status_checks_policy`: `true`
- required checks: `validate`, `validate-next`, `CodeQL`, `Vercel`, `Supabase Preview`
- bypass actors: `0`

Post-PR validation still required:

- GitHub checks.
- Vercel Preview route/header smoke.
- Production route/header smoke after merge.
