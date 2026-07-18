# DNS Post-Cutover Stabilization and Rollback Plan

> Historical cutover evidence. The root static source was retired on 2026-07-18
> and the current rollback procedure is `docs/operations/deployment.md`.

## Current Operating Status

As of `2026-06-07`, `https://mochirii.com` is already serving the Vercel/Next.js app from `apps/web`. `https://www.mochirii.com` redirects to the apex domain. Root static GitHub Pages files and the tracked `CNAME` remain rollback/reference material, not the current production surface.

This document is now a post-cutover stabilization and rollback runbook. Older sections that mention a future DNS cutover or GitHub Pages as current production are historical pre-cutover evidence unless a section explicitly says it is current.

Do not change DNS, Cloudflare, Vercel custom domains, Supabase, Discord, GitHub Pages, GitHub repository settings, or live data from this document alone. Provider and dashboard mutations require explicit owner approval, same-window evidence capture, and a rollback operator.

The current production/fallback split and Vercel dashboard checklist are tracked in [`deployment.md`](../deployment.md). Treat that file as the current source of truth and this file as historical evidence.

## Current State

- `https://mochirii.com` is the canonical production URL and serves the Vercel/Next.js app from `apps/web`.
- `https://www.mochirii.com` redirects to `https://mochirii.com/`.
- `https://mochirii.vercel.app` remains a fallback/debug hostname, not the primary production URL.
- Observed public DNS for the live web records: apex `A 76.76.21.21`; `www` `CNAME c4b58a30d23b9df3.vercel-dns-017.com`.
- Root GitHub Pages static site files and `CNAME` still exist and must remain available for rollback/reference until a later approved retirement task.
- Current `main` includes required GitHub checks `validate` and `validate-next`; both must pass before production-sensitive changes merge.
- The intended Vercel project/status context is `Vercel` for the `mochirii/mochirii` production project. Any duplicate `web` project/status context is a dashboard cleanup item and must not be used as production readiness evidence.
- Supabase-first architecture is preserved: Supabase remains authoritative for Auth, Postgres/RLS, Storage, Edge Functions, Discord verification, gallery moderation, signed preview URLs, and audit records.
- Vercel/Next owns routing, React UI, rendering, redirects, and browser-safe Supabase integration.

## Historical Evidence Boundary

Sections below this point include the original cutover-readiness packet, PR #181 snapshots, and pre-cutover provider observations. Keep them for rollback context and audit history, but re-verify every provider value before using it in an active incident or rollback window.

## Operator Workstation Prerequisites

Use a workstation that can run the same-window checks without exposing private values:

- Node.js/npm and Git for the repository validation scripts.
- Deno for `npm run check:supabase-edge-types`, which is included in `npm run check`.
- Python 3 or a supplied `SMOKE_BASE_URL` for local browser smokes that need a static server.
- Browser smoke support for Playwright-based checks.
- GitHub/Vercel CLI authentication for read-only PR preview and production readiness checks when those commands are part of the review window.

The Deno checker resolves `DENO_BIN`, then `~/.deno/bin/deno`, then `deno` on `PATH`. Confirm the binary with `deno --version` or by setting `DENO_BIN` to the installed binary path before the same-window run. Do not print or commit local credential values while preparing the workstation.

Before the same-window final readiness run, verify the workstation with:

```sh
npm run check:dns-cutover-workstation
```

This helper is read-only. It checks local command availability, Deno, Python or supplied `SMOKE_BASE_URL`, Playwright browser launch support, and GitHub/Vercel CLI authentication without printing account names, tokens, env values, or private packet values.

To prepare local draft packet files for the private operator handoff, use:

```sh
DNS_CUTOVER_PRIVATE_PACKET_DIR=/absolute/private/directory npm --silent run prepare:dns-cutover-private-packets
```

The preparation helper refuses repository-local output, creates only draft packet files, does not print absolute paths, and refuses to overwrite existing drafts unless `--force` is supplied. Use `npm --silent` or run the Node script directly when terminal transcript redaction matters, because plain `npm run ... -- --out=/path` can echo command arguments before the helper runs. Draft packet files are not evidence and do not authorize cutover.

To prepare the local live-member QA placeholder file for approved D02/D03 testing, use:

```sh
npm --silent run prepare:live-member-qa-local
```

This helper verifies `.env.live-member-qa` is ignored, refuses tracked state, writes safe labels with mutation disabled, and refuses to overwrite existing local QA values unless `--force` is supplied. It does not authorize live OAuth, upload, moderation, cleanup, or cutover.

To prepare a small repo-external disposable PNG for D03, use:

```sh
QA_TEST_IMAGE_PATH_LOCAL=/absolute/private/mochirii-qa-test.png npm --silent run prepare:live-member-qa-image
```

This helper refuses repository-local output, writes only a deterministic PNG, does not print the absolute path, and refuses overwrite unless `--force` is supplied. It does not update `.env.live-member-qa` or authorize upload/moderation by itself.

To prepare a private D03 cleanup-note draft before any upload, use:

```sh
LIVE_MEMBER_CLEANUP_NOTE_PATH=/absolute/private/live-member-cleanup-note.md npm --silent run prepare:live-member-cleanup-note
```

This helper refuses repository-local output, writes only a Markdown cleanup-note draft, does not print the absolute path, and refuses overwrite unless `--force` is supplied. The note is private operator working state for submission IDs, Storage paths, cleanup ownership, and status-only public summaries; it does not authorize upload, moderation, cleanup deferral, or cutover.

The cleanup-note template is tracked at [`docs/live-member-cleanup-note.md`](./live-member-cleanup-note.md) so operators can review the fields before generating a private copy. Completed cleanup notes must remain outside the repository unless every private value is removed.

Validate the completed private cleanup note without printing values:

```sh
npm --silent run check:live-member-cleanup-note -- --note=/absolute/private/live-member-cleanup-note.md
```

This helper validates the private completed note's required sections, completion state, cleanup status, and no-secret guardrails. It permits expected private D03 artifact identifiers such as submission IDs and Storage object paths because those belong only in the private note.

## Non-Goals

- Do not add, remove, or edit DNS records during a docs or stabilization pass.
- Do not add, remove, or edit Vercel custom domains during a docs or stabilization pass.
- Do not change Supabase dashboard settings during a docs or stabilization pass.
- Do not change Discord Developer Portal settings during a docs or stabilization pass.
- Do not change GitHub Pages settings during a docs or stabilization pass.
- Do not change Vercel dashboard settings during a docs or stabilization pass.
- Do not deploy manually from local CLI.
- Do not delete root GitHub Pages files or legacy auth/member workflow files.
- Do not optimize, replace, remove, or re-encode `assets/audio/mochiriiiiii.mp3`.

## Current Route Readiness

The Next/Vercel app currently implements these clean public routes:

- `/`
- `/join`
- `/ranks`
- `/leaders`
- `/tome`
- `/events`
- `/announcements`
- `/raffles`
- `/gallery`
- `/spotlight`
- `/spotify`
- `/recruitment`
- `/twills`

The Next/Vercel app currently implements these Phase 3 member workflow routes:

- `/auth`
- `/account`
- `/gallery-submit`
- `/leader-dashboard`

Legacy `.html` redirects are configured in `apps/web/next.config.ts`:

- `/index.html` -> `/`
- `/join.html` -> `/join`
- `/ranks.html` -> `/ranks`
- `/leaders.html` -> `/leaders`
- `/tome.html`
- `/events.html` -> `/events`
- `/announcements.html` -> `/announcements`
- `/raffles.html` -> `/raffles`
- `/gallery.html` -> `/gallery`
- `/spotlight.html` -> `/spotlight`
- `/spotify.html` -> `/spotify`
- `/recruitment.html` -> `/recruitment`
- `/twills.html` -> `/twills`
- `/auth.html` -> `/auth`
- `/account.html` -> `/account`
- `/gallery-submit.html` -> `/gallery-submit`
- `/leader-dashboard.html` -> `/leader-dashboard`

## Historical Production Verification Snapshot

Latest PR #181 readiness verification protocol, refreshed `2026-06-06` after the repository organization hardening merge:

- PR #181 remains a draft; do not convert it out of draft, merge it, or treat it as cutover approval without explicit user approval.
- For a single read-only check of the current PR head, run `npm run check:dns-cutover-pr-readiness`.
- For the current branch head and comparison, run `git rev-parse HEAD` and `git rev-list --left-right --count origin/main...HEAD`.
- For the current GitHub merge state and status rollup, run `gh pr view 181 --json mergeStateStatus,statusCheckRollup,headRefOid`.
- For the current Vercel PR preview deployment, run `npm run check:vercel-pr-preview`.
- After each pushed readiness-only commit, wait for GitHub `validate` and `validate-next` to pass before treating the PR head as merge-ready.
- Use `Vercel - mochirii` as the intended Vercel deployment signal. Ignore the known duplicate `Vercel - web` failure for PR readiness while separately cleaning up that dashboard connection before relying on Vercel commit status.
- Vercel Preview Comments may pass independently of deployment status; treat it as useful PR annotation evidence, not as production readiness by itself.
- Supabase Preview may remain skipped.
- Use the current workstation's Deno path or `DENO_BIN`; do not rely on older machine-specific paths from May snapshots.
- `npm run check:dns-cutover-final-readiness -- --skip-automated-checks` still fails closed because private D02/D03 and final approval packet paths are not supplied. This is expected until the approved-window private packet work is complete.

