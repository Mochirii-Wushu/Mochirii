# Next Phase 3 Auth and Member Workflow Plan

## 1. Phase 3 Scope

Phase 3 should migrate the deferred auth/member workflows from the root static site into the existing Next.js App Router app under `apps/web`.

Route migration order:

1. `/auth`
2. `/account`
3. `/gallery-submit`
4. `/leader-dashboard`

The root GitHub Pages files should stay intact until the Next implementation is validated in Vercel preview and production review.

## 2. Non-Goals

- Do not cut over `mochirii.com` DNS.
- Do not remove root GitHub Pages auth/member files.
- Do not manually deploy from local CLI.
- Do not expose service-role, secret, Discord bot, or OAuth client secret values to the browser.
- Do not change Supabase, Discord, Vercel, GitHub Pages, GitHub, or DNS dashboard settings without explicit approval.
- Do not broaden public route migration or redesign the public pages.

## 3. Route Migration Order

1. `/auth`: Discord sign-in/sign-out surface.
2. `/account`: member profile, Discord verification, and submission history.
3. `/gallery-submit`: role-gated upload flow.
4. `/leader-dashboard`: moderator-only review queue and moderation actions.

## 4. Current Root Files Per Route

- `/auth`: `auth.html`, `auth.js`, `supabase.js`
- `/account`: `account.html`, `account.js`, `supabase.js`
- `/gallery-submit`: `gallery-submit.html`, `gallery-submit.js`, `supabase.js`
- `/leader-dashboard`: `leader-dashboard.html`, `leader-dashboard.js`, `supabase.js`

Shared shell dependencies remain `header.html`, `footer.html`, `utils.js`, and `site.js`.

## 5. Current Supabase Tables Referenced

- `auth.users`
- `auth.identities`
- `public.member_profiles`
- `public.gallery_submissions`
- `public.gallery_moderation_events`
- `public.discord_resources`
- `public.discord_sync_log`
- `storage.buckets`
- `storage.objects`

Current Storage bucket:

- `member-gallery`, private, image-only, 50 MB file limit.

## 6. Current Supabase Edge Functions Referenced

- `verify-discord-member`
- `list-approved-gallery-submissions`
- `list-gallery-review-queue`
- `moderate-gallery-submission`

`verify-discord-member`, `list-gallery-review-queue`, and `moderate-gallery-submission` require a valid user JWT. `list-approved-gallery-submissions` is currently configured without JWT verification for public approved-gallery reads.

## 7. Current Discord OAuth and Member Verification Flow

Current browser flow:

1. `auth.js` calls `window.MochiriiSupabase.signInWithDiscord({ redirectTo: "./account.html" })`.
2. `supabase.js` starts Supabase Auth OAuth with the Discord provider and scopes `identify email`.
3. Supabase redirects the signed-in user back to the account page.
4. `account.js` loads the Supabase user and current `member_profiles` row.
5. The user can run Discord verification, which invokes `verify-discord-member`.
6. The Edge Function checks the authenticated user's Discord identity, queries the Discord guild member API, verifies required roles, and updates `member_profiles`.
7. Upload access requires active `member_status`, recent Discord verification, and required roles.
8. Moderator access requires the configured moderator Discord role and uses Edge Functions instead of direct browser table writes.

## 8. Required Env Vars

Public browser env names for the Next app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

Server-only names currently implied by Edge Functions or future Next server boundaries:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEYS`
- `SUPABASE_SECRET_KEYS`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DISCORD_GUILD_ID`
- `DISCORD_REQUIRED_ROLE_IDS`
- `DISCORD_REQUIRED_ROLE_NAMES`
- `DISCORD_MODERATOR_ROLE_IDS`
- `DISCORD_MODERATOR_ROLE_NAMES`
- `DISCORD_BOT_TOKEN`

Only public publishable keys may be exposed to browser code. Service-role, secret, and Discord bot values must stay server-side only.

## 9. Client/Server Boundary Plan

Initial Next implementation should use:

- Client components only for browser auth state, form interactions, file selection, modal state, and upload progress.
- Shared `apps/web/lib/supabase` helpers for browser-safe Supabase client creation.
- Edge Functions or Next route handlers for privileged Discord/member/moderation actions.
- Server-only modules for any service-role or Discord bot access.

Do not import server-only credentials into Client Components.

## 10. What Stays Client-Side Initially

- Supabase Auth client initialization with public publishable key.
- OAuth sign-in trigger.
- Signed-in/signed-out UI state.
- User-owned `member_profiles` reads and allowed editable profile updates, subject to RLS.
- User-owned `gallery_submissions` history reads, subject to RLS.
- File input validation before upload.
- Public, non-sensitive form state and accessibility behavior.

## 11. What Should Move Server-Side Later

- Discord membership checks.
- Moderator-role checks.
- Moderation queue reads.
- Submission approval/rejection writes.
- Signed preview URL creation.
- Any future transformation, image processing, or notification/webhook work.
- Any code path needing service-role, secret key, Discord bot token, or OAuth client secret values.

