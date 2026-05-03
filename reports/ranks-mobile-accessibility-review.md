# Ranks Mobile Accessibility Review

## Scope

This review covers the current Ranks page implementation on `ranks.html`, `ranks.js`, `styles.css`, and `data/ranks.json`, using `docs/ranks-guide.md` and `reports/ranks-implementation-inventory.md` as reference documents.

The review is limited to mobile layout, keyboard behavior, screen reader structure, content readability, and renderer/data safety. No Ranks data, rank names, rank order, protected recruitment copy, guild seal verse, assets, workflows, or validation scripts were changed.

## Findings

| Area | Finding | Severity | Evidence | Fix needed? | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile layout | Ranks page fits at 360px, 390px, 768px, and 1440px with no document-level or main-content horizontal overflow. | Pass | Playwright measured document/body widths equal to viewport widths at all tested sizes; main overflow count was 0. | No | Shared mobile footer columns use an internal swipe row, but the page document does not overflow. |
| Mobile layout | Hero, intro, progression panel, tier sections, rank cards, and side-panel images remain readable after the shared grid collapses below 980px. | Pass | At 360px and 390px, Senior/Middle/Members sections render in source order and images scale within their cards. | No | Uses shared `.grid-12`, `.col-8`, `.col-4`, `.glass-pad`, and `.prose-stack` rules. |
| Mobile layout | Page-local touch target for `Return to Home` meets the 44px expectation. | Pass | Playwright measured `Return to Home` at 128x44 at all tested widths. | No | Header/footer controls are shared site behavior; no Ranks-specific controls were added. |
| Keyboard behavior | Keyboard tab order reaches the skip link, shared header controls, page-local `Return to Home`, and footer links without trapping focus. | Pass | Playwright tab smoke reached `Return to Home` after shared header controls at mobile and desktop widths. | No | Ranks has no filters, accordions, buttons, cards-as-links, or custom keyboard interactions. |
| Keyboard behavior | Focus indicators are visible for the skip link and `Return to Home`. | Pass | Computed focus styles showed a 2px solid outline; `Return to Home` used the shared gold focus outline. | No | Shared focus rules in `styles.css` apply. |
| Screen reader / semantics | Heading order is sensible: one `h1`, section `h2` headings, and `h3` rank/aside headings. | Pass | Rendered heading sequence: `Ranks & Progression`, `Progression`, `Senior Leadership`, senior rank `h3`s, `Middle Leadership`, middle rank `h3`s, `Members`, member rank `h3`s. | No | Rank cards are `div` elements, matching the documented current implementation. |
| Screen reader / semantics | Images used by the Ranks page have alt text; atmosphere image remains hidden from assistive tech. | Pass | Hero alt: `Ranks and progression banner artwork`; senior/middle/member alts: `Senior Leadership artwork`, `Middle Leadership artwork`, `Members artwork`; atmosphere image has empty alt and `aria-hidden="true"`. | No | JSON does not currently support data-driven image alt text. |
| Screen reader / semantics | Rank order is communicated by source order and headings. | Pass | Rendered order matched JSON order: Guild Leader, Vice Leader, Hall Leader, Dharmapala, Lotus Warden, Petal Keeper, Mochi Blossom, Young Bamboo, Softwind, Rice Sprout. | No | No automatic sorting or explicit sort fields are present. |
| Content readability | Ranks duties stay direct and readable; visible Ranks body content does not use `Where Winds Meet`. | Pass | Playwright text scan of `<main>` found no `Where Winds Meet`; rank duties render as plain paragraphs. | No | Page metadata/header/footer may still include the game name per repository rules. |
| Renderer/data safety | Senior, middle, and members slots render correct counts and preserve the fixed group order. | Pass | Rendered group counts were Senior 3, Middle 3, Members 4 at all tested widths. | No | Tier order is fixed by `ranks.html` and renderer calls in `ranks.js`. |
| Renderer/data safety | Unsupported fields do not appear in rendered output or break rendering. | Pass | Current renderer only uses documented hero, progression, tier, image, pill, note, rank name, and rank body fields. | No | Per-rank links/images/emblems, sort fields, filters, and additional tiers remain unsupported. |
| Shared helpers | `utils.js`, `site.js`, and `supabase.js` loaded without console-breaking errors on Ranks. | Pass | Local browser smoke showed HTTP 200 and 0 console/page errors at all tested viewport widths. | No | `ranks.js` still depends on `MochiriiUtils.fetchJson()`. |

## Viewport Evidence

| Width | Status | Document/body width | Main overflow | Rank groups | Rank order | Console errors |
| --- | --- | --- | --- | --- | --- | --- |
| 360px | 200 | 360/360 | 0 | 3/3/4 | Pass | 0 |
| 390px | 200 | 390/390 | 0 | 3/3/4 | Pass | 0 |
| 768px | 200 | 768/768 | 0 | 3/3/4 | Pass | 0 |
| 1440px | 200 | 1440/1440 | 0 | 3/3/4 | Pass | 0 |

## Result

No confirmed Ranks mobile or accessibility defects were found in this pass. No code, CSS, data, asset, or protected-content changes were needed.
