# Home and Site Shell Maintenance Guide

## 1. Purpose

Home/Shell covers the site's first impression, guild identity, entry paths to Join, Events, Gallery, Tome, Recruitment, Ranks, Leaders, and Twills/Profile, plus the shared header/footer/nav behavior, shared script load order, and public site foundation.

Home should route visitors onward without duplicating:

- Join onboarding in full.
- Recruitment long-form philosophy.
- Tome rules in full.
- Events schedule details.
- Gallery memory archive.
- Ranks hierarchy.
- Leaders contact structure.
- Twills personal profile.

## 2. Data Source

- Home data lives in `data/home.json`.
- Keep JSON valid.
- Preserve the current schema unless `home.js` changes in the same scoped task.
- Add only fields that `home.js` actually supports.
- Keep Home copy concise and directional.
- Keep functional labels plain.

Current Home data shape:

- `copy`: `bulletinIntro`, `doorsIntro`, `spotlightIntro`, `galleryIntro`
- `celebrationSplash`: `enabled`, `startsAt`, `endsAt`, `title`, `message`, `storageKey`
- `hero`: `image`, `atmosphereImage`, `descriptor`, `badges`
- `seal`: `title`, `image`, `imageAlt`, `verse`
- `bulletins[]`: `pinned`, `type`, `title`, `date`, `image`, `imageAlt`, `href`, optional `summary`
- `tiles[]`: `label`, `title`, `image`, `alt`, `href`, optional `subtitle`
- `spotlight`: `tag`, `title`, `summary`, `image`, `imageAlt`, `href`
- `gallery[]`: `image`, `full`, `alt`, optional `caption`

Renderer notes:

- `home.js` loads `data/home.json` through `MochiriiUtils.fetchJson()`.
- The live Next Home page derives monthly gathering and raffle dates from `data/guild-schedule.json` when a bulletin has `scheduleId`.
- The live Next Home page may replace the configured fallback spotlight title with the finalized monthly Discord poll winner name from `get-current-spotlight-winner`; the poll winner path is name-only and must not expose Discord handles, profile links, avatars, vote counts, or candidate lists.
- Home descriptor strings render as paragraphs.
- Home badges render as plain spans.
- Bulletin dates render through `MochiriiUtils.formatDateUTC()`.
- Door, bulletin, spotlight, and gallery media render from data fields.
- Inline HTML and Markdown are not supported in Home JSON copy.
- `home.js` does not support data-driven Home kicker, Home `h1`, primary CTA labels, section headings, metadata, header, footer, or navigation.

## 3. Protected Guild Seal Poem

The protected guild seal poem lives at:

- `data/home.json` `seal.verse`

The guild seal poem is protected. Do not alter wording, punctuation, line breaks, spelling, capitalization, diacritics, order, or structure. Future edits may revise other non-seal Home fields only if needed, supported by `home.js`, and intentionally scoped. Any seal poem change requires explicit user approval.

## 4. Header / Navigation

Header behavior comes from `header.html` and `site.js`.

Current desktop navigation:

- Guild: Home, Spotlight, Gallery.
- Culture: Join, Ranks, Leaders, Tome, Playlists.
- Updates: Announcements, Events, Raffles.
- Recruitment as a top-level link.

Current mobile navigation:

- The mobile button is `#menu-btn`.
- The mobile menu is `#mobile-menu`, a dialog-style shell with grouped links.
- Opening the menu sets `aria-expanded="true"`, locks body scrolling, and moves focus into the menu.
- Escape closes the menu.
- Close button, scrim click, and mobile link click close the menu.
- Closing by Escape or close button returns focus to the trigger.
- Tab is trapped inside the open menu.

Current dropdown behavior:

- Desktop dropdown buttons toggle on click, Enter, or Space.
- ArrowDown opens a dropdown and focuses the first item.
- Escape and outside click close open dropdowns.
- Active desktop nav uses `[data-nav]`, `is-active`, and `aria-current="page"`.

The exact game name may remain in header brand text and shared shell metadata contexts.

## 5. Footer

Footer behavior comes from `footer.html` and `site.js`.

Current footer content:

- Brand link to Home.
- Emblem image.
- Compact identity description.
- Discord Join CTA with `target="_blank"` and `rel="noopener noreferrer"`.
- Recruitment Tips link.
- Guild, Culture, and Updates navigation columns.
- Copyright text updated by `site.js`.
- Footer metadata line with the game name.

Keep the footer compact. It should remain a shared navigation and identity surface, not a full mission statement or duplicate Recruitment/Join content.

## 6. Script Load Order

Current public page convention:

```text
utils.js -> supabase.js -> site.js -> page-specific script
```

Checked pages:

- `index.html`
- `join.html`
- `events.html`
- `gallery.html`
- `ranks.html`
- `leaders.html`
- `tome.html`
- `recruitment.html`
- `announcements.html`
- `raffles.html`
- `spotify.html`
- `spotlight.html`
- `twills.html`

All checked pages follow the same order. `gallery.html` keeps this order with existing cache-query strings on CSS and JS references.

Do not reorder scripts casually. `utils.js` should remain available before shared and page scripts. `supabase.js` should not break signed-out public browsing. Keep `site.js` before page-specific scripts to preserve the current shell convention. Do not add a framework or bundler without explicit approval.

## 7. Home Copy and Tone Rules

- Home should establish identity and route visitors onward.
- Home should feel clear, human, xianxia-inspired, and Mōchirīī-specific.
- Cupcake warmth may appear lightly.
- Do not overuse Cupcake language.
- Do not use `Where Winds Meet` in regular visible Home body copy.
- Keep functional labels clear.
- Avoid generic AI-like language.
- Avoid forced rhyme.
- Do not duplicate page-specific content from other sections.

