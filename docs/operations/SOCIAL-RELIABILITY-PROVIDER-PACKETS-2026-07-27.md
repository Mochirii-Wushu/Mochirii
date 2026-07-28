# Mochirii Social Reliability Provider Packets

Date: 2026-07-27
Status: source implementation prepared; only the separately approved emergency
installer-path Caddy block is live. Image rollout, full Caddy alignment,
Cloudflare, callback containment, OAuth binding, and private-media work remain
unapproved.

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
- The separately approved emergency Caddy boundary was installed without an
  image or container change. Readback returned 200 for Social root and login,
  and an empty 404 with `Cache-Control: private, no-store` for `/installer`,
  `/installer/`, and a descendant. No Docker, Cloudflare, DNS, database,
  secret, image, or other provider setting changed with that narrow block.

The source release also separates process liveness from a bounded container
readiness route that requires both MariaDB and Redis, removes the mobile login gutter mismatch,
adds the missing guest CSRF metadata, and removes public fallback references to
the upstream product name. The exact requested Mochirii description is shared
by the landing and login surfaces.

Member-access source also closes the stale-verification dead end. Positive
Discord role evidence is refreshed when its seven-day bound expires; a recent
negative result is cached for only five minutes to avoid provider polling while
still allowing prompt recovery after onboarding. Approval performs a fresh
check. Every Discord lookup has a five-second timeout, preserves rate-limit
responses, maps temporary upstream failure to unavailable rather than inactive,
and refuses to retain old access if a definitive negative state cannot be
written.

The reviewed source boundary is private by default: only the Mochirii landing,
login, OIDC/OAuth handshake, health, and legal routes are reachable while
signed out. Profiles, posts, timelines, groups, media fallbacks, directories,
and API member data fail closed. Direct password login is unavailable while
Mochirii OIDC is enabled. ActivityPub, WebFinger, NodeInfo, Atom, and related
federation routes have both disabled defaults and an unconditional 404 route
boundary. No public Website or Social navigation source contains the upstream
platform name.

Local browser verification passed 56 of 56 landing/login route and viewport
cases across Chromium, Firefox, and WebKit, including 320, 360, and 390
CSS-pixel portrait widths, short landscape, asymmetric synthetic safe areas,
and a keyboard-like viewport resize. The checks cover horizontal reflow, a 44
CSS-pixel primary target, zoomable viewport metadata, CSRF metadata, absence of
the password form, exact Mochirii copy, and absence of upstream branding in
public navigation. A production-build browser check also preserved the exact
OAuth authorization ID through the nested Website login return URL in all
three engines. This is emulated source verification only and does not claim a
production rollout or a physical Safari result.

The completed responsive source contract now uses a `100vh` fallback followed
by `100dvh`, all four safe-area insets, short-height vertical reflow, and a
scrollable focus boundary that remains usable when a software keyboard reduces
the visual viewport. Browser emulation covers representative current iPhone
CSS viewports, asymmetric synthetic safe areas, short landscape, and a
keyboard-like viewport resize in Chromium, Firefox, and WebKit. This evidence
does not claim a physical Safari result; real iPhone and iPad checks remain a
separate release gate.

The tracked Caddy source also overwrites every inbound `X-Request-ID` with one
request-scoped UUID before proxying and sets the same UUID on the response.
Laravel accepts only one canonical UUID-shaped value, replaces a missing,
duplicated, or malformed value without echoing it, and adds only the validated
UUID to HTTP log context. Production exception metadata and dependency-failure
health logs can therefore be correlated without recording a member identity,
cookie, authorization value, URL query, request body, secret, or raw exception
message.

## Read-only correlation procedure

Use one UTC window and record only status, duration, route category, the
generated response request ID, Cloudflare Ray/colo metadata, container state,
and resource measurements. Treat the response request ID as an opaque
correlation value and never reuse or accept a caller-supplied value. Do not capture
cookies, authorization codes, URL fragments, request bodies, environment
variables, database contents, member identifiers, or OAuth credentials.

