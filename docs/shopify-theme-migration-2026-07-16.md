# Shopify theme repository separation

Date: 2026-07-16

The public Shopify theme candidate was selected from a sealed, point-in-time
local snapshot and imported into `apps/shopify-theme`. The source checkout
continued to change after that seal, so this candidate does not claim current
source parity or preservation of later work. No provider, storefront, domain,
secret, remote, or public Git history was changed by this import.

## Included

- Current storefront runtime files under `assets`, `blocks`, `config`,
  `layout`, `locales`, `sections`, `snippets`, and `templates`.
- Public theme packaging metadata, locked Shopify CLI dependency metadata, and
  repository-native validation.
- A SHA-256 migration manifest covering the complete selected runtime file set.
- A fail-closed candidate configuration with product publication and commerce
  disabled and the corporate/legal name blank.
- A release-safety check that rejects internal product metadata, unguarded
  prices/cart behavior, and full Shopify Product structured data.

## Excluded

- Source Git history and mixed-brand branches, tags, pull-request metadata, and
  provider configuration.
- Catalog research, supplier/source records, costs, source and mockup IDs,
  admin exports, screenshots, sample records, legal reviews, and launch ledgers.
- Label production work and source-fact tooling that depend on private evidence.
- Credentials, environment files, private evidence, temporary crops, generated
  archives, caches, virtual environments, and dependency directories.
- Source workflows. This repository owns a path-scoped validation workflow and
  contains no theme publication or deployment job.

The sealed point-in-time source state was preserved separately through Git
bundles, binary patches, file inventories, checksums, and an encrypted local
archive, and restoration was tested for that seal. Those recovery materials are
intentionally outside this public repository. The materials and public
migration manifest are unsigned because no approved signing identity was
available.

This sanitized tree does not remove objects from earlier public commits,
pull-request references, caches, backups, or old clones. Public-history review
and any approved targeted rewrite remain a separate blocking operation.
