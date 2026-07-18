# Shopify theme repository separation and reconciliation

Initial separation: 2026-07-16. Current reconciliation: 2026-07-17.

The public Shopify theme candidate was first selected from a sealed local
snapshot and imported into `apps/shopify-theme`. On 2026-07-17, the source
checkout's later committed work and preserved working-tree delta were reviewed
against the public-repository boundary. A subsequent structured-filter
hardening integration on the source main branch was then reviewed and
reconciled as a second pass. A new quiescent preservation pass captured that
clean post-merge state in a verified encrypted snapshot, completed an encrypted
archive round trip, and verified the Git bundles outside this repository. No
source checkout file, branch, index, remote, provider setting, storefront,
domain, or public Git history was changed by either reconciliation pass or the
read-only preservation capture.

The candidate is current through that reviewed snapshot only for the selected
public surface. It deliberately does not claim byte parity with the private
source because private evidence, provider operations, and unsafe launch
defaults are excluded.

## Included or reconciled

- Storefront runtime files under `assets`, `blocks`, `config`, `layout`,
  `locales`, `sections`, `snippets`, and `templates`.
- Responsive desktop/mobile navigation and its CSS, with product, search, cart,
  and configured-menu output still behind publication and commerce approval.
- Search/social metadata fallback and image dimensions without exposing
  unpublished product or collection images.
- Support-menu and privacy-choice navigation while the verified legal entity
  name remains blank and has no public fallback.
- A gift-card template whose value, code, QR data, balance, and redemption UI
  render only when both publication and commerce are approved. The default
  state is noindexed and unavailable.
- A missing-warning state that tells visitors to review the label instead of
  inferring that an empty field means no additional warnings.
- The current locked Shopify CLI patch release and deterministic SPDX 2.3 SBOM
  input metadata.
- A pure, side-effect-free filter-metafield CSV helper and synthetic tests. The
  post-snapshot exact-20 title-to-current-handle contract and the
  `skin_type_options` and `concern_options` structured list definitions are
  represented without real product data. Inputs fail closed for missing,
  duplicate, ambiguous, empty, or spreadsheet-formula-shaped values. The
  helper contains no real handles, products, source identifiers, prices, SKUs,
  or file paths and cannot read, write, or submit a provider update.
- Public release-safety checks replace the private source contract orchestration
  and enforce that the generic helper cannot access files, environment values,
  child processes, networks, or provider mutation operations.
- A SHA-256 migration manifest covering the complete selected runtime and the
  two reviewed generic-tooling files.

## Deliberately excluded

- Source Git history and mixed-brand branches, tags, pull-request metadata,
  workflows, and provider configuration.
- Catalog research, product/source records, costs, formulas, source and mockup
  identifiers, admin exports, screenshots, sample records, physical-label
  artwork, legal reviews, and launch ledgers.
- Scripts that read private manifests, generate provider mutation packets,
  apply product facts or pricing, inspect authenticated exports, manage
  inventory, or write evidence files.
- The source package/check orchestration that depends on private catalog and
  provider evidence. Its publishable filter definitions and validation behavior
  are represented by the public pure helper, synthetic tests, and release-safety
  guard instead.
- Internal product metadata and source-side defaults that expose legal-name
  fallbacks, unreviewed products, prices, availability, cart behavior, full
  Product structured data, or inferred warnings.
- Credentials, environments, private evidence, temporary files, generated
  evidence/label artifacts, caches, virtual environments, and dependency
  directories.

The public candidate keeps `product_publication_approved` and
`checkout_enabled` false and the corporate/legal name blank. These repository
controls do not prove provider-side password, product, market, payment, or theme
state. Publication, password removal, product mutation, checkout activation,
payments, domains, orders, and paid resources remain separately approval-gated.

The current clean post-merge source snapshot, encrypted archive round trip, and
Git bundles are verified. This document does not claim that a complete
restoration was exercised in a fresh disposable clone. Earlier recovery bundles
remain separate. The public manifest remains unsigned because no approved
signing identity was available.

This sanitized tree does not remove objects from earlier public commits,
pull-request references, caches, backups, or old clones. Public-history review
and any approved targeted rewrite remain a separate blocking operation.
