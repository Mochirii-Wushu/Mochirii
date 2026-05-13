# Discord Role-Gated Gallery Upload Goal Analysis

Date: 2026-05-13
Branch: `feature/discord-role-gated-gallery-uploads`

## 1. Current Architecture Summary

Mochirii is a static GitHub Pages site built with root-level HTML files, one shared stylesheet, vanilla JavaScript page renderers, and JSON content under `data/`. The repo has no bundler, framework, CMS, or runtime npm dependencies. Shared page behavior is mounted from `site.js`, small DOM/data helpers are in `utils.js`, and the public Supabase helper currently lives in `supabase.js`.

The current `package.json` scripts are validation-only:

- `npm run check`
- `npm run check:assets`
- `npm run check:js`
- `npm run check:json`
- `npm run check:refs`
- `npm run check:production`
- `npm run smoke:gallery`

## 2. Current Page Inventory

Tracked root HTML files:

- `index.html`: Home
- `gallery.html`: public Gallery
- `join.html`: Join/onboarding
- `events.html`: Events
- `recruitment.html`: Recruitment
- `codex.html`: Codex
- `ranks.html`: Ranks
- `leaders.html`: Leaders
- `twills.html`: Twills profile
- `announcements.html`: Announcements
- `raffles.html`: Raffles
- `spotify.html`: Playlists
- `spotlight.html`: Member Spotlight
- `header.html`: mounted shared header
- `footer.html`: mounted shared footer

There are no existing tracked `auth.html`, `account.html`, `gallery-submit.html`, `my-gallery.html`, or similarly named auth/upload pages.

## 3. Current Shared Runtime Behavior

All public content pages currently load scripts in this order:

1. `utils.js`
2. `supabase.js`
3. `site.js`
4. page-specific JavaScript

`site.js` mounts `header.html` and `footer.html`, marks active desktop nav links, manages desktop dropdowns, manages the mobile menu dialog, updates the footer year, and owns shared lightbox behavior for Home and Gallery.

`utils.js` exposes `window.MochiriiUtils` with text, array, HTML escaping, image/text setters, JSON fetching, UTC-safe date formatting, external URL detection, tag normalization, and Spotify embed helpers.

## 4. Current Supabase Integration Summary

Tracked Supabase files are currently:

- `supabase/config.toml`
- `supabase/README.md`

`supabase/config.toml` contains only project id `deyvmtncimmcinldjyqe`.

`supabase.js` exposes `window.MochiriiSupabase` with browser-safe config and REST helpers:

- `getConfig()`
- `request()`
- `select()`
- `insert()`
- `probe()`
- `createHeaders()`
- `restUrl`

The helper uses only the public Supabase URL and publishable key. It does not currently create a Supabase JS v2 client, manage Auth sessions, invoke Edge Functions, upload Storage objects, or read/write auth-bound profile/gallery tables.

There are no tracked migrations and no tracked Edge Functions yet.

## 5. Current Gallery Architecture Summary

The public Gallery is JSON-driven from `data/gallery.json` and rendered by `gallery.js` into `gallery.html`.

Current Gallery facts:

- 1 album
- 73 public gallery items
- categories: `portraits`, `gatherings`, `action`, `scenery`, `companions`
- category counts are derived at runtime
- grid images use thumbnails
- lightbox images use each item `full` path, not `/thumbs/`
- category state is stored in `?category=`
- Copy link copies the current Gallery URL

This phase must not modify `data/gallery.json`, existing public gallery captions, or automatic public Gallery rendering.

## 6. Current Validation System Summary

Validation scripts under `scripts/`:

- `check-all.mjs`: runs JS, JSON, refs, and asset checks.
- `check-js.mjs`: runs `node --check` on `.js` and `.mjs` files outside ignored directories.
- `check-json.mjs`: parses JSON under `data` and `assets/lottie`.
- `check-refs.mjs`: checks local references in HTML/CSS/JS/JSON outside ignored folders.
- `check-assets.mjs`: checks asset sizes and WebP magic bytes; large assets are warnings unless strict mode is enabled.
- `check-production.mjs`: fetches key live production URLs, metadata, OG image, sitemap, and robots.
- `smoke-gallery-lightbox.mjs`: Playwright smoke test for Gallery thumbnails and full-image lightbox behavior against `http://127.0.0.1:8765` by default.

