# Repository Ownership

This matrix distinguishes verified current ownership from the required terminal
source boundary. A terminal owner is a migration target, not evidence that a
cutover, deployment, provider binding, secret transfer, or source removal has
occurred. The current source and deployment writer remain authoritative until
the separately approved cutover and rollback window pass.

| Capability | Current verified source owner | Required terminal source owner | Hosted owner | Transition status and dependencies |
| --- | --- | --- | --- | --- |
| Public website and routes | `Mochirii-Wushu/Mochirii-Website` `apps/web` | Same | Vercel | `apps/web/public` remains the only tracked Website asset/data source. |
| Storefront theme | `Mochirii-Wushu/Mochirii-Website` `apps/shopify-theme` | Same | Shopify | Theme publication and shared store-record writes remain separately gated. |
| Shared database, identity, and cross-product schema | `Mochirii-Wushu/Mochirii-Website` `supabase` | Same | Supabase | Website retains migrations, RLS, shared tables, identity, generated types, and schema governance. Product repositories consume versioned contracts. |
| Guild Social service | `Mochirii-Wushu/Mochirii-Website` `services/social` | `Mochirii-Wushu/Mochirii-Social` | DigitalOcean and Spaces | The target repository is not the production owner until source parity, immutable delivery, recovery, provider binding, cutover, and rollback evidence pass. Federation remains disabled. |
| Forums service | Empty remote target and no runtime; local, unpushed governance-seed candidate only | `Mochirii-Wushu/Mochirii-Forums` | None until separately approved | The candidate is not a cutover or deployment. Supported configuration, upstream controls, host, mail, backup, restore, and opening remain future gated work. |
| Reaper Discord Gateway and repository-local bot behavior | `Mochirii-Wushu/Reaper-Discord-Bot` | Same | Hosted runtime readback remains pending | Command registration, secrets, persistent hosting, Discord sends, and production verification remain separately gated. |
| Reaper-specific Edge Function handlers and tests | `Mochirii-Wushu/Mochirii-Website` `supabase/functions` | `Mochirii-Wushu/Reaper-Discord-Bot` | Supabase Edge Functions unless an approved successor runtime replaces it | The transition must preserve one deployment writer, Website-owned shared schema, versioned contracts, exact artifact identity, provider readback, and rollback. No cutover is implied here. |
| Mochi Pets concept and tester doorway | `Mochirii-Wushu/Mochirii-Website` `apps/web` | Same | Vercel | Website owns the public concept and protected member-plus-passcode doorway. Its member-bound cookie never authorizes a game runtime. |
| Mochi Pets game and game-specific API source | `Mochirii-Wushu/Mochirii-Pets` Unity foundation; no connected API | `Mochirii-Wushu/Mochirii-Pets` | None until separately approved | Pets owns future Web/iOS artifacts and game-specific API contracts. Shared identity and database governance remain in Website; no playable build is connected. |
| First-party Social mobile application | `Mochirii-Wushu/Mochirii-Social-Mobile` | Same | Future approved iOS distribution target | Mobile consumes Social and Pets contracts or reviewed immutable artifacts; it never receives provider or privileged database secrets. |
| Archived raffle source | `Mochirii-Wushu/Mochirii-Raffle-Spinner` | Read-only archived evidence unless separately approved | None | Prove the archive has no required live dependency before proposing any archive mutation. |
| Local credentials, supplier evidence, and restricted operator records | No Git repository | Same | `Mochi Creds` and protected provider secret stores | Never committed, logged, copied into public artifacts, or exposed to browser code. |
| Durable public-safe runbooks | `docs/operations` | Same | GitHub | Markdown only; no secret values, private evidence, or signed URLs. |
| Generated and restricted evidence | `.artifacts/operations` | Same during local execution; durable restricted storage remains separately governed | Local ignored storage | Screenshots, logs, JSON readbacks, rollback exports, and private control-plane ledgers stay untracked. |

Cross-repository dependencies are recorded in
[`../integrations/cross-repository-contract-registry.v1.json`](../integrations/cross-repository-contract-registry.v1.json).
Its current `target_only_unversioned` state is a gap declaration, not an active
ownership transfer or compatibility guarantee.

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
5. Keep game-source and provider changes in their owning repositories and
   approval packets; Website may consume only reviewed immutable game artifacts.