Current `main` baseline retained for the cutover window:

- Vercel production URL: `https://mochirii.vercel.app`
- Current main commit before refreshing this PR: `d841e377811acb4e4ef5a7f079e04bf630d4929b`.
- GitHub Actions `validate` and `validate-next` pass on current `main`.
- PR #181 remains a draft; use `npm run check:vercel-pr-preview` plus `gh pr view 181 --json mergeStateStatus,statusCheckRollup` for current PR preview and combined-state evidence.
- PR #184 Discord gallery ingest foundation has merged to `main`.
- PR #184 GitHub `validate`, Supabase Preview, GitHub build/deploy/report checks, and Vercel Preview Comments passed.
- The standalone Vercel commit status can remain pending while Vercel queues a preview deployment; do not treat that temporary pending state as cutover approval or as proof that production is unhealthy.
- PR #183 shared lightbox overlay and scroll-lock fix is included in production.
- PR #184 Supabase migrations and Edge Function deployments are live in the linked Supabase project.
- Homepage Screenshot Spotlight full-image lightbox no longer shifts the page left, overlays the footer/header, restores scroll/focus, and keeps the image centered and viewport-contained.
- Gallery full-image lightbox no longer shifts the page left, overlays the footer/header, restores scroll/focus, and keeps the image centered and viewport-contained.
- Homepage Screenshot Spotlight randomization remains working: four thumbnails render, hard refresh changes the selected set/order, selection stays stable in-session, and thumbnails open matching full images.
- Gallery sorting/random behavior remains working: newest starts `shot-73`, `shot-72`, `shot-71`; oldest starts `shot-01`, `shot-02`, `shot-03`; random changes after hard refresh and stays stable in-session.
- Historical snapshot: public routes, legacy redirects, and Phase 3 member workflow routes were ready on `https://mochirii.vercel.app`, which is now a fallback/debug hostname.
- Supabase Edge Function contract smoke passes, including fail-closed checks for `submit-discord-gallery-image` without the ingest secret.
- Deno-backed Edge Function type validation is now part of `npm run check`.
- `npm run check:vercel-pr-preview` is available as a read-only PR preview gate; it compares the current PR head against GitHub's Vercel status and Vercel's deployment list for the same commit.
- No empty image `src` warnings were observed on `/`, `/gallery`, or `/spotlight`.
- Historical pre-cutover state: DNS cutover was deferred at the time of this snapshot.

Warnings to keep in view:

- `assets/audio/mochiriiiiii.mp3` exceeds the local asset-size warning threshold by design; preserve it as-is unless a later approved task explicitly changes the audio policy.
- Hosted Vercel build logs may show an `outputFileTracingRoot` / `turbopack.root` warning. The current production deployment still builds successfully and is Ready.
- Vercel Development env is intentionally not a cutover gate. Production and Preview envs are the relevant deployed environments.

### Step 1 Baseline Lock

Latest implementation-plan baseline lock: `2026-05-24`.

Local repository state:

- Branch: `dns-cutover-readiness-and-rollback-plan`.
- PR: #181, open draft, base `main`, head `dns-cutover-readiness-and-rollback-plan`.
- Branch comparison at the post-PR-184 merge-refresh commit: `0` commits behind `main`, `29` commits ahead; later doc-only status commits can increase the ahead count.
- GitHub PR merge state observed at the post-PR-184 merge refresh: `UNSTABLE`, caused by the standalone Vercel commit status remaining pending while GitHub Actions `validate` and Vercel Preview Comments passed. Later PR-head status must be checked with the current readiness refresh above.
- Worktree remained clean after validation and generated Vercel output cleanup, before the later post-PR-184 documentation refreshes.

Validation commands completed:

- `npm run check` passed. Known warning only: `assets/audio/mochiriiiiii.mp3` is over the local asset-size warning threshold.
- `git diff --check` passed.
- Historical snapshot: `npm run check:production` passed against the then-current custom-domain GitHub Pages surface.
- `cd apps/web && npm run lint` passed after running `npm run clean` to remove generated `.vercel/output` from a previous local Vercel build.
- `cd apps/web && npm run build` passed and prerendered all current App Router routes.
- `CI=1 vercel build --prod --cwd apps/web` passed with `status: ok` and target `production`.
- `npm run smoke:vercel-production` passed against `https://mochirii.vercel.app`, including clean routes, legacy `.html` redirects, and signed-out Phase 3 route content checks.

Read-only provider and public-network checks completed:

- Vercel CLI account: `xartaiusx`.
- Vercel project read: `mochirii/web`.
- Vercel Production env names observed as encrypted values: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`.
- Vercel Preview env names observed as encrypted values: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`.
- Extra Vercel env name observed in both Production and Preview: `SUPABASE_PUBLISHABLE_KEY`. It is not a `NEXT_PUBLIC_` browser variable and should be reviewed later before cleanup, but it is not a current cutover blocker.
- Supabase CLI version observed locally: `2.101.0`.
- Public DNS still returns Cloudflare nameservers `igor.ns.cloudflare.com` and `naomi.ns.cloudflare.com`.
- Public apex and `www` A answers still return Cloudflare IPs `104.21.70.47` and `172.67.219.251`.
- `https://mochirii.com` still returns Cloudflare plus GitHub Pages/Fastly headers, so the custom domain has not cut over to Vercel.
- `https://www.mochirii.com` still redirects to `https://mochirii.com/`.
- `https://mochirii.vercel.app` still returns `server: Vercel` and serves the Vercel app.

No DNS, Cloudflare, Vercel dashboard, Supabase dashboard, Discord Developer Portal, GitHub Pages, Supabase database, Supabase Edge Function, or deployment mutation was performed during this baseline lock.

### Step 3 Operator Inventory Pass

Latest read-only operator inventory pass: `2026-05-24`.

This pass intentionally stopped at read-only CLI/API/public checks. It did not change DNS, Cloudflare, Vercel, Supabase, Discord, GitHub Pages, Supabase database state, Supabase Edge Functions, or deployment aliases.

Source alignment used for this pass:

- Vercel says external-DNS domains should be inspected in Vercel, then configured in the external DNS provider with the exact records Vercel shows.
- Vercel warns against placing Cloudflare as a reverse proxy in front of Vercel unless that exception is explicitly tested and accepted.
- Cloudflare proxy status explains why orange-clouded `A`, `AAAA`, and `CNAME` records expose Cloudflare anycast IPs publicly rather than origin records.
- Supabase Auth redirect docs recommend exact production redirect URLs, using broad wildcards mainly for local and preview URLs.
- Supabase Edge Function secret docs keep secret/service-role material server-only; browser code must not receive secret keys.

Read-only Vercel findings:

