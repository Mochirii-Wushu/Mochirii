# Gallery Behavior Matrix Suite

Date: 2026-05-14
Branch: `qa/gallery-behavior-matrix-suite`
PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/121>
Goal: G07
Mode: QA/report-only

## 1. Scope

This report documents a repeatable Gallery behavior matrix covering:

- static Gallery categories and counts
- category URL state
- invalid URL cleanup
- newest and oldest sorting
- Copy link status feedback
- browser Back/Forward state restoration
- pointer and keyboard lightbox behavior
- thumbnail versus full-image paths
- approved-feed failure fallback
- responsive no-overflow checks

No implementation files were changed.

No data files, Gallery captions, Gallery image assets, Supabase files, workflows, dependencies, or validation scripts were changed.

No Supabase database mutation was run. No Edge Functions were deployed.

## 2. Files Inspected

- `reports/codex-goal-roadmap.md`
- `reports/gallery-approved-feed-integration-review.md`
- `gallery.html`
- `gallery.js`
- `site.js`
- `styles.css`
- `scripts/smoke-gallery-lightbox.mjs`
- `data/gallery.json`
- `docs/gallery-guide.md`

## 3. Matrix Method

The matrix was run with temporary Playwright probes against the local static server:

- URL: `http://127.0.0.1:8765/gallery.html`
- Default viewport: `390px`
- Additional overflow viewports: `360px`, `390px`, `768px`, `1440px`

No test script was added to the repository because the roadmap allowed an optional future script only if explicitly approved. This branch keeps G07 report-only.

## 4. Expected Static Counts

Counts were derived from `data/gallery.json`:

| Category | Expected count |
| --- | ---: |
| All | 73 |
| Portraits | 23 |
| Gatherings | 22 |
| Action | 7 |
| Scenery | 6 |
| Companions | 15 |

## 5. Matrix Results

| Check | Expected | Result |
| --- | --- | --- |
| `category=all` | 73 images, All pressed | Passed. |
| `category=portraits` | 23 images, Portraits pressed | Passed. |
| `category=gatherings` | 22 images, Gatherings pressed | Passed. |
| `category=action` | 7 images, Action pressed | Passed. |
| `category=scenery` | 6 images, Scenery pressed | Passed. |
| `category=companions` | 15 images, Companions pressed | Passed. |
| Invalid category and sort | Falls back to All/random and cleans URL to `/gallery.html` | Passed. |
| `sort=newest` | 73 images, newest order active | Passed. First three full images: `shot-71`, `shot-72`, `shot-73`. |
| `sort=oldest` | 73 images, oldest order active | Passed. First three full images: `shot-01`, `shot-02`, `shot-03`. |
| Copy link | Status becomes `Link copied` or `Copy failed` without breaking page | Passed with `Link copied`. |
| Browser Back/Forward | Back returns to All; Forward restores Portraits | Passed. |
| Lightbox pointer open | Opens full image, not `/thumbs/`; Escape closes | Passed. |
| Lightbox keyboard open | Enter on focused thumbnail opens full image; Escape closes | Passed. |
| Approved-feed failure | `approvedFeed=1` failure falls back to 73 static items | Passed with one expected console warning and no console errors. |
| Responsive overflow | No horizontal overflow at 360, 390, 768, or 1440 | Passed. |

Total: 16 / 16 checks passed.

## 6. Behavior Notes

- Category filters preserve `aria-pressed` state.
- Invalid category/sort query values are normalized without leaving a stale broken URL.
- Copy link preserves the current category URL.
- Browser navigation restores filter state and counts.
- Static Gallery grid uses thumbnail paths from `assets/img/gallery/thumbs/`.
- Static lightbox opens full image paths outside `/thumbs/`.
- Approved-feed failure does not hide or corrupt static Gallery content.
- The expected approved-feed failure warning is informational, not a console-breaking error.

## 7. Limitations

The matrix was intentionally run as a temporary QA probe. A committed dependency-free script could be added in a future branch if the user wants this promoted into the permanent validation suite.

Live production approved-feed success remains covered by G09 or a separately approved production smoke with explicit test-data boundaries.

## 8. Findings

No G07 blocker was found. No code fix was required.

Follow-up notes:

1. G08 should document the moderation runbook for humans operating the review queue.
2. A future branch could promote this matrix into a repo script if desired.

## 9. Validation Summary

G07-specific checks completed:

- Gallery behavior source inspection.
- 16-check temporary browser matrix.
- Category/filter/count checks.
- Sort URL checks.
- Copy link and history navigation checks.
- Lightbox pointer/keyboard checks.
- Approved-feed failure fallback check.
- Responsive no-overflow checks.

Final command validation is recorded in the roadmap and PR after this report is committed.

Final command validation:

| Command | Result |
| --- | --- |
| `npm run check` | Passed, with the known intentional MP3 size warning. |
| `git diff --check` | Passed. |
| `node scripts/check-json.mjs` | Passed. |
| `node scripts/check-js.mjs` | Passed. |
| `node scripts/check-refs.mjs` | Passed. |
| `node scripts/check-assets.mjs` | Passed, with the known intentional MP3 size warning. |
| `npm run check:production` | Passed. |
| `npm run smoke:gallery` | Passed. |
| `git diff -- data/ --stat` | Empty. |

## 10. Safety Confirmation

- No data files changed.
- Existing Gallery captions were not changed.
- Protected content was not changed.
- No secrets were committed.
- No `supabase db push` was run.
- No Edge Functions were deployed.
- No migrations were created.
- No dependencies were added.
- No validation scripts were changed.

## 11. Next Recommended Item

G08 - `docs/member-gallery-moderation-runbook`
