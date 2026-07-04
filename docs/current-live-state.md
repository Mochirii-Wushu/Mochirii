# Current Live State

Last checked for this index: 2026-07-04.

This is the short source-of-truth index for the current Mochirii production posture. Older files under `reports/` may describe historical report-only states, blocked dashboard steps, or pre-release checks; use this index and the linked active docs first.

## Production Surface

- Canonical site: `https://mochirii.com`.
- Runtime: Vercel-hosted Next.js app in `apps/web`.
- Production branch: `main`.
- Vercel fallback/debug URL: `https://mochirii.vercel.app`.
- `https://www.mochirii.com` redirects to the apex domain.
- Root static files and GitHub Pages remain rollback/reference material until a later stabilization task retires them.
- Read-only GitHub Pages API on 2026-07-02 reported legacy root deployment for `mochirii.com` with status `errored`; the latest deploy built successfully but timed out in `deployment_queued`. Vercel production remained healthy, so treat this as a rollback-surface/settings cleanup item, not a live-site outage.
- Deployment source of truth: `docs/deployment.md`.
- Current production commit verified from `origin/main`: `1f6b5c11b2423f03c8dc243815365d899001b4f2` (`Rebrand public guild culture page to Tome (#357)`).
- Production `/tome` is the canonical Tome route after the route refresh; `/codex` and `codex.html` are not retained as redirects.
- Navigation posture: `mochirii.com` is the public website information surface. Header `Social` lives in the regular Guild dropdown and footer `Social` goes directly to `https://social.mochirii.com`. The website `/social` route remains noindex, redirects signed-in members to the social host, and keeps signed-out login/help copy.
- Latest full route smoke before the unified release ledger was recorded on 2026-06-18. Run a fresh route matrix after each merged release packet.

## Data And Assets

- Root `data/` and `assets/` remain the editable source while the static rollback surface is retained.
- The Next app reads mirrored copies in `apps/web/public/data/` and `apps/web/public/assets/`.
- Sync and verify with `npm run sync:next-public` and `npm run check:next-public-sync`.
- The large `assets/audio/mochiriiiiii.mp3` warning is intentional and non-blocking unless the user separately approves audio optimization.

## Security And Headers

- Production CSP is enforced through `Content-Security-Policy` in `apps/web/next.config.ts`.
- Security headers include narrowed `Access-Control-Allow-Origin`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, and `X-Frame-Options: DENY`.
- CSP was promoted after a clean browser pass recorded in `reports/csp-enforcement-verification-2026-06-08.md`.
- Cloudflare remains DNS-only for Vercel web records; Vercel is the active edge/security layer.
- The public RFC 9116 security contact file is served from `https://mochirii.com/.well-known/security.txt` after the security scan remediation release.
- Live header check on 2026-06-18 confirmed `Server: Vercel`, enforced CSP, `Access-Control-Allow-Origin: https://mochirii.com`, `Strict-Transport-Security`, and the expected security headers.

## Supabase

- Supabase remains the authority for Auth, Postgres, RLS, Storage, Edge Functions, signed media URLs, Discord verification, gallery moderation, shared member identity data, Mochirii Social account mapping, Instagram queue/manual share state, and vote reminder state.
- Browser code uses only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL`.
- Privileged keys and tokens stay in Supabase Edge Function secrets or Vault only.
- Current Supabase guidance and local guardrails are in `supabase/README.md` and `docs/member-profiles-and-rank-roles.md`.
- Supabase function list was verified on 2026-06-17 for project `deyvmtncimmcinldjyqe`; expected website, Reaper, Instagram, vote, spotlight, profile, and Mochi Social alpha functions are active.
- Supabase CLI function-list readback timed out during the 2026-06-19 unified release ledger pass. Treat this as a read-only CLI evidence blocker, not a product failure; use Supabase Dashboard readback or retry once later before any Supabase deploy.
- Supabase CLI was updated to `2.107.0` for the Supabase hardening packet.
- Supabase hardening PR #315 documents intentional service-only RLS/no-policy tables, adds high-value foreign-key indexes, and defers Mochi Social-specific advisor findings.
- Supabase advisor snapshot still includes leaked-password protection as a provider configuration follow-up, intentional service-only RLS/no-policy findings documented in `supabase/README.md`, informational unused-index findings, and deferred Mochi Social RLS/index performance warnings.

## Mochirii Social / Pixelfed

- Staging target: `https://social.mochirii.com`.
- Hosting boundary: DigitalOcean staging runtime outside Vercel; Vercel remains the website host only.
- Identity boundary: Supabase OAuth Server and `/oauth/consent` remain the website consent doorway; Discord remains guild verification, not the social identity authority.
- Website boundary: header dropdown/footer Social is the direct guild social handoff to `https://social.mochirii.com`; `/social` is only a noindex handoff route that redirects signed-in members and gives signed-out visitors login/help options.
- Launch posture: admin-first testing, closed registration, SSO-only, federation disabled, public discovery minimized.
- Source control: Pixelfed staging source is tracked in the private Mochirii ops repo; do not commit host `.env`, DB/Redis state, media, backups, cache files, or host-private notes.
- Account sync gate: first-admin login is not complete until the Pixelfed OIDC callback writes one active `social_accounts` row through the trusted Supabase sync bridge.
- Media gap: broad member upload testing waits for DigitalOcean Spaces as the primary media store, least-privilege host-only keys, exact-origin CORS, backup/restore notes, and moderation gates.
- Federation gap: ActivityPub federation remains disabled/internal-only until a separate fediverse hub activation packet passes moderation, privacy, blocklist, remote-delivery, and rollback tests.
- Runbooks: `docs/pixelfed-guild-social-adr.md`, `docs/pixelfed-oidc-spike.md`, `docs/pixelfed-first-login-testing.md`, and `docs/pixelfed-staging-ops.md`.

