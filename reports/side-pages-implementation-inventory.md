# Side Pages Implementation Inventory

## 1. Files Inspected

- `announcements.html`
- `announcements.js`
- `data/announcements.json`
- `raffles.html`
- `raffles.js`
- `data/raffles.json`
- `spotify.html`
- `spotify.js`
- `data/spotify.json`
- `spotlight.html`
- `spotlight.js`
- `data/spotlight.json`
- `utils.js`
- `site.js`
- `supabase.js`
- `styles.css`
- `docs/content-guide.md`
- `AGENTS.md`
- `README.md`
- `reports/`

## 2. Observed-Facts Rule

This inventory documents current implementation only. Unsupported or absent behaviors are marked as not currently implemented. Future behavior is not documented as existing behavior.

## 3. Pages Covered

### Announcements

- HTML file: `announcements.html`
- JS file: `announcements.js`
- JSON data file: `data/announcements.json`
- Purpose: public notices, timing notes, schedule notes, training focus, and short guild updates.
- Current rendering pattern: static HTML shell with stable IDs; `announcements.js` fetches JSON, applies hero/meta fields, sorts items, and renders announcement cards into `#announcementsList`.
- Current data shape: top-level `meta` object and `items[]` array.
- Supported fields:
  - `meta.title`
  - `meta.tagline`
  - `meta.intro`
  - `meta.updated`
  - `meta.badges[]`
  - `meta.hero.image`
  - `meta.hero.atmosphere`
  - `items[].id`
  - `items[].pinned`
  - `items[].date`
  - `items[].title`
  - `items[].summary`
  - `items[].details[]`
  - `items[].tags[]`
- Unsupported fields: item-level links, images, buttons, URL state, filters, comments, forms, moderation fields, and Supabase-backed announcement data are not currently implemented.
- Shared helper usage: `MochiriiUtils.setText`, `MochiriiUtils.escapeHtml`, `MochiriiUtils.fetchJson`, and `MochiriiUtils.formatDateUTC`.
- Link behavior: no announcement item links are currently rendered.
- Image/media/embed behavior: one hero image is present in HTML and can be updated from `meta.hero.image`; an atmosphere image mount exists but global CSS hides `.page-hero__atmos`.
- Fallback/error behavior: empty `items[]` renders `No announcements yet.`; load or parse failure logs the error, renders an `Unable to load announcements.` card, and updates the `#announcementsError` status node.

### Raffles

- HTML file: `raffles.html`
- JS file: `raffles.js`
- JSON data file: `data/raffles.json`
- Purpose: raffle information, participation notes, rules, current month timing, prize notes, and related links.
- Current rendering pattern: static HTML shell with stable IDs; `raffles.js` fetches JSON, applies hero/meta fields, renders prose/list sections, renders current-month raffle details, and builds safe links.
- Current data shape: top-level `meta`, `how[]`, `rules[]`, `thisMonth`, `links[]`, and `note[]`.
- Supported fields:
  - `meta.kicker`
  - `meta.title`
  - `meta.intro`
  - `meta.frequency`
  - `meta.timezoneLabel`
  - `meta.badges[]`
  - `meta.hero.image`
  - `meta.hero.atmosphere`
  - `how[]`
  - `rules[]`
  - `thisMonth.date`
  - `thisMonth.time`
  - `thisMonth.timezone`
  - `thisMonth.prizes[]`
  - `thisMonth.notes`
  - `links[].label`
  - `links[].href`
  - `note[]`
- Unsupported fields: raffle filters, URL state, entry forms, winner forms, structured eligibility objects beyond rendered text, item images, moderation fields, and Supabase-backed raffle data are not currently implemented.
- Shared helper usage: `MochiriiUtils.setText`, `MochiriiUtils.escapeHtml`, and `MochiriiUtils.fetchJson`.
- Link behavior: `links[]` render as anchors. Hrefs beginning with `http` receive `target="_blank"` and `rel="noopener noreferrer"`; relative links stay same-tab.
- Image/media/embed behavior: one hero image is present in HTML and can be updated from `meta.hero.image`; an atmosphere image mount exists but global CSS hides `.page-hero__atmos`.
- Fallback/error behavior: empty prose arrays render an empty muted paragraph; empty list arrays render no list items; load or parse failure logs the error, updates the `#rafflesError` status node, and renders `Unable to load raffle content.` in the how-it-works mount.

