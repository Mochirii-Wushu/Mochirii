# Gallery Live Batch Verification

## 1. Baseline

- Latest main commit: `2d0ab25c2b8869f05d1aa717b6c7f6c3006127a7`
- Source PR: #61, `content/gallery-bulk-screenshot-additions`
- Expected gallery total: 70 images
- New image range: `shot-40.webp` through `shot-70.webp`
- Expected category counts:
  - `portraits`: 22
  - `gatherings`: 22
  - `action`: 6
  - `scenery`: 5
  - `companions`: 15

## 2. Local Verification

| Check | Result | Notes |
| --- | --- | --- |
| `main` includes PR #61 merge | Pass | Latest local `main` includes `2d0ab25c2b8869f05d1aa717b6c7f6c3006127a7`. |
| Working tree before branch | Pass | No tracked dirty files. Raw incoming folder is ignored locally. |
| Raw incoming folder tracked/staged | Pass | `git ls-files assets/img/gallery/incoming-gallery/` returned no tracked files. |
| `data/gallery.json` total | Pass | 70 Gallery items. |
| Category counts | Pass | `portraits` 22, `gatherings` 22, `action` 6, `scenery` 5, `companions` 15. |
| New full-size files | Pass | `assets/img/gallery/shot-40.webp` through `shot-70.webp` exist. |
| New thumbnails | Pass | `assets/img/gallery/thumbs/shot-40.webp` through `shot-70.webp` exist. |
| Full/thumb path separation | Pass | New `full` paths do not include `/thumbs/`; new `thumb` paths do include `/thumbs/`. |
| Local Gallery smoke | Pass | `npm run smoke:gallery` passed against local server on port 8765. |

## 3. Production Asset Checks

| URL | Status | Content type | Result |
| --- | --- | --- | --- |
| `https://mochirii.com/gallery.html` | 200 | `text/html; charset=utf-8` | Pass |
| `https://mochirii.com/assets/img/gallery/shot-40.webp` | 200 | `image/webp` | Pass |
| `https://mochirii.com/assets/img/gallery/shot-70.webp` | 200 | `image/webp` | Pass |
| `https://mochirii.com/assets/img/gallery/thumbs/shot-40.webp` | 200 | `image/webp` | Pass |
| `https://mochirii.com/assets/img/gallery/thumbs/shot-70.webp` | 200 | `image/webp` | Pass |

Production is serving the sampled new full-size images and thumbnails. No 404 or 403 responses were observed for the checked production URLs.

## 4. Live Browser Smoke

Pages tested:

- `https://mochirii.com/gallery.html`
- `https://mochirii.com/gallery.html?category=portraits`
- `https://mochirii.com/gallery.html?category=gatherings`
- `https://mochirii.com/gallery.html?category=action`
- `https://mochirii.com/gallery.html?category=scenery`
- `https://mochirii.com/gallery.html?category=companions`

Observed category counts:

| View | Observed | Expected | Result |
| --- | ---: | ---: | --- |
| All | 70 | 70 | Pass |
| Portraits | 22 | 22 | Pass |
| Gatherings | 22 | 22 | Pass |
| Action | 6 | 6 | Pass |
| Scenery | 5 | 5 | Pass |
| Companions | 15 | 15 | Pass |

Behavior checked:

- URL category state selected the matching active filter.
- New sampled thumbnails rendered for `shot-40`, `shot-55`, and `shot-70`.
- Lightbox opened sampled new images as full-size Gallery images, not `/thumbs/`.
- Captions rendered in the lightbox for sampled new images.
- Copy link returned `Link copied`.
- Mobile checks at 360px, 390px, and 768px found no horizontal overflow on the Gallery, Portraits, and Companions views.
- No console errors or page errors were observed.

Limitation:

- Browser request-failure events were not used as blockers for rapid scripted navigation because lazy thumbnail requests and Cloudflare `/cdn-cgi` endpoints can abort when the script changes pages quickly. Direct production asset checks and rendered-thumbnail checks passed.

## 5. Protected Content

- `data/home.json` `seal.verse`: unchanged
- `data/recruitment.json` `content.paragraphs`: unchanged
- `data/recruitment.json` `content.conclusion`: unchanged
- `data/twills.json` `profile.bio`: unchanged

## 6. Issues Found

No blockers found.

Known warnings remain:

- `assets/audio/mochiriiiiii.mp3` is over the large-asset warning threshold.
- Local raw incoming screenshots may warn while present in `assets/img/gallery/incoming-gallery/`; they remain untracked and local-only.
- The generated GitHub Pages workflow may still show the known non-blocking Node.js 20 annotation.

## 7. Recommendation

Tag `v1.4.0-gallery-content-baseline` if no further Gallery content review is needed.
