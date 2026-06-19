# Mochi Social Account Progress Authority

Mochirii owns the Supabase side of signed-in Mochi Social progression. The game repo owns runtime behavior and guest fallback, but account-linked persistence lives here.

## Authority Contract

- `mochi_social_progress_snapshots` stores one no-real-value alpha snapshot per Supabase user.
- `mochi-social-alpha-progress` loads a snapshot only for a game-server-verified, allowlisted tester who has accepted the alpha terms.
- `mochi-social-alpha-action` remains idempotent through `mochi_social_ledger_events.request_id`, records the action ledger, and updates the snapshot when the game sends `payload.state`.
- Browser code never receives service-role keys, game server tokens, Discord secrets, Enjin secrets, wallet material, or refresh tokens.
- RLS allows signed-in users to read their own progress snapshot as defense in depth; privileged writes stay in Edge Functions.
- Tester-password mode remains guest-only and should not claim account persistence.

## No-Cost Boundary

This setup is schema/function code only until an operator deploys it. Do not deploy Supabase functions, apply remote migrations, change Vercel/Supabase env vars, rotate secrets, or run hosted preview checks without fresh approval when usage or costs may be involved.
