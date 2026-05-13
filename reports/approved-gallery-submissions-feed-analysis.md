# Approved Gallery Submissions Feed Analysis

## Current Gallery Render Flow

`gallery.html` is a static GitHub Pages page. It loads `utils.js`, Supabase JS v2 from CDN, `supabase.js`, `site.js`, and then `gallery.js`.

`gallery.js` currently fetches `./data/gallery.json`, applies metadata to the hero text, flattens the first album's static items, shuffles those items, builds categories from declared and inferred category slugs, renders filter buttons, and renders `.gallery-thumb` buttons into `#galleryGrid`. The lightbox relies on each button's `data-full` and `data-caption` attributes. Copy-link behavior uses the current category URL.

`data/gallery.json` owns the existing static Gallery items and captions. This task should not modify that file or rewrite any existing Gallery captions.

## Current Submission And Moderation Flow

Members upload images from `gallery-submit.html` through `gallery-submit.js` and `supabase.js`. Uploads go to the private `member-gallery` Storage bucket under a path beginning with the member's Supabase user id. A `public.gallery_submissions` row is then created with `status = 'pending'`.

Leaders use `leader-dashboard.html` and `leader-dashboard.js` to call server-side Edge Functions. `list-gallery-review-queue` verifies the caller's Discord Moderator role, lists pending submissions, and returns short-lived signed preview URLs. `moderate-gallery-submission` verifies the Moderator role, updates only pending rows to `approved` or `rejected`, and records `public.gallery_moderation_events`.

Existing browser clients cannot directly approve, reject, archive, or edit review fields. The `member-gallery` bucket remains private.

## Recommended Approved-Feed Architecture

Add a public Edge Function named `list-approved-gallery-submissions` with `verify_jwt = false`. It will use server-side Supabase credentials in the trusted Edge runtime to query only `public.gallery_submissions` rows where `status = 'approved'`. It will join safe uploader display fields from `member_profiles`, generate short-lived signed URLs for private `member-gallery` objects, and return only public-safe fields.

The public Gallery page may call this function without sign-in. It must treat the approved feed as additive data. If the function fails or returns no rows, `gallery.js` should render the existing static `data/gallery.json` gallery normally. Localhost static smoke should avoid calling the remote function by default before deployment; a query opt-in can be used for local approved-feed testing.

Approved member submissions should be appended after static Gallery items. The static items can continue to shuffle. Member submissions should preserve category filtering by using their submitted category when present and `member-submissions` as a stable fallback/additional category. A subtle `Member Submission` badge can be rendered on those dynamic items without changing protected captions.

No database migration is expected because `gallery_submissions.status = 'approved'` and review fields already exist.

## Files To Change

- `supabase/functions/list-approved-gallery-submissions/index.ts`
- `supabase/functions/list-approved-gallery-submissions/deno.json`
- `supabase/functions/list-approved-gallery-submissions/.npmrc`
- `supabase/config.toml`
- `supabase.js`
- `gallery.js`
- `styles.css` if a small badge style is needed
- `supabase/README.md`

## Files To Avoid Changing

- `data/gallery.json`
- protected `data/` files
- upload RLS migrations
- moderation permission logic
- `member-gallery` bucket public/private state
- Discord role IDs and verification logic

## Validation Plan

Run:

- `npm run check`
- `npm run check:production`
- `git diff --check`
- `node --check gallery.js`
- `node --check supabase.js`

Run the Gallery smoke test with a local static server on `127.0.0.1:8765`.

For the new Edge Function, use `deno check` if available. If Deno is not installed, start `supabase functions serve list-approved-gallery-submissions` and make a safe local public request to confirm the function loads and returns structured JSON or a safe configuration error.

Verify protected content with:

- `git diff -- data/`

Expected result: no data diffs.
