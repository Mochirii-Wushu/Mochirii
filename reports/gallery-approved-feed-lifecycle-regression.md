# Gallery Approved Feed Lifecycle Regression

Date: 2026-05-15
Branch: `qa/gallery-approved-feed-lifecycle-regression`
Mode: QA / report-first

This review verifies that public Gallery and approved-feed behavior remains safe under the member Gallery lifecycle assumptions documented in the F02 lifecycle plan and F03 cleanup safety review. It uses current code, existing local-safe smoke automation, and source inspection only.

No live OAuth, upload, moderation action, approval/rejection, cleanup, Storage deletion, Supabase production mutation, schema change, RLS policy change, Storage policy change, Edge Function deployment, Gallery data edit, Gallery image edit, protected-content edit, public-copy change, CSS change, secret commit, or credential commit was performed.

## 1. Source Evidence

Files inspected:

- `gallery.js`
- `supabase.js`
- `scripts/smoke-gallery-approved-feed.mjs`
- `supabase/functions/list-approved-gallery-submissions/index.ts`
- `supabase/functions/list-gallery-review-queue/index.ts`

Reports inspected:

- `reports/gallery-approved-feed-regression-matrix.md`
- `reports/gallery-approved-feed-smoke-automation.md`
- `reports/member-gallery-lifecycle-cleanup-plan-v2.md`
- `reports/member-gallery-cleanup-safety-review.md`

Current repo facts:

- Localhost skips the approved feed unless `approvedFeed=1` is present.
- Production loads the approved feed by default.
- The public approved-feed Edge Function queries only `gallery_submissions` rows with `status = 'approved'`.
- Public approved-feed items are converted into Gallery items only when a `signed_url` is present.
- Approved member items use the signed URL as `src`, `thumb`, and `full`.
- Approved member items join `member-submissions` and the submitted category when present.
- The Home Gallery Spotlight reads static `data/gallery.json` only.
- `scripts/smoke-gallery-approved-feed.mjs` already includes a local mock backend with one approved item plus pending and rejected non-public mock records.

## 2. Static Gallery Fallback

Static Gallery fallback remains stable.

Evidence:

- `gallery.js` builds static items from `data/gallery.json` before approved feed items are merged.
- `loadApprovedSubmissionItems()` returns an empty list when the approved feed is skipped or fails.
- The smoke script verifies the localhost default path does not call the approved feed and renders the static Gallery count from `data/gallery.json`.
- The smoke script verifies approved-feed failure leaves the static Gallery usable and preserves static newest sort behavior.

Lifecycle result: public Gallery can remain usable even if approved-feed lifecycle data is unavailable or the public Edge Function fails.

## 3. Approved Feed Mock

The approved-feed mock remains suitable for non-mutating lifecycle regression.

Evidence:

- The smoke intercepts the Supabase browser client and mocks `list-approved-gallery-submissions`.
- The mock backend includes one approved item and separate pending/rejected records.
- The mocked public response filters to approved records before returning data to `gallery.js`.
- The approved item renders under the `member-submissions` category.
- The All filter count includes the approved member item.

Lifecycle result: approved items can be represented in the public Gallery pool without relying on live credentials, live Storage, or production mutations.

## 4. Pending And Rejected Non-Leakage

Pending and rejected lifecycle states remain non-public in current source and smoke coverage.

Evidence:

- `list-approved-gallery-submissions` applies `.eq("status", "approved")`.
- The public approved-feed response does not need to return raw status fields to the browser.
- The smoke mock keeps pending and rejected records in the mock backend but filters them out of the public response.
- The smoke asserts that pending and rejected mock titles do not appear in public Gallery visible text.

Lifecycle result: pending and rejected submissions should stay private unless a future code branch changes the approved-feed contract. Any future lifecycle state must preserve the same public fail-closed rule.

Limitation: this milestone does not create fresh pending/rejected production records because disposable test accounts are unavailable and production mutation is forbidden.

## 5. Hidden Lifecycle Assumption

The F02 plan uses `hidden` as a future lifecycle label, but the current schema and UI use `archived` as the closest retained non-public state.

Current behavior:

- The approved feed queries only `approved`, so `archived` rows are not public.
- `hidden` is not a current database status.
- If `hidden` is added later, it must be introduced through a separate schema/function/UI/QA branch and must not be included in the public approved-feed query.

