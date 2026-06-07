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
- `/gallery-submit`
- `/leader-dashboard`

Legacy `.html` redirects for migrated pages are configured in `next.config.ts`.

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
- Vercel settings, Discord settings, dashboard settings, and DNS remain unchanged by the Next UI. The Instagram publishing migration and Supabase Edge Functions are deployed in production; Reaper command registration, Instagram production secrets, and any real Instagram post remain external owner-approved steps.

What stays in Supabase:

- Identity, Postgres, RLS, Storage, Edge Functions, Discord verification, gallery moderation authority, signed preview URLs, and audit records.
- `verify-discord-member`, `list-approved-gallery-submissions`, `list-gallery-review-queue`, `moderate-gallery-submission`, `list-instagram-publish-queue`, and `publish-instagram-gallery-submission`.

## Instagram Gallery Publishing

Website uploads include an optional Instagram opt-in checkbox. Discord/Reaper submissions should send the matching `instagramOptIn` payload from the optional `share_to_instagram` command parameter.

Approval for the public Gallery never posts to Instagram automatically. If an approved submission has explicit opt-in consent, Supabase creates an Instagram publishing job. The Leader Dashboard shows that separate Instagram Queue, allows moderator caption and alt-text review, and requires a final browser confirmation before calling the publish Edge Function.

Instagram account IDs, tokens, API versions, and API base URLs stay in Supabase secrets only. They do not belong in Vercel env vars or any `NEXT_PUBLIC_*` value.

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
