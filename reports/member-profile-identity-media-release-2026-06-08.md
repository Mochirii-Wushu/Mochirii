# Member Profile Identity And Media Release - 2026-06-08

## Summary

PR #218 was merged and released to the live Vercel/Next production site at `https://mochirii.com`.

Release commit:

```text
079940b Refine member profile identity and media
```

## Changes Released

- Discord handle is displayed from verified Discord account data and is not editable in the Account form.
- Profile bios allow up to 1,000 characters.
- Avatar and banner profile media remain moderator-reviewed and are guarded/documented at 50 MB per file.
- Member profile display surfaces filled safe fields and keeps title display tied to verified Discord rank-role mapping.
- Guardrail docs and validation scripts were updated with the identity/media rules.

## Verification

GitHub and deployment:

- PR #218 merged to `main`.
- `validate`, `validate-next`, CodeQL, GitHub Pages rollback/reference deployment, and Vercel production completed successfully.
- Vercel deployment status URL: `https://vercel.com/mochirii/mochirii/4kNcNZ46zaBySgSWjaVycVywgEU6`.

Local checks:

- `git diff --check`
- `scripts/check-all.mjs` with bundled Node on PATH
- `scripts/check-production.mjs`
- `scripts/smoke-supabase-edge-functions.mjs`
- `apps/web` ESLint via bundled Node
- `apps/web` Next production build via bundled Node

Live HTTP smoke:

- `https://mochirii.com/` returned `200 OK` with `Server: Vercel`.
- `https://mochirii.com/account` returned `200 OK` with `Server: Vercel`.
- `https://mochirii.com/members` returned `200 OK` with `Server: Vercel`.
- `https://mochirii.com/members/test-profile` resolved through `/members/[slug]`.
- `https://www.mochirii.com/` returned `308` to `https://mochirii.com/`.

Live Chrome smoke:

- `/account` showed the Discord handle as a read-only field.
- `/account` showed the Bio field with a 1,000 character limit.
- `/members` loaded the signed-in member directory surface and showed no published profiles.
- `/members/test-profile` loaded the dynamic profile route and showed the unpublished-profile state.

## Branch Cleanup

- Closed stale PR #178 because Web Analytics is already installed, documented, and live.
- Closed stale PR #180 because Speed Insights is already installed, documented, and live.
- Closed stale PR #1 because the old task-backlog PR is obsolete.
- Deleted stale local branches after confirming their PRs were merged, superseded, or obsolete.
- Pruned remote-tracking refs.

Current branch state:

- Local: `main`
- Remote: `origin/main`

## Remaining Owner-Gated Actions

- Any live member workflow mutation beyond read-only smoke still requires explicit approval.
- Discord rank-role sync apply remains owner-gated.
- Any real Instagram API publish remains owner-gated.
