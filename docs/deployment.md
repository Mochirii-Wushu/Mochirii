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
- Web Analytics: enabled for `mochirii/mochirii`
- Speed Insights: enabled for `mochirii/mochirii`
- Environment variables: only browser-safe `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` in the app
- Secrets: no service-role keys, Discord bot tokens, OAuth client secrets, or privileged credentials in browser code or docs

## Security Hardening

Production security is Vercel-first: `mochirii.com` stays on the canonical Vercel/Next project, and Cloudflare remains DNS-only for the Vercel web records. Do not orange-cloud the Vercel apex or `www` records unless a separate reverse-proxy test plan is approved.

The Next app sets conservative response headers from `apps/web/next.config.ts`:

- `Content-Security-Policy-Report-Only`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy`
- `X-Frame-Options: DENY`

Keep CSP in report-only mode until production browser checks confirm Discord widgets, Spotify embeds, Supabase signed URLs, and Vercel observability scripts are all clean. After that, promote CSP to enforcement in a separate scoped PR.

The Next app currently uses an npm override for `postcss@8.5.15` to resolve GHSA-qx2v-qp2m-jg93 while the stable Next line still declares `postcss@8.4.31`. Remove the override in a later dependency PR after stable Next ships a patched PostCSS dependency and `npm audit --audit-level=moderate` remains clean without it.

## Supabase Preview Migration History

Supabase Preview checks compare the linked production migration history with local files under `supabase/migrations/`. Keep remote-applied migration versions represented locally even when a migration is later renamed for clarity.

The Instagram publishing schema is maintained in `supabase/migrations/20260607125027_add_instagram_gallery_publishing.sql`. The no-op compatibility file `supabase/migrations/20260607094500_restore_instagram_gallery_publishing_history.sql` intentionally preserves the earlier remote-applied version.

The manual Instagram sharing status schema is maintained in `supabase/migrations/20260608173000_add_manual_instagram_share_status.sql`. The no-op compatibility file `supabase/migrations/20260608093407_restore_manual_instagram_share_history.sql` intentionally preserves the earlier remote-applied version.

These compatibility files keep future Supabase Preview checks from failing with `Remote migration versions not found in local migrations directory`.

## Validation

Local and CI validation use Node.js 22 with npm. On Windows, `node`, `npm`, `npx`, and `corepack` should resolve from the real Node install, typically `C:\Program Files\nodejs`, before WindowsApps/Codex app package paths. If the WindowsApps `node.exe` stub returns `Access is denied`, repair PATH/tooling before trusting local validation.

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

Post-deploy observability smoke:

```js
[
  ...document.querySelectorAll("script[data-sdkn='@vercel/analytics/next'], script[data-sdkn='@vercel/speed-insights/next']"),
].map((script) => ({ package: script.dataset.sdkn, version: script.dataset.sdkv, src: script.src }));
```

Run this in an inspected production browser page after hydration. It verifies that the deployed Next app loads the Vercel Web Analytics and Speed Insights scripts. Vercel may serve those scripts from project-specific unique paths instead of plain `/_vercel/...` URLs. Confirm dashboard events inside Vercel after production receives visits.

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
