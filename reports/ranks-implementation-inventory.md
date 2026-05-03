# Ranks Implementation Inventory

## 1. Files Inspected

- `data/ranks.json`
- `ranks.html`
- `ranks.js`
- `utils.js`
- `site.js`
- `styles.css`
- `docs/content-guide.md`
- `AGENTS.md`
- `README.md`
- `reports/`

## 2. Current Data Shape

`data/ranks.json` has these top-level keys:

- `hero`
- `progression`
- `tiers`

Current nested shape:

- `hero`: `kicker`, `title`, `intro`, `image`, `atmosphereImage`, `pills`
- `progression`: `title`, `pills`, `body`
- `tiers.senior`: `title`, `description`, `image`, `ranks`
- `tiers.middle`: `title`, `description`, `image`, `pills`, `ranks`
- `tiers.members`: `title`, `description`, `image`, `pills`, `ranks`

Current arrays and item shapes:

- `hero.pills`: array of plain strings.
- `progression.pills`: array of plain strings.
- `progression.body`: array of paragraph strings.
- `tiers.senior.ranks[]`: objects with `name` and `body`.
- `tiers.middle.pills`: array of plain strings.
- `tiers.middle.ranks[]`: objects with `name` and `body`.
- `tiers.members.pills`: array of plain strings.
- `tiers.members.ranks[]`: objects with `name` and `body`.
- `ranks[].body`: array of paragraph strings.

Renderer-derived field behavior:

- Valid JSON is required for dynamic Ranks content.
- `hero.kicker` falls back to `Ranks`.
- `hero.title` falls back to `Ranks & Progression`.
- `hero.intro` falls back to an empty string.
- `hero.image` updates the hero image when present; the HTML also has a static fallback image.
- `hero.atmosphereImage` is read by `ranks.js`, but the matching `.page-hero__atmos` element is hidden by global CSS.
- `hero.pills` render as plain text pills and are capped at 10.
- `progression.title` falls back to `Progression`.
- `progression.pills` render as plain text pills and are capped at 10.
- `progression.body` renders as paragraphs; missing or empty body arrays render a muted `—` paragraph.
- `tiers.senior`, `tiers.middle`, and `tiers.members` are hardcoded renderer slots.
- Tier `title` fields have fallback labels matching the current section names.
- Tier `description` fields fall back to empty strings.
- Tier `note` fields are supported by `ranks.js` for all three tiers, but no `note` fields are present in the current JSON.
- Tier `image` fields update the matching side images when present; the HTML also has static fallback images.
- `tiers.middle.pills` and `tiers.members.pills` render as plain text pills and are capped at 10.
- `tiers.senior.pills` is not rendered because there is no senior pill placeholder or renderer call.
- Rank `name` falls back to `Rank`.
- Rank `body` renders as paragraphs; missing or empty body arrays render a muted `—` paragraph.

Image and emblem fields:

- Current data uses `hero.image`, `tiers.senior.image`, `tiers.middle.image`, and `tiers.members.image`.
- Current data includes `hero.atmosphereImage`, currently set to an empty string.
- No per-rank image, emblem, icon, badge image, or alt text fields are present.
- `assets/img/ranks/ladder.webp` exists in the asset folder, but it is not referenced by `data/ranks.json`, `ranks.html`, or `ranks.js`.

Fields present but not visibly rendered:

- `hero.atmosphereImage` is present, but the target atmosphere image is hidden by CSS.

## 3. Rendering Behavior

`ranks.js` runs only when `body[data-page="ranks"]` is present.

Hero rendering:

- Fetches `./data/ranks.json` through `MochiriiUtils.fetchJson()`.
- Sets `#ranksKicker`, `#ranksHeading`, and `#ranksIntro`.
- Sets `#ranksHeroImage` from `hero.image` when a non-empty value is present.
- Sets the hero image alt text to `Ranks and progression banner artwork`.
- Reads `hero.atmosphereImage` and assigns it to `#ranksAtmosphere` if the element exists.
- Renders `hero.pills` into `#ranksHeroPills` as spans, not links.
- Clears `#ranksError` on success.

Progression rendering:

- Sets `#progressionTitle`.
- Renders `progression.pills` into `#progressionPills` as spans, not links.
- Renders `progression.body` into `#progressionBody` as paragraphs.

Senior Leadership rendering:

- Sets `#seniorTitle`, `#seniorDesc`, and `#seniorNote`.
- Sets `#seniorImage` from `tiers.senior.image` when a non-empty value is present.
- Sets the senior image alt text to `Senior Leadership artwork`.
- Renders `tiers.senior.ranks` into `#seniorRanks`.

