# Home Dynamic Card Accessible Names

## 1. Issue

Source report: `reports/accessibility-name-and-member-pages-review.md`.

That review found that Home rich card links kept generic static accessible names after JSON content loaded:

- `#featuredBulletin` remained `Featured bulletin`.
- `#spotlightCard` remained `Spotlight card`.

The visible cards were specific after render, but the accessible names were not. For keyboard, screen-reader, and voice-control users, generic card names made link purpose weaker than the visual card purpose.

Affected Home elements reviewed in this fix:

- Featured bulletin card: `#featuredBulletin`
- Member spotlight card: `#spotlightCard`
- Home fallback screenshot buttons rendered from `data/home.json`
- Home Gallery Spotlight links rendered from `data/gallery.json`

## 2. Fix

Changed file:

- `home.js`

No HTML, CSS, data, Gallery data, Gallery images, Supabase files, workflows, or validation scripts were changed.

Accessible-name strategy:

- Added small label helpers that normalize whitespace and join meaningful label parts.
- Updated the featured bulletin link after JSON render to include the card role, type, date, title, and optional summary.
- Updated the member spotlight link after JSON render to include the card role, tag, title, summary, and visible call-to-action text.
- Updated Home fallback screenshot buttons to use caption or alt text instead of falling back to only `Open image`.
- Updated rotating Home Gallery Spotlight links to include the Gallery category label plus caption or alt text.

Examples from local browser QA:

- `Featured bulletin - Event - 02/28/2026 - Monthly gatherings open to all members to be heard.`
- `Member spotlight - Spotlight - Congratulations to: Meenari. - For support & a pretty amazing spark. - Spotlight Appreciation`
- `View Portraits Gallery images: A lone silhouette before moonlit water.`
- `View Gatherings Gallery images: Three ornate robes gather on stone steps.`

Why visual behavior is unchanged:

- The fix only changes generated `aria-label` attributes.
- Existing card text, images, CSS classes, hrefs, rotation logic, fallback logic, thumbnails, and click behavior remain unchanged.
- Home Gallery Spotlight still renders exactly four Gallery-derived links when Gallery data loads.
- Home fallback Screenshot Spotlight still renders the existing four `data/home.json` image buttons if Gallery data cannot load.

## 3. QA

Home keyboard result:

- `page.getByRole('link', { name: /Monthly gatherings open to all members/i })` found the featured bulletin link.
- `page.getByRole('link', { name: /Congratulations to: Meenari/i })` found the member spotlight link.
- First Tab focus still reached `Skip to main content` with a visible `outline: solid 2px`.

Home Gallery Spotlight result:

- Home rendered exactly 4 spotlight images.
- The sampled run had 4 unique thumbnail sources.
- All sampled Home Gallery Spotlight sources used `/thumbs/`.
- All sampled Home Gallery Spotlight links resolved to `./gallery.html?category=<category>`.
- No sampled Home Gallery Spotlight accessible names were generic.
- The sampled run had 4 unique accessible labels.

Fallback result:

- With `data/gallery.json` intercepted as unavailable, Home kept the 4 existing fallback screenshot buttons.
- Fallback sources stayed:
  - `./assets/img/gallery/thumbs/shot-23.webp`
  - `./assets/img/gallery/thumbs/shot-57.webp`
  - `./assets/img/gallery/thumbs/shot-60.webp`
  - `./assets/img/gallery/thumbs/shot-65.webp`
- Fallback labels used caption or alt text, for example `Open image: Three figures standing beside a pale horse under a full moon.`

Cross-page result:

- `/`, `/gallery.html`, `/join.html`, `/events.html`, `/recruitment.html`, and `/twills.html` loaded locally without console-breaking errors.
- No horizontal overflow was observed at `360`, `390`, `768`, or `1440` widths on Home.

Gallery regression result:

- `/gallery.html` rendered 73 Gallery items.
- Gallery count text showed `Showing 73 of 73 images.`
- Gallery grid images used thumbnail paths.
- The sampled Gallery lightbox opened a full image path and not a `/thumbs/` path.

Protected content result:

- `data/home.json` unchanged.
- `data/gallery.json` unchanged.
- `data/recruitment.json` unchanged.
- `data/twills.json` unchanged.
- `data/home.json` `seal.verse` unchanged.
- `data/recruitment.json` `content.paragraphs` unchanged.
- `data/recruitment.json` `content.conclusion` unchanged.
- `data/twills.json` `profile.bio` unchanged.