### Spotify

- HTML file: `spotify.html`
- JS file: `spotify.js`
- JSON data file: `data/spotify.json`
- Purpose: listening-room mood and music presentation through Spotify embeds.
- Current rendering pattern: static HTML shell with search/filter controls and grid mounts; `spotify.js` fetches JSON, builds a tag index, normalizes Spotify URLs, renders iframe cards, and re-renders on search or tag selection.
- Current data shape: top-level `intro` string and `items[]` array.
- Supported fields:
  - `intro`
  - `items[].title`
  - `items[].subtitle`
  - `items[].description`
  - `items[].type`
  - `items[].tags[]`
  - `items[].url`
  - `items[].embed`
  - `items[].height`
- Unsupported fields: non-Spotify providers, custom iframe attributes beyond the renderer output, per-item external links, image thumbnails, URL state, comments, forms, moderation fields, and Supabase-backed playlist data are not currently implemented.
- Shared helper usage: `MochiriiUtils.escapeHtml`, `MochiriiUtils.normalizeTags`, `MochiriiUtils.toSpotifyEmbedSrc`, and `MochiriiUtils.fetchJson`.
- Link behavior: Spotify cards do not currently render external links; they render iframes only.
- Image/media/embed behavior: one hero image is static in HTML. Playlist media renders as Spotify iframe embeds after URL normalization.
- Fallback/error behavior: missing or invalid embed data causes that item card to be skipped; if all rendered cards are filtered out, `#spotifyEmpty` appears. Load or parse failure updates intro text to `Unable to load playlists right now.` and renders an error message in the grid.

### Spotlight

- HTML file: `spotlight.html`
- JS file: `spotlight.js`
- JSON data file: `data/spotlight.json`
- Purpose: member appreciation, short human story, and featured person or moment.
- Current rendering pattern: static HTML shell with stable IDs; `spotlight.js` fetches JSON, applies hero/spotlight fields, renders badges, body paragraphs, conclusion, and highlights.
- Current data shape: top-level `hero` object and `spotlight` object.
- Supported fields:
  - `hero.image`
  - `hero.alt`
  - `spotlight.kicker`
  - `spotlight.title`
  - `spotlight.date`
  - `spotlight.tag`
  - `spotlight.intro`
  - `spotlight.badges[]`
  - `spotlight.body[]` or a single body string
  - `spotlight.conclusion`
  - `spotlight.highlights[]`
- Fields present but not rendered: `hero.atmosphereImage` is present in current JSON but `spotlight.js` does not read it.
- Unsupported fields: links, image galleries, profile/contact structures, comments, forms, moderation fields, URL state, and Supabase-backed spotlight data are not currently implemented.
- Shared helper usage: `MochiriiUtils.text`, `MochiriiUtils.asArray`, `MochiriiUtils.setText`, `MochiriiUtils.setImg`, `MochiriiUtils.fetchJson`, and `MochiriiUtils.formatDateUTC`.
- Link behavior: no Spotlight links are currently rendered.
- Image/media/embed behavior: one hero image is present in HTML and can be updated from `hero.image`; no Spotlight body images or embeds are currently rendered.
- Fallback/error behavior: missing body renders `Spotlight write-up goes here.`; missing highlights render `Add a few highlights for this month’s member here.`; load or parse failure logs the error and reveals the `#spotlightError` status text.

## 4. Page Purpose Boundaries

Announcements:

- Unique purpose: public notices and timing updates.
- Must not duplicate Join onboarding, Recruitment philosophy, Codex rules, Events schedule details, Gallery memories, Leaders contact structure, or Twills personal profile content.
- Overlap risk: schedule notes may point toward Events, but should stay short and not become an Events schedule replacement.

Raffles:

