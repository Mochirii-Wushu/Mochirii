# Pixelfed First Login Next Steps

Date: 2026-07-02

Status: Supabase OAuth Server gate complete; DigitalOcean staging resources
exist; first-login testing is blocked on Droplet SSH access, DNS, runtime
installation, and Pixelfed OAuth token-auth compatibility.

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
- Pixelfed OIDC currently builds on The PHP League `GenericProvider` through
  `UserOidcService`, and its environment keys are defined in `remote-auth.php`:
  <https://github.com/pixelfed/pixelfed/blob/dev/app/Services/UserOidcService.php>
  <https://github.com/pixelfed/pixelfed/blob/dev/config/remote-auth.php>
- Supabase OAuth clients support `client_secret_basic` and
  `client_secret_post`; confidential clients default to `client_secret_basic`:
  <https://supabase.com/docs/guides/auth/oauth-server/getting-started#token-endpoint-authentication-method>
- DigitalOcean Droplet rebuilds are irreversible and recovery-console password
  reset is a separate recovery path:
  <https://docs.digitalocean.com/products/droplets/how-to/rebuild/>
  <https://docs.digitalocean.com/products/droplets/how-to/recovery/recovery-console/>
- DigitalOcean user data/cloud-init is provided only during Droplet creation and
  cannot be modified after a Droplet is created:
  <https://docs.digitalocean.com/products/droplets/how-to/provide-user-data/>
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
- A Pixelfed OAuth client credential pair exists only under the local
  credential folder and is not stored in this repo.
- The current Pixelfed OAuth client redirects to the Mochirii consent UI, but
  its token endpoint auth method is `client_secret_basic`. Current unpatched
  Pixelfed OIDC uses The PHP League `GenericProvider`, so the staging client
  should use `client_secret_post` unless a Pixelfed patch/custom provider is
  approved and tested.
- DigitalOcean dashboard shows a staging Droplet and Spaces bucket under the
  `Mochirii Social` project. The Droplet is active on Ubuntu 24.04 in SGP1 with
  automated weekly backups enabled. The Spaces bucket is empty, uses SGP1,
  restricts file listing, and has CDN enabled.
- Local SSH offered the expected ED25519 key fingerprint, but the Droplet
  rejected it for both the intended non-root user and root. Pixelfed runtime
  provisioning cannot continue until host access is recovered or the empty
  Droplet is rebuilt/recreated with the approved SSH key and cloud-init.
- `social.mochirii.com` and `media.social.mochirii.com` do not yet resolve to
  usable host records.
- No Pixelfed OAuth client secret, host secret, database URL, cookie, token, or
  media credential is stored in this repo.

## Recommended Next Steps

1. Recover DigitalOcean host access before installing Pixelfed. Because user
   data/cloud-init cannot be modified after creation and the Droplet is still
   empty, the cleanest path is to create a replacement Droplet with the reviewed
   cloud-init script and approved SSH key, verify SSH, then destroy the
   inaccessible empty Droplet. Recovery-console root-password reset is a
   fallback, but it is more manual and introduces a temporary password path.

   Required approval:
   `Approve creating a replacement DigitalOcean Pixelfed staging Droplet in project Mochirii Social with SGP1, Ubuntu 24.04, the same plan, automated backups, the approved SSH key, and the non-root cloud-init hardening script, then destroying the inaccessible empty Droplet after SSH to the replacement is verified.`

2. Update or re-register the Pixelfed OAuth client for the final callback URI
   using `client_secret_post` unless a Pixelfed patch/custom provider is
   explicitly chosen.

   Required approval:
   `Approve updating or re-registering the Pixelfed OAuth client for social.mochirii.com with redirect URI https://social.mochirii.com/auth/oidc/callback and token endpoint auth method client_secret_post.`

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
   assertions pass. The first admin account is not needed yet because the
   staging runtime is not reachable and the OAuth client token-auth method needs
   correction or a documented Pixelfed patch.

## Accepted Current Blockers

- `social.mochirii.com` is not yet confirmed as a reachable Pixelfed runtime.
- The DigitalOcean Droplet currently rejects the expected SSH key.
- The Pixelfed OAuth client exists locally, but its token endpoint auth method
  does not match the expected unpatched Pixelfed token exchange.
- The first browser login smoke cannot start until staging exists.
- First admin account creation is deliberately deferred until the staging gate
  passes.