## Discord And Reaper

- Supabase Edge Function `reaper-discord-interactions` handles Discord slash commands, buttons, gallery ingest, rank/event sync, native ModMail audit, and vote reminder interactions.
- The separate Reaper Gateway worker handles only Discord member-join welcome DMs when a persistent host is running.
- Discord event schedule source is `data/guild-schedule.json`; mirrored Next data must stay in sync.
- Read-only source parity is guarded by `npm run check:discord-reaper-parity`.
- Event sync is preview-first. `/sync-events mode:apply confirm:true` remains an owner-approved provider mutation.

## GitHub And Release Flow

- `main` is protected by required checks including static validation, Next validation, CodeQL, Vercel, and Supabase Preview.
- The active `Primary Rules` ruleset requires `validate`, `validate-next`, `CodeQL`, `Vercel`, and `Supabase Preview`.
- The active `Pull Request Review Gate` ruleset requires one approval and resolved review threads.
- Use one scoped branch per task and one PR per release packet.
- Do not edit `main` directly.
- Keep provider dashboard mutations separate from ordinary docs/content/theme work unless a packet explicitly calls for them.
- Open PR queue on 2026-06-19 contains 26 Mochirii PRs, most behind current `main`; do not merge them as a batch. Treat each as a separate refresh, close, or release decision using `reports/unified-release-ledger-2026-06-19.md`.

## Shopify Storefront

- Shopify theme work lives in the nested repository `C:\Users\xtyty\Documents\Shopify Store\Velesari-Holdings`.
- The deployable Shopify base branch is `shopify-theme`, not the outer launch-ops folder.
- Active Shopify release packet: `Anthyphera/Velesari-Holdings` PR #44, `codex/product-label-artwork-system` into `shopify-theme`, currently draft and clean as of the 2026-06-19 ledger pass.
- Shopify storefront must remain password-gated until a separate launch approval.
- Product/source work must preserve Selfnamed source data, the 2.2x markup rule, lightweight placeholder imagery, and the existing launch guardrails documented in the Shopify theme repo.

## Vercel Observability

- Vercel Web Analytics and Speed Insights are wired from the root layout with `@vercel/analytics/next` and `@vercel/speed-insights/next`.
- Dashboard data can lag after deployment and needs real production visits.
- Use `apps/web/README.md` for the browser script inspection snippet.
- Metadata, noindex, sitemap, social preview image reachability, observability wiring, and production smoke coverage are guarded by `npm run check:observability-metadata-smoke`. Use `MOCHIRII_OBSERVABILITY_LIVE=1` for the read-only live pass.

## Current Improvement Queue

- Packet 1 evidence for the six-packet polish/security/performance roadmap is recorded in `reports/release-hygiene-live-state-2026-06-17.md`.
- Current broad roadmap order: release hygiene, first-viewport visual polish, gallery/media performance, Supabase security/database performance, headers/metadata/observability, then Discord/Reaper/member-admin/dependency maintenance.
- Continue CSP tightening only after browser passes; React inline style props are guarded at zero by `npm run check:csp-inline-hardening`, while `unsafe-inline` removal remains a future Vercel Preview nonce/SRI decision. Next.js nonce-based CSP should be treated as a separate compatibility PR because nonce middleware makes pages dynamically rendered instead of static/prerendered.
- Keep Cloudflare Security Insights findings reconciled against current DNS/Vercel evidence before changing healthy DNS records.
- Gallery image loading now uses a bounded render window on `/gallery`; see `reports/gallery-image-performance-2026-06-10.md`.
- Production-safe member workflow QA coverage is guarded by `npm run check:member-workflow-qa` and documented in `docs/member-workflow-production-qa-runbook.md`.
- WCAG-oriented route/workflow coverage is guarded by `npm run check:accessibility-route-matrix`; use its report before visual or member-flow polish.
- Keep Discord live provider readback optional and local-token gated; never require bot tokens in CI.
- Keep Vercel observability dashboard data as manual/read-only evidence; enough real production visits are required before dashboard graphs settle.
- Keep dependency updates targeted; defer preview or major-version tooling changes to compatibility branches.
