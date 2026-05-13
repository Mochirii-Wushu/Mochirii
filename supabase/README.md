# Supabase Integration

Project ref: `deyvmtncimmcinldjyqe`

Project URL: `https://deyvmtncimmcinldjyqe.supabase.co`

This repository is a static GitHub Pages site. Keep Supabase integration browser-safe, dependency-free, and migration-based. Do not commit real secrets or `.env` files.

## Rules

- Browser code may only use the Supabase URL and publishable key.
- Secret keys, service-role keys, database passwords, JWT secrets, Discord bot tokens, and private environment values stay outside public files.
- Database schema changes should be created through Supabase migrations.
- Tables exposed to browser clients require explicit grants and RLS policies.
- anon access should be minimal and feature-specific.
- service_role should be reserved for trusted backend/admin workflows.
- GitHub Pages cannot safely hold private server-side secrets.
- Edge Functions or another backend must be used for privileged workflows.
- Do not run `supabase db push` unless a future task explicitly approves remote database mutation.
- Do not deploy Edge Functions unless a future task explicitly approves deployment.
- Protected page text must not be changed for auth/gallery-upload work.

## Browser Helper

`supabase.js` attaches `window.MochiriiSupabase` before `site.js` and page scripts run. It preserves:

- `getConfig()`
- `request(path, options)`
- `select(table, query)`
- `insert(table, payload)`
- `probe()`

It also exposes Auth/profile/gallery helpers:

- `getClient()`
- `getSession()`
- `getUser()`
- `onAuthStateChange(callback)`
- `signInWithDiscord(options)`
- `signOut()`
- `getCurrentProfile()`
- `updateCurrentProfile(payload)`
- `verifyDiscordMembership()`
- `requireAuth(options)`
- `requireVerifiedGuildMember(options)`
- `requireActiveMember(options)`
- `renderAuthNavState()`
- `uploadMemberGalleryImage(file, metadata)`
- `listMyGallerySubmissions()`
- `checkLeaderGalleryModerationAccess()`
- `listGalleryReviewQueue()`
- `moderateGallerySubmission(submissionId, action, reason)`
- `listApprovedGallerySubmissions()`

Script order on pages with Auth or upload behavior is:

```html
<script src="./utils.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
<script src="./supabase.js" defer></script>
<script src="./site.js" defer></script>
<script src="./page.js" defer></script>
```

## Discord Auth Setup

Discord login through Supabase Auth proves identity only. It does not prove guild membership or role ownership. Guild membership and role checks happen in the `verify-discord-member` Edge Function.

In Supabase Dashboard:

1. Open Authentication Provider settings.
2. Enable Discord.
3. Add the Discord Client ID.
4. Add the Discord Client Secret.
5. Set the production Site URL to the public site URL.
6. Add production redirect URLs for Account, Auth, Submit Image, and Leader Dashboard.
7. Add local development redirect URLs for Account, Auth, Submit Image, and Leader Dashboard.
8. Confirm the callback URL in Discord Developer Portal matches:

```text
https://deyvmtncimmcinldjyqe.supabase.co/auth/v1/callback
```

Recommended redirect URLs:

```text
https://mochirii.com/auth.html
https://mochirii.com/account.html
https://mochirii.com/gallery-submit.html
https://mochirii.com/leader-dashboard.html
http://127.0.0.1:8765/auth.html
http://127.0.0.1:8765/account.html
http://127.0.0.1:8765/gallery-submit.html
http://127.0.0.1:8765/leader-dashboard.html
```

The browser login uses:

```js
supabase.auth.signInWithOAuth({
  provider: "discord",
  options: {
    redirectTo: "<current account/auth URL>",
    scopes: "identify email"
  }
});
```

## Discord Server And Roles

Discord server ID:

```text
1078630751077142608
```

Required role names and IDs:

```text
Mōchirīī - WWM = 1468659807736299520
✅Verified = 1078630751077142615
```

Moderator role used by gallery moderation:

```text
Moderator = 1078630751165222984
```

Role IDs are enforcement data. Role names are documentation and user-facing explanation only.

## Required Edge Function Secrets

Recommended local/production values:

```sh
DISCORD_GUILD_ID=1078630751077142608
DISCORD_REQUIRED_ROLE_IDS=1468659807736299520,1078630751077142615
DISCORD_REQUIRED_ROLE_NAMES="Mōchirīī - WWM,✅Verified"
DISCORD_MODERATOR_ROLE_IDS=1078630751165222984
DISCORD_MODERATOR_ROLE_NAMES=Moderator
DISCORD_BOT_TOKEN=<set manually, never commit>
```

The Edge Function also needs access to Supabase server credentials in the trusted Edge runtime. Keep service-role or secret keys server-side only.

Local serve example:

```sh
supabase functions serve verify-discord-member --env-file supabase/functions/.env.local
supabase functions serve list-gallery-review-queue --env-file supabase/functions/.env.local
supabase functions serve moderate-gallery-submission --env-file supabase/functions/.env.local
supabase functions serve list-approved-gallery-submissions --env-file supabase/functions/.env.local
```

Production secret examples:

