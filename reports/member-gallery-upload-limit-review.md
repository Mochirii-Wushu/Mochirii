# Member Gallery Upload Limit Review

Date: 2026-05-14
Branch: `qa/member-gallery-upload-limit-review`
PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/113>
Goal: G03
Mode: QA/report-only

## 1. Scope

This review checked that the member Gallery upload limit remains aligned across browser UI, browser validation, database constraints, private Storage bucket settings, migration history, and documentation.

No site behavior, data files, CSS, JavaScript, Supabase migrations, Supabase functions, workflows, validation scripts, or assets were changed.

No Supabase database mutation was run. No Edge Functions were deployed.

## 2. Current References

Official Supabase references checked during this review:

- Storage file limits: <https://supabase.com/docs/guides/storage/uploads/file-limits>
- Creating buckets with size/MIME restrictions: <https://supabase.com/docs/guides/storage/buckets/creating-buckets/>
- Storage bucket fundamentals: <https://supabase.com/docs/guides/storage/buckets/fundamentals>

Relevant current guidance:

- Supabase supports global file-size limits and per-bucket restrictions.
- Per-bucket upload restrictions can include maximum file size and allowed MIME types.
- Storage access still depends on bucket privacy and `storage.objects` RLS policies.

## 3. Files Inspected

- `reports/codex-goal-roadmap.md`
- `supabase.js`
- `gallery-submit.html`
- `gallery-submit.js`
- `account.html`
- `account.js`
- `supabase/README.md`
- `supabase/migrations/20260513081523_create_discord_role_gated_gallery_uploads.sql`
- `supabase/migrations/20260513193110_increase_member_gallery_upload_limit_to_50mb.sql`
- prior reports mentioning `member-gallery`, 5 MB, 50 MB, MIME types, and bucket settings

## 4. Alignment Matrix

| Layer | Current value | Result |
| --- | --- | --- |
| Browser helper `MAX_UPLOAD_BYTES` | `50 * 1024 * 1024` = `52428800` | Pass |
| Browser accepted MIME set | `image/jpeg`, `image/png`, `image/webp` | Pass |
| Browser validation error | `Images must be 50 MB or smaller.` | Pass |
| Upload form helper copy | `The browser limit is 50 MB.` | Pass |
| Upload input `accept` | `image/jpeg,image/png,image/webp` | Pass |
| `gallery_submissions_size_bytes_check` migration | `size_bytes > 0 and size_bytes <= 52428800` | Pass |
| `gallery_submissions_mime_type_check` migration | `image/jpeg`, `image/png`, `image/webp` | Pass |
| `member-gallery` bucket migration | `file_size_limit = 52428800` and allowed MIME types | Pass |
| `supabase/README.md` bucket note | `file_size_limit = 52428800`, allowed MIME types listed | Pass |
| Production `storage.buckets` row | `public = false`, `file_size_limit = 52428800`, allowed MIME types listed | Pass |

## 5. Production Read-Only Checks

Read-only SQL was run through the linked Supabase CLI connection. No `insert`, `update`, `delete`, migration, `db push`, or deployment command was run.

Bucket metadata:

```text
id = member-gallery
name = member-gallery
public = false
file_size_limit = 52428800
allowed_mime_types = image/jpeg, image/png, image/webp
```

Database constraints:

```text
gallery_submissions_size_bytes_check:
CHECK (((size_bytes > 0) AND (size_bytes <= 52428800)))

gallery_submissions_mime_type_check:
CHECK ((mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text]))) NOT VALID
```

The MIME constraint remains marked `NOT VALID` from its original migration style, but it is present and still describes the intended allowed MIME set. No production drift was found for the current 50 MB limit.

## 6. Browser Smoke

Local page checked:

- `http://127.0.0.1:8765/gallery-submit.html`

Result:

- `window.MochiriiSupabase.getConfig().maxUploadBytes` returned `52428800`.
- `acceptedImageTypes` returned `image/jpeg`, `image/png`, and `image/webp`.
- `memberGalleryBucket` returned `member-gallery`.
- The file input `accept` attribute matched the MIME set.
- The visible helper copy still says the browser limit is `50 MB`.
- No mobile horizontal overflow was detected at `390px`.
- No console-breaking error was detected.

## 7. Historical Report Notes

Some older reports mention the original 5 MB bucket setup and then document the later 50 MB correction. Those are historical evidence, not active configuration. The active source files, current README bucket note, migration sequence, and production bucket metadata agree on 50 MB.

## 8. Findings

No upload-limit drift was found.

No implementation fix is required.

Follow-up notes:

1. G04 should test end-to-end user states, including upload denial before active verification and upload availability after active verification, if test credentials are available.
2. If the project plan changes above 50 MB later, check both Supabase global Storage limit and `member-gallery` per-bucket limit before changing browser copy or validation.

## 9. Validation Summary

| Command / check | Result |
| --- | --- |
| Source scan for `50 MB`, `52428800`, old `5242880`, `member-gallery`, and accepted MIME types | Completed. |
| Migration review | Completed. |
| README bucket setting review | Completed. |
| Prior report drift scan | Completed. |
| Read-only production SQL for `storage.buckets` | Completed. |
| Read-only production SQL for size and MIME constraints | Completed. |
| Local browser config/form smoke | Passed. |
| `npm run check` | Passed with the known `assets/audio/mochiriiiiii.mp3` size warning. |
| `git diff --check` | Passed. |
| `node --check gallery-submit.js` | Passed. |
| `node --check supabase.js` | Passed. |
| `node scripts/check-json.mjs` | Passed. |
| `node scripts/check-js.mjs` | Passed. |
| `node scripts/check-refs.mjs` | Passed. |
| `node scripts/check-assets.mjs` | Passed with the known MP3 size warning. |
| `npm run check:production` | Passed. |
| `npm run smoke:gallery` | Passed. |
| `git diff -- data/` | Empty. |

## 10. Safety Confirmation

- No data files changed.
- Protected content was not changed.
- No secrets were committed.
- No `supabase db push` was run.
- No Edge Functions were deployed.
- No migrations were created.
- No Supabase configuration was changed.

## 11. Next Recommended Item

G04 - `qa/member-gallery-end-to-end-review`
