# Hosted Integrations

This directory documents the no-secret contracts that connect the canonical
repository to hosted providers. It may record project names, regions, expected
environment-variable names, callback paths, deployment ownership, and rollback
procedures. It must never contain credential values, cookies, signed URLs,
private keys, customer data, supplier costs, or private formula evidence.

## Ownership

- Website delivery: Vercel Git integration from protected `main`.
- Backend delivery: Supabase migrations and Edge Functions from protected
  `main`.
- Storefront delivery: Shopify theme source under `apps/shopify-theme`; theme
  publishing remains an explicit release action.
- Social delivery: GitHub Actions publishes a private immutable GHCR image;
  the restricted production workflow deploys that digest to the Droplet.
- Edge and DNS: Cloudflare settings remain provider-managed and evidence-gated.
- Community automation: Discord interactions are served by hosted Edge
  Functions, never a workstation process.

Operational steps and dated evidence belong in `docs/operations`.

## Exposure Catalog

[`integration-exposure-catalog.v1.json`](integration-exposure-catalog.v1.json)
is the machine-readable, no-secret source catalog for active or
activation-gated integrations and every Edge Function declared in
`supabase/config.toml`. Each record names its destinations, data classes,
authorization boundary, accountable operating role, disable control, runbook,
verification profile, and source evidence.

The catalog records repository declarations only. Provider deployment state,
versions, settings, schedules, credentials, health, and usage always remain
`runtime_readback_required`; a green repository check must never be described
as a provider readback. Validate the catalog after any integration, function,
JWT, destination, or runbook change:

```powershell
npm run check:integration-exposure-catalog
```

The check fails unless the catalog matches all 49 configured functions and the
reviewed `31 verify_jwt=true / 18 false` split. A false gateway setting is not
synonymous with anonymous access: the catalog must resolve it to either a
bounded public projection or an explicit in-handler caller boundary.

## Edge response contracts

[`edge-response-contracts.v1.json`](edge-response-contracts.v1.json) is the
machine-readable field and sensitivity allowlist for every configured Edge
Function response state. It records explicit nested paths and narrowly bounded
classified containers for intentionally record-shaped protocol or data
payloads. Text and binary responses have an explicit bounded whole-body
classification. No wildcard path or secret value is allowed.

The check recursively fingerprints each configured entrypoint, all of its
repository-local imports, and the applicable Deno manifests and locks. Source
drift fails until the response-shape states and fields are updated; descriptive
metadata alone cannot acknowledge the drift. Validate the contract and its
fail-closed self-tests after any Edge response or shared DTO change:

```powershell
npm run check:edge-response-contracts
npm run test:edge-response-contracts
```

This is repository evidence only. Preview and production response parity still
require separately authorized runtime verification.

See [Hosted runtime ownership](hosted-runtime.json) and
[the host-independence runbook](../operations/HOST-INDEPENDENCE.md) for the
machine-checked offline-workstation boundary and its remaining readbacks.

See [Mochirii Social delivery](mochirii-social-delivery.md) for the private
container, protected environment, deployment, and recovery contract.

The proposed [cross-repository contract registry](cross-repository-contract-registry.v1.json)
and its [JSON schema](cross-repository-contract-registry.v1.schema.json) provide
reviewable, no-secret evidence for future repository boundaries. They do not
activate a cutover or delegate shared Supabase ownership: Website remains the
sole source and deployer for the shared project, while Reaper consumes the
published contracts.

See [Gallery public media delivery](gallery-public-media-delivery.md) for the
versioned thumbnail-only list, opaque-ID original resolution, keyset snapshot,
and private Storage boundary.

See [Facebook Page Gallery publishing](facebook-page-gallery-publishing.md) for
the Page-only approval outbox, immutable consent, exact-media verification,
Meta permission boundary, and manual Facebook Group handoff.

See [Instagram Gallery publishing](instagram-gallery-publishing.md) for the
official Business-account identity, Page-linked Graph API boundary,
moderator-approved queue, server activation flag, and current manual gates.
