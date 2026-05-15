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
| C03 | `qa/supabase-edge-function-contract-smoke` | In progress | Pending | Pending | C04 |
| C04 | `docs/supabase-manual-parity-runbook` | Pending | Pending | Pending | C05 |
| C05 | `qa/post-supabase-parity-hardening-regression` | Pending | Pending | Pending | C06 |
| C06 | `v2.9.0-supabase-parity-hardening-baseline` | Pending | n/a | Pending | Final validation |

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
- Current state: in progress.
- Planned automation: explicit network smoke for protected function fail-closed responses and public approved-feed response shape.
- Validation summary: `npm run smoke:supabase-edge-functions`, full standard branch validation, `npm run check:supabase-config`, `npm run smoke:supabase-auth-boundary`, and both Gallery smokes passed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Blockers or limitations: none so far.
