# Mochi Social Alpha Integration

Mochi Social stays in the separate `xartaiusx/mochi-social` game repo. This Mochirii repo owns the website doorway, Supabase schema, Edge Functions, alpha access controls, terms acknowledgement, and tester feedback.

Codex external operations for this website surface are defined in [`docs/mochi-social-alpha-codex-ops.md`](mochi-social-alpha-codex-ops.md). Use it for source hierarchy, tool choice, preview env ownership, Supabase authority, Discord boundaries, preview verification, and secret-entry rules.

## Alpha Posture

- Closed preview only.
- First live target is Alpha Preview Ready on Vercel Preview, not production.
- Enjin Canary only.
- No real-money value, no cashout, no paid assets, no mainnet.
- Curated assets only; no open creator uploads.
- Signed-in allowlisted testers only.
- Chat/action logs are retained for alpha moderation and audit workflows.

## Alpha Preview Ready

Alpha Preview Ready is the first tester-entry stop point. The Mochirii Vercel Preview can embed the Fly game while Enjin remains visible as `configured-preview-stub`.

- `preview-live-gates`: Vercel Preview route, `NEXT_PUBLIC_MOCHI_SOCIAL_URL`, Supabase allowlist, terms, feedback, short-lived `MOCHI_SOCIAL_AUTH`, no-real-value labels, and approved hosted contract checks.
- `funded-chain-gates`: cENJ, real Enjin collection ID, real Fuel Tank ID, Wallet Daemon signing, and finalized proof smoke.
- `funded-chain-gates` are expected red until later approval. Do not set dummy `ENJIN_COLLECTION_ID`, dummy `ENJIN_FUEL_TANK_ID`, or fake readiness flags to clear them.
- Chain request rows may be audit-only preview records while the game reports `configured-preview-stub`; they must not credit inventory, settle trades, settle listings, or imply real player value.
- Alpha RC Ready comes later, after Alpha Preview Ready plus funded Canary collection, Fuel Tank, Wallet Daemon signing, and finality evidence.

## Website Route

- Route: `/games/mochi-social`
- Public env: `NEXT_PUBLIC_MOCHI_SOCIAL_URL`
- The route checks Supabase session state, calls `mochi-social-alpha-session`, requires an active allowlist row, requires terms acknowledgement, then embeds `${NEXT_PUBLIC_MOCHI_SOCIAL_URL}/embed`.
- The page forwards only a short-lived Supabase access token through the existing `MOCHI_SOCIAL_AUTH` postMessage bridge.
- The Supabase preview project must have Discord OAuth enabled before signed-in browser gates can pass. The Discord Developer Portal must allow the Supabase preview callback URL, for example `https://dnxumaiooljdnbjvzbdc.supabase.co/auth/v1/callback`, and the website redirects back to the preview `/account` route.

## Supabase Functions

- `mochi-social-alpha-session`: signed-in user access, allowlist, terms acknowledgement, profile prep.
- `mochi-social-alpha-action`: game-server action ledger using `x-mochi-social-server-token`; `verify_jwt=false` is intentional and covered by `check:security-hardening`. The game server resolves the short-lived Supabase access token to a user id before forwarding. The function verifies allowlist and terms, then records pet, market, trade, chat, chain, and append-only ledger state.
- `mochi-social-alpha-admin`: leader/moderator grant, revoke, list, and audit controls for alpha testers.
- `submit-mochi-social-feedback`: authenticated tester feedback.

## Chain Finality

- `chain.withdraw_request` and `chain.deposit_request` create pending Canary operation rows.
- `chain.operation_update` requires a matching operation request id before recording Enjin transaction UUID, optional listing ID, state, and finality evidence.
- Inventory movement happens only on a transition to `finalized`.
- Cold-to-hot credits insert hot inventory only after finality; failed, abandoned, timeout, pending, and broadcast states never credit hot inventory.
- Hot-to-cold updates require a matching request and either mark the referenced inventory cold or insert a cold proof row for the alpha certificate.

## Leader Workflow

- Open `/leader-dashboard` with a Discord Moderator account.
- Use the `Mochi Social Alpha` panel to grant or revoke closed-alpha access by Supabase user id.
- Use the same panel to inspect active testers, revoked testers, ledger event count, active fixed-price listings, offered direct trades, pending Enjin Canary operations, feedback count, chat count, and recent ledger/chain/feedback rows.
- Keep all rows no-real-value and Canary-only until a later production/mainnet review plan is approved.

