# Gallery Mobile Accessibility Review

Branch: `qa/gallery-mobile-accessibility-review`

Scope: focused QA review of Gallery mobile layout, keyboard/touch ergonomics, filter wrapping, Copy link feedback, URL state, and lightbox accessibility.

## Audit Findings

| Area | Finding | Severity | Fix needed? | Notes |
|---|---|---:|---:|---|
| Mobile layout | Gallery filters wrap without horizontal overflow at 360px, 390px, and 768px. Grid remains stable at 2 columns on phone widths and 3 columns at tablet width. | Pass | No | Verified with Playwright viewport checks. |
| Mobile filter wrapping | Count labels remain readable. At 360px filters wrap into three rows with Copy link below; at 390px filters wrap into two rows with Copy link below. | Pass | No | Layout is compact and stable. |
| Touch target size | Filter buttons and Copy link measured about 37px tall on phone widths. This is usable, but a small mobile-only increase would better match common 44px touch guidance. | P3 | Yes | Apply a narrow mobile CSS polish only. |
| Copy link placement | Copy link appears near the filters, remains keyboard reachable, and does not overflow on phone/tablet widths. | Pass | No | Verified at 360px, 390px, 768px, and desktop. |
| Keyboard behavior | Tab reaches filters, Copy link, and gallery item buttons. Enter opens a focused gallery item. Escape closes the lightbox. | Pass | No | Lightbox close button receives focus when opened. |
| Focus return | Closing the lightbox returns focus to the triggering gallery thumbnail button. | Pass | No | Verified after keyboard-opened lightbox close. |
| Touch behavior | Gallery thumbnails are large tap targets. Lightbox close button is 44px by 44px. | Pass | No | Only filter/Copy button height needed minor polish. |
| Screen reader behavior | Filters keep `aria-pressed`; labels include counts such as `Portraits, 16 images`; Copy link feedback uses a polite live region. | Pass | No | No duplicate or noisy announcement issue observed. |
| URL state | Direct category URLs load the correct selected filter and count. Invalid category falls back to All and cleans the URL. | Pass | No | Verified for all current categories and `bad-slug`. |
| Copy link behavior | Copy link copies the current Gallery URL, including selected category state. | Pass | No | Verified with clipboard readback in local browser smoke. |
| Back/Forward | Browser Back/Forward updates selected filter, count, and Copy link target. | Pass | No | Verified with Portraits/Companions navigation. |
| Lightbox behavior | Lightbox opens full image paths, not `/thumbs/`; caption and alt text render; no mobile viewport overflow observed. | Pass | No | Verified with keyboard and click smoke. |
| Console/runtime | No console-breaking errors observed during local smoke. | Pass | No | Checked across mobile/tablet/desktop viewports. |

## Fix Plan

- Increase Gallery filter and Copy link minimum touch height on phone widths only.
- Do not change Gallery data, categories, counts, URL state, Copy link logic, image paths, captions, or lightbox behavior.
