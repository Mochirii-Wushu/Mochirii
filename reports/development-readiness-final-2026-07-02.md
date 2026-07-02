# Mochirii Website Development Readiness Final Report

Generated: 2026-07-02

This report is intentionally no-secret. It summarizes the final development-readiness gate without credential values, token digests, cookies, database URLs, webhook URLs, private headers, or provider secret values.

## Result

Ready for normal website development after PR publication/review. Local WSL tooling is installed, the full local/app/live validation gate passes, Vercel and Supabase read-only evidence is reproducible, browser/accessibility/performance evidence is restored, GitHub alerts are zero, and remaining risks are documented.

PR #337 still requires normal human review before merge. Supabase Preview remains skipped by the existing GitHub/Supabase integration state; no provider settings were changed.

## Tooling

Verified by `npm run toolchain:check` and `cd apps/web && npm run toolchain:check`:

- Node.js `22.23.1`, npm `10.9.8`.
- Git `2.43.0`.
- GitHub CLI `2.95.0` installed in WSL.
- Deno `2.9.0`.
- ImageMagick available through `magick` wrapper.
- `fnm 1.39.0`.
- `jq 1.7`.
- Docker Engine/daemon `29.6.1` available from WSL.
- Repo-local Supabase CLI `2.108.0`.
- Repo-local Lighthouse CLI `12.6.1`.
- Playwright package and Chromium dependencies installed.
- App-local Vercel CLI `54.18.1`.

Credential note: WSL `gh auth status` is not persistently logged in. That is intentional for this pass because credentials are constrained to `C:\Users\xtyty\Documents\Creds`; GitHub reads/pushes used authenticated Windows `gh` or one-shot child-process environment only, without printing or writing token values.

## Provider Evidence

Vercel:

- `vercel whoami`: read succeeded.
- `vercel inspect https://mochirii.com --format=json --timeout 3m --cwd apps/web`: production state `READY`.
- Production and Preview environment listings were read as names/metadata only.

Supabase project `deyvmtncimmcinldjyqe`:

- CLI link and migration reads succeeded.
- Local and remote migrations match at `20` migrations.
- Edge Function inventory matches repo config at `29` configured functions.
- Supabase advisors were reviewed read-only.
- Strict redacted provider evidence passed and refreshed `reports/full-stack-release-evidence.json` plus `reports/full-stack-release-evidence.md`.

## GitHub and PR State

Current PR target:

- PR: `https://github.com/Mochirii-Wushu/Mochirii/pull/337`.
- Base: `main`.
- Head: `codex/full-stack-dev-tooling`.
- State before final publication: open draft, mergeable, review required.
- Current remote checks before final publication: validate, validate-next, CodeQL, Vercel, and Vercel Preview Comments were green; Supabase Preview was skipped.

GitHub security alert reads:

- Code scanning open alerts: `0`.
- Dependabot open alerts: `0`.
- Secret scanning open alerts: `0`.

## Browser, Accessibility, and Performance

Restored artifacts:

- `reports/browser-route-matrix.json`.
- `reports/browser-route-matrix.md`.
- `reports/browser-accessibility-performance-evidence-2026-07-02.md`.
- Lighthouse artifacts under ignored `reports/lighthouse/`.

Verified routes included desktop `1440x1100` and mobile `390x900` coverage for Home, Join, Gallery, Auth, Account, Members, Leader Dashboard, and Mochi Social.

Latest production Lighthouse summaries:

- Home: performance `68`, accessibility `100`, best practices `100`, SEO `100`.
- Recruitment: performance `73`, accessibility `100`, best practices `100`, SEO `100`.
- Gallery: performance `72`, accessibility `100`, best practices `100`, SEO `100`.

Performance follow-up: LCP remains the main improvement target on production Home, Recruitment, and Gallery.

## Supabase Hardening

Restored report:

- `reports/supabase-public-function-and-migration-hardening-2026-07-02.md`.

Findings:

- All `verify_jwt = false` Edge Functions were mapped to intentional public contracts: public read-only DTO, Discord signature, shared secret, cron secret, or Mochi Social game-server handoff.
- `reaper-discord-interactions` to `submit-discord-gallery-image` keeps the Discord signature boundary separate from the gallery ingest shared-secret boundary.
- Public browser access remains through narrow Edge Function DTOs or explicit grants plus RLS, not broad anonymous table access.
- No migration/code gap was found that should be changed without product/provider review.

Accepted Supabase risks:

- Auth leaked-password protection is still an advisor warning and requires explicit provider-setting approval.
- Performance advisors recommend reviewed future migrations for unindexed foreign keys and RLS init-plan optimization.
- Unused-index notices remain observation-only until real production traffic justifies removal.
- Supabase Preview remains skipped by GitHub integration state.

## CSP and Audio

Restored/updated artifacts:

- `reports/csp-inline-hardening-inventory.json`.
- `reports/csp-inline-hardening-inventory.md`.
- `reports/csp-and-audio-asset-polish-2026-07-02.md`.

CSP result:

- Live CSP header matrix passed across production routes.
- `unsafe-inline` remains intentionally retained for `script-src` and `style-src`.
- Current blockers to removal: one React inline style prop, Next/Vercel compatibility work, and browser proof for Supabase, Spotify, Vercel Analytics/Speed Insights, and Mochi Social iframe/postMessage surfaces.

Audio result:

- `assets/audio/mochiriiiiii.mp3` remains intentionally unchanged per `apps/web/README.md`.
- Asset check passes with the known large-MP3 warning only.
- Recruitment custom audio player validation passes.
- Production Playwright click-to-play smoke passes on `https://mochirii.com/recruitment`.

## Final Validation

Passed:

- `npm run toolchain:check`.
- `npm run check`.
- `git diff --check`.
- `npm audit --audit-level=moderate`.
- `cd apps/web && npm run toolchain:check`.
- `cd apps/web && npm run lint`.
- `cd apps/web && npm run build`.
- `cd apps/web && npm audit --audit-level=moderate`.
- `npm run check:production`.
- `npm run smoke:dns-cutover-post -- --base-url=https://mochirii.com --www-mode=redirect`.
- `npm run check:full-stack-release-evidence -- --providers --strict-provider`.
- `npm run check:full-stack-release-evidence -- --providers --strict-provider --write`.
- `npm run check:csp-inline-hardening -- --live --write`.
- `npm run check:assets` with the accepted large-audio warning only.
- `npm run check:recruitment-audio-player`.
- Production Recruitment audio click-to-play smoke.
- GitHub code scanning, Dependabot, and secret scanning open-alert reads: all zero.

## Remaining Decisions

1. Human PR review is still required by branch protection/review policy.
2. Supabase Preview integration is skipped and would require provider/GitHub integration changes to become green.
3. Supabase leaked-password protection requires explicit owner approval before changing dashboard settings.
4. CSP strict inline removal should be a separate compatibility PR.
5. Audio compression/replacement requires explicit owner approval because the repo instructs preserving the MP3 exactly.
