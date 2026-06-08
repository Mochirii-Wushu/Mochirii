# Free Security Hardening Report

Date: 2026-06-08
Branch: `codex/free-security-hardening`

## Summary

This pass hardens the Vercel/Next production surface while keeping Cloudflare DNS-only for Vercel records. Vercel remains the active hosting, firewall, and DDoS edge. Cloudflare remains the DNS provider and should not be orange-clouded in front of Vercel without a separate reverse-proxy test plan.

## Implemented

- Added conservative Next/Vercel response headers in `apps/web/next.config.ts`.
- Added `Content-Security-Policy-Report-Only` rather than enforced CSP so Discord widget, Spotify embeds, Supabase signed URLs, and Vercel observability can be verified before blocking anything.
- Verified GitHub CodeQL default setup is already active. No custom CodeQL workflow is added because GitHub cannot process advanced CodeQL uploads while default setup is enabled.
- Added `check:security-hardening` to validate headers, unauthenticated Supabase Edge Function boundaries, Reaper Discord signature checks, Discord 429 retry handling, and docs/report coverage.
- Added bounded Discord 429 `Retry-After` handling in the Supabase-hosted Reaper interaction function.
- Updated deployment docs and app README with the current security posture.

## Current Security Posture

- Cloudflare remains DNS-only for Vercel records.
- Vercel platform-wide DDoS mitigation is the active free DDoS layer.
- Vercel Web Analytics and Speed Insights remain app-level observability; verify via hydrated `script[data-sdkn]` markers.
- Supabase privileged work stays inside Edge Functions, not browser code.
- Known `verify_jwt=false` functions are explicitly reviewed:
  - `list-approved-gallery-submissions`: intentional public approved gallery feed with signed preview URLs.
  - `submit-discord-gallery-image`: protected by `DISCORD_GALLERY_INGEST_SECRET`.
  - `reaper-discord-interactions`: protected by Discord Ed25519 signature verification and timestamp freshness.
- GitHub default CodeQL checks are active and passed on this branch.
- GitHub Dependabot remains enabled. One open medium Dependabot alert for `postcss` remains tracked separately. After this release, the workstation Node/npm blocker was resolved with Node.js 22.22.3 and npm 10.9.8.

## Dashboard Items To Verify

These require owner-approved provider-side checks and were not mutated in this repo pass:

- Vercel Firewall dashboard: confirm free Firewall traffic visibility and DDoS event visibility are accessible for `mochirii/mochirii`.
- GitHub ruleset: after the default CodeQL setup has a stable required-check name, require that CodeQL check in the active ruleset alongside `validate` and `validate-next`.
- GitHub Code Security: confirm secret scanning, push protection, Dependabot alerts, and CodeQL are enabled for the public repository.
- Supabase Dashboard: confirm Auth redirect URLs, Storage bucket privacy, Edge Function secret names, and deployed function settings match the repo.
- Discord Developer Portal: confirm Reaper token is rotated if it was ever exposed outside secure secret storage.

## Validation Evidence

- `git diff --check`: passed.
- Bundled Node `scripts/check-all.mjs`: passed, including `check:security-hardening`.
- Bundled Node `scripts/check-production.mjs`: passed.
- Bundled Node `scripts/smoke-supabase-edge-functions.mjs`: passed.
- Bundled Node `scripts/check-reaper-discord-interactions.mjs`: passed.
- `apps/web` ESLint through bundled Node: passed.
- `apps/web` Next build through bundled Node: passed.
- Local built Next header smoke on `127.0.0.1:3017`: returned `200` with `Content-Security-Policy-Report-Only`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, and `X-Frame-Options`.
- Workstation note: this PR was validated with the bundled Codex Node runtime before release. After merge, Node.js 22.22.3 was installed with npm 10.9.8 and the same validation commands passed through normal `npm`.

## Remaining Notes

- CSP should stay report-only until production browser checks show no violations for Discord, Spotify, Supabase, and Vercel observability.
- The new headers are verified locally and will be live only after this branch is merged and deployed by Vercel.
- Do not enable Cloudflare proxy for Vercel records as a shortcut to clear Cloudflare warnings.
- This pass does not include penetration testing, load testing, paid WAF features, token rotation, or live firewall rule activation.
