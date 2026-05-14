# Account Member Dashboard Review

Date: 2026-05-14
Branch: `qa/account-member-dashboard-review`
PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/117>
Goal: G05
Mode: QA with one narrow confirmed fix

## 1. Scope

This review checked the Account member dashboard across:

- signed-out browsing
- signed-in member overview
- profile form payload ordering
- profile completeness rendering
- Discord verification CTA status/error behavior
- upload guidance and Submit Image gating
- submission summary counts and recent submissions
- Leader Dashboard link gating
- private member Gallery storage path exposure

No data files, protected copy, migrations, Edge Functions, workflows, assets, dependencies, or Supabase configuration were changed.

No Supabase database mutation was run. No Edge Functions were deployed.

## 2. Files Inspected

- `reports/codex-goal-roadmap.md`
- `reports/member-gallery-end-to-end-review.md`
- `account.html`
- `account.js`
- `supabase.js`
- `styles.css`
- `docs/join-guide.md`
- `docs/home-shell-guide.md`

## 3. Change Made

One confirmed Account accessibility/status regression was fixed in `account.js`.

Before the fix, the Discord verification button wrote success or error feedback, then immediately called `loadAccount()`. The reload path clears `#verifyError` and re-renders `#verifyStatus`, so failed verification feedback disappeared from the `role="alert"` element and successful verification feedback was replaced before the visitor could rely on it.

Fix:

- Capture the verification result message.
- Refresh the Account dashboard state.
- Restore the verification error or success message after the refresh.

This preserves the existing verification flow while keeping the accessible result message visible.

## 4. Live Signed-Out Smoke

Local static server: `http://127.0.0.1:8765`

Viewport: `390px`

Result:

- `account.html` loaded.
- Signed-out panel was visible.
- Account dashboard panel stayed hidden.
- Login CTA still points to `./auth.html`.
- No horizontal overflow.
- No console-breaking errors.

## 5. Mocked Account State Matrix

Local static server: `http://127.0.0.1:8765`

Viewport: `390px`

| State | Result |
| --- | --- |
| Signed out | Signed-out panel visible, Account dashboard hidden, Submit Image and Leader Dashboard links hidden. |
| Signed in but missing roles | Upload eligibility reads missing required roles, Submit Image link hidden, Leader Dashboard link hidden, zero-count submission summary rendered. |
| Active member | Upload eligibility reads ready to upload, Submit Image link visible, Leader Dashboard link hidden, pending/approved submission counts rendered. |
| Active moderator | Submit Image and Leader Dashboard links visible, moderator access reads available. |
| Profile save | Editable field payload order stayed `display_name`, `game_uid`, `discord_handle`, `region`, `timezone`, `avatar_url`, `bio`; saved status remained visible. |
| Verification error | `#verifyError` remains visible with the failed verification message after Account refresh. |
| Verification success | `#verifyStatus` remains visible with the successful verification message after Account refresh. |

All mocked Account scenarios returned `200`, had no horizontal overflow at `390px`, and produced no console-breaking errors.

## 6. Account Safety Notes

- Profile fields remain limited to the safe editable fields defined in `supabase.js`.
- Profile form HTML maxlength values match the public helper limits.
- Submission summaries render counts for total, pending, approved, rejected, and archived states.
- Recent submission cards render title, caption, rejection reason, status, submitted date, reviewed date, and category.
- Mocked private `storage_bucket` and `storage_path` values did not appear in visible Account text.
- Leader Dashboard link visibility remains gated through `checkLeaderGalleryModerationAccess()`.
- Submit Image link visibility remains gated through active member upload eligibility.

## 7. Limitations

The following require approved credentials or explicit production test data scope:

- Real Discord OAuth sign-in with a test user.
- Real Discord guild/role verification against Discord.
- Real profile update mutation in production.
- Real member submission history from production records.
- Real moderator access check with a production moderator account.

Those should remain in G09 or a separately approved test-account workflow.

## 8. Findings

No broad Account dashboard blocker remains after the narrow verification feedback fix.

Follow-up notes:

1. G06 should focus on public Gallery approved-feed merge/fallback behavior.
2. G09 should cover live production member workflows only with approved test accounts and explicit mutation boundaries.

## 9. Validation Summary

G05-specific checks completed:

- Account source inspection.
- Live signed-out Account smoke.
- Mocked browser smoke for signed-out, missing-role, active member, active moderator, profile save, verification error, and verification success states.
- Private storage path exposure check.

Final command validation is recorded in the roadmap and PR after this report is committed.

Final command validation:

| Command | Result |
| --- | --- |
| `npm run check` | Passed, with the known intentional MP3 size warning. |
| `git diff --check` | Passed. |
| `node --check account.js && node --check supabase.js` | Passed. |
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

G06 - `qa/gallery-approved-feed-integration-review`
