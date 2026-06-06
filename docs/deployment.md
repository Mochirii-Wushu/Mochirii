# Deployment Source of Truth

This repository currently carries two deployable surfaces during the GitHub Pages to Vercel migration.

## Current Production And Preview

- `https://mochirii.com` is the current production domain and is still served from the root static GitHub Pages site on `main`.
- `https://mochirii.vercel.app` is the Vercel-hosted Next.js app under `apps/web`.
- DNS cutover to Vercel is deferred until the DNS readiness and rollback plan is approved and executed.
- Root `assets/` and `data/` remain canonical until cutover. The Next app uses copied files in `apps/web/public/assets/` and `apps/web/public/data/`.

## Vercel Dashboard Checklist

Verify these settings in the `mochirii/mochirii` Vercel project before any production cutover:

- Root Directory: `apps/web`
- Framework Preset: `Next.js`
- Production Branch: `main`
- Build Command: Vercel default or `npm run build` from `apps/web`
- Install Command: Vercel default or `npm ci` from `apps/web`
- Output Directory: Vercel default for Next.js
- Preview deployments: enabled for pull requests that need visual or auth review
- Deployment protection: enabled for previews if member/auth workflow state should not be public
- Environment variables: only browser-safe `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` in the app
- Secrets: no service-role keys, Discord bot tokens, OAuth client secrets, or privileged credentials in browser code or docs

## Validation

Use this sequence for deployment-sensitive work:

```sh
npm run check
git diff --check

cd apps/web
npm ci
npm run lint
npm run build
```

Optional Vercel-local validation, when authenticated:

```sh
cd apps/web
vercel pull --environment=preview --yes
npm run clean
cd ../..
vercel build --prod --cwd apps/web
```

## Public Copy Sync

Until cutover, update canonical root files first:

- Root assets: `assets/`
- Root data: `data/`

Then mirror them into the Next app:

```sh
npm run sync:next-public
npm run check:next-public-sync
```

The check is included in `npm run check` so drift is caught in CI.

## Cutover Guardrails

- Do not point `mochirii.com` at Vercel until the DNS readiness and rollback plan is current.
- Keep the root GitHub Pages site deployable until Vercel production is verified.
- Keep legacy `.html` redirects in `apps/web/next.config.ts` so existing URLs continue to work after cutover.
- After cutover, run production smoke checks against both `/path` and legacy `/path.html` route shapes.
