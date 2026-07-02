# Supabase Advisor Hardening - 2026-07-02

## Scope

Read-only advisors were refreshed against linked project `deyvmtncimmcinldjyqe` before this change. This PR addresses current Mochi Social advisor findings that are safe to fix through migrations only: unindexed foreign keys and RLS init-plan warnings. No remote schema, function, secret, auth, or dashboard mutation was performed while preparing this report.

## Advisor Baseline

- Security advisors: 14 findings. The remaining action item in scope for a dashboard packet is leaked-password protection; RLS-enabled-without-policy findings remain documented service-role-only tables.
- Performance advisors: 59 findings. This change addresses 14 unindexed foreign-key findings and 13 RLS auth init-plan findings. Existing unused-index findings are intentionally deferred until query evidence supports removal.

## Changes Prepared

- Added FK indexes for Mochi Social alpha, chat, feedback, inventory, ledger, market, shared-pet, trade, and chain-operation relationships.
- Rewrote affected Mochi Social RLS policies to wrap `auth.uid()` and `auth.role()` calls in `select` expressions, preserving the same role and ownership predicates.
- Kept the local `mochi_social_spirits` table contract intact while adding a guarded compatibility block for the linked advisor's `mochi_social_pets` finding.
- Extended `npm run check:supabase-security-performance` so the new FK index and optimized-RLS snippets remain guarded.

## Validation

- Supabase CLI 2.108.0.
- `npx supabase start --ignore-health-check` applied all migrations through this migration on the local stack.
- `npx supabase db reset --local --no-seed --yes` completed successfully and reapplied the full migration chain.
- `npx supabase db advisors --local --type all --level warn --fail-on none --output-format json` reported no local issues after reset.
- `npm run check:supabase-security-performance`, `npm run check:supabase-edge-types`, and `npm run test:mochi-social-alpha` passed.

## Deferred Items

- Leaked-password protection requires an Auth dashboard mutation and is handled by a separate approval packet.
- Unused indexes are not removed in this pass because removal needs production query evidence and rollback planning.
