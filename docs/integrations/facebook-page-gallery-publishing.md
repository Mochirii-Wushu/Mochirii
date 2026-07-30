# Facebook Page Gallery Publishing

## Current provider status

This is the no-secret source and provider contract for the official Mōchirīī
Facebook Page. It does not authorize a hosted migration, Edge Function or
Website deployment, secret change, feature-flag change, public post, or Group
mutation.

Evidence reviewed on 2026-07-29 shows:

- the Page and linked Instagram professional account are assigned to the
  dedicated employee system user with Content-only asset access and partial
  Develop-app access;
- the employee identity has no full app management, ad account, or ad scope;
- the Marketing API use case exists only because Meta's documented system-user
  installation flow requires Ads Management API Standard Access;
- the most recent 60-day token had exactly `pages_manage_posts`,
  `pages_read_engagement`, and `pages_show_list`, but every Graph request was
  blocked by the unresolved `Account confirmation needed` checkpoint, so the
  unusable token was revoked;
- no successful current Page-task, app binding, token type, scope, expiry,
  data-access-expiry, or Page identity proof exists;
- the former administrator publisher has no assets, installed app, or token
  and remains clearly labeled as legacy;
- `FACEBOOK_PAGE_PUBLISH_ENABLED=false`, the source packet is not evidence of a
  hosted deployment, and no live Page post was created; and
- hosted secret values are not documented or assumed. Only fresh name-only
  secret inventory and a successful read-only identity diagnostic may satisfy
  a later release gate.

The Page website field stays empty. Profile and publication copy must not place
or link `mochirii.com`; required technical OAuth, callback, privacy, and data
deletion URLs are separate provider configuration.

## Release boundary

This integration publishes a moderator-approved private JPEG derivative to the
Mochirii Facebook Page. It never publishes to a Facebook Group. Meta removed
Groups API publishing in Graph API v19; a moderator may share a verified Page
post to the Guild group manually.

Gallery approval and Page publication are separate audited actions. Publication
requires `job_id`, final `message`, exact `expected_updated_at`, a confirmation
fingerprint, and `confirm_facebook_publish: true`. The fingerprint binds the
destination, current job state and attempt, final copy, and authenticated
moderator. Edge recomputes it and the begin RPC locks and rechecks the same
revision. Edited, stale, reused, or mismatched confirmation fails before Meta.

## Consent, approval, and withdrawal

Member consent is destination-specific, unchecked by default, and exact:

```text
I authorize Mōchirīī moderators to publish this image and its moderator-approved caption on the public official Mōchirīī Facebook Page after gallery approval, and optionally share that Page post manually to the private official Mōchirīī Guild group.
```

The current server-attested handshake is
`2026-07-website-public-facebook-page-group-v3`. The browser submits the
unchecked boolean, exact handshake, and upload-rights attestation as untrusted
claims. The database verifies the Website source and exact current version,
then stamps time, source, and copy provenance itself. Missing, stale, Discord,
or arbitrary client evidence remains historical and API-ineligible; no earlier
version is silently upgraded or reused.

Gallery approval may create an exact-once Page outbox job but never calls Meta.
The separate Page queue requires the moderator to review the private derivative
preview and exact final message, then arm and confirm a fingerprint bound to
`job_id`, destination, current state, attempt, `expected_updated_at`, final
message, and authenticated moderator. Editing any bound field disarms the
confirmation.

Members use `withdraw-gallery-publication-consent` for their own submission and
destination. Pending, failed, or ineligible jobs cancel atomically. Publishing
or ambiguous jobs quarantine for inspection. A published job creates a removal
request without claiming the external copy was removed. Consent, confirmation,
withdrawal, and removal evidence remains immutable.

## Runtime configuration

All values are Supabase Edge Function secrets. Values and private identifiers
must not enter Git, Vercel, browser variables, logs, screenshots, artifacts, or
PR text.

```text
META_APP_ID
META_EXPECTED_APP_ID
META_APP_SECRET
FACEBOOK_PAGE_ID
FACEBOOK_EXPECTED_PAGE_ID
FACEBOOK_PAGE_ACCESS_TOKEN
FACEBOOK_API_VERSION=v26.0
FACEBOOK_PAGE_PUBLISH_ENABLED=false
```

Configured and independently expected identifiers must be numeric and match
exactly. Publishing also requires the exact
`FACEBOOK_PAGE_PUBLISH_ENABLED=true` value. The flag remains false through
Preview, credential installation, and read-only diagnostics.

The public Facebook Page website/link field stays empty. Public contact may use
`support@mochirii.com`, while Mochirii's own legal pages remain available on
`mochirii.com`. Moderator-approved Page messages may not contain or share any
URL.

## Provider request contract

- Origin is fixed to `https://graph.facebook.com`.
- Every path is pinned to `/v26.0/`; floating and older versions fail closed.
- Access tokens travel only in the `Authorization: Bearer` header.
- Every normal request receives a fresh `appsecret_time` and
  `appsecret_proof`, HMAC-SHA256 over
  `access_token + "|" + appsecret_time`.
- Proofs are never reused and expire after five minutes.
- Redirects are rejected, requests have bounded timeouts, and no provider
  request is automatically retried.
- Responses are bounded. Only allowlisted status/type/code fields may enter
  audit details.
- Messages reject schemes, `www`, bare domains, link shorteners, and other
  URL-like text before database or provider access.