- Unique purpose: raffle information, prize/chance/fairness details where current fields support them, and participation notes.
- Must not duplicate Join onboarding, Recruitment philosophy, Codex rules, Events schedule details, Gallery memories, Leaders contact structure, or Twills personal profile content.
- Overlap risk: raffle timing may refer to Events or Announcements, but should not become a full event calendar or general news page.

Spotify:

- Unique purpose: listening-room mood and music/embed presentation.
- Must not duplicate Join onboarding, Recruitment philosophy, Codex rules, Events schedule details, Gallery memories, Leaders contact structure, or Twills personal profile content.
- Overlap risk: atmosphere copy should not become a Gallery archive, Recruitment pitch, or Events listing.

Spotlight:

- Unique purpose: member appreciation, short human story, and featured person or moment.
- Must not duplicate Join onboarding, Recruitment philosophy, Codex rules, Events schedule details, Gallery memories, Leaders contact structure, or Twills personal profile content.
- Overlap risk: member appreciation should not become a Leaders contact profile, Twills personal profile, Gallery archive, or Recruitment philosophy essay.

## 5. Announcements Implementation

`data/announcements.json` contains:

- `meta.title`
- `meta.tagline`
- `meta.intro`
- `meta.updated`
- `meta.badges[]`
- `meta.hero.image`
- `meta.hero.atmosphere`
- `items[]`

Each announcement item currently supports:

- `id`
- `pinned`
- `date`
- `title`
- `summary`
- `details[]`
- `tags[]`

`announcements.js` behavior:

- Runs only when `body[data-page="announcements"]` is present.
- Fetches `./data/announcements.json` with `MochiriiUtils.fetchJson()`.
- Updates the hero image only if `meta.hero.image` is present.
- Updates the atmosphere image only if `meta.hero.atmosphere` is present; current global CSS hides atmosphere images.
- Renders title, tagline, intro, updated date, and badges from `meta`.
- Formats dates with `MochiriiUtils.formatDateUTC()`.
- Sorts pinned items first, then newest date first.
- Renders each item as a `section` card with a `data-announcement` attribute.
- Renders a kicker of `Pinned` for pinned items and `Notice` otherwise.
- Escapes HTML for card fields that are inserted through template strings.
- Has no current renderer limit.

Announcements should not duplicate Events schedule details, Recruitment philosophy, Codex rules, or Gallery memories.

## 6. Raffles Implementation

`data/raffles.json` contains:

- `meta`
- `how[]`
- `rules[]`
- `thisMonth`
- `links[]`
- `note[]`

`raffles.js` behavior:

- Runs only when `body[data-page="raffles"]` is present.
- Fetches `./data/raffles.json` with `MochiriiUtils.fetchJson()`.
- Updates the hero image only if `meta.hero.image` is present.
- Updates the atmosphere image only if `meta.hero.atmosphere` is present; current global CSS hides atmosphere images.
- Renders hero kicker, heading, intro, frequency, timezone label, and badges from `meta`.
- Renders `how[]` and `note[]` as prose paragraphs.
- Renders `rules[]` and `thisMonth.prizes[]` as list items.
- Joins `thisMonth.date`, `thisMonth.time`, and `thisMonth.timezone` into a text meta line.
- Builds links with DOM APIs; external `http` links receive `target="_blank"` and `rel="noopener noreferrer"`.
- Has no current renderer limit.

Supported raffle timing/prize/eligibility fields are text-based. There is no structured eligibility engine, entry flow, drawing logic, or Supabase-backed raffle store.

Raffles should not duplicate Events page schedule, Join onboarding, Recruitment philosophy, or Announcements beyond short notice context.

## 7. Spotify Implementation

`data/spotify.json` contains:

- `intro`
- `items[]`

Each Spotify item currently supports:

- `title`
- `subtitle`
- `type`
- `tags[]`
- `embed`
- `url`
- `height`
- `description`

`spotify.js` behavior:

- Runs only when `body[data-page="spotify"]` is present.
- Fetches `./data/spotify.json` with `MochiriiUtils.fetchJson()`.
- Maps missing item fields to safe defaults.
- Builds tag filters from `items[].tags[]`, with `All` inserted first.
- Filters rendered cards by search query and selected tag.
- Search matches title, subtitle, description, tags, and type.
- Search input uses an 80 ms debounce.
- Tag controls render as buttons with `aria-pressed`.
- Renders matching valid items as `article` cards containing Spotify iframes.
- Skips an item when `MochiriiUtils.toSpotifyEmbedSrc(it.embed || it.url)` returns an empty string.

Spotify URL normalization:

- `MochiriiUtils.toSpotifyEmbedSrc()` accepts only `open.spotify.com`.
- It supports `album`, `artist`, `episode`, `playlist`, `show`, and `track` paths.
- It accepts both normal Spotify URLs and `/embed/...` Spotify URLs.
- It returns `https://open.spotify.com/embed/{kind}/{id}?utm_source=generator`.
- It returns an empty string for unsupported hosts, unsupported kinds, missing IDs, or malformed URLs.

Current iframe behavior:

- Embeds render as iframes, not links.
- Each iframe has `src`, `width="100%"`, `height` from data or default `352`, `frameborder="0"`, `allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"`, `loading="lazy"`, and `title="Spotify embed: {title}"`.
- `.spotify-embed` uses `overflow:hidden` and the iframe is `display:block`.
- The Spotify grid uses two columns on wider screens and one column below `980px`.
- Browser smoke at `360px`, `390px`, `768px`, and `1440px` showed no horizontal overflow and no page or console errors.

Fallback behavior:

- Invalid or missing item embed data skips the individual card.
- If the current search/filter result has no valid rendered cards, `#spotifyEmpty` appears.
- If JSON loading fails, the intro changes to `Unable to load playlists right now.` and the grid receives an error message.

Spotify should not duplicate Gallery memories, Recruitment copy, Events schedule, or Codex rules.

No real Spotify embed issue was found during this inventory. This docs-only branch does not change Spotify embed behavior.

## 8. Spotlight Implementation

`data/spotlight.json` contains:

- `hero`
- `spotlight`

`spotlight.js` behavior:

- Runs only when `body[data-page="spotlight"]` is present.
- Fetches `./data/spotlight.json` with `MochiriiUtils.fetchJson()`.
- Renders hero image and alt from `hero.image` and `hero.alt`.
- Renders kicker, title, date, tag, intro, badges, body, conclusion, and highlights from `spotlight`.
- Formats `spotlight.date` with `MochiriiUtils.formatDateUTC()`.
- Renders body as paragraphs; a single body string is also accepted.
- Renders badge labels after trimming to 34 characters and caps badges at 10.
- Renders highlights as list items and caps highlights at 10.
- Does not currently read `hero.atmosphereImage`.
- Does not render links, body images, or embeds.

Fallback behavior:

- Missing body renders `Spotlight write-up goes here.`
- Missing highlights render `Add a few highlights for this month’s member here.`
- Load or parse failure logs the error and reveals the `#spotlightError` status node.

Spotlight should not duplicate Leaders page profile/contact structure, Twills personal profile, Gallery memory archive, or Recruitment philosophy.

## 9. Shared Utility Dependencies

`utils.js`:

- Announcements uses `setText`, `escapeHtml`, `fetchJson`, and `formatDateUTC`.
- Raffles uses `setText`, `escapeHtml`, and `fetchJson`.
- Spotify uses `escapeHtml`, `normalizeTags`, `toSpotifyEmbedSrc`, and `fetchJson`.
- Spotlight uses `text`, `asArray`, `setText`, `setImg`, `fetchJson`, and `formatDateUTC`.
- Shared helpers include safe text, HTML escaping, JSON fetch error handling, UTC date formatting, tag normalization, external URL detection, and Spotify embed normalization.

`site.js`:

- All four side pages depend on `site.js` for header/footer mounting, current-page nav state, desktop dropdown behavior, mobile menu behavior, skip-link placement from the header partial, footer year, and shared lightbox initialization.
- None of the four side page scripts mount the shared header or footer themselves.

`supabase.js`:

