# Leaders Mobile Accessibility Review

## Scope

This review covers the current Leaders page implementation on `leaders.html`, `leaders.js`, `styles.css`, and `data/leaders.json`, using `docs/leaders-guide.md` and `reports/leaders-implementation-inventory.md` as references.

The review is limited to mobile layout, keyboard behavior, screen reader structure, link behavior, content readability, renderer/data safety, shared shell behavior, and signed-out Supabase runtime safety. No Leaders data, leader names, leader order, profile URLs, protected recruitment copy, guild seal verse, assets, workflows, validation scripts, or Supabase behavior were changed.

## Findings

| Area | Finding | Severity | Evidence | Fix needed? | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile layout | Leaders page fits at 360px, 390px, 768px, and 1440px with no document-level or main-content horizontal overflow. | Pass | Playwright measured document/body widths equal to viewport widths at all tested sizes; main overflow count was 0. | No | Shared footer swipe-row behavior remains outside the Leaders page content area. |
| Mobile layout | Hero, intro, Guild Leadership panel, The Council roster, and leader cards remain readable across tested widths. | Pass | The Council rendered 6 leader cards at all tested widths; leader overlay plates stayed inside their image frames. | No | Uses shared grid collapse below 980px and existing leader card media sizing. |
| Mobile layout | Responsibility card overlay text was too tight at 360px for the longest card. | P3 | Initial 360px audit measured `Culture & people` text plate at 161.6px inside a 177.5px media area with a -0.09px top gap. | Yes | Added a page-scoped mobile CSS adjustment so responsibility media panels are taller below 640px. |
| Keyboard behavior | Tab order reaches the skip link, shared header controls, Twills profile link, `Return to Home`, and footer links without trapping focus. | Pass | Playwright tab smoke reached `Open profile` and `Return to Home` on mobile and desktop widths. | No | Leaders has no page-specific buttons, filters, accordions, or custom keyboard interactions. |
| Keyboard behavior | Focus indicators are visible for profile and return links. | Pass | Computed focus styles showed a 2px solid shared gold outline for `.footer-link` profile and return links. | No | Shared focus rules in `styles.css` apply. |
| Screen reader / semantics | Heading order is sensible: one `h1`, section `h2` headings, and `h3` leader/responsibility headings. | Pass | Rendered sequence: `Leaders Hall`, `Guild Leadership`, `Contact & Profiles`, `The Council`, six leader names, `Responsibilities`, three responsibility titles. | No | Cards are `article` elements inside grid columns, matching documented current implementation. |
| Screen reader / semantics | Public Leaders images have alt text; the hidden atmosphere image remains hidden from assistive tech. | Pass | Hero/panel fixed alts rendered; leader/responsibility card alts rendered from JSON; atmosphere image had empty alt and `aria-hidden="true"`. | No | Header/footer brand images are shared site behavior. |
| Link behavior | Page-local internal links resolve and have usable touch targets. | Pass | `Open profile` linked to `./twills.html`; `Return to Home` linked to `./index.html`; both measured at 44px high. | No | Current Leaders data contains no page-local external links. |
| Content readability | Leadership duties remain clear; visible Leaders main content does not use `Where Winds Meet`. | Pass | Playwright text scan of `<main>` found no `Where Winds Meet`; duties rendered as plain text. | No | Titles, metadata, header, and footer may retain the game name per repo rules. |
| Renderer/data safety | The Council roster renders correctly and preserves leader order. | Pass | Rendered order: Twills, Vice Leader, Hall Leader, Isawisima, Sinbell, Meenari. | No | Order remains controlled by JSON array order; data was unchanged. |
| Renderer/data safety | Responsibility cards render correctly and preserve responsibility order. | Pass | Rendered order: Direction & strategy, Ops & coordination, Culture & people. | No | Order remains controlled by JSON array order; data was unchanged. |
| Renderer/data safety | Unsupported fields do not appear or break rendering. | Pass | Current renderer only uses documented hero, panel, council, leader, profile link, and responsibility fields. | No | No unsupported fields were added. |
| Shared shell / Supabase | `utils.js`, `site.js`, and `supabase.js` load without Leaders runtime errors for signed-out public browsing. | Pass | Local browser smoke showed HTTP 200, mounted header/footer, `window.MochiriiSupabase` present, and 0 console/page errors. | No | No Supabase behavior was changed. |

## Viewport Evidence

| Width | Status | Document/body width | Main overflow | Leaders | Responsibilities | Leader order | Responsibility order | Console errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 360px | 200 | 360/360 | 0 | 6 | 3 | Pass | Pass | 0 |
| 390px | 200 | 390/390 | 0 | 6 | 3 | Pass | Pass | 0 |
| 768px | 200 | 768/768 | 0 | 6 | 3 | Pass | Pass | 0 |
| 1440px | 200 | 1440/1440 | 0 | 6 | 3 | Pass | Pass | 0 |

## Fix Applied

- Added a Leaders-scoped mobile CSS rule for `#respGrid` responsibility media panels below 640px.
- The change increases only the mobile responsibility panel height; it does not alter Leaders data, copy, leader order, profile links, assets, or Supabase behavior.
- Post-fix 360px smoke measured the `Culture & people` responsibility plate with a 35.4px top gap and 16px bottom gap inside the media panel.
- Because the change is in shared `styles.css`, Home, Join, Events, Gallery, Codex, Ranks, and Recruitment were included in local regression smoke.
- No Leaders-specific cache query parameter exists in the current page shell, so no cache query was changed.
