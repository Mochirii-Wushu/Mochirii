# Mochi Social Account Progress Authority

Mochirii owns the Supabase side of signed-in Mochi Social progression. The game repo owns runtime behavior and guest fallback, but account-linked persistence lives here.

## Source Basis

- Supabase `getUser(jwt)` validation: https://supabase.com/docs/reference/javascript/auth-getuser
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Edge Functions and secrets: https://supabase.com/docs/guides/functions
- Supabase Edge Function secrets: https://supabase.com/docs/guides/functions/secrets

## Authority Contract

- `mochi_social_progress_snapshots` stores one no-real-value alpha snapshot per Supabase user.
- `mochi-social-alpha-progress` loads a snapshot only for a game-server-verified, allowlisted tester who has accepted the alpha terms.
- `mochi-social-alpha-action` remains idempotent through `mochi_social_ledger_events.request_id`, records the action ledger, and updates the snapshot when the game sends `payload.state`.
- Browser code never receives service-role keys, game server tokens, Discord secrets, Enjin secrets, wallet material, or refresh tokens.
- RLS allows signed-in users to read their own progress snapshot as defense in depth; privileged writes stay in Edge Functions.
- Tester-password mode remains guest-only and should not claim account persistence.

## Parallel-Agent Guardrail

This repo currently has unrelated Reaper/ModMail work in flight in some branches. Before implementation, run `git status --short --branch`, avoid unrelated Reaper/Discord files, stage exact files or hunks only, and never bundle unrelated dirty work into a Mochi Social commit.

## No-Cost Boundary

This setup is schema/function code only until an operator deploys it. Do not deploy Supabase functions, apply remote migrations, change Vercel/Supabase env vars, rotate secrets, or run hosted preview checks without fresh approval when usage or costs may be involved.
