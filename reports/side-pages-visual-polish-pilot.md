# Side Pages Visual Polish Pilot

## 1. Current Visual Audit

Announcements, Raffles, Spotify, and Spotlight are functionally stable and mobile-safe at the checked widths. The focused visual opportunity is to bring these supporting pages into the current page-scoped visual system: they still rely on generic glass-card hierarchy, inherited animated card/pill borders, and inconsistent page identity. This pilot should refine presentation only while preserving all side-page data, copy, links, Spotify search/filter/embed behavior, and protected content.

Pre-change browser evidence:

- `360px`, `390px`, `768px`, and `1440px`: all four pages returned 200, rendered header/footer, kept one `h1`, had no console-breaking errors, and had no document-level horizontal overflow.
- Announcements rendered 3 notices, 3 hero badges, 10 detail items, and the pinned notice first: `Weekly Schedule Posted`.
- Raffles rendered 3 how-it-works paragraphs, 4 rules, 3 prize entries, and 2 links; the external raffle link retained `target="_blank"` and `rel="noopener noreferrer"`.
- Spotify rendered 8 embed cards, 8 iframes with meaningful titles and `loading="lazy"`, 13 tag chips, a 44px search input, working no-match empty state, and working search/filter rendering.
- Spotlight rendered 3 badges, 3 body paragraphs, 1 conclusion paragraph, and 4 highlights.
- `.page-main .glass-card` on all four pages reported `animation-name: border-shift`; Announcements, Raffles, and Spotlight hero/content pills also reported `border-shift`.

| Page | Area | Current visual issue | Severity | Proposed treatment | Needs change? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Shared | Page hero/header area | Hero images and intro panels render correctly, but they use the older shared frame and do not yet express a supporting-page family. | P2 | Add page-scoped hero rims and intro surfaces with each page palette. | Yes | CSS-only; no image path, copy, heading, or markup change. |
| Shared | Card/panel borders | Main cards inherit animated `border-shift`, which feels noisy for compact utility pages. | P2 | Disable inherited animation on side pages and replace it with static gradient rims. | Yes | Matches prior visual-system direction without global changes. |
| Shared | Panel hierarchy | Pages are readable but most primary and support panels feel equal and generic. | P2 | Use shared supporting-page panel tiers plus page-specific inner treatments. | Yes | Preserve current layout architecture. |
| Shared | Focus states | Global focus is visible, but page controls and links can feel more deliberate. | P3 | Add scoped focus rings for side-page links, buttons, and Spotify search/filter controls. | Yes | Keyboard clarity must remain strong. |
| Shared | Mobile layout | No overflow at `360px`, `390px`, `768px`, or `1440px`. | Pass | Preserve current responsive structure and touch target safety. | No | Browser audit confirmed document width matched viewport. |
| Announcements | Pinned/date ordering presentation | Sorting is correct, but notices read like generic cards rather than posted bulletin notes. | P2 | Give notice cards a clean jade/moon bulletin treatment with stable date/tag hierarchy. | Yes | Pinned order and rendered text remain unchanged. |
| Announcements | Details blocks | Details are readable, but list rhythm and tag chips could better support scanning. | P3 | Use quiet notice-list spacing and stable tags. | Yes | No content or ordering change. |
| Announcements | Empty/error state | Existing state is accessible through status text and fallback card. | Pass | Preserve current behavior. | No | No change planned. |
| Raffles | Rules/month sections | Rules and prize entries are plain and readable, but the hierarchy between rules, draw timing, and links is not yet polished. | P2 | Add fair-draw panel hierarchy with lantern/jade prize and rule surfaces. | Yes | Preserve rules, prizes, notes, and links. |
| Raffles | Links | Links already meet touch-height requirements, but surfaces can look more trustworthy and intentional. | P3 | Refine raffle link pills and focus states while preserving hrefs and external safety attributes. | Yes | Prior mobile accessibility fix remains. |
| Spotify | Search input | Search works and is 44px tall, but the control surface is still utility-basic. | P2 | Add listening-room search styling with moon/frost focus and stable width. | Yes | No behavior or debounce change. |
| Spotify | Tag/filter controls | Tag chips work, but active/inactive states can be more refined and consistent with the visual rollout. | P2 | Add frost/lotus chip treatment and stronger active/focus state. | Yes | Preserve `aria-pressed` and click behavior. |
| Spotify | Iframe embed cards | Embeds render and normalize correctly, but the cards feel crowded and generic for a listening-room shelf. | P2 | Add framed embed wells, calmer card spacing, and refined title/meta treatment. | Yes | Preserve iframe `src`, `title`, dimensions, and lazy loading. |
| Spotify | No-match empty state | Empty state works. | Pass | Restyle only as part of shared Spotify surface, with behavior unchanged. | Yes | No JS change. |
| Spotlight | Body/conclusion | Body and conclusion render correctly, but the appreciation story lacks a warm final-call hierarchy. | P2 | Add lotus/lantern appreciation panel and distinct conclusion treatment. | Yes | Preserve all rendered fields. |
| Spotlight | Highlights | Highlights are readable but visually generic. | P2 | Give highlights a warm side panel with clear list rhythm. | Yes | Preserve highlight count/order/text. |
| Shared | Relationship to previous visual work | Side pages have not yet adopted the page-scoped token and static-rim discipline used by recent pilots. | P2 | Reuse the underlying scoped-token/static-rim pattern with distinct side-page identities. | Yes | Do not copy Home, Gallery, Recruitment, Join, or ceremonial pages. |
| Shared | Performance risks | Inherited border animation continues on side-page cards and many pills. | P2 | Replace with static CSS gradients and restrained transitions only. | Yes | No assets, dependencies, or JS effects. |
| Shared | Reduced-motion behavior | Global reduced-motion helps, but the best side-page outcome is no inherited page animation. | P2 | Remove side-page card/pill animation entirely; keep only reduced-motion-safe transitions. | Yes | No new keyframes planned. |

