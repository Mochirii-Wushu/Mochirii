# Reaper And Instagram Integration Implementation - 2026-06-08

## Summary

The website and Supabase side of moderator-controlled Instagram publishing remains deployed in production. Reaper command handling has been pivoted from an unidentified long-running bot host to a Supabase-hosted Discord Interactions webhook.

## Completed

- Created private GitHub repo: <https://github.com/Mochirii-Wushu/Reaper>.
- Cloned local workspace: `C:\Users\xtyty\Documents\Reaper`.
- Added Node 20 / TypeScript / `discord.js` v14 bot scaffold.
- Added guild-scoped `/submit` command schema with optional boolean `share_to_instagram`.
- Added Supabase ingest client using `x-mochirii-reaper-secret`.
- Added tests for:
  - omitted Instagram opt-in defaults to `false`;
  - explicit `false` remains `false`;
  - explicit `true` maps to `instagramOptIn: true`;
  - wrong-channel submissions fail before Supabase ingest;
  - duplicate responses preserve consent messaging;
  - command schema includes the optional boolean;
  - Supabase ingest call uses the expected URL, header, and JSON payload.
- Pushed initial Reaper commit `c9f137d` to `main`.
- Reaper GitHub Actions CI completed successfully.
- Added Supabase Edge Function `reaper-discord-interactions`.
- Deployed `reaper-discord-interactions` to Supabase production with `verify_jwt=false`.
- Set Discord Interactions Endpoint URL to `https://deyvmtncimmcinldjyqe.supabase.co/functions/v1/reaper-discord-interactions`.
- Discord accepted the endpoint after signed PING verification.
- Registered guild-scoped `/submit` command with optional boolean `share_to_instagram`.
- Set Supabase Discord secret names needed by the webhook without recording values:
  - `DISCORD_PUBLIC_KEY`
  - `DISCORD_APPLICATION_ID`
  - `DISCORD_BOT_TOKEN`

## Website And Supabase Checks

- `bun scripts/check-instagram-gallery-publishing.mjs`: passed.
- `bun scripts/smoke-supabase-edge-functions.mjs`: passed.
- `curl -I -L https://mochirii.com/`: returned `200 OK` with `Server: Vercel`.

## Remaining Gated Steps

- Complete Meta for Developers phone verification before Instagram app/token setup can continue.
- Set real Instagram production secrets in Supabase only:
  - `INSTAGRAM_ACCOUNT_ID`
  - `INSTAGRAM_ACCESS_TOKEN`
  - `INSTAGRAM_API_VERSION`
- Run one non-live Discord webhook dry run with `share_to_instagram:false`.
- Run one non-live Discord webhook dry run with `share_to_instagram:true`.
- Verify the Leader Dashboard Instagram Queue with moderator auth.
- Publish one real Instagram test post only after explicit action-time owner approval.

## Guardrails

- Discord submission does not publish to Instagram.
- Website gallery approval does not publish to Instagram automatically.
- Instagram publishing remains a moderator-confirmed Leader Dashboard action.
- No Instagram token, Discord bot token, Supabase service role key, ingest secret, signed URL, or private payload value was committed or recorded.
