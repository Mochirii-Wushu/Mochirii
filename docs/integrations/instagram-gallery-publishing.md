# Instagram Gallery Publishing

## Source release status

This no-secret contract tethers the moderator-approved Gallery queue to the
official Mōchirīī Instagram account. It does not authorize a hosted migration,
Edge Function or Website deployment, secret change, feature-flag change, or
live publication.

Evidence reviewed on 2026-07-29 shows:

- `INSTAGRAM_PUBLISH_ENABLED=false`, and the source packet is not evidence of a
  hosted deployment or live post;
- the dedicated employee system user has Content-only access to the Page and
  linked Instagram asset plus partial Develop-app access, with no full app
  management, ad account, or ad scope;
- the Marketing API use case exists only because Meta's documented system-user
  installation flow requires Ads Management API Standard Access;
- a 60-day token with exactly `pages_manage_posts`,
  `pages_read_engagement`, and `pages_show_list` was revoked after every Graph
  request returned OAuthException 200 `API access blocked` behind the unresolved
  `Account confirmation needed` checkpoint;
- no current Page-task, linked Instagram Graph identity, subtype, scope, token
  binding, expiry, data-access-expiry, or quota proof exists;
- the retired administrator publisher has no assets, installed app, or token
  and remains clearly labeled as legacy; and
- hosted secret values are not documented or assumed. Fresh name-only secret
  inventory and successful read-only provider proof are required later.

## Canonical provider identity

