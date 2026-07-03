# Auth, Account, Gallery, And Social Workflow State

This document records the current state after the Phase 3 auth/member workflow migration and the later retirement of the website member profile pages.

## Current Website Routes

The active member-adjacent Next routes are:

- `/auth`
- `/account`
- `/social`
- `/oauth/consent`
- `/gallery-submit`
- `/leader-dashboard`

Retired routes:

- `/members`
- `/members/[slug]`

The retired routes should stay absent from `apps/web` and return normal 404 responses. Do not add redirects. Mochirii Social at `https://social.mochirii.com` is the member social/profile destination.

## Supabase-First Architecture Rule

Supabase remains the authority for Auth, Postgres, RLS, Storage, Edge Functions, Discord verification, gallery moderation, Instagram publishing, Pixelfed/Mochirii Social account mapping, and audit records. Vercel/Next owns routing, React UI, rendering, redirects, and thin browser-safe integration with Supabase.

Existing Supabase Edge Functions should continue to be invoked from the Next app where needed. Do not recreate `verify-discord-member`, `list-gallery-review-queue`, `moderate-gallery-submission`, `list-approved-gallery-submissions`, `list-instagram-publish-queue`, or social-account authority as Vercel route handlers.

Do not add Vercel service-role, Discord bot, Instagram publishing, OAuth client, or Pixelfed secrets unless a later approved change explicitly requires them. Browser-safe Supabase calls may use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; service-role keys, secret keys, Discord bot tokens, Instagram access tokens, and OAuth client secrets must stay in Supabase Edge Functions or explicitly server-only code.

RLS and Storage policies remain central and must not be bypassed by client code. Future provider, DNS, Supabase, Vercel, GitHub, Cloudflare, DigitalOcean, Spaces, or Discord setting changes still require explicit approval.

## Current Implementation Status

The Next implementation has browser-safe helpers under `apps/web/lib/supabase/` and member workflow components under `apps/web/components/member-workflow/`. Supabase Auth runs in the browser with the publishable key. User-owned profile and submission reads remain subject to RLS. Uploads go through the private `member-gallery` bucket. Privileged verification/moderation still invokes Supabase Edge Functions.

Current website UI:

- `/auth`: sign-in entry.
- `/account`: safe profile fields, Discord verification, gallery submission history, and Mochirii Social handoff.
- `/social`: noindex Mochirii Social handoff/support page.
- `/oauth/consent`: Supabase OAuth consent UI for Mochirii Social.
- `/gallery-submit`: role-gated image upload flow.
- `/leader-dashboard`: moderator gallery queue, member verification review, Instagram queue, and Mochi Social alpha controls.

Retired website UI:

- member directory
- member profile pages
- profile publishing toggle
- avatar/banner upload controls
- profile media moderation queue

Shared `member_profiles`, legacy profile media tables/functions, Discord verification, gallery/rank dependencies, and `social_accounts` remain in Supabase until a separate dependency audit/migration is approved.

## Current Supabase Tables Referenced

- `auth.users`
- `auth.identities`
- `public.member_profiles`
- `public.gallery_submissions`
- `public.gallery_moderation_events`
- `public.member_profile_media`
- `public.member_profile_media_events`
- `public.discord_resources`
- `public.discord_sync_log`
- `public.social_accounts`
- `storage.buckets`
- `storage.objects`

Current Storage buckets:

- `member-gallery`, private, image-only, 50 MB file limit.
- `member-profile-media`, private legacy avatar/banner media retained until a backend retirement migration is approved.

## Current Supabase Edge Functions Referenced

Active website flows use:

- `verify-discord-member`
- `verify-member-access`
- `list-approved-gallery-submissions`
- `list-gallery-review-queue`
- `moderate-gallery-submission`
- `list-instagram-publish-queue`
- `publish-instagram-gallery-submission`
- `mark-instagram-gallery-submission-shared`
- `check-instagram-api-status`

Legacy member profile functions remain configured but should not be treated as active website pages:

- `list-member-profiles`
- `get-member-profile`
- `submit-member-profile-media`
- `list-member-profile-media-queue`
- `moderate-member-profile-media`
- `list-visible-profile-cards`

## Supabase Redirect URL Checklist

For authenticated testing, manually confirm Supabase Auth URL Configuration allows:

- `http://localhost:3000/**`
- `https://mochirii.com/**`
- `https://mochirii.vercel.app/**`
- Vercel preview URL pattern for the project/team.

Confirm these website route targets are accepted:

- `/auth`
- `/account`
- `/social`
- `/oauth/consent`
- `/gallery-submit`
- `/leader-dashboard`

Keep legacy root static callback URLs allowed until rollback risk is retired.

## Browser Smoke Plan

- Signed-out `/auth` shows the configured sign-in method UI.
- Discord provider login starts OAuth and returns to `/account`.
- `/account` displays profile and verification state.
- Profile updates save only allowed fields.
- `/social` sends signed-in users to Mochirii Social and gives signed-out users a branded support doorway.
- `/members` and `/members/twills` return 404.
- `/gallery-submit` blocks signed-out and unverified users.
- Verified active members can select an image and submit for moderation.
- `/leader-dashboard` blocks non-moderators.
- Moderators can list pending submissions.
- Approve/reject actions update the queue and audit history.
- Redirects from active `.html` URLs continue to resolve.

## Validation Plan

Run before opening a workflow PR:

```sh
npm run check:member-workflow-qa
npm run check:member-profiles-and-ranks
npm run check:site-navigation
npm run check:observability-metadata-smoke
npm run check
git diff --check

cd apps/web
npm run lint
npm run build
```

## Rollback And Provider Boundaries

- Keep root static auth/member files untouched until a separate rollback artifact retirement is approved.
- Keep DNS on the current approved Vercel/Next surface unless explicit rollback/provider approval exists.
- Leave Supabase Edge Functions and migrations unchanged unless a separate approved backend migration is needed.
- Keep legacy redirect URLs allowed until rollback risk is gone.
- Do not change DNS or provider settings from this document alone.

See `docs/dns-cutover-readiness-and-rollback.md` for the post-cutover rollback and provider-change checklist.