## Tester Guide

Tell testers:

- This is a closed alpha preview for allowlisted 18+ testers only.
- Pets, currency, listings, trades, and Enjin Canary operations have no real value.
- Use a desktop browser and sign in through Mochirii before opening `/games/mochi-social`.
- Acknowledge the alpha terms before the game iframe loads.
- Try the first loop: move around town, befriend Momo, care for it, inspect the HUD, send one local chat message, use one emote, create one fixed-price listing proof, create one direct trade proof, and request the Momo Canary certificate proof.
- Send bugs through the Mochirii feedback form. Do not send secrets, wallet seed phrases, payment information, or private recovery material in feedback.

## Preview Acceptance

Before inviting testers:

- The game repo `npm run smoke`, `npm run alpha:local-acceptance`, and `npm run alpha:load-smoke` checks have passed against the intended game URL.
- The Mochirii preview uses `NEXT_PUBLIC_MOCHI_SOCIAL_URL` for the Fly game URL.
- `npm run check:mochi-social-game-contract` passes with `MOCHI_SOCIAL_GAME_CONTRACT_URL` set to the intended game URL and, when available, `MOCHI_SOCIAL_SITE_ORIGIN` set to the Vercel preview origin.
- `npm run smoke:mochi-social-alpha-edge` passes with `MOCHI_SOCIAL_ALPHA_EDGE_URL`, `MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY`, and optionally the local `MOCHI_SOCIAL_GAME_SERVER_TOKEN` set for the Supabase preview branch.
- `npm run check:mochi-social-preview-ready` proves `site.discord-oauth` by verifying the Supabase preview Discord provider starts an OAuth redirect instead of returning `provider is not enabled`.
- Non-testers are blocked from `/games/mochi-social`.
- Allowlisted testers are blocked until terms are acknowledged.
- The iframe receives only the short-lived Supabase access token through `MOCHI_SOCIAL_AUTH`.
- Feedback submissions appear in the leader audit panel.
- For Alpha Preview Ready, Enjin Canary request rows may stay audit-only with `configured-preview-stub`; transaction UUID, optional listing id, status, and finality evidence are required only for Alpha RC Ready.
- The 10-25 tester load-smoke report is attached to the PR or release checklist.

## Manual Browser Gate Evidence

Run these checks only after hosted verification is explicitly approved. Use Chrome with the intended Vercel Preview URL, and record only pass/fail status, reviewer, browser, URL, timestamps, and no-secret notes.

- Signed-out gate: open `/games/mochi-social` in a fresh signed-out session and confirm the page asks for sign-in before the game iframe loads.
- Non-tester gate: sign in with an account that is not active in `mochi_social_alpha_testers` and confirm the allowlist block appears.
- Terms gate: sign in with an allowlisted tester that has not acknowledged the current `MOCHI_SOCIAL_ALPHA_TERMS_VERSION` and confirm the terms acknowledgement appears before the iframe loads.
- Iframe gate: after acknowledgement, confirm the iframe loads `${NEXT_PUBLIC_MOCHI_SOCIAL_URL}/embed` and the game still shows no-real-value/`configured-preview-stub` messaging.
- Bridge gate: inspect browser DevTools messages or temporary console instrumentation only enough to confirm the parent sends `MOCHI_SOCIAL_AUTH` and not refresh tokens, service-role keys, Discord tokens, Enjin tokens, wallet material, or other secrets. Do not copy or screenshot raw access tokens.
- Feedback gate: submit a harmless alpha feedback message, then confirm the leader audit panel shows a feedback row/count without exposing private user data in the report.
- Admin gate: confirm a leader/moderator can grant and revoke alpha access by Supabase user id, then restore the intended tester state.

When all checks pass, stamp the site report with:

```powershell
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_CONFIRMED="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER="<operator name>"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER="<browser/version>"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_URL="<Mochirii Vercel Preview /games/mochi-social URL>"
$env:MOCHI_SOCIAL_SITE_BROWSER_SIGNED_OUT_BLOCKED_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_NON_TESTER_BLOCKED_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_TERMS_GATE_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_IFRAME_LOADS_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_AUTH_BRIDGE_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_FEEDBACK_AUDIT_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_CHAIN_STUB_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_ADMIN_GRANT_REVOKE_OK="true"
```

