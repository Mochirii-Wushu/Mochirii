# Discord Integration Hub Analysis

Date: 2026-05-13 local / 2026-05-14 UTC
Branch: `feature/discord-integration-hub`

## 1. Current Discord-Related Architecture

- The site is still static HTML, CSS, vanilla JavaScript, JSON content, and GitHub Pages compatible.
- Discord OAuth login is handled through Supabase Auth from `auth.html` / `auth.js` and `supabase.js`.
- `supabase.js` exposes `window.MochiriiSupabase` with browser-safe Auth, profile, gallery, and Edge Function helpers.
- Discord guild and required role IDs are currently documented in `supabase/README.md` and also present in browser config for user-facing guidance.
- Privileged Discord API access is limited to Edge Functions that read server-side environment variables.
- Existing public Discord links point to the invite URL and are used by Home, header/footer, Join, Events, Account, Gallery guidance, and related pages.

## 2. Current Supabase Auth And Role Verification State

- Supabase Auth provider: Discord, with `identify email` scopes from `supabase.js`.
- `member_profiles` stores Discord identity fields, role IDs from server-side checks, verification timestamps, editable profile fields, and `member_status`.
- `verify-discord-member` requires a signed-in Supabase user JWT, resolves the Discord user ID from Auth identity/profile metadata, calls Discord's guild-member API with `DISCORD_BOT_TOKEN`, and writes verification state with service-role credentials.
- Upload eligibility requires active website status, both required Discord roles, completed onboarding state, and recent verification.
- Moderator access is checked server-side against guild `1078630751077142608` and role `1078630751165222984`.

## 3. Current Edge Functions

- `verify-discord-member`: signed-in member verification against the Discord guild/member endpoint; updates `member_profiles`; fail-closed on missing env, mismatched guild/role settings, missing token, rate limit, bot permission errors, or missing identity.
- `list-gallery-review-queue`: signed-in moderator-only queue listing; checks the Discord Moderator role, returns pending/approved/rejected/archived submissions, moderation events, safe uploader fields, and short-lived private Storage signed URLs.
- `moderate-gallery-submission`: signed-in moderator-only approval/rejection function; checks the Discord Moderator role, updates `gallery_submissions`, and inserts `gallery_moderation_events`.
- `list-approved-gallery-submissions`: public approved-feed function with `verify_jwt = false`; uses service-role credentials server-side to return approved submission metadata and short-lived signed URLs only.
- Shared helper currently exists for gallery moderation in `supabase/functions/_shared/gallery-moderation.ts`; Discord API helper extraction was not present before this branch.

## 4. Website Pages That Should Eventually Connect To Discord

- `events.html` / `events.js`: scheduled event metadata and Open in Discord links.
- `announcements.html` / `announcements.js`: approved announcement summaries and optional webhook notification records.
- `codex.html` / `codex.js`: future curated guide/forum candidates, not full forum mirroring.
- `gallery.html` / `gallery.js`: approved member gallery feed and future approved-image notification links.
- `gallery-submit.html` / `gallery-submit.js`: future pending-submission moderator notifications.
- `leader-dashboard.html` / `leader-dashboard.js`: future moderation logs and notification send state.
- `account.html` / `account.js`: role verification state, future member-facing deep links, and later RSVP history.
- `join.html`: Discord entry path remains important but does not need live Discord data in this foundation.

## 5. Current Events Page Architecture

- `events.js` loads only `data/events.json` through `MochiriiUtils.fetchJson`.
- Dates are date-only `YYYY-MM-DD`, parsed in UTC to avoid US timezone shifts.
- Filters are local-only buttons: Upcoming, Past, and All.
- Event-board data comes from `data.events.upcoming`; items are classified as upcoming/past by date.
- Links are static `href` values when present, otherwise the Discord invite fallback is used.
- There is no URL state, event ID field, Discord Scheduled Event ID, RSVP table, or Supabase event source yet.

## 6. Current Codex / Forum / Archive Architecture

- `codex.js` loads `data/codex.json` and renders static values, etiquette, rhythm, and recognition sections.
- The current Codex has no forum/thread data model, no external link arrays, and no Supabase reads.
- The site has reports and docs for archive/readiness work, but no Discord forum index or curation workflow.
- Future forum integration should index thread metadata and approved summaries only; full message-content mirroring is out of scope.

## 7. Current Webhook / Notification Gaps

- No webhook resources are registered in the database.
- No webhook send function exists.
- Gallery approval/rejection and new pending submissions do not currently notify Discord.
- There is no durable sync/send log for Discord attempts, skipped sends, retries, or failures.
- There are no channel/forum IDs stored for events, guide candidates, announcement candidates, or mod logs.

## 8. Recommended Integration Model

