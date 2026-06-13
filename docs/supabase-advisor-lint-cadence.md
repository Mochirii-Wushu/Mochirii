# Supabase Advisor And Lint Cadence

This runbook defines a monthly read-only Supabase database hygiene pass for Mochirii. It is meant to catch drift in schema safety, RLS posture, security definer placement, performance hints, and Supabase CLI behavior before those issues become release blockers.

This runbook does not authorize `supabase db push`, migrations, Edge Function deployment, secret changes, table edits, Storage changes, SQL writes, or any other provider mutation. No provider mutation belongs in this monthly cadence; no provider mutation is allowed from report generation.

## Source Basis

- Supabase CLI reference: <https://supabase.com/docs/reference/cli/introduction>
- Supabase database lint command: <https://supabase.com/docs/reference/cli/supabase-db-lint>
- Supabase Performance and Security Advisors: <https://supabase.com/docs/guides/database/database-advisors>
- Supabase database inspection tools: <https://supabase.com/docs/guides/database/inspect>
- Supabase Row Level Security: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase API keys: <https://supabase.com/docs/guides/getting-started/api-keys>
- Supabase Securing your data: <https://supabase.com/docs/guides/database/secure-data>
- Supabase Edge Function secrets: <https://supabase.com/docs/guides/functions/secrets>

## Cadence

Run this checklist monthly, and also before any branch that changes:

- Supabase migrations.
- RLS policies.
- Storage policies or private buckets.
- Edge Functions that use service-role credentials.
- Auth triggers or `security definer` functions.
- Browser Supabase client configuration.
- Discord/Reaper tables, vote reminder tables, Spotlight tables, gallery tables, member profile tables, or Mochi Social alpha tables.

## Read-Only Command Discovery

Supabase CLI behavior changes over time, so begin by discovering commands instead of relying on memory:

```sh
supabase --version
supabase db lint --help
supabase db advisors --help
supabase inspect db --help
```

Record only command availability, CLI version, and pass/fail status in public reports. Do not record access tokens, database passwords, connection strings, project bearer values, service-role keys, secret keys, cookies, raw headers, row data, signed URLs, private Storage paths, or private member identifiers.

## Local First

Use local checks when the local Supabase stack is available:

```sh
supabase db lint --local --schema public --level warning --fail-on none
supabase db advisors --local --type all --level info --fail-on none
```

Recommended local interpretation:

- Treat lint errors as release blockers.
- Treat advisor security errors as release blockers.
- Treat advisor warnings as review-required unless already documented and accepted.
- Treat advisor performance findings as backlog candidates unless they affect live user workflows.
- Do not hide output by raising `--level` too high during operator review.

## Linked Project Read-Only Pass

Run linked checks only when the operator has authenticated the Supabase CLI locally and the release packet explicitly calls for production-read evidence:

```sh
supabase migration list --linked
supabase db lint --linked --schema public --level warning --fail-on none
supabase db advisors --linked --type all --level info --fail-on none
```

These commands are intended as read-only inspection. Stop if a command asks for a write, migration repair, password entry that would be printed, SQL mutation, dashboard mutation, or any action outside read-only review.

If linked database access is not available, use the Supabase Dashboard Security Advisor and Performance Advisor under Database. Record only pass/fail status, issue titles, issue severity, whether the issue is new/known, and the owner of the follow-up branch.

## Optional Inspect Commands

Use `supabase inspect db --help` to discover read-only inspection commands when investigating performance symptoms. Candidate commands include `db-stats`, `outliers`, `calls`, `index-stats`, `long-running-queries`, `locks`, `blocking`, `table-stats`, `role-stats`, `vacuum-stats`, and `bloat`.

Do not paste query text if it includes private member data, tokens, raw emails, Discord IDs, private Storage paths, signed URLs, or payment/account details. Summarize findings as route/workflow impact, severity, and follow-up owner.

## Mochirii Review Targets

| Target | What to check | Expected safe posture |
| --- | --- | --- |
| Public schema RLS | Every exposed-schema private table has RLS enabled and intentional grants. | Browser reads fail closed unless a feature-specific RLS policy allows the signed-in user. |
| Service-role scope | Trusted Edge Functions and operator scripts are the only places service-role work belongs. | No service-role key or secret key in browser code, Vercel public env, reports, PR text, screenshots, or chat. |
| Security definer placement | Review `public.handle_new_member_profile()` and any future `security definer` helpers. | Execute is revoked from browser roles today; future migrations should prefer a private schema where feasible. |
| Discord/Reaper tables | `discord_resources`, `discord_sync_log`, `discord_managed_permission_overwrites`, vote, and Spotlight tables remain redacted/service-role-only when intended. | No Discord message content, private conversations, unrestricted chat logs, webhook URLs, or raw interaction tokens. |
| Gallery and profile storage | Private buckets and signed URLs stay server-mediated. | No public private-bucket listing, no direct pending/rejected media exposure, no private Storage paths in public reports. |
| Mochi Social alpha | Preview data stays no-real-value and configured-preview-stub until funded-chain approval exists. | No funded-chain gate clearing from lint/advisor review. |

## Stop Conditions

Stop and open a scoped issue or branch instead of continuing if:

- A command requires `supabase db push`, `supabase functions deploy`, `supabase secrets set`, SQL writes, dashboard writes, data repair, table edits, Storage object deletion, or other provider mutation.
- A command or dashboard view would print a service-role key, secret key, database password, bearer token, cookie, refresh token, OAuth secret, Discord bot token, webhook URL, Enjin token, Wallet Daemon secret, signed URL, private Storage path, email list, raw Discord IDs, or row-level member data into public output.
- A new RLS warning affects exposed tables used by browser clients.
- A new `security definer` warning affects an exposed schema function.
- Advisor output suggests a performance issue on Auth, Account, Gallery, Leader Dashboard, Events, Spotlight, vote reminders, pending verification, or Mochi Social alpha workflows.

## Public Evidence Template

Use this no-secret shape for reports:

```text
Date:
Operator:
Supabase CLI version:
Local lint: pass/fail/not run
Local advisors: pass/fail/not run
Linked migration list: pass/fail/not run
Linked lint: pass/fail/not run
Linked advisors: pass/fail/not run
Dashboard Security Advisor: pass/fail/not checked
Dashboard Performance Advisor: pass/fail/not checked
New issues: count only
Known accepted issues: count only
Follow-up branch/owner:
Provider mutation performed: no
Secrets or private rows recorded: no
```

Do not add raw advisor rows to public reports if they include object names that expose private operational design. Summarize issue family, severity, and owner.

## Validation

Static guard:

```sh
npm run check:supabase-advisor-lint-cadence
```

Refresh the generated no-secret report:

```sh
npm run check:supabase-advisor-lint-cadence -- --write
```

Then run the standard repository checks:

```sh
npm run check
git diff --check
```
