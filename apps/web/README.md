# Mochirii Next.js App

This app is the Vercel-ready Next.js surface for Mochirii. The existing root GitHub Pages static site remains intact, and DNS cutover is still deferred.

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

`npm run clean` removes only `.next` and `.vercel/output`; it does not remove `.vercel/project.json` or local env files.

## Vercel Setup

Set the Vercel project Root Directory to:

```text
apps/web
```

Dashboard settings remain manual. This branch does not change Vercel project settings, DNS, production domains, Supabase settings, or Discord settings.

Local linking is intentionally deferred unless the operator chooses to run it:

```sh
cd apps/web
vercel link
vercel pull --environment=preview
```

Do not commit `.vercel/`.

## Future Environment Variables

The preview/production Vercel environments will need these public names configured before Supabase-backed features migrate:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL
```

Do not print or commit secret values. `.env.example` contains names only.

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
vercel build --prod
```

## Accepted or Deferred Warnings

- `assets/audio/mochiriiiiii.mp3` is intentionally over the static asset warning threshold. It is preserved for current Recruitment audio behavior.
- A local `vercel build --prod` can warn if `.next` exists. Run `npm run vercel:build:local` to clean local generated output first.
- Local `vercel build --prod` may still log a non-blocking `outputFileTracingRoot` / `turbopack.root` mismatch from Vercel CLI's linked `apps/web` root; confirm dashboard deployment logs after the PR.
- Vercel Development env was missing `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` during the cleanup audit. Add it manually before relying on Development env pulls.

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

## Deferred

- Authentication and account behavior.
- Server-side Supabase behavior.
- Discord integrations.
- Uploads, moderation, account, and leader-dashboard behavior.
- Vercel dashboard automation.
- Production DNS and cutover.

See `docs/next-phase-3-auth-member-workflow.md` for the Phase 3 auth/member/gallery workflow migration plan.
