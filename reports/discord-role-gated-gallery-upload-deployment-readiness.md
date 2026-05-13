# Discord Role-Gated Gallery Upload Deployment Readiness

Date: 2026-05-13
Branch: `feature/discord-role-gated-gallery-uploads`
Deployment mode: `REMOTE_DEPLOYMENT_ALLOWED=false`

## 1. Branch And Base Status

`git status --short --branch` shows the expected feature branch with uncommitted implementation files in the working tree.

`git diff --stat main...` and `git diff --name-only main...` are empty because the current implementation is not committed on the branch yet. The working-tree diff contains the feature changes.

Changed tracked files include:

- `.env.example`
- shared shell/runtime: `header.html`, `footer.html`, `site.js`, `supabase.js`, `styles.css`, `sitemap.xml`
- existing HTML pages updated for shared Supabase JS v2 script loading
- `supabase/README.md`
- `supabase/config.toml`

New untracked implementation files include:

- `auth.html`, `auth.js`
- `account.html`, `account.js`
- `gallery-submit.html`, `gallery-submit.js`
- `reports/discord-role-gated-gallery-upload-goal-analysis.md`
- `supabase/functions/.env.example`
- `supabase/functions/verify-discord-member/.npmrc`
- `supabase/functions/verify-discord-member/deno.json`
- `supabase/functions/verify-discord-member/index.ts`
- `supabase/migrations/20260513081523_create_discord_role_gated_gallery_uploads.sql`

## 2. Auth, Account, And Upload Architecture

The site remains static HTML/CSS/vanilla JavaScript with no framework, bundler, CMS, or new npm dependency.

Pages that need auth/upload behavior load scripts in this order:

1. `utils.js`
2. Supabase JS v2 CDN
3. `supabase.js`
4. `site.js`
5. page-specific JavaScript

`supabase.js` exposes browser-safe Supabase JS v2 helpers for Discord OAuth, current session/user/profile reads, safe profile updates, Edge Function verification, active member checks, private Storage upload, and current-user submission listing.

`auth.html` handles Discord sign-in and sign-out only. `account.html` shows Discord identity/status/role verification state and edits only safe profile fields. `gallery-submit.html` gates upload UI on sign-in, active member status, required Discord roles, and recent verification.

Navigation keeps the existing Discord Join CTA and adds Login, Account, and Submit Image visibility states through `data-auth-*` attributes rendered by `site.js`/`supabase.js`.

## 3. Migration Changes

The migration creates or safely updates:

- `public.member_profiles`
- `public.gallery_submissions`
- `public.set_updated_at()`
- `public.handle_new_member_profile()`
- `auth.users` after-insert profile trigger
- private Storage bucket `member-gallery`
- public table grants and RLS policies
- Storage object RLS policies

Local constraint inspection confirmed:

- `member_profiles.id` references `auth.users(id)` with `on delete cascade`.
- Discord identity and role state columns exist.
- `member_status` is constrained to `pending`, `active`, `suspended`, `archived`.
- user-editable profile field length constraints exist.
- `gallery_submissions.user_id` references `auth.users(id)` with `on delete cascade`.
- `gallery_submissions.storage_bucket` is constrained to `member-gallery`.
- `gallery_submissions.storage_path` must begin with `user_id::text || '/'`.
- MIME type is constrained to JPEG, PNG, or WebP.
- size is constrained to `> 0 and <= 52428800` after `20260513193110_increase_member_gallery_upload_limit_to_50mb.sql`.
- status is constrained to `pending`, `approved`, `rejected`, `archived`.
- `(storage_bucket, storage_path)` is unique.

## 4. Edge Function Behavior

`supabase/functions/verify-discord-member/index.ts`:

- requires Supabase JWT verification through `supabase/config.toml` (`verify_jwt = true`)
- requires a signed-in Supabase user token
- resolves the current user through Supabase Auth
- resolves Discord user ID from auth identities/metadata or `member_profiles`
- calls Discord `GET /guilds/1078630751077142608/members/{discord_user_id}`
- uses the bot token only inside the Edge Function
- treats Discord 404 as not a guild member
- treats Discord 401/403 as configuration/permission errors
- handles Discord 429 with a user-safe rate-limit response
- enforces both role IDs:
  - `1468659807736299520`
  - `1078630751077142615`
- now fails closed if configured `DISCORD_GUILD_ID` or `DISCORD_REQUIRED_ROLE_IDS` drift from the required IDs
- updates `member_profiles` to active only when guild membership, completed onboarding, both roles, and non-locked website status align
- does not override suspended or archived accounts back to pending/active
- removes upload eligibility on missing identity, missing guild membership, bot permission/config errors, pending Discord onboarding, or missing roles
- returns structured verification fields and user-safe messages

