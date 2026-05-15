# Gallery Approved Feed Smoke Automation

Date: 2026-05-15
Branch: `qa/gallery-approved-feed-smoke-automation`
Mode: QA automation

No Gallery data, Gallery images, protected content, CSS, public copy, Supabase configuration, migrations, Edge Functions, workflows, or production data were changed.

## 1. Current Gap

`reports/gallery-approved-feed-regression-matrix.md` proved the approved member Gallery feed in a report-first branch, but the durable script coverage still stopped at `scripts/smoke-gallery-lightbox.mjs`, which checks one static Gallery lightbox path.

The missing repeatable coverage was:

- approved member submissions joining the public Gallery item pool;
- signed URL values being used as the rendered image/full source;
- approved-feed failure falling back to static Gallery content;
- member-submissions category rendering without exposing pending or rejected items;
- Home Gallery Spotlight staying static-data based.

## 2. Script Added

Added:

- `scripts/smoke-gallery-approved-feed.mjs`
- package script `smoke:gallery-approved-feed`

The script follows the existing optional smoke pattern:

- It expects a local static server, defaulting to `http://127.0.0.1:8765`.
- It uses Playwright when available.
- It does not run through `npm run check`, because browser smoke tests still require a local server.
- It can be run directly with `npm run smoke:gallery-approved-feed`.

## 3. Mock Strategy

The script intercepts the Supabase CDN browser client and replaces it with a local mock client for the smoke run only.

The mock client:

- implements only the browser APIs needed by `supabase.js` for this Gallery path;
- records calls to `list-approved-gallery-submissions`;
- returns one approved submission when the test mode is `success`;
- keeps pending and rejected mock records in the mock backend list but filters them out of the returned public response;
- returns a mock Edge Function error when the test mode is `fail`.

The mock approved submission uses a local image URL with a query string that stands in for a signed URL, so the browser can load the image without live Supabase credentials or remote Storage access.

## 4. Coverage

The smoke verifies:

- static Gallery loads with the expected current item count from `data/gallery.json`;
- localhost static Gallery does not call the approved feed unless `approvedFeed=1` is present;
- static Gallery grid images use `/thumbs/`;
- newest and oldest sort use the expected first item from current Gallery timestamps;
- category filtering works for the Portraits category;
- static lightbox opens a full image path, not a thumbnail path;
- mocked approved feed is invoked with `approvedFeed=1`;
- the approved item appears in `member-submissions`;
- the All filter count includes the approved item;
- the approved item uses the mock signed URL for `data-full` and image `src`;
- submitted title, caption, and uploader display name appear in the member lightbox caption;
- pending and rejected mock records do not appear in public Gallery text;
- approved-feed failure keeps the static Gallery usable;
- failed approved-feed path does not render `member-submissions`;
- Home Gallery Spotlight still renders four unique static thumbnail category links;
- Home Gallery Spotlight does not use the mock signed URL.

## 5. Limitations

This script is intentionally local-safe and non-mutating.

It does not:

- call the live Supabase project;
- create pending, rejected, or approved submissions;
- upload files;
- approve or reject submissions;
- delete Storage objects;
- test signed URL expiry timing;
- prove RLS/storage policy behavior;
- deploy or type-check Edge Functions.

Those checks remain part of the future live credentialed member workflow QA and Supabase CI/manual parity work.

## 6. Validation

Validation passed on this branch:

- `npm run smoke:gallery-approved-feed`
- `npm run check`
- `git diff --check`
- `node scripts/check-json.mjs`
- `node scripts/check-js.mjs`
- `node scripts/check-refs.mjs`
- `node scripts/check-assets.mjs`
- `npm run check:production`
- `npm run smoke:gallery`

Known expected warning:

- `assets/audio/mochiriiiiii.mp3` remains over the normal large-asset threshold.

## 7. Future Live Credential Note

The next live workflow branch should use approved test accounts and an explicit cleanup plan before proving pending/rejected non-leakage with real records. This smoke deliberately avoids that mutation boundary.
