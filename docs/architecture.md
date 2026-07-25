# Mochirii System Architecture

`Mochirii-Wushu/Mochirii` is the source repository for the public website,
storefront theme, hosted guild-social application, and shared backend. Production
systems deploy from reviewed commits; the workstation is never a serving or job
processing dependency.

## Repository Layout

| Path | Owner | Hosted runtime |
| --- | --- | --- |
| `apps/web` | Public website and hosted game doorways | Vercel |
| `apps/shopify-theme` | Customer storefront theme | Shopify |
| `services/social` | Guild-social application and production image | DigitalOcean Droplet and Spaces |
| `supabase` | Database migrations and Edge Functions | Supabase |
| `docs/integrations` | No-secret provider contracts and architecture notes | GitHub |
| `docs/operations` | No-secret runbooks and dated release evidence | GitHub |
| `.artifacts/operations` | Generated local evidence and rollback exports | Ignored; never committed |

The canonical website data and public assets live in `apps/web/public`. The
retired root static site is preserved by the `legacy-static-final-2026-07-18`
release and is not an editable production source.

The current tree, paths, and commit messages contain no former-brand or supplier
branding. A small set of pre-consolidation commits contains removed wording in
historical patches. Rewriting those commits would invalidate review and release
history, so `scripts/repository-boundary-history-baseline.json` locks the exact
known set and CI rejects every new occurrence.

## Hosted Boundaries

- GitHub is the source, review, CI, container registry, and delivery control
  plane. GitHub-hosted runners are used; no workstation or production-host
  runner is permitted.
- Vercel serves `mochirii.com` from `apps/web`.
- Supabase owns Auth, Postgres, RLS, and Edge Functions under `supabase`.
- Shopify hosts `shop.mochirii.com`; `apps/shopify-theme` is its reviewed theme
  source. Store records remain provider-managed and require a rollback export
  before mutation.
- The DigitalOcean runtime pulls an immutable image built from
  `services/social`; database, cache, queues, schedules, media, and backups run
  online without workstation processes.
- Cloudflare remains an edge and DNS boundary. Provider configuration changes
  require exact, scoped approval.
- Discord/Reaper runs through hosted Edge Functions. No local bot process is a
  production dependency.

## Future Game Boundary

No active game repository or runtime is part of this architecture.
`/games/mochi-pets` is a static, noindex Website route with no browser bridge or
backend dependency. A future game must begin as a separately approved fresh
Unity project in the `Mochirii-Wushu` GitHub organization and establish a new
versioned integration contract before the static page changes.

See [repository ownership](operations/repository-ownership.md) for the detailed
change and deployment matrix.
