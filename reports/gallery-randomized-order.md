# Gallery Randomized Order

## 1. Current Gallery Behavior

- Data load flow: `gallery.js` runs only on `body[data-page="gallery"]`, fetches `./data/gallery.json`, applies page meta, then flattens the first album's `items` array with `flattenItems(data)`.
- Current render flow: `applyFilter()` filters the canonical `items` array and passes the visible list to `renderGrid()`, which rebuilds the thumbnail button grid.
- Current filter state flow: filter buttons are rendered once from `buildCategories(data, items)`, then `applyFilter()` updates `aria-pressed`, count text, empty state, and grid visibility.
- Current URL category flow: `readCategoryFromUrl(categories)` reads `?category=`, validates it against data-derived categories, and invalid values fall back to `all`.
- Current Back/Forward behavior: `popstate` calls `applyFilter(readCategoryFromUrl(categories).category)`, so browser history updates the active filter and visible item list without reloading the page.
- Current Copy link behavior: the Copy link button copies `window.location.href` and reports `Link copied` or `Copy failed` through the existing live-status element.
- Current lightbox behavior: `buildItemButton()` writes the full-size path to `button.dataset.full`; shared lightbox behavior opens that full path when a thumbnail is clicked.
- Current count calculation behavior: `buildCategories(data, items)` counts categories from the complete canonical Gallery item list, not the currently visible filter result.
- Current cache-query convention for `gallery.js`: `gallery.html` uses `./gallery.js?v=2026-05-gallery-cache`, and `docs/gallery-guide.md` says to update the Gallery page `gallery.js` query when Gallery JavaScript changes.
- Current verified Gallery state: 73 total images; portraits 23, gatherings 22, action 7, scenery 6, companions 15.

## 2. Randomized Order Plan

- Keep `data/gallery.json` unchanged and ordered.
- Load Gallery items normally from the canonical JSON data.
- Create one shuffled in-memory array per page load after data loads.
- Render Gallery from the shuffled array.
- Filter category views by filtering the shuffled array, preserving the same relative randomized order for that page load.
- Do not reshuffle when filters are clicked.
- Do not reshuffle on Back/Forward category navigation.
- Do not reshuffle when Copy link is clicked.
- Do not reshuffle when lightbox opens/closes.
- Let a full browser reload create a new shuffled order.
- Keep category counts based on the complete canonical data set.
- Keep lightbox data tied to each rendered item, so the full image remains correct for the clicked thumbnail.
- Use a small Fisher-Yates helper that copies the input array before shuffling.
- Use `Math.random` because the requirement is display variety, not security-sensitive randomness.
- Avoid `localStorage`, `sessionStorage`, backend calls, data mutation, CSS changes, and broad refactors.

Implementation notes:

- Add `shuffleGalleryItems(items)` near the existing list helpers.
- In `boot()`, keep `const items = flattenItems(data)` for canonical counts and totals.
- Create `const displayItems = shuffleGalleryItems(items)` once after `items`.
- Continue to build categories from `items`.
- Update `applyFilter()` to call `filterItems(displayItems, activeCategory)`.
- Keep count text total based on `items.length`.
- Update only the `gallery.js` cache query in `gallery.html`.

## 3. Changes Made

- Added `shuffleGalleryItems(items)`, a Fisher-Yates helper that copies the input array before shuffling.
- Kept `items = flattenItems(data)` as the canonical ordered data list.
- Added `displayItems = shuffleGalleryItems(items)` once after data loads during `boot()`.
- Updated `applyFilter()` to filter `displayItems` instead of mutating or reordering `items`.
- Preserved category counts by keeping `buildCategories(data, items)` unchanged.
- Preserved count text totals by keeping `formatCount(visibleItems.length, items.length, activeLabel)` unchanged.
- Preserved URL state by leaving `readCategoryFromUrl()`, `updateCategoryUrl()`, invalid-category replacement, and `popstate` handling unchanged.
- Preserved Copy link behavior by leaving the clipboard and status-message flow unchanged.
- Preserved lightbox behavior by leaving `buildItemButton()` and each thumbnail button's `data-full` path unchanged.
- Preserved keyboard behavior by leaving button markup and shared lightbox handling unchanged.
- Updated `gallery.html` cache query for `gallery.js` from `v=2026-05-gallery-cache` to `v=2026-05-gallery-random-order`.