- `vercel domains ls` shows `mochirii.com` under team `mochirii`, with a third-party registrar and third-party nameservers.
- `vercel domains inspect mochirii.com` shows current nameservers `igor.ns.cloudflare.com` and `naomi.ns.cloudflare.com`, not Vercel nameservers, and reports the domain as not configured properly for Vercel yet.
- Vercel's public documentation says external-DNS cutovers should add the custom domain to the project, inspect the domain, then copy the exact records Vercel shows into the external DNS provider.
- Vercel's general-purpose external DNS pattern is an apex `A` record, commonly `76.76.21.21`, plus a subdomain `CNAME` to the Vercel-provided target. Use the dashboard-provided values from the production-serving `mochirii/mochirii` project during the cutover window, not older notes.
- `vercel project inspect mochirii` shows project `mochirii/mochirii`, Root Directory `apps/web`, Framework Next.js, Node.js `24.x`.
- `vercel project inspect web` shows project `mochirii/web`, Root Directory `.`, Framework Next.js, Node.js `24.x`.
- Root `.vercel/repo.json` maps Vercel project `mochirii` to directory `apps/web`.
- `vercel alias list` shows `mochirii.com`, `www.mochirii.com`, `mochirii.vercel.app`, `mochirii-mochirii.vercel.app`, and `mochirii-git-main-mochirii.vercel.app` aliasing the same production deployment source `mochirii-k3kmghcpi-mochirii.vercel.app`.
- `vercel inspect https://mochirii.vercel.app` confirms deployment `dpl_12d12HX9a9xpTRZXtbkbXraTm6Uj`, project/name `mochirii`, target `production`, status `Ready`.
- On a checkout without a global `vercel` binary, `npm exec -- vercel inspect https://mochirii.vercel.app` provides the same read-only production deployment confirmation.
- The PR #181 standalone Vercel status target is a dashboard URL, not an inspectable deployment URL; use `gh pr view 181 --json headRefOid,statusCheckRollup` and `gh api repos/Mochirii-Wushu/Mochirii/commits/<head-sha>/status` for current status evidence.
- `npm run check:vercel-pr-preview` fails closed if the current PR head's GitHub Vercel status is not `success` or if Vercel lists the matching preview deployment as anything other than `READY`.
- Root-level Vercel env read for `mochirii/mochirii` shows encrypted Production/Preview env names `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL`.
- Initial `apps/web` Vercel env read showed `mochirii/web`, encrypted Production env names `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, and extra `SUPABASE_PUBLISHABLE_KEY`.
- After `vercel pull --yes --environment=production --cwd .`, `apps/web` Vercel env reads resolve to `mochirii/mochirii`, and the production project settings report Root Directory `apps/web`.
- `CI=1 vercel build --prod --cwd .` passed after pulling project settings, using the production-serving `mochirii/mochirii` configuration and producing `status: ok`, target `production`.
- The successful local Vercel build still emitted the known Next.js `outputFileTracingRoot` / `turbopack.root` warning; this remains non-blocking while builds and production smoke checks pass.
- `vercel certs ls` reports no certificates found under team `mochirii` while custom-domain DNS is not yet configured for Vercel.

Historical Vercel manual reconciliation required before the cutover:

- Confirm in the Vercel dashboard that `mochirii/mochirii` is the intended project to own production custom domains.
- Confirm the production-serving project has Root Directory `apps/web`, Production Branch `main`, Framework Next.js, Node.js `24.x`, and the required Production/Preview env names.
- Treat stale or alternate local Vercel links, including the previously observed `mochirii/web` link, as non-authoritative until refreshed with `vercel pull`.
- Resolve any mismatch between prior dashboard-confirmed project-specific CNAME targets and the current Vercel Domains recommendation by using the current production-serving `mochirii/mochirii` dashboard values only.
- Use only the exact DNS instructions shown in the final production-serving project's Domains dashboard at the approved cutover window.

Read-only Supabase findings:

- Supabase project: `Mōchirīī`, ref `deyvmtncimmcinldjyqe`, region `us-west-2`, status `ACTIVE_HEALTHY`.
- Database engine: Postgres `17`, version `17.6.1.111`, release channel `ga`.
- Deployed Edge Functions are active:
  - `verify-discord-member`, `verify_jwt: true`, version `44`.
  - `list-gallery-review-queue`, `verify_jwt: true`, version `44`.
  - `moderate-gallery-submission`, `verify_jwt: true`, version `42`.
  - `list-approved-gallery-submissions`, `verify_jwt: false`, version `43`.
  - `submit-discord-gallery-image`, `verify_jwt: false`, version `2`.
- Supabase migration list shows `20260524114802_add_discord_gallery_submission_source.sql` and `20260524115932_revoke_public_rls_auto_enable_execute.sql` applied to the linked project.
- Linked Supabase advisors no longer report public `SECURITY DEFINER` execute warnings for `public.rls_auto_enable()`; the remaining linked warning is Auth leaked-password protection disabled.
- Supabase secret names are present for Discord integration and Supabase runtime access. Raw secret values must not be recorded in this repository, and secret/service-role material must stay in Edge Functions or other server-only runtimes.
- Supabase changelog scan surfaced current breaking-change items around Data API exposure and self-hosted/database topics; no cutover setting was changed.

Historical Supabase manual confirmation required before the cutover:

- Auth -> URL Configuration Site URL and Redirect URLs must be checked in the dashboard against the final custom-domain plan.
- Exact production redirect URLs should be present for the final production state; Vercel preview and localhost wildcards should stay available through the transition.
- Discord provider configuration must continue using the Supabase callback endpoint.
- Edge Function secrets should be verified in the dashboard by name and freshness only; do not copy values into docs, PRs, issues, or chat.

Read-only GitHub Pages findings:

- GitHub Pages API reports status `built`, custom domain `mochirii.com`, source branch `main`, source path `/`, public `true`, and HTTPS enforced `false`.
- GitHub Pages remains the current rollback surface; root static files and the tracked `CNAME` file must remain untouched until post-cutover stabilization is complete.

Cloudflare and Discord manual confirmation still required:

- Cloudflare remains the current public authoritative DNS provider from nameserver and header evidence, but the exact live dashboard record values must be re-captured before cutover.
- Confirm DNSSEC, SSL/TLS mode, proxied/DNS-only status, active rules, Managed Transforms, and any unpublished subdomains in the Cloudflare dashboard before changing web records.
- Confirm the Discord Developer Portal OAuth redirect remains the Supabase callback endpoint and not a Vercel or custom-domain URL.

### Step 4 Member Workflow Preflight Pass

Latest non-mutating member workflow preflight pass: `2026-05-24`.

This pass intentionally avoided real OAuth, real member upload, moderation mutations, dashboard settings, database writes, and DNS changes.

Commands completed:

- `npm run check:live-member-workflow-preflight` passed in normal mode.
- `npm run check:discord-gallery-ingest` passed.
- `npm run check:supabase-edge-types` passed with Deno.
- `npm run smoke:supabase-edge-functions` passed.
- `npm run smoke:supabase-auth-boundary` passed against a temporary local static server at `http://127.0.0.1:8765`.
- `npm run smoke:gallery-approved-feed` passed against a temporary local static server at `http://127.0.0.1:8765`.
- `npm run smoke:vercel-production` passed against `https://mochirii.vercel.app`.

Verified by this pass:

- `.env.live-member-qa` is ignored by Git.
- No live member QA credential files are tracked.
- `reports/live-member-qa-local-template.md` documents all required local QA variable names.
- `QA_ALLOW_LIVE_MUTATION=false` remains the committed template default.
- `.env.live-member-qa` is not present locally, so real live member workflow QA is not configured in this checkout.
- Protected Supabase Edge Functions reject missing, malformed, or publishable-key bearer credentials with fail-closed 401/403 behavior.
- Public `list-approved-gallery-submissions` still returns the expected public contract and does not expose private storage/audit fields in the smoke response.
- Public/secret-gated `submit-discord-gallery-image` is active but fails closed without the bot ingest secret, fails closed with the publishable key as bearer, and rejects invalid ingest headers in smoke checks.
- Deno type checks cover all Supabase Edge Function entrypoints and import maps.
- Signed-out root static auth/member pages do not make protected data, function, or storage calls in the mocked auth-boundary smoke.
- Approved-feed gallery UI renders the member-submissions count, signed image URL, empty/failure states, and fallback behavior in the mocked browser smoke.
- Vercel production still returns HTTP 200 for all clean public and Phase 3 routes, redirects legacy `.html` routes to clean routes, and renders signed-out Phase 3 content for `/auth`, `/account`, `/gallery-submit`, and `/leader-dashboard`.

Still manual before cutover:

- Real Discord OAuth must be tested with an approved test account.
- At least one verified active-member upload must be tested or explicitly deferred with a rollback owner.
- At least one moderator queue, approve/reject, audit, signed URL, and cleanup pass must be tested or explicitly deferred with a rollback owner.
- Any live-mutating QA must require explicit human approval and a local ignored `.env.live-member-qa` with `QA_ALLOW_LIVE_MUTATION=true`; the committed default remains false.
- Use the member workflow production QA runbook before running live-account checks: [`docs/member-workflow-production-qa-runbook.md`](./member-workflow-production-qa-runbook.md).

## Source-Aligned Operating Rules

These rules are based on the official provider references checked during the baseline pass:

- Vercel custom-domain setup should use the exact records Vercel shows for the project/domain and, with an external DNS provider such as Cloudflare, those records must be added in that external provider rather than through Vercel DNS. Source: <https://vercel.com/docs/domains/set-up-custom-domain>
- Vercel does not recommend placing Cloudflare or another reverse proxy in front of a Vercel project because it can reduce Vercel traffic visibility, security signal quality, performance, and cache reliability. Keep the planned Vercel target DNS-only unless the user explicitly approves a tested reverse-proxy exception. Source: <https://vercel.com/kb/guide/cloudflare-with-vercel>
- Cloudflare proxied `A`, `AAAA`, and `CNAME` records return Cloudflare anycast IPs publicly; this is why current public DNS answers do not reveal the GitHub Pages origin records while Cloudflare proxying remains active. Source: <https://developers.cloudflare.com/dns/proxy-status/>
- Cloudflare `MX` and `TXT` records are always DNS-only. Do not touch ProtonMail, DKIM, DMARC, SPF, or verification records during a website-hosting cutover. Source: <https://developers.cloudflare.com/dns/proxy-status/>
- Supabase Auth redirect URLs must match the `redirectTo` URLs used by the app. Use exact production custom-domain redirect paths for the final production state, and reserve wildcards for local and preview deployments. Source: <https://supabase.com/docs/guides/auth/redirect-urls>
- Supabase browser code may use publishable keys only with RLS and explicit grants. Secret keys, service-role keys, Discord bot tokens, and OAuth client secrets stay in Supabase Edge Functions or other server-only runtimes. Sources: <https://supabase.com/docs/guides/getting-started/api-keys>, <https://supabase.com/docs/guides/functions/secrets>
- New Supabase tables exposed through the Data API should keep explicit `GRANT` statements, RLS, and reviewed policies together in migrations because Supabase is moving away from automatic public-schema Data API exposure. Source: <https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically>

