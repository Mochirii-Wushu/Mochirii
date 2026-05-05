# Home and Site Shell Implementation Inventory

## 1. Files Inspected

- `index.html`
- `data/home.json`
- `home.js`
- `header.html`
- `footer.html`
- `site.js`
- `utils.js`
- `supabase.js`
- `styles.css`
- `package.json`
- `scripts/check-js.mjs`
- `scripts/check-json.mjs`
- `scripts/check-refs.mjs`
- `scripts/check-assets.mjs`
- `scripts/check-production.mjs`
- `docs/content-guide.md`
- `AGENTS.md`
- `README.md`
- `reports/`

## 2. Home Data Shape

`data/home.json` is a top-level object with these keys:

- `copy`
- `hero`
- `seal`
- `bulletins`
- `tiles`
- `spotlight`
- `gallery`

Current nested shape:

- `copy`: `bulletinIntro`, `doorsIntro`, `spotlightIntro`, `galleryIntro`
- `hero`: `image`, `atmosphereImage`, `descriptor`, `badges`
- `seal`: `title`, `image`, `imageAlt`, `verse`
- `bulletins[]`: `pinned`, `type`, `title`, `date`, `image`, `imageAlt`, `href`
- `tiles[]`: `label`, `title`, `image`, `alt`, `href`
- `spotlight`: `tag`, `title`, `summary`, `image`, `imageAlt`, `href`
- `gallery[]`: `image`, `full`, `alt`

Current arrays and objects:

- `hero.descriptor`: array of paragraph strings.
- `hero.badges`: array of text-only badge strings.
- `seal.verse`: protected array of poem line strings.
- `bulletins`: array of bulletin link/card objects.
- `tiles`: array of door link/card objects.
- `gallery`: array of Home gallery thumbnail objects.

Renderer-derived field behavior:

- `home.js` runs only when `body[data-page="home"]` is present.
- Home data is fetched from `./data/home.json` through `MochiriiUtils.fetchJson()`.
- Valid JSON is required for dynamic Home content to render.
- `copy.*` fields are optional from the script's perspective. If missing, `home.js` uses hardcoded fallback intro text for each Home module.
- `hero.image` updates `#heroImage` only when present. The static HTML image remains as a fallback.
- `hero.atmosphereImage` is optional. If blank or missing, `#heroAtmosphere` receives an empty `src`; CSS currently hides atmosphere images globally.
- `hero.descriptor` is optional from the script's perspective. Missing or empty descriptors render `No description provided.`
- `hero.badges` is optional and capped at eight rendered badges.
- `seal.title` falls back to `Guild Seal`.
- `seal.image` updates `#sealImage` only when present. The static HTML image remains as a fallback.
- `seal.imageAlt` updates the seal image alt text; if absent, the existing alt text is preserved or falls back to `Guild seal`.
- `seal.verse` is optional from the script's perspective, but protected and required for the intended Home page. Empty or missing verse lines render an em dash.
- `bulletins` is optional from the script's perspective. The first item or the first item with `pinned: true` becomes the featured bulletin.
- `bulletins[].pinned` controls featured selection only; it is not rendered as visible text.
- `bulletins[].type` maps through `typeLabel()` to `Event`, `Raffle`, `Announcement`, `Member`, or `Update`.
- `bulletins[].date` renders through `MochiriiUtils.formatDateUTC()` with numeric month/day/year.
- `bulletins[].summary` is rendered when present, but current bulletin data does not include `summary`.
- `tiles` is optional from the script's perspective and is capped at four rendered doors.
- `tiles[].subtitle` is supported by `home.js` but is not present in current data.
- `spotlight` fields are optional from the script's perspective and render into the static spotlight card.
- `gallery` is optional from the script's perspective and is capped at twelve rendered thumbnails.
- `gallery[].image` is required for an individual Home gallery item to render.
- `gallery[].full` is optional and falls back to `gallery[].image`.
- `gallery[].caption` is supported by the renderer but is not present in current data.

Fields present but not rendered:

- No current top-level Home data fields appear unused.
- `bulletins[].pinned` is behavior-only.
- Supported-but-absent fields include `tiles[].subtitle`, `bulletins[].summary`, and `gallery[].caption`.
- `homeKicker` and `homeHeading` are static in `index.html`; `home.js` does not read data-driven kicker or heading fields.

## 3. Protected Guild Seal Poem

The protected guild seal poem lives at:

- File: `data/home.json`
- JSON key: `seal.verse`

