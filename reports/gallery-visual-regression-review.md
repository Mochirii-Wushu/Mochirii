# Gallery Visual Regression Review

## 1. Baseline

- Branch: `qa/gallery-visual-regression-review`
- Source baseline: `090df09` (`Merge pull request #70 from Mochirii-Wushu/design/gallery-visual-system-pilot`)
- Source pilot: `design/gallery-visual-system-pilot`
- Expected Gallery state: 70 total images
- Expected category counts: All 70, portraits 22, gatherings 22, action 6, scenery 5, companions 15
- Known accepted warning: `assets/audio/mochiriiiiii.mp3` intentionally exceeds the normal large-asset threshold.
- Mode: regression QA only; report-only because no real regressions were found.

## 2. Gallery Visual Audit

| Area | Finding | Severity | Evidence | Fix needed? | Notes |
| --- | --- | --- | --- | --- | --- |
| Page shell | Header, footer, and Gallery shell render cleanly. | Pass | Viewports 360, 390, 768, 1440; `body[data-page="gallery"]`, `.site-header`, `.site-footer`. No console-breaking errors. | No | Gallery remains visually distinct from Home through moon/frost variables. |
| Mobile layout | No horizontal overflow. | Pass | Viewports 360, 390, 768, 1440 all had `scrollWidth === clientWidth`. | No | Filter toolbar, Copy link, and grid wrap cleanly. |
| Filter controls | Active category state is clear and counts remain readable. | Pass | `.gallery-filter` buttons rendered 6 controls; active labels matched expected counts at each viewport. | No | Focus state remains visible with rim/shadow treatment. |
| Count badges | Result count text remains readable. | Pass | `.gallery-status` reported `Showing 70 of 70 images.` and category-specific counts. | No | Text is utility-first and not overpowered by decoration. |
| Copy link control | Copy link remains clear, aligned, and keyboard reachable. | Pass | `.gallery-copy` measured 44px tall on mobile and returned `Link copied` during smoke. | No | Behavior and label feedback preserved. |
| Thumbnail cards | Cards feel coherent with the moon/frost/jade visual direction. | Pass | `.gallery-thumb` rendered 70 thumbnails on All; focus outline visible with 4px offset. | No | Hover/focus treatment is restrained, not noisy. |
| Captions | Captions remain readable. | Pass | Sampled captions in grid and lightbox: shot-01, shot-40, shot-70. | No | No data/caption changes were made. |
| Lightbox | Lightbox feels polished and readable; close control is usable. | Pass | Sampled shots 01, 40, 70; close button measured 44px by 44px; Escape closed the dialog. | No | Lightbox opens full image paths, not `/thumbs/`. |
| Reduced motion | Motion is safe under reduced-motion preferences. | Pass | Reduced-motion audit returned transition duration near zero and no panel animation. | No | No constant animation was detected. |
| Border behavior | No noisy/random border behavior appeared. | Pass | Gallery panel animation was `none`; decorative borders are static and scoped. | No | QA branch did not add new visual ideas. |

## 3. Gallery Behavior Regression Audit

| Check | Result | Evidence |
| --- | --- | --- |
| All filter | Pass | 70 thumbnails; status `Showing 70 of 70 images.` |
| Portraits filter | Pass | 22 thumbnails; URL state `category=portraits`. |
| Gatherings filter | Pass | 22 thumbnails; expected count matched. |
| Action filter | Pass | 6 thumbnails; expected count matched. |
| Scenery filter | Pass | 5 thumbnails; expected count matched. |
| Companions filter | Pass | 15 thumbnails; expected count matched. |
| Invalid category | Pass | `category=bad-slug` fell back to All and cleaned the URL to `/gallery.html`. |
| URL state | Pass | Category clicks updated the URL without reloading. |
| Back/Forward state | Pass | Back returned to portraits; forward returned to companions with matching counts. |
| Copy link | Pass | Clipboard smoke returned `Link copied`. |
| Thumbnails | Pass | All 70 thumbnails rendered. |
| Lightbox | Pass | Sampled old and new images opened full image paths: shot-01, shot-40, shot-70. |
| Escape behavior | Pass | Escape closed lightbox and returned focus to the Gallery thumbnail trigger. |
| Captions | Pass | Captions rendered in sampled lightbox states. |

## 4. Cross-Page Regression Audit

| Page | Result | Notes |
| --- | --- | --- |
| `/` | Pass | Home visual variables remained intact; no Gallery variable leakage. |
| `/join.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/events.html` | Pass | Page loaded; All filter remained usable. |
| `/ranks.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/leaders.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/codex.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/recruitment.html` | Pass | Recruitment audio rendered with native controls and `audio/mpeg` source. |
| `/twills.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/announcements.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/raffles.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/spotify.html` | Pass | Search/no-match and Night filter behavior remained usable. |
| `/spotlight.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |

No cross-page regressions were found. No fixes were made.

## 5. Protected and Immutable Content

- `data/home.json` `seal.verse`: unchanged.
- `data/recruitment.json` `content.paragraphs`: unchanged.
- `data/recruitment.json` `content.conclusion`: unchanged.
- `data/twills.json` `profile.bio`: unchanged.
- `data/gallery.json`: unchanged.
- Gallery full-size images: unchanged.
- Gallery thumbnails: unchanged.
- Other assets: unchanged.

## 6. Fixes Made

None. This branch is report-only.

## 7. Cache Query

- `styles.css` changed in this QA branch: no.
- `gallery.html` stylesheet query changed in this QA branch: no.
- `gallery.js` query changed in this QA branch: no.
- Current Gallery stylesheet query verified: `styles.css?v=2026-05-gallery-visual`.
- Current Gallery script query verified: `gallery.js?v=2026-05-gallery-cache`.

No cache-query update was needed because this branch did not change CSS or JavaScript.

## 8. Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npm run check` | Pass | Known large-audio warning remains accepted. |
| `git diff --check` | Pass | No whitespace issues. |
| `node scripts/check-json.mjs` | Pass | JSON remains valid. |
| `node scripts/check-js.mjs` | Pass | JavaScript syntax checks pass. |
| `node scripts/check-refs.mjs` | Pass | References resolve. |
| `node scripts/check-assets.mjs` | Pass with known warning | `assets/audio/mochiriiiiii.mp3` remains intentionally above threshold. |
| `npm run check:production` | Pass | Production URLs resolve. |
| `npm run smoke:gallery` | Pass | Local server on port 8765. |
| Browser regression smoke | Pass | Local Gallery and cross-page smoke covered 360, 390, 768, and 1440 widths. |

## 9. Visual Evidence

- Committed screenshots: none.
- Temporary browser screenshots were captured under `/tmp` during local smoke and were not committed.
- Text evidence is recorded above with viewport, selector or section, observed result, and regression result.

## 10. Deferred Polish Ideas

No blocking regressions or necessary fixes were found. Any further subjective Gallery polish should wait for a separate design branch rather than this regression-only QA branch.

## 11. Recommendation

Tag `v1.6.0-gallery-visual-baseline` if post-merge validation remains clean.
