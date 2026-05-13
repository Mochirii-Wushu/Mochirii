# Member Gallery Caption Uploader Fix Analysis

## Current Data Path

`gallery-submit.html` collects member submission metadata through form fields named `title`, `caption`, and `category`.

`gallery-submit.js` reads those fields in `metadataFromForm(form)` using `FormData` and passes the metadata object to `window.MochiriiSupabase.uploadMemberGalleryImage(file, metadata)`.

`supabase.js` preserves non-empty `title`, `caption`, and `category` values in `cleanSubmissionMetadata(metadata)`, then spreads those fields into the `gallery_submissions` insert row after the private Storage upload succeeds.

`supabase/functions/list-approved-gallery-submissions/index.ts` selects `title` and `caption` from approved `gallery_submissions` rows and signs private `member-gallery` objects server-side. It already returned `uploader_display_name`, but it did not return a separate `uploader_discord_name` field.

`gallery.js` converts each approved feed item into the same Gallery item shape used by static `data/gallery.json` records. Static Gallery captions are still read only from `data/gallery.json`.

## Why the Fallback Can Still Appear

The lightbox uses the rendered gallery button's `data-caption` value. For member submissions, `gallery.js` builds that caption from the approved-feed `title` and `caption` fields. If both fields are empty or missing in the approved feed response, `gallery.js` correctly falls back to `Member submission`.

Existing approved rows created with blank `title` and `caption` values will continue to show that fallback until the database row is manually updated. This is data state, not a static Gallery caption issue.

The live approved feed returned a title and caption for its current approved item, but it did not yet include `uploader_discord_name`.

## Planned Fix

- Add `uploader_discord_name` to the approved-feed response.
- Build `uploader_discord_name` from safe public profile fields, preferring `discord_global_name`, then `discord_username`, then `display_name`, then `Mochirii Member`.
- Update `gallery.js` so member lightbox captions use submitted title/caption and append `Submitted by <Discord name>` when an uploader name is available.
- Preserve static Gallery captions exactly.
- Keep thumbnail overlays removed.
- Document that older approved rows with blank title/caption need manual row updates if the fallback should be replaced.

