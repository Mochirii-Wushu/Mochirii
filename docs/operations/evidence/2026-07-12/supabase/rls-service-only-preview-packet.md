# Service-Only RLS Production Approval Packet

Date: 2026-07-12

Production project: `deyvmtncimmcinldjyqe`

Protected PR: `Mochirii-Wushu/Mochirii#447`

Migration: `20260712164503_service_only_default_deny_policies.sql`

## Preview Evidence

- All required GitHub, CodeQL, Vercel, and Supabase Preview checks passed.
- Supabase Preview project `veknutvpynwhkdtoutvx` was active and healthy.
- The preview Security Advisor returned zero findings.
- All 13 target tables retained RLS.
- All 13 target tables had the restrictive `service_only_default_deny` policy.
- `anon` and `authenticated` retained no CRUD table privileges on all 13 tables.
- `service_role` retained CRUD table privileges on all 13 tables.
- Real `anon` and `authenticated` select probes were denied for every table.
- Zero-row service-role select, insert, update, and delete probes passed inside a rolled-back transaction.
- No production database mutation was performed.

## Production Action

Squash-merge only PR #447 through the protected branch. Allow the existing
Supabase Git integration to apply only the migration above to project
`deyvmtncimmcinldjyqe`. Do not change Auth, secrets, Edge Functions, indexes,
providers, project region, or leaked-password protection.

## Acceptance

- The production migration list includes `20260712164503`.
- Security Advisors report zero `rls_enabled_no_policy` findings.
- All 13 production tables match the preview policy and grant counts.
- Unsigned public and protected endpoint behavior remains unchanged.
- The leaked-password protection warning remains accepted and cost-deferred.

## Rollback

If production parity or endpoint checks fail, keep client access denied and use
a focused forward migration. Do not remove the restrictive policy or restore
client grants as an emergency shortcut.

## Exact Approval

```text
Approve squash-merging Mochirii-Wushu/Mochirii PR #447 and allowing the protected main integration to deploy only migration 20260712164503_service_only_default_deny_policies.sql to Supabase project deyvmtncimmcinldjyqe, followed by the no-secret production advisor, grant, policy, and fail-closed readbacks in this packet.
```
