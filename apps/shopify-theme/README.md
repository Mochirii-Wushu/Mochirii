# Mochirii Cosmetics Shopify theme

This directory contains the public, deployable Online Store 2.0 theme source
for Mochirii Cosmetics. It intentionally contains storefront runtime files, a
nondeployable approved public-copy contract, and pure generic validation
tooling only. All Mochirii website and storefront work belongs in
`Mochirii-Wushu/Mochirii`; none belongs in another brand repository.

Private supplier records, costs, source identifiers, samples, legal reviews,
operator checklists, credentials, admin exports, and launch ledgers are not
part of this repository. They must never be reconstructed from public data or
added to this directory.

The locked package can generate and validate an SPDX 2.3 software bill of
materials with `npm run check:sbom`; its document namespace and creation time
are intentionally generated at execution time.

`content/approved-customer-copy.json` preserves the reviewed English home SEO,
page copy, collection copy, and exact-20 product description/SEO set. It is
excluded by `.shopifyignore`, contains no prices, inventory, supplier records,
provider identifiers, or private evidence, and explicitly grants no theme
publication, provider mutation, or commerce authority. The pure seven-column
copy helper additionally requires the exact current `Option1 name` and
`Option1 value` from a fresh pre-import product export. When those values are
copied unchanged, the helper preserves option identity and reduces the risk of
accidentally recreating or deleting variants. It cannot verify provider
freshness, never invents option values, and neither reads nor writes provider
state. Generating a validated CSV does not authorize importing it.

The imported candidate keeps `product_publication_approved` and
`checkout_enabled` false in `config/settings_data.json`, and leaves the legal
entity name blank. Product and cart data do not render through the theme until
their separate approvals are enabled. These repository controls do not replace
provider-side product status or storefront-password review. Store password
state, checkout activation, theme publication, product changes, domains,
payments, orders, and paid applications remain separate provider-side actions
and are never performed by repository CI.

The migration manifest records the 2026-07-18 sanitized reconciliation through
the approved copy-only source review. The source work is preserved through an
encrypted working-tree snapshot and remote Git, with a successful private-
archive round trip and verified Git bundles outside this repository. A complete
restoration in a fresh disposable clone is not claimed. The manifest covers the
selected runtime, approved public-copy record, and pure generic CSV/tooling
contract, but deliberately does not claim byte parity with private evidence or
provider workflows. It is unsigned because no approved signing identity was
available. Existing public history was not rewritten by this import and
remains a separate review and remediation gate.

## Validate locally

```powershell
npm ci
npm run check
npm run theme:package
git diff --check
```

`theme:package` creates a local ignored archive. It does not upload or publish
the theme. `check:release-safety` fails if publication, commerce, legal-name,
internal-product-data, gift-card, warning-copy, or structured-data safeguards
regress. `check:approved-copy` validates the public-copy schema, source review,
exact counts, SEO constraints, runtime parity, packaging exclusion, and false
authorization flags. The generic CSV helpers are pure validation/serialization
code. Their synthetic exact-20 contracts emit only reviewed copy or structured
list-metafield columns; they do not read private files, write output, or call
Shopify.
