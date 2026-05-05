# Gallery Visual System Pilot

## 1. Current Gallery Visual Audit

The Gallery already has the right behavioral baseline: data-derived counts, category URL state, Copy link feedback, thumbnail grid, and full-image lightbox all work. The visual opportunity is to make the page feel more like a cinematic memory archive instead of a standard card-and-filter page. Current Gallery styling is functional and accessible, but it inherits older animated body-card border behavior and uses a relatively plain thumbnail/lightbox treatment.

| Area | Current visual issue | Severity | Proposed treatment | Needs change? | Notes |
| --- | --- | --- | --- | --- | --- |
| Page hero/header area | The hero image is strong, but the frame uses the same general page-hero linework as other pages. | P3 | Add Gallery-scoped moon/frost rim, soft image depth, and calm cinematic shadow. | Yes | CSS-only; no hero markup or image change. |
| Hero intro panel | The intro card is readable, but visually close to the Home threshold panel and still sits on the older shared glass surface. | P2 | Give Gallery a distinct moonlit viewing-room panel with frost/jade accents and no animated border. | Yes | Must not change copy or heading structure. |
| Main Gallery panel | The main panel inherits the global animated `border-shift` behavior from `.page-main .glass-card`. | P2 | Replace Gallery page body-card animation with stable, deliberate gradient rim and inner light. | Yes | Gallery-scoped override only. |
| Category filter controls | Filters work and wrap, but they read as basic pills with gold hover rather than tactile moon/jade tabs. | P2 | Use refined moon/frost pill surfaces, a calm active state, and clear accessible focus. | Yes | Button labels and counts remain data-derived. |
| Count labels | Count text is correct but visually understated compared with the toolbar. | P3 | Treat count as a quiet status badge aligned with the Gallery palette. | Yes | Text content remains unchanged. |
| Copy link control | Copy link works, but the dashed utility style feels separate from the Gallery tone. | P3 | Keep utility-first text while aligning the button with frosted tab styling. | Yes | Copy behavior and feedback strings stay unchanged. |
| Gallery grid | Grid is stable and responsive, but spacing/framing is utilitarian. | P2 | Add more intentional spacing and image-forward framing without changing columns or data. | Yes | Preserve existing 2/3/4 column breakpoints. |
| Thumbnail cards | Thumbnails are correct and fast, but they lack premium framing and quiet depth. | P2 | Add moon/frost gradient rim, subtle inner frame, restrained hover reveal, and strong focus ring. | Yes | Lightbox still reads `data-full`; thumbnails remain `/thumbs/`. |
| Caption/title treatment | Captions render in the lightbox and remain readable. | P3 | Slightly refine lightbox caption plate and contrast. | Yes | Caption text must not change. |
| Hover states | Current hover lifts and brightens, but uses the older gold border language. | P3 | Use a subtle moonlit reveal with restrained transform and brightness. | Yes | Reduced motion should neutralize transform. |
| Focus states | Focus is visible via the global outline, but not visually integrated with Gallery. | P2 | Add Gallery-specific focus rings using moon/frost plus lantern edge. | Yes | Keyboard clarity must remain stronger than hover. |
| Lightbox overlay/card | Lightbox works and opens full images, but the card/backdrop feel generic. | P2 | Add Gallery-only immersive dark viewing-room backdrop, frosted card rim, caption contrast, and close-button polish. | Yes | Keep `site.js` lightbox behavior unchanged. |
| Lightbox close button | Hit target is correct at 44x44px, but the surface can be more deliberate. | P3 | Add frost rim and calm hover/focus treatment. | Yes | No markup or behavior change. |
| Mobile layout | 360px, 390px, 768px, and 1440px checks show no horizontal overflow. | Pass | Preserve layout and improve wrapping only through scoped visual refinements. | No | Browser metrics showed `scrollWidth === clientWidth`. |
| Empty state | Empty state exists but is rarely visible with current categories. | P3 | Align empty state surface with Gallery panel treatment. | Yes | Behavior unchanged. |
| Visual relationship to Home pilot | Home proved stable page-scoped variables and static gradient rims work. Gallery should not clone Home's jade/lantern threshold treatment. | P2 | Reuse scoped-token and stable-rim principles, but use moon/frost as primary and jade as secondary. | Yes | Keep Home-specific selectors untouched. |
| Existing border/color behavior | Gallery still uses some older gold/jade hover states and global body-card animation. | P2 | Replace with controlled Gallery-specific accents. | Yes | No global rewrite. |
| Performance risks | Existing CSS is lightweight, but global card border animation still runs on Gallery body panel. | P2 | Disable Gallery body-card animation and use static gradients only. | Yes | No new assets, dependencies, or JS effects. |
| Reduced-motion behavior | Global reduced-motion rules already reduce transitions and hover transforms. | Pass | Preserve and keep any new transitions transform/opacity/filter only. | No | No new keyframes planned. |

## 2. Proposed Gallery Visual Treatment

Gallery should feel like a cinematic moonlit memory archive: image-first, quiet, and refined. It can reuse Home's principle of page-scoped visual tokens and stable gradient rims, but its palette and section mood should be distinct.