No bot token, private Discord headers, service-role key, or other private server value is returned.

## 5. Public Table RLS Policies

Local database reset and inspection confirmed RLS is enabled on:

- `public.member_profiles`
- `public.gallery_submissions`

`member_profiles` policies:

- authenticated users can select only their own profile
- authenticated users can update only their own profile row

Column-level grants limit authenticated profile updates to:

- `display_name`
- `game_uid`
- `discord_handle`
- `region`
- `timezone`
- `avatar_url`
- `bio`

`gallery_submissions` policies:

- authenticated users can select only their own submissions
- authenticated users can insert only their own pending submissions when their profile is active, has required Discord roles, and has `discord_verified_at >= now() - interval '7 days'`
- authenticated users can update only their own pending submission metadata

Column-level grants limit authenticated submission updates to:

- `title`
- `caption`
- `category`

`anon` has no direct table privileges on `member_profiles` or `gallery_submissions`. `service_role` can manage both tables.

## 6. Storage Policies

Local inspection confirmed `storage.objects` has RLS enabled and zero anon policies.

Storage policies on `storage.objects` are authenticated-only:

- `Members upload own gallery objects`
- `Members read own gallery objects`
- `Members update own gallery objects`
- `Members delete own gallery objects`

The upload/update/delete policies require:

- `bucket_id = 'member-gallery'`
- first path segment equals `auth.uid()::text`
- `member_profiles.member_status = 'active'`
- `member_profiles.has_required_discord_roles is true`
- `member_profiles.discord_verified_at >= now() - interval '7 days'`

Read policy allows authenticated users to read only their own `member-gallery` objects.

Note: local Supabase Storage still reports built-in `storage.objects` table grants from the storage admin role for anon/authenticated roles. Effective access remains RLS-controlled, the bucket is private, and no anon Storage policies were created.

## 7. Protected Text Verification

Protected text changed: no.

Verification:

- `git diff --name-only -- data` returned no changed protected data files.
- `git diff -- data/recruitment.json data/home.json data/twills.json data/ranks.json data/leaders.json data/codex.json data/join.json data/gallery.json data/events.json data/announcements.json data/raffles.json data/spotlight.json` returned no diff.
- Existing public HTML page diffs were inspected; existing page text changes are limited to script/CDN additions, auth nav additions, and cache-query updates.

No protected files were reverted because none changed.

## 8. Secret Scan Results

Secret scan command:

```sh
rg -n "sb_secret_|service_role|SUPABASE_DB_PASSWORD=|DISCORD_BOT_TOKEN=|client_secret|JWT_SECRET|DATABASE_URL=.*postgres|postgres://|eyJ" --glob '!node_modules' --glob '!.git'
```

Results were placeholder/documentation-only:

- `.env.example` placeholder/comment keys
- `supabase/functions/.env.example` placeholder `DISCORD_BOT_TOKEN=`
- `supabase/README.md` deployment placeholders and service-role documentation
- migration grants to `service_role`
- Edge Function environment parsing for server-side service credentials
- existing security note in `reports/post-baseline-roadmap-review.md`

No committed real Discord bot token, Discord client secret, Supabase service-role key, Supabase secret key, database password, JWT secret, credentialed `DATABASE_URL`, or `.env` file was found.

## 9. Bucket Restriction Audit

Initial audit found the migration created the private `member-gallery` bucket but did not pin file size and MIME type restrictions.

Initial fix made:

- patched the bucket insert/update to set `file_size_limit = 5242880`
- patched `allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]`

Current upload limit update:

- `20260513193110_increase_member_gallery_upload_limit_to_50mb.sql` updates `file_size_limit = 52428800`
- MIME types remain `image/jpeg`, `image/png`, and `image/webp`

Current local post-reset query confirms:

```text
id = member-gallery
public = false
file_size_limit = 52428800
allowed_mime_types = image/jpeg,image/png,image/webp
```

## 10. Remote Deployment Prerequisites

Required Supabase Dashboard setup:

- Enable Discord Auth provider.
- Add Discord Client ID.
- Add Discord Client Secret.
- Set production Site URL.
- Add production redirect URLs for `auth.html`, `account.html`, and `gallery-submit.html`.
- Add local development redirect URLs for `127.0.0.1:8765`.

Required Discord Developer Portal setup:

- Add Supabase callback URL: `https://deyvmtncimmcinldjyqe.supabase.co/auth/v1/callback`
- Add the bot to guild `1078630751077142608`.
- Ensure the bot can read guild member/role data for `GET /guilds/1078630751077142608/members/{discord_user_id}`.
- Store the bot token only as a Supabase secret.

Required Supabase secrets:

- `DISCORD_GUILD_ID=1078630751077142608`
- `DISCORD_REQUIRED_ROLE_IDS=1468659807736299520,1078630751077142615`
- `DISCORD_REQUIRED_ROLE_NAMES="Mōchirīī - WWM,✅Verified"`
- `DISCORD_BOT_TOKEN=<set manually, never commit>`

Remote deployment must not proceed until those settings/secrets are confirmed.

## 11. Local Validation Results

Passed:

- `npm run check`
  - JS syntax OK
  - JSON OK
  - refs OK
  - assets OK with expected warning for `assets/audio/mochiriiiiii.mp3`
- `npm run check:production`
- `npm run smoke:gallery`
- `git diff --check`
- `node --check supabase.js`
- `node --check auth.js`
- `node --check account.js`
- `node --check gallery-submit.js`
- `node --check site.js`
- `supabase db reset`
- `supabase migration list --local`
- Supabase local SQL inspection for bucket, RLS, policies, grants, constraints, and triggers

Edge Function validation:

- `deno --version` failed because Deno is not installed.
- fallback `supabase functions serve verify-discord-member --env-file supabase/functions/.env.example` started successfully and served the function route locally.
- safe unauthenticated smoke request returned local Supabase gateway `401` for missing authorization header, confirming JWT verification remains active locally.

## 12. Dry-Run Results

Remote dry-run was not run because `SUPABASE_DB_PASSWORD` is missing in the shell.

This is not a local readiness failure. Before running remote migration list or dry-run, set the remote database password in the operator shell without committing it.

Fish shell example:

```fish
set -gx SUPABASE_DB_PASSWORD 'PASTE_REMOTE_DATABASE_PASSWORD_HERE'
```

Because `REMOTE_DEPLOYMENT_ALLOWED=false`, no remote-changing command was run.

## 13. Issues Found And Fixes Made

Issue: Storage bucket migration did not pin upload file size and MIME types.

Initial fix:

- added `file_size_limit = 5242880`
- added `allowed_mime_types = image/jpeg,image/png,image/webp`
- reran `supabase db reset`
- confirmed the bucket restrictions locally

Current upload-limit update:

- added follow-up migration `20260513193110_increase_member_gallery_upload_limit_to_50mb.sql`
- updated `gallery_submissions_size_bytes_check` to `size_bytes > 0 and size_bytes <= 52428800`
- updated `member-gallery.file_size_limit` to `52428800`

Issue: Edge Function trusted configured guild/role secret values without fail-closed drift detection.

Fix:

- added fixed expected guild ID and expected role IDs
- function now requires the configured secrets to match the required guild and both required role IDs before Discord lookup
- function enforcement continues to use role IDs, not role names

Issue: current-user submissions list relied on RLS alone.

Fix:

- added explicit `.eq("user_id", auth.data.user.id)` to the browser query
- RLS remains the final enforcement layer

Documentation gap:

- added deployment command section to `supabase/README.md`
- clearly marked `supabase db push` and `supabase functions deploy verify-discord-member` as remote-mutating and requiring explicit operator approval
- documented `supabase db push --dry-run`, `supabase secrets list`, and the fish `SUPABASE_DB_PASSWORD` example

Exploratory note:

- a direct `supabase db query` attempt using multiple SQL statements failed because the CLI prepared statement path does not accept multiple commands. This was not a product or migration failure and did not affect validation.

## 14. Final Deploy / No-Deploy Recommendation

Recommendation: ready after listed manual secrets/settings, then remote dry-run.

Do not deploy from this run because `REMOTE_DEPLOYMENT_ALLOWED=false`.

Before deployment:

1. Complete Supabase Dashboard Discord provider settings.
2. Complete Discord Developer Portal callback/bot setup.
3. Set Supabase Edge Function secrets.
4. Set `SUPABASE_DB_PASSWORD` locally for CLI remote dry-run if required.
5. Run `supabase secrets list`.
6. Run `supabase db push --dry-run`.
7. Confirm the dry-run includes only intended migrations.
8. With explicit approval in a future run, run `supabase db push`.
9. With explicit approval in a future run, deploy `verify-discord-member`.

Confirmed not run:

- `supabase db push`
- `supabase functions deploy verify-discord-member`

Deferred and not implemented:

- public gallery publishing from approved submissions
- leader approval dashboard
- Discord role-assignment automation
