# Supabase Security And Performance Packet

Date: 2026-06-18

Branch: `codex/supabase-security-cors-performance`

Project ref: `deyvmtncimmcinldjyqe`

## Baseline

- Supabase CLI 2.107.0 was installed and verified.
- `supabase projects list` showed project `Mōchirīī` as `ACTIVE_HEALTHY`.
- `supabase db advisors --linked --type all --level info --fail-on none --output-format json` completed from the linked implementation worktree.
- `supabase db push --dry-run --linked`, `supabase migration list --linked`, and `supabase functions list --project-ref deyvmtncimmcinldjyqe` did not return usable diagnostics in the non-interactive shell. Production database mutation and function deploy verification should wait for a healthy linked CLI path or use the Supabase Dashboard with the same reviewed migration after owner approval.

## Advisor Findings Addressed

- Leaked password protection: advisor reports `auth_leaked_password_protection` as `WARN`. Dashboard check showed the row as `Disabled` with a `Configure in email provider` action rather than a direct toggle, so this remains a provider configuration follow-up.
- RLS enabled with no policies: advisor reports this for intentionally service-role-only tables. These tables are documented in `supabase/README.md`, receive no browser grants, and are guarded so future work does not casually add anon/authenticated policies.
- Unindexed foreign keys: this branch adds additive `CREATE INDEX IF NOT EXISTS` statements for active gallery, Instagram queue, member profile/media, Discord sync, and spotlight poll workflow foreign keys.

## Deferred Findings

- Mochi Social `unindexed_foreign_keys` and `auth_rls_initplan` findings are deferred to a Mochi Social-specific packet unless they affect shared production paths.
- `unused_index` findings are informational and intentionally not removed here. Several indexes protect low-volume, future, or admin workflows, and removal would be a separate evidence-backed cleanup.

## CORS Boundary

- Protected browser/secret Edge Functions now pass through the shared protected CORS wrapper.
- Allowed origins are `https://mochirii.com`, `https://mochirii.vercel.app`, Mochirii Vercel preview origins, `http://localhost:3000`, and `http://127.0.0.1:3000`.
- Public-safe DTO endpoints remain intentionally permissive because they expose only safe fields or signed URLs:
  - `list-approved-gallery-submissions`
  - `list-visible-profile-cards`
  - `get-current-spotlight-winner`

## Production Notes

- Production database mutation still requires Supabase Preview, `supabase db push --dry-run --project-ref deyvmtncimmcinldjyqe`, and owner-approved `supabase db push`.
- Deploy only changed Edge Functions after merge.
- Do not change Discord, Cloudflare, Vercel, Meta, or Mochi Social provider settings as part of this packet.
