# Content Validation Automation Goal Progress

Started: 2026-05-15
Baseline main at start: `a93c210838517d8aeef55f2957d660962c9dfef9`

Source reports:

- `reports/full-site-improvement-review.md`
- `reports/next-improvement-goal-progress.md`
- `reports/accessibility-name-and-member-pages-review.md`
- `reports/content-schema-and-style-guardrails.md`
- `reports/gallery-approved-feed-regression-matrix.md`
- `reports/home-dynamic-card-accessible-names.md`
- `reports/home-dynamic-card-accessible-names-review.md`

This tracker records the content validation automation milestone as scoped branches plus one baseline tag. Protected content, data files, Supabase schema/config, Edge Functions, workflows, CSS, public copy, Gallery images, Gallery captions/categories/tags, and production data remain out of scope.

## Progress

| ID | Branch or tag | Status | PR | Merge commit or tag object | Next |
| --- | --- | --- | --- | --- | --- |
| B01 | `qa/gallery-approved-feed-smoke-automation` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/150> | `adff8dbbaeb293cedd27efdc97dc9534f947993c` | B02 |
| B02 | `qa/protected-content-hash-checks` | In progress | Pending | Pending | B03 |
| B03 | `qa/json-schema-style-guardrails` | Pending | Pending | Pending | B04 |
| B04 | `qa/post-guardrails-regression-review` | Pending | Pending | Pending | B05 |
| B05 | `v2.8.0-content-validation-automation-baseline` | Pending | n/a | Pending | Final validation |

## B01 Notes

- Branch: `qa/gallery-approved-feed-smoke-automation`
- Report: `reports/gallery-approved-feed-smoke-automation.md`
- PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/150>
- Merge commit: `adff8dbbaeb293cedd27efdc97dc9534f947993c`
- Current state: complete.
- Planned automation: local Playwright smoke with a mocked Supabase browser client for approved-feed success and failure paths.
- Validation summary: `npm run smoke:gallery-approved-feed`, branch validation, CI validation, and post-merge validation passed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Blockers or limitations: none.
- Next item: B02 `qa/protected-content-hash-checks`.

## B02 Notes

- Branch: `qa/protected-content-hash-checks`
- Report: `reports/protected-content-hash-checks.md`
- Current state: in progress.
- Planned automation: SHA-256 protected-content hash check wired into `npm run check`.
- Validation summary: `npm run check:protected-content` and standard branch validation passed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Blockers or limitations: none so far.
