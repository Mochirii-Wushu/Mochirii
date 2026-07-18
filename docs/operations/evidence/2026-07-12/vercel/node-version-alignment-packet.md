# Vercel Node Version Alignment Packet

Prepared: 2026-07-12 PDT

## Verified State

- Vercel project `mochirii/mochirii` reports project Node.js Version `24.x`.
- `apps/web/package.json` requires Node `22.x`.
- Hosted builds use Node `22.x` because the repository engine declaration
  overrides the project setting.
- Vercel emits the mismatch warning twice in each hosted build.
- PR #453 aligned `outputFileTracingRoot` and `turbopack.root`; the separate
  root-mismatch warning is gone in preview and production.

## Provider Action

Change only the Vercel project Node.js Version from `24.x` to `22.x`. Do not
change regions, framework, root directory, build commands, domains, environment
variables, integrations, deployment protection, or Git settings.

This is configuration alignment, not a runtime upgrade: the repository already
selects Node 22 for hosted builds.

## Acceptance

- Project readback reports Node.js Version `22.x`.
- A new preview uses Node 22 and no longer emits the project-versus-engine
  warning.
- `npm ci`, lint, production build, and protected hosted checks remain green.
- Current production aliases and Function region remain unchanged.

## Rollback

If Vercel rejects the setting or a hosted build changes behavior, restore only
the project Node.js Version to `24.x`; the repository engine continues to pin
the actual build runtime to Node 22.

## Exact Approval

```text
Approve changing only the Vercel Node.js Version setting for project mochirii/mochirii from 24.x to 22.x, leaving regions, domains, environment variables, integrations, build settings, deployment protection, and all other project settings unchanged, followed by one no-secret preview build readback.
```
