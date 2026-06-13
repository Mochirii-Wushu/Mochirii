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

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy`
- `X-Frame-Options: DENY`

The public RFC 9116 security contact file is tracked at `.well-known/security.txt` and mirrored into `apps/web/public/.well-known/security.txt` for Vercel. Keep both copies identical until the retained static rollback surface is retired.

CSP was promoted from report-only to enforcement after a production Chrome pass found no report-only violations across Home, Join, Gallery, Auth, Account, Gallery Submit, Leader Dashboard, Spotify, Members, and member profile routes. Any future third-party script, embed, image host, or API origin needs a scoped CSP review before launch.

The Next app currently uses an npm override for `postcss@8.5.15` to resolve GHSA-qx2v-qp2m-jg93 while the stable Next line still declares `postcss@8.4.31`. Remove the override in a later dependency PR after stable Next ships a patched PostCSS dependency and `npm audit --audit-level=moderate` remains clean without it.

Before reducing `script-src 'unsafe-inline'` or `style-src 'unsafe-inline'`, update the CSP inline-hardening inventory. The app source should stay at zero React inline style props; any remaining style allowance decision must be based on a browser pass because Next image/runtime helpers can still emit framework-managed style attributes:

```sh
npm run check:csp-inline-hardening -- --write
```

For a release packet that needs production header evidence, opt into the read-only live sweep:

```sh
npm run check:csp-inline-hardening -- --live --write
```

Do not remove either inline allowance until the inventory and a Vercel Preview browser pass cover Discord handoff surfaces, Spotify embeds, Supabase auth/storage, Vercel Analytics/Speed Insights, and the Mochi Social iframe bridge. For `script-src`, choose a Next-compatible nonce or SRI path before enforcement.

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

For a no-secret full-stack release evidence summary, run the local/static pass:

```sh
npm run check:full-stack-release-evidence
```

When authenticated CLIs are available and a release packet needs provider evidence, opt in to read-only provider checks and report writing:

```sh
npm run check:full-stack-release-evidence -- --providers --write
```

This command may summarize Vercel deployment/env names and Supabase migration/function status, but it must not record raw secret values, secret digests, tokens, cookies, webhook URLs, or private message content.

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

This verifies clean Vercel routes, legacy `.html` redirects, signed-out member/admin route content, Vercel headers on the apex, and the `www` redirect. Static route metadata, noindex boundaries, sitemap membership, observability wiring, and smoke-route coverage are guarded locally by `npm run check:observability-metadata-smoke`.

Accessibility review starts with the no-secret route matrix:

```sh
npm run check:accessibility-route-matrix -- --write
```

Use the generated report to scope browser or Playwright evidence for keyboard order, visible focus, reduced motion, status messages, form errors, iframe titles, color contrast, and member/admin workflows. Static checks do not prove contrast or screen-reader behavior by themselves.

Periodic Lighthouse/Core Web Vitals evidence is optional and manual, not a required score gate. Keep its route coverage aligned with the live app using:

```sh
npm run check:lighthouse-route-matrix -- --write
```

When production evidence is needed, run the GitHub Actions workflow **Manual Lighthouse audit**. It uploads raw Lighthouse HTML/JSON artifacts for the route matrix, including public, signed-out member, moderator-gated, and Mochi Social doorway routes. Do not commit those generated artifacts.

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