1. Sample the landing page, login, authorization start, and public process
   liveness route `/api/service/health-check` from at least two independent
   regions. Bound every request to 10 seconds. Do not interpret liveness alone
   as database/cache readiness.
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
   - the origin-only `/api/service/readiness-check`, using exactly
     `docker exec pixelfed-app curl --fail --silent --show-error --max-time 5 http://127.0.0.1:8080/api/service/readiness-check`;
     it must return `READY` only after both MariaDB and Redis respond within
     their bounded probes, while the same route through
     `https://social.mochirii.com` must remain an opaque `404`
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
readiness; `/api/service/health-check` measures liveness, while Docker uses the
five-second-bounded `/api/service/readiness-check` dependency probe.

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
- Boundary: the image workflow does not install or attest the host Caddyfile.
  The retired-route and dependency-readiness edge matchers do not become live
  until the separately approved Caddy packet below is applied and verified.
- Writer: the protected GitHub production workflow and its existing
  least-privilege deployment identity.
- Verification:
  1. Image signature, provenance, source revision, and architecture manifests
     match the reviewed commit.
  2. Application container reaches dependency-aware HTTP readiness after the
     startup grace period; the separate public liveness route also responds.
  3. Database, cache, queue worker, and scheduler remain healthy.
  4. The landing, login, health, and OIDC start/callback boundary pass bounded
     checks.
  5. Desktop and mobile landing/login surfaces show only Mochirii branding,
     have no horizontal overflow, remain vertically reachable across safe-area,
     short-height, and keyboard-reduced viewports, and produce no deterministic
     CSRF console error. Emulated WebKit evidence does not replace the physical
     Safari gate.
  6. The response exposes one UUID request ID matching the redacted application
     exception/health context when an error is deliberately exercised in a
     local or Preview fixture. A malformed caller header is overwritten and is
     absent from retained output.
  7. A fresh active-member flow preserves one authorization request through
     website login, shows consent once, and returns to the canonical Social
     callback.
  8. Anonymous requests to both the direct media object and its CDN form are
     denied, private-media configuration is enabled on readback, and one
     authorized application media request succeeds. Only then may the operator
     select `ANONYMOUS DENIAL AND CUTOVER VERIFIED`.
- Rollback: use the existing production workflow to restore the captured prior
  immutable digest; verify the same health and public routes. Do not roll back
  database state because this packet contains no migration.
- Stop conditions: digest/source mismatch, unsigned image, required migration,
  unhealthy dependency, repeated restart, callback-host drift, authorization
  request loss, public vendor branding, registration opening, federation
  exposure, anonymous direct-object or CDN access, private-media readback drift,
  or any unexpected provider/configuration diff.

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
  still apply; public liveness and origin-only dependency readiness both pass;
  no DNS/TLS change.
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

## Packet D: atomic production Caddy boundary

**Separate exact approval required; no action was performed.**

The live emergency installer-only matcher is a strict subset of this packet.
It does not align the full reviewed source Caddyfile and does not establish the
request-ID, dependency-readiness, private-storage, or complete retired-route
boundaries below.

- Target: only `/etc/caddy/Caddyfile` on the current Social host, sourced from
  the exact reviewed `services/social/caddy/Caddyfile`. Do not change DNS,
  TLS, Cloudflare, Docker, application environment, or any other host file.
- Before capture: merged commit; source and active-target SHA-256 values;
  `caddy validate` result; Caddy service state; direct container readiness;
  public liveness; public readiness `404`; and status-only reads for every
  retired route. Store no response bodies, cookies, query values, member data,
  or credentials.
- Writer: one MFA-authenticated host operator with root access, using the
  reviewed `services/social/scripts/install-production-caddy.sh` from the
  exact merged checkout.
- Intended write: create a root-owned mode-`0600` backup of the active target,
  validate a root-owned candidate in `/etc/caddy`, atomically rename the
  candidate over the target on the same filesystem, and reload Caddy. Do not
  restart Caddy or any container.
