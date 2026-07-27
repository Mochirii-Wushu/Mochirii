# Mochirii Social Private Media Cutover

Date: 2026-07-27  
Status: source foundation prepared; provider conversion and production rollout are blocked pending exact approval

## Decision and scope

Mochirii Social member media must not be reachable through an anonymous object
URL or a direct local-storage path. Static application assets, including the
default avatar, may remain public. No provider write described here has been
performed.

The reviewed source foundation does the following:

- writes future member posts, avatars, stories, group images, and group videos
  with private visibility;
- returns only same-origin gateway URLs from member-facing model and API
  contracts;
- authenticates browser media requests with the existing encrypted server
  session and native clients with a Passport bearer token;
- revalidates current Mochirii membership and the resource audience on every
  request, including blocks, following-only posts, direct-message
  participants, story expiry, and private-group membership;
- redirects cloud objects only to HTTPS, allowlisted, very-short-lived signed
  URLs and streams local files with byte-range support;
- denies direct member-storage paths at Caddy and sends `private, no-store`,
  `nosniff`, and no-referrer response controls;
- keeps raw object paths and storage URLs out of serialized models.

The source change does **not** make existing objects private. Production must
remain closed during the cutover until every existing object and every cache
surface passes the anonymous-denial checks below.

## Exact object boundary

The conversion inventory is limited to existing member-generated objects under
these logical key prefixes:

- `public/m/`
- `public/_esm.t3/`
- `public/avatars/`
- `public/cache/avatars/`
- `cache/avatars/`
- `public/g/`
- `public/g1/`

The reviewed default-avatar JPG and PNG are excluded and may remain public.
No other prefix may be changed from this packet. Before execution, the operator
must replace this logical list with an immutable, per-object manifest captured
from the current bucket. The manifest records the exact key, byte count,
checksum or ETag semantics, current ACL, last-modified time, and whether a CDN
copy exists. It belongs only in the ignored operations evidence boundary and
must contain no credential, signed URL, member caption, or account token.

## Preconditions

Stop before any write unless all of the following are true:

1. One accountable operator with MFA has exact approval for the reviewed image
   digest, runtime visibility setting if required, object ACL manifest, and any
   affected CDN cache purge.
2. The exact prior immutable Social image digest, service state, health state,
   member-object manifest, current ACLs, bucket-listing setting, and CDN state
   have been captured.
3. The current encrypted backup has been restored in an isolated validation
   environment and matched to the captured object inventory without exposing
   member data.
4. Registration and ActivityPub remain disabled and the hostname is placed in
   an approved maintenance boundary that does not present the private-media
   claim while anonymous object access is still possible.
5. The reviewed image supports both browser-session and native bearer media
   requests, and no migration or secret change is included.
6. The bucket's listing policy is private. An anonymous list request must be
   denied before and after the conversion.

## Approved-order change packet

Each step is fail-closed. Record only counts, hashes, status, and redacted route
categories; never retain object signatures or authentication headers.

1. Re-read the bucket into a second immutable manifest and require an exact
   match with the approved key allowlist. Stop on any new, missing, or
   out-of-prefix key.
2. Deploy the exact reviewed immutable GHCR digest while the maintenance
   boundary remains closed. Do not change the database, OAuth clients,
   Droplet size, DNS, Cloudflare rules, or secrets.
3. Verify the source image starts healthy and that one controlled browser
   session and one reviewed native bearer token can read an allowlisted test
   image and a byte range from a test video through `/media/private/...`.
4. Confirm the effective cloud-disk default is private. If production
   explicitly overrides it as public, stop unless the same exact approval also
   names the change to `AWS_VISIBILITY=private`.
5. Change only the manifest-listed member objects to private ACLs. DigitalOcean
   documents private ACLs and S3-compatible signed URLs; use its current
   official API or an approved pinned S3-compatible client. Do not use a bucket
   wildcard, make the bucket public, or change the excluded static objects.
6. If a Spaces CDN is enabled, purge only the affected reviewed member-object
   URLs/prefixes using the approved cache-purge target. Private origin ACLs do
   not prove that an earlier public CDN response is gone. Stop if targeted
   invalidation and anonymous denial cannot be demonstrated.
