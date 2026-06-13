# Mochi Social Fly Release Evidence

This runbook defines the no-secret evidence needed before a Mochi Social game build is considered ready for a Fly-hosted tester wave or a website iframe contract update.

It is a documentation and validation gate only. It does not authorize `fly deploy`, Fly restarts, Fly scale changes, Vercel environment edits, Supabase secret changes, Discord command changes, Enjin funded-chain work, cENJ funding, Fuel Tank creation, Wallet Daemon signing, or any other provider mutation. No provider mutation belongs in this static evidence pass; no provider mutation is allowed by report generation.

## Source Basis

- Fly deploy command: <https://fly.io/docs/flyctl/deploy/>
- Fly deploy app guide: <https://fly.io/docs/launch/deploy/>
- Fly app configuration: <https://fly.io/docs/reference/configuration/>
- Fly health checks: <https://fly.io/docs/reference/health-checks/>
- Fly app availability: <https://fly.io/docs/apps/app-availability/>
- Vercel deployments: <https://vercel.com/docs/deployments>
- Vercel preview deployment sharing: <https://vercel.com/docs/deployments/sharing-deployments>
- Enjin Fuel Tanks: <https://docs.enjin.io/guides/platform/managing-users/using-fuel-tanks>
- Enjin Wallet Daemon: <https://docs.enjin.io/getting-started/using-wallet-daemon>

## Scope Boundary

Mochirii owns the website tester doorway, Vercel preview, Supabase allowlist/terms/feedback authority, Discord OAuth/member boundaries, and the iframe contract. The separate Mochi Social game repo owns the RPGJS runtime, `fly.toml`, game server, game CI, Fly deploy, health endpoint, game manifest, runtime asset ledger, and Enjin Canary runtime posture.

This website repo should never copy runtime game assets, Fly secrets, Enjin tokens, Wallet Daemon material, or game-server private configuration. It may record no-secret evidence that the game URL is ready to embed.

## Evidence Packet

Before a tester wave, collect these fields in a private or PR-safe no-secret packet:

| Field | Required evidence | Public-safe value |
| --- | --- | --- |
| Game repo branch | Branch name and commit SHA for `xartaiusx/mochi-social`. | Branch and short SHA only. |
| Game PR/CI | Current PR URL, check names, and pass/fail status. | URLs and status only. |
| Local game validation | Game repo checks completed before hosted action. | Command names and pass/fail only. |
| `fly.toml` review | App name, primary region, HTTP service/internal port, force HTTPS, and health-check path. | Config field names and pass/fail only. |
| Health endpoint | `/healthz` returns 200 and `ok=true`. | Route/status only. |
| Game manifest | `/integration/game-manifest.json` matches `Mochi Social`, `mochi-social`, `/play`, `/embed`, bridge protocol, and Supabase access-token-only auth. | Contract status only. |
| Alpha status | `/integration/alpha/status` remains no-real-value, allowlist/terms required, Enjin Canary, curated UGC, no cashout, no auctions. | Contract status only. |
| Embed route | `/embed` returns HTML and identifies Mochi Social. | Route/status only. |
| Website iframe contract | `MOCHI_SOCIAL_GAME_CONTRACT_URL=<fly-game-url> MOCHI_SOCIAL_SITE_ORIGIN=<vercel-preview-origin> npm run check:mochi-social-game-contract`. | Pass/fail, Fly URL origin, Vercel origin. |
| Vercel env alignment | Website preview `NEXT_PUBLIC_MOCHI_SOCIAL_URL` points at the intended Fly game URL. | Env name and destination origin only. |
| Rollback target | Previous Fly release/deployment identifier or rollback owner. | Release label or owner, no token. |
| Enjin posture | Canary remains `configured-preview-stub` or approved configured preview; funded-chain gates remain red unless separately approved. | Status only. |

