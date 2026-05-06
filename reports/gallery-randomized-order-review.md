# Gallery Randomized Order Review

## 1. Baseline

- Branch: `qa/gallery-randomized-order-review`
- Source feature merge: `bec5902779c26faf3a34ff4ae292ed0cbf0db1ed`
- Source PR: #89, `feature/gallery-randomized-order`
- Expected Gallery total: 73 images
- Expected category counts: portraits 23, gatherings 22, action 7, scenery 6, companions 15
- Mode: QA-only/report-only unless a confirmed regression requires a minimal fix.
- Known accepted warning: `assets/audio/mochiriiiiii.mp3` intentionally exceeds the normal large-asset threshold.

## 2. Randomization Audit

Tested `http://localhost:8765/gallery.html` with full page loads.

| Refresh | First 10 rendered item IDs |
| --- | --- |
| 1 | `shot-31`, `shot-52`, `shot-17`, `shot-73`, `shot-55`, `shot-63`, `shot-12`, `shot-61`, `shot-15`, `shot-38` |
| 2 | `shot-06`, `shot-57`, `shot-20`, `shot-40`, `shot-60`, `shot-55`, `shot-67`, `shot-41`, `shot-69`, `shot-50` |
| 3 | `shot-67`, `shot-10`, `shot-43`, `shot-50`, `shot-09`, `shot-05`, `shot-25`, `shot-42`, `shot-66`, `shot-22` |

Result:

- Refresh order changed: yes.
- Duplicate/missing rendered images: none observed; each All view had 73 unique image paths.
- Console-breaking errors: none observed.

## 3. Gallery Behavior Regression Audit

| Check | Result | Evidence |
| --- | --- | --- |
| All count | Pass | 73 thumbnails rendered. |
| Portraits count | Pass | 23 thumbnails rendered. |
| Gatherings count | Pass | 22 thumbnails rendered. |
| Action count | Pass | 7 thumbnails rendered. |
| Scenery count | Pass | 6 thumbnails rendered. |
| Companions count | Pass | 15 thumbnails rendered. |
| Invalid category fallback | Pass | `category=bad-slug` fell back to All, cleaned the URL, and rendered 73 images. |
| Filter clicks do not reshuffle | Pass | Same-session Companions order stayed `shot-50`, `shot-34`, `shot-58`, `shot-36`, `shot-59`, `shot-60`, `shot-47`, `shot-63`, `shot-40`, `shot-51`, `shot-53`, `shot-33`, `shot-52`, `shot-70`, `shot-29`; Scenery stayed `shot-48`, `shot-21`, `shot-30`, `shot-27`, `shot-72`, `shot-37`. |
| URL state | Pass | Category clicks updated `?category=` and active filter state. |
| Back/Forward | Pass | Back returned to the same-session Companions order; Forward returned to the same-session Scenery order. |
| Copy link | Pass | Copy link returned `Link copied`. |
| Thumbnails | Pass | Thumbnails rendered in All and category views. |
| Lightbox | Pass | Sampled `shot-01`, `shot-40`, `shot-71`, `shot-72`, and `shot-73`; each opened the correct full image path, not `/thumbs/`. |
| Escape key | Pass | Escape closed the lightbox. |
| Captions | Pass | Captions rendered for sampled lightbox images. |
| Focus states | Pass | Gallery thumbnail focus state remained visible/useful in keyboard smoke. |
| Responsive layout | Pass | No horizontal overflow at 360px, 390px, 768px, or 1440px for All, category views, and invalid-category fallback. |
| Console errors | Pass | No console-breaking errors observed. |

## 4. Cross-Page Regression Audit

| Page | Result | Notes |
| --- | --- | --- |
| `/` | Pass | Page loaded, header/footer rendered, no horizontal overflow at 390px. |
| `/join.html` | Pass | Page loaded, header/footer rendered, no horizontal overflow at 390px. |
| `/events.html` | Pass | Page loaded, header/footer rendered, no horizontal overflow at 390px. |
| `/recruitment.html` | Pass | Page loaded, header/footer rendered, no horizontal overflow at 390px. |
| `/twills.html` | Pass | Page loaded, header/footer rendered, no horizontal overflow at 390px. |
| `/spotify.html` | Pass | Page loaded, header/footer rendered, no horizontal overflow at 390px. |

## 5. Protected and Immutable Content

- `data/gallery.json`: unchanged.
- `data/home.json` `seal.verse`: unchanged.
- `data/recruitment.json` `content.paragraphs`: unchanged.
- `data/recruitment.json` `content.conclusion`: unchanged.
- `data/twills.json` `profile.bio`: unchanged.

## 6. Fixes Made

None. No real regressions were found, so this branch is report-only.

## 7. Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npm run check` | Pass with known warning | Known intentional `assets/audio/mochiriiiiii.mp3` large-asset warning only. |
| `git diff --check` | Pass | No whitespace errors. |
| `node scripts/check-json.mjs` | Pass | `JSON OK (16 files).` |
| `node scripts/check-js.mjs` | Pass | `JavaScript syntax OK (23 files).` |
| `node scripts/check-refs.mjs` | Pass | `Local references OK (429 refs checked).` |
| `node scripts/check-assets.mjs` | Pass with known warning | Known intentional `assets/audio/mochiriiiiii.mp3` large-asset warning only. |
| `npm run check:production` | Pass | `Production smoke check OK.` |
| `npm run smoke:gallery` | Pass | `Gallery lightbox smoke OK.` |
| Browser randomized-order audit | Pass | Refresh randomization, same-session filter order, Back/Forward, Copy link, lightbox, mobile, and cross-page checks passed. |

## 8. Recommendation

Tag `v2.3.0-gallery-randomized-order-baseline` if post-merge validation remains clean.
