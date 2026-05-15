# Member Gallery Lifecycle Cleanup Plan v2

Date: 2026-05-15
Branch: `docs/member-gallery-lifecycle-cleanup-plan`
Mode: planning / report-only

This plan updates the member Gallery lifecycle and cleanup model after live credentialed workflow QA was intentionally deferred. It defines safe lifecycle states, cleanup boundaries, manual checklist expectations, and future automation candidates without deleting data or changing site behavior.

No live OAuth, upload, moderation action, approval/rejection, cleanup, Storage deletion, Supabase production mutation, schema change, RLS policy change, Storage policy change, Edge Function deployment, data-file edit, protected-content edit, public-copy change, CSS change, secret commit, or credential commit was performed.

## 1. Source Evidence

Reports and docs inspected:

- `docs/member-gallery-cleanup-plan.md`
- `docs/supabase-cost-usage-runbook.md`
- `reports/supabase-manual-parity-runbook.md`
- `reports/gallery-approved-feed-regression-matrix.md`
- `reports/live-member-workflow-qa-deferred.md`
- `reports/member-workflow-test-account-matrix.md`

Code and Supabase files inspected:

- `supabase.js`
- `gallery.js`
- `gallery-submit.js`
- `leader-dashboard.js`
- `account.js`
- `supabase/functions/list-approved-gallery-submissions/index.ts`
- `supabase/functions/list-gallery-review-queue/index.ts`
- `supabase/functions/moderate-gallery-submission/index.ts`
- `supabase/migrations/20260513081523_create_discord_role_gated_gallery_uploads.sql`
- `supabase/migrations/20260513195853_create_gallery_moderation_events.sql`

Relevant current facts:

- The private Storage bucket is `member-gallery`.
- Browser uploads create private Storage objects first, then insert `gallery_submissions` rows.
- If a row insert fails after upload, the browser helper attempts to remove that newly uploaded object.
- Current submission statuses in schema/function code are `pending`, `approved`, `rejected`, and `archived`.
- Current moderation UI exposes `pending`, `approved`, `rejected`, and `archived` queues.
- Current moderation action supports only `approved` and `rejected` for pending submissions.
- The public approved feed queries only `status = 'approved'` and returns short-lived signed URLs.
- The public Gallery does not read pending, rejected, or archived submissions.

## 2. Lifecycle Statuses

| Status | Current support | Meaning | Public Gallery visibility |
| --- | --- | --- | --- |
| `pending` | Current schema/UI/function queue support. | Uploaded by an active verified member and awaiting moderator review. | Not public. |
| `approved` | Current schema/UI/function support. | Moderator accepted the submission for public approved-feed display. | Public through signed URL feed. |
| `rejected` | Current schema/UI/function support. | Moderator declined the submission and should preserve rejection context for a short review/appeal window. | Not public. |
| `hidden` | Future/operational state; not a current DB status. | Publicly removed but retained for review, appeal, audit, or eventual cleanup. Current closest state is `archived`. | Not public. |

Current implementation note: because the database and dashboard currently use `archived`, future work should either continue using `archived` as the hidden/non-public retained state or introduce `hidden` only through a separate schema, Edge Function, UI, and QA branch. This planning milestone does not change the status model.

## 3. What Can Be Cleaned Safely

Safe to consider after a read-only inventory and explicit approval:

- rejected submissions older than an agreed retention window;
- archived/hidden retained submissions older than an agreed retention window;
- orphaned private Storage objects with no matching valid `gallery_submissions` row, after ownership and path validation;
- broken rows whose Storage object is missing and cannot be repaired, after audit review;
- disposable test artifacts created by an approved QA run, if the artifact can be proven to belong to that run.

Safe cleanup means "eligible for a future approved cleanup branch", not "safe to delete now."

## 4. What Must Never Be Deleted Automatically

Never delete automatically:

- approved submissions currently intended for public Gallery display;
- pending submissions that have not completed the review process;
- moderation event rows used as accountability records;
- Storage objects whose matching row or owner cannot be proven;
- any object that may belong to a real member outside an approved retention policy;
- static Gallery files or `data/gallery.json` entries;
- protected content;
- signed URLs, private paths, or object IDs from public reports instead of from a private operator note.

Automatic deletion should not be added until there is a dry-run inventory, owner-approved retention policy, service-role server-side implementation, and rollback/restore expectation.

