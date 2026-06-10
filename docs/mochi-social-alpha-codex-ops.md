# Mochi Social Alpha Codex Ops

This website-side runbook keeps Codex aligned while operating the Mochirii preview, Supabase authority, Discord boundaries, and admin tester workflow for Mochi Social Alpha RC.

## Source Basis

- Codex manual: `AGENTS.md`, skills, MCP, Chrome, Computer Use, and hooks.
- GitHub Docs: Actions billing, budgets, branch protection, required checks, and PR checks.
- Vercel Docs: Preview environment variables.
- Supabase Docs: Edge Function secrets and authenticated user/session handling.
- Discord Docs: OAuth2, `state`, scopes, bot tokens, and permissions.
- OWASP: secrets management, least privilege, rotation, and incident response.
- Mochi Social game repo docs: Fly, Enjin Canary, Fuel Tank, Wallet Daemon, WebSocket presence, and game-runtime acceptance.

## Source Hierarchy

Use sources in this order:

1. Official platform docs for current behavior.
2. Mochirii and Mochi Social repo docs for project decisions.
3. Live Vercel, Supabase, GitHub, Discord, Fly, and Enjin dashboards for current deployment state.
4. Prior memory only for user preferences and historical context.

Do not use memory as current truth for secrets, deployment URLs, payment/billing state, branch status, or provider dashboard state.

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
| Game URL | Fly | `NEXT_PUBLIC_MOCHI_SOCIAL_URL` |
| Supabase public browser config | Vercel Preview | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Site URL | Vercel Preview | `NEXT_PUBLIC_SITE_URL` |
| Supabase privileged writes | Supabase Edge Functions | service-role stays server-side |
| Game server trust | Supabase Edge and Fly | shared `MOCHI_SOCIAL_GAME_SERVER_TOKEN` secret name only |

Branch-specific Vercel preview env should override only the Mochi Social values needed for the alpha PR. Production env must not be changed for Alpha RC unless a later production plan is approved.

## Supabase Authority Matrix

| Capability | Website-side authority |
| --- | --- |
| Session refresh | Next.js browser client |
| Game iframe auth | short-lived Supabase access token via `MOCHI_SOCIAL_AUTH` |
| Alpha allowlist | `mochi_social_alpha_testers` |
| Terms acknowledgement | Supabase Edge session/action functions |
| Game action writes | `mochi-social-alpha-action` with scoped server token |
| Admin grant/revoke/audit | `mochi-social-alpha-admin` |
| Feedback | `submit-mochi-social-feedback` |
| Chain ledger | Supabase tables and append-only ledger rows |

Browser code must never receive service-role keys, Discord bot tokens, Enjin tokens, Wallet Daemon secrets, or refresh tokens from the parent page.

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
- Non-testers are blocked from `/games/mochi-social`.
- Allowlisted testers are blocked until terms are acknowledged.
- The iframe receives only `MOCHI_SOCIAL_AUTH` with a short-lived access token.
- Feedback appears in the leader audit panel.
- Chain operation rows record request id, transaction UUID, optional listing ID, state, and finality evidence.
- Two-tab game presence is verified separately in the game runtime.

## Secret Entry Protocol

- The user types secrets privately.
- Codex verifies secret names, status, digests, timestamps, health checks, or successful route behavior only.
- Never paste secret values into docs, logs, PR comments, screenshots, browser-visible UI, or chat.
- Rotate `MOCHI_SOCIAL_GAME_SERVER_TOKEN`, Discord secrets, Enjin tokens, and provider keys if exposed.
