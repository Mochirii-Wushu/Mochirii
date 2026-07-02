# Supabase CLI Migration Connectivity - 2026-07-01

## Result

The Supabase CLI is installed and the website checkout is linked to project
`deyvmtncimmcinldjyqe`. The reported migration failure is not a CLI-link problem;
it is a schema-drift assumption in migration
`20260702043644_harden_mochi_social_advisor_findings.sql`.

## Evidence

| Check | Result |
| --- | --- |
| Repo branch before fix | `main` was clean and synced before creating `codex/guard-mochi-social-spirits-migration`. |
| Supabase CLI version | `2.108.0`; CLI reported `2.109.0` is available. |
| Project ref | `supabase/config.toml` and `supabase/README.md` both point to `deyvmtncimmcinldjyqe`. |
| Linked CLI auth | Linked reads work when `SUPABASE_ACCESS_TOKEN` is provided from `C:\Users\xtyty\Documents\Creds\Supabase Key.txt` as a child-process environment variable. |
| Linked migrations | `20260702043644` exists locally and was not applied remotely at the time of the read. |
| Linked table check | Read-only linked SQL returned `public.mochi_social_spirits = NULL` and `public.mochi_social_pets = mochi_social_pets`. |
| Root cause | The migration directly referenced `public.mochi_social_spirits` for an index/policy and `public.mochi_social_progress_snapshots` for a policy even though those tables are absent in the linked project lineage. |
| Fix | The migration now checks `information_schema.columns` before creating compatibility indexes or policies for drift-prone Mochi Social tables. |

## Validation

- `npm run check:supabase-security-performance`
- `npm run check:supabase-edge-types`
- `npx supabase db reset --local --no-seed --yes`
- `npx supabase db advisors --local --type all --level warn --fail-on none --output-format json`
- Local rollback transaction with `public.mochi_social_spirits` dropped before rerunning the migration
- Local rollback transaction with a temporary `public.mochi_social_pets(owner_id)` table before rerunning the migration
- Linked push attempt exposed the same drift pattern for missing `public.mochi_social_progress_snapshots`; the policy rewrite is now table-aware too

## Notes

Do not use `supabase status --output json` in shared reports or logs for this
project. It prints local development keys and connection strings. Prefer
specific read-only CLI commands and redact or summarize outputs.

An approved linked `supabase db push` was attempted for migration `20260702043644`.
The first attempt did not mark the migration as remote-applied because the CLI
stopped at the missing `public.mochi_social_progress_snapshots` policy rewrite.
No remote function, secret, Auth, dashboard, Vercel, or production deploy mutation
was performed while preparing this follow-up fix.