Do not record tokens, cookies, raw request headers, game-server secrets, Fly auth tokens, Supabase service-role keys, Discord bot tokens, Enjin platform tokens, Wallet Daemon passphrases, wallet seed phrases, cENJ balances, payment details, private player identifiers, or screenshots containing account state.

## Pre-Deploy Checks

Run these from the game repo before any hosted deploy approval:

```sh
npm ci
npm run secret-scan
npm run alpha:local-suite
npm run alpha:local-evidence
npm run alpha:operator-checklist
npm run alpha:report-hygiene
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
```

Review `fly.toml` before approval. It should have a clear app name, region, exposed HTTP service, expected internal port, HTTPS posture, and a health check that reaches a stable route such as `/healthz`. Fly health checks should not depend on login, redirects, OAuth, third-party APIs, Enjin finality, Discord, or Supabase writes.

## Approved Hosted Actions

Hosted Fly actions can consume hosted resources and may affect testers. Run them only after explicit action-specific approval names the Fly app, branch, command, expected usage/cost, and rollback owner.

Allowed only after approval:

```sh
fly deploy
```

After deploy, collect only no-secret status:

```sh
MOCHI_SOCIAL_GAME_CONTRACT_URL=<fly-game-url> MOCHI_SOCIAL_SITE_ORIGIN=<vercel-preview-origin> npm run check:mochi-social-game-contract
```

If a Vercel preview iframe will point to a new game URL, verify the preview environment variable by name and destination origin. Do not paste Vercel env values that are secrets. Do not change Vercel env vars from this runbook without a separate approval.

## Website-Side Acceptance

In this repo, the website side is ready for a Fly game URL only when:

- `npm run check:mochi-social-alpha` passes.
- `npm run check:mochi-social-bridge-state` passes.
- `npm run check:mochi-social-auth-bridge` passes.
- `npm run check:mochi-social-edge-authority` passes.
- `npm run check:mochi-social-preview-key-loader` passes.
- `npm run check:mochi-social-discord-oauth` passes.
- `MOCHI_SOCIAL_GAME_CONTRACT_URL=<fly-game-url> npm run check:mochi-social-game-contract` passes.
- Hosted browser gates are captured only after approval, with no-secret status labels.
- `npm run check:mochi-social-report-hygiene` passes after any Mochi Social report refresh.

The `configured-preview-stub` state is acceptable for Alpha Preview Ready. It is not Alpha RC funded-chain proof.

## Stop Conditions

Stop before deploy or hosted checks if:

- `fly.toml` lacks a health check or the health check depends on auth, redirects, Enjin, Discord, Supabase writes, or private secrets.
- Game CI or local checks fail.
- The website game contract check fails locally or against the target Fly URL.
- The target game URL differs from the Vercel preview `NEXT_PUBLIC_MOCHI_SOCIAL_URL` origin.
- Enjin funded-chain gates are being treated as green without cENJ, Fuel Tank, Wallet Daemon, collection ID, and finality proof approval.
- Any command would print or persist secrets, private account state, raw headers, cookies, or payment details.
- Rollback owner or previous Fly release target is unknown.

## Rollback

Rollback belongs to the game repo/operator unless the website iframe URL is wrong.

- Fly rollback or redeploy previous release: game repo/operator-owned.
- Website preview env fix: Vercel/operator-owned and approval-gated.
- Supabase game-server token rotation: Supabase and Fly secret rotation, approval-gated.
- Enjin rollback: no funded-chain rollback should be needed while the game remains no-real-value or `configured-preview-stub`.

If website behavior regresses because the iframe points to the wrong URL, revert the website env or promote the previous Vercel deployment only through the approved release packet.

## Validation

Static guard:

```sh
npm run check:mochi-social-fly-evidence
```

Refresh the generated no-secret report:

```sh
npm run check:mochi-social-fly-evidence -- --write
```

This guard validates only the runbook and website-side contract coverage. It does not contact Fly, run hosted checks, or deploy anything.