```sh
supabase secrets set DISCORD_GUILD_ID=1078630751077142608
supabase secrets set DISCORD_REQUIRED_ROLE_IDS=1468659807736299520,1078630751077142615
supabase secrets set DISCORD_REQUIRED_ROLE_NAMES="Mōchirīī - WWM,✅Verified"
supabase secrets set DISCORD_MODERATOR_ROLE_IDS=1078630751165222984
supabase secrets set DISCORD_MODERATOR_ROLE_NAMES=Moderator
supabase secrets set DISCORD_BOT_TOKEN=<set manually, never commit>
```

`supabase secrets set ...` writes remote project secrets. Run it only from a trusted shell and never paste tokens into tracked files.

Verify remote secrets without printing secret values:

```sh
supabase secrets list
```

Do not commit `supabase/functions/.env.local`.

## Deployment Commands

Remote-changing commands require explicit operator approval. Do not run them during local-only audit work.

Dry-run database migration preview:

```sh
supabase db push --dry-run
```

Remote-mutating database deployment:

```sh
supabase db push
```

Remote-mutating Edge Function deployment:

```sh
supabase functions deploy verify-discord-member
supabase functions deploy list-gallery-review-queue
supabase functions deploy moderate-gallery-submission
supabase functions deploy list-approved-gallery-submissions
```

Recommended production sequence after dashboard setup and secrets are complete:

```sh
supabase secrets list
supabase db push --dry-run
supabase db push
supabase migration list
supabase functions deploy verify-discord-member
supabase functions deploy list-gallery-review-queue
supabase functions deploy moderate-gallery-submission
supabase functions deploy list-approved-gallery-submissions
```

If the linked project requires a database password in the shell, set it locally without committing it. Fish shell example:

```fish
set -gx SUPABASE_DB_PASSWORD 'PASTE_REMOTE_DATABASE_PASSWORD_HERE'
```

## Discord Developer Portal Setup

1. Create or select the Discord application for the guild website.
2. Add the Supabase callback URL:

```text
https://deyvmtncimmcinldjyqe.supabase.co/auth/v1/callback
```

3. Copy the Discord Client ID and Client Secret into Supabase Auth provider settings.
4. Create a Discord bot token for server-side guild-member checks.
5. Add the bot to guild `1078630751077142608` with permission to read guild member and role data needed by:

```text
GET /guilds/1078630751077142608/members/{discord_user_id}
```

The website does not assign Discord roles in this phase.

## Database Tables

`member_profiles` stores durable website account state:

- Supabase user id
- Discord identity fields
- Discord role IDs returned by server-side verification
- `has_required_discord_roles`
- `discord_member_pending`
- `discord_verified_at`
- `discord_checked_at`
- safe editable profile fields
- `member_status`

`member_status` meanings:

- `pending`: signed in or known, but not active for uploads.
- `active`: eligible if Discord roles are verified and recent.
- `suspended`: blocked by leadership/admin state.
- `archived`: historical/inactive account state.

`has_required_discord_roles` means the latest server-side Discord check found both required role IDs. Browser code treats it as UX state; database and Storage RLS enforce access.

`gallery_submissions` stores member-owned pending upload records:

- private Storage bucket/path
- original filename, MIME type, and size
- optional title/caption/category
- moderation status
- review fields for moderator approval or decline actions

Uploads stay `pending` and do not appear in the public Gallery in this phase.

`gallery_moderation_events` stores privileged moderation audit records:

- submission id
- moderator id
- action: `approved`, `rejected`, or `archived`
- optional reason
- event creation time

Browser clients do not receive direct insert, update, or delete privileges for moderation events. Trusted Edge Functions write these rows with service-role credentials after Discord Moderator verification.

## Storage Bucket Plan

The migration creates a private bucket:

```text
member-gallery
```

The bucket is restricted to image uploads only:

```text
file_size_limit = 52428800
allowed_mime_types = image/jpeg, image/png, image/webp
```

Upload paths begin with the signed-in user id:

```text
{auth.uid()}/{timestamp-or-random-safe-filename}
```

No public read access is granted.

## RLS And Storage Policy Summary

`member_profiles`:

- anon receives no direct table privileges.
- authenticated users can select only their own profile.
- authenticated users can update only safe editable columns on their own profile.
- browser users cannot update member status, Discord roles, Discord verification timestamps, or IDs.
- service_role can manage rows from trusted backend/admin workflows.

`gallery_submissions`:

- anon receives no direct table privileges.
- authenticated users can select only their own submissions.
- authenticated users can insert only their own submissions when their profile is active, has required Discord roles, and has recent verification.
- authenticated users can update only title, caption, and category on their own pending submissions.
- browser users cannot approve, reject, archive, review, or delete submissions in this phase.
- service_role can manage rows from trusted backend/admin workflows.

`gallery_moderation_events`:

- RLS is enabled.
- anon and authenticated browser clients receive no direct table privileges.
- service_role can manage rows from trusted Edge Functions.

Storage `member-gallery`:

- authenticated active verified members can upload only into their own first path segment.
- authenticated users can read only their own objects.
- authenticated active verified members can update/delete only their own objects.
- anon receives no access.
- bucket remains private.

