# Home Gallery Spotlight Rotation

## 1. Current Home Screenshot Spotlight Behavior

- Home runs `home.js` only when `body[data-page="home"]` is present.
- Home currently loads `./data/home.json` through `MochiriiUtils.fetchJson()`.
- The Home boot flow sets section intro copy, renders the hero, renders the protected guild seal, chooses the featured bulletin, renders doors, renders the member spotlight, then renders the Screenshot Spotlight from `data.home.gallery`.
- The current Home screenshot data shape is `gallery[]` with `image`, `full`, `alt`, and optional `caption`.
- The current Screenshot Spotlight renderer is `renderGallery(items)`.
- `renderGallery(items)` renders up to 12 items into `#galleryGrid`, although the current Home data provides 4 items.
- Each current Home screenshot item renders as a `.home-thumb` button with an image.
- Current displayed image source comes from `item.image`.
- Current full-size lightbox path comes from `item.full`, falling back to `item.image`.
- Current alt text comes from `item.alt`, falling back to `Guild screenshot`.
- Current caption comes from `item.caption`, falling back to blank; it is placed in `data-caption` for shared lightbox use.
- Current fallback behavior: if `data/home.json` fails to load, the script logs the error and only replaces `#heroDescriptor` with `Home content failed to load.` Static HTML remains present. If Home gallery data exists, it renders normally.
- Existing Home screenshot fallback behavior depends on the Home data array and shared Home lightbox handling in `site.js`.
- Current public script order in `index.html` is `utils.js`, `supabase.js`, `site.js`, `home.js`.
- `home.js` already uses shared helpers from `window.MochiriiUtils`: `setText`, `escapeHtml`, `asArray`, and `fetchJson`.
- `index.html` currently loads `home.js` without a cache query. `docs/home-shell-guide.md` says Home currently uses no cache-query strings; query changes should be deliberate.

## 2. Current Gallery Data Shape

- Current Gallery item count: 73.
- Current category counts: portraits 23, gatherings 22, action 7, scenery 6, companions 15.
- Gallery data lives in `data/gallery.json`.
- Gallery item fields include `id`, `src`, `alt`, `caption`, `category`, `tags`, `full`, and `thumb`.
- Gallery full image fields: `full`, with `src` as a compatible full-image fallback.
- Gallery thumbnail field: `thumb`.
- Gallery caption field: `caption`.
- Gallery alt text field: `alt`.
- Gallery category field: `category`.
- Gallery item paths are relative paths such as `./assets/img/gallery/thumbs/shot-01.webp` and `./assets/img/gallery/shot-01.webp`, compatible with Home rendering from `/`.
- Gallery categories are compatible with stable Home links in the form `./gallery.html?category=<category>`.
- Gallery randomization on the Gallery page is isolated in `gallery.js` and does not change `data/gallery.json`.

## 3. Home Spotlight Rotation Plan

- Keep `data/home.json` unchanged.
- Keep `data/gallery.json` unchanged.
- Fetch `./data/gallery.json` from `home.js` after the existing Home data has loaded and the existing Home fallback Screenshot Spotlight has rendered.
- Select 4 unique random Gallery items from the full Gallery item array.
- Use a copied Fisher-Yates shuffled array, not mutation of canonical Gallery data.
- Validate Gallery items before rendering so missing image paths do not create broken cards.
- Require at least 4 usable Gallery items before replacing the existing Home fallback Screenshot Spotlight.
- Render selected Gallery items into the existing Home Screenshot Spotlight section.
- Use Gallery thumbnail paths for Home display.
- Use Gallery full image paths only as item metadata where useful; selected Home spotlight cards should link to Gallery category pages rather than replacing Gallery page behavior.
- Use Gallery alt text for displayed images, falling back to caption and then `Gallery image`.
- Use Gallery caption for the existing Home card accessible label and optional metadata.
- Link each selected item to `./gallery.html?category=<category>` when the category is one of `portraits`, `gatherings`, `action`, `scenery`, or `companions`.
- Link to `./gallery.html` when category is missing or invalid.
- Avoid duplicate selected images by de-duplicating on full image path, source path, thumbnail path, or item id.
- If Gallery fetch fails, Gallery JSON is invalid, or fewer than 4 usable Gallery items exist, preserve the already-rendered Home screenshot fallback from `data/home.json`.
- Do not change the Home seal verse.
- Do not change Home copy.
- Do not change Gallery behavior.
- Do not use `localStorage` or `sessionStorage`.
- Do not add backend logic.
- Do not change CSS.
- Do not update `index.html` cache query unless validation shows the repo needs it; current Home convention has no cache query for `home.js`.

