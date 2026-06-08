# Mochirii Next.js App

This app is the live Vercel/Next.js production surface for Mochirii at `https://mochirii.com`. The existing root GitHub Pages static site remains intact as rollback/reference material.

For the current production, fallback, Vercel dashboard checklist, and rollback guardrails, see [`../../docs/deployment.md`](../../docs/deployment.md).

## Local Development

```sh
cd apps/web
npm install
npm run dev
```

Open the local URL printed by Next.js.

## Build and Lint

```sh
cd apps/web
npm run lint
npm run build
```

Optional local cleanup scripts:

```sh
cd apps/web
npm run clean
npm run build:clean
npm run vercel:build:local
```

`npm run clean` removes only `.next` and `.vercel/output`; it does not remove `.vercel/project.json` or local env files. `npm run vercel:build:local` runs the same root command documented below: `vercel build --prod --cwd apps/web`.

## Vercel Setup

Set the Vercel project Root Directory to:

```text
apps/web
```

Dashboard settings remain manual. This branch does not change Vercel project settings, DNS, production domains, Supabase settings, or Discord settings.

The safest local workflow is to pull settings for the linked app, clean generated output, then run the Vercel build from the repository root with `--cwd apps/web`:

```sh
cd apps/web
vercel pull --environment=preview --yes
npm run clean
cd ../..
vercel build --prod --cwd apps/web
```

Root-level `vercel link --repo` was tested as a reversible monorepo-link cleanup path, but it prompts for confirmation before linking the repository to Vercel projects. Do not answer that prompt or relink the project without an operator present. Dashboard Root Directory remains the authoritative production/preview setting.

Do not commit `.vercel/`.

## Vercel Observability

The app is wired for Vercel Web Analytics and Speed Insights from the root layout with the official Next.js packages:

- `@vercel/analytics`
- `@vercel/speed-insights`

These integrations do not require app secrets or `NEXT_PUBLIC_*` values. Keep Web Analytics and Speed Insights enabled in the canonical `mochirii/mochirii` Vercel project dashboard, then verify the deployed browser page loads the Vercel observability scripts after hydration.

```text
script[data-sdkn="@vercel/analytics/next"]
script[data-sdkn="@vercel/speed-insights/next"]
```

Vercel can serve those scripts from project-specific unique paths rather than the plain `/_vercel/...` endpoints.

Analytics and Core Web Vitals data can take a few minutes, and enough real production visits, to appear in the Vercel dashboard.

## Public Assets And Data

While the root static rollback surface remains available, root `assets/` and `data/` are the editable content source. The Next app reads copied files from `public/assets/` and `public/data/`.

From the repository root, mirror and verify the copies with:

```sh
npm run sync:next-public
npm run check:next-public-sync
```

## Supabase Environment Variables

Phase 3 member workflows use only browser-safe public Supabase values in the Next app:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL
```

Do not print or commit secret values. Do not add service-role keys, Discord bot tokens, Instagram access tokens, OAuth client secrets, or other privileged credentials to browser code. Privileged verification, moderation, Instagram publishing, signed preview URLs, and audit behavior stay inside Supabase Edge Functions.

## Migrated Routes

Current Next routes:

- `/`
- `/join`
- `/ranks`
- `/leaders`
- `/codex`
- `/events`
- `/announcements`
- `/raffles`
- `/gallery`
- `/spotlight`
- `/spotify`
- `/recruitment`
- `/twills`
- `/auth`
- `/account`
- `/members`
- `/members/[slug]`
- `/gallery-submit`
- `/leader-dashboard`

Legacy `.html` redirects for migrated pages are configured in `next.config.ts`.

## Current Visual Shell Standard

Shared `PageHero` routes should show their hero artwork as full-frame images in a stable `3 / 2` layout. The current standard is `object-fit: contain`, no crop, no tint/scrim/filter, and no intro-card overlap. Intro cards sit below the image with positive spacing while each page keeps its existing palette, glass styling, copy, image paths, metadata, and route behavior.

Visual-only shell releases should verify Home and all shared routes at `360`, `390`, `768`, `1024`, and `1440` pixel widths before PR approval. Keep root `data/` and `apps/web/public/data/` synchronized when an approved root data correction is included.

## Migrated in Phase 1

- Next.js TypeScript App Router scaffold under `apps/web`.
- Existing `assets/` copied to `public/assets/`.
- Existing `data/` copied to `public/data/`.
- Existing `styles.css` copied to `app/mochirii.css`.
- Shared header and footer converted to React components.
- Homepage converted from `index.html` and `home.js` DOM mutation to React rendering.
- Legacy `.html` redirects configured in `next.config.ts`.

## Migrated in Phase 2

- Public/static routes migrated into App Router pages:
  `/join`, `/ranks`, `/leaders`, `/codex`, `/events`, `/announcements`,
  `/raffles`, `/gallery`, `/spotlight`, `/spotify`, `/recruitment`, and `/twills`.
- Route content continues to render from the copied JSON files in `public/data/`.
- Public client-side interactions migrated where needed: gallery filters/query links/lightbox, event filters, and Spotify filtering.
- Legacy `.html` redirects for migrated pages are verified in `next.config.ts`.

Phase 2 validation:

```sh
cd ../..
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

## Migrated in Phase 3

