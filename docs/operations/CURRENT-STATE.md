# Current Mochirii State

Updated: 2026-07-19 PDT

This no-secret file records the current hosted and repository state. Update it
after a completed release or ownership change; do not place credentials,
provider exports, customer data, signed URLs, or mutable access details here.

## Canonical Sources

- Repository: `Mochirii-Wushu/Mochirii`.
- Local checkout: `C:\Github Repo's\Mochirii Website\Website`.
- Resolve current production source with `git fetch --prune origin` and
  `git rev-parse origin/main`; do not rely on an undated copied SHA.
- `apps/web` is the Vercel/Next.js website source.
- `apps/shopify-theme` is the Shopify theme source.
- `services/social` is the DigitalOcean-hosted Mochirii Social source.
- `supabase` contains migrations and Edge Functions for the hosted backend.
- `xartaiusx/mochi-pets` remains a separate connected game repository. The
  website owns its doorway and shared contracts; the game repository owns game
  source, assets, builds, and runtime manifests.

The duplicate root static website is retired. Release
`legacy-static-final-2026-07-18` contains its final restorable artifact;
`apps/web/public/assets` and `apps/web/public/data` are the only editable public
asset and data sources.

## Consolidation Ledger

- PR #459 applied Shopify shared-copy packet `2026-07-18-v2` and merged as
  `eba818418c85bc54ab0f0a4c9edf989dfdf0e902`.
- PR #460 established monorepo boundaries, ownership documentation, repository
  guards, durable operations evidence, and static-site retirement; it merged as
  `54e00b5c6ec99a38a0791717f109a9acb1f340cc`.
- PR #461 imported the sanitized Social current tree under `services/social`
  and added path-aware validation, immutable image publication, deployment,
  recovery, and online-verification workflows; it merged as
  `138f7f2c8c244315c7e7354638c389a6e2fd55df`.
- PR #472 removed unused Social browser dependencies, updated `js-cookie`, and
  refreshed generated assets; it merged as
  `ef5675575aeea6cb41def256d0a889f60f963ff8`.
- PR #476 updated reviewed GitHub Action pins and merged as
  `69479d7`.
- PR #477 updated compatible website dependencies and merged as `bb60097`.
- PR #478 completed the consolidation closeout documentation and made
  `validate-theme` an always-reporting path-aware check; it merged as
  `b0c117e855375a2b1a1a7ff2110c2d60f6733015`.
- Mochi Pets PR #27 published the scoped workspace path and ownership update;
  its current `main` is `0f9fcc17a6da466ac66548da856b704d05150ce1`.

The superseded Shopify and Social repositories were exported as mirror clones,
verified `--all` bundles, and no-secret provider metadata. Their encrypted
archives and manifests are pinned and synchronized under the approved private
recovery boundary. GitHub then confirmed both superseded repositories deleted,
while the private GHCR package remained linked to the canonical repository.
Generated local evidence now lives only under ignored `.artifacts/operations`.

## Hosted Services

- `mochirii.com` remains hosted by the existing Vercel project and deploys from
  protected `main` with Root Directory `apps/web`.
- Supabase project `deyvmtncimmcinldjyqe` remains the hosted Auth, Postgres, RLS,
  and Edge Function backend.
- `shop.mochirii.com` remains password-protected. Payments and checkout remain
  disabled. Theme `141514408011` remains unpublished.
- `social.mochirii.com` remains on the single Singapore DigitalOcean Droplet
  with Spaces-backed media. Registration is closed and ActivityPub is disabled.
- Production serving, queues, schedules, authentication, media, releases, and
  backups do not depend on the local workstation.

GitHub protects `main` with strict required checks for `validate`,
`validate-next`, `validate-theme`, `validate-social`, `Vercel`, and
`Supabase Preview`. The latest closeout readback found no open canonical pull
requests, Dependabot alerts, code-scanning alerts, or secret-scanning alerts.

## Social Release

- The canonical private GHCR package is
  `ghcr.io/mochirii-wushu/mochirii-pixelfed-ops`.
- The deployed canonical image digest is
  `sha256:1fd27c8f76595595912e6f12f1677c7f108aa50f64b38a85089006b47ad395f1`.
- Image workflow run `29664477462`, protected deployment run `29664673632`,
  and hosted verification run `29664734313` completed successfully.
- Caddy, Pixelfed, MariaDB, Redis, Horizon, scheduler, Spaces access, public
  boundaries, and federation-disabled posture passed the hosted verification.
- Post-deletion online verification run `29665954934` passed the same runtime,
  Spaces, website, Supabase, Reaper, and Discord boundaries.
- Final current-`main` online verification run `29666572246` passed after the
  consolidation closeout and ruleset update.
- Residual transitive Vue 2 advisory findings are tracked in issue #475 and are
  accepted only as a temporary compatibility risk. No open Dependabot alert is
  left without that explicit disposition.

