# Supabase Advisor Remediation Plan

Last refreshed: 2026-07-07

Project: `deyvmtncimmcinldjyqe`

This packet records the current linked Supabase advisor evidence and the planned remediation path without changing remote database state. Supabase advisors are evidence inputs, not automatic migration instructions. Any schema, RLS, Auth, or index mutation still requires a separate approval and PR.

## Source Basis

- Supabase Database Advisors: https://supabase.com/docs/guides/database/database-advisors
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase explicit Data API grants changelog: https://supabase.com/changelog
- Repo RLS summary: `supabase/README.md`
- Operations approval rules: `docs/integration-operations-runbook.md`

## Current Advisor Evidence

Linked CLI readback with Supabase CLI `2.108.0` succeeded on 2026-07-07 using the repo-local Windows binary and credentials loaded only into child-process environment variables.

The exact requested credential file
`C:\Github Repo's\Mochirii Website\Mochi Creds\Supabase\supabase-db-password.txt`
was not present during this refresh. No alternate password file was read or
substituted. The linked readbacks below succeeded with
`SUPABASE_ACCESS_TOKEN` only.

- Security advisors: 14 findings.
- `rls_enabled_no_policy`: 13 info findings.
- `auth_leaked_password_protection`: 1 warning.
- Performance advisors: 47 info-level `unused_index` findings.
- Function inventory and migration list readback succeeded before the advisor pass.
- Local and remote migration IDs matched through `20260704120856`.
- Linked schema lint returned no warning-level findings.

## RLS No-Policy Classification

The current `rls_enabled_no_policy` findings are classified as intentional service-only/default-deny tables. These tables should keep RLS enabled, direct browser grants revoked, and writes limited to trusted Edge Functions, Reaper workflows, or scheduled jobs.

| Table | Classification | Next action |
| --- | --- | --- |
| `discord_managed_permission_overwrites` | Service-only Discord/Reaper state | Keep default-deny; expose through trusted functions only. |
| `discord_resources` | Service-only Discord/Reaper state | Keep default-deny; expose through trusted functions only. |
| `discord_sync_log` | Service-only sync audit log | Keep default-deny; expose through trusted functions only. |
| `gallery_instagram_publish_events` | Service-only moderation/publishing audit | Keep default-deny; expose through trusted functions only. |
| `gallery_instagram_publish_jobs` | Service-only moderation/publishing queue | Keep default-deny; expose through trusted functions only. |
| `gallery_moderation_events` | Service-only moderation audit | Keep default-deny; expose through trusted functions only. |
| `member_auth_identities` | Service-only identity linkage | Keep default-deny; expose through account/server DTOs only. |
| `member_verifications` | Service-only review workflow | Keep default-deny; expose through moderator functions only. |
| `spotlight_poll_candidates` | Service-only spotlight workflow | Keep default-deny; expose through trusted functions only. |
| `spotlight_poll_cycles` | Service-only spotlight workflow | Keep default-deny; expose through trusted functions only. |
| `spotlight_poll_results` | Service-only spotlight workflow | Keep default-deny; expose through trusted functions only. |
| `vote_confirmations` | Service-only vote reminder tracking | Keep default-deny; expose through trusted functions only. |
| `vote_reminder_sends` | Service-only vote reminder tracking | Keep default-deny; expose through trusted functions only. |

Do not add dummy public policies just to silence the advisor. If any table later needs direct browser access, create a narrow policy with an explicit `TO` clause plus a row ownership or moderator predicate, and verify with Supabase Preview, advisors, and route tests.

Supabase's 2026 default-grants timeline makes explicit grants a separate, deliberate access decision from RLS. Keep grants and RLS policies paired in the same reviewed migration when a table is intentionally exposed through the Data API.

## Leaked-Password Protection

The remaining warning is Supabase Auth leaked-password protection. This is a provider setting, not a repo-only change.

Approval packet:

```text
Approve enabling Supabase Auth leaked-password protection for project deyvmtncimmcinldjyqe. Expected impact: new password-based signups or password changes may reject compromised passwords. Rollback: disable the same Auth setting in the Supabase dashboard if legitimate users are blocked unexpectedly. No database migration or secret rotation is included.
```

After approval, verify with the Security Advisor readback and a normal auth smoke. Do not change OAuth providers, manual linking, Site URL, redirect allowlist, or password policy settings in the same action unless explicitly approved.

## Unused Index Findings

The 47 `unused_index` findings are observation-only for now. Do not drop indexes before launch traffic and query usage prove they are safe removal candidates.

Recommended future process:

1. Collect query and route usage after member/social/game traffic exists.
2. Cross-check each candidate against migrations, RLS predicates, moderation dashboards, Edge Function queries, and expected launch workflows.
3. Remove indexes only in small PRs with rollback notes, advisor readback, and route-specific performance checks.

## Verification Commands

Use the repo-local Supabase binary on Windows and disable telemetry to avoid local telemetry-file races:

```powershell
$supa = "C:\Github Repo's\Mochirii Website\Website\node_modules\@supabase\cli-windows-x64\bin\supabase.exe"
# Load the access token and DB password from
# C:\Github Repo's\Mochirii Website\Mochi Creds\Supabase
# into child-process environment variables before running these commands.
# Do not print, commit, or paste those values into docs or PR text.
& $supa functions list --project-ref deyvmtncimmcinldjyqe --output-format json
& $supa migration list --linked --password $dbPasswordFromCredsFile
& $supa db advisors --linked --type security --level info --fail-on none --output-format json
& $supa db advisors --linked --type performance --level info --fail-on none --output-format json
```