Lifecycle result: hidden/archived assumptions are safe as planning language only. No current public Gallery behavior depends on a `hidden` status.

## 6. Signed URL Display

Signed URL display remains correct for the current approved-feed design.

Evidence:

- `gallery.js` rejects approved submissions without `signed_url`.
- Approved member items use `signed_url` for `src`, `thumb`, and `full`.
- The smoke verifies the approved item uses the mock signed URL as the grid image source and lightbox image source.
- Static Gallery images still use thumbnail paths in the grid and full image paths in the lightbox.

Lifecycle result: approved member uploads remain private Storage objects that become publicly viewable only through short-lived signed URLs returned by the approved-feed Edge Function.

## 7. Sorting And Category Stability

Sorting and category behavior remains stable under lifecycle assumptions.

Evidence:

- `gallery.js` merges static items and approved feed items into one item pool.
- `member-submissions` is inferred when approved member submissions exist.
- Approved member submissions also retain their submitted normalized category when present.
- The smoke verifies static newest/oldest sort, Portraits filter, Member Submissions filter, and approved-feed failure fallback.

Lifecycle result: pending/rejected/archived/hidden items should not affect public counts, filters, or sorting because they are not part of the public item pool.

## 8. Home Spotlight Expectations

Home Gallery Spotlight remains static-data based and unaffected by member lifecycle states.

Evidence:

- `home.js` reads `data/gallery.json`, not the approved-feed helper.
- `scripts/smoke-gallery-approved-feed.mjs` verifies Home renders four unique spotlight links.
- The smoke verifies Home spotlight images use `/thumbs/`.
- The smoke verifies Home spotlight links point to `gallery.html?category=<category>`.
- The smoke verifies Home spotlight does not use the mock signed URL.

Lifecycle result: member submission cleanup planning does not affect Home spotlight behavior.

## 9. No Live Mutation Required

This regression path does not require:

- live test accounts;
- live OAuth;
- upload;
- approval or rejection;
- Storage deletion;
- Supabase database mutation;
- Edge Function deployment.

The existing smoke is local-safe because it mocks the approved-feed response and uses a local image URL as the signed URL stand-in.

## 10. No Storage Deletion Required

Nothing in this lifecycle regression requires Storage deletion.

Cleanup remains future work behind:

- owner-approved retention policy;
- read-only inventory;
- private operator identifiers;
- dry-run confirmation;
- trusted server-side/admin execution.

## 11. Regression Result

No Gallery lifecycle regression was found.

Current safe position:

- static Gallery fallback works;
- approved-feed mock works;
- pending/rejected mock records do not appear publicly;
- archived/hidden assumptions remain non-public planning states;
- signed URL display remains correct;
- sorting and category behavior remain stable;
- Home spotlight remains static;
- no production mutation or Storage deletion is needed.

## 12. Validation Plan

This branch should pass the standard non-mutating validation suite:

| Command / check | Expected result |
| --- | --- |
| `npm run check` | Pass with known MP3 asset warning only. |
| `git diff --check` | Pass. |
| `node scripts/check-json.mjs` | Pass. |
| `node scripts/check-js.mjs` | Pass. |
| `node scripts/check-refs.mjs` | Pass. |
| `node scripts/check-assets.mjs` | Pass with known MP3 asset warning only. |
| `npm run check:protected-content` | Pass. |
| `npm run check:content` | Pass. |
| `npm run check:supabase-config` | Pass. |
| `npm run check:live-member-workflow-preflight` | Pass without credentials in normal mode. |
| `npm run check:production` | Pass. |
| `npm run smoke:gallery` | Pass. |
| `npm run smoke:gallery-approved-feed` | Pass. |
| `npm run smoke:supabase-auth-boundary` | Pass. |
| `npm run smoke:supabase-edge-functions` | Pass. |

## 13. Safety Confirmation

- No data files changed.
- No Gallery images changed.
- Protected content was not changed.
- No secrets or credentials were committed.
- No live OAuth was attempted.
- No upload was performed.
- No moderation action was performed.
- No approval or rejection was performed.
- No Storage object was deleted.
- No Supabase production data was mutated.
- No `supabase db push` was run.
- No Edge Functions were deployed.
- No migrations, schema changes, RLS policy changes, or Storage policy changes were created.
