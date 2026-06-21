# Mochi Social Alpha Codex Ops

This website-side runbook keeps Codex aligned while operating the Mochirii preview, Supabase authority, Discord boundaries, and admin tester workflow for Mochi Social Alpha RC.

## Source Basis

- OpenAI Codex manual: `AGENTS.md`, skills, MCP, Chrome, Computer Use, hooks, and https://developers.openai.com/codex/codex-manual.md.
- GitHub Docs: Actions billing, budgets, branch protection, required checks, and PR checks: https://docs.github.com/en/billing/concepts/product-billing/github-actions and https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule.
- Vercel Docs: preview environments, environment variables, and WebSocket limits: https://vercel.com/docs/deployments/environments, https://vercel.com/docs/environment-variables, and https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections.
- Supabase Docs: Edge Function secrets and authenticated user/session handling: https://supabase.com/docs/guides/functions/secrets and https://supabase.com/docs/reference/javascript/auth-getuser.
- Enjin Docs: Canary, cENJ, Fuel Tanks, and Wallet Daemon: https://docs.enjin.io/getting-started/quick-start-guide, https://docs.enjin.io/guides/platform/managing-users/using-fuel-tanks, and https://docs.enjin.io/getting-started/using-wallet-daemon.
- Discord Docs: OAuth2, `state`, scopes, bot tokens, and permissions: https://docs.discord.com/developers/topics/oauth2.
- OWASP: secrets management, least privilege, rotation, and incident response: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html.
- Mochi Social game repo docs: Unity WebGL, UGS Distributed Authority, UGS Cloud Save/Cloud Code, Fly/Vercel embed hosting, Enjin Canary preview posture, and game-runtime acceptance.

## Source Hierarchy

Use sources in this order:

1. Official platform docs for current behavior.
2. Mochirii and Mochi Social repo docs for project decisions.
3. Live Vercel, Supabase, GitHub, Discord, Fly, and Enjin dashboards for current deployment state.
4. Prior memory only for user preferences and historical context.

Do not use memory as current truth for secrets, deployment URLs, payment/billing state, branch status, or provider dashboard state.

## Alpha Preview Ready Lane

Use Alpha Preview Ready as the first live-site target. It is not the same as Alpha RC Ready.

- `preview-live-gates`: Mochirii Vercel Preview `/games/mochi-social`, `NEXT_PUBLIC_MOCHI_SOCIAL_URL`, Supabase allowlist, terms, feedback, short-lived iframe auth, Unity Custom ID broker, no-real-value labels, Unity WebGL shared-room contract, and approved hosted preview checks.
- `funded-chain-gates`: Enjin collection ID, Fuel Tank ID, cENJ funding, Wallet Daemon signing, live operator smoke, and finalized chain proof.

Codex should optimize for `preview-live-gates` before funded-chain work. `funded-chain-gates` are expected red until the user explicitly approves cENJ, Fuel Tank, signing, and chain transaction work. Do not set dummy `ENJIN_COLLECTION_ID`, dummy `ENJIN_FUEL_TANK_ID`, or fake readiness flags to make Alpha RC pass.

For Alpha Preview Ready, the website may embed the game while the game reports `chainRuntime.mode="configured-preview-stub"`. Chain requests are audit-only preview rows until real Enjin finality exists; never credit inventory, settle listings, settle trades, or imply real player value from a stubbed chain request. The Unity v1 runtime is one shared room with curated character presets and shared Lirabao; market, trade, avatar uploads, multiple rooms, and sharding are out of scope.

## Visual Polish Lane

Use visual polish to improve Alpha Preview Ready clarity without changing the external-ops lane.

- Theme: Cozy Wushu arrival gate into Mochi Social.
- Art relationship: Mochirii gate art and Mochi Social game art should share one Cozy Wushu world, but the website owns only the tester doorway and unlocked shell. Unity 3D room assets, HUD, manifests, and the game asset ledger remain in the separate Mochi Social game repo.
- Website scope: `/games/mochi-social`, `/games/mochi-social/tester-login`, and `/games/mochi-social/tester-logout` presentation only.
- Locked state: an arrival gate with tester-password form, inline error, missing-config state, no iframe, and visible no-real-value labels.
- Unlocked state: a live game shell with bridge status, no-real-value contract labels, lock action, and the Fly iframe.
- Strict Supabase mode: keep allowlist/terms/auth flows intact and present them as the stricter gate path, not as the default password-gate polish target.
- Access layers: Vercel Deployment Protection or automation bypass is hosting/preview access; the tester-password gate is player access; Supabase/Discord allowlist is strict auth/admin access. Do not conflate these layers in copy, tests, or troubleshooting notes.
- Provider boundary: do not mutate Vercel, Supabase, Discord, Fly, Enjin, or GitHub provider settings from a visual pass without fresh action-specific approval.
- Funded-chain boundary: Enjin remains `configured-preview-stub`; do not clear funded-chain gates, set dummy IDs, fund cENJ, or imply real settlement.
- Cost boundary: Vercel advanced protection, provider add-ons, hosted checks, redeploys, and any Enjin funding/signing work can add usage or cost and need fresh action-specific approval.

