# Leaders Implementation Inventory

## 1. Files Inspected

- `data/leaders.json`
- `leaders.html`
- `leaders.js`
- `utils.js`
- `site.js`
- `styles.css`
- `docs/content-guide.md`
- `AGENTS.md`
- `README.md`
- `reports/`
- `header.html`
- `footer.html`
- `twills.html`
- `assets/img/leaders/`

## 2. Current Data Shape

`data/leaders.json` has these top-level keys:

- `hero`
- `panel`
- `council`
- `leaders`
- `responsibilities`

Current nested shapes:

- `hero`: `kicker`, `title`, `image`, `introBody`, `pills`
- `panel`: `title`, `badge`, `image`, `body`, `note`
- `council`: `title`, `description`
- `leaders`: array of leader objects
- `responsibilities`: `title`, `description`, `items`
- `responsibilities.items`: array of responsibility objects

Current leader object fields:

- `role`
- `name`
- `availability`
- `image`
- `alt`
- `summary`
- `profileHref` on the Twills entry only
- `profileLabel` on the Twills entry only

Current responsibility item fields:

- `title`
- `description`
- `image`
- `alt`

Fields required by current renderer behavior:

- No individual field is strictly required for the renderer to avoid throwing, because `leaders.js` uses local fallback helpers and empty-state rendering.
- `leaders` must be an array to render leader cards. Missing or non-array `leaders` data renders a single `—` empty-state card.
- `responsibilities.items` must be an array to render responsibility cards. Missing or non-array items leave the responsibilities grid empty.

Fields used as optional with fallbacks:

- `hero.kicker` falls back to `Leaders`.
- `hero.title` falls back to `Leaders Hall`.
- `hero.image` updates the existing hero image only when non-empty; the HTML source remains the fallback.
- `hero.introBody` renders paragraphs; empty or missing arrays render `—`.
- `hero.pills` renders up to 10 text pills.
- `hero.atmosphereImage` is read by `leaders.js`, but it is not present in the current JSON. The matching image is hidden by CSS and marked `aria-hidden="true"`.
- `panel.title` falls back to `Guild Leadership`.
- `panel.badge` falls back to `Contact & Profiles`.
- `panel.image` updates the existing panel image only when non-empty; the HTML source remains the fallback.
- `panel.body` renders paragraphs; empty or missing arrays render `—`.
- `panel.note` falls back to an empty string.
- `council.title` falls back to `The Council`.
- `council.description` falls back to an empty string.
- `leaders[].role` renders as a role pill and falls back to `Role`.
- `leaders[].name` renders as the leader card heading and falls back to `Leader`.
- `leaders[].availability` renders as small metadata text and falls back to an empty string.
- `leaders[].image` falls back to `./assets/img/leaders/leader-silhouette.webp`.
- `leaders[].alt` falls back to `<role> portrait`, with `Leader portrait` as the role fallback.
- `leaders[].summary` falls back to an empty string.
- `leaders[].profileHref` is optional; a profile link renders only when it is non-empty.
- `leaders[].profileLabel` is used only when `profileHref` is present and falls back to `Open profile`.
- `responsibilities.title` falls back to `Responsibilities`.
- `responsibilities.description` falls back to an empty string.
- `responsibilities.items[].title` falls back to `Responsibility`.
- `responsibilities.items[].description` falls back to an empty string.
- `responsibilities.items[].alt` falls back to `Responsibilities visual panel`.

Image, avatar, and emblem fields present:

- `hero.image`
- `panel.image`
- `leaders[].image`
- `leaders[].alt`
- `responsibilities.items[].image`
- `responsibilities.items[].alt`

Role and group fields present:

- `council.title` and `council.description` define the single current roster section.
- `leaders[].role` defines each card's displayed role label.
- No explicit group, tier, sort, priority, or hierarchy fields are present.

Contact and link fields present:

- `leaders[].profileHref`
- `leaders[].profileLabel`

Fields that are present but not rendered:

- No fields currently present in `data/leaders.json` are ignored by `leaders.js`.

Observed extra Leaders asset:

- `assets/img/leaders/twills.webp` exists but is not referenced by `data/leaders.json`, `leaders.html`, `leaders.js`, or `twills.html`.

## 3. Rendering Behavior

`leaders.js` runs only when `body[data-page="leaders"]` is present.

Data loading:

- Fetches `./data/leaders.json` through `window.MochiriiUtils.fetchJson()`.
- Clears `#leadersError` after successful load.
- Logs load/render errors to the console and reveals `#leadersError` with `Leaders content failed to load: ...` on failure.

Hero rendering:

- Sets `#leadersKicker` from `hero.kicker`.
- Sets `#leadersHeading` from `hero.title`.
- Sets `#leadersHeroImage` from `hero.image` when non-empty.
- Sets the hero image alt text to `Leaders Hall banner artwork`.
- Reads `hero.atmosphereImage` and assigns it to `#leadersAtmosphere` if the element exists.
- Renders `hero.introBody` as paragraphs.
- Renders `hero.pills` as text-only spans, not links.

