# Supabase JS Dependency Maintenance Packet

Date: 2026-06-10

## Scope

Packet 7 updates only the Next app Supabase browser/server client dependency within v2:

- `@supabase/supabase-js`: `^2.107.0` -> `^2.108.1`

No Next, React, Vercel, TypeScript, ESLint, Supabase schema, Edge Function, Vercel setting, Discord state, route, copy, image, schedule, or secret changed in this packet.

## Package Evidence

`npm view @supabase/supabase-js version` returned `2.108.1`.

The app lockfile now resolves these Supabase v2 packages to `2.108.1`:

- `@supabase/auth-js`
- `@supabase/functions-js`
- `@supabase/postgrest-js`
- `@supabase/realtime-js`
- `@supabase/storage-js`
- `@supabase/supabase-js`

## Expected Validation

```sh
cd apps/web && npm ci
cd apps/web && npm audit --audit-level=moderate
npm run check
git diff --check
npm run check:production
npm run smoke:supabase-edge-functions
cd apps/web && npm run lint && npm run build
```

## Notes

- This is a targeted dependency-maintenance branch. Defer Next preview versions, TypeScript 6, ESLint 10, and unrelated package churn to separate compatibility plans.
- Browser-safe Supabase usage remains limited to the publishable key and public project URL. Service-role keys stay in Supabase Edge Functions only.