The publisher verifies the randomized metadata-stripped JPEG against its
database-attested size and SHA-256 before one
`POST /{page-id}/photos` request. Success is not final until a fresh Graph read
verifies the returned object id, `from.id`, and canonical permalink against the
independently pinned Page. Network loss, timeout, 5xx, missing id, or missing
ownership evidence enters `reconcile_required`.

## Media and evidence integrity

Social opt-ins accept only a source JPEG already 320–1440 pixels wide, no more
than 1800 pixels high, within the 4:5 through 1.91:1 feed ratio, and within the
8 MiB provider limit. PNG and WebP remain valid for Gallery-only submissions.
The moderation browser never supplies publication bytes.

During approval, Edge downloads the frozen consented source, verifies its
object identity, version, timestamp, byte count, dimensions, and SHA-256, and
derives a private JPEG without changing frame or entropy-coded image data. It
retains at most one strict first-segment minimal JFIF APP0 marker, removes JPEG
comments, and rejects every other APP0/JFXX or APP1–APP15 segment, conversion,
resize, padding, or crop. Each attempt uses an unpredictable immutable revision
path; deterministic or overwritable derivative paths fail closed.

The database binds the source and derivative objects, versions, timestamps,
digests, derivation method, destination, and current consent version in the same
transaction as Gallery approval and outbox creation. Browser roles cannot read
the reserved derivative boundary. Immediately before upload, Edge rechecks the
exact bound bytes. A missing, replaced, overwritten, or legacy-unbound
derivative is quarantined rather than published.

Direct service-role table access is read-only. All state changes use reviewed
RPCs after Edge revalidates the moderator. Queue DTOs expose only a
credential-free approved Gallery thumbnail. Tokens, raw provider bodies,
provider messages, member object paths, hashes, private derivatives, and signed
URLs never enter browser responses, logs, or audit text.

## Endpoints and diagnostics

Authenticated moderator `POST` endpoints, all with `verify_jwt=true`:

- `check-facebook-page-api-status`
- `list-facebook-page-publish-queue`
- `publish-facebook-page-gallery-submission`
- `resolve-facebook-page-publish-reconciliation`

Authenticated members use the separate `verify_jwt=true`
`withdraw-gallery-publication-consent` endpoint. It revalidates ownership and
does not expose moderator queue data.

Status returns safe booleans, version, timestamp, and stable error categories
only. Meta's token debugger requires the inspected token in the `input_token`
query parameter. No query-token exception is approved, so the diagnostic makes
zero debugger requests and fails closed with
`meta_debugger_transport_blocked`. App binding, token type,
scopes, expiry, and data-access expiry remain activation blockers.

A `confirmed_published` reconciliation uses an object id only as a lookup key;
Edge independently requires the official pinned owner and canonical permalink.
`confirmed_not_published` is a separate recorded manual inspection. No retry is
automatic.

After success, the UI may offer a moderator-only manual Page-to-Group handoff.
Source and docs must never claim automatic Group publishing.

## Activation gates

Keep Facebook publication disabled until every gate is current:

1. Resolve the `Account confirmation needed` checkpoint through Meta's human
   owner flow; do not automate or bypass it.
2. Confirm the employee identity still has only the reviewed Content and
   partial Develop-app access.
3. Generate a fresh least-privilege credential through a separately approved
   provider action and derive the runtime Page token without exposing either.
4. Install only the required server secrets, with the expected app and Page
   pins stored independently, `FACEBOOK_API_VERSION=v26.0`, and the flag false.
5. Prove current app binding, token type, scopes, expiry, data-access expiry,
   Page identity, and required content-creation authority through an approved
   read-only diagnostic. Asset inventory alone is not proof.
6. Complete the privacy, data-deletion, icon, category, contact, app-mode, and
   any provider-specific review requirements shown by the current dashboard.
7. Validate the exact final union source, migration history, functions, JWT
   settings, Website source binding, queue, confirmation, withdrawal, and
   fail-closed tests while the flag remains false.
8. Obtain separate action-time approval to set
   `FACEBOOK_PAGE_PUBLISH_ENABLED=true` and use the first genuine, newly
   consented member image as the canary. Never create a synthetic public post.

If any request has an ambiguous outcome, disable the flag and inspect the
official Page before reconciliation. Never automatically retry. Confirming a
published result uses the provider object only as a lookup key and re-verifies
the pinned owner and canonical permalink. Confirming no post exists rejects
contradictory IDs or URLs and returns the job to a separately approved retry
state.

## Linked Instagram dependency

Facebook readiness does not enable Instagram. The linked asset assignment is
not current Graph identity, scope, subtype, quota, or expiry proof. Instagram
remains independently disabled until every gate in the
[Instagram publishing contract](instagram-gallery-publishing.md) passes.

Official references:

- [Graph API v26 changelog](https://developers.facebook.com/docs/graph-api/changelog/version26.0/)
- [Graph API v19 changelog](https://developers.facebook.com/docs/graph-api/changelog/version19.0/)
- [Facebook Login security](https://developers.facebook.com/documentation/facebook-login/security)
- [Page Photos endpoint](https://developers.facebook.com/docs/graph-api/reference/page/photos/)
- [Page access tokens](https://developers.facebook.com/documentation/facebook-login/guides/access-tokens)
- [App modes](https://developers.facebook.com/documentation/development/build-and-test/app-modes)
- [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
