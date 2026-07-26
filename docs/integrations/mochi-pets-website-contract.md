# Mochi Pets Website Contract

The Website owns the stable `/games/mochi-pets` route, its Mochirii presentation,
the shared tester-password form, and the Website-only tester session. The fresh
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

## Current Website Backend

- `POST /games/mochi-pets/tester-login` verifies the server-only shared tester
  password and creates an eight-hour Website session.
- `POST /games/mochi-pets/tester-logout` expires that session.
- The signed, versioned cookie is HTTP-only, same-site, HTTPS-secure in hosted
  environments, and scoped to `/games/mochi-pets`.
- `MOCHI_PETS_TESTER_PASSWORD` and `MOCHI_PETS_TESTER_SESSION_SECRET` are
  server-only provider values. The session secret must be an independent random
  value of at least 32 bytes.
- The cookie authorizes only the Website waiting room. It is not a game API
  credential and must never be sent to a Unity build or another origin.

Before production activation, add one narrowly scoped Vercel Firewall rate-limit
rule for `POST /games/mochi-pets/tester-login`. The reviewed starting policy is
10 requests per 10 minutes keyed by IP and JA4, returning HTTP 429. Reconfirm
current plan availability and pricing in the official
[Vercel rate-limiting documentation](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
before the provider write. Application-memory counters are not an acceptable
substitute in a distributed serverless runtime.

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