Cache-query decision:

- `gallery.js` changed.
- `docs/gallery-guide.md` says to update the Gallery page `gallery.js` query when Gallery JavaScript changes.
- Only the `gallery.js` query changed.
- `styles.css`, `utils.js`, `supabase.js`, and `site.js` queries did not change.

## 4. QA Results

| Check | Result | Evidence |
| --- | --- | --- |
| Refresh randomization | Pass | First 10 rendered IDs changed across four full Gallery loads: `shot-36, shot-45, shot-48, shot-07, shot-06, shot-18, shot-63, shot-40, shot-22, shot-13`; `shot-69, shot-64, shot-31, shot-63, shot-67, shot-48, shot-06, shot-37, shot-51, shot-59`; `shot-55, shot-03, shot-32, shot-07, shot-13, shot-29, shot-68, shot-58, shot-70, shot-52`; `shot-44, shot-26, shot-56, shot-47, shot-39, shot-22, shot-20, shot-21, shot-36, shot-07`. |
| Category counts | Pass | All 73, portraits 23, gatherings 22, action 7, scenery 6, companions 15. |
| Filter behavior | Pass | Filter clicks preserved the same page-load shuffled relative order inside categories; Portraits first 10 in-session sample: `shot-62, shot-14, shot-69, shot-67, shot-56, shot-11, shot-17, shot-03, shot-13, shot-38`. |
| Back/Forward behavior | Pass | Back returned to the same-session Portraits order; Forward returned to the same-session Action order. |
| URL state | Pass | Valid category URLs selected matching filters; `category=bad-slug` fell back to All and cleaned the URL. |
| Copy link | Pass | Copy link returned `Link copied`. |
| Lightbox | Pass | Sampled old and new images `shot-01`, `shot-40`, `shot-71`, `shot-72`, and `shot-73`; all opened full image paths without `/thumbs/`, captions rendered, and Escape closed the lightbox. |
| Thumbnails | Pass | Gallery thumbnails rendered in All and category views. |
| Focus states | Pass | Keyboard focus remained visible/useful on Gallery controls. |
| Mobile and desktop layout | Pass | No horizontal overflow at 360px, 390px, 768px, or 1440px across Gallery views and invalid-category fallback. |
| Cross-page regression | Pass | `/`, `/join.html`, `/events.html`, `/recruitment.html`, `/twills.html`, and `/spotify.html` loaded at 390px without horizontal overflow or console-breaking errors. |
| Immutable data | Pass | `data/gallery.json`, `data/home.json`, `data/recruitment.json`, and `data/twills.json` unchanged. |
| `npm run check` | Pass with known warning | Known intentional `assets/audio/mochiriiiiii.mp3` large-asset warning only. |
| `git diff --check` | Pass | No whitespace errors. |
| `node scripts/check-json.mjs` | Pass | `JSON OK (16 files).` |
| `node scripts/check-js.mjs` | Pass | `JavaScript syntax OK (23 files).` |
| `node scripts/check-refs.mjs` | Pass | `Local references OK (429 refs checked).` |
| `node scripts/check-assets.mjs` | Pass with known warning | Known intentional `assets/audio/mochiriiiiii.mp3` large-asset warning only. |
| `npm run check:production` | Pass | `Production smoke check OK.` |
| `npm run smoke:gallery` | Pass | `Gallery lightbox smoke OK.` |

Known warnings:

- `assets/audio/mochiriiiiii.mp3` intentionally exceeds the normal large-asset threshold.
- GitHub-managed Pages deployment may still emit the known non-blocking Node.js 20 annotation.