Gallery accent palette:

- Primary: moon/frost, for the archive surface, tabs, and lightbox.
- Secondary: jade, for active states and soft guild identity.
- Tertiary: lantern gold, for rare edge highlights and focus warmth.
- Rare accent: lotus, only as a very soft shadow tint when useful.

Panel and card tiers:

- Featured frame: the Gallery hero image and hero intro panel, with moonlit rim and soft viewing-room depth.
- Framed archive panel: the main Gallery section, with a stable frost/jade rim and quiet inner light.
- Memory cards: thumbnails, with image-forward framing, subtle inset shadow, and calm hover/focus states.
- Utility controls: filters and Copy link, aligned as tactile moon/jade tabs without changing labels or behavior.
- Viewing room: the lightbox overlay/card, with deeper backdrop, frosted frame, readable caption, and polished close button.

How Gallery differs from Home:

- Home feels like the guild hall threshold, using jade/lantern warmth and seal ornament.
- Gallery should feel cooler, quieter, and more cinematic, using moon/frost as the primary accent.
- Gallery thumbnails should carry the visual drama; panels should support the images rather than compete with them.

Implementation constraints:

- Preserve `data/gallery.json`, all Gallery images, all thumbnails, captions, alt text, categories, tags, and paths.
- Preserve filters, URL state, Back/Forward behavior, Copy link, data-derived counts, and full-image lightbox behavior.
- Prefer CSS-only, Gallery-scoped selectors.
- If `styles.css` changes, update only the Gallery page stylesheet cache query because `gallery.html` already follows that convention.
- Do not change `gallery.js` unless a tiny class/state hook becomes unavoidable; this pilot does not require one.
- Do not add assets, dependencies, JavaScript effects, or global visual changes.

## 3. Changes Made

Changed files:

- `styles.css`
- `gallery.html`

Selectors changed or added:

- `body[data-page="gallery"]`
- `body[data-page="gallery"] .page-hero`
- `body[data-page="gallery"] .hero-intro`
- `body[data-page="gallery"] .page-main .glass-card`
- `body[data-page="gallery"] .hero-intro::before`
- `body[data-page="gallery"] .page-main .glass-card::before`
- `body[data-page="gallery"] .hero-intro .badge-row > span`
- `body[data-page="gallery"] .gallery-toolbar`
- `body[data-page="gallery"] .gallery-controls`
- `body[data-page="gallery"] .gallery-filters`
- `body[data-page="gallery"] .gallery-filter`
- `body[data-page="gallery"] .gallery-copy-link`
- `body[data-page="gallery"] .gallery-share-status`
- `body[data-page="gallery"] .gallery-count`
- `body[data-page="gallery"] .gallery-empty`
- `body[data-page="gallery"] .gallery-grid`
- `body[data-page="gallery"] .gallery-thumb::before`
- `body[data-page="gallery"] .gallery-thumb::after`
- `body[data-page="gallery"] .gallery-thumb:hover`
- `body[data-page="gallery"] .gallery-thumb:focus-visible`
- `body[data-page="gallery"] .gallery-thumb img`
- `body[data-page="gallery"] .lightbox-card`
- `body[data-page="gallery"] #lightboxBackdrop`
- `body[data-page="gallery"] .lightbox-backdrop`
- `body[data-page="gallery"] .lightbox-caption`
- `body[data-page="gallery"] .lightbox-close`

Treatments added:

- Added Gallery-scoped moon/frost/jade/lantern visual variables.
- Added a Gallery-only hero frame with moon/frost rim and cinematic shadow.
- Replaced Gallery body-card animated border behavior with stable static rims.
- Added quiet inner light to the Gallery intro and main archive panel.
- Refined filters and Copy link into tactile moon/frost tabs with clearer active and focus states.
- Added a quiet count badge and aligned Copy link feedback with the Gallery palette.
- Added premium thumbnail framing with static gradient rims, inset depth, and restrained hover/focus reveal.
- Refined the Gallery lightbox as a deeper viewing-room surface with frosted card rim, calmer backdrop, readable caption, and polished close button.

Cache-query decision:

- `styles.css` changed.
- `gallery.html` already follows the Gallery cache-query convention.
- Updated only the Gallery page stylesheet query from `styles.css?v=2026-05-gallery-polish` to `styles.css?v=2026-05-gallery-visual`.
- `gallery.js` did not change, so the `gallery.js` query stayed unchanged.

Motion and reduced-motion:

- No new keyframes or JavaScript-driven effects were added.
- Hover/focus effects use restrained transform, filter, shadow, and opacity transitions.
- The Gallery main panel no longer runs the global `border-shift` animation.
- Existing `prefers-reduced-motion` rules continue to neutralize hover transforms and shorten transitions.

Accessibility considerations:

- Filter and Copy link focus states remain visible and stronger than hover states.
- Filter button text, `aria-pressed`, and `aria-label` behavior remain unchanged.
- Copy link live-status behavior remains unchanged.
- Thumbnail buttons remain keyboard reachable and still expose image alt text through rendered `img` elements.
- Lightbox close target remains 44x44px and keyboard reachable.