- All four side page shells load `supabase.js`.
- None of the four side page scripts directly call `window.MochiriiSupabase`.
- `supabase.js` exposes public REST helper functions and does not perform a network request on page load, so signed-out public browsing does not depend on Supabase data.

No page-specific helper for side-page moderation, comments, CMS content, or Supabase-backed data is currently present.

## 10. Shared Script Order

The four side page shells all load shared and page scripts in the expected order.

| Page | Script order |
| --- | --- |
| `announcements.html` | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./announcements.js` |
| `raffles.html` | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./raffles.js` |
| `spotify.html` | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./spotify.js` |
| `spotlight.html` | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./spotlight.js` |

No side page differed from the expected order. No missing shared script or script-order runtime issue was found. This docs-only branch does not change script order.

## 11. Accessibility / Structure

Shared structure:

- All four pages load the shared header and footer partials.
- The shared header contains the skip link to `#main`.
- Each side page has a `main` element with `id="main"`.
- The shared footer renders as a footer landmark.
- Shared focus styles, mobile menu behavior, and reduced-motion handling come from `styles.css` and `site.js`.

Announcements:

- Rendered heading structure is one `h1`, then `h2` for `Latest Notices`, then `h3` for announcement cards.
- Cards render as section elements with readable text, details lists, and badge rows.
- Hero image has meaningful alt text; hidden atmosphere image is empty-alt and `aria-hidden`.
- No announcement links or buttons are currently rendered.
- Browser smoke at `360px`, `390px`, `768px`, and `1440px` showed no horizontal overflow and no page or console errors.

Raffles:

- Rendered heading structure is one `h1`, then `h2`/`h3` headings for how-it-works, rules, this-month, and raffle note sections.
- Rules and prizes render as lists.
- Links render as anchors; external links use safe target/rel conventions.
- Hero image has meaningful alt text; hidden atmosphere image is empty-alt and `aria-hidden`.
- Browser smoke at `360px`, `390px`, `768px`, and `1440px` showed no horizontal overflow and no page or console errors.

Spotify:

- Rendered heading structure is one `h1`, then `h2` for `Collection`, then `h3` for each rendered playlist card.
- Search input has a visible label.
- Tag filters render as buttons with `aria-pressed`.
- Playlist cards render as `article` elements with `aria-label` set to the escaped title.
- Spotify iframes have meaningful `title` attributes and lazy loading.
- Hero image has meaningful alt text; hidden atmosphere image is empty-alt and `aria-hidden`.
- Browser smoke at `360px`, `390px`, `768px`, and `1440px` showed no horizontal overflow and no page or console errors.

Spotlight:

- Rendered heading structure is one `h1`, then `h2` for `Appreciation`, then `h3` for `Highlights`.
- Body text renders as paragraphs and highlights render as a list.
- Hero image has meaningful alt text; hidden atmosphere image is empty-alt and `aria-hidden`.
- No Spotlight links or buttons are currently rendered.
- Browser smoke at `360px`, `390px`, `768px`, and `1440px` showed no horizontal overflow and no page or console errors.

## 12. Game-Name Rule

Current rule:

- `Where Winds Meet` may remain in header/footer, metadata, SEO, JSON-LD, internal code, docs, reports, and validation scripts.
- Avoid it in regular visible body copy outside header/footer.

Observed side-page state:

- Side-page titles and metadata use the exact game name.
- Header/footer brand text use the exact game name.
- Rendered visible body copy outside header/footer on Announcements, Raffles, Spotify, and Spotlight did not contain `Where Winds Meet` during browser smoke.

## 13. Unsupported / Not Present

Current unsupported or absent side-page behavior:

- No CMS.
- No framework or bundler.
- No side-page Supabase-backed data.
- No side-page forms.
- No comments.
- No moderation workflow.
- No Announcements links or images.
- No Raffles entry/drawing engine.
- No Raffles URL state or filters.
- No Spotify non-Spotify providers.
- No Spotify URL state.
- No Spotify per-card external links.
- No Spotlight profile/contact structure.
- No Spotlight body images, gallery, or links.
- No side-page service worker or runtime cache layer.
