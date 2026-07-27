# Mochirii Social Reliability Provider Packets

Date: 2026-07-27  
Status: source implementation prepared; every provider write remains unapproved

## Scope and verified source evidence

This packet covers only social.mochirii.com availability, its Mochirii website
authorization doorway, and the corresponding production image source.
Registration stays closed and ActivityPub stays disabled.

Read-only production checks established the following:

- The Social authorization start redirects to the current production Supabase
  Auth origin and uses the exact
  https://social.mochirii.com/auth/oidc/callback redirect URI with
  openid, profile, email, and S256 PKCE. No retired staging callback or host was
  observed.
- The Social landing page's secondary action returned to
  https://mochirii.com/social. That route automatically sends an authenticated
  member back to Social, creating the reported apparent no-op loop.
- The website consent component could issue two overlapping authorization
  detail reads: one eager read and one initial auth-state read. Supabase Auth
  deliberately row-locks that request with FOR UPDATE SKIP LOCKED; the
  competing read can therefore receive the same not-found response used for a
  missing or expired request. The prepared source serializes those reads and
  distinguishes explicit not-found responses from retryable failures.
- Public Social responses were intermittently slow during the observation
  window. That is evidence to correlate with edge, origin, reverse-proxy, and
  container telemetry; it is not evidence by itself for a resize or firewall
  bypass.
- A bounded read-only sample completed at 2026-07-27T15:34:38Z: the health
  route returned 200 in 0.982 seconds; two of four landing-page requests
  returned 200 in 0.314 and 1.837 seconds, while the other two returned no
  bytes before their 10- and 15-second limits. No cookie, token, query, member
  identity, response body, or network address was retained.
- A second bounded read-only sample completed at 2026-07-27T16:46:03Z. All
  three landing, login, and health requests returned 200. Login completed in
  0.239-0.262 seconds and health in 0.224-0.288 seconds. Two landing requests
  completed in 0.234-0.237 seconds, while the first required 9.397 seconds.
  This confirms availability but also reproduces the intermittent landing
  latency. Rendered public navigation contained no upstream platform name.
- The same read-only observation confirmed that the live authorization start
  still redirects to the current Supabase authorization endpoint with S256
  PKCE and the canonical social.mochirii.com callback. It also confirmed that
  the live landing page still links its secondary action to `/social`, so the
  source correction in this packet is not yet live.

The source release also adds a bounded container readiness check against the
existing local HTTP health route, removes the mobile login gutter mismatch,
adds the missing guest CSRF metadata, and removes public fallback references to
the upstream product name. The exact requested Mochirii description is shared
by the landing and login surfaces.

The reviewed source boundary is private by default: only the Mochirii landing,
login, OIDC/OAuth handshake, health, and legal routes are reachable while
signed out. Profiles, posts, timelines, groups, media fallbacks, directories,
and API member data fail closed. Direct password login is unavailable while
Mochirii OIDC is enabled. ActivityPub, WebFinger, NodeInfo, Atom, and related
federation routes have both disabled defaults and an unconditional 404 route
boundary. No public Website or Social navigation source contains the upstream
platform name.

Local browser verification passed 18 of 18 login cases across Chromium,
Firefox, and WebKit at 320, 360, and 390 CSS-pixel portrait widths and their
landscape counterparts. The checks cover horizontal reflow, a 44 CSS-pixel
primary target, zoomable viewport metadata, CSRF metadata, absence of the
password form, exact Mochirii copy, and absence of upstream branding in public
navigation. A production-build browser check also preserved the exact OAuth
authorization ID through the nested Website login return URL in Chromium,
Firefox, and WebKit. This is source verification only and does not claim a
production rollout.

## Read-only correlation procedure

Use one UTC window and record only status, duration, route category, Cloudflare
Ray/colo metadata, container state, and resource measurements. Do not capture
cookies, authorization codes, URL fragments, request bodies, environment
variables, database contents, member identifiers, or OAuth credentials.

1. Sample the landing page, login, authorization start, and
   /api/service/health-check from at least two independent regions. Bound every
   request to 10 seconds.
2. In Cloudflare analytics, correlate the same UTC window by hostname, status,
   edge location, and Ray ID. Record whether a security rule actually matched.
3. In DigitalOcean Monitoring, correlate CPU, memory, load, disk, and network
   graphs. Do not resize the Droplet.
4. On the production host, read only:
   - systemctl status caddy
   - bounded Caddy journal lines for the UTC window
   - docker compose ps
   - docker inspect state and health for the application, database, cache,
     queue worker, and scheduler
   - bounded container logs for the same window
   - kernel out-of-memory events for the same window
   Route all captured container diagnostics through the source redaction helper
   before they leave the host. Callback queries and authentication parameters,
   including authorization IDs, codes, PKCE verifiers, state, and tokens, must
   never appear in retained output.