The exact game name may remain in header/footer, titles, metadata, SEO, JSON-LD, internal code, docs, reports, and validation scripts.

## 8. Metadata and Social Preview

Home metadata is owned by `index.html`.

Current conventions:

- Title: `Mōchirīī • Where Winds Meet Guild`
- Description: `Join Mōchirīī, a warm Where Winds Meet guild for friendly runs, clear event notes, and a cozy wuxia guild hall.`
- Canonical: `https://mochirii.com/`
- Open Graph tags for type, site name, title, description, URL, and image.
- Twitter summary-large-image tags for title, description, and image.
- JSON-LD `WebSite` object.
- Favicon and Apple touch icon references.
- Home hero preload.

`Where Winds Meet` may remain in metadata and SEO. Do not remove metadata terms just to satisfy body-copy rules. Metadata should stay search-friendly and accurate.

## 9. Images and Assets

Home image behavior:

- Hero image: `./assets/img/hero/hero.webp`
- Background image: `./assets/bg/wuxia-bg.webp`
- Seal image: `./assets/img/brand/emblem.webp`
- Bulletin, door, spotlight, and Home gallery images render from `data/home.json`.
- Home gallery thumbnails should use thumbnail paths where intended, and `full` should point to the full image used by the lightbox.

Birthday splash toggle:

- Deactivate the Home birthday splash by setting `data/home.json` `celebrationSplash.enabled` to `false`.
- Activate it by setting `celebrationSplash.enabled` to `true`.
- Optional `startsAt` and `endsAt` values may use ISO-compatible date/time strings to limit the active window; leave them empty for no date window.
- Keep the root source and the Next production copy synchronized: update `data/home.json`, then run `npm run sync:next-public` or make the matching change in `apps/web/public/data/home.json`.
- After changing the toggle or copy, run `npm run check:home-celebration-splash` and `npm run check:next-public-sync`.

Image expectations:

- Keep image paths relative and stable.
- Keep meaningful alt text for meaningful images.
- Keep decorative atmosphere images empty-alt and hidden as currently implemented.
- Avoid large unoptimized assets.
- Run asset and reference validation after asset or path edits.

Next app shared hero presentation:

- Shared `PageHero` routes and Home use the same stable `3 / 2` hero image frame inside the tokenized `--hero-frame-max-width` container.
- The hero image frame renders first, then Home may place the intro card and guild seal together in a slim row below it with positive spacing. Main page content follows below the hero header.
- Hero images should render with `object-fit: contain` and `object-position: center`, with no crop, scrim, tint, CSS filter, transform, or overlay covering the image.
- Do not use negative `--hero-image-to-card-gap` values, page-scoped hero geometry tokens, one-off hero margins, or page-local hero aspect/size overrides.
- Surface tiers should remain explicit: hero shell, primary content card, quiet card, tool panel, and admin/member panel.
- Keep page-specific palette, border, and glass styling scoped by `body[data-page="..."]`; do not change text, alt text, image paths, or route data for visual-only passes.
- Validate Home plus each shared `PageHero` route at `360px`, `390px`, `768px`, `1024px`, and `1440px` before release.

## 10. Cache Query Conventions

Current cache-query behavior:

- Home currently loads `styles.css`, `utils.js`, `supabase.js`, `site.js`, and `home.js` without cache-query strings.
- Gallery currently uses cache-query versions for Gallery CSS/JS references.
- Shared CSS/JS query changes should be deliberate.
- If shared CSS/JS changes in a future branch, review whether cache-query updates are needed on affected pages.
- Do not add build tools, service workers, or runtime cache hacks without explicit approval.

## 11. Accessibility

Preserve these expectations:

- Skip link appears on focus and targets `#main`.
- Pages keep semantic landmarks: header mount, main, and footer mount.
- Home keeps one `h1`, followed by sensible section headings.
- Desktop nav dropdowns keep accessible button state.
- Mobile menu keeps dialog semantics, Escape close, focus trap, and focus return.
- Focus states remain visible.
- Touch targets remain usable, generally 44px where controls are interactive.
- Image alt text stays meaningful or intentionally empty/decorative.
- Reduced-motion preferences remain respected.
- No horizontal overflow at mobile widths.
- Screen reader labels stay clear and not overly noisy.
- Shared lightbox behavior keeps Escape close, focus trap, and focus return.

## 12. Validation

Run these checks before opening or merging Home/Shell work:

```sh
npm run check
git diff --check
node scripts/check-json.mjs
node scripts/check-js.mjs
node scripts/check-refs.mjs
node scripts/check-assets.mjs
npm run check:production
```

Use `npm run smoke:gallery` as a general regression check if shared behavior could affect the gallery baseline. It expects a local static server on port `8765`.

## 13. Manual Home/Shell Smoke Checklist

- `/` loads.
- Header renders.
- Footer renders.
- Mobile nav opens and closes.
- Escape closes mobile menu if supported.
- Focus returns correctly if supported.
- Skip link appears and works.
- Home hero renders.
- Shared route heroes render full-frame without crop, tint, scrim, CSS filter, or intro-card overlap.
- Home cards/doors render.
- Seal poem renders unchanged.
- Key links resolve.
- Mobile widths `360px`, `390px`, and `768px` have no horizontal overflow.
- No console-breaking errors occur.
- Supabase page shell does not cause signed-out runtime errors.
- Protected recruitment body remains unchanged.
- Protected recruitment conclusion remains unchanged.
- Twills protected body remains unchanged.
- Guild seal poem remains unchanged.

## 14. Protected Content

Home/Shell work must not alter:

- `data/home.json` `seal.verse`
- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`
- `data/twills.json` `profile.bio`
