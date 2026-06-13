# Current Live State

Last checked for this index: 2026-06-10.

This is the short source-of-truth index for the current Mochirii production posture. Older files under `reports/` may describe historical report-only states, blocked dashboard steps, or pre-release checks; use this index and the linked active docs first.

## Production Surface

- Canonical site: `https://mochirii.com`.
- Runtime: Vercel-hosted Next.js app in `apps/web`.
- Production branch: `main`.
- Vercel fallback/debug URL: `https://mochirii.vercel.app`.
- `https://www.mochirii.com` redirects to the apex domain.
- Root static files and GitHub Pages remain rollback/reference material until a later stabilization task retires them.
- Deployment source of truth: `docs/deployment.md`.

## Data And Assets

- Root `data/` and `assets/` remain the editable source while the static rollback surface is retained.
- The Next app reads mirrored copies in `apps/web/public/data/` and `apps/web/public/assets/`.
- Sync and verify with `npm run sync:next-public` and `npm run check:next-public-sync`.
- Verify the retained root static rollback/reference surface with `npm run check:rollback-surface-drift`; use `-- --write` when refreshing the no-secret report.
- The large `assets/audio/mochiriiiiii.mp3` warning is intentional and non-blocking unless the user separately approves audio optimization.

## Security And Headers

- Production CSP is enforced through `Content-Security-Policy` in `apps/web/next.config.ts`.
- Security headers include narrowed `Access-Control-Allow-Origin`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, and `X-Frame-Options: DENY`.
- CSP was promoted after a clean browser pass recorded in `reports/csp-enforcement-verification-2026-06-08.md`.
- Cloudflare remains DNS-only for Vercel web records; Vercel is the active edge/security layer.
- The public RFC 9116 security contact file is served from `https://mochirii.com/.well-known/security.txt` after the security scan remediation release.

## Supabase

- Supabase remains the authority for Auth, Postgres, RLS, Storage, Edge Functions, signed media URLs, Discord verification, gallery moderation, member profiles, Instagram queue/manual share state, and vote reminder state.
- Browser code uses only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL`.
- Privileged keys and tokens stay in Supabase Edge Function secrets or Vault only.
- Current Supabase guidance and local guardrails are in `supabase/README.md` and `docs/member-profiles-and-rank-roles.md`.

## Discord And Reaper

- Supabase Edge Function `reaper-discord-interactions` handles Discord slash commands, buttons, gallery ingest, rank/event sync, and vote reminder interactions.
- The separate Reaper Gateway worker handles only Discord member-join welcome DMs when a persistent host is running.
- Discord event schedule source is `data/guild-schedule.json`; mirrored Next data must stay in sync.
- Read-only source parity is guarded by `npm run check:discord-reaper-parity`.
- Event sync is preview-first. `/sync-events mode:apply confirm:true` remains an owner-approved provider mutation.

## GitHub And Release Flow

- `main` is protected by required checks including static validation, Next validation, CodeQL, Vercel, and Supabase Preview.
- Use one scoped branch per task and one PR per release packet.
- Do not edit `main` directly.
- Keep provider dashboard mutations separate from ordinary docs/content/theme work unless a packet explicitly calls for them.

## Vercel Observability

- Vercel Web Analytics and Speed Insights are wired from the root layout with `@vercel/analytics/next` and `@vercel/speed-insights/next`.
- Dashboard data can lag after deployment and needs real production visits.
- Use `apps/web/README.md` for the browser script inspection snippet.
- Metadata, noindex, sitemap, observability wiring, and production smoke coverage are guarded by `npm run check:observability-metadata-smoke`.

## Current Improvement Queue

- Continue CSP tightening only after browser passes; React inline style props are guarded at zero by `npm run check:csp-inline-hardening`, while `unsafe-inline` removal remains a future Vercel Preview nonce/SRI decision.
- Keep Cloudflare Security Insights findings reconciled against current DNS/Vercel evidence before changing healthy DNS records.
- Gallery image loading now uses a bounded render window on `/gallery`; see `reports/gallery-image-performance-2026-06-10.md`.
- Production-safe member workflow QA coverage is guarded by `npm run check:member-workflow-qa` and documented in `docs/member-workflow-production-qa-runbook.md`.
- WCAG-oriented route/workflow coverage is guarded by `npm run check:accessibility-route-matrix`; use its report before visual or member-flow polish.
- Keep Discord live provider readback optional and local-token gated; never require bot tokens in CI.
- Keep Vercel observability dashboard data as manual/read-only evidence; enough real production visits are required before dashboard graphs settle.
- Keep dependency updates targeted; defer preview or major-version tooling changes to compatibility branches.