5. Stop and escalate if the evidence shows disk exhaustion, an OOM kill,
   repeated restarts, failed database/cache health, or an edge block. Do not
   compensate by broadly bypassing Cloudflare or restarting unrelated services.

Cloudflare documents a 522 as an edge-to-origin connection timeout, so a 522
must be diagnosed at that boundary rather than treated as an application
status code. Docker distinguishes a running process from application
readiness; the new health check measures the latter.

## Packet A: reviewed Social image rollout

**Not authorized by this document.**

- Target: the three Social application services that already consume one
  immutable reviewed GHCR image digest.
- Before capture: current immutable digest; Compose project/service states;
  application/database/cache health; public route samples; closed-registration
  and disabled-federation readbacks.
- Intended after value: one immutable digest built from the exact merged commit
  containing only the reviewed source changes. No environment, database,
  storage, DNS, Cloudflare, OAuth-client, Droplet-size, or secret change.
- Writer: the protected GitHub production workflow and its existing
  least-privilege deployment identity.
- Verification:
  1. Image signature, provenance, source revision, and architecture manifests
     match the reviewed commit.
  2. Application container reaches HTTP healthy after the startup grace period.
  3. Database, cache, queue worker, and scheduler remain healthy.
  4. The landing, login, health, and OIDC start/callback boundary pass bounded
     checks.
  5. Desktop and mobile landing/login surfaces show only Mochirii branding,
     have no horizontal overflow, and produce no deterministic CSRF console
     error.
  6. A fresh active-member flow preserves one authorization request through
     website login, shows consent once, and returns to the canonical Social
     callback.
- Rollback: use the existing production workflow to restore the captured prior
  immutable digest; verify the same health and public routes. Do not roll back
  database state because this packet contains no migration.
- Stop conditions: digest/source mismatch, unsigned image, required migration,
  unhealthy dependency, repeated restart, callback-host drift, authorization
  request loss, public vendor branding, registration opening, federation
  exposure, or any unexpected provider/configuration diff.

## Packet B: narrowly scoped Cloudflare correction

**Deferred unless read-only security-event evidence identifies one exact
Cloudflare rule as the cause.**

- Target: only the confirmed offending rule on social.mochirii.com and only
  the confirmed method/path. Do not create a hostname-wide skip, switch the
  record to DNS-only, disable managed protection, or alter unrelated zones.
- Before capture: rule ID, expression, action, priority, hostname, method/path,
  matching Ray IDs, and the current public/origin result.
- Intended after value: the smallest rule edit or exception that removes only
  the proven false positive. A health-path exception, if required, must be
  limited to GET /api/service/health-check and must not bypass authentication
  or rate limits on any member route.
- Writer: one authenticated Cloudflare operator with MFA.
- Verification: the exact matching event stops; unrelated managed protections
  still apply; origin and public readiness both pass; no DNS/TLS change.
- Rollback: restore the captured rule/action/priority or remove the newly
  created narrow exception.
- Stop conditions: no matching security event, ambiguous rule ownership,
  request-host mismatch, need for a broad bypass, DNS/TLS impact, or worsening
  errors.

## Packet C: sensitive callback containment

**Separate approval required; no action was performed.**

A browser callback fragment was observed to contain sensitive session
material. No value or identifier may be copied into Git, logs, issue text, PR
text, screenshots, or provider tickets.

- Target: only the affected website session and linked identity-provider grant.
- Intended action: revoke those exact sessions/grants through their official
  account controls, then start a new authorization flow after the PKCE source
  release is live.
- Verification: the old session/grant no longer works; a fresh PKCE callback
  uses a short-lived code in the query and never returns session material in a
  URL fragment; website and Social sign-in still work.
- Rollback: revocation is intentionally not reversible. The member signs in
  again and grants access through the reviewed canonical flow.
- Stop conditions: uncertain account/grant target, inability to identify the
  affected session privately, request to expose a credential for comparison,
  or any broader provider-account change.

## References

- [Supabase OAuth 2.1 flow](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows)
- [Supabase authorization details API](https://supabase.com/docs/reference/javascript/oauth-server-getauthorizationdetails)
- [Supabase PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Supabase Auth implementation](https://github.com/supabase/auth/blob/master/internal/api/oauthserver/authorize.go)
- [Docker Compose startup order and health](https://docs.docker.com/compose/how-tos/startup-order/)
- [Docker Compose healthcheck reference](https://docs.docker.com/reference/compose-file/services/#healthcheck)
- [Cloudflare 522 guidance](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-522/)
- [Caddy reverse proxy health checks](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#active-health-checks)
- [DigitalOcean metrics agent](https://docs.digitalocean.com/products/monitoring/how-to/install-metrics-agent/)