Implementation prompt:

```text
Polish the Mochi Social tester gate for no-real-value Alpha Preview Ready. Keep iframe absent until unlocked, keep password material server-only, and keep Enjin visible as configured-preview-stub.
```

Use these implementation prompts when starting follow-up work:

```text
Build the next alpha feature against no-real-value Alpha Preview Ready.
```

```text
Do not clear funded-chain gates unless cENJ, collection, Fuel Tank, and Wallet Daemon proof approval exists.
```

```text
Use Mochirii for website, Supabase, allowlist, terms, feedback, and admin changes; use Mochi Social for runtime/game changes.
```

## Tool Choice

- Use CLI for reproducible checks: `gh`, `npm`, Supabase CLI, and PR status.
- Use Chrome for Vercel, Supabase, GitHub billing, Discord Developer Portal, Fly, and Enjin dashboards.
- Use Computer Use only when CLI and Chrome cannot reach a required UI.
- Use dashboard-only flow for payment details, OAuth client secrets, bot tokens, MFA, seed/passphrase handling, and private account confirmations.

## Website Preview Environment Matrix

| Surface | Owner | Notes |
| --- | --- | --- |
| Website branch | `Mochirii-Wushu/Mochirii` | `codex/mochi-social-alpha-rc` |
| Game branch | `xartaiusx/mochi-social` | `codex/mochi-social-alpha-rc` |
| Website preview route | Vercel | `/games/mochi-social` |
| Game URL | Unity WebGL host | `NEXT_PUBLIC_MOCHI_SOCIAL_URL` |
| Supabase public browser config | Vercel Preview | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Supabase preview OAuth | Supabase Auth and Discord Developer Portal | Discord provider enabled, Discord OAuth callback set to the Supabase preview `/auth/v1/callback`, site redirect allowed back to `/account` |
| Site URL | Vercel Preview | `NEXT_PUBLIC_SITE_URL` |
| Supabase privileged writes | Supabase Edge Functions | service-role stays server-side |
| Game server trust | Supabase Edge and Fly | shared `MOCHI_SOCIAL_GAME_SERVER_TOKEN` secret name only |
| Unity runtime auth | Supabase Edge and UGS | `mochi-social-unity-auth` maps Supabase users to `mochirii:<user_id>` Custom IDs |
| Shared room state | UGS primary, Supabase mirror | `jade-lantern-room-alpha`, shared Lirabao audit mirror only |
| Enjin preview state | Game runtime | Canary-only `configured-preview-stub` until funded-chain approval |

Branch-specific Vercel preview env should override only the Mochi Social values needed for the alpha PR. Production env must not be changed for Alpha RC unless a later production plan is approved.

Use `npm run prepare:mochi-social-alpha-operator-checklist` to refresh the no-secret website-side checklist in `C:\Users\xtyty\Desktop\Creds`.

## Action Approval Rules

Local code, docs, static checks, no-secret reports, and localhost-only verification may proceed without a new approval. The following actions need fresh action-specific approval before Codex runs them:

- Push a branch, rerun GitHub Actions, create or update required checks, or enable branch protection.
- Deploy, redeploy, promote, restart, mutate, or run hosted smoke/load checks against Vercel, Fly, Supabase, GitHub, Discord, Enjin, or any public preview URL.
- Set, change, remove, or rotate provider secrets or environment variables in Vercel, Supabase, Fly, GitHub, Discord, or Enjin.
- Fund cENJ, create or fund a Fuel Tank, submit Enjin transactions, start signer-connected Wallet Daemon work, or mark funded-chain gates green.
- Set hosted approval flags such as `MOCHI_SOCIAL_SITE_PREVIEW_READY_ALLOW_HOSTED=true`, `MOCHI_SOCIAL_EXTERNAL_ALLOW_HOSTED_CHECKS=true`, hosted Edge flags, or hosted browser/load-smoke flags.

