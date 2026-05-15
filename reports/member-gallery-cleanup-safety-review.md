# Member Gallery Cleanup Safety Review

Date: 2026-05-15
Branch: `qa/member-gallery-cleanup-safety-review`
Mode: QA / report-only

This review checks whether the current static-site, Supabase, Edge Function, and member Gallery architecture can support future cleanup safely. It does not implement cleanup and does not delete or mutate any production data.

No live OAuth, upload, moderation action, approval/rejection, cleanup, Storage deletion, Supabase production mutation, schema change, RLS policy change, Storage policy change, Edge Function deployment, data-file edit, protected-content edit, public-copy change, CSS change, secret commit, or credential commit was performed.

## 1. Source Evidence

Reports and docs inspected:

- `reports/member-gallery-lifecycle-cleanup-plan-v2.md`
- `docs/member-gallery-cleanup-plan.md`
- `reports/supabase-edge-functions-review.md`
- `reports/supabase-production-security-review.md`

Code and Supabase files inspected:

- `supabase.js`
- `gallery-submit.js`
- `leader-dashboard.js`
- `account.js`
- `gallery.js`
- `supabase/functions/_shared/gallery-moderation.ts`
- `supabase/functions/list-gallery-review-queue/index.ts`
- `supabase/functions/moderate-gallery-submission/index.ts`
- `supabase/functions/list-approved-gallery-submissions/index.ts`
- `supabase/migrations/20260513081523_create_discord_role_gated_gallery_uploads.sql`
- `supabase/migrations/20260513195853_create_gallery_moderation_events.sql`

Current repo facts:

- The member upload bucket is `member-gallery` and is private.
- Submission rows use `gallery_submissions.storage_bucket` and `gallery_submissions.storage_path`.
- Current submission statuses are `pending`, `approved`, `rejected`, and `archived`.
- The current public approved feed queries only `status = 'approved'`.
- The moderation Edge Function only accepts `approved` and `rejected` actions against pending submissions.
- The Leader Dashboard displays pending, approved, rejected, and archived queues, but it exposes no cleanup action.
- The browser upload helper removes a just-uploaded object only when the matching row insert fails in the same upload call.
- The schema grants authenticated users delete permission on Storage objects only through owner-folder RLS, but no general cleanup UI or script is present.

## 2. Cleanup Support Assessment

| Area | Current support | Safety assessment |
| --- | --- | --- |
| User upload rollback | `supabase.js` attempts to remove the newly uploaded object if row insert fails. | Narrow and acceptable because it targets only the object created in the same failed operation. |
| Moderator status changes | `moderate-gallery-submission` can approve or reject pending submissions and records moderation events. | Suitable for routine moderation, not permanent cleanup. |
| Public approved feed | `list-approved-gallery-submissions` returns only approved rows and signed URLs. | Good public boundary; cleanup should preserve this fail-closed shape. |
| Archived/hidden handling | Current schema has `archived`; `hidden` is only a future lifecycle label. | Cleanup design should use current `archived` semantics unless a future schema branch explicitly adds `hidden`. |
| Permanent object deletion | No public UI, Edge Function, or script exists for lifecycle cleanup. | Correct current posture. Permanent cleanup needs a separate trusted path. |
| Audit record preservation | `gallery_moderation_events` records approve/reject events and is service-role only. | Cleanup should preserve audit rows as accountability records. |

## 3. Does Cleanup Need Edge Function Support?

Yes, if cleanup becomes more than a local owner rollback of a just-failed upload.

Future cleanup should run through a trusted server-side path, most likely a dedicated Edge Function or an operator-only admin tool, because it needs to verify both database state and Storage object state before deletion. The browser should not receive broad delete power or service-role credentials.

A future cleanup Edge Function should be separate from routine moderation and should support dry-run first. Its first useful version should probably be an inventory/dry-run contract, not destructive execution.

## 4. Is Client-Side Cleanup Unsafe?

Client-side permanent cleanup is unsafe for anything beyond the existing immediate rollback path.

Reasons:

- Browser code uses a publishable key and a user session, not a trusted service role.
- Service-role keys must never be exposed to the static site.
- Browser-side cleanup could be triggered from the wrong account, browser state, or project if not heavily guarded.
- RLS currently allows users to operate only in their own Storage folder; that is good for self-owned upload behavior but not enough for moderator or owner cleanup of lifecycle candidates.
- Moderators should not receive direct Storage delete controls in public browser JavaScript.

The current `uploadMemberGalleryImage` rollback remains a separate, narrow case: it targets a specific object path created by the same user in the same failed upload transaction. This review does not recommend expanding that browser-side deletion surface.

## 5. Do Deletions Need Service-Role Server-Side Handling?

Yes. Permanent lifecycle cleanup should use service-role handling only in a trusted runtime.

The future trusted path should:

