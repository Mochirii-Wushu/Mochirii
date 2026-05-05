# Join Visual Onboarding Pilot

## 1. Current Join Visual Audit

The Join page is functionally stable: it renders the hero, joining path, quick-start links, newcomer checklist, culture cards, and notes from `data/join.json`; the page has no horizontal overflow at the checked mobile, tablet, and desktop widths; and all current link destinations remain intact. The visual opportunity is focused: Join still reads as a generic glass-card page with inherited animated card and pill borders instead of a guided new-member path with its own page-specific hierarchy.

Pre-change browser evidence:

- `360px`, `390px`, `768px`, and `1440px`: header/footer rendered, no console-breaking errors, and `scrollWidth === clientWidth`.
- Rendered counts matched Join data: 5 joining steps, 4 quick-start links, 5 checklist items, 4 culture cards, and 2 notes links.
- Link destinations matched current data: Discord, Events, Guild Codex, Ranks, Leaders Hall, and Home.
- Discord links kept `target="_blank"` and `rel="noopener noreferrer"`.
- Quick-start and notes links measured 56px tall; checklist links measured 45px tall.
- `.page-main .glass-card`, `#joinBadges > span`, and `#joinLinks > span` inherited `animation-name: border-shift`.

| Area | Current visual/onboarding issue | Severity | Proposed treatment | Needs change? | Notes |
| --- | --- | --- | --- | --- | --- |
| Page hero/header area | Hero image renders well, but its frame uses the older shared line treatment. | P3 | Add Join-scoped jade/lotus/lantern rim and soft entryway depth. | Yes | CSS-only; no image, copy, or markup change. |
| Hero intro panel | Intro panel is readable, but visually generic and still inherits older glass language. | P2 | Treat as a guided guild-entry panel with stable accents and inner light. | Yes | Preserve title, metadata, intro, badges, and error status. |
| Hero badges | Badges inherit `border-shift`, which feels noisy for onboarding notes. | P2 | Replace with stable jade/lantern pills. | Yes | Badge copy and count remain data-driven. |
| Joining path / steps | Ordered list is accessible and practical, but the steps do not visually feel like a guided path. | P2 | Give steps individual warm path cards with stable markers and clearer scan rhythm. | Yes | Preserve `ol` structure and rendered text. |
| Quick start section | Links are usable and have good tap height, but the section reads like generic badges rather than the primary action surface. | P2 | Use a framed quick-start panel and refined CTA pills; emphasize Discord without changing labels. | Yes | Preserve link destinations and safe external-link attributes. |
| Newcomer checklist | Checklist content and layout are stable, but the cards are utilitarian and visually flat. | P2 | Add checklist-card hierarchy, jade/lantern markers, and readable grouped spacing. | Yes | Preserve checklist item count, copy, links, and non-interactive behavior. |
| Discord/Codex/Events/Ranks links | Links work and resolve, but the surfaces can feel more deliberate. | P3 | Align link pills with Join palette and stronger focus treatment. | Yes | No icon, label, destination, or behavior change. |
| Culture/notes sections | Content renders cleanly but shares the same generic card treatment as primary actions. | P3 | Use quieter support panels and card rhythm that sits below the path/checklist. | Yes | Preserve headings, body text, and links. |
| Mobile touch targets | Prior accessibility pass already fixed the small target issue. | Pass | Preserve min-height and spacing. | No | Browser audit confirmed 45px+ link heights. |
| Focus/hover states | Focus is visible, but not yet aligned with the Join visual identity. | P3 | Add Join-scoped focus rings and restrained hover lift. | Yes | Keyboard clarity must remain stronger than hover. |
| Border behavior | Body cards and pills use inherited animated border color. | P2 | Disable Join card/pill `border-shift` and replace with static gradient rims. | Yes | This is the main visual cleanup. |
| Mobile readability | No overflow at 360px, 390px, 768px, or 1440px. | Pass | Preserve current responsive structure. | No | Checklist grid breakpoints are working. |
| Relationship to Home/Gallery/Recruitment | Prior visual pilots use page-scoped variables and stable rims; Join has not yet adopted the same discipline. | P2 | Reuse scoped-token and stable-rim principles with a welcoming path identity. | Yes | Do not clone Gallery moonlit archive or Recruitment long-form hall speech. |
| Performance risks | Constant `border-shift` animation still runs on Join cards and pills. | P2 | Replace with static CSS and restrained transitions only. | Yes | No assets, dependencies, or JS effects. |
| Reduced-motion behavior | Global reduced-motion rule covers `.page-main .glass-card`, but Join badges can still report `border-shift` before reduction. | P3 | Remove Join-specific inherited animation entirely. | Yes | No new keyframes planned. |

## 2. Proposed Join Visual Treatment

Join should feel like a clear, warm new-member path into the guild: welcoming, practical, and calm. The visual system should guide visitors from interest to action to readiness without rewriting copy or changing renderer behavior.

Join accent palette:

- Primary: jade, for guild entry, action, and checklist readiness.
- Secondary: lotus, for warmth and newcomer welcome.
- Supporting: lantern gold, for primary calls to action and step markers.
- Grounding: ink and warm glass, for stable panel surfaces.
- Rare clarity accent: moon/frost, for quiet edge highlights only.

Panel and card tiers:

- Featured entry frame: hero image and hero intro panel, with jade/lotus/lantern rim and soft inner light.
- Guided path panel: joining steps, with stable step cards and clearer numbered path rhythm.
- Action panel: quick start, with refined CTA/link pills and a slightly stronger Discord-action surface.
- Readiness panel: newcomer checklist, with deliberate checklist cards and readable markers.
- Support panels: culture and notes, with quieter warm glass surfaces below the primary path.

How Join differs from Home, Gallery, and Recruitment:

- Home is the guild threshold and doorway system; Join is a practical path through that doorway.
- Gallery is moonlit and image-forward; Join should be action-forward and readable.
- Recruitment is a warm long-form hall address; Join should be more modular, scannable, and checklist-oriented.

Implementation constraints:

- Preserve `data/join.json` exactly.
- Preserve Join copy, checklist content, and all link destinations.
- Preserve Discord external-link behavior and internal page links.
- Keep the ordered joining path and unordered checklist semantics.
- Prefer CSS-only, Join-scoped selectors.
- Do not add cache-query changes unless the current repo convention clearly requires it; this pilot does not require one.
- Do not add assets, dependencies, JavaScript effects, or broad global CSS.

## 3. Changes Made

Changed files:

- `styles.css`
- `reports/join-visual-onboarding-pilot.md`

Selectors added or changed:

- `body[data-page="join"]`
- `body[data-page="join"] .page-hero`
- `body[data-page="join"] .hero-intro`
- `body[data-page="join"] .hero-intro::before`
- `body[data-page="join"] .page-main .glass-card`
- `body[data-page="join"] .page-main .glass-card::before`
- `body[data-page="join"] .page-main .grid-gap`
- `body[data-page="join"] .glass-pad`
- `body[data-page="join"] .kicker`
- `body[data-page="join"] .meta-text`
- `body[data-page="join"] .muted`
- `body[data-page="join"] .display-title`
- `body[data-page="join"] .section-title`
- `body[data-page="join"] .badge-row > span`
- `body[data-page="join"] #joinBadges > span`
- `body[data-page="join"] #joinLinks > span`
- `body[data-page="join"] #joinNotesBadges > span`
- `body[data-page="join"] #joinLinks > span > a`
- `body[data-page="join"] #joinNotesBadges > span > a`
- `body[data-page="join"] #joinStepsIntro`
- `body[data-page="join"] #joinQuickBody`
- `body[data-page="join"] #joinCultureIntro`
- `body[data-page="join"] #joinCultureCards`
- `body[data-page="join"] #joinNotes`
- `body[data-page="join"] #joinStepsList`
- `body[data-page="join"] #joinStepsList li`
- `body[data-page="join"] #joinStepsList li::before`
- `body[data-page="join"] #joinStepsList strong`
- `body[data-page="join"] #joinStepsList p`
- `body[data-page="join"] .col-4 .glass-card`
- `body[data-page="join"] #joinCultureCards > div`
- `body[data-page="join"] .join-checklist`
- `body[data-page="join"] .join-checklist .glass-card`
- `body[data-page="join"] .join-checklist__intro`
- `body[data-page="join"] .join-checklist__grid`
- `body[data-page="join"] .join-checklist__item`
- `body[data-page="join"] .join-checklist__marker`
- `body[data-page="join"] .join-checklist__body`
- `body[data-page="join"] .join-checklist__title`
- `body[data-page="join"] .join-checklist__text`
- `body[data-page="join"] .join-checklist__link`

Treatments added:

- Added Join-scoped jade, lotus, lantern, moon, panel, and text variables.
- Added a warmer hero frame and guided-entry hero intro surface.
- Replaced inherited Join card and badge `border-shift` animation with stable static rims.
- Added clearer joining-step cards while preserving the existing ordered-list structure.
- Refined Quick Start and Notes link pills without changing labels, hrefs, or external-link behavior.
- Added a stronger first quick-start action surface for the primary path.
- Refined checklist cards, markers, spacing, and focus-within treatment.
- Added quieter support-card treatment for the culture section.

Cache-query decision:

- `styles.css` changed.
- No cache-query changed because Join does not currently use a page-specific stylesheet query convention like Gallery.
- `join.html` and `join.js` did not change.

Motion and reduced-motion:

- No new keyframes or JavaScript-driven effects were added.
- Join page cards and badges no longer run the inherited `border-shift` animation.
- Hover motion is limited to restrained transform and shadow transitions.
- Existing global reduced-motion rules reduce those transitions.

Accessibility considerations:

- Join keeps one `h1`, the ordered joining path, and the unordered checklist.
- Existing 44px+ link/touch target fixes were preserved.
- Discord external-link safety attributes were preserved.
- Focus states on quick-start links, notes links, and checklist links are now page-aligned and clearly visible.

Performance considerations:

- No new assets, fonts, dependencies, scripts, or images were added.
- Static layered gradients replaced constant animation on Join page cards and pills.
- CSS remains page-scoped through `body[data-page="join"]`.

## 4. QA Results

| Check | Result | Evidence | Notes |
| --- | --- | --- | --- |
| Join desktop visual smoke | Pass | 1440px browser smoke: header/footer rendered, no horizontal overflow, 5 steps, 4 quick links, 5 checklist items, 4 culture cards, and 2 notes links. | No console-breaking errors. |
| Join mobile visual smoke | Pass | 360px and 390px browser smoke: `scrollWidth === clientWidth`; checklist and link panels wrapped cleanly. | Touch target heights remained 45px or taller. |
| Join tablet visual smoke | Pass | 768px browser smoke: no overflow, all rendered counts matched data, and focus states were visible. | Existing responsive checklist breakpoints preserved. |
| Join data rendering | Pass | Rendered counts matched `data/join.json`: 5 steps, 4 quick-start links, 5 checklist items, 4 culture cards, 2 notes links. | No data changes. |
| Link destinations | Pass | Join Discord, Events, Guild Codex, Ranks, Open Discord, Read the Codex, View Events, Leaders Hall, and Home hrefs matched current Join data. | Discord links retained `target="_blank"` and `rel="noopener noreferrer"`. |
| Focus states | Pass | Quick-start and checklist links reported visible 2px focus outlines using the Join page focus color. | Keyboard reachability preserved. |
| Animation cleanup | Pass | Browser smoke returned `animation-name: none` for Join body cards, hero badges, and quick-start badges. | No noisy/random border behavior remains on Join. |
| Reduced motion | Pass | Reduced-motion smoke returned no card or badge animation and shortened checklist transition duration. | No new motion system added. |
| Cross-page regression smoke | Pass | Home, Events, Gallery, Ranks, Leaders, Codex, Recruitment, Twills, Announcements, Raffles, Spotify, and Spotlight loaded at 390px with header/footer, no overflow, and no console-breaking errors. | Join variables did not leak to other pages. |
| Gallery regression smoke | Pass | `npm run smoke:gallery` returned `Gallery lightbox smoke OK.` | Gallery behavior remained stable. |
| Protected content diff | Pass | No diff in `data/home.json`, `data/join.json`, `data/recruitment.json`, or `data/twills.json`. | Join data and protected fields unchanged. |

Known warnings:

- `assets/audio/mochiriiiiii.mp3` intentionally exceeds the normal large-asset threshold.
- GitHub-managed Pages deployment may still emit the known non-blocking Node.js 20 annotation.

## 5. Visual Rollout Roadmap

Recommended next steps:

| Priority | Branch | Type | Goal | Gate before merge |
| --- | --- | --- | --- | --- |
| 1 | `qa/join-visual-regression-review` | QA | Verify Join visual onboarding pilot after merge with focused data/link, mobile, accessibility, and cross-page smoke. | Confirm Join data unchanged, checklist/link behavior intact, no mobile overflow, and protected content unchanged. |
| 2 | `v1.8.0-join-visual-baseline` | Tag | Create a stable Join visual baseline if QA passes. | Clean `main`, validation, production check, and Gallery smoke. |
| 3 | `design/codex-ranks-leaders-ceremonial-pilot` | Design | Apply scoped ceremonial visual polish to rule, rank, and stewardship pages. | Codex rules, rank order, leader order, and protected content unchanged. |
| 4 | `design/side-pages-visual-polish-pilot` | Design | Refine Announcements, Raffles, Spotify, and Spotlight support pages. | Side-page data unchanged and Spotify search/filter/embed behavior preserved. |
| 5 | `qa/cross-site-visual-regression-review` | QA | Confirm the page-by-page visual rollout remains stable across the public site. | Full page smoke, mobile widths, focus states, production check, and protected content checks. |
| 6 | `v1.9.0-cross-site-visual-baseline` | Tag | Tag the cross-site visual baseline after QA passes. | Clean `main` and full validation. |
| 7 | `docs/supabase-feature-plan` | Planning | Start Supabase feature planning after visual rollout gates are stable. | No schema/auth/storage implementation until the plan is reviewed. |

Reusable patterns:

- Page-scoped accent variables.
- Static gradient rims replacing inherited animated borders.
- Action-link pills with visible focus rings and preserved link semantics.
- Checklist/card hierarchy that improves scanability without adding interactivity.

Join-only patterns:

- Jade/lotus/lantern new-member path palette.
- First quick-start action emphasis.
- Checklist marker treatment for onboarding readiness.

Recommendation:

- Start `qa/join-visual-regression-review` next.
- If that review finds no blockers, tag `v1.8.0-join-visual-baseline`.