## Readiness Checklist

Before cutover approval, confirm:

- Vercel production at `https://mochirii.vercel.app` is Ready.
- Vercel production serves all clean public routes with HTTP 200.
- Vercel production redirects all legacy `.html` routes to clean routes.
- Homepage and gallery lightboxes remain fixed full-viewport overlays with no page-left shift and no footer/header overlap regression.
- Homepage Screenshot Spotlight randomization remains stable in-session and changes across hard refreshes.
- Gallery newest, oldest, and random sort behavior remains unchanged.
- `/auth` shows the configured sign-in method UI.
- `/account`, `/gallery-submit`, and `/leader-dashboard` show signed-out/access-check states without crashing.
- Discord OAuth works on Vercel production or a fresh Preview with the same public env values.
- `/auth` OAuth returns to `/account`.
- `/gallery-submit` blocks signed-out and unverified users.
- `/leader-dashboard` blocks signed-out and non-moderator users.
- At least one real active-member upload test is completed or explicitly deferred with a rollback owner.
- At least one moderator queue/approve/reject test is completed or explicitly deferred with a rollback owner.
- Supabase Auth redirect URLs include the future custom domains.
- Discord OAuth callback remains pointed at Supabase Auth.
- Vercel custom-domain readiness has been checked by an operator in the dashboard.
- Member workflow production QA has followed [`docs/member-workflow-production-qa-runbook.md`](./member-workflow-production-qa-runbook.md), or remaining live-mutating checks are explicitly deferred with a rollback owner.
- DNS inventory has been captured before any record changes.
- Rollback owner and rollback communication path are confirmed.

## Vercel Checklist

Do not change Vercel settings while using this document unless the user has explicitly approved the cutover window.

Manual Vercel Dashboard path:

- Production-serving project from read-only CLI evidence: `mochirii/mochirii`
- Previously observed stale/alternate local-linked project: `mochirii/web`
- Verify `mochirii/mochirii` owns production aliases and custom domains before cutover.
- Verify Root Directory is `apps/web` on the production-serving project.
- Verify Production Branch: `main`
- Verify Framework: Next.js
- Verify Node.js Version: `24.x`
- Verify Production env names are present:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `NEXT_PUBLIC_SITE_URL`
- Verify Preview env names are present:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `NEXT_PUBLIC_SITE_URL`

Domains to add later only after explicit cutover approval:

- `mochirii.com`
- `www.mochirii.com`, if desired

Current project/domain inventory note:

- `mochirii.com`, `www.mochirii.com`, and `mochirii.vercel.app` currently alias a Ready production deployment under project `mochirii/mochirii`.
- Root `.vercel/repo.json` maps project `mochirii` to `apps/web`.
- A stale/alternate app-level local link to `mochirii/web` was observed before `vercel pull`; do not use that stale local link as the source of truth for cutover.
- Treat project ownership as dashboard-confirmation-required, with current read-only evidence favoring `mochirii/mochirii`.

Expected Vercel custom-domain flow:

1. Add `mochirii.com` in Project -> Settings -> Domains.
2. Add `www.mochirii.com` if the guild wants the `www` hostname.
3. Copy the exact DNS records Vercel displays for each hostname.
4. Wait for Vercel domain verification.
5. Wait for HTTPS certificate provisioning.
6. Confirm Vercel marks each domain valid/ready.
7. Keep `https://mochirii.vercel.app` available as a fallback and debugging URL.

Do not hardcode new expected DNS records in this repository. Use the exact records Vercel shows in Project -> Settings -> Domains for the production-serving project, and re-check them during the approved cutover window.

## Supabase Checklist

Do not change Supabase settings while using this document unless the user has explicitly approved the cutover window.

Manual Supabase Dashboard path:

- Authentication -> URL Configuration

### Supabase Redirect Planning

Eventual Site URL after cutover:

- `https://mochirii.com`

Preview/local redirect URLs:

- `https://mochirii.vercel.app/**`
- `https://*-mochirii.vercel.app/**`
- `http://localhost:3000/**`

Broad custom-domain wildcards may be useful during transition:

- `https://mochirii.com/**`
- `https://www.mochirii.com/**`

Exact hardened final production redirect URLs after cutover:

- `https://mochirii.com/auth`
- `https://mochirii.com/account`
- `https://mochirii.com/gallery-submit`
- `https://mochirii.com/leader-dashboard`
- `https://www.mochirii.com/auth` if `www` serves app traffic.
- `https://www.mochirii.com/account` if `www` serves app traffic.

Keep Vercel and local URLs during the transition until rollback risk is gone. Broad production wildcards may be useful during transition, but exact production redirect URLs are the hardened final state.

Supabase behavior that must stay unchanged:

- Auth authority remains in Supabase.
- RLS remains central and must not be bypassed by browser code.
- Storage permissions remain in Supabase Storage policies.
- `verify-discord-member` remains a Supabase Edge Function.
- `list-gallery-review-queue` remains a Supabase Edge Function.
- `moderate-gallery-submission` remains a Supabase Edge Function.
- `list-approved-gallery-submissions` remains a Supabase Edge Function.
- Service-role and Discord bot secrets remain in Supabase Edge Functions or other server-only locations.

OAuth test after cutover:

1. Open `https://mochirii.com/auth`.
2. Start the Discord provider login flow.
3. Confirm Supabase Auth returns to `https://mochirii.com/account`.
4. Confirm account UI loads without `Invalid supabaseUrl`.
5. Run Discord verification with a real account.
6. Confirm failed/blocked states are clear for users without the required roles.

Rollback for Supabase redirect settings:

1. Keep a screenshot/copy of pre-cutover Site URL and Redirect URLs.
2. If OAuth breaks only on the custom domain, restore the previous working Site URL/Redirect URL set.
3. Keep `https://mochirii.vercel.app/**` allowed while investigating.
4. Do not remove GitHub Pages/static callback URLs until rollback risk is gone.

## Discord Checklist

Do not change Discord Developer Portal settings while using this document unless the user has explicitly approved the cutover window.

Discord OAuth callback should remain:

- `https://deyvmtncimmcinldjyqe.supabase.co/auth/v1/callback`

Do not point Discord callback directly to Vercel, `mochirii.com`, or `www.mochirii.com`. Supabase Auth remains the OAuth callback owner.

Discord verification behavior to test after cutover:

- OAuth login starts from `/auth`.
- Auth returns to `/account`.
- `verify-discord-member` can read the Discord identity through Supabase Auth.
- Required role checks still distinguish unverified, verified, active member, and moderator states.

## Current DNS Inventory Snapshot

Snapshot time: `2026-05-17T22:16:31Z`

Tools used:

- `dig`
- `curl`
- `whois`
- `jq`
- `gh`
- `git`
- `rg`

Commands used:

- `dig mochirii.com NS/SOA/A/AAAA/CNAME/MX/TXT/CAA +noall +answer`
- `dig www.mochirii.com CNAME/A/AAAA/TXT +noall +answer`
- `dig @1.1.1.1` and `dig @8.8.8.8` for apex and `www` cross-checks.
- `dig _dmarc.mochirii.com TXT +noall +answer`
- `dig selector1._domainkey.mochirii.com TXT/CNAME +noall +answer`
- `dig selector2._domainkey.mochirii.com TXT/CNAME +noall +answer`
- `dig default._domainkey.mochirii.com TXT/CNAME +noall +answer`
- `dig protonmail._domainkey.mochirii.com TXT/CNAME +noall +answer`
- `dig google._domainkey.mochirii.com TXT/CNAME +noall +answer`
- `dig api.mochirii.com A/CNAME +noall +answer`
- `dig photos.mochirii.com A/CNAME +noall +answer`
- `dig gallery.mochirii.com A/CNAME +noall +answer`
- `dig discord.mochirii.com A/CNAME +noall +answer`
- `whois mochirii.com`
- `curl -sL https://rdap.org/domain/mochirii.com`
- `curl -I http://mochirii.com`
- `curl -I https://mochirii.com`
- `curl -I http://www.mochirii.com`
- `curl -I https://www.mochirii.com`
- `gh api repos/Mochirii-Wushu/Mochirii/pages`
- `gh repo view Mochirii-Wushu/Mochirii --json nameWithOwner,defaultBranchRef,homepageUrl,url`
- `test -f CNAME && cat CNAME`
- `git ls-files | grep -E '(^|/)CNAME$'`
- `rg` for `mochirii.com`, `github.io`, `CNAME`, and GitHub Pages references.

Confidence labels:

- `CONFIRMED_PUBLIC_DNS`: observed from public DNS, WHOIS/RDAP, or HTTP response data.
- `CONFIRMED_REPO`: observed from tracked repository files.
- `CONFIRMED_GITHUB_API`: observed from GitHub API or GitHub CLI API output.
- `CONFIRMED_CLOUDFLARE_DASHBOARD`: observed from user-provided Cloudflare dashboard confirmation with sensitive values redacted.
- `CONFIRMED_VERCEL_DASHBOARD`: observed from user-provided Vercel Domains DNS instructions.
- `INFERRED`: reasoned from multiple public observations, but not directly proven by a dashboard.
- `MANUAL_CONFIRMATION_REQUIRED`: not provable from the allowed public/repo sources.