Middle Leadership rendering:

- Sets `#middleTitle`, `#middleDesc`, and `#middleNote`.
- Sets `#middleImage` from `tiers.middle.image` when a non-empty value is present.
- Sets the middle image alt text to `Middle Leadership artwork`.
- Renders `tiers.middle.pills` into `#middlePills` as spans, not links.
- Renders `tiers.middle.ranks` into `#middleRanks`.

Members rendering:

- Sets `#membersTitle`, `#membersDesc`, and `#membersNote`.
- Sets `#membersImage` from `tiers.members.image` when a non-empty value is present.
- Sets the members image alt text to `Members artwork`.
- Renders `tiers.members.pills` into `#membersPills` as spans, not links.
- Renders `tiers.members.ranks` into `#membersRanks`.

Rank cards:

- Each rank renders as a `div` with `glass-card glass-card--soft glass-pad`.
- Each rank card contains an `h3` with the rank name and a `prose-stack` body.
- Rank card copy renders with `textContent`, not inline HTML or Markdown.
- The renderer applies inline margin and box-shadow overrides inside generated rank cards.

Links:

- Ranks JSON does not currently render links.
- The only page-local content link is the static `Return to Home` link in `ranks.html`.
- Header and footer links are mounted by `site.js`, not `ranks.js`.

Error and fallback behavior:

- If `data/ranks.json` fails to load or parse, `ranks.js` logs the error and reveals `#ranksError` with `Ranks content failed to load: ...`.
- Empty paragraph arrays render a muted `—` paragraph.
- Empty rank arrays render a muted `—` paragraph in the rank wrapper.
- Empty pill arrays render no pills.
- Missing tier objects still leave the hardcoded section placeholders in place, with fallback titles and empty descriptions.

Renderer limits:

- Pill rows are capped at 10 rendered items.
- Rank arrays are not capped.
- The renderer only knows the hardcoded `senior`, `middle`, and `members` tier keys.

## 4. Ordering and Hierarchy

Current tier order in `data/ranks.json` and `ranks.html`:

1. `senior` - Senior Leadership
2. `middle` - Middle Leadership
3. `members` - Members

Current rank order:

- Senior Leadership: Guild Leader, Vice Leader, Hall Leader
- Middle Leadership: Dharmapala, Lotus Warden, Petal Keeper
- Members: Mochi Blossom, Young Bamboo, Softwind, Rice Sprout

Ordering behavior:

- Tier display order is controlled by the fixed section order in `ranks.html` and the fixed renderer calls in `ranks.js`.
- The current JSON object order also matches the displayed tier order.
- Rank order is controlled by each `ranks` array order.
- There are no explicit sort fields, numeric order fields, priority fields, or automatic sorting.
- Additional tier keys under `tiers` are ignored unless `ranks.html` and `ranks.js` are changed.

Current grouping conventions:

- `senior` is the senior leadership group.
- `middle` is the middle leadership group.
- `members` is the member progression group.
- The current implementation documents leadership and member grouping, but it does not enforce hierarchy beyond section order and array order.

## 5. Shared Utility Dependencies

`ranks.js` depends on `window.MochiriiUtils.fetchJson()` from `utils.js`, so `utils.js` must load before `ranks.js`.

Helpers used directly from `utils.js`:

- `fetchJson`

Helpers not used directly by Ranks:

- `asArray`
- `clearElement`
- `escapeHtml`
- `formatDateUTC`
- `isExternalHttpUrl`
- `normalizeTags`
- `resolveElement`
- `setImg`
- `setText`
- `text`
- `toSpotifyEmbedSrc`

Local helper behavior in `ranks.js`:

- `safeText()` trims values and supplies fallbacks.
- `safeArr()` accepts arrays and treats other values as empty arrays.
- `clear()` empties render targets before rendering.
- `setImg()` assigns `src` only when a non-empty value exists and assigns `alt` when a string is supplied.
- `setNodeText()` sets text on an element or selector without throwing if the element is missing.
- `pillSpan()` creates text-only pill spans.
- `renderPills()`, `renderParagraphs()`, and `renderRanks()` build page content with DOM APIs.

Sanitization and text safety:

- Ranks copy renders through `textContent`.
- Link labels are not data-rendered on the Ranks page.
- The current renderer does not support inline HTML or Markdown in Ranks JSON.

`site.js` dependencies:

- `site.js` mounts `header.html` and `footer.html`.
- `site.js` sets the active nav key to `ranks` for `ranks.html`.
- `site.js` owns shared dropdown, mobile menu, focus trap, header scroll state, footer year, and shared lightbox behavior.
- Ranks has no page-specific modal, filter, sort, keyboard trap, or lightbox trigger.