Panel rendering:

- Sets `#leadersPanelTitle` from `panel.title`.
- Sets `#leadersPanelBadge` from `panel.badge`.
- Sets `#leadersPanelImage` from `panel.image` when non-empty.
- Sets the panel image alt text to `Leadership hall artwork`.
- Renders `panel.body` as paragraphs.
- Sets `#leadersPanelNote` from `panel.note`.

Council and leader card rendering:

- Sets `#leadersGridTitle` from `council.title`.
- Sets `#leadersGridDesc` from `council.description`.
- Clears `#leadersGrid`.
- Renders up to 12 entries from `leaders`.
- Empty or missing `leaders` data renders one soft card containing `—`.
- Each leader renders as a `div.col-4` containing an `article.glass-card.glass-card--soft`.
- Each leader card uses an inline `3 / 4` media aspect ratio, absolute-positioned image, scrim, and glass text plate.
- Each leader card renders role, availability, name, summary, and optional profile link.
- Role labels are pills rendered as spans, not links.
- The leader name renders as an `h3`.
- A `profileHref` renders an `a.footer-link`; if the field is missing or empty, no profile link is rendered.

Responsibilities rendering:

- Sets `#respTitle` from `responsibilities.title`.
- Sets `#respDesc` from `responsibilities.description`.
- Clears `#respGrid`.
- Renders up to 6 entries from `responsibilities.items`.
- Each responsibility renders as a `div.col-4` containing an `article.glass-card.glass-card--soft`.
- Each responsibility card uses an inline `16 / 10` media aspect ratio, image, scrim, and glass text plate.
- Each responsibility card renders title as an `h3` and description as text.
- Missing or empty responsibility items do not render an explicit empty-state card.

Renderer limits:

- Hero pills are capped at 10.
- Leader cards are capped at 12.
- Responsibility cards are capped at 6.
- Rank, role, profile, or contact behavior beyond these current fields is not implemented.

## 4. Ordering and Hierarchy

Current page section order:

1. Hero
2. Guild Leadership panel
3. The Council
4. Responsibilities

Current leader order:

1. Twills - Leader
2. Vice Leader - Vice Leader
3. Hall Leader - Hall Leader
4. Isawisima - Dharmapala
5. Sinbell - Lotus Warden
6. Meenari - Petal Keeper

Current responsibility order:

1. Direction & strategy
2. Ops & coordination
3. Culture & people

Ordering behavior:

- Page section order is controlled by `leaders.html`.
- Leader display order is controlled by the order of objects in the `leaders` array, after the fixed `.slice(0, 12)` limit.
- Responsibility display order is controlled by the order of objects in `responsibilities.items`, after the fixed `.slice(0, 6)` limit.
- There are no explicit sort fields, numeric order fields, priority fields, or automatic sorting.
- There is one current roster group, `The Council`; additional leadership groups are not rendered without HTML and JS changes.

Leadership grouping conventions:

- `panel.note` describes escalation from hall leader to vice leader to guild leader.
- The roster itself does not enforce hierarchy beyond the rendered section order and `leaders` array order.
- Role meaning comes from `leaders[].role`, `leaders[].availability`, and `leaders[].summary`.

## 5. Shared Utility Dependencies

`leaders.js` depends on:

- `window.MochiriiUtils.fetchJson()` from `utils.js`.

`leaders.js` does not use these exported helpers directly:

- `MochiriiUtils.text`
- `MochiriiUtils.setText`
- `MochiriiUtils.setImg`
- `MochiriiUtils.escapeHtml`
- `MochiriiUtils.isExternalHttpUrl`

Local helper behavior in `leaders.js`:

- `safeText()` trims values and applies fallbacks.
- `safeArr()` accepts arrays and otherwise returns an empty array.
- `setNodeText()` writes with `textContent`.
- `renderParagraphs()` writes paragraphs with `textContent`.
- `renderPills()` writes span labels with `textContent`.
- `setImg()` updates image `src` only when the supplied value is non-empty.

Text escaping and sanitization:

- Leaders copy, names, roles, availability text, and summaries are inserted with `textContent`.
- Inline HTML and Markdown in JSON are not rendered as markup.

Image helpers:

- Leaders uses local `setImg()` for hero and panel images.
- Leader and responsibility cards set image properties directly in `leaders.js`.

Safe link helpers:

- Leaders does not use a shared safe-link helper.
- `profileHref` is assigned directly to an anchor `href`.
- Existing data uses a relative internal link.

`site.js` dependency:

- `site.js` mounts the shared header and footer.
- `site.js` maps `leaders.html` to the `leaders` active navigation key.
- `site.js` owns shared dropdown navigation, mobile menu behavior, focus trapping inside the mobile menu, footer year, and shared lightbox behavior.

`supabase.js` dependency:

- `leaders.html` loads `supabase.js` before `site.js` and `leaders.js`.
- `leaders.js` does not reference `window.MochiriiSupabase` or otherwise depend on Supabase.

## 6. Link and Asset Behavior

Page-local links:

- `leaders[].profileHref` can render a profile link inside a leader card.
- The current data has one profile link: `./twills.html` for Twills.
- `leaders.html` has a static `Return to Home` link to `./index.html`.

Shared links:

- Shared header and footer navigation include links to `./leaders.html`.
- Home and Join data currently include links to `./leaders.html`.

External links:

- The current Leaders page data does not include page-local external links.
- If an external URL were placed in `profileHref`, `leaders.js` would assign it directly and would not add `target="_blank"` or `rel="noopener noreferrer"`.

Current Leaders asset paths:

- `./assets/img/leaders/hero.webp`
- `./assets/img/leaders/panel.webp`
- `./assets/img/leaders/leader.webp`
- `./assets/img/leaders/leader-silhouette.webp`
- `./assets/img/leaders/dharmapala.webp`
- `./assets/img/leaders/lotus_warden.webp`
- `./assets/img/leaders/petal_keeper.webp`
- `./assets/img/leaders/responsibilities-01.webp`
- `./assets/img/leaders/responsibilities-02.webp`
- `./assets/img/leaders/responsibilities-03.webp`

Current alt text behavior:

- Hero alt text is fixed by `leaders.js` as `Leaders Hall banner artwork`.
- Panel image alt text is fixed by `leaders.js` as `Leadership hall artwork`.
- Leader card alt text comes from `leaders[].alt`, with a fallback of `<role> portrait`.
- Responsibility card alt text comes from `responsibilities.items[].alt`, with a fallback of `Responsibilities visual panel`.
- The atmosphere image has empty alt text and `aria-hidden="true"` in HTML.

Missing and fallback image behavior:

- Empty `hero.image` leaves the static HTML hero image in place.
- Empty `panel.image` leaves the static HTML panel image in place.
- Empty `leaders[].image` falls back to `./assets/img/leaders/leader-silhouette.webp`.
- Current responsibility items all include image paths. There is no explicit missing-image placeholder for responsibility cards.
- There is no image load-error handler.

Unsupported link and image fields:

- Hero and panel data-driven alt text fields are not supported.
- Multiple profile links per leader are not supported.
- Contact methods beyond `profileHref` and `profileLabel` are not supported.
- External-link safety behavior is not added by the Leaders renderer.

## 7. Accessibility / Structure

Heading structure:

- `leaders.html` uses one `h1` in the hero.
- Guild Leadership, The Council, and Responsibilities use `h2` headings.
- The panel side title uses a static `h3`.
- Rendered leader names use `h3` headings.
- Rendered responsibility titles use `h3` headings.

Structure and semantics:

- Main content is wrapped in `<main id="main">`.
- The shared header includes a skip link to `#main`.
- The leader roster grid has `aria-label="Leadership roster"`.
- The responsibilities grid has `aria-label="Leadership responsibilities"`.
- Leader and responsibility cards render as `article` elements inside grid columns.
- Cards are not rendered as list items.
- Pill labels use `span` elements.
- `#leadersError` uses `role="status"` and `aria-live="polite"`.

Image alt text expectations:

- Current public images have alt text from fixed renderer strings or JSON fields.
- The atmosphere image is hidden from assistive technology with empty `alt` and `aria-hidden="true"`.
- JSON can provide alt text for leader and responsibility card images.
- JSON cannot currently provide alt text for hero or panel images.

Focus behavior:

- Page-local interactive elements are the optional profile link and the static `Return to Home` link.
- Shared header/footer links and buttons use shared focus behavior from `site.js` and `styles.css`.
- Leaders has no page-specific buttons, filters, accordions, or keyboard interactions.

Mobile readability and touch targets:

- Leaders uses shared `.grid-12`, `.col-8`, and `.col-4` layout rules; columns collapse to full width below 980px.
- The council intro has page-scoped CSS under `body[data-page="leaders"] .leaders-council-intro`.
- Leader and responsibility cards use inline aspect ratios and overlay text plates.
- Profile and return links use `.footer-link`, which has a `min-height` of 44px.

Screen reader considerations:

- Keep the single `h1` and section heading order clear.
- Because cards are not list items, leader order is communicated by source order, section structure, and headings.
- Keep leader names concise so heading navigation remains useful.
- Keep image alt text descriptive and avoid repeating surrounding visible text too heavily.
- Keep `#leadersError` available for JSON load failures.

## 8. Unsupported / Not Present

The current Leaders implementation does not support:

- Multiple leadership roster groups.
- Automatic sorting or explicit sort/order fields.
- More than 12 rendered leader cards.
- More than 6 rendered responsibility cards.
- Leader groups, teams, halls, IDs, slugs, anchors, Discord role IDs, or permission fields.
- Contact fields such as Discord handles, email, social URLs, availability schedules, or multiple links.
- External-link safety handling in `leaders.js`.
- Data-driven hero or panel alt text.
- Per-leader body paragraphs, quote fields, badges beyond `role`, or secondary images.
- Filters, tabs, accordions, URL query state, or interactive leader cards.
- Inline HTML or Markdown in JSON copy.
- Image load-error replacement beyond existing static/fallback sources.
