# Cross-Site Production Sanity Review

## 1. Baseline Tags

| Tag | Local status | Remote status | Tagged commit |
| --- | --- | --- | --- |
| v0.1.0-site-baseline | Present | Present | eb8af4f12e57a18f122a9cbcb4cc58a523bc0ff1 |
| v0.2.0-content-style-baseline | Present | Present | 6abf848f880405921ded9b4f566efb3b6e7c7aa9 |
| v0.3.0-gallery-baseline | Present | Present | 541422baf8cad294ae6087dc938c04073656f1a1 |
| v0.4.0-events-baseline | Present | Present | c85b42e87d8a780fba19aee479e663dd3fe8ba72 |
| v0.5.0-codex-baseline | Present | Present | 718e386dad8c06269dee9d8efd60a3e437f778ae |
| v0.6.0-join-baseline | Present | Present | 4dcffc78a1d1b29044b0a1ee2deecef749b79985 |
| v0.7.0-ranks-baseline | Present | Present | 10d00927ccf7650109dd237c62599e7164ab16a7 |
| v0.8.0-leaders-baseline | Present | Present | c0e59b534af5af73eea163a128ae4a187cad580e |
| v0.9.0-twills-baseline | Present | Present | a2ff6f758387ad79f3bec18944264b78eb6d0611 |
| v1.0.0-recruitment-baseline | Present | Present | d5cc87dfb945170a3383007f41133cccb75c8856 |
| v1.1.0-home-shell-baseline | Present | Present | dc8356165982f8e21b5b3d9bb3d5a486f5140166 |
| v1.2.0-side-pages-baseline | Present | Present | 4316b5a82a33eeae7cdafa7b56d2fa74da34a93b |

`main` was clean before the QA branch was created. The current baseline commit at branch creation was `4316b5a82a33eeae7cdafa7b56d2fa74da34a93b`, which is tagged by `v1.2.0-side-pages-baseline`.

## 2. Local Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npm run check` | Pass | Full local static-site check passed. Known warning only: `assets/audio/mochiriiiiii.mp3` is 3.31 MB. |
| `git diff --check` | Pass | No whitespace errors. |
| `node scripts/check-json.mjs` | Pass | `JSON OK (16 files).` |
| `node scripts/check-js.mjs` | Pass | `JavaScript syntax OK (23 files).` |
| `node scripts/check-refs.mjs` | Pass | `Local references OK (321 refs checked).` |
| `node scripts/check-assets.mjs` | Pass | Known MP3 size warning only. |
| `npm run check:production` | Pass | `Production smoke check OK.` |
| `npm run smoke:gallery || true` before local server | Non-blocking local-server limitation | Returned `ERR_CONNECTION_REFUSED` before anything was listening on port 8765. |
| `npm run smoke:gallery` after local server | Pass | `Gallery lightbox smoke OK.` |

## 3. GitHub / Deployment

The latest `Validate static site` workflow on `main` was successful for merge commit `4316b5a82a33eeae7cdafa7b56d2fa74da34a93b` in run `25354279141`.

The latest GitHub Pages deployment for the same `main` push was successful in run `25354278845`.

The latest scheduled `Production smoke check` on `main` was successful in run `25316199298`. One older manual production smoke run from May 2 failed, but later production smoke runs passed and no current blocker was observed.

Active workflows at review time:

| Workflow | Status |
| --- | --- |
| Manual Lighthouse audit | Active |
| Production smoke check | Active |
| Validate static site | Active |
| pages-build-deployment | Active |

Known non-blocking annotation remains: GitHub Actions Node.js 20 deprecation.

## 4. Production URL Checks

| URL | Status | Result | Notes |
| --- | --- | --- | --- |
| https://mochirii.com/ | 200 | Pass | Home page reachable. |
| https://mochirii.com/join.html | 200 | Pass | Join page reachable. |
| https://mochirii.com/events.html | 200 | Pass | Events page reachable. |
| https://mochirii.com/gallery.html | 200 | Pass | Gallery page reachable. |
| https://mochirii.com/ranks.html | 200 | Pass | Ranks page reachable. |
| https://mochirii.com/leaders.html | 200 | Pass | Leaders page reachable. |
| https://mochirii.com/codex.html | 200 | Pass | Codex page reachable. |
| https://mochirii.com/recruitment.html | 200 | Pass | Recruitment page reachable. |
| https://mochirii.com/announcements.html | 200 | Pass | Announcements page reachable. |
| https://mochirii.com/raffles.html | 200 | Pass | Raffles page reachable. |
| https://mochirii.com/spotify.html | 200 | Pass | Spotify page reachable. |
| https://mochirii.com/spotlight.html | 200 | Pass | Spotlight page reachable. |
| https://mochirii.com/twills.html | 200 | Pass | Twills page reachable. |
| https://mochirii.com/robots.txt | 200 | Pass | Robots file reachable with `text/plain; charset=utf-8`. |
| https://mochirii.com/sitemap.xml | 200 | Pass | Sitemap reachable with `application/xml`. |

