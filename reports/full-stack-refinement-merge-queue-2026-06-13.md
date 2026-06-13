# Full-Stack Refinement Merge Queue Snapshot

Generated: 2026-06-13T03:24Z

This report is intentionally no-secret. It summarizes the current Mochirii refinement PR stack, likely merge conflicts, and a safe review order for the live-domain backlog. It records PR numbers, branches, touched paths, and status labels only. It does not include tokens, cookies, service-role keys, Discord bot tokens, webhook URLs, provider dashboard screenshots, private account data, or raw logs.

## Source Basis

- Current GitHub PR state from `gh pr list --state open --limit 50`.
- Current PR file lists from `gh pr view <number> --json files`.
- GitHub protected-branch/review concepts: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- Repository guidance in `AGENTS.md`: scoped branches, review gates, no provider mutations without explicit release packets, and separate Mochirii/Mochi Social ownership.

## Queue State

All open refinement PRs in this snapshot have green validation/Vercel/CodeQL checks or expected skipped Supabase Preview checks. They remain blocked by draft state, review-required state, or both.

| PR | Branch | Draft | Status | Main scope | Merge risk |
| --- | --- | --- | --- | --- | --- |
| #270 | `codex/production-review-gate-evidence` | no | review required | Production review gate evidence docs | Low; docs/report only. |
| #271 | `codex/pr-ci-release-ladder` | no | review required | CI/release ladder hardening | Medium; touches workflows, `package.json`, `scripts/check-all.mjs`, full-stack evidence script/report. |
| #272 | `codex/accessibility-basics-smoke` | no | review required | Accessibility smoke and CSP/font hardening | Medium; touches Next config, validation scripts, reports, and deployment docs. |
| #273 | `codex/rollback-surface-drift-audit` | yes | review required | Rollback-surface drift audit | Medium; touches `docs/deployment.md`, `docs/current-live-state.md`, `package.json`, `scripts/check-all.mjs`. |
| #274 | `codex/supabase-security-definer-audit` | yes | review required | Supabase security-definer audit | Medium; touches `supabase/README.md`, `package.json`, `scripts/check-all.mjs`. |
| #275 | `codex/lighthouse-route-matrix` | yes | review required | Manual Lighthouse route matrix | Medium; touches GitHub workflow, deployment docs, package/check wiring. |
| #276 | `codex/operator-index` | yes | review required | Operator index audit | Medium; new operator index plus package/check wiring. |
| #277 | `codex/join-onboarding-funnel` | yes | review required | Join onboarding content and guard | Medium; touches `data/join.json`, mirrored public data, join guide, package/check wiring. |
| #278 | `codex/community-health-signals` | yes | review required | Community health signal matrix | Medium; package/check wiring. |
| #279 | `codex/supabase-advisor-lint-cadence` | yes | review required | Supabase advisor/lint cadence | Medium; package/check wiring. |
| #280 | `codex/mochi-social-fly-evidence` | yes | review required | Mochi Social Fly evidence guard | Medium; package/check wiring. |
| #281 | `codex/social-preview-qa-matrix` | yes | review required | Social preview QA and metadata alt coverage | Medium; touches public-page metadata plus package/check wiring. |
| #282 | `codex/visual-screenshot-evidence-matrix` | yes | review required | Visual screenshot evidence matrix | Medium; package/check wiring. |
| #283 | `codex/mochi-social-tester-journey-clarity` | yes | review required | Mochi Social tester gate UI polish | Medium-high; touches `apps/web/app/mochirii.css` and Mochi Social components. |
| #284 | `codex/parallel-agent-merge-coordination` | yes | review required | Parallel-agent merge coordination guard | Medium; package/check wiring. |
| #285 | `codex/route-information-architecture-audit` | yes | review required | Route information architecture guard | Medium; package/check wiring. |

## Conflict Clusters

The shared mechanical conflict cluster is:

- `package.json`
- `scripts/check-all.mjs`

These files are touched by nearly every guard/audit PR. After the first script-wiring PR merges, expect each remaining script-wiring PR to need a small rebase that preserves all package scripts and all `check-all` entries in the intended validation order.

The shared documentation conflict cluster is:

- `docs/deployment.md`: #270, #271, #272, #273, #275
- `docs/current-live-state.md`: #270, #273, #275

Merge or rebase these in a deliberate order and preserve the most current live-state language. Do not let an older PR overwrite newer Vercel/Supabase/Discord/Fly/Enjin gate language.

The website UI/content cluster is:

- #277 Join onboarding data/content.
- #281 social preview metadata.
- #283 Mochi Social tester gate CSS/components.
- #285 route IA report, which is documentation/report-only but describes the same route map.

These are mostly separate files, but they should be reviewed together for visible navigation, no-real-value alpha language, and social-card consistency.

The Supabase/Reaper/Mochi Social operations cluster is:

- #274 Supabase security-definer audit.
- #279 Supabase advisor/lint cadence.
- #280 Fly evidence guard.
- #284 parallel-agent coordination.
- #285 route IA ownership boundary.

These are mostly docs/scripts/report changes. None should run provider mutations during merge. Supabase migrations, function deploys, Discord applies, Fly deploys, and Enjin funded-chain actions still require separate activation packets.

## Recommended Review Order

1. Review #270 first. It is the smallest production-review-gate evidence PR and sets the owner/review posture for everything after it.
2. Review #284 early. It directly supports the current two-agent workflow and makes future parallel merges safer.
3. Review #271 and #272 as foundation changes. They alter validation/security behavior, so downstream PRs should rebase after them.
4. Review #273 and #276 after the foundation PRs. They improve rollback/operator navigation and may need doc conflict cleanup.
5. Review Supabase/provider-readiness docs next: #274, #279, and #280. Keep them provider-read-only at merge time.
6. Review evidence-matrix PRs: #275, #281, #282, and #285. These improve QA, social preview, screenshots, and route IA without live provider mutation.
7. Review user-facing content/UI polish last: #277 and #283. They are more visible and should be checked against the current route IA, no-real-value language, and visual screenshots after rebasing.

## Rebase Checklist For Each PR

- Run `git fetch --all --prune`.
- Rebase onto current `origin/main` after any earlier PR merges.
- Resolve `package.json` by keeping every unique `check:*`, `smoke:*`, and preparation script.
- Resolve `scripts/check-all.mjs` by keeping every unique check in a stable order near related checks.
- Regenerate only that PR's own report files.
- Run the PR's focused check, `npm run check`, and `git diff --check`.
- For UI/content PRs, also run `cd apps/web && npm run lint && npm run build`.
- Reconfirm the PR body says no provider mutation occurred unless a separate activation packet explicitly approved it.

## Provider Boundary

This queue snapshot authorizes no live provider mutation. Do not use it as approval to:

- Promote, rollback, or redeploy Vercel production/preview.
- Run `supabase db push`, deploy Supabase Edge Functions, or alter Supabase secrets.
- Register/apply Discord commands, mutate roles/permissions, or deploy Reaper Gateway.
- Deploy/restart/scale Fly apps or mutate Fly secrets.
- Fund cENJ, create/fund Fuel Tanks, start signer-connected Wallet Daemon work, or submit Enjin transactions.
- Change GitHub branch protection/rulesets.

## Current Best Next Action

Ask for owner review on #270, #284, #271, and #272 first. Once one merges, rebase the remaining script-wiring PRs before marking them ready. This keeps the queue moving while avoiding a long tail of small `package.json` and `scripts/check-all.mjs` conflicts.
