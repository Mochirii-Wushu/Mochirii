# Supabase Database Password Rotation Packet

Prepared: 2026-07-12 UTC

## Scope

- Supabase project: `deyvmtncimmcinldjyqe`
- Vercel project: `mochirii/mochirii`
- Credential class: managed Postgres database password
- Exposure boundary: private execution log only; no Git commit or tracked
  environment file contains the value

This packet intentionally contains no credential value, hash, length,
connection string, signed URL, or copied provider log.

## Verified Consumer Inventory

- Website source has no runtime reference to the Vercel `POSTGRES_*` names.
- Vercel production still contains the unused `POSTGRES_DATABASE`,
  `POSTGRES_HOST`, `POSTGRES_PASSWORD`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL`,
  `POSTGRES_URL_NON_POOLING`, and `POSTGRES_USER` variables.
- The removed `codex/reaper-submit-optional-copy` preview branch has a second
  branch-scoped copy of those same variables.
- Active Supabase URL and API-key integration names are outside this deletion
  packet and must remain unchanged.
- No `.env.local` exists below the canonical workspace.
- GitHub secret-scanning reports zero open alerts for Website and Mochi Pets.
  Mochirii Social secret-scanning API access was unavailable; its repository
  validation and no-secret checks remain green.

## Credential Boundary

- Canonical file after rotation:
  `C:\Github Repo's\Mochirii Website\Mochi Creds\Supabase\supabase-db-password.txt`
- The credential boundary contains 43 files, none cloud-only or recall-only.
- ACL principals are limited to the current Windows account and `SYSTEM`.
- Proton Drive is running. Confirm the final upload in Proton Drive Activity
  after writing the replacement credential.

## Exact Approved Mutation Sequence

1. Delete only the seven unused `POSTGRES_*` names from Vercel production and
   their `codex/reaper-submit-optional-copy` branch scope.
2. Verify the current production deployment and signed-out authentication
   boundaries remain healthy.
3. Reset the database password in Supabase project
   `deyvmtncimmcinldjyqe`.
4. Transfer the replacement through a non-echoing clipboard-to-file operation,
   apply the existing restricted ACL, and clear the clipboard.
5. Run one successful database connection using separate child-process
   environment variables. Do not replay the compromised password.
6. Re-run migrations, security Advisors, production routes, and secret scans.
7. Record completion here without adding secret metadata.

## Rollback And Failure Handling

- The removed Vercel variables are unused and are not restored unless a code
  reference or failed production check proves a real dependency.
- If the new database connection fails, do not expose either password in a
  command. Re-open Supabase Database Settings and perform a second reset.
- Do not reopen, search, quote, hash, or attempt to rewrite the private
  execution log containing the compromised value.

## Approval Required

Approve deleting only the verified-unused Vercel `POSTGRES_*` variables and
rotating the Supabase database password for project
`deyvmtncimmcinldjyqe` according to this packet.
