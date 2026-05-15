# Live Member Workflow Readiness Review

Date: 2026-05-15
Branch: `qa/live-member-workflow-readiness-review`
Mode: QA/report-only

This review determines whether the live credentialed member workflow can be tested safely from the current environment. It defines the required test accounts, disposable test data, cleanup boundaries, stop conditions, and next branch decision before any OAuth completion, upload, moderation, or cleanup action.

No live login was completed. No Supabase data, Storage object, profile row, gallery submission, moderation event, schema, RLS policy, Storage policy, Edge Function, data file, protected content, CSS, public copy, workflow, or secret was changed.

## 1. Source Evidence

Reports inspected:

- `reports/member-workflow-test-account-matrix.md`
- `reports/production-member-workflow-smoke.md`
- `reports/supabase-manual-parity-runbook.md`
- `reports/supabase-ci-and-parity-review.md`
- `reports/supabase-production-security-review.md`
- `reports/supabase-edge-functions-review.md`
- `reports/post-supabase-parity-hardening-regression.md`
- `reports/supabase-parity-hardening-goal-progress.md`

Code inspected:

- `auth.html`, `auth.js`
- `account.html`, `account.js`
- `gallery-submit.html`, `gallery-submit.js`
- `leader-dashboard.html`, `leader-dashboard.js`
- `gallery.js`
- `supabase.js`
- `package.json`
- `scripts/`

Current safe automation already available:

- `npm run check:supabase-config`
- `npm run smoke:supabase-auth-boundary`
- `npm run smoke:supabase-edge-functions`
- `npm run smoke:gallery-approved-feed`
- `npm run check:protected-content`
- `npm run check:content`

## 2. Required Test Accounts

| Account | Required for | Current availability in this run |
| --- | --- | --- |
| Anonymous visitor | Signed-out page gates, public Gallery, public approved feed, OAuth redirect start. | Available; already covered by local/production smokes. |
| Signed-in unverified Discord user | OAuth completion, signed-in account shell, missing-role guidance, safe sign-out. | Not available. No approved test credentials were provided to this environment. |
| Verified active member | live Discord role verification, active member status, upload eligibility, controlled test upload. | Not available. No approved active member test account was provided. |
| Moderator/leader | moderator queue visibility, approve/reject action on disposable test submission. | Not available. No approved moderator test account was provided. |

Minimum useful live QA setup:

1. `mochirii-test-unverified`: can complete Discord OAuth but lacks required guild/role access.
2. `mochirii-test-active-member`: has required guild roles and active website member status.
3. `mochirii-test-moderator`: has required guild roles and Moderator access.

The test accounts must be operator-owned, disposable, and never recorded in repo files, PRs, reports, screenshots, shell history, or logs.

## 3. Required Test Data

Disposable upload data should be prepared before D03:

- File: a small JPEG, PNG, or WebP test image owned by the operator.
- Suggested filename: `mochirii-qa-test-YYYYMMDD.webp`.
- Title: `Mochirii QA Test - YYYY-MM-DD`.
- Caption: `Mochirii QA Test disposable upload for live workflow verification.`
- Category: `gatherings` or another existing upload category.
- Unique marker: `Mochirii QA Test`.

The test image must not contain real member faces, private chat, account IDs, personal information, copyrighted third-party material, or production-only content that cannot remain briefly visible if approval is tested.

## 4. Required Cleanup Plan

Before any upload, record these details in a private operator note, not in a public report:

- test account used;
- upload timestamp;
- test title/caption marker;
- created `gallery_submissions.id`;
- created `storage_path`;
- whether the submission was approved or rejected;
- approved-feed visibility result;
- cleanup decision and final state.

Public reports may record only sanitized status:

- one disposable test submission created / not created;
- pending hidden from public Gallery;
- approved visible / not tested;
- rejected hidden / not tested;
- cleanup complete / cleanup deferred with reason.

Cleanup constraints:

- Do not delete Storage objects unless the object is proven to belong to this test run and deletion is explicitly approved.
- Do not approve/reject any submission that is not the disposable test submission.
- Do not publish raw IDs, private Storage paths, signed URLs, access tokens, refresh tokens, cookies, or Discord identifiers.
- If cleanup deletion is not supported or not approved, leave the artifact in the safest non-public state available and document the remaining artifact privately.

## 5. Non-Mutating Steps

These are safe to run with no production mutation:

- signed-out `auth.html`, `account.html`, `gallery-submit.html`, and `leader-dashboard.html` checks;
- public Gallery and approved-feed checks;
- OAuth redirect start without credential entry;
- local mocked auth-boundary smoke;
- public Edge Function fail-closed contract smoke;
- public config/secret guardrail checks;
- read-only report and code inspection.

