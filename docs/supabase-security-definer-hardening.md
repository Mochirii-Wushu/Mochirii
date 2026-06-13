# Supabase Security-Definer Hardening

This is the operator packet for the remaining `security definer` follow-up in the Mochirii Supabase schema.

No live database mutation is authorized by this document. Do not run `supabase db push`, deploy Edge Functions, change dashboard settings, or query production secrets from this runbook alone.

## Current State

Local migrations currently define one `security definer` function:

- `public.handle_new_member_profile()`
- Source migration: `supabase/migrations/20260513081523_create_discord_role_gated_gallery_uploads.sql`
- Purpose: Auth trigger helper that creates or updates the matching `public.member_profiles` row after a Supabase Auth user is inserted.
- Current mitigations: fixed `search_path`, explicit `revoke all` from `public`, `anon`, and `authenticated`, and trigger-only invocation from `auth.users`.

The function is not a browser API and should not be granted to browser roles. It remains a hardening target because it lives in the exposed `public` schema.

## Source Basis

Current Supabase guidance used for this packet:

- Database functions: prefer security invoker; when `security definer` is required, set `search_path`.
- Securing the API: grants and RLS both control Data API reachability.
- RLS: tables in exposed schemas such as `public` must have RLS enabled.
- Database Advisors: security advisors include executable security-definer function checks.
- Security-definer troubleshooting: security-definer helpers do not need to be exposed to PostgREST when referenced with schema-qualified names.

## Local Audit

Refresh the no-secret static audit after changing Supabase migrations or this runbook:

```sh
npm run check:supabase-security-definer-audit
npm run check:supabase-security-definer-audit -- --write
```

The audit should show exactly one current allowed public exception until a private-schema migration is approved.

## Approved Future Migration Shape

Use this only inside an explicit database hardening branch and approved migration window.

1. Discover current CLI command flags:

   ```sh
   supabase --version
   supabase migration --help
   supabase db lint --help
   supabase db advisors --help
   ```

2. Start from a clean branch and create the migration through the CLI:

   ```sh
   supabase migration new move_member_profile_trigger_helper_private
   ```

3. In the migration, create or reuse an unexposed private schema, for example `private`, and revoke broad usage from browser roles.

4. Recreate the trigger helper as a private schema function, for example `private.handle_new_member_profile()`, with:

   - `security definer`
   - fixed search path, preferably `set search_path = ''`
   - fully qualified relation references such as `auth.identities` and `public.member_profiles`
   - explicit `revoke all` from `public`, `anon`, and `authenticated`

5. Drop and recreate the `auth.users` trigger so it executes the private function.

6. Drop the old `public.handle_new_member_profile()` only after the trigger points at the private function.

7. Verify locally before any production apply:

   ```sh
   supabase db reset
   supabase db lint --local
   supabase db advisors --local --type security --fail-on warn
   supabase migration list --local
   npm run check:supabase-security-definer-audit -- --write
   npm run check:supabase-edge-types
   npm run check
   git diff --check
   ```

8. In an approved linked-project read-only window, run advisors without printing secrets:

   ```sh
   supabase db advisors --linked --type security --fail-on warn
   ```

9. Only after review and explicit approval, use the normal production migration process from `docs/deployment.md` and `supabase/README.md`.

## Acceptance Criteria

- No `security definer` functions remain in the exposed `public` schema unless a new exception is documented and reviewed.
- The Auth trigger still creates or updates `member_profiles` for a new Discord-authenticated user.
- Browser roles do not receive `EXECUTE` on the private helper.
- Supabase security advisors do not report browser-executable security-definer functions.
- Existing member profile, gallery upload, and moderator workflows keep passing their local checks.

## Rollback Notes

If a private-schema migration breaks Auth profile creation, restore the previous trigger/function behavior in a reviewed rollback migration rather than editing production manually. Do not drop profile tables, Storage buckets, or member data during emergency rollback.
