# Gallery Approved Feed Regression Matrix

Date: 2026-05-15
Branch: `qa/gallery-approved-feed-regression-matrix`
Mode: QA/report-first

## 1. Scope

This review proves the current static Gallery plus approved member feed behavior across local and production-safe paths. It covers signed URLs, failure fallback, random/newest/oldest sorting, categories, the `member-submissions` category, Home spotlight expectations, lightbox behavior, caption/uploader display, pending/rejected leak checks, and automation recommendations.

No Gallery data, Gallery images, CSS, JavaScript, Supabase data, Supabase configuration, migrations, Edge Functions, workflows, validation scripts, or protected content were changed.

No Supabase mutation was performed. No Edge Functions were deployed.

## 2. Files And Reports Inspected

- `gallery.html`
- `gallery.js`
- `home.js`
- `data/gallery.json`
- `supabase.js`
- `supabase/functions/list-approved-gallery-submissions/index.ts`
- `reports/gallery-approved-feed-integration-review.md`
- `reports/gallery-behavior-matrix-suite.md`
- `reports/cross-site-post-gallery-randomization-review.md`
- `reports/home-gallery-spotlight-rotation-review.md`

## 3. Source Behavior Summary

| Area | Current behavior |
| --- | --- |
| Static Gallery baseline | `data/gallery.json` contains 73 static items across Portraits, Gatherings, Action, Scenery, and Companions. |
| Local approved-feed loading | Localhost skips approved feed unless `approvedFeed=1` is present. |
| Production approved-feed loading | Production loads the approved feed by default. |
| Public approved-feed function | `list-approved-gallery-submissions` is intentionally public and uses server credentials in Edge runtime. |
| Pending/rejected protection | The Edge Function query applies `.eq("status", "approved")` before returning submissions. |
| Signed URL rendering | Approved member submissions use the signed URL for `src`, `thumb`, and `full`. |
| Member category | Approved member submissions receive `member-submissions` plus the submitted normalized category. |
| Home spotlight | `home.js` reads only `data/gallery.json`; it does not call the approved-feed helper. |

## 4. Static Gallery Behavior Matrix

Local static server: `http://127.0.0.1:8765`

| Scenario | Expected | Result |
| --- | --- | --- |
| Default static Gallery | 73 items, All active, random sort. | Passed: 73 items, `Showing 73 of 73 images.`, All active, random sort. |
| Static filters | All 73, Portraits 23, Gatherings 22, Action 7, Scenery 6, Companions 15. | Passed. |
| Thumbnail path | Grid images use `/thumbs/`. | Passed for static views. |
| `sort=newest` | 73 items, newest sort active, newest timestamp order. | Passed; first static full paths began with `shot-71`, `shot-72`, `shot-73`. |
| `sort=oldest` | 73 items, oldest sort active, oldest timestamp order. | Passed; first static full paths began with `shot-01`, `shot-02`, `shot-03`. |
| Private path text | No `storage_path`, `storagePath`, or private bucket text in visible page text. | Passed. |
| Pending/rejected visible text | No pending/rejected status text in static public Gallery. | Passed. |

## 5. Approved Feed Behavior Matrix

| Scenario | Expected | Result |
| --- | --- | --- |
| Local approved feed success | `gallery.html?approvedFeed=1&category=member-submissions&sort=newest` loads approved feed. | Passed: All count became 74, Member Submissions count was 1, member filter active, sort newest. |
| Production member-submissions filter | Production `gallery.html?category=member-submissions&sort=newest` renders approved member submissions. | Passed: All count 74, Member Submissions count 1. |
| Public approved-feed response | Public function returns approved submissions only, without raw status fields. | Passed: response status 200, count 1, no `status` field, no pending/rejected status values. |
| Approved-feed failure | If the function fails, static Gallery remains usable. | Passed: mocked `503` left 73 static items and emitted one expected warning. |
| Member submission category | Member item appears in `member-submissions` and All counts. | Passed. |
| Signed URL behavior | Approved item uses a short-lived signed object URL as image source. | Passed. The signed URL appears in `src`/`full` as intended; no signed URLs were copied into this report. |
| Raw Storage field exposure | `storage_path`/`storagePath` fields should not render as public text. | Passed for visible text and function response keys. The signed image URL necessarily contains a signed object path as part of Supabase Storage delivery. |

## 6. Sorting And Category Behavior