- Deferred member workflow routes migrated into App Router pages: `/auth`, `/account`, `/gallery-submit`, and `/leader-dashboard`.
- Browser-safe Supabase helpers added under `lib/supabase/` for Auth session state, Discord OAuth, profile reads/updates, member upload submission, approved feed reads, moderation Edge Function invocations, and the moderator-controlled Instagram publishing queue.
- Member workflow React components added under `components/member-workflow/`.
- The header now shows member workflow links based on browser auth state, while protected pages still enforce access themselves.
- Root GitHub Pages auth/member/upload/moderation files remain untouched as rollback/reference material.
- Vercel settings, Discord settings, dashboard settings, and DNS remain unchanged by the Next UI. The Instagram queue migration and Supabase Edge Functions are deployed in production. The private Reaper source repo now exists at `Mochirii-Wushu/Reaper`; direct Meta API secrets and any real Instagram API post remain external owner-approved steps. Current Instagram launch mode is moderator-controlled manual sharing from the Leader Dashboard.

What stays in Supabase:

- Identity, Postgres, RLS, Storage, Edge Functions, Discord verification, gallery moderation authority, signed preview URLs, and audit records.
- `verify-discord-member`, `list-approved-gallery-submissions`, `list-gallery-review-queue`, `moderate-gallery-submission`, `list-instagram-publish-queue`, `mark-instagram-gallery-submission-shared`, and `publish-instagram-gallery-submission`.

## Instagram Gallery Publishing

Website uploads include an optional Instagram opt-in checkbox. Reaper's Discord submissions send the matching `instagramOptIn` payload from the optional `share_to_instagram` command parameter.

Approval for the public Gallery never posts to Instagram automatically. If an approved submission has explicit opt-in consent, Supabase creates an Instagram publishing job. The Leader Dashboard shows that separate Instagram Queue, allows moderator caption and alt-text review, provides download/copy tools for manual posting, and requires a final browser confirmation before marking the job shared manually. The direct Meta API publish function remains a future path after Meta developer access is available.

Instagram account IDs, tokens, API versions, and API base URLs stay in Supabase secrets only. They do not belong in Vercel env vars or any `NEXT_PUBLIC_*` value.

## Member Profiles

Member profiles build on the Phase 3 auth/member workflow. `/members` and `/members/[slug]` are members-only, `noindex` routes. They require a signed-in Supabase session plus active, recently verified Discord membership through Supabase Edge Functions.

The Account page lets a member opt in to profile publication and submit avatar/banner images for review. The Leader Dashboard has a separate profile media moderation queue. Approved profile media is served through short-lived signed URLs from the private `member-profile-media` bucket; pending, rejected, and archived media never renders on profiles.

The Twills route remains protected static profile content, but the visual profile layout is now shared through `components/public-pages/ProfileDisplay.tsx`.

Discord guild titles come from vanity rank role IDs stored in `discord_resources` after Reaper `/sync-ranks` creates or adopts safe zero-permission roles. Vercel/Next never mutates Discord roles and never stores Discord bot tokens.

What Next/Vercel handles:

- Routing, React UI, metadata/noindex, legacy `.html` redirects, form state, client-side validation, file selection, and thin browser-safe Supabase integration.

Manual Supabase redirect URL checklist before authenticated preview testing:

```text
http://localhost:3000/**
https://mochirii.com/**
https://mochirii.vercel.app/**
Vercel preview URL pattern for the project/team
```

Route targets to verify:

```text
/auth
/account
/members
/members/[slug]
/gallery-submit
/leader-dashboard
```

Discord OAuth callback should remain:

```text
https://deyvmtncimmcinldjyqe.supabase.co/auth/v1/callback
```

Phase 3 validation:

```sh
cd ../..
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

Rollback plan: keep the root static auth/member files in place while the post-cutover stabilization window remains open. Any DNS, provider, or GitHub Pages rollback requires explicit owner approval and same-window evidence.

## Accepted or Deferred Warnings

- `assets/audio/mochiriiiiii.mp3` is intentionally over the static asset warning threshold. It is preserved exactly as-is because audio quality is preferred over file-size optimization. This is not a Vercel blocker. Do not compress, re-encode, replace, delete, externalize, or otherwise optimize this audio without explicit user approval.
- A local `vercel build --prod` can warn if `.next` exists. Run `npm run vercel:build:local` to clean local generated output first.
- The previous local `outputFileTracingRoot` / `turbopack.root` mismatch is fixed by matching `turbopack.root` to the `apps/web` project root used by `vercel build --prod --cwd apps/web`.
- Vercel Development env is intentionally skipped for now. Production and Preview envs are what matter for current deployed and PR-preview builds.

## Vercel Verification

```sh
cd apps/web
vercel whoami
vercel env ls production
vercel env ls preview
vercel env ls development
vercel pull --environment=preview --yes
```

Report env names only as present or missing. Do not print values.

## Live Domain And Fallback

The canonical production URL is:

```text
https://mochirii.com
```

`www` redirects to the apex:

```text
https://www.mochirii.com -> https://mochirii.com
```

The Vercel fallback/debug URL is:

```text
https://mochirii.vercel.app
```

Rollback/provider changes require explicit approval and a manual DNS/Vercel/Supabase checklist. See [`../../docs/dns-cutover-readiness-and-rollback.md`](../../docs/dns-cutover-readiness-and-rollback.md).

## Deferred

- Server-side Supabase SSR/cookie behavior unless a route proves it needs server-side auth.
- Backend/schema/RLS/Edge Function changes.
- Vercel dashboard automation.
- Retiring GitHub Pages/root static rollback artifacts.

See `docs/next-phase-3-auth-member-workflow.md` for the Phase 3 auth/member/gallery workflow migration plan.
