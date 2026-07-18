# Mochirii Online-Hosted Resume Checkpoint

Recorded: 2026-07-11 07:55 PDT

This file is intentionally no-secret. Do not add credentials, tokens, private
keys, passwords, signed URLs, cookies, or provider recovery material.

## Required Boundaries

- Preserve Vercel, Supabase, GitHub, Cloudflare, DigitalOcean, Spaces,
  Pixelfed, and Discord integrations.
- The local workstation must not serve traffic, deploy releases, process jobs,
  run production schedules, store the only production data, or be required for
  backups or authentication.
- Use credentials only from the approved credentials boundary. Never print,
  hash, commit, summarize, move, or expose secret values.
- Keep Pixelfed ActivityPub federation disabled.
- Leave Mochi Pets, Unity, Fly.io, Enjin, game-specific routes/functions, and
  Shopify untouched.
- Start every resumed repo/runtime phase with `git status --short --branch` and
  preserve user changes.

## Website State

Repository: `C:\Users\xtyty\CodexWork\Mochirii\repo`

- Clean, synchronized `main` at
  `b9dee3f90bd564242068872c9ad485f830515590`.
- PR #426, `Optimize hosted Next route delivery`, was squash-merged.
- No open Mochirii website PRs at this checkpoint.
- Vercel production deployment for merged `main` succeeded.
- `npm run check:production` passed against `https://mochirii.com`.
- `npm run smoke:dns-cutover-post -- --base-url=https://mochirii.com --www-mode=redirect`
  passed all current routes, retired-route 404s, redirects, and the `www`
  redirect.
- Live observability/metadata smoke passed for 13 public routes and 5 noindex
  routes.
- Live Playwright proof passed: spotlight title is server-rendered, the home
  lightbox chunk is requested only after interaction, modal focus is correct,
  Escape closes the dialog, trigger focus is restored, and Home/Gallery/
  Spotlight/Account return 200.
- Supabase deployed-source parity was previously checked for all 31 active
  functions with zero normalized mismatches. All 23 migrations were aligned.
- Supabase security Advisors: 13 documented service-only/default-deny
  `rls_enabled_no_policy` info findings plus the intentionally skipped Free-plan
  leaked-password warning. Performance Advisors: 47 observation-only unused
  indexes.
- Reaper signature/security/type checks and unsigned fail-closed smokes passed.

## Social Runtime State

Repository: `C:\Users\xtyty\CodexWork\Mochirii\pixelfed-ops`

- Production `main` before the current PR is
  `a1183448575b3089d64ac568544441b61a2c5286`.
- Existing hosted runtime release:
  `/opt/mochirii-social/releases/a1183448575b3089d64ac568544441b61a2c5286`.
- Existing immutable application image digest:
  `sha256:9946850a8ae42a16586578d112392e4e036327657826db1c15fb34b79cf4ccc3`.
- Production Droplet currently used by the runtime: `167.172.90.41`.
- The Droplet was rebooted during this pass. SSH returned after about one
  minute; Caddy and Docker recovered automatically.
- At pause time, Caddy and Docker were active and all five containers were
  healthy: app, Horizon, scheduler, MariaDB, and Redis.
- Horizon, scheduler, origin-loopback HTTP, public Cloudflare HTTPS, and the
  runtime policy gate passed after reboot.
- Runtime policy remains: registration closed, OAuth enabled, ActivityPub
  disabled, Spaces/S3 selected, image cleanup after cloud enabled.
- Disk state before reboot: 48 GB total, 18 GB used, 30 GB available. Memory:
  1.9 GiB RAM with 2.0 GiB swap.
- The production backup timer is installed but intentionally `disabled` and
  `inactive` until dedicated backup storage credentials exist.

## Completed Social Evidence

- Merged PRs #28 through #34 established immutable GHCR delivery, build cache,
  hosted verification, edge handling, encrypted backup/recovery code, and the
  90 MiB upload policy.
- The protected GitHub deployment workflow succeeded for production `main`.
- A full authenticated JPEG/PNG/WebP/GPS/89 MiB upload and delete matrix passed.
- A 91 MiB image, MIME-spoof `.jpg`, and unsupported SVG were rejected with
  HTTP 422 and no media rows.
- Accepted files produced bounded derivatives and thumbnails, used generated
  names, stripped GPS metadata, reached Spaces, and left no local cloud copies.
- Every test post was deleted. Database/media rows, local files, Spaces
  objects, temporary OAuth clients/tokens, and test fixtures were cleaned.
- Cache-busted deleted media URLs no longer served the objects.
- Caddy returned HTTP 413 above its configured 100 MB request limit.
- A fresh temporary Spaces object write/read/content-check/delete round trip
  passed immediately before this checkpoint.

## Active PR And Exact Pause Point

Current branch:
`codex/online-hosted-independence-proof`

