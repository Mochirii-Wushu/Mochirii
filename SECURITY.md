# Security Policy

Please do not report security issues in public issues or pull requests.

## Reporting

Use GitHub private vulnerability reporting if available for this repository. If it is not available, contact a repository administrator privately and include:

- A concise description of the issue
- Affected URL, route, function, or workflow
- Reproduction steps
- Impact and whether any secret, account, or member data may be exposed

The production site also publishes an RFC 9116 `security.txt` contact file at:

```text
https://mochirii.com/.well-known/security.txt
```

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
- `/.well-known/security.txt` is mirrored to the Vercel public tree and retained static rollback surface.
- CSP is enforced with `Content-Security-Policy`. Future third-party scripts, embeds, media hosts, or API origins need a scoped browser/CSP pass before launch.
- Supabase service-role keys, Discord bot tokens, Instagram credentials, and OAuth client secrets must stay in Supabase secrets or other server-only provider storage, never browser code or docs.
- Run `npm run check:security-hardening` before security-sensitive changes.
