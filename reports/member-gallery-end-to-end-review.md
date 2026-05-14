# Member Gallery End-To-End Review

Date: 2026-05-14
Branch: `qa/member-gallery-end-to-end-review`
PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/115>
Goal: G04
Mode: QA with one narrow confirmed fix

## 1. Scope

This review checked the member Gallery workflow across:

- `auth.html` / `auth.js`
- `account.html` / `account.js`
- `gallery-submit.html` / `gallery-submit.js`
- `leader-dashboard.html` / `leader-dashboard.js`
- `gallery.html` / `gallery.js`
- shared member workflow helpers in `supabase.js`

No data files, protected copy, migrations, Edge Functions, workflows, assets, or dependencies were changed.

No Supabase database mutation was run. No Edge Functions were deployed.

## 2. Files Inspected

- `reports/codex-goal-roadmap.md`
- `reports/supabase-production-security-review.md`
- `reports/supabase-edge-functions-review.md`
- `reports/member-gallery-upload-limit-review.md`
- `auth.html`, `auth.js`
- `account.html`, `account.js`
- `gallery-submit.html`, `gallery-submit.js`
- `leader-dashboard.html`, `leader-dashboard.js`
- `gallery.html`, `gallery.js`
- `supabase.js`
- `supabase/config.toml`
- `supabase/README.md`

## 3. Change Made

One confirmed regression was fixed in `gallery-submit.js`.

Before the fix, the successful upload path set `#uploadStatus` to the success message, then immediately called `checkAccess()`. `checkAccess()` clears `#uploadStatus` at the start, so the success message disappeared before visitors could rely on it.

Fix:

- Store the success message.
- Refresh access/submissions.
- Restore the success message after the refresh.

This keeps the existing upload behavior and preserves the accessible `role="status"` success feedback.

## 4. Signed-Out Live Smoke

The standard local/production checks and page loads confirmed signed-out browsing remains stable. No real member credentials or test Discord account were available in this session, so positive member states were tested with browser-level mocks.

## 5. Mocked Browser State Matrix

Local static server: `http://127.0.0.1:8765`

Viewport: `390px`

| State | Page | Result |
| --- | --- | --- |
| Signed out | `auth.html` | Login CTA visible, state reads signed out. |
| Signed in mock | `auth.html` | Account link visible, state reads signed in. |
| Signed out | `account.html` | Signed-out panel visible, account panel hidden. |
| Signed in but missing roles | `account.html` | Upload eligibility reads missing required roles, Submit link hidden. |
| Active eligible moderator | `account.html` | Upload eligibility ready, Submit link visible, Leader Dashboard link visible, submission summary rendered. |
| Signed out | `gallery-submit.html` | Login CTA visible, upload panel hidden. |
| Signed in but missing roles | `gallery-submit.html` | Verification refresh CTA visible, upload panel hidden. |
| Active eligible upload success | `gallery-submit.html` | Upload panel visible, success status remains visible after refresh. |
| Active eligible upload error | `gallery-submit.html` | Upload error message appears, upload panel remains usable. |
| Signed out | `leader-dashboard.html` | Signed-out panel visible. |
| Signed in without moderator access | `leader-dashboard.html` | Access denied panel visible with moderator-role guidance. |
| Moderator access | `leader-dashboard.html` | Review panel visible, pending submission renders. |
| Approved feed success | `gallery.html?approvedFeed=1` | Static gallery plus one approved mocked member item rendered, 74 thumbnails total. |
| Approved feed failure | `gallery.html?approvedFeed=1` | Static gallery fallback rendered, 73 thumbnails total. |

All mocked browser scenarios returned `200`, had no horizontal overflow at `390px`, and produced no console-breaking errors.

## 6. Workflow Notes

- Auth page correctly distinguishes signed-out and signed-in states.
- Account page shows profile, upload eligibility, submission counts, and moderator link gating as expected.
- Gallery Submit correctly gates signed-out, missing-role, and eligible states.
- Upload denial and upload error states remain visible.
- Upload success status now remains visible after the post-submit access/submission refresh.
- Leader Dashboard correctly distinguishes signed-out, access-denied, and moderator states.
- Moderation queue rendering handles pending mocked submissions.
- Gallery approved-feed success adds member submissions without breaking the static Gallery.
- Gallery approved-feed failure falls back to static Gallery.
- Live positive-path upload and moderation were not attempted because no approved test account/session was available and this goal does not authorize production test data mutation.

## 7. Limitations

The following require approved credentials or explicit production test data scope:

- Real Discord OAuth sign-in with a test user.
- Real Discord guild/role verification.
- Real Storage upload to `member-gallery`.
- Real moderation action against a pending production submission.
- Real approval-to-public-feed lifecycle using production records.

Those should remain in G09 or a separately approved test-account workflow.

## 8. Findings

No broad workflow blocker remains after the narrow upload success-status fix.

Follow-up notes:

1. G05 should focus on Account dashboard details and profile form behavior.
2. G06 should focus on the public Gallery approved-feed merge/fallback behavior.
3. G09 should cover live production workflows only with approved test accounts and explicit mutation boundaries.

## 9. Validation Summary

G04-specific checks completed:

- Member workflow source inspection.
- Mocked browser smoke for signed-out, signed-in, denied, eligible, pending, approved-feed success, approved-feed failure, upload success, and upload error states.
- Focused upload success regression repro before the fix.
- Focused upload success regression proof after the fix.
- Protected data diff check.

Final command validation:

| Command | Result |
| --- | --- |
| `npm run check` | Passed, with the known intentional MP3 size warning. |
| `git diff --check` | Passed. |
| `node --check auth.js && node --check account.js && node --check gallery-submit.js && node --check leader-dashboard.js && node --check gallery.js && node --check supabase.js` | Passed. |
| `node scripts/check-json.mjs` | Passed. |
| `node scripts/check-js.mjs` | Passed. |
| `node scripts/check-refs.mjs` | Passed. |
| `node scripts/check-assets.mjs` | Passed, with the known intentional MP3 size warning. |
| `npm run check:production` | Passed. |
| `npm run smoke:gallery` | Passed. |
| `git diff -- data/ --stat` | Empty. |

## 10. Safety Confirmation

- No data files changed.
- Protected content was not changed.
- No secrets were committed.
- No `supabase db push` was run.
- No Edge Functions were deployed.
- No migrations were created.
- No Supabase configuration was changed.

## 11. Next Recommended Item

G05 - `qa/account-member-dashboard-review`
