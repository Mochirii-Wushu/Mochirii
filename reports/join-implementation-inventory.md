# Join Implementation Inventory

## 1. Files Inspected

- `data/join.json`
- `join.html`
- `join.js`
- `utils.js`
- `site.js`
- `styles.css`
- `docs/content-guide.md`
- `AGENTS.md`
- `README.md`
- `reports/`

## 2. Current Data Shape

`data/join.json` has these top-level keys:

- `hero`
- `steps`
- `quickStart`
- `checklist`
- `culture`
- `notes`

Current nested shape:

- `hero`: `kicker`, `title`, `updated`, `timezone`, `intro`, `image`, `imageAlt`, `atmosphereImage`, `badges`
- `steps`: `title`, `intro`, `items`
- `quickStart`: `title`, `body`, `links`
- `checklist`: `eyebrow`, `title`, `intro`, `items`
- `culture`: `title`, `intro`, `cards`
- `notes`: `title`, `body`, `links`

Current arrays and item shapes:

- `hero.badges`: array of plain strings.
- `steps.intro`: array of paragraph strings.
- `steps.items[]`: objects with `number`, `title`, and `description`.
- `quickStart.body`: array of paragraph strings.
- `quickStart.links[]`: objects with `label` and `href`.
- `checklist.items[]`: objects with `title`, `text`, and optional `href` plus `label`.
- `culture.intro`: array of paragraph strings.
- `culture.cards[]`: objects with `title` and `description`.
- `notes.body`: array of paragraph strings.
- `notes.links[]`: objects with `label` and `href`.

Renderer-derived field behavior:

- Valid JSON is required for dynamic Join content.
- `hero.image` and `hero.imageAlt` update the hero image; the HTML has a static fallback image.
- `hero.atmosphereImage` is optional. If blank, `join.js` removes the `src` attribute from `#joinAtmosphere`.
- `hero.updated` is passed through `MochiriiUtils.formatDateUTC()` and rendered as `Updated Month Year`.
- `hero.timezone` renders as plain text.
- `hero.badges` render as non-link pill text.
- `steps.items[].number` falls back to the array index plus one.
- `steps.items[].title` falls back to `Step`.
- `quickStart.links[]` and `notes.links[]` render as badge-row links.
- `checklist.items[]` render as checklist cards; an item renders a link only when both `href` and `label` are present.
- Missing arrays generally render as empty after placeholders are cleared. There is no explicit empty state for missing steps, links, checklist items, culture cards, or notes.

## 3. Rendering Behavior

`join.js` runs only when `body[data-page="join"]` is present.

Hero rendering:

- Sets `#joinHeroImage`, `#joinAtmosphere`, `#joinKicker`, `#joinHeading`, `#joinUpdated`, `#joinTimezone`, `#joinIntro`, and `#joinBadges`.
- `#joinUpdated` renders a month/year label from `hero.updated`.
- `#joinBadges` renders badge text only; current hero badges do not include links.

Joining path rendering:

- Sets `#joinStepsTitle`.
- Renders `steps.intro` as paragraphs.
- Renders `steps.items` into the ordered list `#joinStepsList`.
- Each step list item contains a `strong` step title and an optional muted paragraph.

Quick start rendering:

- Sets `#joinQuickTitle`.
- Renders `quickStart.body` as paragraphs.
- Renders `quickStart.links` as badge-row links. Current links include Discord, Events, Guild Codex, and Ranks.

Newcomer checklist rendering:

- Sets `#joinChecklistEyebrow`, `#joinChecklistTitle`, and `#joinChecklistIntro`.
- Renders `checklist.items` into `#joinChecklistItems`.
- Each checklist item contains an aria-hidden numeric marker, an `h3` title, optional text, and an optional link.
- Current checklist links include Discord, Codex, and Events.
- Checklist items do not have interactive check-off behavior or persistence.

Culture rendering:

- Sets `#joinCultureTitle`.
- Renders `culture.intro` as paragraphs.
- Renders `culture.cards` as `div` blocks with `h3` titles and muted paragraphs.

Notes rendering:

- Sets `#joinFaqTitle`.
- Renders `notes.body` as paragraphs.
- Renders `notes.links` as badge-row links. Current links include Leaders Hall and Home.

Error/fallback behavior:

- If `data/join.json` fails to load or parse, `join.js` logs the error and reveals `#joinError` with `Unable to load join content.`
- On successful load, `#joinError` is restored to screen-reader-only text and cleared.
- Most text fields can render empty if missing; the page does not provide detailed empty states for missing section data.

## 4. Shared Utility Dependencies

`join.js` depends on `window.MochiriiUtils` from `utils.js`, so `utils.js` must load before `join.js`.

Helpers used directly:

- `text`
- `asArray`
- `setText`
- `setImg`
- `isExternalHttpUrl`
- `fetchJson`
- `formatDateUTC`

Helpers not used directly by Join:

- `escapeHtml`
- `clearElement`
- `normalizeTags`
- `toSpotifyEmbedSrc`

Sanitization and text safety:

- Join renders JSON copy through `textContent`, not `innerHTML`.
- Link labels are rendered through `textContent`.
- The renderer does not support inline HTML or Markdown in Join JSON.

Date helpers:

- Join uses `formatDateUTC()` only for `hero.updated`.
- No event dates, countdowns, or schedule classification are implemented on the Join page.

`site.js` dependencies:

- `site.js` mounts `header.html` and `footer.html`.
- `site.js` sets active navigation using `body[data-page="join"]` through the current file-to-page-key logic.
- `site.js` owns shared dropdown, mobile menu, focus trap, header scroll state, footer year, and shared lightbox behavior.
- Join has no page-specific modal, filter, or keyboard trap.

## 5. Link Behavior

Discord behavior:

- Discord appears in `quickStart.links` and in the first checklist item.
- Discord URLs are external HTTP links, so `join.js` adds `target="_blank"` and `rel="noopener noreferrer"`.
- The shared header and footer also contain Discord join links outside Join data.

Internal links:

- Current Join data links point to Events, Codex, Ranks, Leaders, and Home.
- Internal links render without `target="_blank"`.
- Local links are validated by `node scripts/check-refs.mjs`.

External-link safety:

- `makeBadge()` and checklist links use `MochiriiUtils.isExternalHttpUrl()` to detect external HTTP(S) URLs.
- External Join data links receive `target="_blank"` and `rel="noopener noreferrer"`.

Unsupported link fields:

- Join JSON does not currently support link descriptions, icons, aria-label overrides, categories, button variants, or per-step links.
- Checklist links require both `href` and `label`.

## 6. Accessibility / Structure

- `join.html` uses one `h1` in the hero.
- The main joining path, newcomer checklist, and culture sections use `h2` headings.
- Quick Start and Notes side panels use `h3` headings.
- Rendered culture cards and checklist items use `h3` titles.
- Joining steps render in an ordered list.
- The newcomer checklist renders in an unordered list.
- Checklist numeric markers are `aria-hidden="true"` so screen readers read the real list structure instead of decorative numbers.
- `#joinError` uses `role="status"` and `aria-live="polite"`.
- `#joinCultureCards` and `#joinNotes` also carry `aria-live="polite"` in the HTML.
- Join has no page-specific buttons; interactive Join elements are links plus shared header/footer controls.
- Shared focus styles apply to header/footer links. Checklist links have a page-scoped hover/focus-visible style.
- Checklist cards collapse from five columns to three, two, then one column at smaller widths.
- Mobile readability depends on shared grid, card, badge-row, prose, and Join checklist CSS.

## 7. Unsupported / Not Present

The current Join implementation does not support:

- A form or application submission flow.
- Interactive checklist checkboxes, completion state, local storage, or persistence.
- URL query state.
- Join-specific filters, sorting, or categories.
- Per-step links.
- Link icons, descriptions, aria-label overrides, or variant styles from JSON.
- Markdown or HTML in JSON copy.
- Event data lookup or dynamic event previews.
- Discord API integration.
- User account/authentication behavior.
- Data-driven CTA labels outside the existing `label`/`href` link objects.
- Detailed empty states for missing arrays.

