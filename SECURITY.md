# Security Policy

Please do not report security issues in public issues or pull requests.

## Reporting

Use GitHub private vulnerability reporting for confidential security reports:

```text
https://github.com/Mochirii-Wushu/Mochirii-Website/security/advisories/new
```

Do not use public issues or pull requests. Include:

- A concise description of the issue
- Affected URL, route, function, or workflow
- Reproduction steps
- Impact and whether any secret, account, or member data may be exposed

The production site also publishes an RFC 9116 `security.txt` contact file at:

```text
https://mochirii.com/.well-known/security.txt
```

## Scope

In-scope production hosts are `https://mochirii.com` and
`https://social.mochirii.com`, plus source owned by this repository. Test only
assets and accounts you own or are expressly authorized to use. Third-party
provider services and infrastructure are outside this policy unless Mochirii
owns the affected configuration; follow each provider's own security policy
and terms.

Security-sensitive areas include:

- Supabase authentication, RLS, storage, and Edge Functions
- Discord verification and moderation workflows
- Vercel and GitHub deployment settings
- Environment variables and credentials
- Member-only upload, account, and leader dashboard flows

## Research Guidelines

- Use the minimum requests, accounts, and data needed to demonstrate the issue.
- Do not perform denial-of-service or availability testing, social engineering,
  phishing, spam, credential attacks, destructive actions, persistence,
  malware delivery, bulk collection, or automated testing that could disrupt
  members or providers.
- Do not access another person's account or data. If member data, credentials,
  or service instability are encountered, stop testing and report immediately.
- Do not change, delete, download, retain, or disclose production data beyond
  the smallest redacted proof needed to explain the issue.
- Allow time for investigation and remediation before any public disclosure.

Do not include real secrets, tokens, private member data, or exploit payloads
beyond what is necessary to explain the issue. This policy does not promise a
bounty or a fixed response time.

## Current Hardening Baseline

- `mochirii.com` is served from Vercel/Next; Cloudflare is DNS-only for the Vercel web records.
- App-level security headers are defined in `apps/web/next.config.ts`.
- `/.well-known/security.txt` is mirrored to the Vercel public tree and retained static rollback surface.
- CSP is enforced with `Content-Security-Policy`. Future third-party scripts, embeds, media hosts, or API origins need a scoped browser/CSP pass before launch.
- Supabase service-role keys, Discord bot tokens, Instagram credentials, and OAuth client secrets must stay in Supabase secrets or other server-only provider storage, never browser code or docs.
- Run `npm run check:security-hardening` before security-sensitive changes.
