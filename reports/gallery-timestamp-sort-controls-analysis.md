# Gallery Timestamp Sort Controls Analysis

## 1. Current Static Gallery Schema

`data/gallery.json` contains `meta`, declared `categories`, and one `general` album with 73 static `items`.

Each static item currently has:

- `id`
- `src`
- `alt`
- `caption`
- `category`
- `tags`
- `full`
- `thumb`

No static item has `galleryAddedAt` yet.

## 2. Current Approved Member Submission Schema

Approved member submissions are returned by `supabase/functions/list-approved-gallery-submissions/index.ts`.

The public feed returns approved-only records with:

- `id`
- `title`
- `caption`
- `category`
- `mime_type`
- `size_bytes`
- `created_at`
- `reviewed_at`
- `uploader_display_name`
- `uploader_discord_name`
- `signed_url`

The function queries only `gallery_submissions.status = 'approved'`, signs private `member-gallery` objects, and does not return pending, rejected, or archived submissions.

## 3. Current Gallery Shuffle And Filter Behavior

`gallery.js` loads static items from `data/gallery.json`, then loads approved member submissions through `window.MochiriiSupabase.listApprovedGallerySubmissions()`.

Approved submissions are normalized into Gallery item objects and combined with static items. The current default render filters by category and shuffles the visible combined item list.

## 4. Current Category URL Behavior

Gallery category state uses `?category=`.

Known category URLs include:

- `gallery.html?category=portraits`
- `gallery.html?category=gatherings`
- `gallery.html?category=action`
- `gallery.html?category=scenery`
- `gallery.html?category=companions`
- `gallery.html?category=member-submissions`

Invalid categories fall back to `all` and are cleaned with `replaceState`.

## 5. Proposed Unified Timestamp Model

Every rendered Gallery item will carry an internal `sortTimestamp` value.

Static curated item:

- `source = "static"`
- `sortTimestamp = item.galleryAddedAt`

Approved member item:

- `source = "member"`
- `sortTimestamp = submission.created_at`

When timestamps tie, sorting will use `id` ascending as a stable tie-breaker.

## 6. Proposed Sort Modes

Visitor-facing sort modes:

- `random`: default `Random mix`; preserves the existing page refresh rotation.
- `newest`: `Newest first`; sorts visible static and approved member items by `sortTimestamp` descending.
- `oldest`: `Oldest first`; sorts visible static and approved member items by `sortTimestamp` ascending.

The `sort` query parameter will support `random`, `newest`, and `oldest`. Invalid values will fall back to `random` and be cleaned from the URL.

## 7. Static galleryAddedAt Derivation

Static `galleryAddedAt` values will be derived from the first git add date of each static full image asset using each item's `full` or `src` path.

The inspected command pattern was:

```sh
git log --diff-filter=A --follow --format=%aI -- assets/img/gallery/shot-XX.webp
```

All 73 static gallery items had git first-added dates. No `data/gallery.json` `meta.updated` fallback is needed.

The derived dates group into five git-add timestamps:

- 21 items: `2026-02-24T06:39:07.000Z`
- 10 items: `2026-02-26T01:34:48.000Z`
- 8 items: `2026-02-27T15:20:40.000Z`
- 31 items: `2026-05-05T04:07:32.000Z`
- 3 items: `2026-05-06T18:36:00.000Z`

## 8. Files Expected To Change

- `data/gallery.json`
- `gallery.html`
- `gallery.js`
- `styles.css`
- `scripts/check-all.mjs`
- `scripts/check-gallery-timestamps.mjs`
- `package.json`
- `supabase/README.md`
- `reports/gallery-timestamp-sort-controls-analysis.md`

## 9. Files That Must Not Change

- Static gallery captions, alt text, categories, tags, IDs, and image paths must not change.
- Supabase migrations must not change.
- Supabase Edge Functions should not change.
- Upload, moderation dashboard, Discord verification, RLS, and Storage policies must not change.

## 10. Validation Plan

- `npm run check`
- `npm run check:production`
- `git diff --check`
- `node --check gallery.js`
- `node --check supabase.js`
- `node --check scripts/check-gallery-timestamps.mjs`
- `node --check scripts/check-all.mjs`
- `npm run smoke:gallery` with a local server on `127.0.0.1:8765`
- Focused browser smoke for `sort=random`, `sort=newest`, `sort=oldest`, invalid sort fallback, category preservation, member-submissions category, lightbox, copy link, and static fallback.
- `git diff -- data/gallery.json` review to verify only `galleryAddedAt` fields were added.
- `git diff -- data/` to verify no unrelated protected data changes.
- Secret scan for committed private values.

## 11. Risks And Mitigations

- Risk: accidental protected caption or alt text edits. Mitigation: compare structured gallery items before and after, excluding only `galleryAddedAt`.
- Risk: default random behavior regresses. Mitigation: keep `random` as the default and shuffle after category filtering.
- Risk: sort state breaks existing category URLs. Mitigation: centralize URL state and preserve category when sort changes, and preserve sort when category changes.
- Risk: member submissions without timestamps sort unpredictably. Mitigation: normalize member `sortTimestamp` from `created_at` and use stable `id` tie-breaks.
- Risk: approved feed failure breaks static Gallery. Mitigation: keep existing safe warning and return static items normally.

