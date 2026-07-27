# Online-Hosted Runtime

Mochirii Social serves production traffic from DigitalOcean and does not use a
local workstation as a server, runner, scheduler, tunnel, database, or media
store.

## Hosted Ownership

- GitHub is the protected source, CI, private GHCR, and manual release control
  plane. Workflows use GitHub-hosted runners only.
- The single DigitalOcean Droplet runs Caddy, Docker, Pixelfed, MariaDB, Redis,
  Horizon, and the Laravel scheduler.
- DigitalOcean Spaces remains the primary media store. Backup storage is a
  separate operational boundary.
- Cloudflare remains the public DNS and proxy edge for
  `https://social.mochirii.com`.
- Supabase remains the hosted identity and account-sync authority. The
  Pixelfed host never receives a Supabase service-role key.

GitHub is a delivery dependency, not a serving dependency. An already deployed
release must continue serving if GitHub or the operator workstation is offline.

## Production Filesystem

```text
/opt/mochirii-social/
  current -> releases/<commit>
  releases/<commit>/
    docker-compose.production.yml
    release.env
    release.meta
  shared/
    pixelfed.env
  data/
    mariadb/
    redis/
    storage/
  backups/
```

The production Compose file accepts only an immutable GHCR digest, contains no
build directives, binds the application to `127.0.0.1:8080`, and uses absolute
data paths. Caddy is the only public path to the app.

Process liveness and dependency readiness are deliberately separate. The
public `/api/service/health-check` confirms only that the application process
can answer. The dependency probe is callable only from the application
container loopback and must be run exactly as:

```sh
docker exec pixelfed-app curl --fail --silent --show-error --max-time 5 http://127.0.0.1:8080/api/service/readiness-check
```

It returns `READY` only after bounded MariaDB and Redis probes succeed. The
same path through `https://social.mochirii.com` must always return opaque
`404`; it is not a public monitoring endpoint.

## Deployment Contract

The `Deploy Mochirii Social production` workflow requires:

- a full commit already merged into `main`;
- the exact digest published for that commit;
- the typed confirmation `DEPLOY social.mochirii.com`;
- `NONE` when no migration is expected, or `MIGRATIONS APPROVED` after a
  reviewed online backup;
- the explicit `ANONYMOUS DENIAL AND CUTOVER VERIFIED` gate only after a
  same-window readback proves that anonymous direct-object and CDN requests are
  denied, private media remains enabled, and an authorized application media
  request still succeeds.

The private-media gate is required for every runtime publication. Do not select
it from historical documentation or assumed provider state. Capture the
public-safe pass/fail evidence outside Git without retaining object keys,
signed URLs, member identifiers, credentials, or response bodies.

The workflow verifies the GHCR commit tag resolves to the supplied digest,
then sends a two-file no-secret release bundle over strict-host-key SSH. The
deploy account is restricted to one forced command, has no Docker group access,
cannot request a shell or forwarding, and can run only the root-owned deploy
wrapper. The wrapper also requires the bundled Compose file to match the
root-owned template accepted during bootstrap, so possession of the deploy key
cannot introduce a new privileged mount or service definition.

The image workflow does not install or attest `/etc/caddy/Caddyfile`. A Caddy
boundary change is a separate host packet: capture the active and reviewed
SHA-256 values, create a root-owned backup, validate a candidate, atomically
replace the target, reload rather than restart Caddy, and prove rollback. Never
assume an image publication activated new Caddy matchers.

Image-only failures automatically restore the prior release. A release that
applies a database migration does not pretend to offer automatic schema
rollback; it remains in maintenance mode for a forward fix or tested restore.

The root-owned deploy wrapper requires both an origin-loopback success and a
public HTTPS success through Cloudflare before returning. The GitHub runner then
checks the public edge independently. A normal 2xx/3xx passes. A 403 passes only
after the authoritative hosted public check has passed; known Cloudflare
challenge and block headers are reported when present. Transport failures and
all other unexpected statuses remain fail-closed without weakening the zone's
security posture for hosted runners.

The manual `Verify Mochirii online hosting` workflow uses the same restricted
deploy identity with the separate typed confirmation
`VERIFY social.mochirii.com`. Its forced command cannot deploy, open a shell,
allocate a PTY, or forward traffic. It runs the live container, Horizon,
scheduler, policy, and origin gates, then writes, reads, and immediately deletes
one random temporary object through Pixelfed's existing Spaces credentials.
The GitHub-hosted runner independently checks the website, social edge,
Supabase Auth boundary, unsigned Reaper and member-access rejection, and the
public Discord API. This workflow is the no-workstation independence proof; it
does not send Discord messages or mutate commands, accounts, or provider
settings.

## Authorization And Revocation Boundary

First-party Social authorization permits only a pre-registered OAuth
authorization-code client with S256 PKCE and an exact callback. Implicit grants,
out-of-band redirects, public client self-registration, personal access tokens,
and interactive token-management surfaces remain unavailable. The Website
binds consent to the exact server-only `MOCHIRII_SOCIAL_OAUTH_CLIENT_ID`; a
missing or mismatched value fails closed before consent.

Local account suspension, deletion state, and current resource audience are
checked on every request. A successful external membership decision may be
cached for no more than 300 seconds to bound provider load; a denial is never
converted into a positive cache entry. This does not mean the external
provider is called on every request. Lower-latency external revocation requires
a separately reviewed authenticated invalidation hook that evicts only the
affected member decision; do not shorten or bypass the current boundary by
adding polling, broad cache flushes, or a new paid service.

## Bootstrap And Rollback

Initial bootstrap is a maintenance operation:

1. Install the restricted deployment runtime with a dedicated public key.
2. Confirm the installer stored the reviewed production Compose template under
   `/opt/mochirii-social/shared`.
3. Run `migrate-production-runtime.sh` as root with the merged commit and exact
   image digest.
4. The script creates a transactional database backup, stops the legacy stack,
   copies data with numeric ownership preserved, starts the online layout, and
   runs runtime gates.
5. If bootstrap fails, it stops the new layout and restarts the untouched
   legacy data paths.

Keep the legacy checkout read-only for 72 hours after deployment, upload,
restore, and reboot acceptance. Do not delete it merely because the first page
load succeeds.

## Secret Boundary

Never print or commit `.env`, database credentials, Spaces keys, OAuth keys,
the GHCR pull token, SSH private keys, signed URLs, or recovery material.
Production secrets live only in protected provider settings or root-owned host
files. Workflow evidence may include commit IDs, image digests, service health,
and whether required values are present.

The private-GHCR pull credential remains only in the approved `mochirii`
account's mode-`600` Docker configuration. The root-owned deploy wrapper asks
that account to pull the exact digest and does not duplicate the token into the
root or deploy-account homes.
