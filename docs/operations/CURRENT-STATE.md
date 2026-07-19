# Current Mochirii State

Updated: 2026-07-18 PDT

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

## Deferred

- Mochi Pets dependency pull requests and game runtime development.
- Shopify payment setup, password removal, physical samples, and public launch.
- ActivityPub federation.
- Cloudflare, DNS, Spaces, Droplet-size, and unrelated provider changes.
- Unused Supabase index removal and paid leaked-password protection.
