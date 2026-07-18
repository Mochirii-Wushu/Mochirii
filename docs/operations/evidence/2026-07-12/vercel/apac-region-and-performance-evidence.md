# APAC Region And Performance Evidence

Prepared: 2026-07-12 PDT

This packet is no-secret and records read-only provider and preview evidence.

## Current Production Placement

| Surface | Verified placement | Notes |
|---|---|---|
| Vercel static assets | Global edge network | Static files are not pinned to one origin region. |
| Vercel Functions | `iad1` | Production deployment `dpl_Hc3iCdqAigjLxQzvgeFZhUGuUgNo` is `READY` at website commit `716ea484a2e218d4f41d517460790a6a98d5a952`. |
| Supabase | `us-west-2` | Auth, Postgres, and Edge Functions remain in Oregon. |
| Social Droplet | `SGP1` | DigitalOcean shows exactly one 2 GB / 50 GB Ubuntu 24.04 Droplet named `social-mochirii`. |
| Live social media | Spaces `sgp1` | `mochirii-social` remains the live media Space. |
| Social backups | Spaces `sfo3` | `mochirii-social-backups` exists and is empty. |
| Mochi Pets runtime | Fly `sjc` | Deferred and unchanged. |

Vercel documents that Function placement and static edge delivery are separate
concerns. Moving Functions does not move Supabase or Fly data and cannot make
the complete stack Singapore-only. See [Vercel Function regions](https://vercel.com/docs/functions/configuring-functions/region).

## Singapore Preview

- Protected PR: `Mochirii-Wushu/Mochirii#448`.
- Preview commit: `0ba2148b16f5ed6c69bfa9d9eee7e3171bc0b1e4`.
- Preview deployment: `dpl_Cupj6UwxHPBj9ipMTwwVAJbP8Pmb`, `READY`.
- Vercel deployment metadata reports `regions: ["sin1"]`.
- A dynamic `/games/mochi-pets` response returned HTTP 200 and an
  `x-vercel-id` path containing `sin1`.
- An unsigned `/api/oauth/decision` POST returned HTTP 401.
- Static root delivery remained HTTP 200 through Vercel's edge/prerender path.
- No production region setting was changed.

The preview proves Singapore Function execution and fail-closed behavior. It
does not yet provide seven days of Singapore field data, and its cross-region
Supabase and Fly latency cannot be inferred from the build location.

## Field Evidence

The current seven-day Speed Insights snapshot is directional:

- Singapore: 28 desktop observations, LCP `2.988s`, FCP `2.189s`, TTFB
  `949ms`; homepage LCP `3.381s` and TTFB `1.028s`.
- Indonesia: only 4 page-load observations. One `/spotlight` interaction
  recorded INP `752ms` and CLS `0.5015`.
- The Singapore sample is enough to prioritize work but not enough to prove a
  production-region result. Indonesia remains statistically inconclusive.
- LCP attribution identified `.bg-photo` and `#heroImage`; no reproducible
  Spotlight interaction defect was found locally.

PR #450 subsequently shipped responsive backdrop delivery. Its controlled
matrix kept the hero as the sole high-priority image, preserved zero CLS and
no horizontal overflow, and reduced backdrop transfer from `263,170` bytes to
`44,010` bytes on 320-414 CSS-pixel viewports, `66,812` bytes at 768px, and
`204,764` bytes at 1920px. Three-run Lighthouse medians favored hero priority
over background priority (`4,590ms` versus `4,675ms` LCP).

## Production Canary Acceptance

Before merge, update PR #448 from current `main` and require fresh `validate`,
`validate-next`, CodeQL, Vercel, and review-thread results. After merge:

- Monitor seven days of Singapore and global field data.
- Require Singapore p75 TTFB at most `800ms`, FCP at most `1.8s`, LCP at most
  `2.5s`, INP at most `200ms`, and CLS at most `0.1`.
- Require no more than 15% regression for the dynamic Supabase and Fly-backed
  boundaries and no increase in errors.
- If fewer than 25 Singapore observations exist after 14 days, report field
  evidence as inconclusive and retain `sin1` only if global and repeated
  synthetic results are non-regressive.
- Roll back by reverting only the region PR, restoring Vercel Functions to the
  project default. Static edge delivery remains global either way.

## Exact Approval

```text
Approve updating Mochirii-Wushu/Mochirii PR #448 from current main, rerunning all protected checks, squash-merging it, and allowing Vercel project mochirii/mochirii to deploy production Functions in sin1 while keeping static assets globally edge-served, Supabase in us-west-2, Fly in sjc, and all other provider settings unchanged, followed by the seven-day canary and rollback criteria in this packet.
```
