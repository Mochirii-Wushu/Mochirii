# Next Phase 3 Auth and Member Workflow Plan

## 1. Phase 3 Scope

Phase 3 migrated the deferred auth/member workflows from the root static site into the existing Next.js App Router app under `apps/web`.

Route migration order:

1. `/auth`
2. `/account`
3. `/gallery-submit`
4. `/leader-dashboard`

The root GitHub Pages files stay intact as rollback/reference material while the Vercel/Next production surface stabilizes.

## Supabase-First Architecture Rule

Supabase remains the authority for Auth, Postgres, RLS, Storage, Edge Functions, Discord verification, gallery moderation, Instagram publishing, and audit records. Vercel/Next owns routing, React UI, rendering, redirects, and thin browser-safe integration with Supabase.

Existing Supabase Edge Functions should continue to be invoked from the Next app. Do not recreate `verify-discord-member`, `list-gallery-review-queue`, `moderate-gallery-submission`, `list-approved-gallery-submissions`, `list-instagram-publish-queue`, or `publish-instagram-gallery-submission` as Vercel route handlers in this phase.

Do not add Vercel service-role, Discord bot, or Instagram publishing secrets unless a later approved change explicitly requires them. Browser-safe Supabase calls may use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; service-role keys, secret keys, Discord bot tokens, Instagram access tokens, and OAuth client secrets must stay in Supabase Edge Functions or explicitly server-only code.

RLS and Storage policies remain central and must not be bypassed by client code. The custom domain now serves the Vercel/Next app; future provider, DNS, Supabase, or Discord setting changes still require explicit approval.

## Phase 3 Implementation Status

The member workflow routes now exist in `apps/web` while the root GitHub Pages files remain as rollback/reference material:

- `/auth`
- `/account`
- `/gallery-submit`
- `/leader-dashboard`

The Next implementation adds browser-safe helpers under `apps/web/lib/supabase/` and member workflow components under `apps/web/components/member-workflow/`. The helpers keep the existing static-site behavior close to `supabase.js`: Supabase Auth runs in the browser with the publishable key, user-owned profile and submission reads remain subject to RLS, uploads go through the private `member-gallery` bucket, and privileged verification/moderation still invokes existing Supabase Edge Functions.

No Supabase migrations, Supabase Edge Functions, dashboard settings, Discord settings, DNS settings, Vercel settings, or root GitHub Pages auth/member/upload/moderation files should be changed by ordinary docs/content work.

## 2. Non-Goals

- Do not change `mochirii.com` DNS or provider settings without explicit approval.
- Do not remove root GitHub Pages auth/member files.
- Do not manually deploy from local CLI.
- Do not expose service-role, secret, Discord bot, or OAuth client secret values to the browser.
- Do not change Supabase, Discord, Vercel, GitHub Pages, GitHub, or DNS dashboard settings without explicit approval.
- Do not broaden public route migration or redesign the public pages.
- Do not move Supabase Edge Function authority into Vercel route handlers.

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

## 5. Supabase Helper Files Involved

- `supabase.js`: browser-safe helper used by the current root static auth/member/upload/moderation pages.
- `supabase/config.toml`: local Supabase function configuration.
- `supabase/functions/_shared/discord-api.ts`: Discord API helpers for Edge Functions.
- `supabase/functions/_shared/gallery-moderation.ts`: shared moderation access helpers.
- `supabase/functions/verify-discord-member/index.ts`
- `supabase/functions/list-approved-gallery-submissions/index.ts`
- `supabase/functions/list-gallery-review-queue/index.ts`
- `supabase/functions/moderate-gallery-submission/index.ts`
- `supabase/migrations/*`: current table, RLS, Storage bucket, and Discord integration schema.

## 6. Current Supabase Tables Referenced

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

## 7. Current Supabase Edge Functions Referenced

- `verify-discord-member`
- `list-approved-gallery-submissions`
- `list-gallery-review-queue`
- `moderate-gallery-submission`
- `list-instagram-publish-queue`
- `publish-instagram-gallery-submission`

`verify-discord-member`, `list-gallery-review-queue`, `moderate-gallery-submission`, `list-instagram-publish-queue`, and `publish-instagram-gallery-submission` require a valid user JWT. `list-approved-gallery-submissions` is currently configured without JWT verification for public approved-gallery reads.

