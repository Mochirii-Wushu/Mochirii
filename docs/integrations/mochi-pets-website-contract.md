# Mochi Pets Website Contract

The Website owns the stable, public `/games/mochi-pets` concept route, its
Mochirii presentation, the protected tester doorway, and the Website-only
tester session. The fresh
private `Mochirii-Wushu/Mochirii-Pets` repository owns the new Unity project,
game source, tests, future build artifacts, platform bridges, and game-specific
authentication contract.

The current machine-readable connection is
[`apps/web/config/mochi-pets-connection.json`](../../apps/web/config/mochi-pets-connection.json).
It must validate against
[`mochi-pets-website-contract.v1.schema.json`](./mochi-pets-website-contract.v1.schema.json)
and remain runtime `not-connected` until a separate integration release is
approved. The contract identifies the private source repository plus the Web,
iOS and Mochirii Social boundaries without containing an artifact URL, token,
provider secret or active game API. Its `social.originKey` resolves through the
shared [`public-urls.json`](../../apps/web/config/public-urls.json) contract so
the Social origin has one canonical source.

The connection record is an internal release contract. The public page must not
serialize it into rendered HTML, React Server Component payloads, metadata, or
browser state.

## Current Website Backend

- `POST /games/mochi-pets/member-access` accepts the current browser Website
  access token only in the Authorization header, invokes the existing hosted
  member verifier, requires an active verified member, and then evaluates the
  tester cookie bound to that member. Missing, invalid, revoked, unverified, or
  mismatched access clears the tester cookie and fails closed.
- `POST /games/mochi-pets/tester-login` repeats current member verification,
  then verifies the server-only shared tester passcode before creating an
  eight-hour Website session bound to that member.
- `POST /games/mochi-pets/tester-logout` expires that session.
- The single signed, versioned cookie is HTTP-only, same-site, HTTPS-secure in all
  environments, and scoped to `/games/mochi-pets`.
- `MOCHI_PETS_TESTER_PASSWORD` and `MOCHI_PETS_TESTER_SESSION_SECRET` are
  server-only provider values. The session secret must be an independent random
  value of at least 32 bytes.
- The private doorway is present only in a build with both complete values.
  Without that complete configuration, the route statically renders the public
  concept alone; the access endpoints independently remain fail closed.
- The server accepts 15 to 128 Unicode code points within a 512-byte bound; the
  browser entry field caps input at 128 UTF-16 code units. The credential
  workflow must therefore generate a high-entropy ASCII value in their shared
  range. Submitted Unicode remains supported and is counted by code point.
  No composition rule is imposed. The 15-character minimum, support for at
  least 64 characters, Unicode handling, and absence of composition rules align
  with current [NIST SP 800-63B password-verifier guidance](https://pages.nist.gov/800-63-4/sp800-63b.html#passwordver).
- Password comparison uses scrypt with `N=2^15`, `r=8`, and `p=1`, followed by
  constant-time comparison. This bounded serverless setting is deliberate and
  is not claimed as OWASP parameter parity; member verification, a per-instance
  five-failure/15-minute defense-in-depth limiter, and the required provider
  firewall rule form the online gate.
- Browser session retrieval is only a raw-token handoff. The access token never
  enters a URL, request body, DOM, React state, tester cookie, or application log.
- The cookie authorizes only the Website waiting room. It is not a game API
  credential and must never be sent to a Unity build or another origin.

Before issuing production tester access, add one narrowly scoped Vercel Firewall rate-limit
rule for `POST /games/mochi-pets/tester-login`. The reviewed starting policy is
10 requests per 10 minutes keyed by IP and JA4, returning HTTP 429. Reconfirm
current plan availability and pricing in the official
[Vercel rate-limiting documentation](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
before the provider write. The application-memory limiter is per instance and
is not a substitute for this distributed provider rule or a provider-cost
control for malformed requests.

The waiting room performs no game request and contains no runtime URL, iframe,
repository token, provider credential, Supabase game call, or dependency on the
retired prototype.

## Shared Platform Boundaries

- The same Unity source commit will produce one immutable Web artifact and one
  immutable iOS Unity-as-a-Library export.
- The Website consumes only the Web artifact and a public-safe release manifest.
- `Mochirii-Social-Mobile` consumes only the iOS export and owns native
  navigation, Social OAuth, guild chat, accessibility and Unity lifecycle.
- `social.mochirii.com` remains the single member identity, profile, post,
  moderation and chat platform. Chat does not move into Unity or a second
  backend.
- The Unity runtime never receives the shared tester password, Website cookie,
  Social refresh token, Apple credential or provider secret.

The initial chat scope is one authenticated local guild room. It remains
`not-ready` until the existing Social service has versioned local-only endpoints,
membership authorization, filtering, reporting, blocking, deletion/retention,
rate limiting and monitored moderation. ActivityPub remains disabled.

## Fresh Repository Handoff

The game repository was created from a fresh Unity project and did not reuse the
deleted prototype. Its first artifact connection proposal must provide all of
the following through a focused, reviewed release:

1. Exact repository and immutable source commit.
2. Supported Unity editor version, platforms, resolutions, input methods,
   accessibility targets, performance budgets, and automated test evidence.
3. Immutable hosted build identifier and integrity digest.
4. A small versioned runtime manifest with an HTTPS origin and relative launch
   path; redirects, response size, content type, schema, timeout, and origin
   validation must fail closed.
5. Exact Content Security Policy additions and rollback behavior.
6. A separately threat-modeled, short-lived, audience-scoped launch-ticket or
   identity protocol if the game needs authenticated APIs.
7. Preview evidence before the tracked connection can change from
   `not-connected`.

Raw Supabase access tokens, the Website tester cookie, personal access tokens,
long-lived shared game secrets, and client-embedded provider credentials are
not permitted as the artifact connection protocol. The six quarantined prototype
Edge Functions and any former runtime remain outside this contract.

Changing the JSON schema to admit a connected state is intentionally deferred
until the new repository and runtime exist. This prevents an unreviewed URL or
credential from becoming a dormant production dependency.
