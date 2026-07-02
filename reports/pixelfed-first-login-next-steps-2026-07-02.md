# Pixelfed First Login Next Steps

Date: 2026-07-02

Status: Supabase OAuth Server gate complete; Pixelfed staging and OAuth client
registration remain approval-gated.

## Source Anchors

- Supabase OAuth 2.1 Server setup requires enabling the server, setting the
  Authorization Path, building the consent UI, and registering OAuth clients:
  <https://supabase.com/docs/guides/auth/oauth-server/getting-started>
- Supabase OAuth 2.1 uses authorization-code flow with PKCE and OIDC discovery:
  <https://supabase.com/docs/guides/auth/oauth-server>
- Pixelfed expects a separate PHP/Laravel runtime with database, Redis, queues,
  scheduler, HTTPS, and reverse proxy support:
  <https://pixelfed.github.io/docs-next/running-pixelfed/installation.html>
- Pixelfed is AGPL-licensed software; keep application code and infrastructure
  outside this website repo:
  <https://github.com/pixelfed/pixelfed>
- Media-upload controls should follow OWASP guidance for allowlisted types,
  server-side validation, generated names, size limits, authorized uploads, and
  malware scanning where available:
  <https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html>

## Current Verified State

- PR #351 is merged on `main`.
- Website repo first-login readiness passes.
- Supabase OAuth Server is enabled for project `deyvmtncimmcinldjyqe`.
- Authorization Path is `/oauth/consent`.
- Supabase Site URL is `https://mochirii.com`.
- Dynamic OAuth client registration is disabled.
- Supabase OAuth/OIDC discovery is reachable and advertises Authorization,
  Token, UserInfo, JWKS, `openid`, `profile`, `email`, and PKCE `S256`.
- No Pixelfed OAuth client secret, host secret, database URL, cookie, token, or
  media credential is stored in this repo.

## Recommended Next Steps

1. Choose the staging Pixelfed URL and host plan.
   Default target remains `https://social.mochirii.com`, but DNS and hosted
   runtime provisioning still require explicit approval.

2. Register the Pixelfed OAuth client only after the callback URI is final.
   Required approval:
   `Approve registering the Pixelfed OAuth client for social.mochirii.com with redirect URI https://social.mochirii.com/auth/oidc/callback.`

3. Store the returned client ID and client secret only in the approved private
   host secret store and local credential vault under
   `C:\Users\xtyty\Documents\Creds`; never commit or print them.

4. Provision Pixelfed staging outside Vercel with closed registration, OIDC-only
   login, federation disabled, upload limits, queue worker, scheduler, HTTPS,
   backups, monitoring, and moderation/report flow.
   Required approval:
   `Approve provisioning the Pixelfed staging host at [host/provider] with the reviewed cost, backup, and monitoring plan.`

5. Configure Pixelfed OIDC against Supabase:
   - `PF_OIDC_ENABLED=true`
   - `PF_OIDC_SCOPES=openid profile email`
   - Authorization endpoint:
     `https://deyvmtncimmcinldjyqe.supabase.co/auth/v1/oauth/authorize`
   - Token endpoint:
     `https://deyvmtncimmcinldjyqe.supabase.co/auth/v1/oauth/token`
   - UserInfo endpoint:
     `https://deyvmtncimmcinldjyqe.supabase.co/auth/v1/oauth/userinfo`
   - `PF_OIDC_USERNAME_FIELD=preferred_username`
   - `PF_OIDC_FIELD_ID=sub`

6. Run the live provider/staging gate:
   `npm run check:pixelfed-first-login-readiness` with the provider and staging
   assertion environment variables from `docs/pixelfed-first-login-testing.md`.

7. Prompt for first admin account creation only after the provider and staging
   assertions pass. The first admin account is not needed yet because there is
   no approved Pixelfed OAuth client or reachable staging runtime.

## Accepted Current Blockers

- `social.mochirii.com` is not yet confirmed as a reachable Pixelfed runtime.
- The Pixelfed OAuth client has not been registered.
- Pixelfed client ID/secret have not been created or stored.
- The first browser login smoke cannot start until staging exists.
- First admin account creation is deliberately deferred until the staging gate
  passes.
