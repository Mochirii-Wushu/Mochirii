# Local Development Toolchain

This repo uses project-local tooling where possible so Codex, local terminals,
and CI run the same checks before website changes reach Vercel.

## Required Local Tools

- Node.js `22.23.1` via `fnm`; `.node-version` and `.nvmrc` pin the repo.
- npm `10.x`, bundled with the pinned Node.js runtime.
- Git and GitHub CLI for branch, PR, and repository hygiene.
- Deno `2.9.2` for Supabase Edge Function tests, matching GitHub Actions.
- Docker Desktop for Supabase local containers.
- Supabase CLI as a root dev dependency; run through `npm` or
  `node_modules/.bin/supabase` to avoid the root `supabase.js` name collision.
- Playwright Chromium for local browser smoke tests.
- Lighthouse as a root dev dependency for repeatable performance audits.
- Vercel CLI as an `apps/web` dev dependency for local Vercel build parity.
- ImageMagick and `jq` for image and JSON utility work.

## Setup

```powershell
fnm use 22.23.1
deno upgrade --version 2.9.2
npm ci
npm run setup:playwright
cd apps\web
npm ci
```

Docker Desktop should be running before Supabase local-stack commands. Verify it
with:

```powershell
docker run --rm hello-world
```

## Verification

From the repository root:

```powershell
npm run toolchain:check
npm run check
git diff --check
```

For the Next/Vercel app:

```powershell
cd apps\web
npm run toolchain:check
npm run lint
npm run build
npm run vercel:build:local
```

For root static browser smoke:

```powershell
npm run smoke:gallery:serve
# In another terminal:
npm run smoke:gallery
```

## Source Basis

- Node.js version parity follows the repo and CI contract in `AGENTS.md`.
- Vercel CLI local build usage follows the Vercel CLI docs and
  `apps/web/README.md`.
- Supabase CLI usage follows Supabase local-development guidance; the CLI is
  installed locally, not globally.
- Playwright browser installation follows the official Playwright browser
  install workflow.
- Lighthouse audits use the local package instead of `npx --yes` so the audit
  version is locked.