No 403, redirect, or reachability issue was observed.

## 5. Cache / Asset Headers

| Asset | Status | Cache-Control | ETag / Last-Modified | Notes |
| --- | --- | --- | --- | --- |
| https://mochirii.com/ | 200 | `max-age=600` | `last-modified: Tue, 05 May 2026 02:15:54 GMT` | HTML served with Varnish `HIT` and Cloudflare `DYNAMIC`. |
| https://mochirii.com/styles.css | 200 | `max-age=14400` | `etag: W/"69f952da-a860"` | CSS served as `text/css`; Cloudflare reported `REVALIDATED`. |
| https://mochirii.com/site.js | 200 | `max-age=14400` | `etag: W/"69f952da-4281"` | JavaScript served with expected content type; Cloudflare reported `REVALIDATED`. |
| https://mochirii.com/utils.js | 200 | `max-age=14400` | `etag: W/"69f952da-cba"` | JavaScript served with expected content type; Cloudflare reported `REVALIDATED`. |
| https://mochirii.com/supabase.js | 200 | `max-age=14400` | `etag: W/"69f952da-1ec5"` | Public Supabase helper script reachable; Cloudflare reported `REVALIDATED`. |
| https://mochirii.com/gallery.js | 200 | `max-age=14400` | `etag: W/"69f952da-2731"` | Gallery script reachable; Cloudflare reported `MISS` on the checked request. |
| https://mochirii.com/gallery.html | 200 | `max-age=600` | `last-modified: Tue, 05 May 2026 02:15:54 GMT` | HTML served with Varnish `HIT` and Cloudflare `DYNAMIC`. |
| https://mochirii.com/styles.css?v=2026-05-gallery-polish | 200 | `max-age=14400` | `etag: W/"69f952da-a860"` | Gallery cache-query CSS URL resolves. |
| https://mochirii.com/gallery.js?v=2026-05-gallery-cache | 200 | `max-age=14400` | `etag: W/"69f952da-2731"` | Gallery cache-query JS URL resolves. |

Cache behavior appears acceptable for the current static-site deployment. No cache-query changes were made or needed in this report-only branch.

## 6. Browser Smoke

Browser tooling was available. A local static server was started on port 8765 and the following pages were checked at 360px, 390px, 768px, and 1440px widths:

- `/`
- `/join.html`
- `/events.html`
- `/gallery.html`
- `/ranks.html`
- `/leaders.html`
- `/codex.html`
- `/recruitment.html`
- `/announcements.html`
- `/raffles.html`
- `/spotify.html`
- `/spotlight.html`
- `/twills.html`

Smoke coverage:

| Area | Result | Notes |
| --- | --- | --- |
| Shared shell | Pass | Header and footer rendered on checked pages. |
| Mobile navigation | Pass | Mobile menu opened, closed with Escape, and returned focus to the menu button on mobile widths. |
| Skip link | Pass | Skip link appeared on focus and moved focus to the main content. |
| Horizontal overflow | Pass | No horizontal overflow was detected at checked widths. |
| Console/runtime errors | Pass | No console-breaking errors or page errors were detected. |
| Supabase signed-out browsing | Pass | `window.MochiriiSupabase` was available and did not cause signed-out public page runtime errors. |
| Gallery | Pass | Categories, data-derived counts, URL state, Copy link, and lightbox full-image behavior worked. |
| Events | Pass | Upcoming, Past, and All filters worked with expected state and counts. |
| Join | Pass | Checklist rendered with five items. |
| Recruitment audio | Pass | Audio rendered with controls, label, description, and one source. |
| Spotify | Pass | Search, tag filter, no-match empty state, iframe titles, lazy loading, normalized Spotify embed URLs, and mobile iframe width were verified. |
| Protected pages | Pass | Recruitment, Twills, and Home rendered without protected-content changes. |

Spotify iframe network content remains third-party controlled. No site-side Spotify embed issue was observed: iframe markup, titles, normalized `src` values, lazy loading, layout, no-overflow behavior, and fallback/no-match behavior were verified.

## 7. Protected Content

Protected content was not changed in this report-only branch:

- `data/home.json` `seal.verse`: unchanged
- `data/recruitment.json` `content.paragraphs`: unchanged
- `data/recruitment.json` `content.conclusion`: unchanged
- `data/twills.json` `profile.bio`: unchanged

## 8. Issues Found

No blockers were found.

Known non-blocking items remain:

- `assets/audio/mochiriiiiii.mp3` is 3.31 MB.
- GitHub Actions Node.js 20 deprecation annotation remains non-blocking.

## 9. Recommendations

Tag `v1.3.0-cross-site-stable-baseline` if this report is accepted and no new production or workflow regression appears before tagging.