Do not place screenshots containing account email, OAuth consent tokens, Supabase access tokens, cookies, request headers, service-role values, Discord secrets, or Enjin secrets in Git, reports, PR comments, or chat.

## Rollback

If the alpha preview must be stopped:

1. Revoke new tester grants in the `Mochi Social Alpha` leader panel.
2. Unset or change `NEXT_PUBLIC_MOCHI_SOCIAL_URL` for the affected Vercel preview.
3. Rotate `MOCHI_SOCIAL_GAME_SERVER_TOKEN` in Supabase and Fly if trust is in question.
4. Disable the game iframe route in the preview branch if the route itself is the problem.
5. Preserve ledger events, feedback rows, chat reports, chain operation rows, and request ids for audit.
6. Coordinate with the game repo operator before scaling down Fly, rotating Enjin tokens, or stopping Wallet Daemon signing.

Do not roll back by switching to production, mainnet, cashout, paid assets, public UGC, or browser-exposed service-role keys.

## Operator Setup

Required secrets/config stay out of Git:

- `NEXT_PUBLIC_MOCHI_SOCIAL_URL` in Vercel Preview/Production when the preview is ready.
- `MOCHI_SOCIAL_GAME_SERVER_TOKEN` in Supabase Edge Function secrets and matching Fly game secrets.
- `MOCHI_SOCIAL_ALPHA_TERMS_VERSION` when the acknowledgement copy changes.

Use Chrome for logged-in Vercel, Supabase, GitHub, Discord, Fly, and Enjin dashboards. Use CLI for reproducible checks. Use Computer Use only when CLI and Chrome cannot reach a required UI.

Refresh the local no-secret website-side operator checklist:

```powershell
npm run prepare:mochi-social-alpha-operator-checklist
```

The generated file goes to `C:\Users\xtyty\Desktop\Creds\mochirii-mochi-social-alpha-operator-next-steps.md` by default. It may include PR status, local credential filenames, required env names, and placeholder commands, but it must not contain raw secrets.

After the game-side `npm run alpha:preview-ready` report exists, run the website-side Preview Ready audit:

```powershell
$env:MOCHI_SOCIAL_SITE_PREVIEW_READY_ALLOW_HOSTED="true"
$env:MOCHI_SOCIAL_GAME_CONTRACT_URL="https://mochi-social-game.fly.dev"
$env:MOCHI_SOCIAL_SITE_ORIGIN="<Mochirii Vercel Preview URL>"
$env:MOCHI_SOCIAL_ALPHA_EDGE_URL="https://<preview-project-ref>.supabase.co/functions/v1"
$env:MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY_FILE="C:\Users\xtyty\Desktop\Creds\supabase-preview-<preview-project-ref>-api-keys.local.json"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_CONFIRMED="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER="<operator name>"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER="<browser/version>"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_URL="<Mochirii Vercel Preview /games/mochi-social URL>"
$env:MOCHI_SOCIAL_SITE_BROWSER_SIGNED_OUT_BLOCKED_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_NON_TESTER_BLOCKED_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_TERMS_GATE_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_IFRAME_LOADS_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_AUTH_BRIDGE_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_FEEDBACK_AUDIT_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_CHAIN_STUB_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_ADMIN_GRANT_REVOKE_OK="true"
npm run check:mochi-social-preview-ready
```

This writes ignored no-secret reports to `reports/mochi-social-preview-ready.json`, `reports/mochi-social-preview-ready.md`, and `C:\Users\xtyty\Desktop\Creds\mochirii-mochi-social-preview-ready.md`. It does not approve provider mutations; it stays red until hosted checks, manual browser gates, game Preview Ready, and site branch sync are proven.

For hosted Preview Ready checks, `npm run check:mochi-social-preview-ready` may load the Supabase publishable key from `MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY_FILE`, or from the standard `C:\Users\xtyty\Desktop\Creds\supabase-preview-<preview-project-ref>-api-keys.local.json` file after `MOCHI_SOCIAL_SITE_PREVIEW_READY_ALLOW_HOSTED=true` is set. Reports record only the key source filename/status, never the key value.

Run local verification:

```powershell
npm run check:mochi-social-alpha
npm run check:mochi-social-preview-ready
npm run check:mochi-social-game-contract
npm run smoke:mochi-social-alpha-edge
npm run check:supabase-edge-types
npm run check
cd apps/web
npm run lint
npm run build
```
