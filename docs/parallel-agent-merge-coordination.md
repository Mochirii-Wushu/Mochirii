# Parallel Agent Merge Coordination

This runbook keeps Mochirii website work and Mochi Social game work merge-safe when multiple Codex agents are active at the same time. It is intentionally local-first: it records boundaries, branch hygiene, and evidence expectations without reading provider dashboards or mutating live services.

## Source Basis

- GitHub protected branches and required review/status checks: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- Vercel deployment environments and production/preview separation: https://vercel.com/docs/deployments/environments
- Supabase migration workflow: https://supabase.com/docs/guides/deployment/database-migrations
- Discord permission model and overwrite order: https://docs.discord.com/developers/topics/permissions
- Fly deploy behavior and deploy-time options: https://fly.io/docs/flyctl/deploy/
- Enjin Wallet Daemon signer boundary: https://docs.enjin.io/getting-started/using-wallet-daemon
- OWASP secrets-management hygiene: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- Codex repository handoff guidance: https://developers.openai.com/codex/codex-manual.md

## Workspace Ownership

Use Mochirii for:

- Website/Vercel/Next.js changes under `apps/web`.
- Supabase migrations, Edge Functions, allowlist, terms, feedback, profile, and admin workflows.
- Discord/Reaper repair paths, activation packets, redacted sync logs, and server-side command registration scripts.
- The `/games/mochi-social` tester doorway, tester-password gate, strict Supabase/Discord access screens, no-real-value labels, and iframe shell.

Use Mochi Social for:

- RPGJS runtime code, maps, sprites, HUD, manifests, game art, asset ledger, and game-side acceptance.
- Fly runtime configuration, health endpoints, WebSocket behavior, and hosted game deploy evidence.
- Enjin runtime integration, finality proof, Fuel Tank, cENJ, Wallet Daemon, signer material, and chain submission behavior.

Shared contract changes need both sides named in the PR body. Examples include `NEXT_PUBLIC_MOCHI_SOCIAL_URL`, iframe messages, `/integration/game-manifest.json`, `/integration/alpha/status`, Edge Function request/response shapes, and any no-real-value or `configured-preview-stub` readiness claim.

## Branch Discipline

- Start each task from current `origin/main` on a scoped `codex/` branch.
- Keep one task per branch; avoid bundling website, game, provider activation, and documentation cleanup in one PR.
- Before publishing, run `git fetch --all --prune`, inspect `git diff --name-status`, and check `git rev-list --left-right --count origin/main...HEAD`.
- Draft PRs are the default while another agent is active. Mark ready only when the owner/review gate says the release lane is clear.
- If `origin/main` moved, rebase or recreate the branch before final review. If another agent touched the same file, read both diffs and reconcile deliberately.

## Merge-Prep Checklist

Record these fields in the PR body or a no-secret evidence note:

- Branch, PR URL, head SHA, and base SHA.
- Changed file groups: website-owned, game-owned, shared contract, provider activation, docs-only, or generated report.
- Validation commands and pass/fail status.
- Open PR overlap reviewed: yes/no, with any known overlapping paths.
- Provider mutations performed: no, unless a separate approved activation packet exists.
- Rollback note: code rollback, provider rollback, or no provider state changed.

## Provider Activation Boundary

This coordination guard authorizes no live provider mutation. Do not run these from the merge-coordination pass:

- Vercel production promotion, rollback, redeploy, preview redeploy, or hosted smoke/load checks.
- Supabase `db push`, function deploy, secret/env changes, or service-role data repair.
- Discord command apply, role/permission mutation, Gateway deployment, or bot token rotation.
- Fly deploy, restart, scale, secret/env change, or hosted game load checks.
- Enjin cENJ funding, Fuel Tank creation/funding, collection mutation, Wallet Daemon signer work, or chain transaction submission.
- GitHub branch protection or required-check mutation.

If a provider action is needed, create a separate activation packet that names the provider account, exact command or dashboard action, cost/usage risk, rollback, and evidence to collect.

## Conflict Handling

- If a PR changes shared contracts, merge the contract-owning repo first, then validate the dependent repo against that merged contract.
- If two agents touch the same page/component/script, pause the later PR and compare file-level intent before rebasing.
- If generated reports drift because another PR merged, regenerate them from current `origin/main` before final review.
- If production provider state has changed outside Git, update the no-secret release evidence report rather than embedding dashboard screenshots or secret values.

## No-Secret Evidence

Evidence may include branch names, short SHAs, PR URLs, command names, route names, status labels, provider resource names, redacted counts, and no-secret report paths.

Evidence must not include tokens, service-role keys, Discord bot tokens, OAuth client secrets, webhook URLs, cookies, signed URLs, raw request headers, raw interaction tokens, Enjin tokens, Wallet Daemon material, MFA codes, seed phrases, payment details, private account emails, or dashboard screenshots that expose private data.

## Local Guard

Run this before publishing coordination-sensitive work:

```powershell
npm run check:parallel-agent-merge-coordination -- --write
npm run check:parallel-agent-merge-coordination
```

The command writes `reports/parallel-agent-merge-coordination.json` and `reports/parallel-agent-merge-coordination.md`. The reports are no-secret, provider-read-free, and safe to commit.