| Mode | Static result | Approved-feed result |
| --- | --- | --- |
| Random | Static default shuffles 73 items on page load. | Production All includes approved member item in the random pool by source design. |
| Newest | Static newest order is timestamp-based. | Member-submissions newest view rendered the approved member item. |
| Oldest | Static oldest order is timestamp-based. | Member-submissions has one current production item, so order is not meaningful yet. |
| Category filters | Declared static categories keep expected counts. | Member submissions add an inferred `Member Submissions` category. |
| Invalid/empty category | Prior Gallery matrix proved invalid URLs fall back to All and clean the URL. | Same category normalization applies after approved items are merged. |

## 7. Home Spotlight Interaction

Home spotlight remains intentionally static-data based:

- `home.js` fetches `./data/gallery.json`.
- `pickGallerySpotlightItems()` flattens and shuffles only static Gallery items.
- Browser check rendered 4 Home spotlight links.
- All Home spotlight images used local thumbnail paths.
- No Home spotlight item used a signed URL.
- Home spotlight links routed to static category URLs such as `./gallery.html?category=gatherings`.

Recommendation: keep this static-only behavior unless a future product branch explicitly decides that approved member submissions should appear on Home.

## 8. Lightbox Behavior

| Item type | Grid source | Lightbox source | Result |
| --- | --- | --- | --- |
| Static Gallery | Thumbnail path under `assets/img/gallery/thumbs/`. | Full image path outside `/thumbs/`. | Covered by `npm run smoke:gallery` and prior matrix reports. |
| Approved member item | Signed URL. | Same signed URL. | Current design is correct because no separate thumbnail pipeline exists for private member uploads. |

No lightbox regression was found.

## 9. Caption And Uploader Display

Source behavior:

- Approved item caption uses title and/or caption.
- If uploader display is available, the lightbox caption adds `Submitted by <name>`.
- If title/caption are blank, the fallback is `Member submission`.
- Static Gallery captions remain owned by `data/gallery.json`.

Current production member-submission rendering did not expose private status text or raw `storage_path` text in visible page text.

## 10. Pending/Rejected Leak Checks

Evidence:

- Edge Function source selects from `gallery_submissions` and applies `.eq("status", "approved")`.
- Public approved-feed response returned no `status` field.
- Public approved-feed response count was 1 and contained no pending/rejected status values.
- Browser visible text for static and member-submissions views contained no pending/rejected status text.

Limitation:

- This branch did not create pending/rejected production test data, so it did not mutate production state to prove a negative with fresh records. That belongs in an approved test-account workflow.

## 11. Production And Local Differences

| Behavior | Localhost | Production |
| --- | --- | --- |
| Approved feed default | Skipped unless `approvedFeed=1` is present. | Loaded by default. |
| Static fallback | Always available. | Available if approved feed fails. |
| Signed URL source | Remote signed URL when `approvedFeed=1` is used. | Remote signed URL by default. |
| Home spotlight | Static `data/gallery.json` only. | Static `data/gallery.json` only. |
| Mutation risk | None from read-only rendering. | None from read-only rendering. |

## 12. Automation Recommendations

Safe to automate:

- Static count/filter checks.
- Newest/oldest sort checks.
- Invalid category cleanup.
- Copy link and Back/Forward checks.
- Lightbox thumbnail-vs-full check.
- Approved-feed failure fallback with a mocked Edge Function response.
- Home spotlight count/static-source checks.
- Public approved-feed response shape without logging signed URLs.

Keep manual or separately approved:

- Creating pending/rejected records to prove non-leakage with fresh data.
- Signed URL expiry timing.
- Storage cleanup.
- Upload-to-approval lifecycle.
- Any test that prints signed URLs or private object paths into reports/logs.

## 13. Findings

No N03 blocker was found.

Follow-up notes:

1. A future script branch can promote the current Gallery matrix into a repeatable local smoke check.
2. A product branch should explicitly decide whether Home spotlight remains static-only or includes approved member uploads.
3. Test-account workflow should eventually prove pending/rejected non-leakage with controlled production test records and cleanup approval.

## 14. Safety Confirmation

- No data files changed.
- No Gallery images changed.
- No Gallery JavaScript changed.
- Existing Gallery captions were not changed.
- Protected content was not changed.
- No Supabase data was mutated.
- No `supabase db push` was run.
- No Edge Functions were deployed.
- No signed URLs were written into repository files.

## 15. Next Recommended Item

Continue to N04: `qa/accessibility-name-and-member-pages-review`.
