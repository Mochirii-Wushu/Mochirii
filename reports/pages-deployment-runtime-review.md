# Pages Deployment Runtime Review

## 1. Current Status

- Latest `main` commit at review start: `055677823057653db67d08c535acb69944691366`
- Checked-in workflows:
  - `.github/workflows/validate-static-site.yml`
  - `.github/workflows/production-smoke.yml`
  - `.github/workflows/manual-lighthouse.yml`
- Checked-in workflow actions after PR #58:
  - `actions/checkout@v5`
  - `actions/setup-node@v5`
  - `actions/upload-artifact@v6`
- GitHub Pages configuration:
  - `build_type`: `legacy`
  - source branch/path: `main` at `/`
  - status: `built`
  - cname: `mochirii.com`
- Latest production check during baseline confirmation: pass, `Production smoke check OK.`
- Latest Pages deployment inspected: run `25355623860`, success.

## 2. Warning Source

The remaining Node.js 20 annotation comes from the GitHub-managed `pages-build-deployment` workflow, not from checked-in repository workflow files.

Evidence:

| Workflow / run | Status | Warning evidence |
| --- | --- | --- |
| `Validate static site` run `25355624424` | Success | No `Node.js 20 actions are deprecated` log line found after PR #58. |
| `pages-build-deployment` run `25355623860` | Success | Warning named `actions/checkout@v4` and `actions/upload-artifact@v4`. |
| `Production smoke check` run `25316199298` | Success | Run predates PR #58 and warned on old checked-in `actions/checkout@v4` and `actions/setup-node@v4`. It was not rerun for this report. |
| `Manual Lighthouse audit` run `25254568144` | Success | Run predates PR #58 and warned on old checked-in `actions/checkout@v4`, `actions/setup-node@v4`, and `actions/upload-artifact@v4`. It was not rerun for this report. |

Latest Pages warning evidence from run `25355623860`:

- run URL: `https://github.com/Mochirii-Wushu/Mochirii/actions/runs/25355623860`
- workflow name: `pages-build-deployment`
- run name: `pages build and deployment`
- event: `dynamic`
- head SHA: `055677823057653db67d08c535acb69944691366`
- job with warning: `build`
- visible steps in the generated job: `Checkout`, `Build with Jekyll`, `Upload artifact`, `Post Checkout`, `Complete job`
- exact action names in the warning: `actions/checkout@v4`, `actions/upload-artifact@v4`

The checked-in `.github/workflows/*.yml` files do not contain `actions/checkout@v4`, `actions/setup-node@v4`, or `actions/upload-artifact@v4` after PR #58. They also do not define Pages deployment jobs. Because the warning comes from a generated legacy Pages workflow, repo-controlled workflow files cannot update those generated action versions directly without changing the deployment model.

## 3. Options

### Option A - Wait for GitHub-managed Pages updates

This preserves the current deployment behavior. It is the lowest-risk option because Pages deployment is still succeeding, production smoke checks pass, and the warning is currently an annotation rather than a failing check.

Tradeoff: the warning remains visible until GitHub updates the generated legacy Pages workflow or changes its action runtime internally.

### Option B - Migrate to a checked-in Pages deployment workflow

This would give the repository direct control over Pages deployment action versions and could remove the generated workflow warning by replacing the legacy branch deployment path with a checked-in workflow using Node 24-compatible Pages actions.

Tradeoff: this changes the deployment path. It should not be done in this report-only branch and should happen only in a separate implementation branch after explicit approval, with production deployment verification.

### Option C - Add environment overrides

This is not preferred. `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` can be useful as a diagnostic compatibility check for repo-controlled workflows, but the checked-in workflows already use Node 24-compatible action versions. Adding env overrides would not be a clean primary fix for the generated Pages workflow.

Do not add `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION`.

## 4. Recommendation

No repository change is needed now. Monitor the GitHub-managed Pages warning while keeping the current legacy Pages deployment path intact.

Create a separate scoped branch only if one of these happens:

- GitHub-managed Pages warning becomes a blocking failure.
- The team explicitly approves evaluating a migration from legacy branch deployment to a checked-in Pages deployment workflow.
- Production deployment behavior changes unexpectedly.

## 5. Validation Notes

Baseline checks before creating this report branch:

| Command | Result | Notes |
| --- | --- | --- |
| `npm run check` | Pass | Known MP3 size warning only. |
| `git diff --check` | Pass | No whitespace errors. |
| `npm run check:production` | Pass | `Production smoke check OK.` |
| `npm run smoke:gallery || true` | Non-blocking local-server limitation | `ERR_CONNECTION_REFUSED` because no local server was running at baseline check time. |

Report-branch validation:

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

## 6. Protected Content

This report-only branch must not change:

- `data/home.json` `seal.verse`
- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`
- `data/twills.json` `profile.bio`

Protected content diffs were empty during report-branch validation.