## 2. Proposed Side Pages Visual Treatment

Shared supporting-page visual language:

- Use `body[data-page="announcements"]`, `body[data-page="raffles"]`, `body[data-page="spotify"]`, and `body[data-page="spotlight"]` scoped variables and selectors.
- Replace inherited animated card and pill borders with stable gradient rims, refined dark glass panels, and subtle inner light.
- Keep these pages compact and useful: visual hierarchy should clarify function, not inflate the pages into major feature pages.
- Keep controls, links, and embeds tactile through static CSS, visible focus states, and restrained hover transitions.

Announcements-specific treatment:

- Palette: jade and moon/frost.
- Intent: a clean public notice board.
- Treatment: posted notice cards, clear pinned/date hierarchy, readable details, and quiet tag chips.

Raffles-specific treatment:

- Palette: lantern gold and jade.
- Intent: fair draw, prize table, and small celebration without carnival styling.
- Treatment: clearer rules/month hierarchy, prize-list warmth, trustworthy link pills, and preserved external-link safety.

Spotify-specific treatment:

- Palette: moon/frost with restrained lotus.
- Intent: a listening-room shelf and mood archive.
- Treatment: refined search input, polished tag chips, framed embed wells, readable title/meta spacing, and stable no-match state.

Spotlight-specific treatment:

- Palette: lotus, lantern, and jade.
- Intent: warm appreciation and a short human story.
- Treatment: dignified appreciation body, distinct conclusion panel, and warmer highlight list rhythm.

Relationship to previous visual work:

- Reuse the proven principles from Home, Gallery, Recruitment, Join, and Codex/Ranks/Leaders: page-scoped tokens, static rims, readable hierarchy, and animation cleanup.
- Do not copy any prior page blindly.
- Side Pages should feel like one supporting family, but Announcements, Raffles, Spotify, and Spotlight each retain a clear lane.

Motion and reduced-motion:

- No new keyframes or JavaScript-driven visual effects.
- Hover/focus motion is limited to restrained transition-based feedback.
- Side-page cards and pills should no longer run inherited `border-shift`, making reduced-motion behavior safe by construction.

What must remain unchanged:

- `data/announcements.json`, `data/raffles.json`, `data/spotify.json`, and `data/spotlight.json`.
- Announcements rendered content and ordering.
- Raffles rendered content, rules, prize text, notes, links, and external-link attributes.
- Spotify search, filter, embed normalization, iframe URLs, iframe labels, and lazy loading.
- Spotlight body, conclusion, highlights, badges, and rendered fields.
- Protected guild seal poem, Recruitment body/conclusion, and Twills profile bio.
- Supabase behavior, workflows, validation scripts, docs, assets, and page rendering behavior.

## 3. Changes Made

Changed files:

- `styles.css`
- `reports/side-pages-visual-polish-pilot.md`

Shared selectors added or changed:

- `body[data-page="announcements"]`
- `body[data-page="raffles"]`
- `body[data-page="spotify"]`
- `body[data-page="spotlight"]`
- Side-page `.page-hero`
- Side-page `.hero-intro`
- Side-page `.page-main .glass-card`
- Side-page `.hero-intro::before`
- Side-page `.page-main .glass-card::before`
- Side-page `.page-main .grid-gap`
- Side-page `.glass-pad`
- Side-page `.kicker`, `.meta-text`, `.muted`
- Side-page `.display-title`, `.section-title`
- Side-page `.badge-row > span`
- Side-page `.list-stack`
- Side-page `.list-stack li::before`

