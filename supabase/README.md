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
6. Add production redirect URLs for Account, Auth, and Submit Image.
7. Add local development redirect URLs for Account, Auth, and Submit Image.
8. Confirm the callback URL in Discord Developer Portal matches:

```text
https://deyvmtncimmcinldjyqe.supabase.co/auth/v1/callback
```

Recommended redirect URLs:

```text
https://mochirii.com/auth.html
https://mochirii.com/account.html
https://mochirii.com/gallery-submit.html
http://127.0.0.1:8765/auth.html
http://127.0.0.1:8765/account.html
http://127.0.0.1:8765/gallery-submit.html
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

Role IDs are enforcement data. Role names are documentation and user-facing explanation only.

## Required Edge Function Secrets

Recommended local/production values:

```sh
DISCORD_GUILD_ID=1078630751077142608
DISCORD_REQUIRED_ROLE_IDS=1468659807736299520,1078630751077142615
DISCORD_REQUIRED_ROLE_NAMES="Mōchirīī - WWM,✅Verified"
DISCORD_BOT_TOKEN=<set manually, never commit>
```

The Edge Function also needs access to Supabase server credentials in the trusted Edge runtime. Keep service-role or secret keys server-side only.

Local serve example:

```sh
supabase functions serve verify-discord-member --env-file supabase/functions/.env.local
```

Production secret examples:

```sh
supabase secrets set DISCORD_GUILD_ID=1078630751077142608
supabase secrets set DISCORD_REQUIRED_ROLE_IDS=1468659807736299520,1078630751077142615
supabase secrets set DISCORD_REQUIRED_ROLE_NAMES="Mōchirīī - WWM,✅Verified"
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
```

Recommended production sequence after dashboard setup and secrets are complete:

```sh
supabase secrets list
supabase db push --dry-run
supabase db push
supabase migration list
supabase functions deploy verify-discord-member
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
- review fields for a future leader workflow

Uploads stay `pending` and do not appear in the public Gallery in this phase.

## Storage Bucket Plan

The migration creates a private bucket:

```text
member-gallery
```

The bucket is restricted to image uploads only:

```text
file_size_limit = 5242880
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

Storage `member-gallery`:

- authenticated active verified members can upload only into their own first path segment.
- authenticated users can read only their own objects.
- authenticated active verified members can update/delete only their own objects.
- anon receives no access.
- bucket remains private.

## Local Testing Flow

Recommended local checks:

```sh
npm run check
git diff --check
node --check supabase.js
node --check auth.js
node --check account.js
node --check gallery-submit.js
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

## Deferred Plans

Deferred role-assignment automation:

- Design a separate Discord bot or backend job.
- Keep bot tokens server-side only.
- Require explicit leadership/security approval before assigning roles from website actions.

Deferred leader approval dashboard:

- Add leader-only moderation screens.
- Require server-side authorization for moderation actions.
- Allow approve/reject/archive and rejection notes.

Deferred public gallery publishing:

- Add an approval-to-public publishing workflow.
- Keep pending submissions out of `data/gallery.json` until intentionally approved.
- Preserve current public Gallery captions and image paths unless a later scoped task changes them.