`home.js` renders it in `renderSeal()` by normalizing `seal.verse` with `MochiriiUtils.asArray()`, trimming empty lines, escaping each line with `MochiriiUtils.escapeHtml()`, and joining rendered lines with `<br>` inside `#sealVerse`.

The seal verse can be identified by the opening words, `Silvered jade softly gleams`.

The seal verse must not be edited. Punctuation, line breaks, spelling, capitalization, diacritics, order, and wording must remain unchanged. Other non-seal Home fields may be revised in future work only when needed, supported by `home.js`, and intentionally scoped.

## 4. Home Rendering Behavior

Hero/header content:

- `index.html` owns the static Home hero shell, `#homeKicker`, `#homeHeading`, primary CTAs, and the static hero image fallback.
- `home.js` does not render the Home kicker or `h1`.
- `renderHero()` updates `#heroImage`, `#heroAtmosphere`, `#heroDescriptor`, and `#heroBadges`.
- Descriptor strings render as escaped paragraphs. Missing descriptors render a muted fallback paragraph.
- Hero badges render as text-only spans and are capped at eight.

Guild seal block:

- `renderSeal()` updates `#sealImage`, `#sealTitle`, and `#sealVerse`.
- The seal verse renders with explicit `<br>` line breaks between JSON array items.
- The seal image is eager-loaded in static HTML.

Bulletin behavior:

- `pickFeatured()` selects the first `pinned: true` bulletin, then falls back to the first bulletin.
- `renderFeaturedBulletin()` updates the featured link, image, type, date, title, and summary.
- `renderBulletins()` renders up to five non-featured bulletin cards.
- Bulletin cards are links with image, type label, date, title, and summary text.

Doors/cards:

- `renderDoors()` renders up to four `tiles` as linked cards.
- Door cards use `label`, `title`, `subtitle`, `image`, `alt`, and `href`.
- `subtitle` is supported but absent in the current data.

Spotlight:

- `renderSpotlight()` updates the static spotlight link, image, tag, title, and summary.
- The visible `Spotlight Appreciation` label is static in `index.html`.

Home gallery and lightbox:

- `renderGallery()` renders up to twelve Home gallery thumbnail buttons.
- Home gallery buttons use `image` for the thumbnail source, `full` for the full-size lightbox source, optional `caption`, and optional `alt`.
- The shared lightbox behavior in `site.js` supports Home's `#modalRoot` and opens gallery images from `data-full` or the image source fallback.

CTA/link sections:

- The primary Home hero CTAs are static links in `index.html`: Discord and `./join.html`.
- Bulletin, door, and spotlight links are data-driven.
- Home has no form, application flow, account flow, or URL state.

Images/media:

- The static Home hero preloads `./assets/img/hero/hero.webp`.
- Home uses eager loading for hero and seal images.
- Bulletin, door, spotlight, and gallery images use lazy loading in either static markup or rendered markup.
- Home has no audio or video behavior.

Empty/error/fallback behavior:

- If `data/home.json` fails to load or parse, `home.js` logs the error and replaces `#heroDescriptor` with `Home content failed to load.`
- Missing optional arrays generally render empty containers.
- Missing `seal.verse` lines render an em dash, but the current protected verse should remain present.

Renderer limits:

- Hero badges: eight.
- Non-featured bulletins: five.
- Door tiles: four.
- Home gallery thumbnails: twelve.

## 5. Shared Site Shell Behavior

`header.html`:

- Contains a skip link to `#main`.
- Contains brand links to `./index.html` with visible `Mōchirīī` and `Where Winds Meet Guild`.
- Desktop navigation is grouped into dropdowns:
  - Guild: Home, Spotlight, Gallery.
  - Culture: Join, Ranks, Leaders, Codex, Playlists.
  - Updates: Announcements, Events, Raffles.
  - Recruitment is a top-level desktop link.
- Contains a Discord `Join` CTA with `target="_blank"` and `rel="noopener noreferrer"`.
- Contains a mobile menu button with `id="menu-btn"`, `aria-expanded`, and `aria-controls="mobile-menu"`.
- Contains a mobile dialog shell with grouped mobile links covering the same primary links in a mobile-specific structure.

`footer.html`:

- Uses a `footer` landmark with `role="contentinfo"`.
- Contains a Home brand link, emblem, identity text, Discord CTA, and Recruitment Tips link.
- Footer navigation groups match the header's Guild, Culture, and Updates structure.
- Footer game-name usage appears in the subtitle, description, and footer metadata line.
- Footer copyright text is updated by `site.js`.

`site.js`:

