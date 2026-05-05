# Codex / Ranks / Leaders Ceremonial Visual Pilot

## 1. Current Visual Audit

Codex, Ranks, and Leaders are functionally stable and already pass their earlier mobile/accessibility reviews. The current visual opportunity is focused: all three pages still inherit the older animated `border-shift` card and pill treatment, and their section panels are readable but too generic for the guild structure pages. This pilot should make them feel like one ceremonial family while keeping Codex direct, Ranks hierarchical, and Leaders calm.

Pre-change browser evidence:

- `360px`, `390px`, `768px`, and `1440px`: Codex, Ranks, and Leaders loaded with header/footer, no console-breaking errors, and no document-level horizontal overflow.
- Codex rendered 3 hero pills, 6 tenets, 4 etiquette blocks, 4 rhythm cards, and 3 recognition cards; `View Ranks` resolved to `./ranks.html`.
- Ranks rendered senior ranks in order: Guild Leader, Vice Leader, Hall Leader; middle ranks in order: Dharmapala, Lotus Warden, Petal Keeper; member ranks in order: Mochi Blossom, Young Bamboo, Softwind, Rice Sprout.
- Leaders rendered the council in order: Twills, Vice Leader, Hall Leader, Isawisima, Sinbell, Meenari; the Twills profile link resolved to `./twills.html`.
- `.page-main .glass-card` and hero pill spans on all three pages reported `animation-name: border-shift`.

| Page | Area | Current visual issue | Severity | Proposed treatment | Needs change? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Shared | Hero/header areas | Hero images and intro panels render correctly, but the three pages use the same older shared linework and do not yet communicate distinct ceremonial roles. | P2 | Add page-scoped featured hero rims and intro surfaces using each page palette. | Yes | CSS-only; no hero copy, image path, or heading change. |
| Shared | Card/panel borders | Main cards and pills inherit animated `border-shift`, which feels noisy for structure and guidance pages. | P2 | Disable inherited animation on these pages and replace it with stable gradient rims. | Yes | Mirrors prior visual-system lessons without broad global CSS changes. |
| Shared | Focus states | Shared focus is visible, but not aligned with the ceremonial palettes. | P3 | Add page-scoped focus rings for local links and cards-with-links. | Yes | Keyboard clarity must remain stronger than hover. |
| Shared | Mobile layout | Pages fit at 360px, 390px, 768px, and 1440px without document overflow. | Pass | Preserve existing responsive grid and touch behavior. | No | Codex had internal grid measurement noise at 360px but no document overflow. |
| Codex | Intro/tenets | Tenet cards are readable, but the page reads like generic glass cards rather than a clear guild code. | P2 | Use jade/gold rule-card surfaces with restrained inner light. | Yes | Serious guidance remains direct and readable. |
| Codex | Etiquette blocks | List blocks are clear but visually flat and similar to tenet cards. | P2 | Give etiquette cards a grounded conduct-panel treatment with improved list rhythm. | Yes | No list text, order, or renderer changes. |
| Codex | Rhythm/recognition | Rhythm and recognition sections work but lack distinct ceremonial hierarchy. | P3 | Use quiet jade/gold framed cards and a clearer link treatment for `View Ranks`. | Yes | `recognition.ranksHref` remains unchanged. |
| Ranks | Progression panel | The progression section is readable but does not yet feel like a path of duty or service. | P2 | Add gold/bamboo featured panel treatment and clearer pill surfaces. | Yes | Preserve paragraph text and pill order. |
| Ranks | Rank cards | Rank cards show order correctly, but their card surfaces are utilitarian and all tiers feel equal. | P2 | Add tier-aware static rims and clearer rank-card hierarchy. | Yes | Rank names, groups, and order remain unchanged. |
| Ranks | Images/emblems | Tier images render and scale, but framing is generic. | P3 | Add intentional gold/bamboo image frames for hero and tier artwork. | Yes | No image asset or alt-text behavior changes. |
| Leaders | Council intro | Existing council intro plate is functional but simpler than the new visual system. | P2 | Refine it as a calm council panel with jade/moon surface depth. | Yes | Preserve council text. |
| Leaders | Leader cards | Roster cards are readable and ordered, but their surfaces are inherited and do not yet feel like stewardship cards. | P2 | Add jade/moon roster-card treatment and polished profile-link focus. | Yes | Preserve leader names, order, images, and profile links. |
| Leaders | Responsibility cards | Responsibility cards render safely after earlier mobile fix, but presentation should align with council identity. | P3 | Refine responsibility cards as structured stewardship panels. | Yes | Preserve responsibility text and order. |
| Shared | Performance risks | Constant border animation still runs on these pages. | P2 | Replace with static gradients and restrained transitions only. | Yes | No new assets, dependencies, or JS effects. |
| Shared | Reduced-motion behavior | Global reduced-motion rules exist, but the best fix is to remove these inherited page animations entirely. | P2 | Use no new keyframes; keep motion transition-based and rare. | Yes | Reduced-motion remains safe by construction. |

