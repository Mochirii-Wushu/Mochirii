# Gallery Approved Feed Integration Review

Date: 2026-05-14
Branch: `qa/gallery-approved-feed-integration-review`
PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/119>
Goal: G06
Mode: QA/report-only

## 1. Scope

This review checked the public Gallery approved-feed integration across:

- static Gallery loading
- `approvedFeed` URL behavior on localhost
- approved-feed Edge Function failure fallback
- approved submission normalization
- member-submission category/filter integration
- signed URL rendering
- private Storage path exposure
- lightbox full-image behavior

No implementation files were changed.

No data files, Gallery captions, Gallery image assets, migrations, Edge Functions, workflows, dependencies, or Supabase configuration were changed.

No Supabase database mutation was run. No Edge Functions were deployed.

## 2. Files Inspected

- `reports/codex-goal-roadmap.md`
- `reports/member-gallery-end-to-end-review.md`
- `gallery.html`
- `gallery.js`
- `site.js`
- `supabase.js`
- `scripts/smoke-gallery-lightbox.mjs`
- `data/gallery.json`
- `docs/gallery-guide.md`

## 3. Implementation Review

- `gallery.js` keeps static Gallery data as the baseline and loads approved member submissions only when `shouldLoadApprovedFeed()` allows it.
- Localhost does not load the approved feed unless the `approvedFeed` query parameter is present.
- Failed approved-feed responses warn in the console and return an empty approved-feed list, preserving the static Gallery.
- Approved submissions require `signed_url`; missing signed URLs are ignored.
- Approved submissions use the signed URL for `src`, `thumb`, and `full`.
- Member submissions receive the `member-submissions` category in addition to their normalized submission category when applicable.
- Static Gallery items keep their thumbnail/full split, so the grid uses `/thumbs/` and the lightbox opens full images.

## 4. Browser Smoke Results

Local static server: `http://127.0.0.1:8765`

Viewport: `390px`

| Scenario | Result |
| --- | --- |
| Static only | Rendered 73 static Gallery items. Filters counted All 73, Portraits 23, Gatherings 22, Action 7, Scenery 6, Companions 15. First grid image used `/thumbs/`; lightbox opened the full image path. |
| Approved feed failure | `gallery.html?approvedFeed=1` rendered 73 static items after mocked Edge Function failure. No page error rendered; one console warning documented the feed failure; lightbox still opened full static images. |
| Approved feed success | `gallery.html?approvedFeed=1&category=member-submissions&sort=newest` rendered one mocked approved member item in the active Member Submissions filter and All count increased to 74. |

All scenarios returned `200`, had no horizontal overflow at `390px`, and produced no console-breaking errors.

## 5. Signed URL and Storage Path Review

The approved-feed success smoke used a mocked submission with:

- an intended short-lived signed URL
- a private `storage_bucket`
- a private `storage_path`

Result:

- The signed URL appeared in the rendered image `src`, `thumb`, `full`, and lightbox source as intended.
- The private `storage_path` did not appear in visible text or rendered HTML.
- No signed URL or Storage path was written to any data file.

## 6. Lightbox Review

- Static Gallery grid thumbnails still use `assets/img/gallery/thumbs/`.
- Static Gallery lightbox opens the corresponding full image path outside `/thumbs/`.
- Approved member Gallery items use the signed URL for grid and lightbox, matching the approved-feed contract.
- Escape closes the lightbox and restores `aria-hidden="true"`.

## 7. Limitations

The following require approved production scope or a separate test-account workflow:

- Live Edge Function response with production approved member submissions.
- Signed URL expiry timing against production Storage.
- Production CDN/cache behavior for signed URLs.

Those remain better suited to G09 or a separately approved production smoke.

## 8. Findings

No G06 blocker was found. No code fix was required.

Follow-up notes:

1. G07 should broaden Gallery browser coverage across category URL state, sorting, copy-link behavior, and lightbox regression cases.
2. G09 can verify the production approved-feed path with explicit test-account/data boundaries if approved.

## 9. Validation Summary

G06-specific checks completed:

- Gallery source inspection.
- Static-only browser smoke.
- Approved-feed failure browser smoke.
- Approved-feed success browser smoke.
- Signed URL and private Storage path exposure check.
- Static and approved-feed lightbox smoke.

Final command validation is recorded in the roadmap and PR after this report is committed.

Final command validation:

| Command | Result |
| --- | --- |
| `npm run check` | Passed, with the known intentional MP3 size warning. |
| `git diff --check` | Passed. |
| `node --check gallery.js && node --check supabase.js` | Passed. |
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
- No Supabase configuration was changed.

## 11. Next Recommended Item

G07 - `qa/gallery-behavior-matrix-suite`