## Gallery Moderation Architecture

Leader moderation uses two Edge Functions:

- `list-gallery-review-queue`
- `moderate-gallery-submission`

Both functions require a signed-in Supabase user JWT and then verify Discord server membership against guild `1078630751077142608`. The moderator check requires role ID `1078630751165222984` from `DISCORD_MODERATOR_ROLE_IDS`. The role name secret is documentation only; role names are never trusted for enforcement. If moderation secrets are missing or do not match the expected guild or role ID, the functions fail closed.

`list-gallery-review-queue` loads only pending `gallery_submissions`, joins safe uploader profile display fields, and creates short-lived signed URLs for private `member-gallery` objects. The Storage bucket stays private and no public read policy is added.

`moderate-gallery-submission` accepts `approved` or `rejected` for a pending submission. It updates `gallery_submissions.status`, `reviewed_by`, `reviewed_at`, and `rejection_reason`, then records a `gallery_moderation_events` row. Approved submissions become eligible for the approved public Gallery feed; they are not written into `data/gallery.json`.

## Approved Public Gallery Feed

Approved member submissions appear on `gallery.html` through the public Edge Function:

- `list-approved-gallery-submissions`

This is the only Gallery Edge Function with `verify_jwt = false`. It is publicly callable because the public Gallery page needs to load without sign-in, but it uses server-side credentials only inside the Edge runtime and queries only `gallery_submissions` rows where `status = 'approved'`.

The function returns public-safe fields, safe uploader display names, and short-lived signed URLs for private `member-gallery` objects. The Storage bucket remains private; no public bucket or anonymous Storage read policy is added.

Pending, rejected, and archived submissions are not returned by the approved feed. If a private object cannot receive a signed URL, the function returns a safe per-item preview error and the browser skips that item.

`gallery.js` normalizes approved member submissions into the same item model as the static `data/gallery.json` Gallery before rendering. Static items and approved member submissions are combined, filtered, and shuffled together, so approved uploads participate in the normal random Gallery rotation. Member submissions use their submitted title and/or caption in the existing lightbox, followed by the uploader's public Discord display name when available, and receive a `member-submissions` category in addition to their submitted category when present. Existing static Gallery captions remain owned by `data/gallery.json` and should not be edited to publish member submissions. Localhost static previews skip the remote approved feed by default; add `?approvedFeed=1` when intentionally testing against a served/deployed feed.

If an older approved `gallery_submissions` row has blank `title` and `caption` values, the public lightbox will use the `Member submission` fallback until a Moderator or operator updates that row in Supabase. Future uploads preserve non-empty title and caption values from `gallery-submit.html` into `gallery_submissions`.

Public Gallery ordering uses one normalized timestamp model. Static curated images use `galleryAddedAt` in `data/gallery.json`; approved member uploads use their Supabase `created_at` value. The default Gallery order is `Random mix`, preserving the rotating shuffle behavior. Visitors may choose `Newest first` or `Oldest first`; static images and approved member submissions are sorted together. Approved member submissions still render through signed URLs from the private `member-gallery` bucket, and pending or rejected submissions remain hidden.

## Local Testing Flow

Recommended local checks:

```sh
npm run check
git diff --check
node --check supabase.js
node --check auth.js
node --check account.js
node --check gallery-submit.js
node --check leader-dashboard.js
supabase db reset
supabase migration list
```

For Gallery regression:

```sh
python3 -m http.server 8765
npm run smoke:gallery
```

For production smoke:

```sh
npm run check:production
```

For Edge Function loading checks without deployment:

```sh
deno check --import-map=supabase/functions/list-gallery-review-queue/deno.json supabase/functions/list-gallery-review-queue/index.ts
deno check --import-map=supabase/functions/moderate-gallery-submission/deno.json supabase/functions/moderate-gallery-submission/index.ts
deno check --import-map=supabase/functions/list-approved-gallery-submissions/deno.json supabase/functions/list-approved-gallery-submissions/index.ts
```

## Manual Discord Role-Granting Flow

1. A visitor joins the Discord server from existing website Join links.
2. The member completes Discord server onboarding/verification.
3. Leadership grants both required roles inside Discord:
   - `1468659807736299520`
   - `1078630751077142615`
4. The member signs into the website with Discord.
5. The member opens Account or Submit Image and checks Discord verification.
6. The website calls `verify-discord-member`.
7. If both roles are present and the member is not pending, the website profile becomes active for uploads.

For moderators, leadership grants the Discord Moderator role:

```text
1078630751165222984
```

The Leader Dashboard appears from the Account page only after server-side moderator verification succeeds.

## Deferred Plans

Deferred role-assignment automation:

- Design a separate Discord bot or backend job.
- Keep bot tokens server-side only.
- Require explicit leadership/security approval before assigning roles from website actions.

Deferred public gallery publishing:

- Add an optional curated static-publishing workflow if approved member submissions ever need permanent static Gallery records.
- Keep pending, rejected, and archived private submissions out of `data/gallery.json`.
- Preserve current public Gallery captions and image paths unless a later scoped task changes them.
