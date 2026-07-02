# Mochirii Website Final Readiness - 2026-07-02

## Result

The repository is ready for normal website development next steps. The ordered
integration phase is complete, all implementation PRs created in this pass are
merged, `main` is synchronized with `origin/main`, provider reads are
reproducible, and the remaining risks are documented accepted constraints rather
than active blockers.

## Current State

| Area | Status | Evidence |
| --- | --- | --- |
| GitHub PR state | Ready | PRs #337 through #344 are merged; open PR list is empty. |
| GitHub security alerts | Ready | Open code scanning alerts: `0`; Dependabot alerts: `0`; secret scanning alerts: `0`. |
| Local toolchain | Ready | `npm run toolchain:check` passed with Node `22.23.1`, npm `10.9.8`, gh, Deno, ImageMagick, fnm, jq, Docker, Supabase CLI, Lighthouse, Playwright, and Vercel CLI available. |
| Root validation | Ready | `npm run check`, `git diff --check`, and `npm audit --audit-level=moderate` passed. |
| Next app validation | Ready | `cd apps/web && npm run toolchain:check && npm run lint && npm run build && npm audit --audit-level=moderate` passed. |
| Production smoke | Ready | `npm run check:production` passed. |
| DNS/custom-domain smoke | Ready | `npm run smoke:dns-cutover-post -- --base-url=https://mochirii.com --www-mode=redirect` passed for app routes and legacy redirects. |
| Provider evidence | Ready | `npm run check:full-stack-release-evidence -- --providers --strict-provider --write` passed with redacted reports updated. |
| Vercel | Ready | Production state is `READY`; production aliases include `mochirii.com` and `www.mochirii.com`. |
| Supabase | Ready | Local and linked remote migrations both report `21`; Edge Function config and remote function count both report `29`. |
| Browser/accessibility/performance evidence | Ready | Route matrix, accessibility matrix, media-performance guard, LCP image delivery hints, and CSP inventory checks passed in the merged PRs. |
| Audio policy | Ready | Recruitment MP3 remains unchanged as an accepted large-asset warning; asset, recruitment audio, and production byte-range playback checks passed. |

## Completed PRs

| PR | Result |
| --- | --- |
| #337 | Full-stack local development tooling baseline merged. |
| #338 | Integration operations runbook merged. |
| #339 | Provider integration alignment report merged. |
| #340 | Supabase advisor hardening migration merged with Supabase Preview passing. |
| #341 | Supabase leaked-password protection blocker report merged. |
| #342 | Core Web Vitals/LCP image delivery improvements merged. |
| #343 | Spotify inline style CSP cleanup merged. |
| #344 | Audio warning policy closure merged. |

## Accepted Risks And Follow-Ups

| Risk | Current Decision | Follow-up Trigger |
| --- | --- | --- |
| Supabase leaked-password protection | Still disabled because the provider rejected enabling it on the current plan with a Pro-plan requirement. | Revisit after plan upgrade or Auth policy decision. |
| CSP `unsafe-inline` | Still present in headers. React inline style props are now at `0`; do not remove `unsafe-inline` until preview/browser proof covers Next/Vercel, Spotify, Supabase auth/storage, Analytics/Speed Insights, and Mochi Social. | Start a dedicated nonce/hash/SRI preview PR. |
| Recruitment MP3 size warning | Accepted by policy; original file preserved. | Owner explicitly approves an optimization candidate and playback/quality review. |
| Mochi Social hosted game contract | Static and browser gates pass; live game contract remains skipped unless a runtime URL is supplied. | Set `MOCHI_SOCIAL_GAME_CONTRACT_URL` or `NEXT_PUBLIC_MOCHI_SOCIAL_URL` for runtime verification. |
| Discord live provider parity | Local parity passes; live Discord read remains opt-in because it requires a bot token. | Set `DISCORD_REAPER_PARITY_LIVE=1` with a local bot token for read-only live parity. |

## Source Basis

- Repo guidance: `AGENTS.md`, `docs/integration-operations-runbook.md`, `docs/content-guide.md`, `docs/gallery-guide.md`, and the validation scripts under `scripts/`.
- Codex guidance: https://developers.openai.com/codex/guides/agents-md
- GitHub required checks/protected workflow: https://docs.github.com/articles/about-status-checks and https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-a-branch-protection-rule
- Supabase Auth password security: https://supabase.com/docs/guides/auth/password-security
- Vercel CLI/provider reads: https://vercel.com/docs/cli
- Next image optimization: https://nextjs.org/docs/pages/api-reference/components/image
- Web Vitals/LCP target: https://web.dev/articles/optimize-lcp and https://web.dev/articles/vitals
- CSP hardening: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
- WCAG 2.2 accessibility checks: https://www.w3.org/TR/WCAG22/