## Workspace

The supported local workspace contains:

```text
C:\Github Repo's\Mochirii Website\
  Website\      Canonical website, theme, Social, and Supabase repository
  Mochi Pets\   Separate connected game repository
  Mochi Creds\  Private synchronized credential and recovery boundary
  AGENTS.md      Umbrella workspace guidance
```

Durable no-secret runbooks belong in `docs/operations`. Provider contracts
belong in `docs/integrations`. Screenshots, logs, JSON readbacks, exports, and
generated archives belong only in ignored `.artifacts/operations`.

## Shopify Opening Readiness

- [`SHOPIFY-LAUNCH-READINESS.md`](./SHOPIFY-LAUNCH-READINESS.md) is the
  canonical no-secret decision ledger for the United States-only storefront
  opening and its 72-hour low-promotion soft launch.
- Customer-copy revision `2026-07-18-v2` is now recorded as immutable public
  content, separate from its consumed provider-write approval and verified
  2026-07-18 readback history. The shared-copy write is Applied, not Pending;
  no current provider-write, publication or commerce authority follows from
  that history.
- Existing reachable public Git history was reviewed on 2026-07-19 and
  accepted without rewriting. That disposition does not remove prior objects
  and is not authorization for a future history rewrite.
- The canonical Mochirii emblem design is universal across the guild site,
  storefront and product label/media review. The exact commerce wordmark is
  **Mochirii Cosmetics**. A 2026-07-19 read-only candidate review found a
  different minimalist mark on representative Peptide Smoothing Serum
  packaging while the header used the canonical emblem, so that SKU currently
  fails parity. No physical label or other image is accepted by the source
  declaration: an emblem or wordmark mismatch blocks the affected SKU, and all
  twenty require label artwork, mockup/media, physical-label and box review.
- The ledger contains exactly the twenty products in approved customer-copy
  contract `2026-07-18-v2` and the 2026-07-18 authenticated read-only Shopify
  readback. All twenty are Active with USD prices, but inventory is not tracked
  and each says Shop location is its single fulfilling location. Nonblank SKUs
  and physical weights were confirmed, while fifteen PDPs still render the
  generic warning fallback. These facts do
  not clear product evidence, labels, formula/INCI, warnings, safety, MoCRA,
  claims, variants, fulfillment, privacy, tax, or launch operations.
- Non-payment provider blockers include the Basic development-store state,
  United States tax set to Not collecting, untracked inventory, unresolved
  physical-weight correctness and fulfillment locations, EUR-denominated US
  shipping-profile tiers in admin, and an unbranded notification sender. No
  provider setting was changed.
- All twenty release dispositions remain blocked until their evidence and
  provider fields are reviewed. Unknown private or external facts are recorded
  as Pending rather than inferred.
- The reconciled foundation revision passed the clean lockfile install,
  complete repository check, Shopify theme check and package, release-safety
  guards, JavaScript syntax, Theme Check with zero offenses, and
  `git diff --check` locally on 2026-07-19. The prior PR #480 head also had a
  clean required-check rollup; Supabase Preview reported Skipped for that
  theme/docs-only head and did not block GitHub's clean merge-state result. The
  updated PR head still requires remote checks and accountable human review,
  and downstream product and storefront packages require validation at their
  own final source-bound commits. The pull request remains draft and unmerged.
  The optional local toolchain audit found Docker Desktop's Linux engine was
  not running; no system service or provider state was changed to work around
  that workstation-only limitation.
- The revised plan authorizes a single reversible upload of the exact
  human-reviewed, merged-main package to unpublished candidate theme
  `141514408011` while `checkout_enabled` stays false. The required rollback
  capture, merged source/package binding, upload and post-write readback are
  still Pending. This boundary does not authorize a repeat upload, shared
  record changes, theme publication, checkout, password removal or commerce.
- Prepayment acceptance now covers configuration and candidate-storefront
  evidence only. End-to-end checkout quotations, payments, order creation,
  inventory decrement, notifications, cancellation, refunds, fulfillment and
  payouts remain payment-dependent Gate F tests and cannot be inferred from a
  prepayment readback.
- Payment setup and payment/order-lifecycle testing are intentionally the final
  readiness phase. They do not begin until every non-payment gate is Ready and
  the owner gives exact approval for that provider action.
- Storefront password protection and disabled checkout remain in effect, and
  theme `141514408011` remains unpublished. Publication, password removal,
  purchases, real orders, and public launch remain separately approval-gated.

## Deferred

- Mochi Pets dependency pull requests and game runtime development.
- Shopify product-evidence review, physical samples, remaining operational and
  provider validation, approved change packets, rollback exports, final
  payment setup, password removal, and public launch under the
  opening-readiness ledger.
- ActivityPub federation.
- Cloudflare, DNS, Spaces, Droplet-size, and unrelated provider changes.
- Unused Supabase index removal and paid leaked-password protection.
