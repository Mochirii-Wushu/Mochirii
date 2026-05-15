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
| C01 | `qa/supabase-public-config-and-secret-guardrails` | In progress | Pending | Pending | C02 |
| C02 | `qa/supabase-auth-boundary-smoke` | Pending | Pending | Pending | C03 |
| C03 | `qa/supabase-edge-function-contract-smoke` | Pending | Pending | Pending | C04 |
| C04 | `docs/supabase-manual-parity-runbook` | Pending | Pending | Pending | C05 |
| C05 | `qa/post-supabase-parity-hardening-regression` | Pending | Pending | Pending | C06 |
| C06 | `v2.9.0-supabase-parity-hardening-baseline` | Pending | n/a | Pending | Final validation |

## C01 Notes

- Branch: `qa/supabase-public-config-and-secret-guardrails`
- Report: `reports/supabase-public-config-and-secret-guardrails.md`
- Current state: in progress.
- Planned automation: local secret/public-config scanner wired into `npm run check`.
- Validation summary: `npm run check:supabase-config`, full standard branch validation, and both Gallery smokes passed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Blockers or limitations: none so far.