Page-specific selectors added or changed:

- Announcements: `#announcementsList`, `#announcementsList > section`, `#announcementsList > section .lede`, `#announcementsList > section .badge-row`.
- Raffles: `.col-4 .glass-card`, `#rafflesRules`, `#rafflesThisMonth .list-stack`, `#rafflesLinks`, `#rafflesLinks > span`, `#rafflesLinks > span > a`, `#rafflesLinks > span > a:focus-visible`.
- Spotify: `.spotify-toolbar`, `.spotify-search`, `.spotify-search input`, `.spotify-search input:focus-visible`, `.spotify-chips`, `.spotify-chip`, `.spotify-chip:hover`, `.spotify-chip:focus-visible`, `.spotify-chip[aria-pressed="true"]`, `.spotify-grid`, `.spotify-card`, `.spotify-card__head`, `.spotify-card__title`, `.spotify-card__meta`, `.spotify-embed`, `.spotify-embed iframe`, `.spotify-empty`.
- Spotlight: `#spotlightBody`, `#spotlightBody p`, `#spotlightConclusion`, `#spotlightConclusion:empty`, `#spotlightHighlights`, `.col-4 .glass-card`.

Treatments added:

- Added side-page-scoped variables for panel surfaces, text, rims, glow, and warmth.
- Added page-specific accents: Announcements jade/moon, Raffles lantern/jade, Spotify moon/frost/lotus, and Spotlight lotus/lantern/jade.
- Replaced inherited side-page card and pill `border-shift` animation with stable static rims.
- Refined hero frames, intro panels, main panels, and support cards without changing layout architecture.
- Added Announcements notice-card treatment with clearer bulletin hierarchy.
- Added Raffles fair-draw/prize panel treatment and refined link/focus surfaces.
- Added Spotify listening-room toolbar, search, chip, embed, card, and empty-state polish with no JavaScript changes.
- Added Spotlight appreciation text measure, conclusion panel, and highlight-side-panel treatment.

Cache-query decision:

- `styles.css` changed.
- No cache-query changed because Announcements, Raffles, Spotify, and Spotlight do not currently use a page-specific stylesheet query convention like Gallery.
- No HTML or JavaScript changed, so no script query changes were needed.

Motion and reduced-motion:

- No new keyframes or JavaScript-driven effects were added.
- Side-page body cards and pills no longer run inherited `border-shift`.
- Hover motion is limited to restrained transform/shadow/color transitions on links and controls.
- Reduced-motion browser smoke reported side-page card animations as `none`; Spotify chip transition duration reduced to `1e-06s` under `prefers-reduced-motion: reduce`.

Accessibility considerations:

- Raffles links retained 56px measured height, safe external attributes, and visible keyboard focus.
- Spotify search input and tag chips retained 44px measured height and visible keyboard focus.
- Spotify filter controls keep button semantics and `aria-pressed`.
- Announcements and Spotlight remain readable, content-only pages with no added interactivity.
- No headings, landmarks, labels, iframe titles, links, or data-driven text changed.

Performance considerations:

- No new assets, fonts, dependencies, scripts, or images were added.
- Static layered gradients replaced constant card/pill animation on the side pages.
- CSS remains page-scoped through `body[data-page="..."]` selectors.

## 4. QA Results