GitHub Pages direct-record reference set used for comparison:

- A: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- AAAA: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`

### Current DNS Summary

| Item | Value | Source | Confidence | Notes |
| --- | --- | --- | --- | --- |
| Registrar | Cloudflare, Inc.; IANA ID `1910` | `whois`; RDAP | CONFIRMED_PUBLIC_DNS | Public registration data confirms the registrar. |
| Registration status | `client transfer prohibited` | `whois`; RDAP | CONFIRMED_PUBLIC_DNS | No dashboard access used. |
| DNSSEC | enabled; `mochirii.com` protected | user-provided Cloudflare DNS Settings screenshot; `whois`; RDAP `secureDNS.delegationSigned=true` | CONFIRMED_CLOUDFLARE_DASHBOARD | Keep enabled. Do not alter DNSSEC during cutover without explicit approval. |
| Authoritative nameservers | `igor.ns.cloudflare.com.`, `naomi.ns.cloudflare.com.` | `dig NS`; `whois`; RDAP | CONFIRMED_PUBLIC_DNS | Current NS set is Cloudflare-branded. |
| DNS provider | Cloudflare DNS | user-provided Cloudflare dashboard confirmation; authoritative nameservers | CONFIRMED_CLOUDFLARE_DASHBOARD | Dashboard confirmation identifies Cloudflare as the DNS provider. |
| Cloudflare proxy classification | Apex A records and `www` CNAME are orange-cloud proxied | user-provided Cloudflare dashboard confirmation; Cloudflare HTTP headers | CONFIRMED_CLOUDFLARE_DASHBOARD | Mail, security, and verification records are DNS only. |
| Cloudflare SSL/TLS mode | Full | user-provided Cloudflare dashboard screenshot | CONFIRMED_CLOUDFLARE_DASHBOARD | Full encrypts Cloudflare-to-origin traffic but does not validate the origin certificate. After the Vercel certificate is active and verified, consider Full (strict). |
| Apex dashboard web records | four `mochirii.com` A records, Proxied, TTL Auto; IP values redacted | user-provided Cloudflare dashboard confirmation | CONFIRMED_CLOUDFLARE_DASHBOARD | Preserve until an approved cutover uses exact Vercel-provided records. |
| `www` dashboard web record | `www` CNAME, Proxied, TTL Auto; target redacted | user-provided Cloudflare dashboard confirmation | CONFIRMED_CLOUDFLARE_DASHBOARD | Preserve until an approved cutover defines final `www` behavior. |
| Apex web origin | GitHub Pages behind Cloudflare likely | GitHub Pages API/CNAME; HTTP `x-github-request-id`, Fastly headers, and Cloudflare headers | INFERRED | Direct DNS answers are Cloudflare proxy IPs, not GitHub Pages IPs. |
| GitHub Pages custom domain | `mochirii.com` | GitHub Pages API | CONFIRMED_GITHUB_API | API reports Pages `status: built`, `cname: mochirii.com`, source `main` `/`. |
| Repository CNAME file | `CNAME` contains `mochirii.com` | tracked `CNAME` file | CONFIRMED_REPO | Keep root static files and CNAME available for rollback until stabilization. |
| Repository homepage URL | `https://mochirii.vercel.app` | GitHub repo API | CONFIRMED_GITHUB_API | Historical repo metadata pointed to the Vercel review/fallback URL. Current production is `https://mochirii.com`. |
| GitHub Pages A classification | no direct GitHub Pages A match; proxied / ambiguous | public DNS vs GitHub Pages reference A values | INFERRED | Current A records are Cloudflare IPs, so direct GitHub Pages A comparison is hidden by proxying. |
| GitHub Pages AAAA classification | no direct GitHub Pages AAAA match; proxied / ambiguous | public DNS vs GitHub Pages reference AAAA values | INFERRED | Current AAAA records are Cloudflare IPs, so direct GitHub Pages AAAA comparison is hidden by proxying. |
| `www` routing intent | `https://www.mochirii.com` redirects to `https://mochirii.com/` | `curl -I` | CONFIRMED_PUBLIC_DNS | Whether `www` should remain redirect-only or serve app traffic is a cutover decision. |

### Current Observed Public DNS Snapshot

| Host | Type | Value | TTL | Resolver / Source | Confidence | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `mochirii.com` | NS | `igor.ns.cloudflare.com.` | `86400`; `21600` from `8.8.8.8` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | TTL variance observed between resolvers. |
| `mochirii.com` | NS | `naomi.ns.cloudflare.com.` | `86400`; `21600` from `8.8.8.8` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | TTL variance observed between resolvers. |
| `mochirii.com` | SOA | `igor.ns.cloudflare.com. dns.cloudflare.com. 2404491762 10000 2400 604800 1800` | `1800` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Cloudflare SOA. |
| `mochirii.com` | A | `104.21.70.47` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Cloudflare-fronted web record. |
| `mochirii.com` | A | `172.67.219.251` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Cloudflare-fronted web record. |
| `mochirii.com` | AAAA | `2606:4700:3030::ac43:dbfb` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Cloudflare-fronted web record. |
| `mochirii.com` | AAAA | `2606:4700:3035::6815:462f` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Cloudflare-fronted web record. |
| `mochirii.com` | CNAME | no public answer | n/a | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Apex CNAME/ALIAS/ANAME dashboard state cannot be proven from public DNS. |
| `mochirii.com` | MX | `10 mail.protonmail.ch.` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Email record. Do not touch. |
| `mochirii.com` | MX | `20 mailsec.protonmail.ch.` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Email record. Do not touch. |
| `mochirii.com` | TXT | `v=spf1 include:_spf.protonmail.ch -all` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | SPF. Do not touch. |
| `mochirii.com` | TXT | `openai-domain-verification=dv-7wrk9X8LfsQRks41kOG5G5jI` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Verification TXT. Do not touch unless the owner approves. |
| `mochirii.com` | TXT | `protonmail-verification=55f321dbe5e35efd1b6fdbb8b3be9e3a7eca934f` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Proton verification TXT. Do not touch. |
| `mochirii.com` | CAA | no public answer | n/a | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | No observed CAA record; do not add one during cutover unless separately approved. |
| `www.mochirii.com` | CNAME | no public answer | n/a | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | `www` currently resolves through A/AAAA, likely Cloudflare proxied. |
| `www.mochirii.com` | A | `104.21.70.47` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Same visible Cloudflare A set as apex. |
| `www.mochirii.com` | A | `172.67.219.251` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Same visible Cloudflare A set as apex. |
| `www.mochirii.com` | AAAA | `2606:4700:3030::ac43:dbfb` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Same visible Cloudflare AAAA set as apex. |
| `www.mochirii.com` | AAAA | `2606:4700:3035::6815:462f` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Same visible Cloudflare AAAA set as apex. |
| `www.mochirii.com` | TXT | no public answer | n/a | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | No observed `www` TXT. |
| `_dmarc.mochirii.com` | TXT | `v=DMARC1; p=quarantine; rua=mailto:dmarc@mochirii.com; ruf=mailto:dmarc@mochirii.com; fo=1` | `300` | system resolver | CONFIRMED_PUBLIC_DNS | DMARC. Do not touch. |
| `protonmail._domainkey.mochirii.com` | CNAME | `protonmail.domainkey.daf6yajm373drajzjqjvbaedayzfr3yeglwbrbv5eby4j5kbhhl6a.domains.proton.ch.` | `300` | system resolver | CONFIRMED_PUBLIC_DNS | DKIM selector. Do not touch. |
| `protonmail._domainkey.mochirii.com` | TXT | resolved via Proton CNAME target; DKIM public key observed at target | `1200` at Proton target | system resolver | CONFIRMED_PUBLIC_DNS | Preserve the CNAME; the long DKIM key is hosted at Proton. |
| `selector1._domainkey.mochirii.com` | TXT/CNAME | no public answer | n/a | system resolver | CONFIRMED_PUBLIC_DNS | No observed record. |
| `selector2._domainkey.mochirii.com` | TXT/CNAME | no public answer | n/a | system resolver | CONFIRMED_PUBLIC_DNS | No observed record. |
| `default._domainkey.mochirii.com` | TXT/CNAME | no public answer | n/a | system resolver | CONFIRMED_PUBLIC_DNS | No observed record. |
| `google._domainkey.mochirii.com` | TXT/CNAME | no public answer | n/a | system resolver | CONFIRMED_PUBLIC_DNS | No observed record. |

### Current Apex And WWW HTTP Behavior

