# Mochirii Website Recovery and Parity Audit

Generated: 2026-07-01

This report is intentionally no-secret. It records local setup, route parity, provider-readiness, and remaining access blockers without raw tokens, credential file names, cookies, private headers, webhook URLs, or secret digests.

## Result

- Repository preserved: `website/` remains the local checkout for `https://github.com/Mochirii-Wushu/Mochirii.git`.
- Working branch: `codex/website-recovery-parity-audit`.
- Base branch preserved: `codex/full-stack-dev-tooling` at `900ab77`.
- Production source: `apps/web` remains the Vercel/Next app for `https://mochirii.com`; root static files remain rollback/reference material.
- Credential boundary: `C:\Users\xtyty\Documents\Creds` exists, is owned by the local Windows user, and was not read for raw secret contents.

## Tooling

- Root install: `npm ci` completed with zero reported vulnerabilities.
- Next app install: `cd apps/web && npm ci` completed with zero reported vulnerabilities.
- Playwright Chromium: `npm run setup:playwright` completed.
- Docker Engine: installed and running inside WSL; `npm run toolchain:check` now reports Docker daemon `29.6.1`.
- Root toolchain check: OK for Node.js `22.23.1`, npm `10.9.8`, Git, GitHub CLI, Deno, ImageMagick, fnm, jq, Docker, local Supabase CLI `2.108.0`, local Lighthouse `12.6.1`, Playwright, and local Vercel CLI `54.18.1`.
- Next app toolchain check: OK for Node.js `22.23.1`, npm `10.9.8`, and local Vercel CLI `54.18.1`.

## Provider Access

- GitHub CLI: authenticated as the active GitHub account with repo/workflow scope.
- Vercel CLI: installed locally; read-only provider reads now work with the approved Vercel token stored in `C:\Users\xtyty\Documents\Creds`.
- Supabase CLI: installed locally; the project is linked and authenticated for read-only provider evidence via the approved local PAT.
- Initial credential vault scan: no unambiguous Vercel or Supabase token candidate was found by conservative filename-pattern search, so no credential file contents were read at that time.
- Full-stack evidence: `npm run check:full-stack-release-evidence -- --providers --strict-provider --write` completed with approved Vercel and Supabase tokens in child-process environments and wrote redacted provider-readiness reports. Vercel is checked; Supabase migrations and Edge Functions are checked.

### Fresh-Thread Provider Follow-Up

- Official Vercel CLI docs checked: authenticated provider reads require `vercel login` or token authentication via `VERCEL_TOKEN` / `--token`; `vercel inspect` retrieves deployment information and `vercel env ls` lists project environment variable names.
- Official Supabase CLI docs checked: `supabase login` uses a Supabase personal access token; `supabase link --project-ref ...` links a local project; remote migration listing requires a linked project; `supabase functions list --project-ref ...` lists remote Edge Functions.
- Official GitHub push-protection docs checked: secrets must be removed from commits rather than committed, and push protection exists to block hardcoded credentials before they reach GitHub.
- `apps\web\node_modules\.bin\vercel.cmd whoami --no-color` and `apps\web\node_modules\.bin\vercel.cmd inspect https://mochirii.com --format=json --timeout 3m --no-color` both returned the same no-credentials blocker: run `vercel login` or pass `--token`.
- `node_modules\.bin\supabase.cmd projects list --output json` returned the no-access-token blocker: run `supabase login` or set `SUPABASE_ACCESS_TOKEN`.
- `node_modules\.bin\supabase.cmd migration list --linked` returned the no-link blocker: run `supabase link`.
- Follow-up credential vault no-secret scan found exactly one Vercel token candidate. It was used only as `VERCEL_TOKEN` in child process environments and was not printed, summarized, committed, or written to reports.
- A local-only Vercel project link was created so `apps/web` can resolve the `mochirii` project context for CLI env-name reads. The generated `.vercel/` files remain ignored and no Vercel project settings were changed.
- Vercel read-only provider checks now pass: `whoami` succeeds, `vercel inspect https://mochirii.com --format=json --timeout 3m --cwd apps/web` reports the production deployment `READY`, and `vercel env ls production|preview --format=json --cwd apps/web` returns redacted env-name lists.
- Supabase credential follow-up found the approved local Supabase PAT candidate. It was used only as SUPABASE_ACCESS_TOKEN in child-process environments and was not printed, summarized, committed, or written to reports.
- `scripts/check-full-stack-release-evidence.mjs --providers --write` was rerun with the Vercel token in the child process environment and refreshed `reports/full-stack-release-evidence.json` and `reports/full-stack-release-evidence.md` with Vercel checked and Supabase skipped.

