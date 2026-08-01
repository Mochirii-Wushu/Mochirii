# Current Live State

Updated: 2026-08-01 PDT

This file is a concise public-safe index. The detailed mutable source and
provider ledger is [`operations/CURRENT-STATE.md`](./operations/CURRENT-STATE.md).
Treat every provider fact there as a dated observation, not an evergreen claim;
perform a fresh read-only provider and exact-head readback at each release gate.
Historical release evidence remains in `docs/operations/evidence`, `reports`,
and the dated runbooks and must not be rewritten to resemble current state.

## Canonical Boundaries

- `Mochirii-Wushu/Mochirii-Website` owns the Vercel Website under `apps/web`,
  Shopify theme source under `apps/shopify-theme`, the current Social source
  under `services/social`, and the shared Supabase source under `supabase`.
- `https://mochirii.com` is the public website information surface. Vercel
  production deploys from protected `main` with Root Directory `apps/web`.
  Website rollback uses a previously verified ready Vercel deployment.
- `apps/web/public/data` and `apps/web/public/assets` are the only editable
  Website-managed public data and asset roots.
- `Mochirii-Wushu/Mochirii-Pets` owns fresh Unity source. `/games/mochi-pets`
  remains a public Website concept with a fail-closed optional tester doorway;
  playable Web/iOS artifacts and provider activation remain deferred.
- `services/social` remains the current application source for Mōchirīī Social.
  Registration remains closed and federation remains disabled. Runtime and
  provider truth require fresh readback before any release or recovery claim.

## Verified Local Candidate

- The validated predecessor integration candidate is
  `bdbe9a7e8fb47646588754cf6fc1e4f6a15dc146` with tree
  `5ff295a4f5df0525a362dca5483243e7bfe3c9f9`, based on and 114 commits ahead
  of `main` at `2eec9e467b4679fd77648ef61e77cf246ec9589b` at the 2026-08-01 readback.
- Its source contains 53 migrations and 49 configured Edge Functions with
  31 `verify_jwt=true` and 18 false.
- A unique non-shared local Supabase lane applied 53/53 migrations and passed
  603/603 pgTAP assertions. Warning-level database lint and security findings
  were zero; unindexed foreign keys were zero. Sixty `unused_index` INFO
  observations on a fresh empty database are not deletion evidence.
- These are local source-validation results only. They do not prove hosted
  migration/function parity, provider configuration, production data, or live
  application acceptance.
- The successor source packet extends that predecessor with the fail-closed
  storefront readiness ledger and official guild-profile presentation. Those
  source changes do not authorize Shopify upload, publication, checkout,
  payment, social publication, authentication changes, or any provider
  mutation.

## GitHub Release Gate

- The Website `main` ruleset currently requires exactly `validate`,
  `validate-next`, `Vercel`, `supabase-local-preview`, `validate-theme`, and
  `validate-social`, with strict current-head enforcement.
- `supabase-local-preview` is the required source-owned PR database/Edge check.
  Hosted `Supabase Preview` is no longer a required context. Supabase Automatic
  Branching was not changed during this transition and remains disabled and
  plan-locked in the dated dashboard readback.
- The 2026-08-01 GitHub snapshot reports 15 open Website PRs: #536 and
  #538–#551. It reports no open Social or Social Mobile PR, one open Mochi Pets
  PR (#4, unstable), and no open Reaper or Forums PR. Re-read GitHub before any
  merge, close, or branch cleanup; this snapshot is not a cleanup allowlist.

## Security, Data, and Operations

- Production CSP is enforced. The Website security-header contract includes
  the narrowed `Access-Control-Allow-Origin` policy. Cloudflare remains DNS-only
  for the Vercel Website records. Any Cloudflare, DigitalOcean, DNS, firewall,
  or Social host change remains separately approval-gated.
- Supabase remains the authority for Auth, Postgres, RLS, Storage, Edge
  Functions, signed media, Discord verification, Gallery, raffle, and shared
  member identity data. Browser code receives only public configuration;
  service-role-only credentials and provider secrets remain server-side.
  The leaked-password protection feature is a separately approval-gated Auth setting whose
  current hosted state requires fresh readback.
- Discord event schedule source is `apps/web/public/data/guild-schedule.json`.
  Event sync is preview-first; apply mode remains an owner-approved provider mutation.
- Vercel Web Analytics and Speed Insights are wired from the app root. Field
  data and provider health must be refreshed rather than inferred from this
  index.
- The detailed provider mutation gates and evidence sequence are in
  [`operations/integration-operations-runbook.md`](./operations/integration-operations-runbook.md).
- The local, no-hosted-egress Supabase CI contract and completed required-check
  transition are in
  [`operations/supabase-local-preview-ci.md`](./operations/supabase-local-preview-ci.md).

## Storefront

- The canonical storefront decision ledger is
  [`operations/SHOPIFY-LAUNCH-READINESS.md`](./operations/SHOPIFY-LAUNCH-READINESS.md).
  Launch policy requires the storefront to stay password-protected and the
  candidate theme unpublished. Source keeps the theme checkout CTA absent;
  Shopify checkout itself remains provider-controlled. Fresh authenticated
  readback is required, and every product, legal, compliance, fulfillment, and
  provider gate remains fail-closed until exact evidence exists.
