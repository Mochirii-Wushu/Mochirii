# Repository Ownership

This matrix is the durable boundary for Mochirii source, hosted integrations,
credentials, and operational evidence.

| Capability | Source owner | Hosted owner | Notes |
| --- | --- | --- | --- |
| Public website and routes | `Mochirii-Wushu/Mochirii` `apps/web` | Vercel | `apps/web/public` is the only tracked website asset/data source. |
| Storefront theme | `Mochirii-Wushu/Mochirii` `apps/shopify-theme` | Shopify | Theme publication and shared store-record writes remain separately gated. |
| Shared backend | `Mochirii-Wushu/Mochirii` `supabase` | Supabase | Secrets remain runtime-only; schema changes are migration based. |
| Guild social | `Mochirii-Wushu/Mochirii` `services/social` | DigitalOcean and Spaces | Federation remains disabled. Runtime state is never committed. |
| Mochi Pets doorway and access bridge | `Mochirii-Wushu/Mochirii` | Vercel and Supabase | Owns `/games/mochi-pets`, access checks, and browser bridge. |
| Mochi Pets game | `xartaiusx/mochi-pets` | Its separately approved game runtime | Owns game source, assets, builds, and runtime manifests. |
| Local credentials and supplier evidence | No Git repository | `Mochi Creds` and protected provider secret stores | Never committed, logged, copied into artifacts, or exposed to browser code. |
| Durable runbooks | `docs/operations` | GitHub | Markdown only; no secret values or signed URLs. |
| Generated evidence | `.artifacts/operations` | Local ignored storage | Screenshots, logs, JSON readbacks, and rollback exports stay untracked. |

## Public Branding Boundary

Customer and guild-leader surfaces use Mochirii branding and product language.
Infrastructure and supplier names belong only in dependencies, internal code,
CI, required license attribution, and no-secret integration or operations
documentation. Supplier identities, costs, formula evidence, design identifiers,
and mockup source records stay under `Mochi Creds/Shopify`.

Required upstream framework names and license notices remain unchanged. A brand
boundary is not permission to remove open-source attribution.

## Change Rules

1. Start each repository phase with `git status --short --branch` and preserve
   existing work.
2. Use one focused branch and protected pull request per independently
   deployable change.
3. Keep hosted deployments immutable and traceable to a reviewed commit and,
   for Social, an exact image digest and SBOM.
4. Store provider values in protected environments and runtime secret stores;
   docs list names and destinations only.
5. Keep Mochi Pets provider and runtime changes outside website consolidation
   work unless separately approved.
