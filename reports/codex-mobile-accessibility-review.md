# Codex Mobile Accessibility Review

Branch: `qa/codex-mobile-accessibility-review`

Date: 2026-05-03

## Scope

This review covered the Codex page only, using the current implementation in `codex.html`, `codex.js`, `data/codex.json`, `styles.css`, `docs/codex-guide.md`, and `reports/codex-implementation-inventory.md`.

No Codex data, copy, renderer limits, assets, workflows, validation scripts, recruitment content, or guild seal poem text were changed.

## Audit Findings

| Area | Finding | Severity | Fix needed? | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile layout | Codex renders without horizontal overflow at 360px, 390px, 768px, and 1440px. | Pass | No | Playwright reported `scrollWidth === clientWidth` for all checked widths. | Footer swipe-column children extend inside their own scroll row but do not create document overflow. |
| Hero/intro readability | Hero title, intro paragraphs, and summary pills render at mobile and desktop sizes. | Pass | No | Hero rendered 2 intro paragraphs and 3 hero pills at every checked width. | Shared hero/card styles remain readable. |
| Tenet pill wrapping | Tenet pills wrap normally and do not overflow. | Pass | No | Tenets rendered 3 pills and 6 cards at all checked widths. | Renderer cap of 12 pills remains safe. |
| Section card spacing | Tenets, rhythm, and recognition cards stack cleanly on mobile and keep two-column layout where viewport allows. | Pass | No | Tenets rendered 6 cards, rhythm 4 cards, recognition 3 cards; no console errors or overflow. | Shared grid collapse at `max-width: 980px` is working. |
| Etiquette block spacing | Etiquette blocks render as readable list cards on mobile. | Pass | No | Etiquette rendered 4 blocks; largest block rendered 4 list items. | Renderer cap of 6 blocks and 10 list items remains safe. |
| Recognition/ranks link layout | `View Ranks` and `Return to Home` are reachable, readable, and meet 44px touch height. | Pass | No | Link rects measured 99x44 and 128x44 at 390px. | `View Ranks` resolves to `ranks.html`. |
| Keyboard behavior | Tab order reaches skip link, header links, mobile menu button, Codex links, and footer links without traps. | Pass | No | Keyboard trace reached `#recLink` and `Return to Home`; mobile menu opened with Enter and closed with Escape. | Focus returned to `#menu-btn` after Escape. |
| Focus visibility | Codex links and shared header/footer controls retain visible focus states. | Pass | No | `#recLink` focus showed a 2px gold outline plus focus background/border. | No Codex-specific button exists. |
| Screen reader / semantics | Heading order is sensible: one `h1`, major sections use `h2`, rendered cards/list blocks use `h3`. | Pass | No | Playwright heading inventory found one `h1`, then section `h2`s and card/list `h3`s. | The intro side badge is also an `h2`; this matches the documented implementation and does not block navigation. |
| Content readability | Conduct guidance remains direct, page-specific, and readable. | Pass | No | Main Codex body text does not contain `Where Winds Meet`; text renders from existing JSON. | No copy edits were needed. |
| Renderer limits / data safety | Current data stays within renderer limits and unsupported fields are not rendered. | Pass | No | Hero pills 3/12, tenet pills 3/12, tenet cards 6/12, etiquette blocks 4/6, list items max 4/10, rhythm cards 4/12. | No unsupported link, category, tag, filter, or URL-state fields are present. |
| Runtime errors | Codex loads without console-breaking errors. | Pass | No | No console errors or page errors on `/codex.html` at checked widths. | `#codexError` remained empty. |
| Regression pages | Home, Join, Events, Gallery, and Recruitment loaded at 390px without document overflow or console errors. | Pass | No | All regression pages returned 200 locally with `scrollWidth === clientWidth`. | No shared CSS changes were made. |

## Manual Smoke Summary

- `/codex.html` loaded locally at 360px, 390px, 768px, and 1440px.
- Hero, intro, tenets, etiquette, rhythm, and recognition sections rendered.
- `View Ranks` and `Return to Home` links rendered with 44px touch height.
- Keyboard focus reached Codex links and remained visible.
- Mobile menu opened with Enter, closed with Escape, and returned focus.
- No horizontal overflow was found.
- No console-breaking errors were found.
- Main Codex body copy does not visibly use `Where Winds Meet`.

## Fix Decision

No confirmed Codex mobile, keyboard, semantic, readability, renderer-limit, or overflow issue was found. This branch is report-only.
