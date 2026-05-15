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
| B02 | `qa/protected-content-hash-checks` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/151> | `d162a715046cfe5f6fc243d9cd79b45f92f95ca6` | B03 |
| B03 | `qa/json-schema-style-guardrails` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/152> | `9249c861f4417eca9b2210615e4f6a2da980fcb5` | B04 |
| B04 | `qa/post-guardrails-regression-review` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/153> | `cfe4488dde6f55310b9680d11ebf7e075943638b` | B05 |
| B05 | `v2.8.0-content-validation-automation-baseline` | Complete | n/a | `1f624aff15043616e9f5d3584a42beb95ea5a8bc` | Final validation |

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
- PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/151>
- Merge commit: `d162a715046cfe5f6fc243d9cd79b45f92f95ca6`
- Current state: complete.
- Planned automation: SHA-256 protected-content hash check wired into `npm run check`.
- Validation summary: `npm run check:protected-content`, branch validation, CI validation, and post-merge validation passed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Blockers or limitations: none.
- Next item: B03 `qa/json-schema-style-guardrails`.

## B03 Notes

- Branch: `qa/json-schema-style-guardrails`
- Report: `reports/json-schema-style-guardrails.md`
- PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/152>
- Merge commit: `9249c861f4417eca9b2210615e4f6a2da980fcb5`
- Current state: complete.
- Planned automation: objective content guardrails wired into `npm run check`.
- Validation summary: `npm run check:content`, `npm run check:protected-content`, branch validation, CI validation, post-merge validation, and `npm run smoke:gallery-approved-feed` passed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Blockers or limitations: none.
- Next item: B04 `qa/post-guardrails-regression-review`.

## B04 Notes

- Branch: `qa/post-guardrails-regression-review`
- Report: `reports/post-guardrails-regression-review.md`
- PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/153>
- Merge commit: `cfe4488dde6f55310b9680d11ebf7e075943638b`
- Current state: complete.
- Review summary: guardrail wiring is stable, failures are actionable, subjective content checks are deferred, browser smokes remain explicit, and public site validation still passes.
- Validation summary: `npm run check:protected-content`, `npm run check:content`, `npm run smoke:gallery-approved-feed`, full standard branch validation, CI validation, post-merge validation, and public smoke checks passed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Blockers or limitations: none.
- Next item: B05 `v2.8.0-content-validation-automation-baseline`.

## B05 Notes

- Tag: `v2.8.0-content-validation-automation-baseline`
- Tag object: `1f624aff15043616e9f5d3584a42beb95ea5a8bc`
- Tagged commit: `cfe4488dde6f55310b9680d11ebf7e075943638b`
- Current state: complete.
- Validation summary: pre-tag `npm run check`, `git diff --check`, `npm run check:production`, `npm run smoke:gallery`, `npm run check:protected-content`, `npm run check:content`, and `npm run smoke:gallery-approved-feed` passed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Blockers or limitations: none.
- Next item: final validation and milestone summary.