## 6. Link and Asset Behavior

Internal links:

- `ranks.html` has a static `Return to Home` link to `./index.html`.
- Shared header and footer navigation include links to `./ranks.html`.
- Home, Join, and Codex currently link to `./ranks.html` from other page data or markup.

External links:

- Ranks JSON does not currently include external links.
- `ranks.html` does not include a page-local external link.
- Shared header/footer Discord links are outside the Ranks renderer.

Image and asset paths:

- Hero image: `./assets/img/ranks/hero.webp`
- Senior image: `./assets/img/ranks/senior.webp`
- Middle image: `./assets/img/ranks/middle.webp`
- Members image: `./assets/img/ranks/members.webp`
- Unreferenced Ranks asset found: `./assets/img/ranks/ladder.webp`

Alt text behavior:

- Ranks image alt text is set in `ranks.js`, not read from JSON.
- Hero alt text becomes `Ranks and progression banner artwork`.
- Senior alt text becomes `Senior Leadership artwork`.
- Middle alt text becomes `Middle Leadership artwork`.
- Members alt text becomes `Members artwork`.
- `#ranksAtmosphere` has empty alt text and `aria-hidden="true"` in HTML.

Missing or fallback image behavior:

- HTML includes static fallback `src` values for the hero and tier images.
- `ranks.js` only changes an image `src` when the JSON value is non-empty.
- There is no error handler, placeholder swap, or missing-image fallback beyond the existing static HTML source.

Unsupported link and image fields:

- Per-rank links are not supported.
- Tier links are not supported.
- Data-driven link labels are not supported.
- External link safety logic is not used by Ranks because Ranks JSON does not render links.
- Per-rank images, icons, emblems, and alt text are not supported.
- Data-driven alt text is not supported.

## 7. Accessibility / Structure

Heading structure:

- `ranks.html` uses one `h1` in the hero.
- Progression, Senior Leadership, Middle Leadership, and Members use `h2` headings.
- Side-panel image headings use static `h3` headings.
- Rendered rank cards use `h3` headings for rank names.

Structure and semantics:

- Main content is wrapped in `<main id="main">`.
- The shared header includes a skip link to `#main`.
- Rank groups render as sections and grid columns, but rank cards are `div` elements rather than list items.
- Pill rows use `span` elements inside labeled containers.
- `#ranksError` uses `role="status"` and `aria-live="polite"`.

Image alt text expectations:

- Current public images have fixed descriptive alt text set by HTML and JavaScript.
- The atmosphere image is hidden from assistive technology with empty `alt` and `aria-hidden="true"`.
- JSON cannot currently supply image alt text.

Focus behavior:

- The page-local interactive element is the static `Return to Home` link.
- Shared header/footer links and buttons use shared focus behavior from `site.js` and `styles.css`.
- Ranks has no page-specific buttons, filters, cards-as-links, or keyboard interactions.

Mobile readability and touch targets:

- Ranks uses shared `.grid-12`, `.col-8`, and `.col-4` layout rules; columns collapse to full width below 980px.
- Hero, card, badge, prose, and footer-link styles are shared site styles.
- The static `Return to Home` link uses `.footer-link`, which has a `min-height` of 44px.
- Rank cards should remain readable on small widths because they use shared card padding and prose stack rules.

Screen reader considerations:

- Keep one clear `h1` and preserve section heading order.
- Because ranks are not list items, rank order is communicated by visual/source order and headings.
- Keep rank names concise so `h3` navigation remains useful.
- Keep `#ranksError` available for JSON load failures.

## 8. Unsupported / Not Present

The current Ranks implementation does not support:

- Additional tier groups beyond `senior`, `middle`, and `members`.
- Automatic sorting or explicit sort/order fields.
- Per-rank IDs, slugs, URLs, anchors, links, CTAs, icons, emblems, images, or alt text.
- Data-driven tier links.
- Data-driven image alt text.
- Data-driven side-panel heading text.
- Rendering `tiers.senior.pills`.
- Rank prerequisites, permissions, levels, point values, badges, Discord role IDs, or game role mappings.
- Filters, tabs, accordions, expand/collapse behavior, or URL query state.
- Markdown or HTML in JSON copy.
- External-link handling in Ranks JSON.
- Dedicated empty states beyond the muted `—` fallback.
- A page-specific lightbox, modal, or keyboard shortcut.
- Validation of duplicate rank names inside the renderer.
- Enforcement of rank hierarchy beyond fixed section order and array order.
