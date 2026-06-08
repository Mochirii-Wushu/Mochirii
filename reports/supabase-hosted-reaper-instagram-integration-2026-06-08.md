# Supabase-Hosted Reaper Instagram Integration - 2026-06-08

## Summary

Reaper gallery submissions are now implemented as a Supabase-hosted Discord Interactions webhook instead of a long-running Discord Gateway runtime. This removes the unresolved host/process-manager blocker while preserving the existing Supabase gallery ingest, moderation queue, Instagram consent, and moderator-controlled publishing model.

## Implemented In This Packet

- Added Supabase Edge Function `reaper-discord-interactions` with `verify_jwt = false`.
- Added Discord request signature verification using `x-signature-ed25519`, `x-signature-timestamp`, and `DISCORD_PUBLIC_KEY`.
- Added Discord PING handling with PONG response.
- Added `/submit` handling for:
  - `image`
  - `title`
  - `subtitle`
  - optional `share_to_instagram`
- Mapped `subtitle` to existing gallery `caption`.
- Mapped `share_to_instagram` to existing ingest payload `instagramOptIn`.
- Enforced guild `1078630751077142608`, gallery channel `1508077313965817856`, and required role IDs before ingest.
- Deferred the Discord response immediately and used `EdgeRuntime.waitUntil()` to call `submit-discord-gallery-image` in the background.
- Added static validation script `scripts/check-reaper-discord-interactions.mjs`.
- Added the new function to `scripts/check-all.mjs` and `scripts/check-supabase-edge-types.mjs`.
- Updated Supabase docs and the Instagram deployment runbook to record the Supabase-hosted Reaper model.
- Updated the private Reaper repo docs so the Node Gateway scaffold is treated as a helper and rollback reference, not the primary production runtime.
- Created ignored local Reaper env file `C:\Users\xtyty\Documents\Reaper\.env.local` from the owner-provided token file. Secret values were not printed or committed.

## Validation

Mochirii repo:

```text
node scripts/check-reaper-discord-interactions.mjs
node scripts/check-all.mjs
node scripts/check-production.mjs
git diff --check
cd apps/web && node node_modules/eslint/bin/eslint.js .
cd apps/web && node node_modules/next/dist/bin/next build
```

Result:

- Reaper Discord Interactions validation passed.
- Full local validation passed.
- Production smoke check passed.
- Next ESLint passed.
- Next production build passed.
- Deno 2.8.2 was installed locally to complete Supabase Edge type validation.
- Supabase Edge Function type validation passed for all registered functions, including `reaper-discord-interactions`.
- Existing asset warning remains unchanged: `assets/audio/mochiriiiiii.mp3` is over the local warning threshold.

Reaper repo:

```text
bun run typecheck
bun test
bun run build
git diff --check
```

Result:

- Typecheck passed.
- Seven tests passed.
- Build passed.
- Diff whitespace check passed.

## Dashboard State To Finish

Supabase CLI is installed, but remote access is not authenticated in the local shell. The Supabase connector was used to deploy the Edge Function.

Completed in Supabase project `deyvmtncimmcinldjyqe`:

- Deployed `reaper-discord-interactions` version 1.
- Confirmed function status `ACTIVE`.
- Confirmed `verify_jwt=false`.
- Set secret `DISCORD_PUBLIC_KEY` from Discord Developer Portal.
- Confirmed `DISCORD_PUBLIC_KEY` digest matches the Discord public key.
- Set secret `DISCORD_APPLICATION_ID=1156448856565887066`.
- Set/update secret `DISCORD_BOT_TOKEN` from the provided local token file.
- Preserved existing `DISCORD_GUILD_ID`, `DISCORD_GALLERY_CHANNEL_ID`, `DISCORD_REQUIRED_ROLE_IDS`, and `DISCORD_GALLERY_INGEST_SECRET`.

Still required in Supabase project `deyvmtncimmcinldjyqe`:

- Set real Instagram secrets when available:
  - `INSTAGRAM_ACCOUNT_ID`
  - `INSTAGRAM_ACCESS_TOKEN`
  - `INSTAGRAM_API_VERSION`

Completed in Discord Developer Portal:

- Set Interactions Endpoint URL to `https://deyvmtncimmcinldjyqe.supabase.co/functions/v1/reaper-discord-interactions`.
- Verified Discord accepted the endpoint after a signed PING.
- Supabase function invocation evidence shows a `200` POST at `08 Jun 26 01:26:53`.
- Registered the guild-scoped `/submit` command with optional boolean `share_to_instagram`.
- Confirmed Discord API command schema:
  - `image`, type `11`, required.
  - `title`, type `3`, required.
  - `subtitle`, type `3`, required.
  - `share_to_instagram`, type `5`, optional.

Still required for Instagram:

- Complete Meta for Developers account verification for the owner account. Meta is currently asking for a 6-digit SMS verification code before app/token setup can continue.
- Store Instagram credentials only in Supabase secrets.
- Stop before any real Instagram post until action-time owner approval is given.

## Guardrails

- Discord submission creates only a pending website gallery submission.
- Website gallery approval creates an Instagram queue job only when the member opted in.
- A moderator must confirm each Instagram publish action from the Leader Dashboard.
- No Discord token, Instagram token, Supabase service-role key, ingest secret, signed URL, or private payload value was committed or recorded.
- No Vercel, DNS, Supabase Auth redirect, public Gallery display rule, or website copy changes were made in this implementation packet.
