# Join Mobile Accessibility Review

Branch: `qa/join-mobile-accessibility-review`

Date: 2026-05-03

## Scope

This review covered the Join page only, using the current implementation in `join.html`, `join.js`, `data/join.json`, `styles.css`, `docs/join-guide.md`, and `reports/join-implementation-inventory.md`.

No Join data, Join copy, newcomer checklist content, assets, workflows, validation scripts, recruitment content, or guild seal poem text were changed.

## Audit Findings

| Area | Finding | Severity | Evidence | Fix needed? | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile layout | Join renders without horizontal overflow at 360px, 390px, 768px, and 1440px. | Pass | Playwright reported `scrollWidth === clientWidth` for all checked widths. | No | Hero, steps, quick start, checklist, culture, and notes all rendered. |
| Hero/intro readability | Hero title, metadata, intro, and badges render cleanly. | Pass | Hero rendered 4 badges, updated metadata, timezone, and intro at every checked width. | No | Metadata may retain game-name usage in page title/meta, but main body does not. |
| Joining path/steps spacing | Joining path renders as an ordered list with 5 steps and readable paragraph spacing. | Pass | `#joinStepsList` rendered 5 list items and no overflow. | No | Step content remains direct and practical. |
| Quick start layout | Quick start renders 2 paragraphs and 4 links, but link hit areas are text-height only. | P3 | Quick-start links measured about 17px tall at 360px/390px/768px/1440px. | Yes | Expand only Join quick-start badge links to match the existing 44px touch pattern. |
| Newcomer checklist layout | Checklist renders 5 cards, but checklist link hit areas are below common touch guidance. | P3 | Checklist links measured about 31px tall at checked widths. | Yes | Increase checklist link min-height without changing checklist content or behavior. |
| Culture/notes spacing | Culture cards and notes render without layout issues. | Pass | Culture rendered 4 cards, notes rendered 3 paragraphs and 2 links. | No | Notes badge links share the same small badge-link target issue as quick start. |
| CTA/link layout | Discord and internal links resolve with expected labels; Discord links use safe external-link attributes. | Pass | Discord links had `target="_blank"` and `rel="noopener noreferrer"`; internal links resolved locally. | No | Link target size fix is CSS-only. |
| Keyboard behavior | Tab order reaches header controls, quick-start links, checklist links, notes links, and footer links without traps. | Pass | Keyboard trace reached Join Discord, Events, Guild Codex, Ranks, Open Discord, Read the Codex, View Events, Leaders Hall, and Home. | No | Mobile menu opened with Enter and closed with Escape, returning focus to the menu button. |
| Focus visibility | Focus is visible on shared controls and Join links. | Pass | Focus outline appeared on quick-start links, checklist links, and notes links. | No | The touch-target fix also makes focus rectangles easier to see. |
| Screen reader / semantics | Heading order and list structure are sensible. | Pass | One `h1`; main sections use `h2`; side/cards/checklist titles use `h3`; steps use `ol`; checklist uses `ul`. | No | Decorative checklist markers are `aria-hidden`. |
| Content readability | Onboarding and checklist copy remain clear and practical. | Pass | Existing rendered content was reviewed; no copy edits were needed. | No | Main Join body copy does not visibly use `Where Winds Meet`. |
| Renderer/data safety | Existing data shape renders correctly and unsupported fields do not appear. | Pass | Rendered counts matched data: 4 hero badges, 5 steps, 4 quick links, 5 checklist items, 4 culture cards, 2 note links. | No | `utils.js` and `site.js` behavior remained intact. |
| Runtime errors | Join loads without console-breaking errors. | Pass | No console errors or page errors on `/join.html` at checked widths. | No | `#joinError` remained empty. |
| Regression pages | Home, Events, Gallery, Codex, and Recruitment loaded at 390px without document overflow or console errors. | Pass | Local smoke returned 200 for all regression pages with `scrollWidth === clientWidth`. | No | Regression checks were repeated after the CSS fix. |

## Fix Decision

Confirmed issue: Join quick-start badge links, notes badge links, and checklist links exposed smaller-than-expected touch/focus hit areas.

Planned fix:

- Use Join-scoped CSS only.
- Expand quick-start and notes badge-row anchor hit areas to the visible pill.
- Raise checklist link minimum height to 44px.
- Preserve Join data, link labels, destinations, checklist content, and renderer behavior.

## Fix Applied

Updated `styles.css` with page-scoped Join selectors only:

- `#joinLinks > span > a`
- `#joinNotesBadges > span > a`
- `.join-checklist__link`

Post-fix browser checks:

- Quick-start and notes badge links measured 56px tall.
- Checklist links measured 45px tall.
- Tab focus reached all Join links with visible outlines.
- Mobile menu still opened with Enter, closed with Escape, and returned focus.
- `/join.html` still had no horizontal overflow at 360px, 390px, 768px, or 1440px.
- Home, Events, Gallery, Codex, and Recruitment regression pages still loaded at 390px without horizontal overflow.

No cache query parameter was added because this branch did not establish a Join cache-query convention and the change is normal site CSS.
