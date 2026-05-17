# Mochirii Next.js Phase 1 App

This app is the Phase 1 Vercel-ready Next.js scaffold for Mochirii. The existing root GitHub Pages static site remains intact and is not cut over by this app.

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

## Migrated in Phase 1

- Next.js TypeScript App Router scaffold under `apps/web`.
- Existing `assets/` copied to `public/assets/`.
- Existing `data/` copied to `public/data/`.
- Existing `styles.css` copied to `app/mochirii.css`.
- Shared header and footer converted to React components.
- Homepage converted from `index.html` and `home.js` DOM mutation to React rendering.
- Legacy `.html` redirects configured in `next.config.ts`.

## Deferred

- Authentication and account behavior.
- Server-side Supabase behavior.
- Discord integrations.
- Non-home page migrations.
- Vercel dashboard automation.
- Production DNS and cutover.
