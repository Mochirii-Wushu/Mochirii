# Mochi Social Alpha Integration

Mochi Social stays in the separate `xartaiusx/mochi-social` game repo. This Mochirii repo owns the website doorway, Supabase schema, Edge Functions, alpha access controls, terms acknowledgement, and tester feedback.

Codex external operations for this website surface are defined in [`docs/mochi-social-alpha-codex-ops.md`](mochi-social-alpha-codex-ops.md). Use it for source hierarchy, tool choice, preview env ownership, Supabase authority, Discord boundaries, preview verification, and secret-entry rules.

Visual work uses the same Mochirii High-Fidelity Wuxia world direction as the game, but ownership remains split: Mochirii owns the tester-password gate, strict Supabase/Discord access screens, and unlocked iframe shell; the Mochi Social game repo owns RPGJS maps, sprites, HUD, manifests, and asset ledger. Vercel Deployment Protection, the tester-password gate, and Supabase/Discord allowlist are separate access layers and should not be treated as interchangeable.

## Alpha Posture

- Closed preview only.
- First live target is Alpha Preview Ready on Vercel Preview, not production.
- Enjin Canary only.
- No real-money value, no cashout, no paid assets, no mainnet.
- Curated assets only; no open creator uploads.
- Tester-password preview access for the first live website pass; signed-in allowlisted testers remain the stricter Supabase mode for Alpha RC.
- Chat/action logs are retained for alpha moderation and audit workflows.

## Alpha Preview Ready

Alpha Preview Ready is the first tester-entry stop point. The Mochirii Vercel Preview can embed the Fly game while Enjin remains visible as `configured-preview-stub`.

- `preview-live-gates`: Vercel Preview route, `NEXT_PUBLIC_MOCHI_SOCIAL_URL`, tester-password access, no-real-value labels, and approved hosted contract checks. Supabase allowlist, terms, feedback, and short-lived `MOCHI_SOCIAL_AUTH` stay available in strict `MOCHI_SOCIAL_ALPHA_ACCESS_MODE=supabase`.
- `funded-chain-gates`: cENJ, real Enjin collection ID, real Fuel Tank ID, Wallet Daemon signing, and finalized proof smoke.
- `funded-chain-gates` are expected red until later approval. Do not set dummy `ENJIN_COLLECTION_ID`, dummy `ENJIN_FUEL_TANK_ID`, or fake readiness flags to clear them.
- Chain request rows may be audit-only preview records while the game reports `configured-preview-stub`; they must not credit inventory, settle trades, settle listings, or imply real player value.
- Alpha RC Ready comes later, after Alpha Preview Ready plus funded Canary collection, Fuel Tank, Wallet Daemon signing, and finality evidence.

## Website Route

- Route: `/games/mochi-social`
- Public env: `NEXT_PUBLIC_MOCHI_SOCIAL_URL`
- Default live preview mode is `MOCHI_SOCIAL_ALPHA_ACCESS_MODE=tester-password`. The route shows a password-unlocked preview screen, verifies the tester password through a server-only route, sets an HttpOnly cookie scoped to `/games/mochi-social`, then embeds `${NEXT_PUBLIC_MOCHI_SOCIAL_URL}/embed`.
- Server-only password config is `MOCHI_SOCIAL_TESTER_PASSWORD`. The app derives comparison keys with `scrypt`; do not use a `NEXT_PUBLIC_*` password value and do not commit the password.
- Strict Supabase mode is still available with `MOCHI_SOCIAL_ALPHA_ACCESS_MODE=supabase`. In that mode the route checks Supabase session state, calls `mochi-social-alpha-session`, requires an active allowlist row, requires terms acknowledgement, then embeds `${NEXT_PUBLIC_MOCHI_SOCIAL_URL}/embed`.
- Supabase mode forwards only a short-lived Supabase access token through the existing `MOCHI_SOCIAL_AUTH` postMessage bridge, listens for `MOCHI_SOCIAL_READY`, `MOCHI_SOCIAL_AUTH_STATE`, and `MOCHI_SOCIAL_ERROR` from the configured game origin, and shows only non-secret bridge status. Password mode sends a sign-out/guest bridge message only.
- The Supabase preview project must have Discord OAuth enabled before signed-in browser gates can pass. The Discord Developer Portal must allow the Supabase preview callback URL, for example `https://dnxumaiooljdnbjvzbdc.supabase.co/auth/v1/callback`, and the website redirects back to the preview `/account` route.

## Supabase Functions

- `mochi-social-alpha-session`: signed-in user access, allowlist, terms acknowledgement, profile prep.
- `mochi-social-alpha-action`: game-server action ledger using `x-mochi-social-server-token`; `verify_jwt=false` is intentional and covered by `check:security-hardening`. The game server resolves the short-lived Supabase access token to a user id before forwarding. The function verifies allowlist and terms, then records Mochi Spirit, market, trade, chat, chain, and append-only ledger state.
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