## 2. Proposed Ceremonial Visual Treatment

Shared ceremonial visual language:

- Use page-scoped CSS variables and selectors for Codex, Ranks, and Leaders.
- Replace inherited animated borders with stable gradient rims, dark glass surfaces, subtle inner light, and restrained focus rings.
- Treat hero/intro panels as featured ceremonial frames, main sections as framed panels, and generated cards as quiet inner cards.
- Keep all structure and data rendering unchanged; this is presentation only.

Codex-specific treatment:

- Palette: jade, gold, and ink.
- Intent: a clear guild code, not a decorative poem.
- Treatment: grounded rule cards, readable etiquette lists, stable jade/gold accents, and a visible `View Ranks` focus/hover state.

Ranks-specific treatment:

- Palette: gold, bamboo, and ink.
- Intent: a path of progression, service, and trust.
- Treatment: tiered rank panels, deliberate image frames, warmer card headers, and clear hierarchy without changing rank order.

Leaders-specific treatment:

- Palette: jade, moon/frost, and ink.
- Intent: calm council stewardship.
- Treatment: refined council intro, trustworthy roster cards, structured responsibility cards, and calm profile-link surfaces.

Relationship to previous visual work:

- Reuse the proven pattern of page-scoped tokens, static gradient rims, and animation cleanup from Home, Gallery, Recruitment, and Join.
- Do not copy Home's threshold, Gallery's moonlit archive, Recruitment's long-form hall speech, or Join's onboarding path.
- Codex/Ranks/Leaders should feel related to each other through ceremonial structure while retaining distinct accents.

Motion and reduced-motion:

- No new keyframes or JavaScript-driven effects.
- Hover/focus motion, if any, stays limited to restrained transform, shadow, opacity, or background transitions.
- Removing inherited `border-shift` animation makes reduced-motion behavior safer.

What must remain unchanged:

- `data/codex.json`, `data/ranks.json`, and `data/leaders.json`.
- Codex rules, tenets, etiquette, rhythm, recognition, and support copy.
- Rank names, rank group order, and rank order.
- Leader names, leader order, responsibility order, and profile links.
- Protected guild seal poem, Recruitment body/conclusion, and Twills profile bio.
- Supabase behavior, workflows, validation scripts, and page rendering behavior.

## 3. Changes Made

Changed files:

- `styles.css`
- `reports/codex-ranks-leaders-ceremonial-pilot.md`

Selectors added or changed:

- `body[data-page="codex"]`
- `body[data-page="ranks"]`
- `body[data-page="leaders"]`
- `body[data-page="codex"] .page-hero`
- `body[data-page="ranks"] .page-hero`
- `body[data-page="leaders"] .page-hero`
- `body[data-page="codex"] .hero-intro`
- `body[data-page="ranks"] .hero-intro`
- `body[data-page="leaders"] .hero-intro`
- `body[data-page="codex"] .page-main .glass-card`
- `body[data-page="ranks"] .page-main .glass-card`
- `body[data-page="leaders"] .page-main .glass-card`
- `body[data-page="codex"] .badge-row > span`
- `body[data-page="ranks"] .badge-row > span`
- `body[data-page="leaders"] .badge-row > span`
- `body[data-page="codex"] .footer-link`
- `body[data-page="ranks"] .footer-link`
- `body[data-page="leaders"] .footer-link`
- `body[data-page="codex"] #introImage`
- `body[data-page="codex"] #tenetsImage`
- `body[data-page="codex"] #etiquetteImage`
- `body[data-page="codex"] #rhythmImage`
- `body[data-page="codex"] #recImage`
- `body[data-page="codex"] #tenetsGrid .glass-card`
- `body[data-page="codex"] #etiquetteBlocks .glass-card`
- `body[data-page="codex"] #rhythmGrid .glass-card`
- `body[data-page="codex"] #recGrid .glass-card`
- `body[data-page="ranks"] #ranksHeroImage`
- `body[data-page="ranks"] #seniorImage`
- `body[data-page="ranks"] #middleImage`
- `body[data-page="ranks"] #membersImage`
- `body[data-page="ranks"] #progressionPills > span`
- `body[data-page="ranks"] #middlePills > span`
- `body[data-page="ranks"] #membersPills > span`
- `body[data-page="ranks"] #seniorRanks .glass-card`
- `body[data-page="ranks"] #middleRanks .glass-card`
- `body[data-page="ranks"] #membersRanks .glass-card`
- `body[data-page="leaders"] .leaders-council-intro`
- `body[data-page="leaders"] #leadersHeroImage`
- `body[data-page="leaders"] #leadersPanelImage`
- `body[data-page="leaders"] #leadersGrid article`
- `body[data-page="leaders"] #respGrid article`
- `body[data-page="leaders"] #leadersGrid article .glass-card--primary`
- `body[data-page="leaders"] #respGrid article .glass-card--primary`

