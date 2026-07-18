# Supabase Backend Guidance

- Keep schema changes migration-based and Edge Function changes scoped.
- Preserve RLS, explicit grants, JWT/signature/shared-secret boundaries, and
  fail-closed behavior.
- Read runtime secrets only through `Deno.env`; never print, hash, cache, or
  expose secret values.
- Browser and leader-facing messages use product language such as `Member user
  ID`, not infrastructure terminology.
- Reaper remains hosted in Edge Functions. Preserve Discord signature checks,
  role authorization, and `allowed_mentions` containment.
- Do not deploy functions, mutate secrets, or change the production database
  outside an explicitly approved release packet.
