# GitHub Actions Node 24 Maintenance Review

## 1. Workflows Inspected

- `.github/workflows/manual-lighthouse.yml`
- `.github/workflows/production-smoke.yml`
- `.github/workflows/validate-static-site.yml`

The repository also has a GitHub-managed `pages-build-deployment` workflow because GitHub Pages is configured as legacy branch deployment from `main` at `/`. That workflow is not stored in `.github/workflows/`.

## 2. Actions Used

| Workflow | Job / step | Action | Previous version | Updated version | Related to Node.js 20 annotation? |
| --- | --- | --- | --- | --- | --- |
| Manual Lighthouse audit | `lighthouse` / Check out repository | `actions/checkout` | `v4` | `v5` | Yes. Recent Manual Lighthouse logs named `actions/checkout@v4`. |
| Manual Lighthouse audit | `lighthouse` / Set up Node | `actions/setup-node` | `v4` | `v5` | Yes. Recent Manual Lighthouse logs named `actions/setup-node@v4`. |
| Manual Lighthouse audit | `lighthouse` / Upload Lighthouse reports | `actions/upload-artifact` | `v4` | `v6` | Yes. Recent Manual Lighthouse logs named `actions/upload-artifact@v4`. |
| Production smoke check | `smoke` / Check out repository | `actions/checkout` | `v4` | `v5` | Yes. Recent Production smoke logs named `actions/checkout@v4`. |
| Production smoke check | `smoke` / Set up Node | `actions/setup-node` | `v4` | `v5` | Yes. Recent Production smoke logs named `actions/setup-node@v4`. |
| Validate static site | `validate` / Check out repository | `actions/checkout` | `v4` | `v5` | Yes. Recent Validate logs named `actions/checkout@v4`. |
| Validate static site | `validate` / Set up Node | `actions/setup-node` | `v4` | `v5` | Yes. Recent Validate logs named `actions/setup-node@v4`. |
| GitHub-managed pages-build-deployment | `build` / Checkout | `actions/checkout` | `v4` | Not locally editable | Yes. Latest Pages logs named `actions/checkout@v4`. |
| GitHub-managed pages-build-deployment | `build` / Upload artifact | `actions/upload-artifact` | `v4` | Not locally editable | Yes. Latest Pages logs named `actions/upload-artifact@v4`. |

## 3. Current Node Configuration

- All repository workflow `setup-node` steps keep `node-version: 22`.
- No repository workflow used Node 24 as the project command runtime before this change.
- No repository workflow used `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`.
- No repository workflow used `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION`.
- The warning source is the JavaScript runtime declared by the `uses:` actions, not the Node version used by `npm run check` or `npm run check:production`.
- Official action metadata checked during this review:
  - `actions/checkout@v5` declares `using: node24`.
  - `actions/setup-node@v5` declares `using: node24`.
  - `actions/upload-artifact@v5` still declares `using: node20`, so it was not used.
  - `actions/upload-artifact@v6` declares `using: node24`.
  - `actions/deploy-pages@v5` declares `using: node24`, but this repo does not currently define a custom Pages deployment workflow.
  - `actions/upload-pages-artifact` is a composite action; this repo does not currently use it.

## 4. Annotation Source Evidence

Recent logs inspected with `gh run view --log`:

| Workflow | Run | Evidence |
| --- | --- | --- |
| Validate static site | `25355158083` | Warning named `actions/checkout@v4` and `actions/setup-node@v4`. |
| Production smoke check | `25316199298` | Warning named `actions/checkout@v4` and `actions/setup-node@v4`. |
| Manual Lighthouse audit | `25254568144` | Warning named `actions/checkout@v4`, `actions/setup-node@v4`, and `actions/upload-artifact@v4`. |
| pages-build-deployment | `25355157839` | Warning named `actions/checkout@v4` and `actions/upload-artifact@v4` in the GitHub-managed legacy Pages build. |

The repository workflow sources were identified exactly and updated. The GitHub-managed legacy Pages workflow source was also identified exactly, but it is not a checked-in workflow file, so this branch does not edit it or migrate Pages deployment behavior.

## 5. Changes Applied

- Updated `.github/workflows/manual-lighthouse.yml`:
  - `actions/checkout@v4` to `actions/checkout@v5`
  - `actions/setup-node@v4` to `actions/setup-node@v5`
  - `actions/upload-artifact@v4` to `actions/upload-artifact@v6`
- Updated `.github/workflows/production-smoke.yml`:
  - `actions/checkout@v4` to `actions/checkout@v5`
  - `actions/setup-node@v4` to `actions/setup-node@v5`
- Updated `.github/workflows/validate-static-site.yml`:
  - `actions/checkout@v4` to `actions/checkout@v5`
  - `actions/setup-node@v4` to `actions/setup-node@v5`

No workflow triggers, permissions, validation commands, production smoke commands, Lighthouse commands, Pages settings, or project Node version were changed.

## 6. Remaining Pages Deployment Note

GitHub Pages is currently configured as a legacy branch deployment from `main` at `/`. The generated `pages-build-deployment` workflow still uses `actions/checkout@v4` and `actions/upload-artifact@v4` according to run `25355157839`.

This branch does not convert the site to a custom Pages deployment workflow because that would change Pages deployment behavior beyond the minimal repository workflow action updates. If the legacy Pages workflow continues to emit the Node.js 20 annotation after the repository workflow updates land, the follow-up choices are:

- wait for GitHub to update the generated legacy Pages workflow actions upstream, or
- create a separate scoped branch to evaluate a controlled migration to a checked-in GitHub Pages deployment workflow using Node 24-compatible Pages actions.

## 7. Validation Plan

Required local validation for this branch:

- `npm run check`
- `git diff --check`
- `node scripts/check-json.mjs`
- `node scripts/check-js.mjs`
- `node scripts/check-refs.mjs`
- `node scripts/check-assets.mjs`
- `npm run check:production`
- `npm run smoke:gallery || true`

Workflow validation:

- YAML parse/review for `.github/workflows/*.yml`.
- PR Validate Static Site check after push.
- Post-merge `main` Validate Static Site check.
- Post-merge Pages deployment observation to confirm whether the GitHub-managed Pages annotation remains.

## 8. Protected Content

This workflow-only branch must not change:

- `data/home.json` `seal.verse`
- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`
- `data/twills.json` `profile.bio`

Protected content diffs were empty during local validation.

## 9. Local Validation Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm run check` | Pass | Known MP3 size warning only. |
| `git diff --check` | Pass | No whitespace errors. |
| `node scripts/check-json.mjs` | Pass | `JSON OK (16 files).` |
| `node scripts/check-js.mjs` | Pass | `JavaScript syntax OK (23 files).` |
| `node scripts/check-refs.mjs` | Pass | `Local references OK (321 refs checked).` |
| `node scripts/check-assets.mjs` | Pass | Known MP3 size warning only. |
| `npm run check:production` | Pass | `Production smoke check OK.` |
| `npm run smoke:gallery` | Pass | Passed with a temporary local server on port 8765. |
| Workflow YAML parse | Pass | `.github/workflows/*.yml` parsed successfully with Ruby YAML. |
