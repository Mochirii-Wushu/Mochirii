# Codex Maintenance Guide

## 1. Purpose

The Codex page is for guild values, conduct, customs, shared expectations, and Mōchirīī identity principles.

Codex should not duplicate:

- Join onboarding
- Recruitment philosophy
- Events scheduling
- Announcements
- Gallery memories
- Leaders contact details

Keep this page focused on rule, custom, conduct, balance, respect, practice, and the line we keep together.

## 2. Data Source

- Codex data lives in `data/codex.json`.
- Keep JSON valid.
- Preserve the current schema unless `codex.js` changes in the same scoped task.
- Add only fields that `codex.js` actually supports.
- Keep values and rules concise.
- Use page-specific Codex vocabulary: rule, custom, conduct, balance, respect, practice, and line.

Current data shape:

- `hero`: `kicker`, `title`, `image`, `introBody`, `pills`
- `intro`: `badge`, `title`, `image`, `body`
- `tenets`: `title`, `description`, `image`, `captionTitle`, `caption`, `pills`, `note`, `items`
- `etiquette`: `badge`, `title`, `description`, `image`, `blocks`, `note`
- `rhythm`: `title`, `description`, `image`, `captionTitle`, `caption`, `pills`, `note`, `items`
- `recognition`: `title`, `description`, `image`, `items`, `ranksHref`

Current item shapes:

- `tenets.items[]`: `title`, `description`
- `etiquette.blocks[]`: `title`, `items`
- `etiquette.blocks[].items[]`: plain strings
- `rhythm.items[]`: `title`, `description`
- `recognition.items[]`: `title`, `description`

Renderer limits:

- Pills render up to 12 items.
- Section cards render up to 12 items.
- Etiquette blocks render up to 6 blocks.
- Etiquette block list items render up to 10 items.

## 3. Protected Verse / Protected Content Boundaries

Protected content:

- `data/home.json` `seal.verse` is protected and must not be altered.
- `data/recruitment.json` `content.paragraphs` is protected and must not be altered.
- `data/recruitment.json` `content.conclusion` is protected and must not be altered.

The current Codex implementation does not host or render the protected guild seal poem. The protected seal poem is in `data/home.json` `seal.verse`.

Do not change protected verse wording, punctuation, line breaks, spelling, capitalization, diacritics, order, or placement.

## 4. Tone Rules

- Codex should stay clear and direct.
- Serious rules should not become overly poetic.
- Xianxia tone may appear lightly through practice, conduct, balance, hall, path, and care.
- Cupcake language should be sparse and avoided in serious conduct guidance.
- Avoid generic AI-like language.
- Avoid forced rhyme.
- Avoid "Where Winds Meet" in visible Codex body copy.

## 5. Values and Rules

Current values/rules structure:

- `tenets.items` hold value cards.
- `etiquette.blocks` hold conduct/custom sections with lists.
- `rhythm.items` explain participation rhythm.
- `recognition.items` explain what the guild notices and thanks.

Safe editing rules:

- Keep each title short.
- Keep descriptions concise enough for cards.
- Keep etiquette list items direct and readable.
- Avoid duplicate rules.
- Avoid contradictions with Join, Recruitment, Events, or Leaders pages.
- Preserve the current array/object shapes unless `codex.js` is updated in the same scoped task.
- Keep serious conduct language plain before adding tone.

## 6. Links and Unsupported Fields

Current link behavior:

- `recognition.ranksHref` controls the `View Ranks` link destination.
- If `recognition.ranksHref` is missing, the link falls back to `./ranks.html`.
- `Return to Home` is a static link in `codex.html`.
- The visible label for the recognition link is not data-driven; it remains `View Ranks`.

Unsupported fields:

- Per-card links are not currently supported.
- External Codex data links are not currently supported.
- Data-driven link labels are not currently supported.
- Categories, tags, filters, buttons, and URL state are not currently supported.
- `hero.atmosphere` is not currently supported by `codex.js`, even though `codex.html` includes a static atmosphere image placeholder.

Internal links must resolve. External links, if support is added later, should follow existing safe-link conventions with `target="_blank"` and `rel="noopener noreferrer"`.

Unsupported link fields should not be added without renderer changes and validation.

## 7. Accessibility

- Keep the page to one `h1`.
- Use `h2` for major Codex sections.
- Use `h3` for rendered cards and list blocks.
- Keep card text readable on mobile.
- Preserve visible focus states for `View Ranks`, `Return to Home`, and shared header/footer links.
- Avoid horizontal overflow at mobile widths.
- Rules should remain readable by screen readers.
- Keep `#codexError` available as a polite status message for load failures.

## 8. Validation

Run:

```sh
npm run check
git diff --check
node scripts/check-json.mjs
node scripts/check-js.mjs
node scripts/check-refs.mjs
node scripts/check-assets.mjs
npm run check:production
```

Use `npm run smoke:gallery` as a general regression check when relevant to the repo baseline.

## 9. Manual Codex Smoke Checklist

- Open `/codex.html`.
- Confirm heading structure is sensible.
- Confirm hero, intro, tenets, etiquette, rhythm, and recognition content render.
- Confirm no missing content.
- Confirm links work.
- Check mobile widths at 360px, 390px, and 768px for horizontal overflow.
- Confirm text remains readable.
- Confirm there are no console-breaking errors.
- Confirm protected poem/verse remains unchanged.
- Confirm protected recruitment body remains unchanged.

## 10. Protected Content

Codex work must not alter:

- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`
- `data/home.json` `seal.verse`
- any Codex-hosted protected verse documented in this guide
