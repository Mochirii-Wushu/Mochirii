# CI Release Ladder Hardening - 2026-06-13

## Summary

This packet narrows the gap between CI and the live-domain release ladder without adding provider mutations to pull requests.

The existing required PR checks already covered root validation, Deno-backed Supabase Edge type checks through `npm run check`, Next lint/build, Vercel Preview, CodeQL, Supabase Preview, and `git diff --check`. The remaining gap was the scheduled/manual production smoke workflow: it ran only `check:production`, while the actual post-merge release ladder also uses Vercel route smoke, Supabase Edge contract smoke, and custom-domain/DNS smoke.

## Changes

- Added `npm run check:ci-release-ladder`.
- Included the new guard in `npm run check`.
- Expanded `.github/workflows/production-smoke.yml` to run:
  - `npm run check:production`
  - `npm run smoke:vercel-production -- --base-url=https://mochirii.com`
  - `npm run smoke:supabase-edge-functions`
  - `npm run smoke:dns-cutover-post -- --base-url=https://mochirii.com --www-mode=redirect`
- Updated `docs/deployment.md` with the scheduled/manual production smoke sequence and CI boundary.

## Safety Boundary

The workflow is read-only. It does not apply Supabase migrations, deploy Supabase Edge Functions, register Discord commands, run Discord apply actions, deploy Fly apps, mutate Vercel settings, or perform Enjin funded-chain work.

Network-unavailable Supabase Edge contract checks are allowed to skip cleanly in the script because GitHub runner networking can be transient. Contract failures from reachable Edge Functions still fail.

## Validation Intent

`check:ci-release-ladder` guards against accidental regression in:

- static PR validation
- Deno/Supabase Edge type-check availability
- whitespace error checks
- Next app install/lint/build coverage
- scheduled/manual production smoke coverage
- documentation of the CI/provider boundary
