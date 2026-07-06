# Current Live State

Last checked for this index: 2026-07-05.

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
- Current `origin/main` commit verified locally on 2026-07-05: `fcd5f2c9e1b24ba11118c7307bfe93d8ad72a741` (`Refresh post-avatar readiness ledger (#384)`).
- Active website worktree on this workstation is `C:\Users\xtyty\CodexWork\Mochirii\repo`. The older `C:\Users\xtyty\Documents\Mochirii Website` shell is historical/non-worktree state and should not be used for active website edits unless a separate workspace-hygiene task explicitly restores or removes it.
- Repository visibility readback on 2026-07-05 reports `Mochirii-Wushu/Mochirii` as public. Keep this public state unless the owner separately approves making the repo private again.
- Current website closeout on 2026-07-05: PR #381 refreshed route-matrix readiness evidence, and Dependabot PRs #376, #378, #379, and #380 merged after fresh `validate`, `validate-next`, and Vercel checks. PRs #373, #375, #377, and #374 were closed/deferred because their refreshed checks exposed Deno lock drift or ESLint 10 compatibility risk.
- Local production smoke blocker cleared on 2026-07-05: `npm run check:production` now passes from this workstation, and `curl.exe -I` returns 200 for `https://mochirii.com`, `https://social.mochirii.com`, and `https://mochirii.vercel.app`. PowerShell `Invoke-WebRequest -Method Head` still reports a local object-reference error, but the repo production smoke and curl path are green; do not mutate DNS, Cloudflare, or Vercel from the older reset evidence.
- Production `/tome` is the canonical Tome route after the route refresh; `/codex` and `codex.html` are not retained as redirects.
- Navigation posture: `mochirii.com` is the public website information surface. Header `Social` lives in the regular Guild dropdown and footer `Social` goes directly to `https://social.mochirii.com`. The website `/social` route remains noindex, redirects signed-in members to the social host, and keeps signed-out login/help copy.
- Latest browser route matrix was refreshed on 2026-07-05 against `https://mochirii.vercel.app` across common mobile and desktop viewports; it is valid fallback-host evidence while local production-domain TLS resets remain unresolved. Run a fresh canonical-domain route matrix after the workstation TLS blocker is fixed.

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
- Supabase migration and function-list readback was refreshed on 2026-07-05 for project `deyvmtncimmcinldjyqe` with CLI `2.108.0`; expected website, Reaper, Instagram, vote, spotlight, profile, Mochi Pets, and `sync-pixelfed-social-account` functions are active.
- Supabase CLI readback from the current toolchain reports `2.108.0`. Use the repo-local binary on Windows (`node_modules/.bin/supabase.cmd`) and run Supabase CLI calls serially to avoid telemetry-file `EPERM` races.
- Supabase hardening PR #315 documents intentional service-only RLS/no-policy tables, adds high-value foreign-key indexes, and defers Mochi Pets-specific advisor findings.
- Supabase linked advisor snapshot on 2026-07-05 with CLI `2.108.0`: security advisors returned 14 findings (`13` acknowledged service-only `rls_enabled_no_policy` info findings plus `1` leaked-password protection warning); performance advisors returned 48 info-level `unused_index` findings. No Supabase mutation or password reset was performed.
- Mochi Pets route/function/table rename completed through PR #371 and the approved cutover window. Current website route posture is `/games/mochi-pets` active/noindex and the former game route retired as a normal 404 with no redirect.

## Mochi Pets Runtime