Known project history says the large `assets/audio/mochiriiiiii.mp3` warning is expected unless asset policy changes.

## 7. Current Protected-Content Inventory

Protected content to preserve exactly includes:

- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`
- `data/home.json` `seal.verse`
- `data/twills.json` `profile.bio`
- existing `data/ranks.json`
- existing `data/leaders.json`
- existing `data/codex.json`
- existing `data/join.json`
- existing `data/gallery.json`
- existing `data/events.json`
- existing `data/announcements.json`
- existing `data/raffles.json`
- existing `data/spotlight.json`

The implementation plan avoids editing these protected JSON content files. If a diff later shows accidental protected-copy movement, that change must be reverted before completion.

## 8. Planned Changed Files

Planned additions or edits:

- `reports/discord-role-gated-gallery-upload-goal-analysis.md`
- `supabase.js`
- `site.js`
- `header.html`
- `footer.html`
- existing root content pages to insert the Supabase JS v2 CDN before `supabase.js` for shared auth nav:
  - `index.html`
  - `gallery.html`
  - `join.html`
  - `events.html`
  - `recruitment.html`
  - `codex.html`
  - `ranks.html`
  - `leaders.html`
  - `twills.html`
  - `announcements.html`
  - `raffles.html`
  - `spotify.html`
  - `spotlight.html`
- `styles.css`
- `auth.html`
- `auth.js`
- `account.html`
- `account.js`
- `gallery-submit.html`
- `gallery-submit.js`
- `supabase/README.md`
- `supabase/config.toml`
- new Supabase migration under `supabase/migrations/`
- `supabase/functions/verify-discord-member/index.ts`
- optional `supabase/functions/.env.example`
- possibly `sitemap.xml` if validation requires new stable public page references

## 9. Planned Untouched Files

Planned untouched protected/runtime content files:

- `data/recruitment.json`
- `data/home.json`
- `data/twills.json`
- `data/ranks.json`
- `data/leaders.json`
- `data/codex.json`
- `data/join.json`
- `data/gallery.json`
- `data/events.json`
- `data/announcements.json`
- `data/raffles.json`
- `data/spotlight.json`
- existing page-specific renderers unrelated to auth/upload
- asset directories

## 10. Discord Role Verification Model

Discord login through Supabase Auth proves website identity only. It does not prove guild membership or role ownership.

Upload eligibility requires a server-side Edge Function to verify all of:

- Discord guild ID: `1078630751077142608`
- required role ID: `1468659807736299520`
- required role ID: `1078630751077142615`
- Discord member exists in the guild
- Discord member is not pending onboarding/verification

Role IDs are enforcement data. Role names are documentation and user-facing explanation only:

- `Mōchirīī - WWM`
- `✅Verified`

The website will not assign Discord roles and will not implement a role-assignment bot in this phase.

## 11. Database RLS Model

`member_profiles` stores durable user identity, safe editable profile fields, Discord role-check state, and moderation status. Browser users can read only their own profile and update only safe profile fields.

`gallery_submissions` stores private pending upload records. Browser users can read only their own submissions, insert only their own pending submissions when active and recently Discord-verified, and update only title/caption/category on their own pending rows. Browser users cannot approve, reject, archive, delete, or edit moderation/system fields in this phase.

RLS remains enabled. Column-level grants restrict editable browser columns.

## 12. Storage RLS Model

A private Supabase Storage bucket named `member-gallery` will store member uploads.

Storage paths must start with `auth.uid()`:

```text
{auth.uid()}/{timestamp-or-random-safe-filename}
```

Storage RLS on `storage.objects` must require all of:

- `bucket_id = 'member-gallery'`
- first folder segment equals the signed-in user id
- user profile is active
- `has_required_discord_roles = true`
- `discord_verified_at` is recent, preferably within 7 days

No anonymous read/write and no public bucket access are planned.

## 13. Edge Function Security Model

`verify-discord-member` will:

- require a signed-in Supabase user JWT
- resolve the current Supabase user
- resolve the Discord user id from Auth identity metadata and/or `member_profiles`
- call Discord Get Guild Member server-side with `DISCORD_BOT_TOKEN`
- verify guild membership, pending state, and both required role IDs
- update `member_profiles` through a backend/server-side context
- return structured, user-safe verification status

The function must not expose or log tokens/secrets. Discord 404 means not a guild member; Discord 401/403 means configuration or permission trouble; Discord rate limits must produce safe retry messaging.

## 14. Manual Supabase Dashboard Settings Required

Required manual settings after local implementation:

- Enable Discord Auth provider.
- Set Discord OAuth Client ID and Client Secret in Supabase Auth provider settings.
- Set Site URL to the production site.
- Add redirect URLs for production and local development.
- Apply the new database migration through the approved project workflow.
- Set Edge Function secrets.
- Deploy the Edge Function only after explicit approval.
- Confirm Data API exposure and grants for tables if the project does not expose new public-schema tables automatically.

## 15. Manual Discord Developer Portal Settings Required

Required manual settings:

- Create or select the Mochirii Discord application.
- Add the Supabase Auth callback URL:
  - `https://deyvmtncimmcinldjyqe.supabase.co/auth/v1/callback`