## 12. RLS and Security Assumptions To Verify

- `member_profiles` has RLS enabled and users can only read/update their own permitted fields.
- `gallery_submissions` has RLS enabled and users can only read their own submissions.
- Upload inserts require active status, recent verification, required roles, and a `member-gallery` path scoped to the user ID.
- Moderation tables remain service-role only unless a reviewed policy is added.
- Storage policies continue to require authenticated ownership and active verified membership.
- JWT claims from user-editable metadata are not trusted for authorization decisions.
- Service-role/secret keys are never imported into browser bundles.

## 13. Upload and Storage Security Risks

- Preserve MIME allow-list checks for JPEG, PNG, and WebP.
- Preserve 50 MB maximum file size unless explicitly changed.
- Keep the bucket private.
- Keep paths user-scoped by authenticated user ID.
- Avoid overwriting existing files unless RLS policies explicitly support it.
- Confirm rejected/deleted submission cleanup behavior.
- Consider server-side image validation or transformation later if abuse risk increases.

## 14. Moderation Workflow Risks

- Moderator status must come from Discord role verification or a trusted server-side table, not client claims.
- Signed preview URLs must be short-lived.
- Rejection reasons must be bounded and escaped in UI.
- Moderation actions should keep audit records in `gallery_moderation_events`.
- Failed approval should not expose private storage paths publicly.
- Approved gallery publishing should have a clear rollback path.

## 15. Required Supabase Redirect URLs

Before Phase 3 preview testing, confirm Supabase Auth URL Configuration allows:

- `http://localhost:3000/auth`
- `http://localhost:3000/account`
- `http://localhost:3000/**`
- `https://mochirii.vercel.app/auth`
- `https://mochirii.vercel.app/account`
- Vercel preview URL pattern for the project/team.

Keep legacy root static callback URLs allowed until the static auth pages are retired:

- Existing GitHub Pages/static account callback URL.
- Existing production static account callback URL, if currently configured.

Supabase recommends exact production redirect URLs and preview/local wildcards only where needed.

## 16. Required Discord Callback URL

If Discord OAuth is managed through Supabase Auth, the Discord application redirect URI should remain the Supabase callback for the project:

- `https://deyvmtncimmcinldjyqe.supabase.co/auth/v1/callback`

Do not change this during Phase 3 implementation unless the Supabase project or Discord application configuration changes with explicit approval.

## 17. Validation Plan

Run before opening a Phase 3 PR:

```sh
npm run check
npm run check:json
npm run check:refs
npm run check:production
git diff --check

cd apps/web
npm run lint
npm run build
vercel build --prod
```

Also run targeted browser validation for `/auth`, `/account`, `/gallery-submit`, and `/leader-dashboard`.

## 18. Browser Smoke Plan

- Signed-out `/auth` shows Discord login.
- Discord login starts OAuth and returns to `/account`.
- `/account` displays profile and verification state.
- Verification invokes the Edge Function and handles success/failure.
- Profile updates save only allowed fields.
- `/gallery-submit` blocks signed-out and unverified users.
- Verified active members can select an image and submit for moderation.
- `/leader-dashboard` blocks non-moderators.
- Moderators can list pending submissions.
- Approve/reject actions update the queue and audit history.
- Redirects from `.html` URLs continue to resolve.

## 19. Rollback Plan

- Keep root static auth/member files untouched.
- Keep DNS on the current approved surface until explicit cutover.
- Revert the Phase 3 PR if Vercel preview reveals auth/session regressions.
- Leave Supabase Edge Functions and migrations unchanged unless a separate approved backend migration is needed.
- Keep legacy redirect URLs allowed until rollback risk is gone.

## 20. DNS Cutover Prerequisites

DNS cutover should wait until:

- Public pages pass visual review on production Vercel.
- Phase 3 auth/member workflows pass Vercel preview and production review.
- Supabase redirect URLs include final domain URLs.
- Discord OAuth callback remains valid.
- Storage upload/moderation smoke tests pass.
- Rollback plan is accepted.
- The user explicitly approves cutover.

## 21. Decision Points Requiring User Approval

- Whether to keep all privileged behavior in Supabase Edge Functions or move some into Next route handlers.
- Whether to use Supabase SSR cookie helpers or keep the current browser-session approach initially.
- Whether to continue with public client upload followed by metadata insert, or move upload orchestration server-side.
- Whether approved submissions should automatically enter `gallery.json` later or remain dashboard-reviewed/manual.
- Whether moderation roles should remain Discord-only or be mirrored into a trusted app table.
- Whether to change file size/type policy.
- Whether to add CAPTCHA, rate limits, or abuse controls beyond current Supabase/Discord checks.
- Whether and when to cut over `mochirii.com` DNS.

## Primary References

- Supabase Auth redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase secure data guidance: https://supabase.com/docs/guides/database/secure-data/
- Supabase Storage buckets: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Edge Function secrets: https://supabase.com/docs/guides/functions/secrets
