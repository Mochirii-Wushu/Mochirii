# Recruitment Visual Readability Pilot

## 1. Current Recruitment Visual Audit

The Recruitment page is stable and accessible, with the protected long-form body and native audio behavior rendering correctly. The visual opportunity is focused: the page still relies on the older shared animated border treatment for body cards and badges, while the audio panel, body text, and conclusion use the same generic glass hierarchy. Recruitment can become warmer and more readable without changing data, copy, audio paths, or behavior.

| Area | Current visual/readability issue | Severity | Proposed treatment | Needs change? | Notes |
| --- | --- | --- | --- | --- | --- |
| Page hero/header area | Hero image renders correctly, but its frame is the same shared line treatment used across older pages. | P3 | Add Recruitment-scoped warm lantern/lotus rim, subtle depth, and stable shadow. | Yes | CSS-only; no image, copy, or metadata change. |
| Meta/badges | Badges inherit the global animated `border-shift`, which feels restless for a serious recruitment note. | P2 | Replace with stable Recruitment-scoped warm glass pills. | Yes | Preserve text and badge count. |
| Audio block | Native audio behavior is correct, but the card feels generic and visually separate from the page tone. | P2 | Treat as a polished listening panel with warm rim, inner light, and clear native-control focus. | Yes | Audio path and native controls must remain unchanged. |
| Audio label/description | Programmatic relationship is already present. | Pass | Preserve `aria-labelledby` and `aria-describedby`. | No | `#recruitmentAudio` points to title and description. |
| Protected long-form body container | Body card is readable, but inherits the global animated card border and lacks a long-form reading tier. | P2 | Add stable warm panel surface, improved measure, paragraph rhythm, and gentle text contrast. | Yes | Protected text stays untouched. |
| Protected conclusion container | Conclusion currently appears as regular prose with only an inline top margin. | P2 | Give it a final-call panel with lotus/lantern edge and readable emphasis. | Yes | Protected conclusion text stays untouched. |
| Paragraph width and line length | Width is acceptable, but paragraphs can feel dense on mobile and unceremonial on desktop. | P2 | Improve line-height, max measure, and paragraph gap through CSS only. | Yes | Browser audit: body text width ranged from 288px to 744px with no overflow. |
| Section rhythm | Audio and body sections stack safely, but hierarchy is mostly inherited from shared grid/card defaults. | P3 | Add scoped grid gap and panel tiering. | Yes | Keep grid architecture intact. |
| Border behavior | Recruitment body cards and badges animate border color. | P2 | Disable constant border animation for Recruitment and use deliberate static rims. | Yes | Matches Home/Gallery lessons without copying their palettes. |
| Hover/focus states | Shared focus is visible; audio can use a warmer page-specific focus outline. | P3 | Add Recruitment-scoped audio focus treatment. | Yes | No JS behavior change. |
| Mobile readability | No horizontal overflow at 360px, 390px, 768px, or 1440px. | Pass | Preserve responsive structure while improving spacing. | No | Existing column collapse below 980px is stable. |
| Desktop readability | Text is readable, but the body/conclusion hierarchy can be richer. | P2 | Make body the main reading panel and conclusion the final guild call. | Yes | Avoid blog-like or Gallery-like treatment. |
| Relationship to Home/Gallery visual systems | Home and Gallery now have page-scoped palettes and stable rims. Recruitment still uses old generic animated borders. | P2 | Reuse page-scoped-token and stable-rim principles with a warm guild-hall identity. | Yes | Do not clone Home threshold or Gallery archive styling. |
| Performance risks | Global border animation still runs on Recruitment cards and badges. | P2 | Remove those page-level inherited animations. | Yes | No assets, dependencies, or JS effects. |
| Reduced-motion behavior | Global reduced-motion rules exist. | Pass | Do not add new keyframes; use static CSS and mild transitions only. | No | Motion remains rare and safe. |

Pre-change browser audit evidence:

- `360px`, `390px`, `768px`, and `1440px`: header/footer rendered, no console-breaking errors, no horizontal overflow.
- `#recruitmentBody`: seven protected paragraphs rendered.
- `#recruitmentConclusion`: one protected conclusion paragraph rendered.
- `#recruitmentAudio`: native controls present, source `./assets/audio/mochiriiiiii.mp3`, type `audio/mpeg`, `aria-labelledby="recruitmentAudioTitle"`, `aria-describedby="recruitmentAudioDesc"`.
- `.page-main .glass-card`: inherited `animation-name: border-shift`.
- `#recruitmentBadges > span`: inherited `animation-name: border-shift`.

