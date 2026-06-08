# Security Follow-Up Verification

Date: 2026-06-08
Branch: `codex/security-follow-up-verification`

## Summary

This follow-up verifies the current free security posture after the security-header release and PostCSS advisory fix. It uses read-only repo, GitHub API, live-domain, and local guardrail evidence. No DNS, Vercel, Supabase, Discord, Cloudflare, or secret settings were changed in this pass.

## Dependency Security

- `npm audit --audit-level=moderate` in `apps/web`: `found 0 vulnerabilities`.
- GHSA-qx2v-qp2m-jg93 is resolved through a temporary npm override to `postcss@8.5.15`.
- `next@16.2.6`, React, Vercel Analytics, and Speed Insights package versions remain unchanged.
- Future cleanup: remove the override once stable Next ships a patched PostCSS dependency.

## GitHub

- Repository visibility: public.
- Default branch: `main`.
- Delete branch on merge: enabled.
- Dependabot security updates: enabled.
- Secret scanning: enabled.
- Secret scanning push protection: enabled.
- Open Dependabot alerts: none.
- Open code scanning alerts: none.
- Active ruleset: `Primary Rules`, active on the default branch.
- Required checks currently enforced by ruleset: `validate`, `validate-next`.

## Vercel And Live Site

- Live routes checked: `/`, `/gallery`, `/auth`, `/account`, `/gallery-submit`, `/leader-dashboard`.
- All checked routes returned `200` from `Server: Vercel`.
- Security headers present on checked routes: `Content-Security-Policy-Report-Only`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`.
- `https://www.mochirii.com/` returns `308` to `https://mochirii.com/`.
- Hydrated Chrome/CDP check confirmed Vercel Analytics and Speed Insights scripts load with `data-sdkn` values:
  - `@vercel/analytics/next`
  - `@vercel/speed-insights/next`
- Vercel CLI is not installed locally; production deploy status was verified through GitHub/Vercel status contexts and live HTTP checks.

## Supabase And Discord

- `npm run check:supabase-config`: passed.
- `npm run smoke:supabase-edge-functions`: passed.
- `npm run check:reaper-discord-interactions`: passed.
- `npm run check:security-hardening`: passed.
- Current guardrails confirm browser-safe Supabase config, reviewed `verify_jwt=false` functions, signed approved-gallery URLs, Discord Ed25519 verification, timestamp freshness, and Reaper shared-secret ingest protection.

## Remaining Owner-Approved Provider Items

- Add the stable default CodeQL check, Vercel, and Supabase Preview to the active ruleset after confirming exact required-check names are stable.
- Confirm Vercel Firewall/DDoS dashboards in the Vercel UI.
- Confirm Supabase Auth redirect URLs, Storage bucket privacy, Edge Function secret names, and deployed function settings in the Supabase dashboard.
- Confirm Discord Developer Portal bot permissions and rotate any token that was ever exposed outside secure secret storage.
- Keep CSP report-only until a separate browser pass confirms no report-only violations across Discord, Spotify, Supabase, and Vercel observability.