- Fetches `./header.html` into `#header` and `./footer.html` into `#footer`.
- Returns `null` without throwing if a mount target is missing or a partial fetch fails.
- Detects the current page key from the current filename.
- Sets active desktop navigation by matching `[data-nav]`, adding `is-active`, and setting `aria-current="page"`.
- Sets header scroll state through `data-state="top"` or `data-state="scrolled"`.
- Initializes the mobile menu, including open/close state, body overflow lock, Escape close, click-away close, link close, focus trap, and focus return.
- Initializes desktop dropdown menus, including click toggles, Enter/Space toggles, ArrowDown opening/focus, Escape close, and outside-click close.
- Sets the footer year in `#copyright-text`.
- Initializes shared lightbox behavior for Home `#modalRoot`, Gallery `#lightbox`, or another `.lightbox` root.
- The lightbox uses Escape close, focus trapping, scroll lock, and full-image source selection from data attributes, link hrefs, or image sources.

`utils.js`:

- Exposes one global: `window.MochiriiUtils`.
- Provides array, text, escaping, element, image, JSON fetch, UTC date, external-link, tag normalization, and Spotify embed helpers.
- `fetchJson()` fetches a URL, reads text, throws on non-OK responses, and throws a detailed invalid-JSON error when parsing fails.
- `escapeHtml()` is used by renderers that build HTML strings.
- `formatDateUTC()` handles date-only values in UTC.
- `isExternalHttpUrl()` is available for safe external-link handling.

`supabase.js`:

- Exposes one global: `window.MochiriiSupabase`.
- Defines public runtime config, REST URL, and browser-safe helpers: `getConfig`, `createHeaders`, `request`, `select`, `insert`, and `probe`.
- Does not create a client session, perform auth, or run a network request on page load.
- Returns structured result objects for request failures instead of throwing into the page shell in normal helper calls.
- Home and `site.js` do not directly call `window.MochiriiSupabase`.
- Current public pages load `supabase.js` before `site.js` and page scripts so the helper is available without making signed-out browsing depend on Supabase data.

## 6. Shared Script-Order Inventory

All checked public page shells load `utils.js`, then `supabase.js`, then `site.js`, then their page-specific script. Gallery keeps the same order while adding existing cache-query strings.

| Page | CSS | Script order |
| --- | --- | --- |
| `index.html` | `./styles.css` | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./home.js` |
| `join.html` | `./styles.css` | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./join.js` |
| `events.html` | `./styles.css` | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./events.js` |
| `gallery.html` | `./styles.css?v=2026-05-gallery-polish` | `./utils.js?v=2026-05-gallery-cache` -> `./supabase.js?v=2026-05-gallery-cache` -> `./site.js?v=2026-05-gallery-cache` -> `./gallery.js?v=2026-05-gallery-cache` |
| `ranks.html` | `./styles.css` | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./ranks.js` |
| `leaders.html` | `./styles.css` | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./leaders.js` |
| `codex.html` | `./styles.css` | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./codex.js` |
| `recruitment.html` | `./styles.css` | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./recruitment.js` |
| `announcements.html` | `./styles.css` | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./announcements.js` |
| `raffles.html` | `./styles.css` | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./raffles.js` |
| `spotify.html` | `./styles.css` | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./spotify.js` |
| `spotlight.html` | `./styles.css` | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./spotlight.js` |
| `twills.html` | `./styles.css` | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./twills.js` |

No page differed from the current shared order. No missing shared script or runtime-breaking order issue was found.

## 7. Metadata / SEO / Social Preview

Home metadata in `index.html`:

- Title: `Mōchirīī • Where Winds Meet Guild`
- Meta description: `Join Mōchirīī, a warm Where Winds Meet guild for friendly runs, clear event notes, and a cozy wuxia guild hall.`
- Canonical: `https://mochirii.com/`
- Open Graph: `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image`
- Twitter: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- Theme color: `#0a0c0e`
- Icons: `./favicon.ico` and `./assets/img/brand/apple-touch-icon.png`
- JSON-LD: a `WebSite` object with `name`, `url`, `description`, and `publisher`
- Preload: `./assets/img/hero/hero.webp`

Home does not currently add cache-query strings to its CSS or scripts.

## 8. Game-Name Rule

Current rule:

- `Where Winds Meet` may remain in header/footer, titles, metadata, SEO, JSON-LD, internal code, docs, reports, and validation scripts.
- Avoid the exact game name in regular visible body copy outside header/footer.

Observed Home state:

