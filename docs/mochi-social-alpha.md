# Mochi Social Alpha Integration

Mochi Social stays in the separate `xartaiusx/mochi-social` game repo. This Mochirii repo owns the website doorway, Supabase schema, Edge Functions, alpha access controls, terms acknowledgement, and tester feedback.

## Alpha Posture

- Closed preview only.
- Enjin Canary only.
- No real-money value, no cashout, no paid assets, no mainnet.
- Curated assets only; no open creator uploads.
- Signed-in allowlisted testers only.
- Chat/action logs are retained for alpha moderation and audit workflows.

## Website Route

- Route: `/games/mochi-social`
- Public env: `NEXT_PUBLIC_MOCHI_SOCIAL_URL`
- The route checks Supabase session state, calls `mochi-social-alpha-session`, requires an active allowlist row, requires terms acknowledgement, then embeds `${NEXT_PUBLIC_MOCHI_SOCIAL_URL}/embed`.
- The page forwards only a short-lived Supabase access token through the existing `MOCHI_SOCIAL_AUTH` postMessage bridge.

## Supabase Functions

- `mochi-social-alpha-session`: signed-in user access, allowlist, terms acknowledgement, profile prep.
- `mochi-social-alpha-action`: game-server action ledger using `x-mochi-social-server-token`; `verify_jwt=false` is intentional and covered by `check:security-hardening`. The game server resolves the short-lived Supabase access token to a user id before forwarding. The function verifies allowlist and terms, then records pet, market, trade, chat, chain, and append-only ledger state.
- `mochi-social-alpha-admin`: leader/moderator grant, revoke, list, and audit controls for alpha testers.
- `submit-mochi-social-feedback`: authenticated tester feedback.

## Leader Workflow

- Open `/leader-dashboard` with a Discord Moderator account.
- Use the `Mochi Social Alpha` panel to grant or revoke closed-alpha access by Supabase user id.
- Use the same panel to inspect active testers, revoked testers, ledger event count, active fixed-price listings, offered direct trades, pending Enjin Canary operations, feedback count, chat count, and recent ledger/chain/feedback rows.
- Keep all rows no-real-value and Canary-only until a later production/mainnet review plan is approved.

## Operator Setup

Required secrets/config stay out of Git:

- `NEXT_PUBLIC_MOCHI_SOCIAL_URL` in Vercel Preview/Production when the preview is ready.
- `MOCHI_SOCIAL_GAME_SERVER_TOKEN` in Supabase Edge Function secrets and matching Fly game secrets.
- `MOCHI_SOCIAL_ALPHA_TERMS_VERSION` when the acknowledgement copy changes.

Run local verification:

```powershell
npm run check:mochi-social-alpha
npm run check:supabase-edge-types
npm run check
cd apps/web
npm run lint
npm run build
```