Current commit:
`28b04a7ee28344504bde473c1296ad0c45469aa1`

PR:
`https://github.com/Mochirii-Wushu/mochirii-pixelfed-ops/pull/35`

PR #35 is open, ready for review, and mergeable. At pause time its two jobs
were still running:

- `validate (8.4)`
- `production-image`

The active `gh pr checks --watch` process was explicitly terminated before
stopping. No local server, check watcher, or SSH session was left running.

PR #35 adds:

- a forced-command-only `verify VERIFY_social.mochirii.com` action;
- a locked root verification mode that reuses existing runtime gates;
- an actual random temporary Spaces write/read/delete check;
- a protected manual GitHub-hosted workflow with typed confirmation
  `VERIFY social.mochirii.com`;
- runner-side checks for the website, social edge, Supabase Auth boundary,
  unsigned Reaper/member-access rejection, and Discord's public API;
- no shell, PTY, forwarding, Discord send, command registration, account,
  schema, secret, DNS, cache, or provider-setting change.

Local validation already passed:

- Bash syntax for all changed shell files.
- Workflow YAML parsing.
- `npm run check:mochirii-ops`.
- `git diff --check`.
- Live execution of the new no-secret runtime and Spaces verification function.

## Resume Steps

1. In `pixelfed-ops`, run `git status --short --branch` and confirm the branch is
   clean at commit `28b04a7ee`.
2. Re-read PR #35 checks and review threads. Do not merge unless all required
   checks are green and no actionable thread remains.
3. Squash-merge PR #35 through the protected workflow.
4. Switch local `pixelfed-ops` to `main`, pull fast-forward only, and record the
   merged commit.
5. From merged `main`, install only these reviewed host helpers with root owner
   and existing modes:
   - `scripts/production-runtime-lib.sh` to
     `/usr/local/lib/mochirii-social/production-runtime-lib.sh` mode `0644`.
   - `scripts/deploy-production-runtime.sh` to
     `/usr/local/sbin/mochirii-social-deploy` mode `0755`.
   - `scripts/deploy-production-entrypoint.sh` to
     `/usr/local/sbin/mochirii-social-deploy-entry` mode `0755`.
6. Reconfirm the deploy key still rejects arbitrary commands and accepts only
   the existing deploy contract or the exact new verification contract.
7. Dispatch `verify-online-hosting.yml` on merged `main` with confirmation
   `VERIFY social.mochirii.com`; wait for the GitHub-hosted run to complete and
   retain its URL as the no-workstation acceptance evidence.
8. Recheck both repos are clean/synchronized and have no open PRs.

## Remaining Backup And Provider Blockers

These items were not completed and must not be reported as finished:

- DigitalOcean dashboard control remains unavailable because the existing
  Chrome automation bridge stopped responding. Opening a fresh Chrome window
  for the selected profile still requires explicit user approval.
- No DigitalOcean administrative API token was found and `doctl` is not
  installed. Do not use media-scoped Spaces credentials as administrative
  credentials.
- Create private `mochirii-social-backups` in `sfo3` only through the approved
  provider path, then create separate least-privilege backup credentials.
- Configure versioning/lifecycle/logging with a temporary administrative key,
  verify the result, and immediately revoke that temporary key.
- Populate only the missing protected `social-recovery` backup credential
  secrets. Do not print their values.
- Run one encrypted manual backup, isolated restore verification, and protected
  GitHub recovery `VERIFY` workflow before enabling the 03:15 UTC timer.
- Enable the timer only after the online backup and restore evidence passes.
- Read back exactly one billing Droplet and confirm no unused Reserved IP,
  volume, temporary snapshot, or old billing Droplet remains.
- Display exact DigitalOcean automated-backup cost before enabling it.
- The current media Space remains in `sgp1`; do not recreate or move it.

## Final Acceptance Still Pending

- Recheck and stop only Mochirii-specific local containers, tunnels, servers,
  and scheduled tasks; do not stop unrelated development tools.
- Prove the new GitHub-hosted independence workflow passes after PR #35 is
  merged and its host helpers are installed.
- Complete online backup bucket/key/lifecycle/logging setup and a full protected
  restore drill.
- Confirm provider inventory and cost cleanup through DigitalOcean.
- Remove the legacy dirty checkout only after the 72-hour retention requirement
  and deployment/upload/restore/reboot acceptance are all satisfied.
- Safely remove only the known temporary evidence directories after verifying
  their resolved paths remain under the Windows temporary directory:
  `mochirii-supabase-parity-20260711` and `mochirii-online-hosted-visual`.
- Finish with clean synchronized repos, no open PRs, no local production
  dependency, green hosted workflows, and updated no-secret runbooks.

## Untouched Scope

Mochi Pets, Unity, Fly.io, Enjin, game-specific website routes/functions, and
Shopify were not changed. Shopify remains the next separate project after this
online-hosting plan is complete.
