# Reaper And Instagram Integration Implementation - 2026-06-08

## Summary

The website and Supabase side of moderator-controlled Instagram publishing remains deployed in production, and the missing Reaper source layer has now been created.

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

## Website And Supabase Checks

- `bun scripts/check-instagram-gallery-publishing.mjs`: passed.
- `bun scripts/smoke-supabase-edge-functions.mjs`: passed.
- `curl -I -L https://mochirii.com/`: returned `200 OK` with `Server: Vercel`.

## Remaining Gated Steps

- Set Reaper runtime secrets on the bot host:
  - `DISCORD_BOT_TOKEN`
  - `DISCORD_APPLICATION_ID`
  - `DISCORD_GUILD_ID`
  - `DISCORD_GALLERY_CHANNEL_ID`
  - `SUPABASE_FUNCTIONS_URL`
  - `DISCORD_GALLERY_INGEST_SECRET`
- Register the updated guild-scoped Discord command from the Reaper runtime.
- Run one non-live Reaper dry run with `share_to_instagram:false`.
- Run one non-live Reaper dry run with `share_to_instagram:true`.
- Set real Instagram production secrets in Supabase only:
  - `INSTAGRAM_ACCOUNT_ID`
  - `INSTAGRAM_ACCESS_TOKEN`
  - `INSTAGRAM_API_VERSION`
- Verify the Leader Dashboard Instagram Queue with moderator auth.
- Publish one real Instagram test post only after explicit action-time owner approval.

## Guardrails

- Reaper does not publish to Instagram.
- Website gallery approval does not publish to Instagram automatically.
- Instagram publishing remains a moderator-confirmed Leader Dashboard action.
- No Instagram token, Discord bot token, Supabase service role key, ingest secret, signed URL, or private payload value was committed or recorded.