- Runtime target: `https://mochi-pets-game.fly.dev`.
- Source recovery status on 2026-07-05: the standalone `xartaiusx/mochi-pets` repository is current on `main` at `0b3a023d8c252e6c67b7e469f932e9f533caea36`, after PR #14 finalized the Mochi Pets rename readiness and PRs #10, #11, #12, and #13 merged green low-risk dependency updates. PRs #7, #8, and #9 were closed/deferred for CI-platform, RPGJS compatibility, or Node-contract risk.
- Current local verification for the recovered runtime source: Node `24.17.0`; `npm run unity:verify` passed after Unity `6000.5.x` import/build preparation, and the repo keeps the active contract on Mochi Pets naming, `/games/mochi-pets`, `MOCHI_PETS_*` bridge events, and `mochi-pets-*` Supabase Edge Function names.
- Current blocker: Fly hosted runtime deployment and load/smoke beyond read-only health checks still require explicit approval. Do not treat the local Unity/WebGL proof as alpha playtest readiness until the hosted contract is intentionally promoted and verified.
- Current hosted readback from this workstation: `https://mochi-pets-game.fly.dev/healthz` returns 200. Do not change Fly secrets, scaling, deploys, or hosted smoke/load checks until the user approves the exact runtime action.
- Website contract gate remains: `MOCHI_PETS_GAME_CONTRACT_URL=https://mochi-pets-game.fly.dev MOCHI_PETS_SITE_ORIGIN=https://mochirii.com npm run check:mochi-pets-game-contract` must pass before first tester/game-runtime readiness is claimed.

## Mochirii Social / Pixelfed

- Staging target: `https://social.mochirii.com`.
- Hosting boundary: DigitalOcean staging runtime outside Vercel; Vercel remains the website host only.
- Identity boundary: Supabase OAuth Server and `/oauth/consent` remain the website consent doorway; Discord remains guild verification, not the social identity authority.
- Website boundary: header dropdown/footer Social is the direct guild social handoff to `https://social.mochirii.com`; `/social` is only a noindex handoff route that redirects signed-in members and gives signed-out visitors login/help options.
- Launch posture: admin-first testing, closed registration, SSO-only, federation disabled, public discovery minimized.
- Source control: Pixelfed staging source is tracked in the private Mochirii ops repo; do not commit host `.env`, DB/Redis state, media, backups, cache files, or host-private notes.
- Source-control evidence: Pixelfed ops `main` is current on 2026-07-05 at `414216d27488353fcfccfdda3f66d204d7538bd5` after PR #13 optimized Mochirii avatar uploads. Earlier ops PRs #7, #8, #9, #10, and #11 document readiness, Spaces cutover evidence, social media optimization policy, and public residue cleanup.
- Pixelfed ops repository evidence on 2026-07-05: `origin` points at the private Mochirii ops repo, `upstream` fetch points at `pixelfed/pixelfed`, and upstream push is disabled.
- Account sync gate completed for admin-first testing on 2026-07-05: the linked admin lands in the Mochirii Social app, Pixelfed has one local admin user, and Supabase `public.social_accounts` has exactly one active `provider = 'pixelfed'` row with `federation_enabled = false` and a profile URL under `https://social.mochirii.com`.
- Avatar upload gate completed for admin-first testing on 2026-07-05: the live profile image flow accepts JPEG/JPG/PNG/WebP avatars up to 100 MB, advertises Mochirii automatic optimization, generates 640px primary and 320px thumbnail derivatives, uses Spaces-backed URLs, and no longer shows the old 2 MB avatar limit. Owner browser validation confirmed a profile image upload succeeded after PR #13 deployed.
- Remaining media gap: DigitalOcean Spaces is configured as the primary S3-compatible media disk and a Laravel storage write/read/delete smoke passed on 2026-07-05. Broad member upload testing is still blocked until signed-in post-image upload validation proves downscale, thumbnail, EXIF/GPS stripping, oversized rejection, MIME/signature spoof rejection, delete cleanup, queue retry visibility, and local original/temp cleanup. The staged post upload policy remains large friendly uploads with hard caps, optimized derivatives, and no long-term original retention.
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
- Current public-repo release posture: `Mochirii-Wushu/Mochirii` is public. Do not change repository visibility without explicit approval. Stale Vercel failures that point at the old private-organization plan limitation must be rerun or refreshed before merge decisions; do not treat them as current evidence after the public visibility change.

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
