# Post-Gallery Sorting Readiness

Date: 2026-05-13

## Baseline

- Current main commit: `954727df6ee0600e06179d7e606d6b1e59be786c`
- Baseline tag: `v2.3.0-gallery-timestamp-sort-controls`
- PR milestone: PR #100, `Add gallery timestamp sorting controls`

## Completed Gallery Capabilities

- Discord role-gated member uploads are live.
- Leader/moderator gallery approval dashboard is live.
- Approved member submissions appear in the public Gallery through signed URLs from the private `member-gallery` bucket.
- Member submission lightbox captions include submitted title/caption and uploader Discord name when available.
- Default public Gallery behavior remains Random mix.
- Static gallery items now have `galleryAddedAt` timestamps.
- Approved member uploads use Supabase `created_at` timestamps.
- Visitors can choose Random mix, Newest first, or Oldest first.
- Category and sort URL parameters work together.

## Validation Results

- `npm run check`: passed, with the existing non-blocking `assets/audio/mochiriiiiii.mp3` size warning.
- `npm run check:production`: passed.
- `git diff --check`: passed.
- `node scripts/check-gallery-timestamps.mjs`: passed for 73 static gallery items.
- `node --check gallery.js`: passed.
- `node --check scripts/check-gallery-timestamps.mjs`: passed.
- `node --check scripts/check-all.mjs`: passed.
- `npm run smoke:gallery`: passed with a local static server on `127.0.0.1:8765`.

## Production Status

- `https://mochirii.com/`: HTTP 200.
- `https://mochirii.com/gallery.html`: HTTP 200.
- `https://mochirii.com/gallery.js`: HTTP 200.
- Production smoke check passed after the PR #100 Pages deployment.

## Supabase Status

Remote migration list matches local for:

- `20260513081523`
- `20260513193110`
- `20260513195853`

Active Edge Functions:

- `verify-discord-member`
- `list-approved-gallery-submissions`
- `list-gallery-review-queue`
- `moderate-gallery-submission`

No Supabase database push or Edge Function deployment was performed for this report.

## Protected Text Status

- Working tree data diffs were clean before this report.
- `data/gallery.json` contains 73 static items.
- Every static gallery item has `galleryAddedAt`.
- Existing static gallery captions, alt text, IDs, categories, and image paths were preserved during the gallery sorting milestone.
- No protected public copy was changed for this readiness report.

## Recommended Next Development Stages

1. Harden gallery moderation UX
   - Moderator preview details.
   - Approve/reject audit display.
   - Moderation notes/history.
2. Public approved gallery polish
   - Contributor filters.
   - Uploader attribution style.
   - Member-submissions landing filter.
3. Member account polish
   - Profile completeness.
   - Verification state messaging.
   - Dashboard quick links.
4. Event RSVP / attendance system
   - `guild_events`.
   - `event_rsvps`.
   - Attendance records.
5. Join applications / onboarding tracker
   - Application status.
   - Discord joined / verified / accepted flow.
6. Codex publishing workflow
   - Polished guide archive.
   - Discord-to-site knowledge curation.

Recommended next branch: `feature/gallery-moderation-polish`
