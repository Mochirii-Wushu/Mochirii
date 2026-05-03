# Twills Implementation Inventory

## 1. Files Inspected

- `data/twills.json`
- `twills.html`
- `twills.js`
- `utils.js`
- `site.js`
- `supabase.js`
- `styles.css`
- `assets/img/profiles/twills/avatar.webp`
- `assets/img/profiles/twills/hero.webp`
- `docs/content-guide.md`
- `AGENTS.md`
- `README.md`
- `reports/`

## 2. Current Data Shape

`data/twills.json` is a top-level object with two keys:

- `hero`
- `profile`

`hero` currently contains:

- `kicker`: text rendered above the profile name.
- `image`: hero image path.

`profile` currently contains:

- `name`: profile name rendered as the page `h1`.
- `timezone`: text rendered in the hero metadata row.
- `avatar`: profile avatar image path.
- `badges`: array of plain text badge strings.
- `cardTitle`: heading for the portrait card.
- `bioTitle`: heading for the bio section.
- `bio`: array of paragraph strings rendered as the Twills body text.

Current arrays:

- `profile.badges`: text-only strings. The renderer trims each value, removes empty values, and renders up to 10 badges.
- `profile.bio`: paragraph strings. The renderer trims each value, removes empty values, and renders each remaining value as a separate paragraph.

Required fields based on renderer behavior:

- No field is strictly required for the script to avoid throwing after JSON loads. `twills.js` has fallbacks for text headings and tolerates missing arrays.
- `profile.bio` is required for the intended page body. If it is missing, not an array, or contains only empty strings, the renderer displays a muted dash.

Optional fields based on renderer behavior:

- `hero.kicker`, `profile.name`, `profile.timezone`, `profile.cardTitle`, and `profile.bioTitle` are optional from the script's perspective because `twills.js` supplies fallbacks or an empty string.
- `hero.image` and `profile.avatar` are optional from the script's perspective. If either value is missing or empty, the matching static image already present in `twills.html` remains in place.
- `profile.badges` is optional. Non-array or empty values render no badges.

Image/avatar fields:

- `hero.image`: `./assets/img/profiles/twills/hero.webp`
- `profile.avatar`: `./assets/img/profiles/twills/avatar.webp`

Profile/contact fields:

- `profile.badges` currently contains public profile details as plain text, including leader status, email, Discord handle, and UID.
- These badge values are not parsed into structured contact fields and are not links.

Fields present but not rendered:

- No current `data/twills.json` fields appear to be unused. Every current key is read by `twills.js`.

## 3. Protected Twills Body Text

The protected Twills body text lives at:

- File: `data/twills.json`
- JSON key: `profile.bio`

`twills.js` renders this body text by calling:

- `renderBio($("#twillsBio"), data?.profile?.bio)`

`renderBio()` creates one `<p>` element for each non-empty string in `profile.bio` and assigns the text with `textContent`. Inline HTML and Markdown are not interpreted.

The body can be identified by its opening words, "Travel, conversation". The full `profile.bio` array is protected.

Future Twills work must not edit this body text unless the user explicitly approves that change. Wording, punctuation, paragraph breaks, diacritics, capitalization, and structure must remain unchanged. Other non-body Twills fields may be revised in future work if needed and intentionally scoped.

## 4. Rendering Behavior

`twills.js` is page-scoped:

- It exits unless `document.body.dataset.page` is `twills`.
- It loads `./data/twills.json` through `window.MochiriiUtils.fetchJson`.

Hero/header behavior:

- `hero.kicker` renders into `#twillsKicker`, with fallback `Profile`.
- `profile.name` renders into `#twillsName`, with fallback `Twills`.
- `profile.timezone` renders into `#twillsTimezone`, with an empty fallback.
- `hero.image` updates `#twillsHeroImage` when present.
- The hero image alt text is fixed by the renderer as `Twills profile banner artwork`.

Profile section behavior:

- `profile.cardTitle` renders into `#twillsCardTitle`, with fallback `Portrait`.
- `profile.avatar` updates `#twillsAvatar` when present.
- The avatar alt text is fixed by the renderer as `Twills profile picture`.
- `profile.bioTitle` renders into `#twillsBioTitle`, with fallback `Bio`.
- `profile.bio` renders into `#twillsBio` as paragraph text.

Badge/contact behavior:

- `profile.badges` renders into `#twillsBadges` as text-only `<span>` elements.
- Badge values are trimmed, empty values are skipped, and rendering is capped at 10 badges.
- The renderer does not create links for email, Discord, UID, or other badge-like text.

Empty/error/fallback behavior:

- If `profile.bio` has no non-empty strings, `twills.js` renders a muted dash in the bio section.
- If JSON loading or parsing fails, `twills.js` logs the error, reveals `#twillsError` with a status message, and renders `Unable to load profile.` in the bio section.
- `#twillsError` has `role="status"` and `aria-live="polite"` in `twills.html`.

Renderer limits:

- `profile.badges` is capped at 10 rendered items.
- `profile.bio` has no explicit item cap.
- There is no sorting, filtering, tab state, URL state, or data-driven link rendering.

## 5. Profile Purpose and Boundaries

The current Twills page is a single profile page. It presents:

- A named profile presence for Twills.
- A hero image and avatar.
- Plain text profile badges with public contact/signature details.
- Protected personal body text.

How it differs from Leaders:

- Leaders is a roster and stewardship/contact overview for multiple leaders.
- Twills is a single profile page for one person.
- Leaders links may point toward profile pages, but Twills does not reproduce the full Leaders roster or responsibility structure.

How it differs from Recruitment:

- Recruitment preserves the guild's longer philosophy and invitation body.
- Twills presents personal profile presence and a short bio, not recruitment philosophy.

How it differs from Join:

- Join handles onboarding, checklist behavior, and conversion CTAs.
- Twills does not contain onboarding steps, checklist state, or join-flow instructions.

The Twills page should not duplicate Codex rules, Events schedules, Gallery memories, Ranks hierarchy, the full Leaders roster, Join onboarding, or Recruitment philosophy.

## 6. Shared Utility Dependencies

`utils.js`:

- `twills.js` directly depends on `window.MochiriiUtils.fetchJson`.
- `twills.js` defines its own local `text`, `clear`, `setText`, and `setImg` helpers instead of calling the matching shared helpers.
- `twills.js` does not use `escapeHtml`, `isExternalHttpUrl`, `normalizeTags`, date helpers, Spotify helpers, or safe-link helpers.

`site.js`:

- `twills.html` loads `site.js` after `utils.js` and `supabase.js`, before `twills.js`.
- `site.js` mounts the shared header and footer, initializes mobile navigation and dropdown behavior, sets the footer year, and initializes shared lightbox behavior when a lightbox root exists.
- `site.js` does not have a special `twills` key in `pageKeyFromFile`; `twills.html` therefore falls back to the default active-nav behavior.

`supabase.js`:

- `twills.html` loads `supabase.js` before `site.js` and `twills.js`.
- `twills.js` does not read or call `window.MochiriiSupabase`.
- Local signed-out smoke testing found no Twills runtime errors caused by `supabase.js`.

Text escaping/sanitization:

- Twills text is assigned with `textContent`, so JSON strings render as text rather than HTML.
- The error fallback uses `innerHTML` only for the static string `<p class="muted">Unable to load profile.</p>`.

Image helpers:

- `twills.js` uses its own local `setImg`.
- There is no shared fallback-image or image-load-error helper used by Twills.

Safe link helpers:

- Twills has no page-local link renderer and does not depend on safe link helpers.

## 7. Link and Asset Behavior

Internal links:

- `twills.html` does not define page-local internal links in the Twills content area.
- Shared header/footer links come from the shared site shell.

External links:

- `twills.html` does not define page-local external links in the Twills content area.
- Email, Discord, and UID details are rendered as plain badge text, not anchors.

Discord/contact/UID behavior:

- Contact details currently live in `profile.badges` as plain strings.
- The renderer does not parse badge prefixes such as `Email:`, `Discord:`, or `UID:`.
- The renderer does not create `mailto:`, Discord, profile, or UID links.

Avatar/image paths:

- Hero image: `./assets/img/profiles/twills/hero.webp`
- Avatar image: `./assets/img/profiles/twills/avatar.webp`

Alt text behavior:

- Hero alt text is fixed in HTML and reset by `twills.js` to `Twills profile banner artwork`.
- Avatar alt text is fixed in HTML and reset by `twills.js` to `Twills profile picture`.
- There are no data-driven alt text fields in `data/twills.json`.

Missing/fallback image behavior:

- Static image paths are present in `twills.html`.
- If `hero.image` or `profile.avatar` is empty, the script leaves the existing static `src` in place.
- There is no image load-error fallback if an image path points to a missing file.

Unsupported link/image fields:

- Data-driven `href`, `label`, `alt`, `title`, `socials`, `email`, `discord`, and `uid` fields are not currently supported by `twills.js`.

## 8. Accessibility / Structure

Heading structure:

- The rendered page has one `h1` in `#twillsName`.
- The portrait card heading is `h2#twillsCardTitle`.
- The bio section heading is `h2#twillsBioTitle`.

Profile/card/list semantics:

- The portrait content is inside an `aside`.
- The bio content is inside a nested section in the main grid.
- Badges render as text spans inside `#twillsBadges` with `aria-label="Profile badges"`.
- Bio paragraphs render as real `<p>` elements.

Image alt text expectations:

- Hero and avatar images have fixed descriptive alt text.
- Future image changes should keep the alt text accurate because the current JSON has no alt fields.

Focus behavior:

- The Twills content area currently has no page-local links, buttons, forms, or custom controls.
- Keyboard focus behavior comes from shared header/footer links and mobile navigation.
- Global `:focus-visible` styling applies to focusable elements.

Mobile readability expectations:

- Twills uses shared `.grid-12`, `.col-4`, and `.col-8` layout classes.
- Shared CSS collapses those grid columns to full width below `980px`.
- Text is rendered in the shared `.prose-stack` rhythm.
- Badges use a wrapping `.badge-row`.

Touch-target expectations:

- The Twills content area has no page-local touch targets.
- Shared header/footer controls and links are responsible for touch interaction.

Screen reader considerations:

- The page has a clear `h1` and two `h2` sections.
- The error state is announced through `role="status"` and `aria-live="polite"`.
- Badge text is grouped by `aria-label`.
- The hidden `#twillsAtmosphere` image is empty, `aria-hidden="true"`, and visually suppressed by CSS.

## 9. Unsupported / Not Present

The current Twills implementation does not support:

- Multiple profiles.
- Profile sorting or filtering.
- Roster/group hierarchy.
- Data-driven profile links.
- Clickable email, Discord, UID, or social links.
- Data-driven image alt text.
- Image fallback assets for failed loads.
- Markdown or inline HTML in JSON body text.
- Structured contact fields such as `email`, `discord`, `uid`, or `socials`.
- Supabase-backed profile data.
- Client-side editing, forms, authentication, or profile management.
- URL state, tabs, accordions, lightbox integration, or gallery-style category behavior.