## 4. Changes Made

- Added `HOME_JSON_URL`, `GALLERY_JSON_URL`, and `HOME_GALLERY_COUNT` constants in `home.js`.
- Added a valid Gallery category set for Home links: `portraits`, `gatherings`, `action`, `scenery`, and `companions`.
- Added `normalizeSlug()`, `galleryHref()`, and `getGalleryCategory()` helpers.
- Added `flattenGalleryItems(data)` to read Gallery items from the existing album shape.
- Added `normalizeGalleryItem(item)` to convert Gallery records into Home spotlight records with `image`, `full`, `alt`, `caption`, and `href`.
- Added `shuffleItems(items)`, a Fisher-Yates helper that copies before shuffling.
- Added `pickGallerySpotlightItems(data, count)` to pick four unique usable Gallery items without mutating Gallery data.
- Added `renderGallerySpotlightLinks(items)` to render exactly four selected Gallery items into the existing Home Screenshot Spotlight grid.
- Preserved the existing `renderGallery(items)` fallback renderer for `data/home.json`.
- Updated Home boot flow so `data/home.json` renders first, then `rotateGallerySpotlight()` attempts to replace the fallback grid with four Gallery-derived items.
- Added handled fallback behavior: if Gallery data fetch fails, parses incorrectly, or does not produce four usable items, the already-rendered Home fallback remains in place.
- Added a Home-only capture listener for selected Gallery spotlight links so linked Home thumbnails navigate to Gallery category pages instead of being intercepted by the shared Home lightbox capture handler.
- No CSS was changed.
- No data files were changed.
- `index.html` was not changed.

Link behavior:

- Valid Gallery categories link to `./gallery.html?category=<category>`.
- Missing or invalid categories fall back to `./gallery.html`.
- The selected Home cards are rendered as anchors with existing `.home-thumb` visual structure.

Cache-query decision:

- `home.js` changed.
- `docs/home-shell-guide.md` says Home currently uses no cache-query strings and query changes should be deliberate.
- The Home page has no existing Home-specific cache-query convention.
- `index.html` was left unchanged.

## 5. QA Results

| Check | Result | Evidence |
| --- | --- | --- |
| Home renders exactly four images | Pass | Each tested Home load rendered 4 Screenshot Spotlight images. |
| Images come from Gallery data | Pass | All selected image sources matched `data/gallery.json` thumbnail paths. |
| No duplicates | Pass | Each tested 4-image set had 4 unique thumbnail paths. |
| Thumbnail usage | Pass | All selected Home images used `/assets/img/gallery/thumbs/` paths. |
| Alt text | Pass | All selected images had non-empty alt text. |
| Captions | Pass | All selected items carried Gallery captions into card metadata. |
| Link behavior | Pass | Selected cards linked to `./gallery.html?category=<category>`; sampled click navigated to `gallery.html?category=portraits`. |
| Refresh rotation | Pass | Three full Home loads selected `shot-60, shot-46, shot-07, shot-51`; then `shot-38, shot-21, shot-63, shot-02`; then `shot-24, shot-19, shot-05, shot-10`. |
| Fallback behavior | Pass | With `data/gallery.json` intercepted as unavailable, Home kept the 4 existing `data/home.json` fallback thumbnails: `shot-23`, `shot-57`, `shot-60`, `shot-65`. |
| Home seal poem | Pass | Rendered `#sealVerse` HTML matched the protected `data/home.json` `seal.verse` lines with `<br>` separators. |
| Home mobile/desktop overflow | Pass | No horizontal overflow at 360px, 390px, 768px, or 1440px. |
| Gallery regression | Pass | Gallery still rendered 73 images, category counts stayed correct, refresh randomization still changed order, filters stayed same-session stable, Copy link worked, and lightbox opened full image paths. |
| Cross-page regression | Pass | `/join.html`, `/events.html`, `/recruitment.html`, `/twills.html`, and `/spotify.html` loaded at 390px with header/footer, no horizontal overflow, and no console-breaking errors. |
| Protected content | Pass | `data/home.json`, `data/gallery.json`, `data/recruitment.json`, and `data/twills.json` unchanged. |
| Known warnings | Expected | `assets/audio/mochiriiiiii.mp3` remains over the normal large-asset threshold intentionally. |

## 6. Validation

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