Pages affected:

- Codex: hero, intro, tenets, etiquette, rhythm, recognition, page-local links, and image frames.
- Ranks: hero, progression panel, tier image frames, senior/middle/member rank cards, and page-local return link.
- Leaders: hero, Guild Leadership panel image, council intro, roster cards, responsibility cards, profile link, and return link.

Shared ceremonial treatment:

- Added page-scoped ceremonial variables for panel surface, ink, muted text, rims, glow, and warmth.
- Replaced inherited card and pill `border-shift` animation on Codex, Ranks, and Leaders with stable static gradient rims.
- Added subtle inner-light pseudo-elements to featured intro panels and main cards.
- Added page-aligned focus rings and restrained hover states for local footer-style links.
- Increased page-scoped grid and card spacing without changing layout architecture.

Codex treatment:

- Added jade/gold rule-card surfaces for tenets, rhythm, and recognition.
- Added a warmer grounded treatment for etiquette list blocks.
- Improved etiquette list rhythm through CSS spacing only.
- Added framed image treatment for Codex section artwork.

Ranks treatment:

- Added gold/bamboo progression and rank-card language.
- Differentiated senior, middle, and member rank-card surfaces without changing rank order.
- Added intentional image frames for hero and tier artwork.

Leaders treatment:

- Refined the council intro as a jade/moon panel.
- Added council roster and responsibility card treatments.
- Added calmer inner plates for leader/responsibility text overlays.
- Preserved the existing mobile responsibility-card ratio fix.

Cache-query decision:

- `styles.css` changed.
- No cache-query changed because Codex, Ranks, and Leaders do not currently use a page-specific stylesheet query convention like Gallery.
- No HTML or JavaScript changed, so no script query changes were needed.

Motion and reduced-motion:

- No new keyframes or JavaScript-driven effects were added.
- Codex, Ranks, and Leaders cards and pills no longer run the inherited `border-shift` animation.
- Hover motion is limited to restrained link lift.
- Existing global `prefers-reduced-motion` rules still reduce transition timing.

Accessibility considerations:

- Local links remain keyboard reachable.
- Focus states for `View Ranks`, `Return to Home`, and `Open profile` showed visible 2px outlines with page-aligned focus shadows.
- Page-local link targets measured 44px high during browser smoke.
- Text remains readable against dark ceremonial panels.

Performance considerations:

- No new assets, fonts, dependencies, scripts, or images were added.
- CSS remains page-scoped through `body[data-page="codex"]`, `body[data-page="ranks"]`, and `body[data-page="leaders"]`.
- Static layered gradients replace constant card and pill animations on the grouped pages.

## 4. QA Results