Each approval request must name the exact account/provider, command or dashboard action, possible cost or usage impact, and no-cost alternative.

## Supabase Authority Matrix

| Capability | Website-side authority |
| --- | --- |
| Session refresh | Next.js browser client |
| Game iframe auth | short-lived Supabase access token via `MOCHI_SOCIAL_AUTH` |
| Unity player token broker | `mochi-social-unity-auth` after Supabase allowlist and terms |
| Alpha allowlist | `mochi_social_alpha_testers` |
| Terms acknowledgement | Supabase Edge session/action functions |
| Game action writes | `mochi-social-alpha-action` with scoped server token |
| Admin grant/revoke/audit | `mochi-social-alpha-admin` |
| Feedback | `submit-mochi-social-feedback` |
| Character save | UGS Player Data `character.v1`; Supabase audit only |
| Shared pet save | UGS Game Data `room:jade-lantern-room/sharedPet.v1`; Supabase mirror only |
| Chain ledger | Supabase tables and append-only ledger rows |

Browser code must never receive service-role keys, Unity service account credentials, Discord bot tokens, Enjin tokens, Wallet Daemon secrets, or refresh tokens from the parent page.

## Discord Boundary

- Discord OAuth, roles, bot tokens, and moderation permissions are website/admin concerns only.
- Use OAuth `state` for Discord OAuth flows.
- Bot tokens and OAuth client secrets must stay in Supabase Edge Functions or private provider dashboards.
- Do not add alpha DMs, Discord item grants, open creator uploads, or Discord-driven market actions without a later approved plan.

## Preview Verification

Before inviting testers:

- Game PR has green `Verify Mochi Social` CI.
- Mochirii PR checks are green.
- Vercel preview has `NEXT_PUBLIC_MOCHI_SOCIAL_URL` set to the Fly game URL.
- `npm run check:mochi-social-edge-authority` passes locally before hosted Edge smoke, so the game action function stays server-token-authorized, Canary/no-real-value-stamped, ledger-backed, and finalized-only for chain inventory movement.
- `npm run check:mochi-social-bridge-state` passes locally before manual browser gates, so the parent bridge resolver handles `MOCHI_SOCIAL_READY`, `MOCHI_SOCIAL_AUTH_STATE`, and `MOCHI_SOCIAL_ERROR` without exposing refresh tokens, provider secrets, or arbitrary game-provided status text.
- `npm run check:mochi-social-preview-ready` reports `site.bridge-state`, `site.auth-bridge`, `site.preview-key-loader`, `site.discord-oauth-detector`, and `site.edge-authority` separately from hosted `site.edge-smoke`; do not treat a hosted smoke response as proof that the parent bridge, publishable-key loader, Discord detector, authority, or finality invariants are still wired locally.
- `MOCHI_SOCIAL_GAME_CONTRACT_URL=<unity-webgl-game-url> npm run check:mochi-social-game-contract` proves the game manifest, alpha status, embed route, Unity shared-room contract, and optional allowed-origin CORS contract.
- `MOCHI_SOCIAL_ALPHA_EDGE_URL=<preview-functions-url> npm run smoke:mochi-social-alpha-edge` proves the alpha Supabase Edge Functions fail closed for missing user auth, missing game-server trust, and invalid alpha action requests.
- `npm run check:mochi-social-discord-oauth` proves the local `site.discord-oauth` detector can distinguish a Discord redirect from Supabase's unsupported-provider response before any hosted check is approved.
- `npm run check:mochi-social-preview-ready` is the site-side tester-entry audit. It writes no-secret ignored reports, requires game Preview Ready evidence, branch sync, hosted game contract proof, Supabase Edge smoke, Discord OAuth provider readiness, and explicit manual browser gate confirmation, but it does not require funded-chain gates.
- Non-testers are blocked from `/games/mochi-social`.
- Allowlisted testers are blocked until terms are acknowledged.
- The iframe receives only `MOCHI_SOCIAL_AUTH` with a short-lived access token.
- Feedback appears in the leader audit panel.
- For Alpha Preview Ready, chain request rows may be audit-only preview records while the game reports `configured-preview-stub`.
- For Alpha RC Ready, chain operation rows record request id, transaction UUID, optional listing ID, state, and finality evidence.
- Two browser sessions must verify the same Unity shared room, distinct avatars, and shared Lirabao state separately in the game runtime.

## Manual Browser Evidence Protocol

Hosted browser gates need explicit approval before Codex opens Chrome against Vercel, Supabase, or the Fly game URL. During that pass, capture only no-secret evidence:

- reviewer, browser/version, preview URL, timestamp, and pass/fail notes;
- whether the active access mode is `tester-password` or `supabase`;
- for `tester-password`: locked page, iframe absent while locked, invalid-password error, iframe after unlock, guest bridge, configured-preview-stub, Unity room load smoke, and no persistence claim;
- for `supabase`: signed-out, non-tester, terms, iframe, feedback, admin, auth bridge, Unity Custom ID broker, shared room, shared Lirabao, and configured-preview-stub gates;
- any non-secret error codes or route names needed for debugging.

Never capture, paste, screenshot, or commit Supabase access tokens, Unity player tokens, Unity service account credentials, refresh tokens, cookies, request authorization headers, service-role keys, Discord OAuth client secrets, Discord bot tokens, Enjin tokens, wallet seeds, Wallet Daemon passphrases, MFA codes, or personal payment/account details.

For the iframe auth gate, verify the shape rather than the value: the parent page sends `MOCHI_SOCIAL_AUTH` with an access-token field, and it does not send refresh tokens or provider secrets. If DevTools exposes raw token text, treat it as private screen-only evidence and do not transcribe it.

After the human/browser pass, stamp `npm run check:mochi-social-preview-ready` only with no-secret metadata. For the default password-first Preview Ready page:

```powershell
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_ALLOW_HOSTED="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_ACCESS_MODE="tester-password"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_CONFIRMED="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER="<operator name>"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER="<browser/version>"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_URL="<Mochirii Vercel Preview /games/mochi-social URL>"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_NOTES="<no-secret status notes>"
$env:MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_LOCKED_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_IFRAME_ABSENT_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_INVALID_ERROR_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_IFRAME_LOADS_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_AUTH_BRIDGE_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_CHAIN_STUB_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_GAME_PRESENCE_OK="true"
npm run prepare:mochi-social-browser-gates
```

For a later strict Supabase/Discord allowlist pass, stamp the strict mode only after those gates actually pass:

```powershell
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_ALLOW_HOSTED="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_ACCESS_MODE="supabase"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_CONFIRMED="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER="<operator name>"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER="<browser/version>"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_URL="<Mochirii Vercel Preview /games/mochi-social URL>"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_NOTES="<no-secret status notes>"
$env:MOCHI_SOCIAL_SITE_BROWSER_SIGNED_OUT_BLOCKED_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_NON_TESTER_BLOCKED_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_TERMS_GATE_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_IFRAME_LOADS_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_AUTH_BRIDGE_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_FEEDBACK_AUDIT_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_CHAIN_STUB_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_ADMIN_GRANT_REVOKE_OK="true"
npm run prepare:mochi-social-browser-gates
```

`npm run prepare:mochi-social-browser-gates` writes ignored no-secret JSON/Markdown plus `C:\Users\xtyty\Desktop\Creds\mochirii-mochi-social-browser-gates.md`. After that, `npm run check:mochi-social-preview-ready` can consume the saved report; hosted browser evidence still requires `MOCHI_SOCIAL_SITE_PREVIEW_READY_ALLOW_HOSTED=true` for the audit pass.

Run `npm run check:mochi-social-report-hygiene` after generating Mochi Social reports or no-secret handoff files. It scans only known ignored Mochi Social reports and Desktop Creds handoff files for obvious secret-shaped material, prints labels/status only, and is required by `npm run check:mochi-social-preview-ready`.

For the hosted Supabase Edge smoke, prefer the local file pointer over pasting the publishable key into the shell:

```powershell
$env:MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY_FILE="C:\Users\xtyty\Desktop\Creds\supabase-preview-<preview-project-ref>-api-keys.local.json"
```

The Preview Ready audit loads the standard preview key file only after `MOCHI_SOCIAL_SITE_PREVIEW_READY_ALLOW_HOSTED=true` is set, or when this explicit file path is provided. Reports record only the key source filename/status and never the key value.

## Secret Entry Protocol

- The user types secrets privately.
- Codex verifies secret names, status, digests, timestamps, health checks, or successful route behavior only.
- Repo scripts may write no-secret operator checklists into `C:\Users\xtyty\Desktop\Creds`; those files must contain placeholders, secret names, statuses, and commands only.
- Never paste secret values into docs, logs, PR comments, screenshots, browser-visible UI, or chat.
- Rotate `MOCHI_SOCIAL_GAME_SERVER_TOKEN`, Unity service account credentials, Discord secrets, Enjin tokens, and provider keys if exposed.