| URL | Status | Location | Server / headers | Source | Confidence | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `http://mochirii.com` | `301` | `https://mochirii.com/` | `server: cloudflare`, `cf-ray` | `curl -I` | CONFIRMED_PUBLIC_DNS | HTTP redirects to HTTPS apex. |
| `https://mochirii.com` | `200` | n/a | `server: cloudflare`, `x-github-request-id`, Fastly cache headers | `curl -I` | CONFIRMED_PUBLIC_DNS | Historical snapshot: HTTPS apex served the GitHub Pages site through Cloudflare before Vercel cutover. |
| `http://www.mochirii.com` | `301` | `https://www.mochirii.com/` | `server: cloudflare`, `cf-ray` | `curl -I` | CONFIRMED_PUBLIC_DNS | HTTP redirects to HTTPS `www`. |
| `https://www.mochirii.com` | `301` | `https://mochirii.com/` | `server: cloudflare`, `x-github-request-id`, Fastly cache headers | `curl -I` | CONFIRMED_PUBLIC_DNS | `www` redirects to apex over HTTPS. |

### GitHub Pages State

| Item | Value | Source | Confidence | Notes |
| --- | --- | --- | --- | --- |
| Pages status | `built` | `gh api repos/Mochirii-Wushu/Mochirii/pages` | CONFIRMED_GITHUB_API | Current GitHub Pages site is built. |
| Pages custom domain | `mochirii.com` | `gh api repos/Mochirii-Wushu/Mochirii/pages` | CONFIRMED_GITHUB_API | Matches tracked `CNAME`. |
| Pages source | branch `main`, path `/` | `gh api repos/Mochirii-Wushu/Mochirii/pages` | CONFIRMED_GITHUB_API | Root static files remain the rollback source. |
| Pages public flag | `true` | `gh api repos/Mochirii-Wushu/Mochirii/pages` | CONFIRMED_GITHUB_API | Do not change Pages settings in this readiness phase. |
| Pages HTTPS enforced | `false` | `gh api repos/Mochirii-Wushu/Mochirii/pages` | CONFIRMED_GITHUB_API | Cloudflare currently provides the visible HTTPS behavior; dashboard confirmation required before changing anything. |
| Tracked CNAME | `mochirii.com` | `CNAME`; `git ls-files` | CONFIRMED_REPO | Do not remove during cutover readiness work. |
| Default Pages domain | likely `mochirii-wushu.github.io/Mochirii/` before custom domain | repository owner/name convention | INFERRED | Not directly returned by the GitHub API output used here; use GitHub Pages dashboard/API if this matters for rollback. |

### Cutover Action Table

Use the exact final records shown in the production-serving Vercel project's Domains dashboard during the cutover window. Older dashboard snapshots and older CLI output are inventory history, not final authority.

| Host | Type | Current state | Future action | Final value | Source | Confidence | Cutover action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `mochirii.com` / `@` | A or dashboard-specified apex record | Public DNS currently returns Cloudflare A/AAAA answers | Replace current apex web records only during the approved cutover | Exact Vercel Domains value for `mochirii/mochirii`; commonly apex `A 76.76.21.21`; Proxy disabled / DNS only | current Vercel Domains dashboard during cutover | SAME_WINDOW_REQUIRED | CHANGE ONLY DURING APPROVED CUTOVER |
| `www.mochirii.com` / `www` | CNAME or dashboard-specified subdomain record | Public DNS currently returns Cloudflare A/AAAA answers through proxying/flattening | Replace or update `www` only during the approved cutover | Exact Vercel Domains value for `mochirii/mochirii`; commonly Vercel-provided CNAME; Proxy disabled / DNS only | current Vercel Domains dashboard during cutover | SAME_WINDOW_REQUIRED | CHANGE ONLY DURING APPROVED CUTOVER |
| `mochirii.com` | MX | ProtonMail MX records | Leave unchanged | `10 mail.protonmail.ch.`; `20 mailsec.protonmail.ch.` | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `mochirii.com` | TXT | SPF and verification TXT records | Leave unchanged | Existing public TXT values | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `_dmarc.mochirii.com` | TXT | DMARC quarantine policy | Leave unchanged | Existing DMARC TXT value | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `protonmail._domainkey.mochirii.com` | CNAME | ProtonMail DKIM selector | Leave unchanged | Existing Proton DKIM CNAME target | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `protonmail2._domainkey.mochirii.com` | CNAME | ProtonMail DKIM selector | Leave unchanged | Existing dashboard value redacted | Cloudflare dashboard confirmation | CONFIRMED_CLOUDFLARE_DASHBOARD | DO NOT TOUCH |
| `protonmail3._domainkey.mochirii.com` | CNAME | ProtonMail DKIM selector | Leave unchanged | Existing dashboard value redacted | Cloudflare dashboard confirmation | CONFIRMED_CLOUDFLARE_DASHBOARD | DO NOT TOUCH |
| `mochirii.com` | CAA | no public answer | Leave unchanged unless certificate policy is separately approved | n/a | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |

### Records To Preserve

| Record / Host | Type | Current observed value | TTL | Purpose | Source | Confidence | Cutover action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `mochirii.com` | MX | `10 mail.protonmail.ch.` | `300` | ProtonMail inbound mail | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `mochirii.com` | MX | `20 mailsec.protonmail.ch.` | `300` | ProtonMail inbound mail fallback | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `mochirii.com` | TXT | `v=spf1 include:_spf.protonmail.ch -all` | `300` | SPF email authorization | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `mochirii.com` | TXT | `protonmail-verification=55f321dbe5e35efd1b6fdbb8b3be9e3a7eca934f` | `300` | ProtonMail domain verification | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `mochirii.com` | TXT | `openai-domain-verification=dv-7wrk9X8LfsQRks41kOG5G5jI` | `300` | OpenAI domain verification | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `_dmarc.mochirii.com` | TXT | `v=DMARC1; p=quarantine; rua=mailto:dmarc@mochirii.com; ruf=mailto:dmarc@mochirii.com; fo=1` | `300` | DMARC reporting and policy | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `protonmail._domainkey.mochirii.com` | CNAME | `protonmail.domainkey.daf6yajm373drajzjqjvbaedayzfr3yeglwbrbv5eby4j5kbhhl6a.domains.proton.ch.` | `300` | ProtonMail DKIM selector | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `protonmail2._domainkey.mochirii.com` | CNAME | redacted in dashboard screenshot | Auto | ProtonMail DKIM selector | Cloudflare dashboard confirmation | CONFIRMED_CLOUDFLARE_DASHBOARD | DO NOT TOUCH |
| `protonmail3._domainkey.mochirii.com` | CNAME | redacted in dashboard screenshot | Auto | ProtonMail DKIM selector | Cloudflare dashboard confirmation | CONFIRMED_CLOUDFLARE_DASHBOARD | DO NOT TOUCH |
| `mochirii.com` | CAA | no public answer | n/a | Certificate authority policy | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH unless certificate policy is separately approved |
| `CNAME` repository file | file | `mochirii.com` | n/a | GitHub Pages custom-domain rollback reference | repo | CONFIRMED_REPO | DO NOT TOUCH until after stabilization |

### Vercel-Provided DNS Records For Cutover

Source: current production-serving Vercel Domains dashboard during the cutover window.
Confidence: `SAME_WINDOW_REQUIRED`.

Do not use older hard-coded Vercel CNAME targets as final authority. Add `mochirii.com` and `www.mochirii.com` to `mochirii/mochirii`, inspect the current required DNS records in Vercel, then copy those exact values into Cloudflare as DNS-only records.

| Host / Name | Type | Value | Proxy setting | Cutover action |
| --- | --- | --- | --- | --- |
| `mochirii.com` / `@` | Vercel-provided apex record | Same-window Vercel Domains value | Disabled / DNS only | Replace current apex web records only during the approved cutover. |
| `www.mochirii.com` / `www` | Vercel-provided subdomain record | Same-window Vercel Domains value | Disabled / DNS only | Replace or update current `www` web record only during the approved cutover. |

Cloudflare remains authoritative DNS. Vercel is only the web hosting target for the approved app domains.

### Records Likely To Change During Future Cutover

- Apex `mochirii.com` web records should change to the Vercel-provided DNS-only apex record during the approved cutover.
- `www.mochirii.com` should change to the Vercel-provided DNS-only subdomain record during the approved cutover.
- Do not touch MX, SPF, DKIM, DMARC, CAA, verification TXT, email, or unrelated records.
- Do not change Cloudflare DNS before the explicit cutover window.

### Unrelated Subdomains And Do-Not-Touch List

Allowed-source repo search found only `www.mochirii.com` references in this cutover document. Public A/CNAME checks for the listed known/discussed hosts `api.mochirii.com`, `photos.mochirii.com`, `gallery.mochirii.com`, and `discord.mochirii.com` returned no public answers. That does not prove the full zone lacks those hosts.

