# Supabase Public Function and Migration Hardening Review

Generated: 2026-07-02

This report is intentionally no-secret. It records Supabase Edge Function, migration, grant, RLS, advisor, and validation evidence without tokens, service-role values, database URLs, webhook URLs, private headers, cookies, or secret digests.

## Result

- Local Supabase security/performance gate: pass.
- Edge Function type gate: pass for all configured functions.
- Relevant Deno tests: pass.
- Strict provider evidence: pass.
- New migrations added: none. No actual code or schema gap was found that is safe to change without provider mutation or product review.
- GitHub Supabase Preview: still skipped by the existing GitHub/Supabase integration state, not changed here.

## JWT-Disabled Function Contracts

| Function | Intentional public contract | Evidence |
| --- | --- | --- |
| `list-approved-gallery-submissions` | Public read-only gallery DTO. Uses service role internally, returns public-safe approved submission fields and signed media URLs. | `verify_jwt = false`, wildcard CORS, no direct table grants for anon. |
| `submit-discord-gallery-image` | Internal Reaper gallery ingest endpoint. Authenticated by `DISCORD_GALLERY_INGEST_SECRET` via bearer/header secret, validates guild/channel/role config, restricts attachment hosts to Discord CDN hosts. | `x-mochirii-reaper-secret`, protected CORS wrapper, guild/channel guard. |
| `reaper-discord-interactions` | Discord Interactions webhook. Public at network edge because Discord must call it; authenticates every request with Ed25519 signature and timestamp, then applies guild/channel/moderator gates. | `x-signature-ed25519`, `x-signature-timestamp`, `DISCORD_PUBLIC_KEY`, expected guild/channel constants. |
| `reaper-discord-member-sync` | Reaper-only pending-verification sync endpoint. Authenticated by shared header secret and guarded by expected guild ID plus Discord retry budget. | `x-mochirii-reaper-member-sync-secret`, `REAPER_PENDING_VERIFICATION_SYNC_SECRET`, 429 retry budget. |
| `send-vote-reminder` | Cron/operator vote reminder endpoint. Authenticated by cron secret through bearer or header and guarded by expected guild/vote channel. | `VOTE_REMINDER_CRON_SECRET`, `x-mochirii-vote-reminder-secret`, expected guild/channel constants. |
| `send-member-spotlight-poll` | Cron/operator spotlight poll sender. Authenticated by spotlight cron secret and validates Discord poll config. | shared spotlight secret header, expected guild config. |
| `publish-member-spotlight-winner` | Cron/operator spotlight winner publisher. Authenticated by spotlight cron secret and uses service-role workflow internally. | shared spotlight secret header, service-role admin client. |
| `get-current-spotlight-winner` | Public read-only current spotlight winner DTO. | GET-only public DTO wrapper. |
| `list-visible-profile-cards` | Public read-only member profile card DTO for published profiles. | filters `profile_public_enabled = true`, returns public-safe profile/media data. |
| `mochi-social-alpha-action` | Mochi Social game-server handoff. JWT-disabled because the Unity/game server calls it; authenticated by game server token and still verifies player allowlist/terms before writes. | `x-mochi-social-server-token`, `requireGameServer`, alpha access checks. |
| `mochi-social-alpha-progress` | Mochi Social game-server progress read. Authenticated by game server token and verifies player allowlist/terms before returning account progress. | `x-mochi-social-server-token`, `requireGameServer`, alpha access checks. |

## Internal Reaper Ingest Call

`reaper-discord-interactions` calls `submit-discord-gallery-image` through the Supabase Functions URL with `DISCORD_GALLERY_INGEST_SECRET` in `x-mochirii-reaper-secret`. This keeps the Discord webhook signature boundary separate from the gallery ingest boundary.

Rate-limit posture:

- Discord API calls in `reaper-discord-interactions` use a retry budget for `429` responses.
- The internal Supabase Function call does not retry blindly, which avoids doubling gallery submissions under transient provider errors.
- `submit-discord-gallery-image` has duplicate lookup/idempotency-style guards before insert and validates Discord CDN source URLs before storage upload.

## Grants and RLS

- Public browser clients do not receive broad direct table access.
- Public read surfaces are exposed through narrow Edge Function DTOs, not anonymous table grants.
- User-facing authenticated tables have explicit grants plus RLS policies in migrations, including member profiles, gallery submissions, member profile media, storage object paths, and Mochi Social alpha tables.
- Service-role-only audit/sync/moderation/internal tables keep RLS enabled with no anon/authenticated policies by design; they are documented in `supabase/README.md` and guarded by `scripts/check-supabase-security-performance.mjs`.
- Preview compatibility for Mochi Social explicit grants remains guarded by `20260622204823_add_mochi_social_alpha_explicit_grants.sql`, which grants only to existing tables.

## Advisor Evidence

Security advisors currently report:

- `13` `RLS Enabled No Policy` info notices for documented service-role-only tables.
- `1` leaked-password-protection warning for Supabase Auth. Enabling it is a dashboard/provider setting mutation and was not changed here.

Performance advisors currently report:

- `14` unindexed foreign-key info notices, primarily newer Mochi Social alpha tables.
- `13` RLS init-plan warnings where `auth.uid()` or related functions should be wrapped in `select` for scale.
- `32` unused-index info notices. These should not be removed based only on early low traffic; keep watching after production usage matures.

Logical follow-ups:

1. Add a reviewed migration for the Mochi Social foreign-key indexes before alpha traffic grows.
2. Add a reviewed migration to wrap relevant RLS auth calls with `(select auth.uid())` / `(select auth.role())` where policies are performance-sensitive.
3. Decide whether to enable leaked-password protection in the Supabase dashboard. That is a provider mutation and requires explicit approval.
4. Keep unused-index advisories as observation-only until there is enough real traffic to justify removal.

## Validation

- `npm run check:supabase-security-performance`: pass.
- `npm run check:supabase-edge-types`: pass.
- `npm run test:mochi-social-alpha`: `4` passed.
- `npm run test:spotlight-poll`: `4` passed.
- `npm run test:vote-reminder`: `5` passed.
- `npm run test:modmail-audit`: `8` passed.
- `npm run check:full-stack-release-evidence -- --providers --strict-provider`: pass.
- `supabase db lint --linked --level warning --fail-on none --output-format json`: no schema errors found.