- Verification:
  1. The active target SHA-256 exactly equals the reviewed source SHA-256.
  2. `caddy validate` passes before and after the atomic rename.
  3. An arbitrary malformed inbound `X-Request-ID` is not forwarded or echoed;
     the response contains one generated UUID and the same UUID appears in the
     redacted application log fixture without any request query, member data,
     cookie, authorization value, body, or secret.
  4. `docker exec pixelfed-app curl --fail --silent --show-error --max-time 5 http://127.0.0.1:8080/api/service/readiness-check`
     succeeds, while the public readiness route returns `404`.
  5. Every reviewed retired installer, registration, client-management,
     personal-token, token-management, and invite path returns opaque `404`.
  6. `/oauth/token` and `/oauth/authorize` are not caught by a Caddy `404`;
     the first-party authorization-code boundary remains reachable.
  7. Landing, login, health, and one fresh first-party authorization flow pass
     without exposing upstream branding or diagnostic detail.
- Rollback: validate the captured root-owned backup, atomically rename a copy
  over the target, reload Caddy, and repeat the same direct/public gates.
- Stop conditions: source/target hash ambiguity, invalid candidate, missing
  backup, reload failure, dependency failure, any retired route not `404`, an
  OAuth route caught by the matcher, unexpected configuration diff, or a need
  to restart unrelated services.

## Packet E: server-only Website OAuth client binding

**Applied under exact approval on 2026-07-28; production deployment unchanged.**

- Target: only the `MOCHIRII_SOCIAL_OAUTH_CLIENT_ID` variable in the existing
  Vercel Website project, for Production and Preview. It is an identifier, not
  a client secret, but its value must not be copied into Git, PRs, logs, docs,
  screenshots, tickets, or customer responses.
- Read-only before capture on 2026-07-27: the variable was absent from both
  Preview and Production in the existing Website project. The live Social
  authorization redirect contains a nonempty first-party client identifier,
  the exact callback `https://social.mochirii.com/auth/oidc/callback`, and S256
  PKCE. The identifier value was not printed or recorded. The exact registered
  client inventory was reconciled before writing; no implicit or out-of-band
  redirect was accepted.
- Applied after value: the exact registered first-party client ID is present as
  a Sensitive server-only variable for Production and Preview. No
  `NEXT_PUBLIC_` equivalent, client secret, OAuth client, redirect, or provider
  setting was created or changed. The existing Production deployment was not
  redeployed solely for this setting.
- Verification: reviewed PR #535 produced an exact-head Vercel Preview and a
  non-skipped Supabase Preview. The live authorization redirect and registered
  client readback agreed on the first-party client, exact callback, and S256
  PKCE request. An unsigned decision reached the configured application route
  and failed with its private/no-store `401`; the identifier was absent from
  rendered HTML and all loaded client assets. A genuine active-member approval
  or denial remains a post-release manual acceptance gate and must not be
  simulated with a real authorization request during source verification.
- Rollback: restore the captured previous value and scopes, or remove the
  variable if it was previously absent, then redeploy the prior Website
  commit and repeat the fail-closed checks.
- Stop conditions: ambiguous client inventory, callback mismatch, implicit or
  out-of-band flow, browser-exposed variable, requested secret handling,
  unrelated environment diff, or inability to prove the deployed source.

## References

- [Supabase OAuth 2.1 flow](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows)
- [Supabase authorization details API](https://supabase.com/docs/reference/javascript/oauth-server-getauthorizationdetails)
- [Supabase PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Supabase Auth implementation](https://github.com/supabase/auth/blob/master/internal/api/oauthserver/authorize.go)
- [Docker Compose startup order and health](https://docs.docker.com/compose/how-tos/startup-order/)
- [Docker Compose healthcheck reference](https://docs.docker.com/reference/compose-file/services/#healthcheck)
- [Cloudflare 522 guidance](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-522/)
- [Caddy reverse proxy health checks](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#active-health-checks)
- [Caddy reverse proxy header manipulation](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#headers)
- [DigitalOcean metrics agent](https://docs.digitalocean.com/products/monitoring/how-to/install-metrics-agent/)
- [Caddy command-line validation](https://caddyserver.com/docs/command-line#caddy-validate)
- [Next.js environment variables](https://nextjs.org/docs/app/guides/environment-variables)
