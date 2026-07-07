# Cloudflare Social Challenge Script Cleanup Packet

Last refreshed: 2026-07-07

Host: `https://social.mochirii.com`

This is an approval packet only. Do not change Cloudflare, DNS, TLS, WAF, cache, or bot settings from this document without a separate explicit approval naming the exact setting and rollback path.

## Current Evidence

Read-only extraction of `https://social.mochirii.com` still finds:

```text
/cdn-cgi/challenge-platform/scripts/jsd/main.js
```

Cloudflare documents this path as JavaScript Detections injection. The feature can be useful for bot scoring, but it adds public page-source residue that is not Mochirii-owned branding and may complicate CSP or source-integrity review.

The 2026-07-07 upload deletion validation also found that cache-busted deleted media URLs redirect to the Pixelfed no-preview asset, while the original non-cache-busted image URL can remain a Cloudflare cache hit after the origin object and local file are gone. This is stale CDN state, not evidence that the object remains in Spaces or on the Droplet.

## Source Basis

- Cloudflare JavaScript Detections: https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/
- Cloudflare Configuration Rules: https://developers.cloudflare.com/rules/configuration-rules/
- Cloudflare Cache Rules: https://developers.cloudflare.com/cache/how-to/cache-rules/
- Cloudflare Purge Cache: https://developers.cloudflare.com/cache/how-to/purge-cache/
- Cloudflare Default Cache Behavior: https://developers.cloudflare.com/cache/concepts/default-cache-behavior/
- Repo provider approval rules: `docs/integration-operations-runbook.md`

## Recommended Changes

### JavaScript Detections residue

Use the narrowest available Cloudflare control for `social.mochirii.com` only:

- Match hostname exactly: `http.host eq "social.mochirii.com"`.
- Prefer a hostname-scoped Configuration Rule or Bot/JavaScript Detections setting if the current Cloudflare plan exposes it.
- Disable only the script-injection feature that emits `/cdn-cgi/challenge-platform/scripts/jsd/main.js`.
- Do not weaken TLS mode, DNS proxying, WAF managed rules, rate limits, cache behavior, or other host protections in the same change.

If the dashboard shows Bot Fight Mode forces JavaScript Detections and cannot disable it narrowly, stop and record that as an accepted public-source limitation instead of weakening broader Cloudflare security.

### Deleted media cache residue

Prefer one-time single-file cache purges for specific deleted media URLs observed during validation. Do not purge everything and do not purge a broad prefix unless repeated stale-object evidence proves single-file purge is operationally insufficient.

If stale deleted media persists after repeated single-file purge attempts, the narrowest durable cache rule to consider is:

- Match hostname exactly: `http.host eq "social.mochirii.com"`.
- Match the Pixelfed media object path only: `starts_with(http.request.uri.path, "/storage/m/_v2/")`.
- Set cache behavior to bypass cache.
- Do not change cache behavior for `mochirii.com`, Supabase, Vercel, OAuth, static website assets, API routes, login pages, admin pages, or non-media Pixelfed routes.
- Treat this as a performance tradeoff because it reduces CDN caching for post media; prefer origin-side deletion purge automation in a later scoped task if durable behavior is needed.

Rollback for a media cache rule is to disable or delete only that one rule and re-test upload/read/delete plus normal media rendering.

## Approval Prompts

```text
Approve disabling Cloudflare JavaScript Detections script injection for hostname social.mochirii.com only, using the narrowest available hostname-scoped Cloudflare rule/setting. Do not change DNS, TLS, WAF managed rules, cache rules, or bot protections outside the injected challenge script behavior. Rollback: remove the hostname rule or restore JavaScript Detections for social.mochirii.com.
```

```text
Approve purging exactly the single deleted media URL supplied in this approval message from Cloudflare cache for social.mochirii.com. Do not purge by prefix, do not purge everything, and do not change DNS, TLS, WAF, bot, or cache rules. Rollback: none needed for a single-file purge; if the wrong URL is supplied, stop and do not repeat without a corrected approval.
```

```text
Approve adding one Cloudflare Cache Rule for hostname social.mochirii.com and URI path starting with /storage/m/_v2/ to bypass cache for Pixelfed media objects only. Do not change DNS, TLS, WAF managed rules, bot settings, or cache behavior outside that host/path match. Rollback: disable or delete that one cache rule and verify upload/read/delete plus normal media rendering.
```

## Verification

After JavaScript Detections approval and change:

1. Fetch `https://social.mochirii.com` and confirm `/cdn-cgi/challenge-platform/scripts/jsd/main.js` is absent.
2. Verify `https://social.mochirii.com`, `/login`, `/settings/avatar`, compose, profile, and admin pages still load.
3. Confirm Cloudflare proxy/TLS still works for `social.mochirii.com`.
4. Confirm no new provider-brand residue appears in public/member source.
5. Revert the Cloudflare rule if login, upload, or admin flows regress.

After single-file purge approval:

1. Fetch the exact deleted media URL without a cache-busting query and confirm it no longer serves the deleted image.
2. Fetch the same URL with a fresh cache-busting query and confirm both forms resolve to the no-preview behavior.
3. Confirm Spaces object absent, local file absent, and active Pixelfed status/media row counts remain zero for the validation upload.

After media cache-rule approval:

1. Create one new disposable valid image post, confirm it renders, then delete it.
2. Confirm status/media active row counts return to zero.
3. Confirm Spaces object absent and local file absent.
4. Confirm the deleted non-cache-busted media URL no longer serves the deleted object.
5. Confirm a different active media URL still renders through `social.mochirii.com`.