## 8. Current Discord OAuth and Member Verification Flow

Current browser flow:

1. `auth.js` calls `window.MochiriiSupabase.signInWithDiscord({ redirectTo: "./account.html" })`.
2. `supabase.js` starts Supabase Auth OAuth with the Discord provider and scopes `identify email`.
3. Supabase redirects the signed-in user back to the account page.
4. `account.js` loads the Supabase user and current `member_profiles` row.
5. The user can run Discord verification, which invokes `verify-discord-member`.
6. The Edge Function checks the authenticated user's Discord identity, queries the Discord guild member API, verifies required roles, and updates `member_profiles`.
7. Upload access requires active `member_status`, recent Discord verification, and required roles.
8. Moderator access requires the configured moderator Discord role and uses Edge Functions instead of direct browser table writes.

## 9. Required Env Vars

Public browser env names for the Next app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

Existing Supabase Edge Function secret or non-browser names are not required in Vercel/Next by this branch. They are listed here only as backend-boundary reminders and must not be exposed to browser code:

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
- `DISCORD_GALLERY_CHANNEL_ID`
- `DISCORD_GALLERY_INGEST_SECRET`
- `INSTAGRAM_ACCOUNT_ID`
- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_API_VERSION`
- `INSTAGRAM_API_BASE_URL`

Only public publishable keys may be exposed to browser code. Service-role, secret, Discord bot, and Instagram publishing values must stay server-side only.

## 10. Supabase Redirect URL Checklist

For authenticated testing, manually confirm Supabase Auth URL Configuration allows:

- `http://localhost:3000/**`
- `https://mochirii.com/**`
- `https://mochirii.vercel.app/**`
- Vercel preview URL pattern for the project/team.

Confirm these route targets are accepted:

- `/auth`
- `/account`
- `/gallery-submit`
- `/leader-dashboard`

Keep legacy root static callback URLs allowed until rollback risk is retired:

- Existing GitHub Pages/static account callback URL.
- Existing production static account callback URL, if currently configured.

Supabase recommends exact production redirect URLs and preview/local wildcards only where needed.

## 11. Discord Callback URL Checklist

If Discord OAuth is managed through Supabase Auth, the Discord application redirect URI should remain the Supabase callback for the project:

- `https://deyvmtncimmcinldjyqe.supabase.co/auth/v1/callback`

Do not change this during Phase 3 implementation unless the Supabase project or Discord application configuration changes with explicit approval.

## 12. Client/Server Boundary Plan

The initial Next implementation uses:

- Client components only for browser auth state, form interactions, file selection, modal state, and upload progress.
- Shared `apps/web/lib/supabase` helpers for browser-safe Supabase client creation.
- Existing Supabase Edge Functions for privileged Discord/member/moderation actions.
- No Next route handlers for `verify-discord-member`, `list-approved-gallery-submissions`, `list-gallery-review-queue`, `moderate-gallery-submission`, `list-instagram-publish-queue`, or `publish-instagram-gallery-submission`.
- No Supabase SSR cookie middleware in this phase; server-side auth can be evaluated later only if a real route need appears.

Do not import server-only credentials into Client Components.

## 13. What Stays Client-Side Initially

- Supabase Auth client initialization with public publishable key.
- OAuth sign-in trigger.
- Signed-in/signed-out UI state.
- User-owned `member_profiles` reads and allowed editable profile updates, subject to RLS.
- User-owned `gallery_submissions` history reads, subject to RLS.
- File input validation before upload.
- Public, non-sensitive form state and accessibility behavior.

## 14. What Stayed In Supabase

- Discord membership checks through `verify-discord-member`.
- Moderator-role checks through existing moderation Edge Function helpers.
- Moderation queue reads through `list-gallery-review-queue`.
- Submission approval/rejection writes through `moderate-gallery-submission`.
- Instagram publishing queue reads through `list-instagram-publish-queue`.
- Moderator-confirmed Instagram posts through `publish-instagram-gallery-submission`.
- Approved submission feed reads through `list-approved-gallery-submissions`.
- Signed preview URL creation.
- Gallery moderation audit records.
- Any code path needing service-role, secret key, Discord bot token, or OAuth client secret values.