| Check | Result | Evidence | Notes |
| --- | --- | --- | --- |
| Codex desktop/mobile smoke | Pass | `360px`, `390px`, `768px`, and `1440px`: status 200, header/footer rendered, no console errors, no document overflow. | Rendered 3 hero pills, 6 tenets, 4 etiquette blocks, 4 rhythm cards, and 3 recognition cards. |
| Codex behavior/order | Pass | `#recLink` remained `./ranks.html`; Return to Home remained `./index.html`. | Codex data unchanged. |
| Ranks desktop/mobile smoke | Pass | `360px`, `390px`, `768px`, and `1440px`: status 200, header/footer rendered, no console errors, no document overflow. | Tier images loaded in browser smoke. |
| Ranks order | Pass | Senior: Guild Leader, Vice Leader, Hall Leader; Middle: Dharmapala, Lotus Warden, Petal Keeper; Members: Mochi Blossom, Young Bamboo, Softwind, Rice Sprout. | Rank data unchanged. |
| Leaders desktop/mobile smoke | Pass | `360px`, `390px`, `768px`, and `1440px`: status 200, header/footer rendered, no console errors, no document overflow. | Council and responsibility sections rendered. |
| Leaders order and links | Pass | Council order remained Twills, Vice Leader, Hall Leader, Isawisima, Sinbell, Meenari; Twills profile link remained `./twills.html`. | Leaders data unchanged. |
| Animation cleanup | Pass | Browser smoke returned `animation-name: none` for grouped page body cards and hero pills. | No noisy/random border behavior remains on these pages. |
| Focus states | Pass | Local links showed visible 2px outlines and page-aligned focus shadows; measured local link heights were 44px. | `View Ranks`, `Return to Home`, and `Open profile` remain usable. |
| Cross-page regression smoke | Pass | Home, Join, Events, Gallery, Recruitment, Twills, Announcements, Raffles, Spotify, and Spotlight loaded at 390px with header/footer, no overflow, and no console-breaking errors. | Ceremonial variables did not leak to other pages. |
| Gallery regression smoke | Pass | `npm run smoke:gallery` returned `Gallery lightbox smoke OK.` | Gallery still rendered 70 thumbnails in browser smoke. |
| Protected content diff | Pass | No diff in `data/home.json`, `data/codex.json`, `data/ranks.json`, `data/leaders.json`, `data/recruitment.json`, or `data/twills.json`. | No data files changed. |
| Validation | Pass | `npm run check`, `git diff --check`, JSON/JS/ref/asset checks, `npm run check:production`, and `npm run smoke:gallery` passed. | Asset check retains only the known MP3 warning. |

Known warnings:

- `assets/audio/mochiriiiiii.mp3` intentionally exceeds the normal large-asset threshold.
- GitHub-managed Pages deployment may still emit the known non-blocking Node.js 20 annotation.

## 5. Visual Rollout Roadmap

Recommended next steps:

| Priority | Branch | Type | Goal | Gate before merge |
| --- | --- | --- | --- | --- |
| 1 | `qa/codex-ranks-leaders-visual-regression-review` | QA | Verify the grouped ceremonial pilot after merge with focused data/order, mobile, accessibility, and cross-page smoke. | Confirm Codex data unchanged, rank/leader order unchanged, no mobile overflow, and protected content unchanged. |
| 2 | `v1.9.0-codex-ranks-leaders-visual-baseline` | Tag | Create a stable grouped ceremonial visual baseline if QA passes. | Clean `main`, validation, production check, and Gallery smoke. |
| 3 | `design/side-pages-visual-polish-pilot` | Design | Refine Announcements, Raffles, Spotify, and Spotlight support pages. | Side-page data unchanged and Spotify search/filter/embed behavior preserved. |
| 4 | `qa/side-pages-visual-regression-review` | QA | Confirm side-page polish did not regress behavior or shared styling. | Side pages and cross-page smoke pass. |
| 5 | `qa/cross-site-visual-regression-review` | QA | Confirm the page-by-page visual rollout remains stable across the public site. | Full page smoke, mobile widths, focus states, production check, and protected content checks. |
| 6 | `v2.0.0-cross-site-visual-baseline` | Tag | Tag the cross-site visual baseline after QA passes. | Clean `main` and full validation. |
| 7 | `docs/supabase-feature-plan` | Planning | Start Supabase feature planning after visual rollout gates are stable. | No schema/auth/storage implementation until the plan is reviewed. |

Reusable patterns:

- Page-scoped accent variables for grouped visual families.
- Static gradient rims replacing inherited animated borders.
- Shared ceremonial card language with page-specific palette overrides.
- Page-aligned link focus rings that preserve the existing `.footer-link` semantics.

Codex/Ranks/Leaders-only patterns:

- Codex jade/gold rule-card treatment.
- Ranks gold/bamboo tier-card treatment.
- Leaders jade/moon council-card treatment.

Recommendation:

- Start `qa/codex-ranks-leaders-visual-regression-review` next.
- If that review finds no blockers, tag `v1.9.0-codex-ranks-leaders-visual-baseline`.