## Chrome Bridge

- Global Codex config was repaired at `C:\Users\xtyty\.codex\config.toml` by setting `mcp_servers.node_repl.args = ["--disable-sandbox"]`.
- This fresh thread verified the global Codex config still contains `mcp_servers.node_repl.args = ["--disable-sandbox"]`.
- Chrome is running on Windows, the Codex Chrome Extension is installed and enabled in the selected Chrome profile, and the native-host manifest is present, registered, and points to the expected extension origin.
- Official Codex Chrome extension troubleshooting docs checked: confirm the extension shows Connected, confirm the Chrome plugin is on, use the same Chrome profile, try a new thread, restart Chrome/Codex, and reinstall the extension/plugin path if it still does not connect.
- The Chrome bootstrap failed before a dashboard page could be opened. Initial bootstrap and one retry both returned `codex/sandbox-state-meta: missing field sandboxPolicy` from `node_repl/js`.
- Dashboard-only work remains blocked until the Codex Chrome bridge can initialize successfully in a restarted/repaired app lifecycle.

## Site Parity

- Public data parity: every `apps/web/public/data/*.json` file matched `https://mochirii.com/data/*.json` exactly.
- Discovery files: `robots.txt` and `sitemap.xml` match production after normalizing CRLF/LF line endings.
- Live route audit: all audited production routes returned HTTP 200 after expected redirects.
- Local route audit: all matching local Next routes returned HTTP 200 after expected redirects from the built app on `next start`.
- Legacy redirects: `.html` paths redirect to their stable clean Next routes locally and in production.

Audited route set:

```text
/, /join, /events, /gallery, /ranks, /leaders, /codex, /recruitment,
/announcements, /raffles, /spotify, /spotlight, /twills,
/auth, /account, /gallery-submit, /leader-dashboard,
/members, /members/twills, /members/meenari, /games/mochi-social,
/index.html, /join.html, /gallery.html, /events.html, /ranks.html,
/leaders.html, /codex.html, /recruitment.html, /announcements.html,
/raffles.html, /spotify.html, /spotlight.html, /twills.html,
/account.html, /auth.html, /gallery-submit.html, /leader-dashboard.html
```

## Visual Route Pass

- Local built app was checked with Playwright at desktop `1440x1100` and mobile `390x900`.
- Routes checked: 21.
- Total viewport checks: 42.
- Result: all checks passed for HTTP status, meaningful body text, and no horizontal overflow.
- Local-only Vercel Analytics and Speed Insights script fetches were ignored because `next start` does not serve Vercel's production telemetry endpoints.

## Fresh-Thread Validation

- `npm run toolchain:check`: passed.
- `cd apps/web && npm run toolchain:check`: passed.
- `npm run check:full-stack-release-evidence -- --providers --write`: passed before Vercel token access and refreshed redacted provider reports with provider blockers.
- `scripts/check-full-stack-release-evidence.mjs --providers --write`: passed after Vercel token access and refreshed redacted provider reports with Vercel checked.
- `npm run check`: passed. Expected skips remained for live/provider-gated checks without explicit credentials or live flags; the only warning was the pre-existing large audio asset `assets/audio/mochiriiiiii.mp3`.
- `git diff --check`: passed.
- `npm run check:production`: passed.
- `npm run smoke:dns-cutover-post -- --base-url=https://mochirii.com --www-mode=redirect`: passed.
- `cd apps/web && npm run lint && npm run build`: passed.

## Repo Updates Made

- Updated `scripts/check-full-stack-release-evidence.mjs` so provider evidence uses the repo-local Vercel and Supabase CLIs before falling back to global PATH.
- Regenerated `reports/full-stack-release-evidence.json`.
- Regenerated `reports/full-stack-release-evidence.md`.
- Added this audit report.
- Updated global Codex config outside the repo to repair the Node REPL sandbox launch argument.

## Remaining Blockers

- Chrome logged-in dashboards require a working Codex Chrome bridge. Local extension/native-host checks now pass, but this thread still fails with `missing field sandboxPolicy`; the next practical step is restarting Codex and Chrome, then retrying, or removing/re-adding the Chrome plugin if the extension UI is not Connected.
- No deploys, DNS changes, paid/quota-bearing actions, provider secret mutations, or production dashboard mutations were performed.
