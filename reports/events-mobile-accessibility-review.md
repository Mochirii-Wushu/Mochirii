# Events Mobile Accessibility Review

Branch: `qa/events-mobile-accessibility-review`

Scope: focused QA review of Events mobile layout, keyboard behavior, filter accessibility, date behavior, empty states, and touch ergonomics.

## Audit Findings

| Area | Finding | Severity | Fix needed? | Notes |
|---|---|---:|---:|---|
| Mobile layout | Events page has no horizontal overflow at 360px, 390px, 768px, or desktop width. | Pass | No | Verified with Playwright viewport measurements. |
| Filter wrapping | Upcoming, Past, and All wrap cleanly on phone widths. | Pass | No | Filter row remains stable at 360px and 390px. |
| Event card spacing | Past and All render the archived event card with readable spacing. | Pass | No | Current single event appears under Past and All as expected. |
| Empty-state readability | Upcoming empty state is readable and announced through the event board region. | Pass | No | Current data has no upcoming events as of May 3, 2026. |
| Keyboard behavior | Tab reaches filters and event links; Enter and Space activate filters. | Pass | No | Verified `Past` with Enter and `All` with Space. |
| Focus visibility | Focus is visible on filters, header controls, and Events links. | Pass | No | Existing focus-visible styles are clear. |
| Screen reader filter state | Filters are real buttons and update `aria-pressed` correctly. | Pass | No | Active state moved correctly across Upcoming, Past, and All. |
| Event count/status | Event count updates in a polite live region. | Pass | No | Count reads `Upcoming: none posted`, `Past: 1 event`, and `All: 1 event`. |
| Date behavior | Date displays as `Feb 27, 2026`; current UTC-safe classification places it under Past and All. | Pass | No | No one-day drift observed in rendered event-board date. |
| Touch target size | Event filter buttons measured about 37px tall on phone widths. | P3 | Yes | Increase Events filter minimum height to common 44px touch guidance. |
| Event link tap area | Event pill links and participation links showed a 33px visual pill but only the inner text was clickable. | P3 | Yes | Expand Events badge links so the visible pill area is the interactive target. |
| Regression behavior | Filtering does not reload the page; no regular Events body copy uses the exact game name; no Join/Recruitment/Codex duplication observed. | Pass | No | Metadata/header/footer usage remains allowed. |
| Console/runtime | No console-breaking errors observed during local smoke. | Pass | No | Checked while switching filters at requested viewport widths. |

## Fix Plan

- Increase Events filter button minimum height to 44px.
- Expand Events badge-row anchor hit areas without changing text, links, data, dates, filters, or behavior.

## Fix Verification

- Rechecked 360px, 390px, and 768px mobile/tablet widths after the CSS patch.
- Event filters now measure 44px tall.
- Events badge links now expose larger interactive targets while keeping the same visible labels and destinations.
- Upcoming, Past, and All still update count text and `aria-pressed` state without reloading the page.
- Past and All still show the current event date as `Feb 27, 2026 • 5:00 PM • UTC+8`.
- No horizontal overflow or console-breaking errors were observed.
