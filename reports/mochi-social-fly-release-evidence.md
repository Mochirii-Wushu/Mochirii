# Mochi Social Fly Release Evidence Report

Generated: 2026-06-13T02:29:18.340Z

This file is intentionally no-secret. It validates the website-side Fly release evidence runbook for Mochi Social without contacting hosted providers.

## Result

- OK: yes
- Runbook: docs/mochi-social-fly-release-evidence.md
- Official source links: 9
- Game pre-deploy commands: 11
- Website acceptance commands: 8

## Required Context Files

| File | State |
| --- | --- |
| docs/mochi-social-fly-release-evidence.md | present |
| docs/mochi-social-alpha.md | present |
| docs/mochi-social-alpha-codex-ops.md | present |
| docs/mochi-social-visual-polish.md | present |
| scripts/check-mochi-social-game-contract.mjs | present |
| scripts/check-mochi-social-preview-ready.mjs | present |
| reports/mochi-social-preview-ready.md | present |

## Game Repo Evidence Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | game repo pre-deploy |
| `npm run secret-scan` | game repo pre-deploy |
| `npm run alpha:local-suite` | game repo pre-deploy |
| `npm run alpha:local-evidence` | game repo pre-deploy |
| `npm run alpha:operator-checklist` | game repo pre-deploy |
| `npm run alpha:report-hygiene` | game repo pre-deploy |
| `npm run typecheck` | game repo pre-deploy |
| `npm run lint` | game repo pre-deploy |
| `npm test` | game repo pre-deploy |
| `npm run build` | game repo pre-deploy |
| `git diff --check` | game repo pre-deploy |

## Website Acceptance Commands

| Command | Purpose |
| --- | --- |
| `npm run check:mochi-social-alpha` | website-side acceptance |
| `npm run check:mochi-social-bridge-state` | website-side acceptance |
| `npm run check:mochi-social-auth-bridge` | website-side acceptance |
| `npm run check:mochi-social-edge-authority` | website-side acceptance |
| `npm run check:mochi-social-preview-key-loader` | website-side acceptance |
| `npm run check:mochi-social-discord-oauth` | website-side acceptance |
| `npm run check:mochi-social-game-contract` | website-side acceptance |
| `npm run check:mochi-social-report-hygiene` | website-side acceptance |

## Warnings

- None

## Failures

- None
