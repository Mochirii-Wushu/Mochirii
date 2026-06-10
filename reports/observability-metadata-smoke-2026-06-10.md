# Observability, Metadata, And Production Resilience Packet

Date: 2026-06-10

## Scope

Packet 6 adds durable checks for Vercel observability wiring, public route metadata, protected route `noindex` posture, sitemap boundaries, production smoke coverage, and Cloudflare DNS-only documentation.

No visible copy, route path, image, schedule, Supabase schema, Discord state, Vercel setting, Cloudflare setting, or secret changed in this packet.

## Changes

- Added `npm run check:observability-metadata-smoke`.
- Guarded root Vercel Analytics and Speed Insights component wiring.
- Guarded public route canonical/social metadata coverage for indexable routes.
- Guarded `/auth`, `/account`, `/gallery-submit`, `/leader-dashboard`, `/members`, and `/members/[slug]` as `noindex` surfaces.
- Guarded sitemap exclusion for protected member/admin routes.
- Expanded production smoke to include `/members` and `/members/twills` signed-out checks.
- Updated active deployment/current-state docs to point to the new guardrail.

## Verification Notes

- The guardrail has an optional live mode: set `MOCHIRII_OBSERVABILITY_LIVE=1` for read-only production route/header verification.
- Vercel Web Analytics and Speed Insights dashboard numbers may lag after deployment and require real production visits before useful graphs settle.
- Cloudflare remains DNS-only for Vercel web records; the Cloudflare proxy warning remains intentionally non-blocking for the current architecture.

## Expected Validation

```sh
npm run check:observability-metadata-smoke
npm run check
git diff --check
npm run check:production
npm run smoke:supabase-edge-functions
cd apps/web && npm run lint && npm run build && npm audit --audit-level=moderate
```
