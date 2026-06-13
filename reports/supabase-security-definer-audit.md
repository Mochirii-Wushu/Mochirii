# Supabase Security-Definer Audit

Generated: 2026-06-13T01:36:29.033Z

This no-secret audit inventories local Supabase migrations for `security definer` functions and keeps the current `public.handle_new_member_profile()` exception explicit while a private-schema migration remains a separate approval-gated hardening task.

## Summary

- Status: PASS
- Security-definer functions found: 1
- Public security-definer functions found: 1
- Allowed public exceptions: 1
- Passed checks: 20
- Warnings: 1
- Failed checks: 0
- Live database mutation: none

## Source Basis

| Source | Why It Matters |
| --- | --- |
| [Supabase Database Functions](https://supabase.com/docs/guides/database/functions) | Security invoker is preferred; if security definer is needed, set search_path. |
| [Supabase Securing your API](https://supabase.com/docs/guides/api/securing-your-api) | Data API access is governed by grants plus RLS, and function EXECUTE grants should be explicit. |
| [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) | RLS must be enabled for tables in exposed schemas such as public. |
| [Supabase Database Advisors](https://supabase.com/docs/guides/database/database-advisors) | Security advisors include executable security-definer function findings. |
| [Supabase security-definer troubleshooting](https://supabase.com/docs/guides/troubleshooting/do-i-need-to-expose-security-definer-functions-in-row-level-security-policies-iI0uOw) | Security-definer helpers do not need to be exposed to PostgREST when referenced with schema-qualified names. |

## Function Inventory

| Function | Schema | File | Line | Search Path | Allowed Exception |
| --- | --- | --- | ---: | --- | --- |
| public.handle_new_member_profile | public | supabase/migrations/20260513081523_create_discord_role_gated_gallery_uploads.sql | 296 | public, auth, pg_temp | yes |

## Current Decision

Keep `public.handle_new_member_profile()` as a documented current exception because it is revoked from `public`, `anon`, and `authenticated`, has a fixed search path, and is invoked by an `auth.users` trigger rather than browser code. Treat it as a hardening target, not as an emergency blocker.

The next implementation step is an approved database migration window that moves the helper to an unexposed schema with fully qualified relation references, then verifies local and linked advisors.

## Findings

| Status | Area | Check | Detail |
| --- | --- | --- | --- |
| PASS | inventory | security definer functions | 1 security-definer function(s) found in local migrations. |
| PASS | allowlist | public.handle_new_member_profile | matches the documented current exception. |
| WARN | hardening target | public.handle_new_member_profile | currently lives in the exposed public schema; keep as an explicit exception until the approved private-schema migration. |
| PASS | search_path | public.handle_new_member_profile | has fixed search_path: public, auth, pg_temp |
| PASS | required SQL | public.handle_new_member_profile: set search_path = public, auth, pg_temp | present |
| PASS | required SQL | public.handle_new_member_profile: revoke all on function public.handle_new_member_profile() from public, anon, authenticated; | present |
| PASS | required SQL | public.handle_new_member_profile: drop trigger if exists on_auth_user_created_member_profile on auth.users; | present |
| PASS | required SQL | public.handle_new_member_profile: create trigger on_auth_user_created_member_profile | present |
| PASS | required SQL | public.handle_new_member_profile: after insert on auth.users | present |
| PASS | required SQL | public.handle_new_member_profile: execute function public.handle_new_member_profile(); | present |
| PASS | docs | supabase/README.md: public.handle_new_member_profile() | present |
| PASS | docs | supabase/README.md: security definer | present |
| PASS | docs | supabase/README.md: check:supabase-security-definer-audit | present |
| PASS | docs | supabase/README.md: docs/supabase-security-definer-hardening.md | present |
| PASS | docs | docs/supabase-security-definer-hardening.md: public.handle_new_member_profile() | present |
| PASS | docs | docs/supabase-security-definer-hardening.md: private schema | present |
| PASS | docs | docs/supabase-security-definer-hardening.md: supabase db advisors --local | present |
| PASS | docs | docs/supabase-security-definer-hardening.md: supabase migration new | present |
| PASS | docs | docs/supabase-security-definer-hardening.md: No live database mutation is authorized by this document. | present |
| PASS | docs | package.json: "check:supabase-security-definer-audit": "node scripts/check-supabase-security-definer-audit.mjs" | present |
| PASS | docs | scripts/check-all.mjs: ["check:supabase-security-definer-audit", ["node", "scripts/check-supabase-security-definer-audit.mjs"]] | present |

## Operator Notes

- This report does not run `supabase db push`, deploy Edge Functions, read secrets, query production, or mutate live data.
- Run `npm run check:supabase-security-definer-audit -- --write` after changing Supabase migrations or the hardening runbook.
- Run Supabase CLI advisor/lint commands only in an operator-approved local or linked verification window.
