# Gallery Production Cache Review

Branch: `qa/gallery-production-cache-review`

Scope: production cache behavior for Gallery HTML, CSS, and JavaScript assets after recent Gallery polish work.

## Header Findings

| Asset | Status | Cache headers | ETag/Last-Modified | Notes |
|---|---:|---|---|---|
| `gallery.html` | 200 | `cache-control: max-age=600`; `cf-cache-status: DYNAMIC`; `age: 0`; `x-cache: MISS` | `last-modified: Sun, 03 May 2026 12:52:14 GMT`; no ETag observed | HTML refreshes quickly enough to carry updated asset references. |
| `styles.css` | 200 | `cache-control: max-age=14400`; `cf-cache-status: EXPIRED`; `x-cache: MISS` | `etag: W/"69f744fe-a498"`; `last-modified: Sun, 03 May 2026 12:52:14 GMT` | CSS can be cached longer than HTML; this matched the earlier stale-edge observation. |
| `gallery.js` | 200 | `cache-control: max-age=14400`; `cf-cache-status: EXPIRED`; `x-cache: MISS` | `etag: W/"69f744fe-2731"`; `last-modified: Sun, 03 May 2026 12:52:14 GMT` | Gallery behavior JS can remain stale after deploy if URL is unchanged. |
| `site.js` | 200 | `cache-control: max-age=14400`; `cf-cache-status: EXPIRED`; `age: 0`; `x-cache: MISS` | `etag: W/"69f744fe-4281"`; `last-modified: Sun, 03 May 2026 12:52:14 GMT` | Shared Gallery lightbox behavior depends on this file. |
| `utils.js` | 200 | `cache-control: max-age=14400`; `cf-cache-status: EXPIRED`; `x-cache: MISS` | `etag: W/"69f744fe-cba"`; `last-modified: Sun, 03 May 2026 12:52:14 GMT` | Shared helper dependency for Gallery rendering. |
| `styles.css?v=cache-review` | 200 | `cache-control: max-age=14400`; `cf-cache-status: MISS`; `x-cache: MISS` | `etag: W/"69f744fe-a498"`; `last-modified: Sun, 03 May 2026 12:52:14 GMT` | Query string created a fresh cache key and fetched current content. |
| `gallery.js?v=cache-review` | 200 | `cache-control: max-age=14400`; `cf-cache-status: MISS`; `x-cache: MISS`; `x-origin-cache: HIT` | `etag: W/"69f744fe-2731"`; `last-modified: Sun, 03 May 2026 12:52:14 GMT` | Query string bypassed the stale edge key while still allowing origin caching. |

## Decision

Production behavior is healthy, but CSS/JS assets can remain stale longer than `gallery.html`. The prior Gallery mobile polish also showed a brief stale normal-edge stylesheet while a cache-busted request returned the updated origin file.

Decision: use a lightweight Gallery-only version query convention for Gallery CSS/JS dependencies. This avoids build tooling, runtime cache hacks, service workers, or workflow changes.

Applied convention:

```html
styles.css?v=2026-05-gallery-cache
utils.js?v=2026-05-gallery-cache
site.js?v=2026-05-gallery-cache
gallery.js?v=2026-05-gallery-cache
```

Future Gallery CSS/JS behavior changes should update this value with a simple, human-readable token.
