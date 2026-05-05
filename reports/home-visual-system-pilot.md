# Home Visual System Pilot

## 1. Current Home Visual Audit

The Home page already has a clear content hierarchy, stable responsive layout, and working shell behavior. The main visual gap is that several Home containers, section panels, and pills share the same animated `border-shift` treatment, which makes borders feel decorative but not intentional. The pilot should keep the current structure and copy while replacing that restless border behavior on Home with controlled section accents.

| Area | Current visual issue | Severity | Proposed treatment | Needs change? | Notes |
| --- | --- | --- | --- | --- | --- |
| Hero image shell | Strong first impression, but the rim is the same plain line used elsewhere. | P3 | Add a Home-scoped featured gradient rim and soft inner light. | Yes | CSS-only; no image or markup change. |
| Hero intro panel | Readable and well placed, but it has a flat glass surface compared with its first-impression role. | P2 | Treat as a featured guild-threshold panel with jade/gold rim, layered glass, and subtle top highlight. | Yes | Preserve text, CTAs, and focus behavior. |
| Hero badges/descriptors | Badges animate their border color through the global pill rule. | P2 | Remove Home pill animation and use stable jade/gold accent pills. | Yes | Motion reduction becomes simpler. |
| Guild seal block | Important identity moment, but current surface is visually similar to the hero intro card. | P2 | Give the seal a distinct lotus/moon ornamental frame with stronger emblem emphasis and a quiet radial glow. | Yes | Seal poem text remains unchanged. |
| Main section panels | Body sections all receive the same animated border color. | P2 | Replace with quiet/framed/featured Home panel tiers using section-specific accent variables. | Yes | Use existing `aria-label` sections; no hooks needed. |
| Bulletin card | Featured bulletin should feel primary, but its frame matches smaller cards. | P3 | Use stronger lantern/jade border, inner plate contrast, and controlled hover. | Yes | Behavior and link target unchanged. |
| Door cards | Door panels are large but visually empty when lazy images are not yet in view; borders are generic. | P2 | Add consistent framed-card rims, subtle surface depth, and stable label treatment. | Yes | No data or image changes. |
| Spotlight card | Spotlight should read as appreciation but currently shares the same generic media-card language. | P3 | Add a gentle lotus/gold accent through the existing card/plate styling. | Yes | Link behavior unchanged. |
| Screenshot module | Works, but the module has the same animated border as every other section. | P3 | Use a quieter moon/frost rim and stable thumbnail focus treatment. | Yes | Gallery lightbox behavior unchanged. |
| Hover/focus states | Focus is visible, but hover/focus border shifts are tied to color-change behavior. | P2 | Use stable outline, subtle lift, and box-shadow accents. | Yes | Preserve keyboard accessibility. |
| Mobile layout | No horizontal overflow at 360px, 390px, 768px, or 1440px. | Pass | Preserve current responsive structure. | No | Browser metrics showed scroll width equals viewport width. |
| Performance | Constant border animation runs on Home section panels and pills. | P2 | Disable those Home animations; keep any motion rare and transition-based. | Yes | No JS-driven effects or assets. |

## 2. Proposed Home Visual Treatment

Home should feel like the threshold into the guild hall: layered, warm, and deliberate without becoming noisy. The pilot will use a Home-only ornamental panel system.

Home accent palette:

- Primary: jade, for guild identity and entry paths.
- Secondary: lantern gold, for invitations and important routes.
- Supporting: moon/frost, for quiet panel edges and readable glass.
- Rare highlight: lotus, for the seal and spotlight.

Panel tiers:

- Quiet panels: default Home content sections, with dark glass, moon/frost linework, and minimal inner light.
- Framed panels: Four Doors and Screenshot Spotlight, using controlled jade or moon rims.
- Featured panels: hero intro, guild seal, Guild Bulletin, and Spotlight, using richer jade/gold/lotus accents.

Implementation plan:

- Override Home page animated card and pill borders with stable accent variables.
- Add Home-scoped CSS variables for jade, lantern, moon, frost, lotus, and panel surfaces.
- Use layered gradients on Home panels and media cards so borders feel intentional by section.
- Add subtle pseudo-element highlights to Home panels only.
- Keep hover and focus states stable, readable, and accessible.
- Add no JS, no data changes, no new assets, and no build tools.
- Respect `prefers-reduced-motion`; the planned Home treatment does not require constant animation.

What must remain unchanged:

- Home copy and section content.
- `data/home.json` `seal.verse`.
- Recruitment protected body and conclusion.
- Twills protected body text.
- Header, footer, mobile nav, Supabase behavior, Gallery behavior, and lightbox behavior.

## 3. Changes Made

Changed file:

- `styles.css`

Selectors changed:

