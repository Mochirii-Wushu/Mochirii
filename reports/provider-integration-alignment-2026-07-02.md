# Provider Integration Alignment Report

Generated: 2026-07-02

This report is intentionally no-secret. It records GitHub, Supabase, and Vercel integration state using names, statuses, and configuration posture only. It does not contain credential values, token digests, env values, cookies, database URLs, webhook URLs, or private headers.

## Result

- GitHub PR queue: no open PRs after merging the readiness baseline and integration runbook.
- GitHub security alerts: code scanning, Dependabot, and secret scanning open alerts are all `0`.
- GitHub main protection: active, strict status checks enabled, admin enforcement enabled, force pushes/deletions disabled.
- Vercel production: `https://mochirii.com` resolves to project `mochirii`, target `production`, state `READY`.
- Supabase linked project: `deyvmtncimmcinldjyqe`; local and remote migration history match at `20` migrations.
- Supabase branches: only default `main` branch was listed by the CLI at this read.
- Strict redacted provider evidence: pass.

## GitHub Alignment

Current required checks on `main`:

- `validate`
- `validate-next`
- `Analyze (actions)`
- `Analyze (javascript-typescript)`
- `CodeQL`

Current branch protection posture:

- Strict required status checks: enabled.
- Admin enforcement: enabled.
- Force pushes: disabled.
- Branch deletions: disabled.
- Required approving review count: `0`.
- Required conversation resolution: disabled.

Recommendation:

- Keep current required checks.
- Consider requiring `Vercel` on website PRs if Vercel status remains stable.
- For PRs that touch `supabase/`, require green Supabase Preview evidence before merge or document an integration blocker. Do not add this as a universal required check while Supabase reports skipped for non-`supabase/` PRs.
- Any branch protection or ruleset mutation must follow `docs/integration-operations-runbook.md` approval wording.

## Supabase Alignment

Current linked evidence:

- Project ref: `deyvmtncimmcinldjyqe`.
- Migration parity: `20` local / `20` remote.
- Edge Function config count remains covered by strict full-stack provider evidence.
- Branch listing returned only default `main`, with status `FUNCTIONS_DEPLOYED`.
- CLI noticed a newer Supabase CLI version `2.109.0`; installed repo-local CLI was `2.108.0`. This is not a blocker but should be reviewed in a dependency/tooling refresh PR.

Recommendation:

- Treat Supabase Preview skipped as acceptable only for PRs with no `supabase/` changes.
- For schema/function PRs, require Supabase Preview or equivalent linked CLI/provider evidence before merge.
- Keep Data API exposure explicit: table grants plus RLS policies, with service-role-only tables documented and guarded.
- Do not mutate Auth settings, Preview settings, project integrations, Edge Function deployments, or remote schema outside approved tasks.

## Vercel Alignment

Current production read:

- Account read succeeded through Vercel CLI.
- Production deployment state: `READY`.
- Production aliases include `mochirii.com`, `www.mochirii.com`, `mochirii.vercel.app`, `mochirii-mochirii.vercel.app`, and `mochirii-git-main-mochirii.vercel.app`.

Environment-name posture:

- Browser-facing expected names are present: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL`.
- Server/private Supabase and Postgres env names are also present in Vercel Production. Values were not read. This may be intentional for server-side routes, but it differs from the minimal env statement in `docs/deployment.md` and should be reviewed before cleanup.
- Preview has the Mochi Social tester password/gate names plus the expected browser-safe public names.

Recommendation:

- Do not remove env vars without a Vercel/server-route dependency review.
- Update docs in a later scoped PR if server-side env names are intentional.
- Keep Vercel preview/deployment reads as release evidence, but do not mutate Vercel project/domain/env settings without approval.

## Source Anchors

- GitHub protected branches, required status checks, and rulesets documentation.
- Supabase Branching GitHub integration, Data API/RLS security, database advisors, and CLI documentation.
- Vercel Git integration, Preview deployments, env vars, Web Analytics, and Speed Insights documentation.
- OpenAI Codex `AGENTS.md` guidance and local repo `AGENTS.md`.
- MDN CSP, WCAG 2.2, Web Vitals, and Next.js docs for later frontend steps.

## Verification

- `gh pr list --state open`: no open PRs.
- GitHub branch protection and rulesets read via GitHub API.
- GitHub code scanning, Dependabot, and secret scanning open-alert counts: `0`, `0`, `0`.
- Vercel `whoami`, `inspect`, and Production/Preview env-name reads with values redacted.
- Supabase `migration list --linked` and `branches list`.
- `npm run check:full-stack-release-evidence -- --providers --strict-provider`: pass.