## 5. Pending Item Lifecycle

Pending items should:

1. be created only by active verified members;
2. remain private in `member-gallery`;
3. appear to the uploader in Account/My Gallery summaries;
4. appear to moderators in the pending queue;
5. receive a short-lived signed preview only for authorized moderator review;
6. become `approved` or `rejected` through the moderation Edge Function;
7. never appear in the public Gallery while pending.

Cleanup posture:

- Do not delete pending items as routine cleanup.
- Escalate stale pending items for moderator review.
- If a pending object cannot preview, refresh once and then escalate; do not approve a broken or unverified object.
- If a pending item is a known disposable QA artifact, cleanup may proceed only through the approved QA cleanup plan.

## 6. Rejected Item Lifecycle

Rejected items should:

1. remain private;
2. retain the rejection reason;
3. retain the moderation event;
4. remain visible to moderators for context;
5. remain visible to the submitting member only where current RLS/UI allows their own submission history;
6. never appear in the public approved feed.

Cleanup posture:

- Keep rejected items through an agreed appeal/resubmit window.
- After the window, rejected items may become cleanup candidates.
- Preserve audit records even if a private Storage object is later removed.
- Do not delete rejected objects without a private inventory tying row, object path, owner, and decision together.

## 7. Approved Item Lifecycle

Approved items should:

1. remain private in Storage;
2. be public only through the approved-feed Edge Function;
3. receive short-lived signed URLs;
4. render in the public Gallery with member-submission category handling;
5. remain separate from static `data/gallery.json`;
6. stop rendering when status is no longer approved or the signed URL cannot be created.

Cleanup posture:

- Do not permanently delete approved items directly from routine moderation.
- If public removal is needed, move first to a hidden/archived retained state through a future approved server-side workflow.
- Verify the approved feed no longer returns the item before considering object deletion.
- Preserve moderation history.

## 8. Hidden Lifecycle Assumption

Because `hidden` is not a current database status, this plan treats hidden as a future lifecycle label for "not public, retained for review." The current compatible implementation path is `archived`.

Hidden/archived items should:

- not appear in the public approved feed;
- remain visible to moderators for audit and cleanup review;
- retain the row and moderation history;
- be eligible for cleanup only after retention policy approval;
- never require editing static Gallery data.

Future branch options:

- `docs/member-gallery-hidden-status-decision`
- `feature/member-gallery-archive-action`
- `qa/member-gallery-hidden-feed-regression`

## 9. Storage Object Lifecycle

Storage objects should:

- stay in the private `member-gallery` bucket;
- use signed URLs only for authorized previews or approved public display;
- stay tied to `gallery_submissions.storage_bucket` and `gallery_submissions.storage_path`;
- never be made public to simplify cleanup;
- never be deleted by SQL metadata edits;
- be deleted only through a trusted server/admin path that can verify ownership and state.

Object cleanup requires:

- exact project confirmation;
- exact bucket confirmation;
- matching submission row;
- matching owner/test-run evidence;
- approved retention rule;
- dry-run candidate summary;
- explicit owner approval;
- post-cleanup Gallery/feed validation.

## 10. Signed URL Behavior

Signed URLs are temporary access links and must not be treated as permanent asset URLs.

Expected behavior:

- moderator queue previews use short-lived signed URLs;
- public approved feed uses short-lived signed URLs for approved items;
- failed signed URL generation should skip or flag the item without exposing private paths;
- reports should not copy signed URLs;
- cleanup plans should identify objects by private operator note, not by pasted signed URL.

After moving an item out of approved state, verify that the public feed no longer returns it after normal refresh.

## 11. Audit And Logging Expectations

Moderation events should remain as accountability records.

Keep:

- approval/rejection action;
- moderator ID in private/admin context;
- review timestamp;
- rejection reason when applicable;
- submission status transitions;
- enough private operator evidence to tie cleanup to the right object.

Do not publish:

- raw user IDs;
- private Storage paths;
- signed URLs;
- Discord tokens or identifiers;
- complete cleanup inventory rows.

Public PRs should use redacted counts and sanitized status summaries.

## 12. Moderator Visibility Expectations

Moderators should be able to review:

- pending queue;
- approved queue;
- rejected queue;
- archived/hidden retained queue;
- signed previews for private objects when authorized;
- safe uploader display fields;
- compact moderation history.