- `body[data-page="home"]`
- `body[data-page="home"] .page-hero`
- `body[data-page="home"] .hero-intro`
- `body[data-page="home"] .home-guild-seal`
- `body[data-page="home"] .page-main .glass-card`
- `body[data-page="home"] .page-main section[aria-label="Guild bulletin"]`
- `body[data-page="home"] .page-main section[aria-label="Four doors"]`
- `body[data-page="home"] .page-main section[aria-label="Member spotlight"]`
- `body[data-page="home"] .page-main section[aria-label="Screenshot spotlight"]`
- `body[data-page="home"] .badge-row > span`
- `body[data-page="home"] .home-pill`
- `body[data-page="home"] .home-bulletin__tag`
- `body[data-page="home"] .home-door__label`
- `body[data-page="home"] .hero-cta`
- `body[data-page="home"] .home-featured`
- `body[data-page="home"] .home-spotlight`
- `body[data-page="home"] .home-bulletin`
- `body[data-page="home"] .home-door`
- `body[data-page="home"] .home-thumb`
- `body[data-page="home"] .home-featured__scrim`
- `body[data-page="home"] .home-spotlight__scrim`
- `body[data-page="home"] .home-bulletin__scrim`
- `body[data-page="home"] .home-door__scrim`
- `body[data-page="home"] .home-thumb__scrim`
- `body[data-page="home"] .home-featured__plate`
- `body[data-page="home"] .home-spotlight__plate`
- `body[data-page="home"] .section-title`

Treatments added:

- Added Home-scoped visual variables for jade, lantern, moon, frost, and lotus accents.
- Replaced Home's animated card/pill border color behavior with stable gradient rims.
- Added featured treatment to the hero image shell, hero intro panel, and guild seal.
- Added section-specific panel accents for Guild Bulletin, Four Doors, Member Spotlight, and Screenshot Spotlight.
- Added stable pill, CTA, card, thumbnail, and focus treatments.
- Added subtle inner highlights and controlled glass depth through layered backgrounds and pseudo-elements.

Motion changes:

- Removed constant `border-shift` animation from Home cards and Home pills.
- Kept only existing transition-based hover/focus lift.
- No new keyframes, JS motion, or asset-based effects were added.

Accessibility considerations:

- Focus outlines remain visible for Home CTAs, cards, doors, spotlight, and thumbnails.
- Button/link target sizing was preserved.
- Text contrast remains high against dark glass panels.
- Home still has one `h1`, sensible section headings, and no horizontal overflow in tested viewports.

Performance considerations:

- No new assets, dependencies, scripts, or build tooling were added.
- Constant Home border animations were removed, reducing visual/motion noise.
- CSS uses static layered gradients, box shadows, and existing backdrop-filter patterns.

## 4. QA Results

| Check | Result | Notes |
| --- | --- | --- |
| Desktop Home smoke, 1440px | Pass | Home loads, header/footer render, no console errors, no horizontal overflow. |
| Mobile Home smoke, 360px | Pass | No horizontal overflow; hero, badges, seal, panels, doors, and gallery render. |
| Mobile Home smoke, 390px | Pass | No horizontal overflow; touch/focus controls remain usable. |
| Tablet Home smoke, 768px | Pass | No horizontal overflow; hero and seal layout remains stable. |
| Skip link | Pass | Keyboard focus reveals skip link and Enter moves to `#main`. |
| Mobile nav | Pass | Menu opens, Escape closes, and focus returns to `#menu-btn`. |
| Cross-page regression smoke | Pass | Home, Join, Events, Gallery, Ranks, Leaders, Codex, Recruitment, Twills, Announcements, Raffles, Spotify, and Spotlight load at 390px and 1440px with no console errors or overflow. |
| `npm run smoke:gallery` | Pass | Gallery lightbox smoke OK. |
| Protected content diff | Pass | No diff in `data/home.json`, `data/recruitment.json`, or `data/twills.json`. |

Known warnings:

- `assets/audio/mochiriiiiii.mp3` intentionally exceeds the normal large-asset threshold.

## 5. Reuse Guidance

Reusable patterns:

- Home-scoped accent variables can become a model for future page-specific palettes.
- Stable gradient rims can replace animated border color changes on other pages after each page is audited.
- Section-specific `aria-label` selectors worked here without adding markup hooks.
- Static layered backgrounds and inner-light box shadows produced a richer look without JS or assets.

Keep Home-only for now:

- The exact `body[data-page="home"]` palette and featured seal treatment should remain Home-specific until another page receives its own visual audit.
- The hero threshold treatment belongs to Home's first-impression role.

Cautions before rollout:

- Do not copy the Home palette wholesale to every page; each page should get its own section intent.
- Keep future changes page-scoped unless a shared visual token is deliberately approved.
- Avoid reintroducing constant border animation as a default panel behavior.
