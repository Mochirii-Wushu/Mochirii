# Gallery Moderation Polish Analysis

Date: 2026-05-13
Branch: `feature/gallery-moderation-polish`

## 1. Current Moderation Dashboard Behavior

`leader-dashboard.html` renders a moderator-only page with signed-out, access-denied, and review panels. `leader-dashboard.js` requires sign-in, calls `checkLeaderGalleryModerationAccess()`, then loads `listGalleryReviewQueue()` and renders pending submissions as review cards. Each pending card shows a preview image, title, caption, uploader display information, category, MIME type, size, submitted date, a decline reason field, and Approve/Decline buttons. After an action, the card is removed from the pending list.

The current dashboard has no queue tabs, no approved/rejected history view, no moderation event display, and no summary counts.

## 2. Current Review Queue Data Returned

`supabase/functions/list-gallery-review-queue/index.ts` currently:

- requires POST and a signed-in Supabase user JWT.
- verifies Discord Moderator access through `requireModeratorAccess()`.
- supports `checkOnly: true`.
- queries only `gallery_submissions.status = 'pending'`.
- joins safe uploader profile fields from `member_profiles`.
- creates short-lived signed URLs for private `member-gallery` Storage objects.
- returns pending submissions with `id`, uploader display fields, title, caption, category, original filename, MIME type, size, created date, and signed preview URL.

It does not currently return approved/rejected/archived rows, `status`, `reviewed_at`, `rejection_reason`, dashboard counts, or `gallery_moderation_events`.

## 3. Current Approve/Reject Behavior

`supabase/functions/moderate-gallery-submission/index.ts` currently:

- requires POST and a signed-in Supabase user JWT.
- verifies Discord Moderator access through `requireModeratorAccess()`.
- accepts `submission_id`, `action`, and optional `reason`.
- allows `approved` or `rejected`.
- updates only rows where `status = 'pending'`.
- sets `status`, `reviewed_by`, `reviewed_at`, and `rejection_reason`.
- inserts one `gallery_moderation_events` row with `submission_id`, `moderator_id`, `action`, and `reason`.

This already preserves the rule that regular members cannot approve, reject, archive, or edit review fields from the browser.

## 4. Moderation Events Schema And Usage

`public.gallery_moderation_events` already exists from migration `20260513195853_create_gallery_moderation_events.sql` with:

- `id uuid primary key default gen_random_uuid()`
- `submission_id uuid not null references public.gallery_submissions(id) on delete cascade`
- `moderator_id uuid not null references auth.users(id) on delete cascade`
- `action text not null`
- `reason text`
- `created_at timestamptz not null default now()`

Constraints allow actions `approved`, `rejected`, and `archived`; reason length is capped at 500. RLS is enabled, browser roles have no direct access, and `service_role` manages rows through trusted Edge Functions.

Current usage is write-only from `moderate-gallery-submission`; the dashboard does not read or display these events yet.

## 5. Data Already Available

Existing schema can support the requested polish:

- `gallery_submissions.status`
- `gallery_submissions.rejection_reason`
- `gallery_submissions.reviewed_by`
- `gallery_submissions.reviewed_at`
- `gallery_submissions.created_at`
- `gallery_submissions.updated_at`
- `gallery_moderation_events.action`
- `gallery_moderation_events.reason`
- `gallery_moderation_events.created_at`
- safe uploader and moderator display fields from `member_profiles`
- private preview access through signed Storage URLs

## 6. Data Missing

No database fields are missing for this phase.

The missing runtime data is in the Edge Function response:

- queue status filters.
- status counts.
- reviewed timestamps/reasons.
- recent moderation events.
- moderator display names for events when available.

## 7. Edge Function Changes Needed

Yes. `list-gallery-review-queue` needs a scoped moderator-only extension so the dashboard can request `pending`, `approved`, `rejected`, or `archived` rows and receive summary counts and moderation history. The function must continue to verify the Moderator role ID `1078630751165222984` and continue to fail closed when configuration is missing.

`moderate-gallery-submission` does not need a behavior change for this polish branch. The frontend can require a rejection reason while the backend keeps its safe fallback for direct calls.

## 8. Migration Need

No migration is needed. Existing `gallery_submissions` and `gallery_moderation_events` fields are sufficient for status filters, counts, and moderation history display.

## 9. Files Expected To Change

- `leader-dashboard.html`
- `leader-dashboard.js`
- `supabase.js`
- `supabase/functions/list-gallery-review-queue/index.ts`
- `styles.css`
- `supabase/README.md`
- `reports/gallery-moderation-polish-analysis.md`

`account.js` already exposes the Leader Dashboard link after moderator verification, so it is expected to remain unchanged unless validation exposes a bug.

## 10. Protected Files That Must Not Change

- `data/gallery.json`
- protected public copy in `data/recruitment.json`
- protected public copy in `data/home.json`
- protected content files for Ranks, Leaders, Codex, Join, Events, Announcements, Raffles, and Spotlight
- Supabase migrations
- public Gallery publishing code except for validation-only inspection

## 11. Validation Plan

Run:

- `npm run check`
- `npm run check:production`
- `git diff --check`
- `node --check leader-dashboard.js`
- `node --check account.js`
- `node --check supabase.js`
- `npm run smoke:gallery` with a local static server
- `git diff -- data/`
- secret scan with the repository's standard ripgrep pattern

Because `list-gallery-review-queue` changes, run `deno check` if available. If Deno is unavailable, use `supabase functions serve list-gallery-review-queue` as a load check and stop it after confirming it starts or returns an expected auth/config response.

## 12. Deployment Needs

No database deployment is required.

Edge Function deployment will be required later for the dashboard history/status filter backend change:

- `supabase functions deploy list-gallery-review-queue`

This task must not deploy the function.