7. Clear the application caches that can contain prior serialized avatar,
   status, story, or group URLs. Do not flush unrelated databases or alter
   persistent member records.
8. From an anonymous client, require denial for:
   - GET and HEAD to one object in every converted prefix at the Spaces origin;
   - the same GET and HEAD through every configured CDN/custom endpoint;
   - direct local `/storage/m`, `/_esm.t3`, `/g`, `/g1`, `/avatars`, and
     `/cache/avatars` member paths;
   - bucket-root and list-objects requests.
9. From authenticated clients, require successful browser-session and native
   bearer reads for an avatar, public/unlisted post, permitted private post,
   direct-message attachment, active follower story, and permitted group
   media. Require opaque 404 responses for signed-out, suspended, blocked,
   non-follower, non-participant, expired-story, private-group nonmember,
   draft, archived, deleted-parent, orphan, unsafe-path, and remote-media cases.
10. Scan rendered HTML, JSON, accessibility text, console output, logs, and
    network requests. No raw storage key, object endpoint, CDN media hostname,
    signed query, or upstream platform branding may appear before a gateway
    authorization decision. Application diagnostics must not contain bearer
    tokens, cookies, signed URLs, or object keys.
11. Re-read the exact object inventory. Every converted member object must be
    private, every excluded static object must retain its approved state, the
    bucket must remain non-listable, and the byte/checksum inventory must be
    unchanged.
12. Remove the maintenance boundary only after all checks pass and the live
    copy accurately describes the proven behavior.

## Rollback

The preferred rollback keeps objects private and restores a compatible prior
gateway image. If no compatible image exists, keep the hostname in maintenance
and correct the gateway; do not reopen with broken or anonymous member media.

Restoring public ACLs is an emergency compatibility rollback only. It requires
a separate exact approval, the captured per-object ACL manifest, a targeted CDN
purge, and removal of the public privacy claim before the hostname is reopened.
Never use a broad bucket-public operation. After any rollback, repeat the
inventory, health, anonymous, authenticated, cache, and leakage checks.

## Stop conditions

Stop without reopening for any source/digest mismatch, incomplete inventory,
unverified backup, object-byte drift, unknown ACL, public bucket listing,
anonymous object or CDN success, signed URL longer than the configured maximum,
raw URL/path leakage, audience bypass, invalid native authorization, unhealthy
container, registration opening, federation exposure, or unrelated provider
diff.

## Performance and native-client notes

- Very short signed redirects protect cloud objects but reduce shared CDN cache
  usefulness. Optimize generated image sizes and use the gateway only for
  member media; do not lengthen signatures to recover cache hit rate.
- Local video delivery uses the framework's binary response with Range and
  If-Range support. Cloud video range behavior must be verified through the
  signed object response during cutover.
- The iOS client must attach its Passport bearer token to the same-origin
  gateway request. It may follow the resulting short-lived signed redirect,
  but must not persist, log, share, or place that URL in analytics or browser
  storage.
- HLS manifests are not returned because relative segment URLs would bypass a
  per-object authorization decision. Video currently uses the authorized
  original/optimized object with byte ranges until a segment-aware gateway is
  reviewed.

## Primary references

- [DigitalOcean Spaces file permissions](https://docs.digitalocean.com/products/spaces/how-to/set-file-permissions/)
- [DigitalOcean Spaces access management](https://docs.digitalocean.com/products/spaces/how-to/manage-access/)
- [DigitalOcean Spaces listing permissions](https://docs.digitalocean.com/products/spaces/how-to/set-file-listing-permissions/)
- [DigitalOcean Spaces CDN endpoints](https://docs.digitalocean.com/products/spaces/how-to/customize-cdn-endpoint/)
- [Laravel Passport SPA and bearer authentication](https://laravel.com/docs/12.x/passport)
- [Laravel authentication](https://laravel.com/docs/12.x/authentication)
- [Laravel filesystem temporary URLs](https://laravel.com/docs/12.x/filesystem#temporary-urls)
- [Caddy request matchers](https://caddyserver.com/docs/caddyfile/matchers)