Performance considerations:

- No new assets, dependencies, fonts, scripts, or image transformations were added.
- CSS remains static and page-scoped.
- Removing Gallery's inherited panel animation reduces motion noise.

## 4. QA Results

| Check | Result | Evidence | Notes |
| --- | --- | --- | --- |
| Gallery desktop visual smoke | Pass | 1440px browser smoke: header/footer rendered, 70 thumbnails rendered, no horizontal overflow, Gallery panel animation `none`. | No console-breaking errors. |
| Gallery mobile visual smoke | Pass | 360px and 390px browser smoke: `scrollWidth === clientWidth`, six filters, 70 thumbnails, active filter `All · 70`. | Filter controls wrapped without overflow. |
| Gallery tablet visual smoke | Pass | 768px browser smoke: no overflow, 70 thumbnails, focus state visible. | Existing grid breakpoint preserved. |
| Category counts | Pass | All 70, portraits 22, gatherings 22, action 6, scenery 5, companions 15. | Counts remain data-derived. |
| URL state | Pass | Clicking Portraits changed URL to `gallery.html?category=portraits`; clicking Companions changed URL to `gallery.html?category=companions`. | Behavior unchanged. |
| Back/Forward state | Pass | Browser Back returned to Portraits with `aria-pressed` and count updated; Forward returned to Companions. | Behavior unchanged. |
| Copy link | Pass | With clipboard permission, status returned `Link copied`; without permission, fallback status returned `Copy failed`. | Existing utility behavior preserved. |
| Lightbox | Pass | Sampled image opened `./assets/img/gallery/shot-29.webp`; source did not include `/thumbs/`; caption remained readable. | Full-image behavior preserved. |
| Reduced motion | Pass | No new animation; existing reduced-motion rule covers Gallery thumbnail hover transform. | No additional reduced-motion CSS needed. |
| Cross-page regression smoke | Pass | Home, Join, Events, Ranks, Leaders, Codex, Recruitment, Twills, Announcements, Raffles, Spotify, and Spotlight loaded at 390px with header/footer, no overflow, no console-breaking errors. | Gallery page variables did not leak to other pages. |
| Protected / immutable content | Pass | No diff in `data/home.json`, `data/recruitment.json`, `data/twills.json`, or `data/gallery.json`. | No Gallery assets changed. |

Known warnings:

- `assets/audio/mochiriiiiii.mp3` intentionally exceeds the normal large-asset threshold.
- GitHub-managed Pages deployment may still emit the known non-blocking Node.js 20 annotation.

Visual evidence:

- No report screenshots were committed.
- Browser-smoke evidence was captured through Playwright metrics for 360px, 390px, 768px, and 1440px viewports.
- Temporary local review screenshots were used during implementation but not retained in the repository.

## 5. Visual Rollout Roadmap

Recommended next steps:

| Priority | Branch | Type | Goal | Gate before merge |
| --- | --- | --- | --- | --- |
| 1 | `qa/gallery-visual-regression-review` | QA | Verify Gallery visual polish after merge with focused mobile/accessibility and behavior smoke. | Confirm counts, filters, URL state, Copy link, lightbox full-image behavior, and cross-page safety. |
| 2 | `v1.6.0-gallery-visual-baseline` | Tag | Create a stable Gallery visual baseline if QA passes. | Clean `main`, validation, production check, and Gallery smoke. |
| 3 | `design/recruitment-visual-readability-pilot` | Design | Improve Recruitment reading surfaces and audio panel visual polish while preserving protected body/conclusion text. | Protected text unchanged and Recruitment audio behavior intact. |
| 4 | `design/join-visual-onboarding-pilot` | Design | Improve Join onboarding clarity and checklist/CTA visual hierarchy. | Checklist behavior, links, and mobile readability preserved. |
| 5 | `design/codex-ranks-leaders-ceremonial-pilot` | Design | Apply a scoped ceremonial visual pass to rule, rank, and stewardship pages. | No content drift; rank/leader order and Codex rules preserved. |
| 6 | `design/side-pages-visual-polish-pilot` | Design | Refine Announcements, Raffles, Spotify, and Spotlight as smaller support pages. | Spotify embed behavior and side-page data unchanged. |
| 7 | `qa/cross-site-visual-regression-review` | QA | Confirm the page-by-page visual rollout did not create cross-site regressions. | Full page smoke, mobile widths, focus states, and production check. |
| 8 | `v1.7.0-cross-site-visual-baseline` | Tag | Tag the cross-site visual baseline after QA passes. | Clean `main` and full validation. |

Reusable patterns:

- Page-scoped accent variables.
- Stable static gradient rims as replacements for generic animated borders.
- Tactile pill controls with clear focus and active states.
- Report-first visual pilots followed by focused regression QA.

Gallery-only patterns:

- Moon/frost primary palette.
- Cinematic archive panel and viewing-room lightbox treatment.
- Image-forward thumbnail frame and reveal language.

Recommendation:

- Start `qa/gallery-visual-regression-review` next.
- If that review finds no blockers, tag `v1.6.0-gallery-visual-baseline`.
