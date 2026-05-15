# Supabase Parity Hardening Goal Progress

Started: 2026-05-15
Baseline main at start: `055e9b2a5d571c7b4498f3c615c3b01b3c11fa78`

Source reports:

- `reports/full-site-improvement-review.md`
- `reports/next-improvement-goal-progress.md`
- `reports/supabase-ci-and-parity-review.md`
- `reports/supabase-production-security-review.md`
- `reports/supabase-edge-functions-review.md`
- `reports/secrets-and-public-config-review.md`
- `reports/content-validation-automation-goal-progress.md`
- `reports/post-guardrails-regression-review.md`

This tracker records the Supabase parity hardening milestone as scoped branches plus one baseline tag. Protected content, data files, Supabase schema/config, RLS policies, Storage policies, Edge Function deployments, migrations, workflows, CSS, public copy, Gallery images, and production data remain out of scope.

## Progress

| ID | Branch or tag | Status | PR | Merge commit or tag object | Next |
| --- | --- | --- | --- | --- | --- |
| C01 | `qa/supabase-public-config-and-secret-guardrails` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/155> | `8caed644ee7e7879738f87751ff96ea6e1e43114` | C02 |
| C02 | `qa/supabase-auth-boundary-smoke` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/156> | `3076af009da6acd66b5bf51c5180a3a9198bf825` | C03 |
| C03 | `qa/supabase-edge-function-contract-smoke` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/157> | `a17d93fa47d674a01ac5b2fa041c74c9bf9deae7` | C04 |
| C04 | `docs/supabase-manual-parity-runbook` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/158> | `4d830d8340cb31036eaeb80773573874b43d4fe9` | C05 |
| C05 | `qa/post-supabase-parity-hardening-regression` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/159> | `8154dc75069ccb2d5c0d64868307bedf016a4cad` | C06 |
| C06 | `v2.9.0-supabase-parity-hardening-baseline` | Complete | n/a | `fbfd0b030eef70e0ef2981316ec57535c8bebaab` | Final validation |

## C01 Notes

- Branch: `qa/supabase-public-config-and-secret-guardrails`
- Report: `reports/supabase-public-config-and-secret-guardrails.md`
- PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/155>
- Merge commit: `8caed644ee7e7879738f87751ff96ea6e1e43114`
- Current state: complete.
- Planned automation: local secret/public-config scanner wired into `npm run check`.
- Validation summary: `npm run check:supabase-config`, full standard branch validation, CI validation, post-merge validation, and both Gallery smokes passed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Blockers or limitations: none.
- Next item: C02 `qa/supabase-auth-boundary-smoke`.

## C02 Notes

- Branch: `qa/supabase-auth-boundary-smoke`
- Report: `reports/supabase-auth-boundary-smoke.md`
- PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/156>
- Merge commit: `3076af009da6acd66b5bf51c5180a3a9198bf825`
- Current state: complete.
- Planned automation: local signed-out browser smoke with mocked Supabase Auth client.
- Validation summary: `npm run smoke:supabase-auth-boundary`, full standard branch validation, CI validation, post-merge validation, `npm run check:supabase-config`, and both Gallery smokes passed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Blockers or limitations: none.
- Next item: C03 `qa/supabase-edge-function-contract-smoke`.

## C03 Notes

- Branch: `qa/supabase-edge-function-contract-smoke`
- Report: `reports/supabase-edge-function-contract-smoke.md`
- PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/157>
- Merge commit: `a17d93fa47d674a01ac5b2fa041c74c9bf9deae7`
- Current state: complete.
- Planned automation: explicit network smoke for protected function fail-closed responses and public approved-feed response shape.
- Validation summary: `npm run smoke:supabase-edge-functions`, full standard branch validation, `npm run check:supabase-config`, `npm run smoke:supabase-auth-boundary`, both Gallery smokes, CI validation, and post-merge validation passed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Blockers or limitations: none.
- Next item: C04 `docs/supabase-manual-parity-runbook`.

## C04 Notes

- Branch: `docs/supabase-manual-parity-runbook`
- Report: `reports/supabase-manual-parity-runbook.md`
- PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/158>
- Merge commit: `4d830d8340cb31036eaeb80773573874b43d4fe9`
- Current state: complete.
- Planned documentation: durable checklist for dashboard-only, credential-gated, and approval-gated Supabase parity checks.
- Validation summary: full standard branch validation, `npm run check:supabase-config`, `npm run smoke:supabase-auth-boundary`, `npm run smoke:supabase-edge-functions`, both Gallery smokes, CI validation, and post-merge validation passed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Blockers or limitations: none.
- Next item: C05 `qa/post-supabase-parity-hardening-regression`.

## C05 Notes

- Branch: `qa/post-supabase-parity-hardening-regression`
- Report: `reports/post-supabase-parity-hardening-regression.md`
- PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/159>
- Merge commit: `8154dc75069ccb2d5c0d64868307bedf016a4cad`
- Current state: complete.
- Planned review: confirm the Supabase parity scripts and runbook remain safe, local-friendly where intended, non-mutating, and non-brittle.
- Validation summary: full standard branch validation, `npm run check:supabase-config`, `npm run smoke:supabase-auth-boundary`, `npm run smoke:supabase-edge-functions`, both Gallery smokes, CI validation, and post-merge validation passed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Blockers or limitations: none.
- Next item: C06 `v2.9.0-supabase-parity-hardening-baseline`.

## C06 Notes

- Tag: `v2.9.0-supabase-parity-hardening-baseline`
- Tag object: `fbfd0b030eef70e0ef2981316ec57535c8bebaab`
- Tagged commit: `8154dc75069ccb2d5c0d64868307bedf016a4cad`
- Current state: complete.
- Validation summary: pre-tag `npm run check`, `git diff --check`, `npm run check:production`, `npm run smoke:gallery`, `npm run smoke:gallery-approved-feed`, `npm run check:supabase-config`, `npm run smoke:supabase-auth-boundary`, and `npm run smoke:supabase-edge-functions` passed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Blockers or limitations: none.
- Next item: final validation and summary.
