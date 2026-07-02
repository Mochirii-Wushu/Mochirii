# Pixelfed First Login Testing Runbook

Status: repo-side readiness packet. Provider mutations remain approval-gated.

This runbook prepares the first Pixelfed login test without committing Pixelfed
runtime code, host secrets, OAuth client secrets, database URLs, cookies, access
tokens, or media credentials to this website repo.

## Current Repo Gate

First login testing may start only after these website and database-facing
pieces are live through the protected branch flow:

- PR containing `/social`, `/oauth/consent`, `/api/oauth/decision`, and
  `social_accounts` has merged to `main`.
- `npm run check:pixelfed-first-login-readiness` passes on the merged commit.
- `npm run toolchain:check`, `npm run check`, `git diff --check`, and
  `cd apps/web && npm run toolchain:check && npm run lint && npm run build`
  pass on the merged commit.
- Supabase Preview is green for the migration before production database
  mutation.

## Provider Approval Gates

Use these exact approval prompts before mutating provider state:

- `Approve Supabase db push for project deyvmtncimmcinldjyqe migration 20260702080720.`
- `Approve enabling Supabase OAuth 2.1 Server for project deyvmtncimmcinldjyqe and setting Authorization Path /oauth/consent.`
- `Approve registering the Pixelfed OAuth client for the approved staging Pixelfed URL with its exact OIDC callback URI.`
- `Approve provisioning the Pixelfed staging host at [host/provider] with the reviewed cost, backup, and monitoring plan.`
- `Approve creating DNS for social.mochirii.com pointing to the approved Pixelfed host.`

Do not combine these approvals. If the callback URL changes, stop and request a
new approval naming the exact redirect URI.

## Supabase Database Gate

After PR merge and explicit approval, apply the committed migration to project
`deyvmtncimmcinldjyqe`.

Minimum verification:

- `social_accounts` exists in `public`.
- RLS is enabled.
- `authenticated` has `select` plus column-scoped
  `update(profile_link_visible)` only.
- Users can read only their own `social_accounts` row.
- Users cannot insert, delete, or update Pixelfed identity fields.
- Service-role server workflows can write Pixelfed identity fields.
- `npm run check:supabase-security-performance` still passes locally.

## Supabase OAuth Gate

Supabase OAuth Server must be configured according to the current Supabase OAuth
2.1 documentation:

- OAuth Server is enabled.
- Authorization Path is `/oauth/consent`.
- Site URL resolves to the website surface that serves `/oauth/consent`.
- OIDC discovery and UserInfo endpoints are reachable.
- The approved Pixelfed staging client uses an exact redirect URI.
- Requested scopes include `openid profile email`.
- Approval calls are allowed only for active guild members through
  `/api/oauth/decision`.

If ID token generation fails because JWT signing keys are still symmetric,
pause and prepare a JWT signing-key decision packet before continuing.

## Pixelfed Staging Gate

The first login test targets a staging Pixelfed runtime, not production
federation. Pixelfed must be hosted outside Vercel with PHP/Laravel runtime
support, DB, Redis, queue worker, scheduler, HTTPS, private media configuration,
backups, and monitoring.

Minimum staging posture:

- Closed registration.
- SSO/OIDC login enabled.
- Federation disabled.
- Public discovery minimized until moderation is ready.
- Media upload type and size limits configured.
- Moderator/report flow configured.
- Runtime commit or release pinned and documented privately.

Pixelfed OIDC configuration must map Supabase claims without using Discord
display names as authority. Prefer deterministic website member profile slugs
for usernames. If Supabase cannot emit the required claim directly, stop and
prepare a claim bridge or Pixelfed patch decision packet.

## First Login Smoke

Run the first login smoke with no secret values in screenshots, docs, PRs, or
terminal summaries:

1. Open the staging Pixelfed login page.
2. Start OIDC login.
3. Confirm Supabase redirects to `/oauth/consent?authorization_id=...`.
4. Sign in through the website using a verified active guild member account.
5. Confirm the consent page shows client, redirect URI, requested scopes, and
   active member state.
6. Approve the request.
7. Confirm Pixelfed callback completes.
8. Confirm the Pixelfed account is created or linked to the deterministic
   username.
9. Confirm `/social` shows linked status only after the `social_accounts` row
   is written by a trusted server/operator workflow.
10. Confirm account profile-link visibility can be toggled by the signed-in
    owner and appears only on members-only profile pages.

## Negative Smokes

Before declaring first-login ready, verify:

- Missing `authorization_id` fails safely.
- Invalid or stale `authorization_id` fails safely.
- Signed-out user is sent to `/auth` with the consent redirect preserved.
- Non-member approval is denied.
- Suspended member approval is denied.
- Deny action redirects safely without creating a Pixelfed account.
- Duplicate username or duplicate email produces a documented decision packet.
- Logout and re-login do not expose another member's `social_accounts` row.

## Result Packet

Keep the completed result packet private and untracked. The public summary may
state only:

- approved staging URL label, not secrets;
- PR and commit identifiers;
- pass/fail status for each smoke;
- provider settings changed by explicit approval;
- whether first login is ready, blocked, or deferred.

Never paste OAuth client secrets, access tokens, refresh tokens, cookies,
database URLs, service-role keys, private user identifiers, raw headers, or
provider screenshots containing private data into this repo.
