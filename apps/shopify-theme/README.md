# Mochirii Cosmetics Shopify theme

This directory contains the public, deployable Online Store 2.0 theme source
for Mochirii Cosmetics. It intentionally contains storefront runtime files and
generic validation metadata only.

Private supplier records, costs, source identifiers, samples, legal reviews,
operator checklists, credentials, admin exports, and launch ledgers are not
part of this repository. They must never be reconstructed from public data or
added to this directory.

The locked package can generate and validate an SPDX 2.3 software bill of
materials with `npm run check:sbom`; its document namespace and creation time
are intentionally generated at execution time.

The imported candidate keeps `product_publication_approved` and
`checkout_enabled` false in `config/settings_data.json`, and leaves the legal
entity name blank. Product and cart data do not render through the theme until
their separate approvals are enabled. These repository controls do not replace
provider-side product status or storefront-password review. Store password
state, checkout activation, theme publication, product changes, domains,
payments, orders, and paid applications remain separate provider-side actions
and are never performed by repository CI.

The migration manifest records a verified point-in-time snapshot, not current
source parity. It is unsigned because no approved signing identity was
available. Existing public history was not rewritten by this import and remains
a separate review and remediation gate.

## Validate locally

```powershell
npm ci
npm run check
npm run theme:package
git diff --check
```

`theme:package` creates a local ignored archive. It does not upload or publish
the theme. `check:release-safety` fails if publication, commerce, legal-name,
internal-product-data, or structured-data safeguards regress.
