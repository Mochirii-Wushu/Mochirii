# Supabase Advisor Cadence

This runbook keeps Supabase database review recurring, no-secret, and separate from release mutations. It is for the production project `deyvmtncimmcinldjyqe`, but it should not run production writes unless a separate release packet explicitly approves them.

Primary sources:

- Supabase Performance and Security Advisors: https://supabase.com/docs/guides/database/database-advisors
- Supabase CLI reference, including `supabase db lint`: https://supabase.com/docs/reference/cli/introduction
- Supabase database migrations: https://supabase.com/docs/guides/deployment/database-migrations
- Supabase managing environments: https://supabase.com/docs/guides/deployment/managing-environments
- Supabase shared responsibility model: https://supabase.com/docs/guides/deployment/shared-responsibility-model

## Cadence

Run this review monthly, and also before any release that changes:

- `supabase/migrations/`
- `supabase/config.toml`
- `supabase/functions/`
- auth, Storage, RLS, database functions, database triggers, or exposed schemas

This cadence is read-only evidence. It must not apply migrations, deploy functions, repair migration history, reset databases, rotate keys, edit Auth providers, change Storage buckets, or mutate production rows.

## No-Secret Evidence Rules

Record only:

- check date
- operator initials or GitHub handle
- Supabase CLI version
- project ref
- whether Security Advisor was reviewed
- whether Performance Advisor was reviewed
- counts by severity
- object names for findings that need a follow-up PR
- links to private dashboard pages when useful
- whether `supabase db lint` passed, warned, failed, or was skipped

Never record:

- service-role keys
- secret keys
- JWTs
- access tokens
- database passwords
- full connection strings
- cookies
- raw request or response headers
- customer/member private data
- complete row dumps

## Monthly Review

1. Refresh Supabase CLI and docs context.

   ```sh
   supabase --version
   supabase db lint --help
   ```

2. Review Dashboard Security Advisor.

   - Open Database > Security Advisor.
   - Rerun the advisor after any recent schema fix.
   - Triage findings for RLS disabled in public, policies with RLS disabled, exposed sensitive columns, executable security definer functions, mutable function search paths, public bucket listing, and extensions in exposed schemas.

3. Review Dashboard Performance Advisor.

   - Open Database > Performance Advisor.
   - Triage findings for unindexed foreign keys, unused indexes, duplicate indexes, table bloat, and query-pattern warnings.
   - Treat performance fixes as normal PRs with before/after evidence; do not edit production schema directly from the dashboard during this cadence.

4. Run CLI lint when local or linked access is available.

   Local stack:

   ```sh
   supabase start
   supabase db lint --local --schema public,storage,auth,extensions --fail-on error
   ```

   Linked project read:

   ```sh
   supabase db lint --linked --schema public,storage,auth,extensions --fail-on error
   ```

   If CLI access is unavailable, record `lint skipped: CLI/link unavailable` and rely on Dashboard Advisor review for that month.

5. Confirm migration/source alignment.

   ```sh
   supabase migration list
   npm run check:supabase-edge-types
   npm run check:security-hardening
   npm run check:full-stack-release-evidence
   ```

6. Create follow-up PRs for fixes.

   - Use `supabase migration new <descriptive-name>` for schema changes.
   - Keep RLS enabled before any anon/authenticated grant in exposed schemas.
   - Move or wrap security-definer work in private schemas when feasible.
   - Keep service-role-only tables out of browser grants.
   - Rerun advisors or lint after the fix, then attach redacted counts/status to the PR.

## Forbidden During This Cadence

Do not run these commands as part of the monthly advisor cadence:

```sh
supabase db push
supabase db reset --linked
supabase migration repair
supabase functions deploy
supabase secrets set
supabase secrets unset
```

Those commands belong in explicit release or rollback packets only.

## Evidence Template

```md
## Supabase Advisor Review

- Date:
- Operator:
- Project ref: deyvmtncimmcinldjyqe
- Supabase CLI version:
- Security Advisor reviewed: yes/no
- Performance Advisor reviewed: yes/no
- Security findings: critical 0, warning 0, info 0
- Performance findings: critical 0, warning 0, info 0
- CLI lint: passed/warned/failed/skipped
- Follow-up PRs/issues:
- Notes: no secrets recorded
```
