# Deployment Source of Truth

This repository currently carries a live Vercel/Next production surface and a retained root static rollback/reference surface.

## Current Production

- `https://mochirii.com` is the canonical production domain and is served by the Vercel-hosted Next.js app under `apps/web`.
- `https://www.mochirii.com` redirects to `https://mochirii.com`.
- `https://mochirii.vercel.app` remains available as a Vercel fallback/debug URL for the same app.
- Root static files, GitHub Pages, and the tracked `CNAME` file remain rollback/reference material until a later stabilization task explicitly retires them.
- Root `assets/` and `data/` remain the editable content source for now. The Next app uses mirrored copies in `apps/web/public/assets/` and `apps/web/public/data/`.

## Vercel Dashboard Checklist

Verify these settings in the production-serving `mochirii/mochirii` Vercel project before deployment-sensitive work:

- Root Directory: `apps/web`
- Framework Preset: `Next.js`
- Production Branch: `main`
- Build Command: Vercel default or `npm run build` from `apps/web`
- Install Command: Vercel default or `npm ci` from `apps/web`
- Output Directory: Vercel default for Next.js
- Production domain: `mochirii.com`
- `www` behavior: redirect to apex
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

Post-deploy production smoke:

```sh
npm run smoke:dns-cutover-post -- --base-url=https://mochirii.com --www-mode=redirect
```

This verifies clean Vercel routes, legacy `.html` redirects, signed-out member route content, Vercel headers on the apex, and the `www` redirect.

## Public Copy Sync

Until the retained root static rollback surface is retired, update canonical root files first:

- Root assets: `assets/`
- Root data: `data/`

Then mirror them into the Next app:

```sh
npm run sync:next-public
npm run check:next-public-sync
```

The sync check is included in `npm run check` so drift is caught in CI.

## Rollback And Stabilization Guardrails

- Do not change DNS, Vercel domains, GitHub Pages settings, Cloudflare settings, Supabase settings, or Discord settings during ordinary docs/content/theme work.
- Keep the root GitHub Pages files and tracked `CNAME` file available until a later stabilization task explicitly approves retirement.
- Keep legacy `.html` redirects in `apps/web/next.config.ts` so existing URLs continue to work on Vercel.
- Treat `mochirii.vercel.app` as a fallback/debug URL, not the canonical public URL.
- For rollback or provider-side changes, follow `docs/dns-cutover-readiness-and-rollback.md` and capture same-window evidence before mutating dashboards.
