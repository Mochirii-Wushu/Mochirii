# Integration Operations Runbook

This runbook is the no-secret operating checklist for Mochirii website work that touches GitHub, Supabase, Vercel, browser evidence, or provider-adjacent reports. It complements `AGENTS.md`, `docs/deployment.md`, and `supabase/README.md`.

## Source Anchors

Use current official docs before changing provider behavior:

- GitHub protected branches, required reviews, required status checks, and rulesets.
- Supabase Branching GitHub integration, database advisors, RLS, explicit grants, leaked-password protection, and CLI docs.
- Vercel Git integration, Preview/Production environments, env-var docs, Web Analytics, and Speed Insights docs.
- OpenAI Codex manual guidance for `AGENTS.md`, skills, MCP, hooks, plugins, and task instructions.
- MDN CSP, WCAG 2.2, Web Vitals, and Next.js docs for frontend/security/performance work.

## Provider Mutation Gates

Provider reads are allowed when credentials are scoped to child-process environment variables and outputs stay redacted. Provider mutations require an explicit owner approval message naming the exact target and action.

- GitHub: require approval before changing branch protection, rulesets, required checks, repository security settings, Actions secrets, Pages settings, or repository permissions. PR creation, PR body updates, commit pushes, and normal merge/check verification are allowed when the task explicitly asks for GitHub publication.
- Supabase: require approval before changing dashboard Auth settings, Data API exposure, project integrations, secrets, Edge Function deployments, remote database state, branch settings, or production data. Migrations may be committed locally through PRs, but do not run `supabase db push` unless the task explicitly approves remote mutation.
- Vercel: require approval before changing project settings, domains, DNS, env vars, deployment protection, analytics settings, production deployment aliases, or integration settings. Read-only `inspect`, `env ls`, and preview/status reads are allowed with redacted reporting.
- DigitalOcean/Spaces/Cloudflare: require approval before changing Droplets, firewalls, backups, monitoring, Spaces buckets/keys/CORS/CDN/lifecycle, DNS records, TLS mode, HSTS, cache rules, or origin protection.
- Discord/Meta/Enjin/Fly/Pixelfed: require approval before changing portals, secrets, roles, webhooks, funded-chain state, hosted runtimes, federation settings, or quota/cost-bearing operations.

Use exact approval wording in task updates, for example: `Approve enabling Supabase Auth leaked-password protection for project deyvmtncimmcinldjyqe now.`

## Standard Evidence Gates

Run the smallest gate that matches the change, then broaden when provider or user-facing behavior changes:

- Baseline: `npm run toolchain:check`, `npm run check`, `git diff --check`, `npm audit --audit-level=moderate`.
- Next app: `cd apps/web && npm run toolchain:check && npm run lint && npm run build && npm audit --audit-level=moderate`.
- Production-sensitive work: `npm run check:production` and `npm run smoke:dns-cutover-post -- --base-url=https://mochirii.com --www-mode=redirect`.
- Provider evidence: `npm run check:full-stack-release-evidence -- --providers --strict-provider`; add `--write` only after strict mode passes.
- Supabase work: `npm run check:supabase-security-performance`, `npm run check:supabase-edge-types`, relevant Deno tests, migration list, linked advisors, and Supabase Preview evidence for PRs with `supabase/` changes.
- Browser/accessibility/performance work: route matrix, accessibility route matrix, Lighthouse Home/Recruitment/Gallery, and focused Playwright smokes for authenticated or media flows.
- CSP work: `npm run check:csp-inline-hardening -- --live --write`; do not remove inline allowances until Preview browser evidence covers Supabase, Spotify, Vercel telemetry, and Mochi Social iframe/postMessage behavior.

## Current Integration Expectations

- Live app surface: Vercel/Next.js under `apps/web` for `https://mochirii.com`.
- Rollback/reference surface: root static files, root `assets/`, root `data/`, and GitHub Pages material remain until a separate retirement plan.
- Supabase project: `deyvmtncimmcinldjyqe`; browser code may only receive public URL and publishable key.
- Vercel project: production-serving `mochirii/mochirii` with root directory `apps/web`.
- Pixelfed guild social: planned as a separate `social.mochirii.com` runtime. The website repo owns only the member doorway, Supabase OAuth consent surface, `social_accounts` mapping, and no-secret runbooks; do not add Pixelfed application code, host secrets, media credentials, or infrastructure state to this repo. See `docs/pixelfed-guild-social-adr.md`.
- Pixelfed staging: `social.mochirii.com` exists as an admin-first staging target outside Vercel. Runtime source changes must be moved into a Mochirii-owned private fork or ops repo before further host edits. Federation and broad member upload testing remain disabled until separate gates pass.
- GitHub Pages: retained as legacy rollback/reference material only. As of 2026-07-02, Pages API reports legacy root deployment for `mochirii.com` and recent deploys can time out in `deployment_queued` while Vercel production remains healthy. Changing Pages settings or retiring the root static rollback surface requires explicit approval.
- Supabase Preview: acceptable as skipped on PRs without `supabase/` changes; schema/function PRs must either produce green Supabase Preview evidence or document the integration blocker.
- GitHub security alerts: code scanning, Dependabot, and secret scanning should remain at zero before release-sensitive merges.
- Audio: `assets/audio/mochiriiiiii.mp3` remains an accepted large-asset warning unless the owner explicitly approves optimization.

## Branch And PR Rules

- Start from updated `main` after the readiness baseline.
- Use one scoped branch per task.
- Keep reports no-secret and reviewable.
- Prefer squash/merge through protected-branch policy after checks are green.
- After merge, sync local `main`, verify a clean worktree, and only then start the next scoped branch.