- Public account: [`@mochirii_guild`](https://www.instagram.com/mochirii_guild/)
- Account type: Instagram Professional, Business; verify the subtype manually
  in Meta owner UI rather than querying an undocumented `account_type` field.
- Linked Page: the official Mōchirīī Facebook Page.
- App: the dedicated Mochirii Gallery publishing app.

The Page-linked `instagram_business_account.id` returned by a future successful
Graph read is the authoritative private runtime identity. Never substitute an
Accounts Center, Business Settings, or other inventory identifier. Independently
store matching configured and expected Graph IDs only as server secrets and
never document or return their values.

## Release boundary

This integration publishes a moderator-approved private JPEG derivative to
`@mochirii_guild`. The account must be a Professional Business account linked
to the exact Mochirii Facebook Page. Business subtype is verified manually in
Meta owner UI; this code does not query an undocumented `account_type` field.

Gallery approval and publication are separate audited actions. Publication
requires `job_id`, final `caption`, required moderator-reviewed `alt_text`,
exact `expected_updated_at`, a confirmation fingerprint, and
`confirm_instagram_publish: true`. The fingerprint binds destination, current
job state and attempt, caption, alt text, and authenticated moderator. Edge
recomputes it and the begin RPC atomically rechecks the revision.

## Consent and media safety

Member consent is independent of Facebook, unchecked by default, and exact:

```text
I authorize Mōchirīī moderators to publish this image and its moderator-approved caption on the public official Mōchirīī Instagram account after gallery approval.
```

The current server-attested handshake is
`2026-07-website-public-instagram-publish-v3`. The browser submits the boolean,
exact handshake, and upload-rights attestation as untrusted claims. The database
verifies the Website source and current version, then stamps time, source, and
copy provenance. Missing, stale, Discord, or arbitrary client evidence remains
historical and API-ineligible; no earlier version is silently upgraded.

Social opt-ins accept only a source JPEG already 320–1440 pixels wide, no more
than 1800 pixels high, within the 4:5 through 1.91:1 feed ratio, and within the
8 MiB provider limit. PNG and WebP remain valid for Gallery-only submissions.
The browser never supplies publication bytes.

During approval, Edge downloads the frozen consented source, checks its object
identity, version, timestamp, byte count, dimensions, and SHA-256, and derives a
private JPEG without changing frame or entropy-coded image data. It retains at
most one strict first-segment minimal JFIF APP0 marker, removes comments, and
rejects every other APP0/JFXX or APP1–APP15 segment, conversion, resize, padding,
or crop. Each attempt uses an unpredictable immutable revision path.

The database binds source and derivative objects, versions, timestamps,
digests, derivation method, destination, and v3 consent in the same transaction
as Gallery approval and outbox creation. Browser roles cannot read the private
derivative boundary. Before signing a short-lived URL for Meta, Edge rechecks
the exact bound bytes and requires HTTPS, the configured Supabase origin, the
private derivative path, no fragment or credentials, and no bearer value in the
URL. Missing, replaced, overwritten, or legacy-unbound evidence quarantines the
job.

## Runtime configuration

All values are Supabase Edge Function secrets and must never enter Git, Vercel,
browser variables, logs, screenshots, artifacts, or PR text.

```text
META_APP_ID
META_EXPECTED_APP_ID
META_APP_SECRET
INSTAGRAM_ACCOUNT_ID
INSTAGRAM_EXPECTED_ACCOUNT_ID
INSTAGRAM_ACCESS_TOKEN
INSTAGRAM_API_VERSION=v26.0
INSTAGRAM_PUBLISH_ENABLED=false
```

Configured and independently expected identifiers must be numeric and match
exactly. Facebook and Instagram flags are independent.

The public Instagram website/link field stays empty. Public contact may use
`support@mochirii.com`, while Mochirii's own legal pages remain on
`mochirii.com`. Moderator-approved caption and alt text may not contain or
share any URL.

## Provider request contract

- Origin is fixed to `https://graph.facebook.com`.
- Every Graph path is pinned to `/v26.0/`.
- Tokens travel only through `Authorization: Bearer`.
- Every request gets a fresh five-minute `appsecret_time` and HMAC-SHA256
  `appsecret_proof`.
- Redirects are rejected, timeouts and responses are bounded, and no provider
  request is automatically retried.
- Caption and alt text reject schemes, `www`, bare domains, link shorteners,
  and other URL-like text, including common obfuscations.

Before a write, the publisher reads the exact account id and username and
queries `content_publishing_limit`. Usage and total come from Meta; no quota is
hard-coded. Missing, malformed, or exhausted quota evidence fails closed. The
read-only diagnostic first queries the independently pinned Facebook Page for
its `instagram_business_account`, requires the returned Page id and linked
Instagram id to match the runtime and independent server-side pins exactly,
and returns only safe linkage booleans. It never returns either provider id or
the raw Graph response.

The source is a randomized, metadata-stripped, database-attested JPEG exposed
to Meta only by a temporary bearer-free signed URL. The URL must be HTTPS,
origin-bound to the configured Supabase project, and scoped to the private
Gallery social-derivative path:

1. `POST /{ig-user-id}/media`
2. one immediate bounded read of container `status_code`, with the closed
   allowlist `FINISHED`, `IN_PROGRESS`, `ERROR`, `EXPIRED`, and `PUBLISHED`;
   only `FINISHED` may continue in the same invocation. `IN_PROGRESS`, every
   terminal failure, and every unknown or oversized value enter
   reconciliation without an in-request polling loop or retention of the raw
   provider value
3. `POST /{ig-user-id}/media_publish`
4. read media `id,owner,username,permalink,media_type`

Success requires the returned id, independently pinned owner, exact username,
image type, and canonical permalink. Network loss, timeout, 5xx, missing id,
non-terminal container, or missing ownership evidence enters
`reconcile_required`.

## Delivery and reconciliation

Publishing uses an atomic server lease. A lease older than 15 minutes,
ambiguous provider outcome, failed local success audit, unknown container state,
or incomplete ownership evidence enters `reconcile_required`; direct and
automatic retries are forbidden. Queue reads use status-bound stable keyset
pagination so every job remains reachable without unstable offsets.

Only one immediate container-status read is permitted. `FINISHED` may continue
to `media_publish`; `IN_PROGRESS`, `ERROR`, `EXPIRED`, `PUBLISHED`, any unknown
value, or an oversized response stops and requires reconciliation. There is no
in-request polling or sleep loop.

A moderator reconciliation confirmation is fingerprinted to the unchanged job
state, attempt, resolution, note, media identifier, permalink, and moderator.
`confirmed_published` uses the identifier only as a Graph lookup key and
independently verifies pinned owner, username, image type, and canonical
permalink. `confirmed_not_published` rejects contradictory provider evidence.

Manual completion is disabled. The browser receives only a credential-free
approved Gallery thumbnail, never the frozen JPEG, private object path, digest,
or reusable signed URL. Direct service-role queue and event table access is
read-only; reviewed RPCs own every transition. Raw provider bodies and messages,
tokens, private identifiers, member paths, hashes, and signed URLs never enter
browser DTOs, logs, or audit text.

## Endpoints, diagnostics, and withdrawal

Authenticated moderator `POST` endpoints, all with `verify_jwt=true`:

- `check-instagram-api-status`
- `list-instagram-publish-queue`
- `publish-instagram-gallery-submission`
- `resolve-instagram-publish-reconciliation`
- `mark-instagram-gallery-submission-shared` is an authenticated `409`
  compatibility stub and cannot upgrade or publish legacy jobs

Status returns safe booleans for the pinned Page-to-Instagram linkage, direct
identity, version, timestamp, quota availability, and stable error categories
only. The Page linkage uses the Facebook Page access token, bearer
authorization, a fresh timed app-secret proof, one network attempt, and a
bounded response. The token debugger requires `input_token` in the URL; no
exception is approved. The route makes zero debugger calls and reports
`meta_token_debug_query_transport_not_approved`. Token binding, type, scopes,
expiry, and data-access expiry remain activation blockers. Business subtype is
also a manual owner prerequisite.

A `confirmed_published` reconciliation uses the media id only as a Graph lookup
key and independently verifies owner, username, type, and permalink.

Members use `withdraw-gallery-publication-consent`. Pending jobs cancel
atomically, publishing or ambiguous jobs quarantine, and published jobs create
a removal request. Original consent and an immutable withdrawal event remain.
No response pretends Meta removed an external copy.

Keep Instagram's website field empty and omit `mochirii.com` from profile,
caption, alt text, and generated copy.

## Current activation gates

Provider UI previously showed a link-sharing restriction through 2026-08-28.
Recheck the current provider surface after that date; elapsed time is not proof
that the restriction cleared. Provider review also requires a human reCAPTCHA
step. The owner must complete it manually; never automate, bypass, relay, or
record the challenge.

Keep direct publishing disabled until all of the following are current:

1. The `Account confirmation needed` checkpoint is resolved through Meta's
   human owner flow.
2. A fresh least-privilege token is generated under separately approved
   provider action and succeeds in a read-only Graph request.
3. The restriction is absent in current provider UI and the owner completes the
   human review step.
4. The pinned Page returns one linked Instagram Graph identity; configured and
   independently expected account pins match it, and the direct account check
   verifies the exact username.
5. Professional Business subtype is confirmed in the documented owner UI.
6. Required Page and Instagram scopes, Page task, token type, app binding,
   expiry, and data-access expiry are proven without exposing the credential.
7. Required values exist only as Supabase Edge Function secrets with
   `INSTAGRAM_API_VERSION=v26.0` and the activation flag false.
8. The moderator-only diagnostic proves linkage, identity, version, and
   provider-derived quota while returning only safe booleans and stable error
   categories.
9. The final exact union source, 50-migration history, functions, JWT settings,
   Website source binding, queue, confirmation, withdrawal, reconciliation,
   and fail-closed tests pass.
10. Separate owner approval authorizes setting
    `INSTAGRAM_PUBLISH_ENABLED=true` and using the first genuine, newly
    consented member image as the canary. Never create a synthetic public post.

The current diagnostic intentionally remains not ready while no approved token
debugger transport can prove token binding, type, scopes, expiry, and data-access
expiry without leaking the inspected token. Meta's documented debugger requires
`input_token` in a query string; any exception to bearer-only transport needs a
separate reviewed redaction boundary.

Official references:

- [Graph API v26 changelog](https://developers.facebook.com/docs/graph-api/changelog/version26.0/)
- [Instagram content publishing](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing/)
- [Official Instagram API collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api)
- [Facebook Login security](https://developers.facebook.com/documentation/facebook-login/security)
- [Meta: About professional accounts on Instagram](https://www.facebook.com/help/instagram/138925576505882)
- [Meta: Connect a Facebook Page to an Instagram professional account](https://www.facebook.com/help/570895513091465)
- [Meta: Secure Graph API requests](https://developers.facebook.com/docs/graph-api/securing-requests/)
- [Instagram publishing limit](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/content_publishing_limit/)
- [Supabase: Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
