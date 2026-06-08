# Vercel Observability Verification - 2026-06-08

## Summary

This report records the Vercel Web Analytics and Speed Insights wiring pass for the live Next.js app at `https://mochirii.com`.

Final release status: live on Vercel production.

## Starting Evidence

- Repository branch before work: `main`.
- Live production host: `https://mochirii.com`.
- Live production response: Vercel served the site, but the homepage HTML did not include Vercel observability script markers.
- Vercel fallback script endpoints were reachable:
  - `https://mochirii.com/_vercel/insights/script.js`
  - `https://mochirii.com/_vercel/speed-insights/script.js`
- `apps/web/package.json` did not include `@vercel/analytics` or `@vercel/speed-insights`.
- `apps/web/app/layout.tsx` did not render the Vercel observability components.

## Changes In This Packet

- Added `@vercel/analytics` and `@vercel/speed-insights` to the Next app dependencies.
- Rendered `<Analytics />` and `<SpeedInsights />` from the root App Router layout.
- Updated the Next app README and deployment source-of-truth docs with observability verification notes.
- No secrets, environment values, DNS, Supabase, Discord, copy, image, route, or product behavior changed.

## Vercel Dashboard Evidence

- `https://vercel.com/mochirii/mochirii/analytics` loads the Analytics dashboard for the canonical `mochirii/mochirii` project with visitor and page-view panels.
- `https://vercel.com/mochirii/mochirii/speed-insights` loads the Speed Insights dashboard for the canonical `mochirii/mochirii` project with Real Experience Score and Core Web Vitals panels.

## Validation

- `git diff --check`: passed.
- `npm run check`: blocked locally only by missing Deno for Supabase Edge Function type validation. All other included checks passed after generated `.next` output was cleaned.
- `npm run check:production`: passed.
- `cd apps/web && npm run lint`: passed with the bundled Node/npm fallback.
- `cd apps/web && npm run build`: passed with the bundled Node/npm fallback.
- Built Next output contains the Vercel Analytics and Speed Insights client integrations.
- Local production server at `http://127.0.0.1:3011/` was opened in Chrome; after hydration, the DOM contained:
  - `http://127.0.0.1:3011/_vercel/insights/script.js`
  - `http://127.0.0.1:3011/_vercel/speed-insights/script.js`
- Vercel preview `https://mochirii-git-codex-vercel-analytics-speed-insights-mochirii.vercel.app/` was opened in Chrome; after hydration, the DOM contained:
  - `script[data-sdkn="@vercel/analytics/next"][data-sdkv="2.0.1"]`
  - `script[data-sdkn="@vercel/speed-insights/next"][data-sdkv="2.0.0"]`
- Vercel preview served those scripts from project-specific unique paths, which is expected for Vercel Web Analytics routes.

## Production Verification

- PR: `https://github.com/Mochirii-Wushu/Mochirii/pull/205`.
- Production commit: `c860ae27a761bd93946f96695f87b9b3f1a99293`.
- Vercel production deployment: `https://vercel.com/mochirii/mochirii/94pwRir1v5sMDGeb8e2PzKsJHxBT`.
- Vercel production status: Ready.
- Live Chrome verification confirmed both scripts after hydration on:
  - `https://mochirii.com/`
  - `https://mochirii.com/join`
  - `https://mochirii.com/gallery`
  - `https://mochirii.com/auth`
  - `https://mochirii.com/leader-dashboard`
- Live script package markers:
  - `script[data-sdkn="@vercel/analytics/next"][data-sdkv="2.0.1"]`
  - `script[data-sdkn="@vercel/speed-insights/next"][data-sdkv="2.0.0"]`
- Header smoke:
  - `https://mochirii.com/`: `200 OK`, `Server: Vercel`, `X-Vercel-Cache: HIT`.
  - `https://www.mochirii.com/`: `308 Permanent Redirect` to `https://mochirii.com/`, then `200 OK`.
  - `/join`, `/gallery`, `/auth`, and `/leader-dashboard`: `200 OK`, `Server: Vercel`.
- Vercel Analytics dashboard after production visits showed:
  - `1` visitor.
  - `5` page views.
  - Route entries for `/`, `/join`, `/gallery`, `/auth`, and `/leader-dashboard`.
- Vercel Speed Insights dashboard is enabled and shows Real Experience Score/Core Web Vitals panels. It did not yet have enough real-user metric data for a score at the time of this report.

## Remaining Notes

- Analytics and Speed Insights dashboard data can lag by a few minutes and may require real browser visits.
- The package install reported two moderate npm audit findings. They were not force-fixed in this packet because that would broaden the dependency change beyond Vercel observability.
- This workstation does not currently have Deno installed, so Supabase Edge Function type validation remains a local tool gap. CI remains the canonical check for that validator.