- `index.html` metadata and JSON-LD use the game name.
- Shared header/footer use the game name.
- The current Home body data in `data/home.json` avoids the exact game name in regular visible body copy.
- The Home static body outside header/footer does not introduce the exact game name in regular visible copy.

## 9. Accessibility / Structure

- `header.html` provides a skip link to `#main`; CSS reveals it on focus.
- `index.html` has a static Home hero header and one `main` landmark with `id="main"`.
- Shared footer uses a `footer` landmark with `role="contentinfo"`.
- Home has one visible `h1` in `#homeHeading`.
- Main Home modules use `h2` headings, with rendered card titles using `h3` where present.
- Desktop dropdown buttons expose `aria-haspopup`, `aria-expanded`, and `aria-controls`.
- Mobile menu exposes `role="dialog"`, `aria-modal="true"`, and `aria-label="Menu"`.
- Mobile menu opens from `#menu-btn`, traps Tab while open, closes on Escape/click-away/close button/link click, and returns focus to the trigger on Escape or close button.
- Shared lightbox uses `role="dialog"`, `aria-modal="true"`, Escape close, focus trap, scroll lock, and focus return.
- Focus-visible styles exist globally and are strengthened for nav, CTA, footer, Gallery, Join checklist, and Home thumbnail/card controls.
- Shared nav, mobile links, CTAs, close buttons, gallery filters, and similar controls use 44px minimum target patterns in current CSS.
- Images use alt text fields or empty/hidden alt patterns depending on whether they are meaningful or decorative.
- `prefers-reduced-motion: reduce` disables or shortens animations and hover transforms.
- Browser smoke found no horizontal overflow at 360px, 390px, and 768px on the key baselined pages checked before this docs branch.

## 10. Asset / Cache Behavior

Home asset references:

- Background: `./assets/bg/wuxia-bg.webp`
- Hero: `./assets/img/hero/hero.webp`
- Seal/brand emblem: `./assets/img/brand/emblem.webp`
- Apple touch icon: `./assets/img/brand/apple-touch-icon.png`
- Featured bulletin: `./assets/img/bulletins/featured.webp`
- Raffle bulletin: `./assets/img/bulletins/raffle.webp`
- Announcement bulletin: `./assets/img/bulletins/announcement.webp`
- Door tiles: `./assets/img/tiles/join.webp`, `./assets/img/tiles/ranks.webp`, `./assets/img/tiles/leaders.webp`, `./assets/img/tiles/codex.webp`
- Spotlight: `./assets/img/featured/spotlight.webp`
- Home gallery thumbnail: `./assets/img/gallery/thumbs/shot-23.webp`
- Home gallery full image: `./assets/img/gallery/shot-23.webp`

Loading patterns:

- Home hero and guild seal images are eager-loaded.
- Home hero image is preloaded.
- Bulletin, door, spotlight, footer emblem, and gallery images use lazy loading where applicable.
- Atmosphere images are currently hidden by shared CSS.

Cache behavior:

- Home `index.html` currently references `./styles.css`, `./utils.js`, `./supabase.js`, `./site.js`, and `./home.js` without cache-query strings.
- Gallery currently uses cache-query strings on its CSS and JS references.
- The current repo has no build tools, service worker, or runtime cache workaround.

Asset validation:

- `node scripts/check-assets.mjs` checks asset count, large files, and fake WebP headers.
- The known asset warning is `assets/audio/mochiriiiiii.mp3` at 3.31 MB.

## 11. Cache-Query Convention

- Gallery uses cache-query versions for Gallery CSS/JS references where applicable.
- Shared CSS/JS query changes should be deliberate.
- If shared CSS/JS changes in a future branch, review whether cache-query updates are needed on affected pages.
- Do not add build tools, service workers, or runtime cache hacks without explicit approval.

This docs-only branch does not modify cache queries.

## 12. Unsupported / Not Present

The current Home/Shell implementation does not support:

- A CMS.
- A framework, bundler, transpiler, or runtime dependency.
- Home URL query state.
- Home forms, applications, account login, or auth UI.
- Supabase-backed Home data.
- Home data fields for `kicker`, `heading`, CTA labels, CTA URLs, metadata, SEO, JSON-LD, section headings, or footer/header content.
- Inline HTML or Markdown inside Home JSON copy.
- Data-driven header or footer navigation.
- Data-driven mobile menu groups.
- Data-driven cache-query management.
- A Home page service worker or runtime cache strategy.
- A Home audio/video module.
- A Home event filter, Gallery category filter, or Copy link behavior.
- Additional Home fields unless `home.js` is updated in the same scoped implementation branch.