- This is a closed alpha preview for approved 18+ testers only.
- Mochi Spirits, currency, listings, trades, and Enjin Canary operations have no real value.
- Use a desktop browser and enter the tester password before opening the game page.
- In strict Supabase mode, sign in through Mochirii and acknowledge the alpha terms before the game iframe loads.
- Try the first loop: move around town, invite Lirabao, scout Moonbridge and Cloudbell, record the Jade Court Research Folio proof, care for the active Mochi Spirit, inspect the HUD, send one local chat message, use one emote, create one fixed-price listing proof, create one direct trade proof, and request the Lirabao Canary certificate proof.
- Send bugs through the Mochirii feedback form. Do not send secrets, wallet seed phrases, payment information, or private recovery material in feedback.

## Preview Acceptance

Before inviting testers:

- The game repo `npm run smoke`, `npm run alpha:local-acceptance`, and `npm run alpha:load-smoke` checks have passed against the intended game URL.
- The Mochirii preview uses `NEXT_PUBLIC_MOCHI_SOCIAL_URL` for the Fly game URL.
- The Mochirii preview has `MOCHI_SOCIAL_ALPHA_ACCESS_MODE=tester-password` plus a server-only tester password configured before testers are invited.
- The password-unlocked preview renders the iframe and keeps the game no-real-value/`configured-preview-stub`.
- `npm run smoke:mochi-social-tester-password-local` passes locally, proving the `/games/mochi-social` tester-password lock, invalid-password redirect, scoped HttpOnly cookie, iframe shell, no-real-value/`configured-preview-stub` copy, and logout path without contacting hosted providers.
- `npm run check:mochi-social-edge-authority` passes locally, proving server-token authority, append-only/idempotent ledger expectations, Canary/no-real-value stamping, and finalized-only chain inventory movement.
- `npm run check:mochi-social-preview-ready` includes `site.bridge-state`, `site.auth-bridge`, `site.preview-key-loader`, `site.discord-oauth-detector`, and `site.edge-authority` before hosted Supabase Edge smoke, so hosted checks never stand in for local bridge, publishable-key loading, Discord detector, authority, or finality invariants.
- `npm run check:mochi-social-bridge-state` passes locally, proving the parent bridge resolver ignores malformed messages, answers `MOCHI_SOCIAL_READY` with an auth resend, records `MOCHI_SOCIAL_AUTH_STATE` as non-secret status, and reports `MOCHI_SOCIAL_ERROR` with generic copy only.
- `npm run check:mochi-social-game-contract` passes with `MOCHI_SOCIAL_GAME_CONTRACT_URL` set to the intended game URL and, when available, `MOCHI_SOCIAL_SITE_ORIGIN` set to the Vercel preview origin.
- `npm run smoke:mochi-social-alpha-edge` passes with `MOCHI_SOCIAL_ALPHA_EDGE_URL`, `MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY`, and optionally the local `MOCHI_SOCIAL_GAME_SERVER_TOKEN` set for the Supabase preview branch.
- `npm run check:mochi-social-preview-ready` proves `site.discord-oauth` by verifying the Supabase preview Discord provider starts an OAuth redirect instead of returning `provider is not enabled`.
- `npm run check:mochi-social-discord-oauth` locally self-tests both Discord redirect success and Supabase unsupported-provider failure detection without contacting live Supabase or Discord.
- Users without the tester password are blocked from `/games/mochi-social`.
- In strict Supabase mode, non-testers are blocked, allowlisted testers are blocked until terms are acknowledged, the iframe receives only the short-lived Supabase access token through `MOCHI_SOCIAL_AUTH`, and feedback submissions appear in the leader audit panel.
- For Alpha Preview Ready, Enjin Canary request rows may stay audit-only with `configured-preview-stub`; transaction UUID, optional listing id, status, and finality evidence are required only for Alpha RC Ready.
- The 10-25 tester load-smoke report is attached to the PR or release checklist.

## Manual Browser Gate Evidence

Run these checks only after hosted verification is explicitly approved. Use Chrome with the intended Vercel Preview URL, and record only pass/fail status, reviewer, browser, URL, timestamps, and no-secret notes.