- Discord owns live chat, voice, forums, scheduled event notifications, and immediate coordination.
- The website owns structured profiles, gallery presentation, applications, archives, approved summaries, and leader workflows.
- Supabase owns identity, permissions, sync cache, moderation state, and audit logs.
- Reaper and/or Supabase Edge Functions own privileged Discord API and webhook calls.
- Browser JavaScript may read only public-safe rendered data or later RLS-approved views; it must never contain bot tokens, webhook URLs, service-role keys, or Discord client secrets.

## 9. Proposed Database Tables

- `public.discord_resources`: service-managed registry for Discord guild resources, roles, channels, forums, threads, scheduled events, webhooks, bots, and external targets.
- `public.discord_sync_log`: service-managed operational log for scheduled event syncs, forum index jobs, webhook notifications, slash-command callbacks, role checks, manual tests, and skipped/failed jobs.
- Both tables should start with RLS enabled, no anon/browser access, and service-role management only.

## 10. Proposed Edge Function Shared Helper / Scaffolding

- Add helper-only `supabase/functions/_shared/discord-api.ts` for future functions.
- Include `getRequiredEnv`, `getDiscordBotToken`, `buildDiscordApiUrl`, `discordFetch`, `safeJsonResponse`, and `redactSecret`.
- Do not refactor existing live Edge Functions in this foundation branch; the current functions are deployed architecture and should not churn without a feature need.

## 11. Proposed Secrets And Manual Settings

- Existing required settings: `DISCORD_GUILD_ID`, `DISCORD_REQUIRED_ROLE_IDS`, `DISCORD_REQUIRED_ROLE_NAMES`, `DISCORD_MODERATOR_ROLE_IDS`, `DISCORD_MODERATOR_ROLE_NAMES`, `DISCORD_BOT_TOKEN`.
- Future placeholders: `DISCORD_WEBHOOK_GALLERY_APPROVED`, `DISCORD_WEBHOOK_MOD_LOG`, `DISCORD_EVENTS_CHANNEL_ID`, `DISCORD_FORUM_GUIDES_CHANNEL_ID`, `DISCORD_FORUM_ANNOUNCEMENTS_CHANNEL_ID`.
- Discord client secret remains only in Supabase Auth provider settings.
- Webhook URLs and bot tokens must never be stored in `discord_resources`, committed files, browser code, or logs.

## 12. What This Branch Will Implement

- A database migration for `discord_resources` and `discord_sync_log`.
- Initial non-secret resource rows for the known guild and three role IDs.
- RLS, grants, constraints, indexes, and updated-at trigger attachment for the registry table.
- A pending-migration repair for `public.set_updated_at()` that preserves the existing trigger behavior while setting an explicit empty `search_path`.
- Supabase documentation for the Discord Integration Hub contract.
- Placeholder-only environment examples.
- Helper-only Discord API scaffolding for future Edge Functions.
- Future implementation report/runbook prompts for the next Discord branches.

## 13. What This Branch Intentionally Will Not Implement

- No public website feature or nav link.
- No Discord Scheduled Events sync.
- No webhook sends.
- No forum/thread index.
- No slash commands.
- No event RSVP or attendance records.
- No Discord chat mirroring or privileged message-content dependency.
- No Discord role assignment automation.
- No changes to upload permissions, role verification behavior, public Gallery behavior, Leader Dashboard behavior, or `member-gallery` privacy.
- No Edge Function deployment and no mutating `supabase db push`.

## 14. Future Branch Roadmap

1. `feature/discord-events-sync`
2. `feature/discord-webhook-notifications`
3. `feature/discord-forum-index`
4. `feature/discord-slash-commands`
5. `feature/event-rsvp-attendance`

Use `reports/discord-integration-roadmap.md` for practical branch briefs and hard stops.

## 15. Validation Plan

- `npm run check`
- `npm run check:production`
- `git diff --check`
- `node --check` for new/edited JavaScript where applicable.
- `deno check` for the new shared Edge Function helper when Deno is available.
- `supabase db reset`
- `supabase migration list --local`
- `supabase db advisors --local`
- `supabase db lint --local`
- `supabase db push --dry-run`
- Local `npm run smoke:gallery` against `127.0.0.1:8765`.
- `git diff -- data/` to verify protected data did not change.
- Secret scan for service-role keys, database URLs, Discord bot tokens, client secrets, and real webhook URLs.

## 16. Deployment Plan And Hard Stops

- Review the branch locally first.
- Do not run a mutating `supabase db push` in this branch; dry-run validation is allowed.
- Do not deploy Edge Functions in this branch.
- Later deployment should run `supabase db push --dry-run` first, then an explicitly approved `supabase db push`.
- Edge Function deployments belong to later feature branches only after code and secrets are reviewed.
- Hard stop on any actual secret in a tracked file, any `data/` protected text diff, any public `member-gallery` change, or any change to existing Discord role verification behavior.
