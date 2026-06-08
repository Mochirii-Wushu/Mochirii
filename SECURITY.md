# Security Policy

Please do not report security issues in public issues or pull requests.

## Reporting

Use GitHub private vulnerability reporting if available for this repository. If it is not available, contact a repository administrator privately and include:

- A concise description of the issue
- Affected URL, route, function, or workflow
- Reproduction steps
- Impact and whether any secret, account, or member data may be exposed

## Scope

Security-sensitive areas include:

- Supabase authentication, RLS, storage, and Edge Functions
- Discord verification and moderation workflows
- Vercel and GitHub deployment settings
- Environment variables and credentials
- Member-only upload, account, and leader dashboard flows

Do not include real secrets, tokens, private member data, or exploit payloads beyond what is necessary to explain the issue.

## Current Hardening Baseline

- `mochirii.com` is served from Vercel/Next; Cloudflare is DNS-only for the Vercel web records.
- App-level security headers are defined in `apps/web/next.config.ts`.
- CSP starts as `Content-Security-Policy-Report-Only` until Discord, Spotify, Supabase, and Vercel observability are verified clean in production.
- Supabase service-role keys, Discord bot tokens, Instagram credentials, and OAuth client secrets must stay in Supabase secrets or other server-only provider storage, never browser code or docs.
- Run `npm run check:security-hardening` before security-sensitive changes.
