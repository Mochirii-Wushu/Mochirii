# Current Live State

Last checked for this index: 2026-07-12.

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
- Resolve the current website release with `git fetch --prune origin` followed by
  `git rev-parse origin/main`; use `gh pr list --state open` and the protected
  check results on that commit instead of copying an undated SHA into this
  index.
- Active website worktree on this workstation is
  `C:\Github Repo's\Mochirii Website\Website`. The older Documents and
  CodexWork paths are compatibility junctions into the canonical project root,
  not separate worktrees.
- Repository visibility readback on 2026-07-05 reports `Mochirii-Wushu/Mochirii` as public. Keep this public state unless the owner separately approves making the repo private again.
- Website closeout ledger for 2026-07-12: PR #433 documented the canonical
  credential boundary; PR #434 hardened GitHub Actions and Dependabot policy;
  PR #437 updated `@supabase/supabase-js` and Node types; PR #439 updated the
  Supabase CLI and Deno lock; PR #441 updated the Vercel CLI with a compatible
  nested Undici override; and PR #442 updated Playwright, ESLint 9, and the Deno
  lock. Each packet passed fresh `validate`, `validate-next`, Vercel, and its
  applicable Supabase Preview result before squash merge.
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
- Supabase migration and function-list readback was refreshed on 2026-07-05 for project `deyvmtncimmcinldjyqe`; expected website, Reaper, Instagram, vote, spotlight, profile, Mochi Pets, and `sync-pixelfed-social-account` functions were active at that readback.
- The repository toolchain pins Supabase CLI `2.109.1`. Use the repo-local binary on Windows (`node_modules/.bin/supabase.cmd`) and run Supabase CLI calls serially to avoid telemetry-file `EPERM` races.
- Supabase hardening PR #315 documents intentional service-only RLS/no-policy tables, adds high-value foreign-key indexes, and defers Mochi Pets-specific advisor findings.
- Supabase linked advisor snapshot on 2026-07-12: security advisors returned 14 findings (`13` service-only `rls_enabled_no_policy` info findings plus `1` leaked-password protection warning). The focused migration `20260712164503_service_only_default_deny_policies.sql` is the protected-preview remediation for the 13 service-only tables; production remains unchanged until that PR is approved and deployed. Leaked-password protection is intentionally cost-deferred while the project remains on Free. Performance `unused_index` findings remain observation-only. See `docs/supabase-advisor-remediation-plan.md`.
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
- Source control: Pixelfed staging source is tracked in the private Mochirii ops repo at `C:\Github Repo's\Mochirii Website\Mochirii Social`; do not commit host `.env`, DB/Redis state, media, backups, cache files, or host-private notes.
- Pixelfed ops release ledger for 2026-07-12: PR #37 documented the canonical credential boundary and merged to `main`; resolve the current remote commit with `git fetch --prune origin` and `git rev-parse origin/main` from the canonical ops worktree.
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
- Release workflows use reviewed full-SHA action references, read-only minimum
  permissions, checkout with credential persistence disabled, Node `22.23.1`,
  and Deno `2.9.2`. Repository-level `sha_pinning_required` remains a separate
  approval-gated setting; do not change it as part of ordinary release work.
- Keep provider dashboard mutations separate from ordinary docs/content/theme work unless a packet explicitly calls for them.
- Current public-repo release posture: `Mochirii-Wushu/Mochirii` is public. Do not change repository visibility without explicit approval. Stale Vercel failures that point at the old private-organization plan limitation must be rerun or refreshed before merge decisions; do not treat them as current evidence after the public visibility change.
- ESLint 10 and TypeScript 7 remain intentionally deferred in issue #443.
  ESLint 10 failed the React lint rule context used by `eslint-config-next`;
  TypeScript 7 failed the TypeScript-ESTree integration and its hosted Vercel
  Preview. Reopen only after compatible Next/tooling releases and green local,
  GitHub, Supabase Preview, and Vercel gates.

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
- Latest read-only Speed Insights evidence is recorded in `docs/speed-insights-evidence.md`. Current field data is broadly healthy; the Singapore country segment remains watch-only until repeated p75 LCP/INP/CLS evidence identifies an actionable route/device issue.
- Metadata, noindex, sitemap, social preview image reachability, observability wiring, and production smoke coverage are guarded by `npm run check:observability-metadata-smoke`. Use `MOCHIRII_OBSERVABILITY_LIVE=1` for the read-only live pass.

## Current Improvement Queue

1. Refresh production performance evidence after the release queue settles:
   three-run mobile Lighthouse medians, current Vercel Speed Insights, route
   bundle analysis, CSS delivery, hydration, and Core Web Vitals. Do not change
   performance code without repeated route/device evidence.
2. Audit retirement of the duplicated root GitHub Pages rollback surface.
   Preserve rollback evidence and require separate approval before deleting
   files or changing the Pages provider setting.
3. Run a preview-only strict-CSP feasibility packet. Reject nonce-based CSP if
   forced dynamic rendering and lost static/CDN caching outweigh the benefit;
   keep experimental SRI evaluation-only.
4. Keep unused Supabase indexes observation-only. Keep ESLint 10 and TypeScript
   7 deferred under issue #443 until their compatibility gates pass.
5. Continue to use `npm run check:member-workflow-qa`,
   `npm run check:accessibility-route-matrix`, and optional local-token Discord
   parity reads as evidence boundaries. Never require provider secrets in CI.
