# Security, Metadata, Cloudflare, And Observability Refresh

Date: 2026-06-18

Branch: `codex/security-metadata-observability-refresh`

## Summary

This Packet 5 refresh updated no-secret evidence and guardrails for production security headers, CSP staging, route metadata, sitemap/noindex behavior, Vercel observability, and Cloudflare DNS-only posture. It does not change DNS, Vercel settings, Supabase schema, Discord, Cloudflare, Meta, routes, copy, images, or Mochi Social behavior.

## Live Evidence

- `vercel inspect https://mochirii.com` returned production deployment `Ready` for project `mochirii`.
- `npm run smoke:dns-cutover-post -- --base-url=https://mochirii.com --www-mode=redirect` passed for all public, member/admin, and Mochi Social routes.
- `https://mochirii.com/.well-known/security.txt` returns `200` and is served by Vercel.
- `https://www.mochirii.com/` returns `308` to `https://mochirii.com/`.
- Live headers include enforced `Content-Security-Policy`, `Access-Control-Allow-Origin: https://mochirii.com`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, and `Server: Vercel`.
- Public DNS shows the apex resolving to Vercel A records and `www.mochirii.com` as a CNAME to a Vercel DNS target. Cloudflare remains DNS-only for Vercel web records; no DNS mutation was performed.
- Chrome read-only route checks found no captured console warnings/errors on `/`, `/spotify`, or `/games/mochi-social`.
- Chrome confirmed Vercel Analytics and Speed Insights scripts hydrate on live routes with `@vercel/analytics/next` and `@vercel/speed-insights/next`.
- Chrome confirmed `/games/mochi-social` remains `noindex, nofollow`.

## Guardrail Updates

- `check:observability-metadata-smoke` now guards public canonical/OpenGraph/Twitter metadata, live social image reachability, protected/noindex routes, `/games/mochi-social` noindex behavior, sitemap exclusions, observability wiring, and production smoke coverage.
- `smoke:vercel-production` now includes `/games/mochi-social`.
- `check:csp-inline-hardening -- --live --write` regenerated `reports/csp-inline-hardening-inventory.md` and JSON evidence.
- The CSP inventory confirms no `unsafe-eval`, zero React inline style props, and no stale Google Fonts source warning. The remaining `instagram.com` warning is a permalink placeholder string in the Leader Dashboard, not a loaded runtime resource.

## Dashboard Notes

- Vercel dashboard loaded read-only and showed the expected project surfaces, including Overview, Deployments, Analytics, Speed Insights, Observability, Firewall, CDN, Environment Variables, Domains, and Settings.
- Cloudflare dashboard loaded, but DNS rows were not readable through browser automation in this pass. Public DNS, Vercel headers, and the existing Cloudflare DNS-only runbook remain the evidence source for this no-mutation packet.
- No Twitch integration or Twitch route exists in the repo or live route matrix; no Twitch action is needed until a Twitch feature is requested.

## Release Gates

- Packet 4 PR #315 remains open and blocked by Supabase Preview capacity. Active Supabase preview branches are tied to PR #301 and PR #305, so Packet 5 should not be merged as the next production packet until PR #315 is merged, closed, or explicitly deferred.
- Keep CSP `unsafe-inline` removal as a later dedicated compatibility PR. Next.js nonce-based CSP requires dynamic rendering, so it should not be introduced inside this evidence refresh.