Future server-side Next auth can be considered only if preview testing proves a route cannot be made safe with the current browser-session and Supabase Edge Function model.

## 15. RLS and Security Assumptions To Verify

- `member_profiles` has RLS enabled and users can only read/update their own permitted fields.
- `gallery_submissions` has RLS enabled and users can only read their own submissions.
- Upload inserts require active status, recent verification, required roles, and a `member-gallery` path scoped to the user ID.
- Moderation tables remain service-role only unless a reviewed policy is added.
- Storage policies continue to require authenticated ownership and active verified membership.
- JWT claims from user-editable metadata are not trusted for authorization decisions.
- Service-role/secret keys are never imported into browser bundles.

## 16. Upload and Storage Security Risks

- Preserve MIME allow-list checks for JPEG, PNG, and WebP.
- Preserve 50 MB maximum file size unless explicitly changed.
- Keep the bucket private.
- Keep paths user-scoped by authenticated user ID.
- Avoid overwriting existing files unless RLS policies explicitly support it.
- Confirm rejected/deleted submission cleanup behavior.
- Consider server-side image validation or transformation later if abuse risk increases.

## 17. Moderation Workflow Risks

- Moderator status must come from Discord role verification or a trusted server-side table, not client claims.
- Signed preview URLs must be short-lived.
- Rejection reasons must be bounded and escaped in UI.
- Moderation actions should keep audit records in `gallery_moderation_events`.
- Failed approval should not expose private storage paths publicly.
- Approved gallery publishing should have a clear rollback path.

## 18. Validation Plan

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

cd ../..
vercel build --prod --cwd apps/web
```

Also run targeted browser validation for `/auth`, `/account`, `/gallery-submit`, and `/leader-dashboard`.

## 19. Browser Smoke Plan

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

## 20. Rollback Plan

- Keep root static auth/member files untouched.
- Keep DNS on the current approved Vercel/Next surface unless explicit rollback/provider approval exists.
- Revert the Phase 3 PR if Vercel preview reveals auth/session regressions.
- Leave Supabase Edge Functions and migrations unchanged unless a separate approved backend migration is needed.
- Keep legacy redirect URLs allowed until rollback risk is gone.
- If needed, temporarily remove the `.html` redirects for Phase 3 routes in a follow-up PR so the root static pages can keep serving those workflows while Next is repaired.

## 21. Post-Cutover Stabilization Prerequisites

The custom domain is already on Vercel/Next. Stabilization should continue until:

- Public pages pass visual review on production Vercel.
- Phase 3 auth/member workflows pass Vercel preview and production review.
- Live-account QA follows [`docs/member-workflow-production-qa-runbook.md`](member-workflow-production-qa-runbook.md), or remaining live-mutating checks are explicitly deferred with a rollback owner.
- Supabase redirect URLs include final domain URLs.
- Discord OAuth callback remains valid.
- Storage upload/moderation smoke tests pass.
- Rollback plan is accepted.
- The user explicitly approves retiring rollback artifacts.

See `docs/dns-cutover-readiness-and-rollback.md` for the post-cutover rollback and provider-change checklist. Do not change DNS or provider settings from this document alone.

## 22. Decision Points Requiring User Approval

- Whether to keep all privileged behavior in Supabase Edge Functions or move some into Next route handlers.
- Whether to use Supabase SSR cookie helpers or keep the current browser-session approach initially.
- Whether to continue with public client upload followed by metadata insert, or move upload orchestration server-side.
- Whether approved submissions should automatically enter `gallery.json` later or remain dashboard-reviewed/manual.
- Whether moderation roles should remain Discord-only or be mirrored into a trusted app table.
- Whether to change file size/type policy.
- Whether to add CAPTCHA, rate limits, or abuse controls beyond current Supabase/Discord checks.
- Whether and when to retire GitHub Pages/root static rollback artifacts.

## Primary References

- Supabase Auth redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase secure data guidance: https://supabase.com/docs/guides/database/secure-data/
- Supabase Storage buckets: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Edge Function secrets: https://supabase.com/docs/guides/functions/secrets