- Password gate: open `/games/mochi-social` in a fresh session and confirm the page asks for the tester password before the game iframe loads.
- Password iframe gate: enter the approved tester password and confirm the iframe loads `${NEXT_PUBLIC_MOCHI_SOCIAL_URL}/embed`.
- Alpha route-sheet gate: confirm the unlocked tester page shows the Jade Lantern Court route sheet with Arrival, Spirits, Routes, Battle, Social, and Canary loops, including no-real-value/`configured-preview-stub` Canary copy.
- Signed-out gate for strict Supabase mode: open `/games/mochi-social` in a fresh signed-out session with `MOCHI_SOCIAL_ALPHA_ACCESS_MODE=supabase` and confirm the page asks for sign-in before the game iframe loads.
- Non-tester gate: sign in with an account that is not active in `mochi_social_alpha_testers` and confirm the allowlist block appears.
- Terms gate: sign in with an allowlisted tester that has not acknowledged the current `MOCHI_SOCIAL_ALPHA_TERMS_VERSION` and confirm the terms acknowledgement appears before the iframe loads.
- Iframe gate: after acknowledgement, confirm the iframe loads `${NEXT_PUBLIC_MOCHI_SOCIAL_URL}/embed` and the game still shows no-real-value/`configured-preview-stub` messaging.
- Bridge gate: inspect browser DevTools messages or temporary console instrumentation only enough to confirm the parent receives `MOCHI_SOCIAL_READY`, sends `MOCHI_SOCIAL_AUTH`, updates the non-secret bridge status on `MOCHI_SOCIAL_AUTH_STATE`/`MOCHI_SOCIAL_ERROR`, and does not send refresh tokens, service-role keys, Discord tokens, Enjin tokens, wallet material, or other secrets. Do not copy or screenshot raw access tokens.
- Feedback gate: submit a harmless alpha feedback message, then confirm the leader audit panel shows a feedback row/count without exposing private user data in the report.
- Admin gate: confirm a leader/moderator can grant and revoke alpha access by Supabase user id, then restore the intended tester state.

For the default password-first Preview Ready page, stamp the durable no-secret browser-gate report with:

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
$env:MOCHI_SOCIAL_SITE_BROWSER_TESTER_ROUTE_SHEET_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_TESTER_FEEDBACK_DRAFT_OK="true"
npm run prepare:mochi-social-browser-gates
```

For the later strict Supabase/Discord allowlist mode, use `MOCHI_SOCIAL_SITE_BROWSER_GATES_ACCESS_MODE="supabase"` and stamp the strict gate set only after those checks actually pass:

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

This writes ignored no-secret evidence to `reports/mochi-social-browser-gates.json`, `reports/mochi-social-browser-gates.md`, and `C:\Users\xtyty\Desktop\Creds\mochirii-mochi-social-browser-gates.md`. The later `npm run check:mochi-social-preview-ready` pass can read that saved report, but hosted browser evidence still requires `MOCHI_SOCIAL_SITE_PREVIEW_READY_ALLOW_HOSTED=true` during the Preview Ready audit.

Do not place screenshots containing account email, OAuth consent tokens, Supabase access tokens, cookies, request headers, service-role values, Discord secrets, or Enjin secrets in Git, reports, PR comments, or chat.

After generating site reports or no-secret handoff files, run:

```powershell
npm run check:mochi-social-report-hygiene
```

This scans the ignored Mochi Social site reports plus the Mochirii no-secret handoff files under `C:\Users\xtyty\Desktop\Creds` for obvious token, key, email, and wallet-file material without printing values.
`npm run check:mochi-social-preview-ready` requires this hygiene report to be current for the site worktree.

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
- `MOCHI_SOCIAL_ALPHA_ACCESS_MODE=tester-password` for the password-unlocked preview, or `supabase` for the strict allowlist path.
- `MOCHI_SOCIAL_TESTER_PASSWORD` in Vercel server env for the password-unlocked preview.
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
npm run check:mochi-social-preview-ready
```

This writes ignored no-secret reports to `reports/mochi-social-preview-ready.json`, `reports/mochi-social-preview-ready.md`, and `C:\Users\xtyty\Desktop\Creds\mochirii-mochi-social-preview-ready.md`. It does not approve provider mutations; it stays red until hosted checks, saved manual browser gates, game Preview Ready, and site branch sync are proven.

For hosted Preview Ready checks, `npm run check:mochi-social-preview-ready` may load the Supabase publishable key from `MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY_FILE`, or from the standard `C:\Users\xtyty\Desktop\Creds\supabase-preview-<preview-project-ref>-api-keys.local.json` file after `MOCHI_SOCIAL_SITE_PREVIEW_READY_ALLOW_HOSTED=true` is set. Reports record only the key source filename/status, never the key value.

Run local verification:

```powershell
npm run check:mochi-social-alpha
npm run check:mochi-social-bridge-state
npm run check:mochi-social-edge-authority
npm run smoke:mochi-social-tester-password-local
npm run check:mochi-social-report-hygiene
npm run check:mochi-social-preview-ready
npm run check:mochi-social-game-contract
npm run smoke:mochi-social-alpha-edge
npm run check:supabase-edge-types
npm run check
cd apps/web
npm run lint
npm run build
```