| Check | Result | Evidence | Notes |
| --- | --- | --- | --- |
| Announcements desktop/mobile smoke | Pass | `360px`, `390px`, `768px`, and `1440px`: status 200, header/footer rendered, one `h1`, no console errors, no horizontal overflow. | Rendered 3 notices, 3 hero badges, 10 detail items, and pinned `Weekly Schedule Posted` first. |
| Announcements visual treatment | Pass | Side-page variable applied; body cards and pills reported `animation-name: none`. | Bulletin card hierarchy refined without changing content/order. |
| Raffles desktop/mobile smoke | Pass | `360px`, `390px`, `768px`, and `1440px`: status 200, header/footer rendered, one `h1`, no console errors, no horizontal overflow. | Rendered 3 how paragraphs, 4 rules, 3 prizes, and 2 links. |
| Raffles links | Pass | Raffle channel remained `https://discord.com/invite/dPafqMwWPK` with `target="_blank"` and `rel="noopener noreferrer"`; Events link remained `./events.html`. | Link heights measured 56px and keyboard focus showed a 2px outline. |
| Spotify desktop/mobile smoke | Pass | `360px`, `390px`, `768px`, and `1440px`: status 200, header/footer rendered, one `h1`, no console errors, no horizontal overflow. | Rendered 8 cards, 8 iframes, and 13 tag chips. |
| Spotify search/filter/embed behavior | Pass | Search `Night` rendered 2 cards; no-match query showed empty state with 0 cards; cleared search plus `Calm` tag rendered 1 card. | Iframes kept normalized `https://open.spotify.com/embed/...` sources, meaningful titles, `width="100%"`, and `loading="lazy"`. |
| Spotify focus/accessibility | Pass | Search input and tag chip keyboard tab checks both showed visible 2px focus outlines and 44px control height. | Button semantics and `aria-pressed` preserved. |
| Spotlight desktop/mobile smoke | Pass | `360px`, `390px`, `768px`, and `1440px`: status 200, header/footer rendered, one `h1`, no console errors, no horizontal overflow. | Rendered 3 badges, 3 body paragraphs, 1 conclusion paragraph, and 4 highlights. |
| Spotlight visual treatment | Pass | Side-page variable applied; body cards and pills reported `animation-name: none`. | Appreciation/conclusion hierarchy refined without changing rendered fields. |
| Cross-page regression smoke | Pass | `/`, `/join.html`, `/events.html`, `/gallery.html`, `/ranks.html`, `/leaders.html`, `/codex.html`, `/recruitment.html`, and `/twills.html` loaded at `390px` with header/footer, no overflow, and no console-breaking errors. | Side-page variables were absent on non-side routes; Gallery rendered 70 thumbnails; Events filters rendered; Recruitment audio rendered. |
| Gallery regression smoke | Pass | `npm run smoke:gallery` returned `Gallery lightbox smoke OK.` | Gallery behavior remained stable. |
| Protected content diff | Pass | Empty diffs for `data/home.json`, side-page JSON files, `data/recruitment.json`, and `data/twills.json`. | Side-page data and protected fields unchanged. |
| Validation | Pass | `npm run check`, `git diff --check`, JSON/JS/ref/asset checks, `npm run check:production`, and `npm run smoke:gallery` passed. | Known MP3 warning only. |

Known warnings:

- `assets/audio/mochiriiiiii.mp3` intentionally exceeds the normal large-asset threshold.
- GitHub-managed Pages deployment may still emit the known non-blocking Node.js 20 annotation.

Screenshots captured: no.

Browser-smoke evidence:

- Side pages were checked at `360px`, `390px`, `768px`, and `1440px`.
- Cross-page regression routes were checked at `390px`.
- No screenshots were committed because text browser metrics were sufficient and no visual regression required image evidence.

## 5. Visual Rollout Roadmap

Recommended next steps:

| Priority | Branch or tag | Type | Goal | Gate before merge/tag |
| --- | --- | --- | --- | --- |
| 1 | `qa/side-pages-visual-regression-review` | QA | Verify side-page visual polish after merge with focused data/link, Spotify behavior, mobile, accessibility, and cross-page smoke. | Confirm side-page data unchanged, Spotify search/filter/embed behavior intact, no mobile overflow, and protected content unchanged. |
| 2 | `v2.0.0-side-pages-visual-baseline` | Tag | Create a stable Side Pages visual baseline if QA passes. | Clean `main`, validation, production check, and Gallery smoke. |
| 3 | `qa/cross-site-visual-regression-review` | QA | Confirm the full page-by-page visual rollout remains stable across the public site. | Full page smoke, mobile widths, focus states, production check, Gallery smoke, and protected content checks. |
| 4 | `v2.1.0-cross-site-visual-baseline` | Tag | Tag the cross-site visual baseline after QA passes. | Clean `main` and full validation. |
| 5 | `docs/supabase-feature-plan` | Planning | Start Supabase feature planning after visual rollout gates are stable. | No schema/auth/storage implementation until the plan is reviewed. |

Reusable patterns:

- Page-scoped accent variables for compact support pages.
- Static gradient rims replacing inherited animated card and pill borders.
- Refined link/control focus rings that preserve existing semantics.
- Compact panel hierarchy for smaller utility pages.

Side Pages-only patterns:

- Announcements bulletin-card notice treatment.
- Raffles fair-draw/prize-table link and month panel treatment.
- Spotify listening-room toolbar/chip/embed shelf treatment.
- Spotlight appreciation body, conclusion, and highlight-list treatment.

Recommendation:

- Start `qa/side-pages-visual-regression-review` next.
- If that review finds no blockers, tag `v2.0.0-side-pages-visual-baseline`.
- After side pages are tagged, run `qa/cross-site-visual-regression-review` before Supabase planning.
