# Next Improvement Goal Progress

Started: 2026-05-15
Source report: `reports/full-site-improvement-review.md`
Baseline main at start: `eab200977a87a379b86a61889f4273c5309795e0`

This tracker records N01 through N05 as separate scoped branches. Protected content, data files, Supabase schema/config, Edge Functions, workflows, and assets remain out of scope unless a later item explicitly allows a tiny validated fix.

## Progress

| ID | Branch | Status | PR | Merge commit | Next |
| --- | --- | --- | --- | --- | --- |
| N01 | `qa/supabase-ci-and-parity-review` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/141> | `019aa3cc50592d419b9cc7d25b7d902788dd27ee` | N02 |
| N02 | `qa/member-workflow-test-account-matrix` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/142> | `4504d37962c9e0ca828d4b1c21954d2fadb4dd16` | N03 |
| N03 | `qa/gallery-approved-feed-regression-matrix` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/143> | `2dc9a1b00adf8ed6d2dfbcd3eb953918cc496e79` | N04 |
| N04 | `qa/accessibility-name-and-member-pages-review` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/144> | `49fd1784d2ae6ccd889c8e16ef28143d3b7deb2a` | N05 |
| N05 | `qa/content-schema-and-style-guardrails` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/145> | `f7453666d6236d1e2cd269a8e4a509d36c981e0a` | Final validation |

## N01 Notes

- Branch: `qa/supabase-ci-and-parity-review`
- Report: `reports/supabase-ci-and-parity-review.md`
- Current state: complete and merged.
- Merge commit: `019aa3cc50592d419b9cc7d25b7d902788dd27ee`
- Validation summary: `npm run check`, `git diff --check`, individual JSON/JS/ref/asset checks, `npm run check:production`, `npm run smoke:gallery`, read-only Supabase parity checks, public fail-closed probes, protected diff checks, and post-merge validation passed. Known MP3 warning only.
- Blockers or limitations: no blocker found so far. Deno is not installed locally; dashboard-only and live member checks remain credential-gated/manual.
- Safety: no Supabase mutation, no Edge Function deployment, no data/protected content changes, no secrets.

## N02 Notes

- Branch: `qa/member-workflow-test-account-matrix`
- Report: `reports/member-workflow-test-account-matrix.md`
- Current state: complete and merged.
- Merge commit: `4504d37962c9e0ca828d4b1c21954d2fadb4dd16`
- Validation summary: `npm run check`, `git diff --check`, individual JSON/JS/ref/asset checks, `npm run check:production`, `npm run smoke:gallery`, local and production signed-out member page checks, production OAuth redirect-start check, protected diff checks, and post-merge validation passed. Known MP3 warning only.
- Blockers or limitations: live positive-path OAuth, role verification, upload, moderation, and cleanup require approved test credentials and explicit mutation boundaries.

## N03 Notes

- Branch: `qa/gallery-approved-feed-regression-matrix`
- Report: `reports/gallery-approved-feed-regression-matrix.md`
- Current state: complete and merged.
- Merge commit: `2dc9a1b00adf8ed6d2dfbcd3eb953918cc496e79`
- Validation summary: `npm run check`, `git diff --check`, individual JSON/JS/ref/asset checks, `npm run check:production`, `npm run smoke:gallery`, static and approved-feed browser matrices, public approved-feed response shape checks, protected diff checks, and post-merge validation passed. Known MP3 warning only.
- Blockers or limitations: live approved-feed reads are safe, but any pending/rejected leak proof beyond public-source/probe evidence remains constrained by not mutating production data.

## N04 Notes

- Branch: `qa/accessibility-name-and-member-pages-review`
- Report: `reports/accessibility-name-and-member-pages-review.md`
- Current state: complete and merged.
- Merge commit: `49fd1784d2ae6ccd889c8e16ef28143d3b7deb2a`
- Validation summary: `npm run check`, `git diff --check`, individual JSON/JS/ref/asset checks, `npm run check:production`, `npm run smoke:gallery`, local WCAG-focused browser heuristics, mobile menu and dropdown keyboard checks, Gallery lightbox focus checks, protected diff checks, and post-merge validation passed. Known MP3 warning only.
- Blockers or limitations: no P0 blocker found. Live signed-in/verified/moderator accessibility states remain credential-gated; Home dynamic card accessible-name drift was documented for a future scoped fix.

## N05 Notes

- Branch: `qa/content-schema-and-style-guardrails`
- Report: `reports/content-schema-and-style-guardrails.md`
- Current state: complete and merged.
- Merge commit: `f7453666d6236d1e2cd269a8e4a509d36c981e0a`
- Validation summary: `npm run check`, `git diff --check`, individual JSON/JS/ref/asset checks, `npm run check:production`, `npm run smoke:gallery`, protected diff checks, data-shape scans, content-governance scans, and post-merge validation passed. Known MP3 warning only.
- Blockers or limitations: no blocker found. The report documents future implementation branches for protected hash checks, JSON schema validation, content style linting, and stale Gallery guide facts; no data content was changed.

## Final Closeout Notes

- N01 through N05 are complete and merged.
- A tracker-only closeout branch recorded N05's merge commit after PR #145 merged, because a branch cannot know its own future merge commit before merge.
- No protected content, data files, implementation files, assets, workflows, Supabase configuration, migrations, Edge Functions, or secrets were changed during the tracker closeout.
