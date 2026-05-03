# Codex Implementation Inventory

## 1. Files Inspected

- `data/codex.json`
- `codex.html`
- `codex.js`
- `styles.css`
- `utils.js`
- `docs/content-guide.md`
- `AGENTS.md`
- `README.md`
- `reports/`
- `data/home.json`
- `data/recruitment.json`

## 2. Current Data Shape

`data/codex.json` has these top-level keys:

- `hero`
- `intro`
- `tenets`
- `etiquette`
- `rhythm`
- `recognition`

Current nested shape:

- `hero`: `kicker`, `title`, `image`, `introBody`, `pills`
- `intro`: `badge`, `title`, `image`, `body`
- `tenets`: `title`, `description`, `image`, `captionTitle`, `caption`, `pills`, `note`, `items`
- `etiquette`: `badge`, `title`, `description`, `image`, `blocks`, `note`
- `rhythm`: `title`, `description`, `image`, `captionTitle`, `caption`, `pills`, `note`, `items`
- `recognition`: `title`, `description`, `image`, `items`, `ranksHref`

Current arrays:

- `hero.introBody`: array of paragraph strings.
- `hero.pills`: array of pill strings.
- `intro.body`: array of paragraph strings.
- `tenets.pills`: array of pill strings.
- `tenets.items`: array of objects with `title` and `description`; currently 6 items.
- `etiquette.blocks`: array of objects with `title` and `items`; currently 4 blocks.
- `etiquette.blocks[].items`: array of list-item strings; current blocks have 3-4 items.
- `rhythm.pills`: array of pill strings.
- `rhythm.items`: array of objects with `title` and `description`; currently 4 items.
- `recognition.items`: array of objects with `title` and `description`; currently 3 items.

Renderer-derived field behavior:

- Valid JSON is required for the page to render dynamic content.
- Most text fields have fallback text or fall back to an empty string.
- `hero.introBody` falls back to `hero.description`, then to `—`.
- Paragraph arrays render a muted fallback paragraph when no lines are available.
- Card arrays render no cards if missing or empty.
- `recognition.ranksHref` is optional and falls back to `./ranks.html`.
- Image fields are optional in JavaScript because the HTML carries static `src` values; if a JSON image path is present, `codex.js` assigns it.
- Pill arrays are optional and render no pills if missing or empty.

Renderer limits:

- Pills are capped at 12 per pill row.
- Section cards are capped at 12 items.
- Etiquette blocks are capped at 6 blocks.
- List items inside an etiquette block are capped at 10 items.

## 3. Rendering Behavior

`codex.js` runs only when `body[data-page="codex"]` is present.

Hero rendering:

- Sets `#codexKicker`, `#codexHeading`, `#codexHeroImage`, `#codexIntro`, and `#codexHeroPills`.
- The hero image alt text is set to `The Codex banner artwork`.
- `#codexAtmosphere` exists in `codex.html`, but `codex.js` does not currently set an atmosphere image.

Intro rendering:

- Sets `#introBadge`, `#introTitle`, `#introImage`, and `#introBody`.
- `intro.body` renders as paragraphs.

Tenets rendering:

- Sets title, description, image, caption title, caption, pills, cards, and note.
- `tenets.items` render as mini cards with `h3` titles and muted descriptions.

Etiquette rendering:

- Sets badge, title, description, image, blocks, and note.
- `etiquette.blocks` render as list cards.
- Block items render as plain list items.

Rhythm rendering:

- Sets title, description, image, caption title, caption, pills, cards, and note.
- `rhythm.items` render as mini cards.

Recognition rendering:

- Sets title, description, image, recognition cards, and the `#recLink` href.
- `recognition.items` render as mini cards.
- `recognition.ranksHref` is the only data-supported link field currently observed.

Static links:

- `#recLink` has fixed visible text `View Ranks`; only its `href` is data-driven.
- `Return to Home` is a static link in `codex.html`.

Error behavior:

- If `data/codex.json` fails to load or parse, `codex.js` logs the error and reveals `#codexError` with `Codex content failed to load: ...`.

Empty/fallback behavior:

- Paragraph groups have a fallback paragraph.
- Card grids and block grids do not have explicit empty states; they simply render empty.

## 4. Protected Content Search

Protected content documented for this repository:

- `data/home.json` `seal.verse`, lines 26-30, is protected.
- `data/recruitment.json` `content.paragraphs`, lines 33-39, is protected.
- `data/recruitment.json` `content.conclusion`, line 42, is protected.

Search findings:

- The protected guild seal poem was found only in `data/home.json` `seal.verse`.
- The protected recruitment body was found only in `data/recruitment.json` `content.paragraphs` and `content.conclusion`.
- No protected poem, verse, or recruitment body text was found in `data/codex.json`, `codex.html`, or `codex.js`.

## 5. Accessibility / Structure

- `codex.html` uses one `h1` in the hero.
- Major content sections use `h2` headings.
- Rendered mini cards and list blocks use `h3` headings.
- The page has no Codex-specific buttons.
- The current interactive elements are links: `View Ranks`, `Return to Home`, plus shared header/footer links.
- `#codexError` uses `role="status"` and `aria-live="polite"`.
- Pill rows have `aria-label` values where present in HTML.
- Mobile/readability behavior depends on shared grid, card, prose, image, badge, and footer-link CSS.

## 6. Unsupported / Not Present

The current Codex implementation does not support:

- Per-card link fields for tenets, rhythm, recognition, or etiquette items.
- External links in `data/codex.json`.
- Category, tag, or filter fields.
- URL query state.
- Buttons or interactive controls beyond links.
- A Codex-hosted protected poem or verse.
- A `hero.atmosphere` field, despite the static `#codexAtmosphere` placeholder in HTML.
- Explicit empty states for missing card/block arrays.
- Data-driven link labels for `recognition.ranksHref`; the visible label remains `View Ranks`.