- Add any local Supabase Auth callback URL when testing local OAuth.
- Copy Discord Client ID and Client Secret into Supabase Auth provider settings.
- Create a Discord bot token with permission to call Get Guild Member for guild `1078630751077142608`.
- Add the bot to the server with appropriate guild member visibility/permissions.

## 16. Supabase Secrets Required

Required Edge Function secrets:

```sh
DISCORD_GUILD_ID=1078630751077142608
DISCORD_REQUIRED_ROLE_IDS=1468659807736299520,1078630751077142615
DISCORD_REQUIRED_ROLE_NAMES=Mōchirīī - WWM,✅Verified
DISCORD_BOT_TOKEN=<set manually, never commit>
```

`DISCORD_BOT_TOKEN` must never be committed or exposed to browser code.

## 17. Testing And Validation Plan

Local validation commands:

- `npm run check`
- `npm run check:production`
- `npm run smoke:gallery`
- `git diff --check`
- `node --check supabase.js`
- `node --check auth.js`
- `node --check account.js`
- `node --check gallery-submit.js`
- syntax-check edited Edge Function TypeScript
- `supabase db reset`
- `supabase migration list`

Manual/browser checks:

- Auth page signed-out state and Discord login button render.
- Account page signed-out prompt renders.
- Account page safe profile fields are the only editable fields.
- Gallery submit page signed-out, unverified, and verified states have safe UI behavior.
- Existing Gallery still renders JSON-backed public images and lightbox opens full images.
- Header/footer/mobile menu/dropdowns still work.

## 18. Risks And Mitigations

- Risk: Discord OAuth identity metadata shape differs between local and hosted Auth. Mitigation: Edge Function checks multiple safe metadata locations and falls back to stored profile fields.
- Risk: Supabase Data API exposure behavior differs by project settings. Mitigation: migration includes explicit grants and docs call out Dashboard Data API settings.
- Risk: Browser UX appears to gate uploads but RLS is incomplete. Mitigation: database and Storage RLS are the final enforcement layer.
- Risk: User profile metadata tries to escalate privileges. Mitigation: triggers never trust user metadata for `member_status` or `has_required_discord_roles`.
- Risk: Protected public copy changes accidentally. Mitigation: avoid protected JSON edits and inspect diff/hashes before final reporting.
- Risk: Remote Supabase deployment could mutate production state. Mitigation: do not run `supabase db push` and do not deploy Edge Functions in this phase.

## 19. Deferred Phase 2 Plans

Deferred public gallery approval publishing:

- Add an approval workflow that copies or references approved submissions into a public gallery source.
- Keep pending/rejected/archived submissions out of the public Gallery.
- Preserve current `data/gallery.json` until an approved publishing path is designed.

Deferred leader approval dashboard:

- Add a leader-only moderation dashboard backed by server-side role/claim checks.
- Allow review of pending submissions, approve/reject/archive actions, and rejection notes.
- Keep moderation actions out of ordinary browser user permissions.

Deferred optional Discord role-assignment automation:

- Design a separate Discord bot or backend workflow that can assign roles.
- Keep bot token and permissions server-side only.
- Treat role assignment as an explicit future product/security review, not part of this role-verification phase.