| Host | Classification | Observed records | Source | Confidence | Cutover action |
| --- | --- | --- | --- | --- | --- |
| `www.mochirii.com` | website/custom-domain related | Cloudflare-fronted A/AAAA; HTTPS redirects to apex | public DNS; HTTP | CONFIRMED_PUBLIC_DNS | Change only if the approved Vercel cutover plan includes `www`. |
| `api.mochirii.com` | unknown / manual confirmation required | no public A/CNAME answer from allowed check | public DNS; repo search | MANUAL_CONFIRMATION_REQUIRED | DO NOT TOUCH unless found in provider dashboard and explicitly scoped. |
| `photos.mochirii.com` | unknown / manual confirmation required | no public A/CNAME answer from allowed check | public DNS; repo search | MANUAL_CONFIRMATION_REQUIRED | DO NOT TOUCH unless found in provider dashboard and explicitly scoped. |
| `gallery.mochirii.com` | unknown / manual confirmation required | no public A/CNAME answer from allowed check | public DNS; repo search | MANUAL_CONFIRMATION_REQUIRED | DO NOT TOUCH unless found in provider dashboard and explicitly scoped. |
| `discord.mochirii.com` | unknown / manual confirmation required | no public A/CNAME answer from allowed check | public DNS; repo search | MANUAL_CONFIRMATION_REQUIRED | DO NOT TOUCH unless found in provider dashboard and explicitly scoped. |

### Dashboard Confirmation And Remaining Manual Items

Confirmed from the Cloudflare DNS dashboard:

- DNS provider dashboard is Cloudflare.
- Apex web records are four `mochirii.com` A records, orange-cloud Proxied, with Auto TTL; IP values remain redacted.
- `www` is a CNAME record, orange-cloud Proxied, with Auto TTL; target remains redacted.
- SSL/TLS Current encryption mode is Full. Full encrypts Cloudflare-to-origin traffic but does not validate the origin certificate.
- After cutover, consider Full (strict) only after the Vercel certificate is active and verified.
- ProtonMail DKIM CNAME records `protonmail._domainkey`, `protonmail2._domainkey`, and `protonmail3._domainkey` must be preserved.
- Apex MX records, apex TXT records, and `_dmarc` TXT records must be preserved.
- Mail, security, and verification records are DNS only.

Manual confirmation still required:

- Full exact dashboard record content values remain redacted in the provided screenshot and must be captured from Cloudflare before any approved DNS change.
- Whether `www` should redirect to apex or serve app traffic remains a cutover decision.
- Whether any unpublished/private/unreferenced subdomains exist and must not be touched.

### Cloudflare DNS Settings Confirmation

Source: user-provided Cloudflare DNS Settings screenshot.
Confidence: `CONFIRMED_CLOUDFLARE_DASHBOARD`.

Cloudflare remains the authoritative DNS provider. Vercel is only the future web hosting target for the approved app domains; it should not replace Cloudflare as the DNS provider during this cutover plan.

| DNS Setting | Current state | Cutover guidance |
| --- | --- | --- |
| DNSSEC | Enabled; `mochirii.com` is protected | Keep enabled. Do not disable or rotate DNSSEC during website cutover. |
| Multi-signer DNSSEC | Off | Keep off unless a future multi-signer migration is explicitly planned. |
| Multi-provider DNS | Off | Keep off. This cutover does not introduce another authoritative DNS provider. |
| Email Security | Not configured | Do not configure during website cutover. ProtonMail email records must be preserved, and Cloudflare Email Security is out of scope. |

Preserve ProtonMail MX, SPF/TXT, DKIM CNAME, verification TXT, and `_dmarc` records exactly. Website hosting changes should only touch approved apex/`www` web records during an owner-approved rollback or provider-change window.

### Cloudflare Active Rules Confirmation

Source: user-provided Cloudflare dashboard review.
Confidence: `CONFIRMED_CLOUDFLARE_DASHBOARD`.

Historical snapshot: the reviewed Cloudflare rules pages showed template/create screens or no visible active entries. Do not create Cloudflare rules during stabilization unless a specific redirect, cache, or origin issue is found and owner-approved. Prefer Vercel domain settings and app-level redirects first.

| Cloudflare Area | Current visible state | Cutover guidance |
| --- | --- | --- |
| Redirect Rules | No active rules visible; templates/create screen only | Do not create redirect rules unless Vercel/app redirects fail a specific smoke check. |
| Page Rules | No active rules visible | Do not add legacy Page Rules during readiness work. |
| Cache Rules | No active rules visible; templates/create screen only | Do not add cache rules before production behavior requires a tested exception. |
| Configuration Rules | No active rules visible | Do not create configuration rules during cutover readiness. |
| Transform Rules | No active custom rules visible; Managed Transforms documented separately | Keep custom transforms off unless a narrow tested need appears. |
| Origin Rules | No active rules visible | Prefer Vercel domain/origin setup before adding Cloudflare origin rules. |
| Workers Routes | No active routes found for `mochirii.com`, `www.mochirii.com`, or `*.mochirii.com` | Do not add Workers routes during DNS cutover readiness. |

### Cloudflare Managed Transforms Recommendations

Source: user-provided Cloudflare Rules -> Settings -> Managed Transforms dashboard screenshot.
Confidence: `CONFIRMED_CLOUDFLARE_DASHBOARD`.

Managed Transforms apply zone-wide, so keep recommendations conservative during any rollback or provider-change window. Do not introduce broad request-header changes or a zone-wide security-header bundle during stabilization work.

| Managed Transform | Recommendation | Notes |
| --- | --- | --- |
| Remove X-Powered-By headers | ON | Low-risk response-header cleanup that reduces unnecessary technology disclosure. |
| Add TLS client auth headers | OFF | Do not add client-certificate request headers before cutover. |
| Add visitor location headers | OFF | Avoid adding location-derived request headers before app, auth, and privacy behavior are reviewed. |
| Remove visitor IP headers | OFF | Do not alter visitor IP signal before logging, moderation, Supabase, and Vercel behavior are verified. |
| Add True-Client-IP header | OFF | Do not add broad client-IP forwarding headers before there is a tested origin-side need. |
| Add leaked credentials checks header | OFF | Keep request-header behavior unchanged during DNS readiness. |
| Add security headers | OFF for now | Revisit in a dedicated, tested Next/Vercel security-header PR instead of enabling zone-wide during cutover readiness. |

Stronger security headers should be handled later through a tested Next/Vercel security-header PR with route, auth, gallery, browser, and production smoke coverage. Do not enable Cloudflare Managed Transforms as a shortcut for that work before cutover.

## DNS Provider Inventory Template

Fill this in before any DNS change:

```text
DNS provider / registrar:
Account owner / operator:
Current nameservers:

Current apex A records:
- name:
  value:
  TTL:

Current apex AAAA records, if any:
- name:
  value:
  TTL:

Current CNAME records:
- name:
  value:
  TTL:

Current GitHub Pages records:
- record:
  value:
  TTL:

Current www behavior:
- redirects to apex:
- serves separate site:
- CNAME target:

Cloudflare or proxy enabled:
- yes/no:
- proxied records:
- DNS-only records:

Email records that must not be touched:
- MX:
- SPF TXT:
- DKIM TXT/CNAME:
- DMARC TXT:

Other unrelated subdomains that must not be touched:
- name:
  purpose:
  record/value:
```

Future DNS action checklist:

1. Lower TTL before cutover if the provider supports it and the operator approves.
2. Record current DNS values before changing anything.
3. Add or replace apex record according to Vercel's dashboard instructions.
4. Add or replace `www` record according to Vercel's dashboard instructions.
5. Do not touch MX/TXT/email records.
6. Do not touch unrelated subdomains.
7. Verify DNS propagation.
8. Verify Vercel domain status.
9. Verify HTTPS certificate status.
10. Verify redirects and app routes.

Use the exact records Vercel shows in Project -> Settings -> Domains.

## Cutover Rehearsal Gate

Run this before requesting an approved DNS cutover window:

```sh
npm run check:dns-cutover-rehearsal
```

This helper is read-only. It does not change DNS, Vercel, Cloudflare, Supabase, Discord, GitHub Pages, deployments, aliases, databases, Edge Functions, uploads, moderation rows, or local credential files.

It verifies:

- rollback files and `CNAME` still exist;
- DNS and member workflow runbooks still include the required safety gates;
- completed/private cutover packet, live-member result packet, D02/D03 evidence, dashboard evidence, cleanup note, and screenshot artifacts are not tracked;
- Next/Vercel legacy `.html` redirects remain configured;
- live-member QA disposable image preparation remains documented via `prepare:live-member-qa-image`;
- live-member QA local preparation remains documented via `prepare:live-member-qa-local`;
- private D03 cleanup-note preparation remains documented via `prepare:live-member-cleanup-note`;
- private D03 cleanup-note validation remains documented via `npm run check:live-member-cleanup-note`;
- private draft packet preparation remains documented via `prepare:dns-cutover-private-packets`;
- readiness validator self-tests still reject private values without printing them;
- Cloudflare nameservers still answer publicly for `mochirii.com`;
- ProtonMail MX, SPF/TXT, DKIM, DMARC, and verification TXT records still resolve publicly;
- the current custom domain still matches the pre-cutover Cloudflare/GitHub Pages surface;
- `www.mochirii.com` still redirects to the apex custom domain before cutover;
- `npm run smoke:vercel-production` still passes against `https://mochirii.vercel.app`;
- `npm run check:dns-cutover-workstation` passes on the operator machine before same-window final readiness;
- `npm run check:dns-cutover-pr-readiness` confirms the local head matches draft PR #181, the PR merge state is clean, required GitHub/Vercel checks pass, and the matching preview deployment is Ready;
- `npm run check:live-member-workflow-preflight` still passes in normal, non-mutating mode.
- `npm run check` still covers Supabase public config, Discord gallery ingest guardrails, Deno Edge Function type checks, and cutover validator self-tests.

