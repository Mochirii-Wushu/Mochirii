# Recruitment Implementation Inventory

## 1. Files Inspected

- `data/recruitment.json`
- `recruitment.html`
- `recruitment.js`
- `utils.js`
- `site.js`
- `supabase.js`
- `styles.css`
- `assets/img/recruitment/hero.webp`
- `assets/img/recruitment/atmosphere.webp`
- `assets/audio/mochiriiiiii.mp3`
- `docs/content-guide.md`
- `AGENTS.md`
- `README.md`
- `reports/`

## 2. Current Data Shape

`data/recruitment.json` is a top-level object with four keys:

- `hero`
- `meta`
- `audio`
- `content`

`hero` currently contains:

- `image`: hero image path.
- `alt`: hero image alt text.
- `atmosphere`: atmosphere image path for `#recruitmentAtmosphere`.

`meta` currently contains:

- `kicker`: text rendered above the page heading.
- `heading`: page `h1` text.
- `author`: text rendered in the hero metadata row.
- `updated`: ISO-style date rendered as month and year.
- `intro`: hero intro paragraph.
- `badges`: array of text-only badge strings.

`audio` currently contains:

- `title`: audio card heading.
- `description`: audio card helper text.
- `sources`: array of audio source objects.

Current `audio.sources[]` objects contain:

- `src`: audio file path.
- `type`: audio MIME type.

`content` currently contains:

- `title`: body section heading.
- `paragraphs`: protected long-form recruitment body paragraph strings.
- `conclusion`: protected conclusion paragraph strings.

Required fields based on renderer behavior:

- No individual data field is strictly required for `recruitment.js` to avoid throwing after JSON loads. The renderer uses optional chaining, array normalization, and text fallbacks.
- `content.paragraphs` and `content.conclusion` are required for the intended long-form page content, even though missing arrays would render as empty content rather than throwing.
- `audio.sources[].src` is required for a `<source>` element to be created.

Optional fields based on renderer behavior:

- `hero.image`, `hero.alt`, and `hero.atmosphere` are optional from the script's perspective. If omitted, the static HTML hero image remains, and the hidden atmosphere image is not populated.
- `meta.kicker`, `meta.heading`, `meta.author`, `meta.updated`, `meta.intro`, and `meta.badges` are optional from the script's perspective.
- `audio.title`, `audio.description`, and `audio.sources` are optional from the script's perspective.
- `audio.sources[].type` is optional. If present, it becomes the `<source type>` and contributes to audio format badges.
- `content.title` is optional from the script's perspective.

Protected body/conclusion fields:

- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`

Badge/audio/media/link fields:

- `meta.badges` renders as text-only badge spans.
- `audio.sources` renders native `<source>` children under `#recruitmentAudio`.
- `audio.sources[].type` is used to create text-only audio format badges such as `Audio: mpeg`.
- There are no current page-local link fields in `data/recruitment.json`.

Fields present but not rendered:

- No current `data/recruitment.json` fields appear to be unused. Every current key is read by `recruitment.js`.

## 3. Protected Recruitment Text

The protected Recruitment text lives at:

- File: `data/recruitment.json`
- JSON key: `content.paragraphs`
- JSON key: `content.conclusion`

`recruitment.js` renders these fields by calling:

- `addProseBlocks($("#recruitmentBody"), safeArray(data?.content?.paragraphs))`
- `addProseBlocks($("#recruitmentConclusion"), safeArray(data?.content?.conclusion))`

`addProseBlocks()` creates one `<p>` element for each array item and assigns each string with `textContent`. Inline HTML and Markdown are not interpreted.

The protected body can be identified by its opening words, "Let's take a moment". The protected conclusion can be identified by its opening words, "Mōchirīī is meant".

Future Recruitment work must not edit `content.paragraphs` or `content.conclusion` unless the user explicitly approves that change. Punctuation, paragraph breaks, apostrophes, diacritics, capitalization, and wording must remain unchanged. Other non-body Recruitment fields may be revised in future work if needed, supported by `recruitment.js`, and intentionally scoped.

## 4. Rendering Behavior

`recruitment.js` is page-scoped:

- It exits unless `document.body.dataset.page` is `recruitment`.
- It loads `./data/recruitment.json` through `window.MochiriiUtils.fetchJson`.
- It starts on `DOMContentLoaded`.

Hero/header behavior:

- `meta.kicker` renders into `#recruitmentKicker`, with fallback `Recruitment`.
- `meta.heading` renders into `#recruitmentHeading`, with fallback `Recruitment Tips`.
- `meta.author` renders into `#recruitmentAuthor`, with an empty fallback.
- `meta.updated` renders into `#recruitmentUpdated` through `MochiriiUtils.formatDateUTC`, using month and year.
- `meta.intro` renders into `#recruitmentIntro`, with an empty fallback.
- `meta.badges` renders into `#recruitmentBadges` as text-only spans.
- `hero.image` updates `#recruitmentHeroImage` when present.
- `hero.alt` updates `#recruitmentHeroImage` alt text when present.
- `hero.atmosphere` updates `#recruitmentAtmosphere` when present. The atmosphere image remains hidden by shared CSS.

Protected body/conclusion behavior:

- `content.title` renders into `#recruitmentBodyTitle`, with fallback `Recruitment`.
- `content.paragraphs` renders into `#recruitmentBody` as paragraph text.
- `content.conclusion` renders into `#recruitmentConclusion` as paragraph text.

Audio/media behavior:

- `audio.title` renders into `#recruitmentAudioTitle`, with fallback `A Note`.
- `audio.description` renders into `#recruitmentAudioDesc`, with an empty fallback.
- `audio.sources` rebuilds the native audio element's `<source>` children.
- If at least one source is present, `recruitment.js` sets `controls="controls"` on `#recruitmentAudio`.
- If no sources are present, `recruitment.js` removes `controls`, clears audio badges, and updates the description to `Audio unavailable.` when no custom description exists.
- Audio format badges are derived from MIME type suffixes, such as `audio/mpeg` becoming `Audio: mpeg`.

CTA/link sections:

- The current Recruitment page has no page-local CTA section and no page-local content links.
- Shared header/footer links are mounted by `site.js`.

Cards/lists:

- The rendered layout has a hero intro card, an audio card, and a body card.
- Badges render as spans in `.badge-row`; no list elements are created for badges.

Empty/error/fallback behavior:

- If JSON loading or parsing fails, `recruitment.js` logs the error, reveals `#recruitmentError`, and sets its text to `Unable to load recruitment content.`
- On load failure, the static loading text already in `recruitment.html` remains in the body/audio areas.
- Missing arrays render as empty content because `safeArray()` converts non-arrays to `[]`.

Renderer limits:

- There is no explicit cap on `meta.badges`, `audio.sources`, `content.paragraphs`, or `content.conclusion`.
- There is no sorting, filtering, URL state, data-driven CTA behavior, or data-driven link rendering.

## 5. Page Purpose and Boundaries

The current Recruitment page presents:

- Recruitment philosophy.
- Guild growth and retention guidance.
- Member participation guidance.
- A long-form public recruitment note.
- A native audio version or companion note.

How it differs from Join:

- Join handles onboarding steps, checklist behavior, Discord/Codex/Events links, and conversion CTAs.
- Recruitment preserves longer recruiting philosophy and participation guidance.

How it differs from Codex:

- Codex defines conduct and guild rules.
- Recruitment explains why and how members can help the guild grow and retain people.

How it differs from Events:

- Events renders schedule data, filters, dates, and event cards.
- Recruitment has no event schedule, date filtering, event sorting, or event cards.

How it differs from Leaders:

- Leaders provides leadership roster and stewardship/contact structure.
- Recruitment does not render leader cards, profile links, or escalation/contact sections.

Recruitment should not duplicate the Join checklist, Codex rules in full, Events schedule details, Gallery memories, Leaders contact structure, Ranks hierarchy, or Twills profile body.

## 6. Shared Utility Dependencies

`utils.js`:

- `recruitment.js` directly depends on `window.MochiriiUtils.setText`.
- `recruitment.js` directly depends on `window.MochiriiUtils.asArray`.
- `recruitment.js` directly depends on `window.MochiriiUtils.fetchJson`.
- `recruitment.js` directly depends on `window.MochiriiUtils.formatDateUTC`.
- `recruitment.js` does not use `escapeHtml`, `isExternalHttpUrl`, `normalizeTags`, `setImg`, Spotify helpers, or safe-link helpers.

`site.js`:

- `recruitment.html` loads `site.js` after `utils.js` and `supabase.js`, before `recruitment.js`.
- `site.js` mounts the shared header and footer, sets active navigation for `recruitment`, initializes mobile navigation and dropdown behavior, sets the footer year, and initializes shared lightbox behavior when a lightbox root exists.

`supabase.js`:

- `recruitment.html` loads `supabase.js` before `site.js` and `recruitment.js`.
- `recruitment.js` does not read or call `window.MochiriiSupabase`.
- Recruitment data is static JSON, not Supabase-backed.

Text escaping/sanitization:

- Recruitment JSON text is assigned with `textContent`, so strings render as text rather than HTML.
- `recruitment.js` does not use `escapeHtml` because it does not build HTML from untrusted strings.

Media/audio helpers:

- Recruitment does not depend on a shared media/audio helper. Audio sources are rebuilt locally in `recruitment.js`.

Image helpers:

- Recruitment does not depend on shared image helpers. Hero image attributes are set directly in `recruitment.js`.

Safe link helpers:

- Recruitment has no page-local link renderer and does not depend on safe link helpers.

## 7. Link, Media, and Asset Behavior

Internal links:

- `recruitment.html` does not define page-local internal content links.
- Shared header/footer links come from the shared site shell.

External links:

- `recruitment.html` does not define page-local external content links.
- There are no Recruitment JSON link fields.

Discord/contact behavior:

- The current Recruitment page mentions Discord in supporting text, but there is no page-local Discord link renderer or contact field.
- Discord CTAs, when present site-wide, come from shared header/footer or other pages.

Audio/media paths:

- Current audio source path: `./assets/audio/mochiriiiiii.mp3`
- Current audio type: `audio/mpeg`
- The known asset warning is that `assets/audio/mochiriiiiii.mp3` is 3.31 MB, above the repository's asset warning threshold.

Image paths:

- Hero image: `./assets/img/recruitment/hero.webp`
- Atmosphere image: `./assets/img/recruitment/atmosphere.webp`

Alt text behavior:

- `hero.alt` updates the hero image alt text.
- `#recruitmentAtmosphere` has an empty alt attribute, `aria-hidden="true"`, and remains hidden by CSS.
- There are no additional rendered images on the current Recruitment page.

Missing/fallback media behavior:

- If `audio.sources` is missing or empty, `recruitment.js` removes audio controls and reports audio as unavailable through the description text.
- If an audio `src` is missing, that source object is skipped.
- There is no explicit fallback if an audio path points to a missing file.
- If `hero.image` or `hero.alt` is missing, the static HTML hero image and alt text remain in place.
- If `hero.atmosphere` is missing, the atmosphere image is not populated.

Unsupported link/media/image fields:

- Data-driven `links`, `cta`, `href`, `profileHref`, `button`, `cards`, `items`, `image.alt` outside `hero.alt`, and additional media galleries are not currently supported by `recruitment.js`.

## 8. Accessibility / Structure

Heading structure:

- The rendered page has one `h1` in `#recruitmentHeading`.
- The audio card heading is `h2#recruitmentAudioTitle`.
- The body section heading is `h2#recruitmentBodyTitle`.

Paragraph/body rendering structure:

- Protected body paragraphs render as real `<p>` elements inside `#recruitmentBody.prose-stack`.
- Protected conclusion paragraphs render as real `<p>` elements inside `#recruitmentConclusion.prose-stack`.
- Text is set with `textContent`.

Audio/media accessibility expectations:

- The native `<audio>` element exposes browser-provided controls when sources are present.
- Audio helper text renders next to the player in `#recruitmentAudioDesc`.
- Audio format badges are text-only spans in a badge row.

Link/button focus behavior:

- The Recruitment content area currently has no page-local links or buttons beyond native audio controls.
- Shared header/footer links and mobile navigation use the shared focus styles.
- Native browser focus behavior applies to the audio player controls.

Mobile readability expectations:

- Recruitment uses shared `.grid-12`, `.col-4`, and `.col-8` layout classes.
- Shared CSS collapses those columns to full width below `980px`.
- Long-form text uses `.prose-stack` with readable line-height and paragraph spacing.
- Badge rows wrap.

Touch-target expectations:

- Native audio controls are the primary page-local interactive target.
- Shared header/footer controls and links are responsible for other touch interaction.

Screen reader considerations:

- The page has a clear `h1` and section `h2` headings.
- `#recruitmentError` has `role="status"` and `aria-live="polite"`.
- Badge rows have descriptive `aria-label` values.
- The hidden atmosphere image is empty-alt and `aria-hidden="true"`.

## 9. Unsupported / Not Present

The current Recruitment implementation does not support:

- Data-driven CTA sections.
- Data-driven internal or external links.
- Discord invite/contact fields.
- Card lists or benefit/opening/fit sections.
- Event schedules, filters, or sorting.
- Leader profile links or leader cards.
- Markdown or inline HTML in JSON text.
- Data-driven audio transcripts.
- Audio duration or file-size metadata.
- Audio fallback files beyond whatever appears in `audio.sources`.
- Supabase-backed Recruitment data.
- Client-side editing, forms, authentication, or profile management.
- URL state, tabs, accordions, or gallery-style lightbox behavior.
