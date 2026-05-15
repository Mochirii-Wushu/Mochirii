# Next Improvement Goal Progress

Started: 2026-05-15
Source report: `reports/full-site-improvement-review.md`
Baseline main at start: `eab200977a87a379b86a61889f4273c5309795e0`

This tracker records N01 through N05 as separate scoped branches. Protected content, data files, Supabase schema/config, Edge Functions, workflows, and assets remain out of scope unless a later item explicitly allows a tiny validated fix.

## Progress

| ID | Branch | Status | PR | Merge commit | Next |
| --- | --- | --- | --- | --- | --- |
| N01 | `qa/supabase-ci-and-parity-review` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/141> | `019aa3cc50592d419b9cc7d25b7d902788dd27ee` | N02 |
| N02 | `qa/member-workflow-test-account-matrix` | PR open | <https://github.com/Mochirii-Wushu/Mochirii/pull/142> | Pending | N03 |
| N03 | `qa/gallery-approved-feed-regression-matrix` | Pending | Pending | Pending | N04 |
| N04 | `qa/accessibility-name-and-member-pages-review` | Pending | Pending | Pending | N05 |
| N05 | `qa/content-schema-and-style-guardrails` | Pending | Pending | Pending | Final validation |

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
- Current state: report drafted, validated, and opened as PR #142; merge pending.
- Blockers or limitations: live positive-path OAuth, role verification, upload, moderation, and cleanup require approved test credentials and explicit mutation boundaries.
