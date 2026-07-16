# Security Scan Remediation Report

Date: 2026-06-10
Branch: `codex/security-scan-remediation`

## Summary

This pass resolves the confirmed `security.txt` gap reported by Cloudflare Security Insights and records current read-only security evidence for Vercel, Cloudflare, GitHub, Supabase, and Discord. It does not change DNS, Vercel settings, Supabase secrets, RLS, Discord commands, Cloudflare proxy mode, or GitHub rulesets. Cloudflare remains DNS-only for Vercel web records.

## Finding Classification

- Confirmed fix: Cloudflare Security Insights reported `Security.txt not configured` for `mochirii.com`; live `https://mochirii.com/.well-known/security.txt` returned `404` before this branch deploys.
- Verify/rescan: Cloudflare Security Insights also reported `Dangling A Record detected` for `mochirii.com`, but the current Cloudflare DNS table shows a Vercel CNAME target for the apex and `www`, and live HTTP responses show `Server: Vercel`.
- Staged hardening: CSP is already enforced and does not allow `unsafe-eval`; CSP inline reduction remains a staged follow-up because `script-src 'unsafe-inline'` and `style-src 'unsafe-inline'` require a future browser-validated tightening pass.
- Governance hardening: GitHub required checks are active, but one approving review remains a recommended owner-approved ruleset change.
- Auditability fix: Supabase CLI auditability is restored enough for read-only `functions list` to succeed on this workstation, so the earlier local telemetry-lock blocker is not active in this pass.

## Implemented

- Added matching RFC 9116 files:
  - `.well-known/security.txt`
  - `apps/web/public/.well-known/security.txt`
- Added security guardrail coverage for the root and Vercel public `security.txt` files.
- Updated active security/deployment docs to state that `/.well-known/security.txt` is part of the current production baseline after this release.

## Read-Only Evidence

- Live route headers on `/`, `/gallery`, `/auth`, `/account`, `/members`, `/gallery-submit`, `/leader-dashboard`, and `/spotify` returned `200` with `Server: Vercel`, enforced `Content-Security-Policy`, narrowed `Access-Control-Allow-Origin: https://mochirii.com`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, and `X-Frame-Options: DENY`.
- Live route headers did not include Cloudflare proxy headers such as `cf-ray`.
- Current live `/.well-known/security.txt` returned `404` before deployment, matching the Cloudflare finding this branch resolves.
- DNS evidence:
  - `mochirii.com` resolves to Vercel edge addresses through provider flattening.
  - `www.mochirii.com` resolves as a CNAME to `c4b58a30d23b9df3.vercel-dns-017.com`.
  - Cloudflare DNS dashboard shows `mochirii.com` and `www.mochirii.com` as DNS-only CNAME records to the Vercel target, with no DNS recommendations.
- Cloudflare Security Insights dashboard last scan shown: June 10, 2026 10:15 AM. Visible findings included `Security.txt not configured`, `Dangling A Record detected`, and unrelated external-zone findings that are out of scope for this Mochirii pass.
- Vercel dashboard shows production deployment Ready at commit `102192d Update Supabase JS dependency`; Firewall, Analytics, and Speed Insights surfaces are visible.
- GitHub evidence:
  - No open PRs.
  - Dependabot `postcss` alert is fixed.
  - Code scanning alert list is empty.
  - Active `Primary Rules` ruleset requires `validate`, `validate-next`, `CodeQL`, `Vercel`, and `Supabase Preview`, with strict status checks and required review-thread resolution.
  - Stale `feature/discord-vote-reminder` was closed in PR #238, had no unique patch content versus current `origin/main` under `--cherry-pick`, and was deleted locally and from `origin`.
- Supabase evidence:
  - CLI version `2.105.0` is authenticated to project `deyvmtncimmcinldjyqe`.
  - `supabase functions list --project-ref deyvmtncimmcinldjyqe` succeeded and all expected Edge Functions are active.
  - `supabase secrets list --project-ref deyvmtncimmcinldjyqe` showed the expected secret names only; no values were printed or recorded here.
- Discord dashboard evidence:
  - Reaper application dashboard is accessible and shows the General Information surface, including Application ID, Public Key, and Interactions Endpoint URL fields without recording values.

## Follow-Up Gates

- After this branch deploys, verify `https://mochirii.com/.well-known/security.txt` returns `200` and request or run a Cloudflare Security Insights rescan.
- If Cloudflare still reports `Dangling A Record detected` while current DNS remains Vercel CNAME/flattened and live responses remain Vercel-served, document it as stale or false-positive scan evidence instead of changing healthy DNS.
- Keep Cloudflare Vercel web records DNS-only; do not orange-cloud apex or `www` as a shortcut to silence the proxy warning.
- Run a dedicated CSP browser pass before any inline CSP reduction. Do not remove `unsafe-inline` until Vercel Preview and production browser checks prove Next, Supabase, Discord, Spotify, and Vercel observability remain clean.
- Owner-approved governance option: update the GitHub ruleset to require one approving review for production changes after confirming the workflow tradeoff is acceptable.