## 2. Proposed Recruitment Visual Treatment

Recruitment should feel like a warm guild hall address: ceremonial, human, and readable. The body text should be the star, the audio block should feel like an intentional listening panel, and the conclusion should land as a final guild call.

Recruitment accent palette:

- Primary: lantern gold for warmth, guidance, and the listening panel.
- Secondary: lotus for the final-call conclusion and human warmth.
- Supporting: jade for guild identity and quiet balance.
- Grounding: ink and warm glass for long-form readability.

Panel and text tiers:

- Featured frame: hero image and hero intro, with lantern/lotus rim and soft inner light.
- Listening panel: audio card, with warm glass depth and visible native audio focus.
- Reading panel: protected body card, with stable border, controlled measure, and wider paragraph rhythm.
- Final-call panel: protected conclusion, with lotus/lantern edge and gentle emphasis.

How Recruitment differs from Home and Gallery:

- Home is a threshold and door system; Recruitment is a seated guild address.
- Gallery is moonlit and image-forward; Recruitment is warm, text-forward, and grounded.
- Recruitment should use page-scoped variables and stable rims like the prior visual pilots, but its palette and density should stay distinct.

Implementation constraints:

- Preserve `data/recruitment.json` `content.paragraphs` exactly.
- Preserve `data/recruitment.json` `content.conclusion` exactly.
- Preserve `assets/audio/mochiriiiiii.mp3` path and native audio controls.
- Prefer CSS-only and Recruitment-scoped selectors.
- Do not add cache-query changes unless a current repo convention clearly requires it; this pilot does not require one.
- Do not add assets, dependencies, JavaScript effects, or broad global CSS.

## 3. Changes Made

Changed files:

- `styles.css`
- `reports/recruitment-visual-readability-pilot.md`

Selectors added or changed:

- `body[data-page="recruitment"]`
- `body[data-page="recruitment"] .page-hero`
- `body[data-page="recruitment"] .hero-intro`
- `body[data-page="recruitment"] .hero-intro::before`
- `body[data-page="recruitment"] .page-main .glass-card`
- `body[data-page="recruitment"] .page-main .glass-card::before`
- `body[data-page="recruitment"] .page-main .grid-gap`
- `body[data-page="recruitment"] .glass-pad`
- `body[data-page="recruitment"] .kicker`
- `body[data-page="recruitment"] .meta-text`
- `body[data-page="recruitment"] .muted`
- `body[data-page="recruitment"] .display-title`
- `body[data-page="recruitment"] .section-title`
- `body[data-page="recruitment"] .badge-row > span`
- `body[data-page="recruitment"] .col-4 .glass-card`
- `body[data-page="recruitment"] #recruitmentAudioTitle`
- `body[data-page="recruitment"] #recruitmentAudioDesc`
- `body[data-page="recruitment"] #recruitmentAudio`
- `body[data-page="recruitment"] #recruitmentAudio:focus-visible`
- `body[data-page="recruitment"] .col-8 .glass-card`
- `body[data-page="recruitment"] #recruitmentBody`
- `body[data-page="recruitment"] #recruitmentBody p`
- `body[data-page="recruitment"] #recruitmentConclusion`
- `body[data-page="recruitment"] #recruitmentConclusion p`

Treatments added:

- Added Recruitment-scoped lantern, lotus, jade, and warm-glass variables.
- Added a warm hero frame and featured hero intro panel without touching the hero image or text.
- Replaced inherited Recruitment card and badge `border-shift` animation with stable static rims.
- Added a dedicated listening-panel treatment for the native audio card.
- Added a visible native audio focus ring while preserving browser controls.
- Refined long-form body measure, line-height, and paragraph spacing.
- Added a distinct final-call panel around the protected conclusion.
- Kept all changes CSS-only and page-scoped.

Cache-query decision:

- `styles.css` changed.
- No cache-query was changed because Recruitment does not currently use a page-specific stylesheet query convention like Gallery.
- No HTML or JavaScript changed, so no script query changes were needed.

Motion and reduced-motion:

- No new keyframes or JavaScript-driven effects were added.
- Recruitment cards and badges no longer run the inherited `border-shift` animation.
- Existing global `prefers-reduced-motion` rules still shorten transitions.

Accessibility considerations:

- Native audio controls remain available and labeled by `#recruitmentAudioTitle` and described by `#recruitmentAudioDesc`.
- Audio focus state is more visible through a warm outline and offset.
- Body text contrast remains high on dark warm panels.
- Heading order and screen-reader content were not changed.

Performance considerations:

- No new assets, fonts, dependencies, scripts, or images were added.
- Static layered gradients replaced constant border animation on Recruitment cards and badges.
- CSS remains page-scoped through `body[data-page="recruitment"]`.

## 4. QA Results

| Check | Result | Evidence | Notes |
| --- | --- | --- | --- |
| Recruitment desktop visual smoke | Pass | 1440px browser smoke: header/footer rendered, no horizontal overflow, seven body paragraphs and one conclusion paragraph rendered. | No console-breaking errors. |
| Recruitment mobile visual smoke | Pass | 360px and 390px browser smoke: `scrollWidth === clientWidth`, audio width stayed inside the viewport, body and conclusion rendered. | Long-form text remained readable. |
| Recruitment tablet visual smoke | Pass | 768px browser smoke: no overflow, stable header/footer, native audio rendered. | Existing column collapse preserved. |
| Protected body | Pass | `#recruitmentBody` rendered seven paragraphs with opening text unchanged. | No `data/recruitment.json` diff. |
| Protected conclusion | Pass | `#recruitmentConclusion` rendered one paragraph with opening text unchanged. | No `data/recruitment.json` diff. |
| Audio behavior | Pass | `#recruitmentAudio` retained native controls, `aria-labelledby`, `aria-describedby`, and source `./assets/audio/mochiriiiiii.mp3` with `audio/mpeg`. | `curl -I` returned `200` and `Content-type: audio/mpeg`. |
| Audio focus | Pass | Browser focus on `#recruitmentAudio` showed a visible 2px warm outline with 4px offset. | No audio JS or path changes. |
| Card animation | Pass | Browser audit returned `animation-name: none` for Recruitment page cards. | No noisy/random border behavior remains on Recruitment cards. |
| Cross-page regression smoke | Pass | Home, Join, Events, Gallery, Ranks, Leaders, Codex, Twills, Announcements, Raffles, Spotify, and Spotlight loaded at 390px with header/footer, no overflow, and no console-breaking errors. | Recruitment variables did not leak. |
| Gallery regression smoke | Pass | `npm run smoke:gallery` returned `Gallery lightbox smoke OK.` | Gallery visual system still works. |
| Protected content diff | Pass | No diff in `data/home.json`, `data/recruitment.json`, or `data/twills.json`. | MP3 file unchanged. |

Known warnings:

- `assets/audio/mochiriiiiii.mp3` intentionally exceeds the normal large-asset threshold.
- GitHub-managed Pages deployment may still emit the known non-blocking Node.js 20 annotation.

## 5. Visual Rollout Roadmap

Recommended next steps:

| Priority | Branch | Type | Goal | Gate before merge |
| --- | --- | --- | --- | --- |
| 1 | `qa/recruitment-visual-regression-review` | QA | Verify Recruitment visual readability pilot after merge with focused protected-text, audio, mobile, and cross-page smoke. | Protected body/conclusion unchanged; audio source resolves; no mobile overflow. |
| 2 | `v1.7.0-recruitment-visual-baseline` | Tag | Create a stable Recruitment visual baseline if QA passes. | Clean `main`, validation, production check, and Gallery smoke. |
| 3 | `design/join-visual-onboarding-pilot` | Design | Improve Join onboarding and checklist visual hierarchy. | Checklist behavior, links, and mobile readability preserved. |
| 4 | `design/codex-ranks-leaders-ceremonial-pilot` | Design | Apply ceremonial visual polish to rule, rank, and leadership pages. | Codex rules, rank order, and leader order preserved. |
| 5 | `design/side-pages-visual-polish-pilot` | Design | Refine Announcements, Raffles, Spotify, and Spotlight support pages. | Spotify search/filter/embed behavior and side-page data unchanged. |
| 6 | `qa/cross-site-visual-regression-review` | QA | Confirm the visual rollout remains stable across the public site. | Full page smoke, mobile widths, focus states, production check. |
| 7 | `v1.8.0-cross-site-visual-baseline` | Tag | Tag the cross-site visual baseline after QA passes. | Clean `main` and full validation. |

Reusable patterns:

- Page-scoped accent variables.
- Static gradient rims replacing inherited animated borders.
- Clear final-call panel treatment for important closing text.
- Native-control focus styling that does not replace browser behavior.

Recruitment-only patterns:

- Warm lantern/lotus guild-hall palette.
- Listening-panel treatment for the Recruitment audio note.
- Final-call panel around the protected conclusion.

Recommendation:

- Start `qa/recruitment-visual-regression-review` next.
- If that review finds no blockers, tag `v1.7.0-recruitment-visual-baseline`.