If only the local/file/DNS portion is needed while investigating a smoke failure, use:

```sh
npm run check:dns-cutover-rehearsal -- --skip-child-checks
```

Passing this helper is not cutover approval. It only proves the repeatable read-only rehearsal checks that can run from the repository and public network.

### Vercel PR Preview Gate

Use this helper before converting PR #181 out of draft or treating GitHub's combined PR state as healthy:

```sh
npm run check:dns-cutover-pr-readiness
```

It is read-only. It verifies the local checkout matches draft PR #181, the base/head branches are expected, the merge state is `CLEAN`, GitHub `validate` and `validate-next` pass, the intended `Vercel - mochirii` signal is successful when present, duplicate `Vercel - web` is ignored for PR readiness, Supabase Preview is either skipped or passing if present, and the matching Vercel preview deployment is `READY` when the Vercel preview check is not skipped. It does not create deployments, update aliases, edit Vercel domains, touch DNS, read environment values, or change provider settings.

For a focused Vercel deployment diagnostic, use:

```sh
npm run check:vercel-pr-preview
```

It is read-only. It does not create deployments, update aliases, edit Vercel domains, touch DNS, or read environment values. It reports only the PR number, branch, short commit, GitHub Vercel status, Vercel deployment URL, deployment state, target, and branch alias. It fails closed when the latest PR head is still queued/pending even if production at `https://mochirii.vercel.app` remains Ready.

### Final Readiness Gate

Use this helper during the approved same-window review, after D02/D03 live-member QA has a private result packet and the final approval packet has been completed:

```sh
LIVE_MEMBER_WORKFLOW_RESULT_PACKET=/path/to/private/completed-live-member-result.md DNS_CUTOVER_APPROVAL_PACKET=/path/to/private/completed-packet.md npm --silent run check:dns-cutover-final-readiness
```

It is read-only. It does not change DNS, provider dashboards, Vercel aliases, deployments, Supabase data, Edge Functions, uploads, moderation rows, Discord settings, GitHub Pages, or local credential files. It starts with the workstation preflight, verifies draft PR #181 readiness for the current local head, starts a temporary local static server for browser smokes unless `SMOKE_BASE_URL` is already supplied, aggregates the automated same-window checks, validates the private live-member result packet, validates the private DNS approval packet, and fails closed until both packet paths are supplied. For a fast local diagnostic of the private-packet gate only, use:

```sh
npm run check:dns-cutover-final-readiness -- --skip-automated-checks
```

Passing this helper proves only that the repository-accessible checks and private packet validators passed on the current machine. It is not a substitute for the human cutover approval decision.

## Approval Packet

For the historical cutover window, the operator packet came from [`dns-cutover-approval-packet.md`](./dns-cutover-approval-packet.md).

The packet is a template for a private operator note. Do not commit a completed packet if it contains dashboard screenshots, exact pre-change DNS record values, operator contacts, account labels, submission IDs, private Storage paths, signed URLs, tokens, cookies, or any other private operational detail.

Validate the completed private packet before any `GO` decision:

```sh
npm --silent run check:live-member-cleanup-note -- --note=/path/to/private/completed-cleanup-note.md
npm --silent run check:live-member-workflow-result-packet -- --packet=/path/to/private/completed-live-member-result.md
npm run check:cutover-validators
npm --silent run check:dns-cutover-approval-packet -- --packet=/path/to/private/completed-packet.md
```

These helpers print only field labels and pass/fail state. They do not authorize cutover by themselves.

The approval decision must remain `NO-GO` until:

- same-window rehearsal and validation pass;
- Vercel project ownership and exact DNS instructions are confirmed;
- Cloudflare pre-change and rollback DNS values are captured privately;
- Supabase Auth Site URL and Redirect URL plan is confirmed;
- Discord callback remains the Supabase callback;
- D02 live OAuth/account QA passes;
- D03 live upload/moderation QA passes or is explicitly deferred with a named rollback owner;
- the live-member result packet validates the private D02/D03 handoff;
- rollback owner and communication path are named.

## GitHub Pages Rollback Readiness

Rollback assumptions:

- Root GitHub Pages files still exist.
- The old static site remains in the repository.
- Old auth/member/upload/moderation files remain available in the repository as rollback reference.
- GitHub Pages can be restored if DNS points back to its previous records.
- Do not delete legacy files until after post-cutover stabilization.

Rollback checklist:

1. Revert DNS records to the previous GitHub Pages values captured in the DNS inventory.
2. Restore Supabase Site URL and Redirect URLs to pre-cutover values if OAuth breaks.
3. Keep `https://mochirii.vercel.app` available for debugging.
4. Revert the latest risky PR only if a code regression is identified.
5. Confirm GitHub Pages production responds again.
6. Re-test `/auth` or the legacy workflow if rollback is needed.
7. Keep the rollback notes and timestamps in the incident handoff.

## Cutover Execution Plan

Do not execute this plan until the user explicitly approves cutover.

### Pre-Cutover

1. Run final Vercel production validation.
2. Verify Supabase Auth Site URL and Redirect URLs include the custom-domain plan.
3. Verify Discord OAuth callback remains the Supabase callback.
4. Screenshot/copy current DNS records.
5. Confirm rollback owner and expected rollback steps.
6. Optionally reduce DNS TTL if the provider supports it.
7. Confirm no unrelated DNS/email records will be touched.
8. Confirm the latest `main` deployment is Ready on Vercel.

### Cutover

1. Add `mochirii.com` to the Vercel project.
2. Add `www.mochirii.com` if desired.
3. Apply exact DNS records shown by Vercel.
4. Wait for Vercel domain verification.
5. Confirm HTTPS is active.
6. Confirm `mochirii.com` routes serve the Vercel app.
7. Confirm legacy `.html` redirects.
8. Confirm `/auth` OAuth returns to `https://mochirii.com/account`.
9. Confirm `/gallery-submit` and `/leader-dashboard` access behavior.

### Post-Cutover

1. Monitor browser console and network errors.
2. Monitor Supabase Auth and Edge Function logs.
3. Monitor Vercel deployment/runtime logs.
4. Keep GitHub Pages rollback path available.
5. Avoid deleting legacy static files.
6. After a stabilization period, plan cleanup separately.

## Post-Cutover Smoke Checklist

HTTP clean routes:

- `/`
- `/join`
- `/ranks`
- `/leaders`
- `/tome`
- `/events`
- `/announcements`
- `/raffles`
- `/gallery`
- `/spotlight`
- `/spotify`
- `/recruitment`
- `/twills`
- `/auth`
- `/account`
- `/gallery-submit`
- `/leader-dashboard`

Legacy redirects:

- `/index.html` -> `/`
- `/join.html` -> `/join`
- `/ranks.html` -> `/ranks`
- `/leaders.html` -> `/leaders`
- `/tome.html`
- `/events.html` -> `/events`
- `/announcements.html` -> `/announcements`
- `/raffles.html` -> `/raffles`
- `/gallery.html` -> `/gallery`
- `/spotlight.html` -> `/spotlight`
- `/spotify.html` -> `/spotify`
- `/recruitment.html` -> `/recruitment`
- `/twills.html` -> `/twills`
- `/auth.html` -> `/auth`
- `/account.html` -> `/account`
- `/gallery-submit.html` -> `/gallery-submit`
- `/leader-dashboard.html` -> `/leader-dashboard`

Browser/auth checks:

- `/auth` renders the configured sign-in method UI.
- `/account` loads signed-out or authenticated account state without crashing.
- `/gallery-submit` enforces signed-out/unverified/active-member access.
- `/leader-dashboard` blocks signed-out and non-moderator users.
- Real Discord OAuth returns to `/account`.
- Browser console has no `Invalid supabaseUrl`.
- No empty image `src` warnings appear on public or Phase 3 routes.

Optional read-only helper:

```sh
npm run smoke:vercel-production
BASE_URL=https://mochirii.com npm run smoke:vercel-production
```

Post-cutover custom-domain helper:

```sh
npm run smoke:dns-cutover-post -- --base-url=https://mochirii.com --www-mode=redirect
```

Use `--www-mode=serve` if `www.mochirii.com` is approved to serve the app directly, or `--www-mode=skip` if `www` is intentionally out of scope for the cutover window.

This helper is read-only. It expects the custom domain to expose Vercel response headers, rejects accidental Cloudflare reverse-proxy behavior unless `--allow-cloudflare-proxy` is explicitly supplied for a tested exception, runs the clean-route and legacy-redirect matrix against the custom domain, and verifies the approved `www` behavior.

## Decision Gates Requiring User Approval

- Approving a cutover window.
- Adding custom domains in Vercel.
- Changing DNS records.
- Changing Supabase Auth Site URL or Redirect URLs.
- Changing Discord Developer Portal settings.
- Reducing DNS TTL.
- Removing GitHub Pages records.
- Removing root static files or legacy workflow files.
- Deleting or archiving rollback paths after stabilization.
