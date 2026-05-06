# Home Gallery Spotlight Rotation Review

## 1. Home Spotlight Randomization Audit

Tested `http://localhost:8765/` with full Home page loads.

| Refresh | Selected image IDs |
| --- | --- |
| 1 | `shot-31`, `shot-04`, `shot-33`, `shot-59` |
| 2 | `shot-01`, `shot-40`, `shot-57`, `shot-17` |
| 3 | `shot-07`, `shot-72`, `shot-38`, `shot-56` |

Result:

- Exactly 4 images rendered on each tested load.
- Each 4-image set had 4 unique images.
- At least one refresh changed the selection.
- All rendered images came from `data/gallery.json`.
- All rendered images used Gallery thumbnail paths under `assets/img/gallery/thumbs/`.
- All rendered images had non-empty alt text.
- All selected cards carried Gallery captions in card metadata.
- All selected cards were links to `gallery.html?category=<category>`.
- Sampled click navigated to `gallery.html?category=gatherings`.
- No console-breaking errors were observed.
- No horizontal overflow was observed at 360px, 390px, 768px, or 1440px.

## 2. Home Fallback Audit

Fallback method:

- Used Playwright route interception to return a `503` for `data/gallery.json`.
- No committed file changes were used for the simulation.

Fallback result:

- Home did not crash.
- Existing Home fallback Screenshot Spotlight remained usable.
- Fallback rendered the current 4 `data/home.json` images: `shot-23`, `shot-57`, `shot-60`, and `shot-65`.
- Fallback items remained the existing button/lightbox-style Home cards.
- No console-breaking errors occurred.
- A handled warning was observed: `Home Gallery spotlight kept fallback data.`

## 3. Gallery Regression Audit

| Check | Result | Evidence |
| --- | --- | --- |
| All count | Pass | 73 thumbnails rendered. |
| Portraits count | Pass | 23 thumbnails rendered. |
| Gatherings count | Pass | 22 thumbnails rendered. |
| Action count | Pass | 7 thumbnails rendered. |
| Scenery count | Pass | 6 thumbnails rendered. |
| Companions count | Pass | 15 thumbnails rendered. |
| Refresh randomization | Pass | First 10 changed from `shot-69`, `shot-71`, `shot-25`, `shot-48`, `shot-37`, `shot-35`, `shot-53`, `shot-01`, `shot-46`, `shot-13` to `shot-15`, `shot-22`, `shot-48`, `shot-01`, `shot-21`, `shot-11`, `shot-65`, `shot-06`, `shot-38`, `shot-14`. |
| Filter clicks do not reshuffle | Pass | Same-session Companions order stayed stable across filter clicks. |
| URL state | Pass | Category URLs selected matching filters. |
| Back/Forward | Pass | Back restored Companions order; Forward restored Scenery count. |
| Copy link | Pass | Copy link returned `Link copied`. |
| Lightbox | Pass | Sampled lightbox opened full image path and did not use `/thumbs/`. |
| Captions | Pass | Captions remained available in lightbox metadata. |
| Console errors | Pass | No console-breaking errors observed. |

## 4. Cross-Page Regression Audit

| Page | Result | Notes |
| --- | --- | --- |
| `/join.html` | Pass | Header/footer rendered, no horizontal overflow at 390px, no console-breaking errors. |
| `/events.html` | Pass | Header/footer rendered, no horizontal overflow at 390px, no console-breaking errors. |
| `/recruitment.html` | Pass | Header/footer rendered, no horizontal overflow at 390px, no console-breaking errors. |
| `/twills.html` | Pass | Header/footer rendered, no horizontal overflow at 390px, no console-breaking errors. |
| `/spotify.html` | Pass | Header/footer rendered, no horizontal overflow at 390px, no console-breaking errors. |

## 5. Immutable Content Audit

- `data/home.json`: unchanged.
- `data/gallery.json`: unchanged.
- `data/recruitment.json`: unchanged.
- `data/twills.json`: unchanged.
- `data/home.json` `seal.verse`: unchanged.
- `data/recruitment.json` `content.paragraphs`: unchanged.
- `data/recruitment.json` `content.conclusion`: unchanged.
- `data/twills.json` `profile.bio`: unchanged.

## 6. Fixes Made

None. No real regressions were found, so this branch is report-only.

## 7. Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npm run check` | Pass | JS, JSON, refs, and assets completed; known MP3 warning only. |
| `git diff --check` | Pass | No whitespace errors. |
| `node scripts/check-json.mjs` | Pass | `JSON OK (16 files).` |
| `node scripts/check-js.mjs` | Pass | `JavaScript syntax OK (23 files).` |
| `node scripts/check-refs.mjs` | Pass | `Local references OK (430 refs checked).` |
| `node scripts/check-assets.mjs` | Pass with expected warning | Known intentional MP3 large-asset warning only. |
| `npm run check:production` | Pass | `Production smoke check OK.` |
| `npm run smoke:gallery` | Pass | `Gallery lightbox smoke OK.` |

## 8. Recommendation

If post-merge validation remains clean, tag `v2.4.0-home-gallery-spotlight-rotation-baseline`.