These are safe only with approved credentials and no profile writes:

- completed OAuth login;
- signed-in session detection;
- account page profile display;
- Discord verification display when reading existing state;
- sign out.

## 6. Production-Mutating Steps

These mutate production and must be approved before D03:

- profile save through `account.html`;
- verification refresh if it updates `member_profiles`;
- upload to private `member-gallery` Storage;
- insert into `gallery_submissions`;
- approval/rejection through `moderate-gallery-submission`;
- moderation audit event creation;
- archive/delete/cleanup actions;
- Storage object deletion.

`supabase.js` confirms the upload path creates a private Storage object first, then inserts a `gallery_submissions` row. If the insert fails, the helper attempts to remove the uploaded object. The moderation path calls the protected `moderate-gallery-submission` Edge Function and is not a read-only action.

## 7. Human Approval Required

Human approval is required before:

- entering or using any test-account credentials;
- completing Discord OAuth with a test account;
- uploading a disposable test image;
- approving, rejecting, archiving, or cleaning up the disposable test submission;
- deleting any Storage object;
- changing Supabase provider settings, redirect settings, secrets, schema, RLS policies, Storage policies, or Edge Functions.

Human approval is also required if a test artifact cannot be cleaned up through the normal website/admin path.

## 8. Automation Boundary

Safe to automate now:

- signed-out member page checks;
- public Gallery and approved-feed checks;
- protected Edge Function fail-closed checks;
- secret/public-config guardrails;
- mocked auth-boundary and approved-feed browser smokes.

Manual or operator-assisted:

- OAuth completion;
- profile and role-state verification with a real account;
- upload eligibility as a signed-in active member;
- moderator queue positive path;
- approval/rejection of a disposable test submission;
- cleanup verification.

Do not automate production upload/moderation in CI. That workflow should remain a supervised live QA run or move to a staging project with disposable data.

## 9. Credential Decision

Current environment has enough credentials to continue to D02: **no**.

Reasons:

- No approved unverified Discord test account was provided.
- No approved verified active member test account was provided.
- No approved moderator/leader test account was provided.
- No explicit approval was provided to use personal or existing browser credentials.
- No cleanup authority was provided for a live upload/moderation test.

Therefore:

- D02 must not start in this run.
- D03 must not start in this run.
- D04 and D05 are not applicable yet.
- `v3.0.0-live-member-workflow-qa-baseline` must not be created.

This is a credential and approval blocker, not a discovered site regression.

## 10. Exact Next Branch Recommendation

Next branch after credentials are available:

`qa/live-auth-profile-verification-smoke`

Prerequisites before opening that branch:

1. Provide or confirm an approved disposable Discord test account.
2. Confirm whether the account should be unverified, verified active member, or both.
3. Confirm login can be completed without exposing credentials, cookies, or tokens to repo/log output.
4. Confirm the branch is non-mutating: no profile save, no upload, no moderation, no cleanup.

Then, before D03:

1. Provide an active member test account.
2. Provide a moderator/leader test account.
3. Provide a disposable test image.
4. Approve the exact upload/moderation action.
5. Approve or define the cleanup path.

## 11. Stop Conditions For Future Live QA

Stop immediately if:

- credentials are missing or fail login;
- a token, cookie, secret, signed URL, or private path appears in logs or a diff;
- the tested account is not disposable;
- the selected submission might be real member content;
- cleanup cannot be tied only to this test run;
- upload/moderation requires schema, RLS, Storage policy, or Edge Function changes;
- `supabase db push` or Edge Function deployment appears necessary;
- validation fails outside the known MP3 warning.

## 12. Validation Result

Branch validation passed:

- `npm run check`
- `git diff --check`
- `node scripts/check-json.mjs`
- `node scripts/check-js.mjs`
- `node scripts/check-refs.mjs`
- `node scripts/check-assets.mjs`
- `npm run check:protected-content`
- `npm run check:content`
- `npm run check:supabase-config`
- `npm run check:production`
- `npm run smoke:gallery`
- `npm run smoke:gallery-approved-feed`
- `npm run smoke:supabase-auth-boundary`
- `npm run smoke:supabase-edge-functions`

Known expected warning:

- `assets/audio/mochiriiiiii.mp3` remains over the normal large-asset threshold.

## 13. Safety Confirmation

- Protected content unchanged.
- Data files unchanged.
- No secrets committed.
- No test credentials stored.
- No live OAuth completion attempted.
- No profile update.
- No upload.
- No approval/rejection.
- No Storage deletion.
- No `supabase db push`.
- No Edge Functions deployed.
- No production data mutation.
