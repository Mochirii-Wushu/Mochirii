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
| Root cause | The migration directly referenced `public.mochi_social_spirits` for an index and policy even though the linked project currently has `public.mochi_social_pets`. |
| Fix | The migration now checks `information_schema.columns` for each table's `owner_id` column before creating the matching index and policy. |

## Validation

- `npm run check:supabase-security-performance`
- `npm run check:supabase-edge-types`
- `npx supabase db reset --local --no-seed --yes`
- `npx supabase db advisors --local --type all --level warn --fail-on none --output-format json`
- Local rollback transaction with `public.mochi_social_spirits` dropped before rerunning the migration
- Local rollback transaction with a temporary `public.mochi_social_pets(owner_id)` table before rerunning the migration

## Notes

Do not use `supabase status --output json` in shared reports or logs for this
project. It prints local development keys and connection strings. Prefer
specific read-only CLI commands and redact or summarize outputs.

No remote schema, function, secret, Auth, dashboard, or production deploy mutation
was performed while preparing this fix.