- confirm the Supabase project reference before doing anything;
- use the private `member-gallery` bucket only;
- read the candidate row and current status;
- verify the Storage path belongs to the expected user folder;
- verify the object exists before deletion;
- reject ambiguous or missing identifiers;
- refuse approved items unless they were explicitly archived/hidden first under an approved policy;
- preserve moderation events and sanitized cleanup records;
- keep logs free of tokens, signed URLs, and public private-path dumps;
- separate dry-run and execution modes.

## 6. Required Identifiers Before Any Deletion

Future cleanup cannot rely on titles, captions, visible uploader names, or signed URLs alone.

Minimum private operator identifiers:

- Supabase project ref.
- Bucket name, expected to be `member-gallery`.
- `gallery_submissions.id`.
- `gallery_submissions.user_id`.
- `gallery_submissions.status`.
- `gallery_submissions.storage_bucket`.
- `gallery_submissions.storage_path`.
- `gallery_submissions.created_at`.
- `gallery_submissions.reviewed_at`, when present.
- Latest moderation event action and timestamp, when present.
- Storage object existence result.
- Storage object size and MIME type, when available.
- Retention rule or owner-approved cleanup reason.
- For QA artifacts, the unique test marker, test account label, and test-run timestamp.

Public PRs and reports should summarize candidate counts and decisions without exposing raw private paths, signed URLs, or sensitive user identifiers.

## 7. Preventing Deletion Of Real Member Content

Future cleanup must fail closed if a candidate cannot be proven safe.

Required protections:

1. Start with read-only inventory.
2. Redact private identifiers from public evidence.
3. Group candidates by status and risk.
4. Treat approved items as not deletable until removed from the approved public lifecycle first.
5. Treat pending items as not deletable unless they are explicit disposable test artifacts or leadership-approved stale cases.
6. Preserve rejection context and moderation events even when object cleanup is later allowed.
7. Require exact row-to-object matching before any Storage deletion.
8. Require explicit owner approval for retention windows and destructive execution.
9. Use project and bucket confirmations before running a destructive path.
10. Stop if there is any mismatch between row owner, Storage path prefix, status, or expected test marker.

## 8. Verifying Ownership Of Test Artifacts

For a future disposable QA artifact, cleanup should require all of these before destructive action:

- test title prefix or marker, such as the approved QA marker from the live workflow runbook;
- caption marker;
- filename marker or private operator note for the local test file;
- upload timestamp window;
- `gallery_submissions.id` captured in private notes;
- `storage_path` captured in private notes;
- `user_id` matching the disposable member test account;
- Storage path beginning with the same `user_id` folder;
- moderator action tied to the disposable moderator test account, if moderation occurred;
- current status matching the cleanup plan;
- public Gallery/feed check showing whether the artifact is currently public.

If any marker is missing or ambiguous, the item should not be deleted by automation.

## 9. What Should Remain Manual

Keep these manual until the project has a reviewed retention policy and dry-run tooling:

- choosing retention windows for rejected and archived items;
- approving destructive cleanup;
- deciding how to handle approved member content that should be removed from public display;
- resolving ambiguous row/object mismatches;
- reviewing orphaned objects;
- confirming a QA artifact belongs to the exact disposable test run;
- deciding whether a Storage object without a matching row is safe to delete;
- final destructive execution after a dry-run report.

## 10. What Can Be Automated Later

Safe automation candidates, in order:

1. `qa/member-gallery-cleanup-inventory-dry-run`
   - Read-only inventory of stale pending, rejected, archived, orphan-row, and orphan-object candidates.
   - Redacted public report only.
   - No deletion.

2. `docs/member-gallery-retention-policy`
   - Owner-approved retention windows and cleanup approval rules.
   - No deletion.

3. `qa/member-gallery-cleanup-dry-run-contract`
   - Defines exact request/response shape for a future cleanup function.
   - Negative tests for missing project, bucket, row ID, path, and status.
   - No deletion.

4. `admin/member-gallery-cleanup-execute`
   - Destructive only after the dry-run output is approved.
   - Trusted runtime only.
   - Deletes through Storage API, not SQL metadata edits.
   - Preserves audit records.

5. `qa/member-gallery-cleanup-regression`
   - Confirms public Gallery, approved feed, Account summaries, Leader Dashboard queues, signed-out boundaries, and protected-content checks after cleanup.

## 11. Recommended Future Branch

Recommended next cleanup-specific branch, if automation is desired:

`qa/member-gallery-cleanup-inventory-dry-run`

Goal: create a non-mutating inventory that proves which candidate groups exist, redacts sensitive identifiers from public output, and refuses to run destructive actions. This should come before any cleanup execution design.

## 12. Current Safety Position

The current repo can support cleanup planning safely, but it should not perform permanent cleanup from browser code.

Best current posture:

- Keep uploads and routine moderation as-is.
- Keep public Gallery visibility limited to approved feed rows.
- Keep pending, rejected, and archived submissions private.
- Keep permanent cleanup manual and owner-approved.
- Add read-only inventory before any deletion path.
- Use trusted server-side/admin execution for future deletion only after policy and dry-run review.

## 13. Validation Plan

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

## 14. Safety Confirmation

- No data files changed.
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
