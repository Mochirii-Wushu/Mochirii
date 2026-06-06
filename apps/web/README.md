# Mochirii Next.js App

This app is the Vercel-ready Next.js surface for Mochirii. The existing root GitHub Pages static site remains intact, and DNS cutover is still deferred.

For the current production/preview split, Vercel dashboard checklist, and DNS cutover guardrails, see [`../../docs/deployment.md`](../../docs/deployment.md).

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

Until DNS cutover, root `assets/` and `data/` are canonical. The Next app reads copied files from `public/assets/` and `public/data/`.

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

Do not print or commit secret values. Do not add service-role keys, Discord bot tokens, OAuth client secrets, or other privileged credentials to browser code. Privileged verification, moderation, signed preview URLs, and audit behavior stay inside existing Supabase Edge Functions.

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
- Browser-safe Supabase helpers added under `lib/supabase/` for Auth session state, Discord OAuth, profile reads/updates, member upload submission, approved feed reads, and moderation Edge Function invocations.
- Member workflow React components added under `components/member-workflow/`.
- The header now shows member workflow links based on browser auth state, while protected pages still enforce access themselves.
- Root GitHub Pages auth/member/upload/moderation files remain untouched.
- Supabase migrations, Supabase Edge Functions, Vercel settings, Discord settings, dashboard settings, DNS, and production cutover remain unchanged.

What stays in Supabase:

- Identity, Postgres, RLS, Storage, Edge Functions, Discord verification, gallery moderation authority, signed preview URLs, and audit records.
- `verify-discord-member`, `list-approved-gallery-submissions`, `list-gallery-review-queue`, and `moderate-gallery-submission`.

What Next/Vercel handles:

- Routing, React UI, metadata/noindex, legacy `.html` redirects, form state, client-side validation, file selection, and thin browser-safe Supabase integration.

Manual Supabase redirect URL checklist before authenticated preview testing:

```text
http://localhost:3000/**
https://mochirii.vercel.app/**
Vercel preview URL pattern for the project/team
future https://mochirii.com/** only after DNS cutover approval
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

Rollback plan: revert the Phase 3 PR if preview testing finds auth/session regressions. The root static auth/member files remain in place, and DNS cutover remains deferred.

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

## DNS Cutover

DNS cutover is deferred. Current Vercel production review URL is:

```text
https://mochirii.vercel.app
```

Custom-domain cutover for `mochirii.com` requires explicit approval and a manual DNS/Vercel/Supabase checklist. See [`../../docs/dns-cutover-readiness-and-rollback.md`](../../docs/dns-cutover-readiness-and-rollback.md).

## Deferred

- Server-side Supabase SSR/cookie behavior unless a route proves it needs server-side auth.
- Backend/schema/RLS/Edge Function changes.
- Vercel dashboard automation.
- Production DNS and cutover.

See `docs/next-phase-3-auth-member-workflow.md` for the Phase 3 auth/member/gallery workflow migration plan.