Moderators should not receive:

- service-role credentials;
- direct Storage delete power in browser code;
- public signed URLs in reports;
- mutation buttons for cleanup until a dedicated server-side cleanup workflow exists.

## 13. Cleanup Confirmation Requirements

Before cleanup:

1. Confirm current `main` and clean working tree.
2. Run full validation.
3. Confirm project ref.
4. Confirm bucket name and bucket privacy.
5. Run read-only inventory.
6. Redact private identifiers from public evidence.
7. Confirm retention rule.
8. Confirm owner approval.
9. Confirm no real member content is being confused with test data.

After cleanup:

1. Confirm exact count/status of affected rows and objects in private notes.
2. Confirm public approved feed remains stable.
3. Confirm pending/rejected/hidden items do not leak publicly.
4. Confirm Account/My Gallery and Leader Dashboard behavior still match expected state.
5. Run standard validation and Gallery smokes.
6. Record only sanitized evidence in public reports.

## 14. Manual Cleanup Checklist

Manual cleanup should remain a future, approved, operator-assisted process:

- Open a scoped branch or admin ticket.
- Confirm cleanup is not being run from a browser/public client.
- Confirm service-role access is used only in trusted server/admin context.
- Confirm no `supabase db push` or Edge Function deployment is needed for routine cleanup.
- Run inventory first.
- Review candidate counts by status.
- Exclude approved public items unless they were intentionally hidden/archived first.
- Exclude pending items unless they are known disposable test artifacts.
- Exclude any candidate with unclear ownership.
- Approve deletion scope.
- Execute through Storage API and approved database/status path.
- Validate public Gallery, approved feed, member pages, and moderator views.

## 15. Future Automation Candidates

Safe candidates for future non-destructive automation:

- read-only inventory of counts by status;
- stale pending/rejected/archived summaries;
- orphan row/object detection in dry-run mode;
- signed URL availability sampling without printing URLs;
- public approved-feed leak checks for non-approved statuses via mocks;
- validation that cleanup scripts refuse to run without explicit project/bucket confirmation.

Destructive automation candidates only after approval:

- server-side cleanup dry-run with redacted output;
- server-side cleanup execution limited to approved candidate IDs;
- post-cleanup regression script that verifies no public feed leakage.

## 16. Automation Stop Conditions

Any future automation must stop if:

- credentials are missing or look like public/browser credentials;
- the Supabase project ref is not the expected project;
- bucket is not `member-gallery`;
- bucket appears public;
- a candidate has no matching row;
- a row points to a missing object and the action is not explicitly approved;
- a candidate is `approved` and has not been hidden/archived first;
- a candidate is `pending` and is not a documented test artifact;
- a signed URL, private path, token, or user ID would be printed to public output;
- the script would mutate database rows or Storage objects without an explicit destructive flag and owner approval;
- `supabase db push` or Edge Function deployment appears necessary.

## 17. No Live Deletion In This Milestone

This milestone is planning and QA only.

No live deletion, Storage mutation, row mutation, status change, upload, approval, rejection, OAuth completion, cleanup execution, migration, RLS change, Storage policy change, or Edge Function deployment is allowed.

## 18. Validation Result

F02 branch validation passed:

- `npm run check`
- `git diff --check`
- `node scripts/check-json.mjs`
- `node scripts/check-js.mjs`
- `node scripts/check-refs.mjs`
- `node scripts/check-assets.mjs`
- `npm run check:protected-content`
- `npm run check:content`
- `npm run check:supabase-config`
- `npm run check:live-member-workflow-preflight`
- `npm run check:production`
- `npm run smoke:gallery`
- `npm run smoke:gallery-approved-feed`
- `npm run smoke:supabase-auth-boundary`
- `npm run smoke:supabase-edge-functions`

Known expected warning:

- `assets/audio/mochiriiiiii.mp3` remains over the normal large-asset threshold.

## 19. Safety Confirmation

- Protected content unchanged.
- Data files unchanged.
- No secrets committed.
- No credentials committed.
- No live OAuth attempted.
- No upload attempted.
- No approval/rejection attempted.
- No Storage deletion attempted.
- No Supabase production data mutation.
- No `supabase db push`.
- No Edge Functions deployed.
