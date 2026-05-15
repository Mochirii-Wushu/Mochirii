# Member Workflow Test Account Matrix

Date: 2026-05-15
Branch: `qa/member-workflow-test-account-matrix`
Mode: QA/report-first

## 1. Scope

This review defines the live member/moderator test-account matrix for OAuth, Discord verification, profile management, upload eligibility, upload submission, My Gallery summaries, moderation queue, approve/reject actions, public approved Gallery feed, cleanup, and failure states.

No site behavior, data files, protected content, CSS, JavaScript, assets, workflows, Supabase configuration, migrations, or Edge Functions were changed.

No production profile update, upload, moderation action, cleanup, Storage deletion, `supabase db push`, or Edge Function deployment was performed.

## 2. Files And Reports Inspected

- `auth.html`, `auth.js`
- `account.html`, `account.js`
- `gallery-submit.html`, `gallery-submit.js`
- `leader-dashboard.html`, `leader-dashboard.js`
- `supabase.js`
- `reports/supabase-production-security-review.md`
- `reports/member-gallery-end-to-end-review.md`
- `reports/production-member-workflow-smoke.md`
- `reports/supabase-ci-and-parity-review.md`

## 3. Non-Mutating Evidence Collected

### Signed-out page matrix

Local and production browser checks covered:

| Page | Local result | Production result | Notes |
| --- | --- | --- | --- |
| `auth.html` | `200`, one `h1`, `noindex`, login visible, signed-in controls hidden, no overflow | Same | No console-breaking site errors. |
| `account.html` | `200`, one `h1`, `noindex`, signed-out panel visible, account panel hidden, no overflow | Same | No private dashboard exposed signed out. |
| `gallery-submit.html` | `200`, one `h1`, `noindex`, upload gate visible, upload panel hidden, no overflow | Same | No upload form exposed signed out. |
| `leader-dashboard.html` | `200`, one `h1`, `noindex`, signed-out panel visible, review panel hidden, no overflow | Same | No moderation queue exposed signed out. |

### OAuth redirect start

The production `Login with Discord` button was clicked only far enough to verify redirect start. No Discord credentials were entered.

Result:

- Browser reached `discord.com`.
- OAuth URL included a `redirect_uri`.
- Redirect URI host was the Supabase project host.
- Redirect target included production `account.html`.
- Client ID and scope parameters were present.

### Prior proof reused

- `reports/member-gallery-end-to-end-review.md` proves mocked signed-out, missing-role, active member, active moderator, pending, approved-feed success/failure, upload success, and upload error states.
- `reports/production-member-workflow-smoke.md` proves live signed-out production pages, OAuth redirect start, public Gallery approved feed, and no visible private Storage path in the public Gallery.
- `reports/supabase-ci-and-parity-review.md` proves protected public tables and protected functions fail closed without JWTs.

## 4. Required Account Types

| Account type | Purpose | Required setup | Mutation risk |
| --- | --- | --- | --- |
| Anonymous visitor | Signed-out gates, noindex pages, public Gallery feed, OAuth redirect start. | None. | None. |
| Signed-in unverified Discord user | Auth session, Account loading, missing-role guidance, verification failure/retry states. | Test Discord user can sign in but lacks required guild/roles. | Low for read-only checks; profile update would mutate. |
| Verified guild member | Discord verification success, profile state, required-role display. | Test Discord user in guild with required role IDs. | Low for read-only; profile update mutates own row. |
| Active member eligible to upload | Upload gate, file validation, Storage upload, pending submission, My Gallery summary. | Verified member plus `member_status = active`. | Medium; creates Storage object and `gallery_submissions` row. |
| Moderator/leader | Queue listing, signed previews, approve/reject, audit events. | Verified member with Moderator role. | High; moderation actions mutate submission status and audit events. |

## 5. Test Matrix

| Workflow | Anonymous | Signed-in unverified | Verified member | Active uploader | Moderator/leader | Current status |
| --- | --- | --- | --- | --- | --- | --- |
| OAuth login start | Can start redirect | N/A after sign-in | N/A after sign-in | N/A after sign-in | N/A after sign-in | Production redirect start verified without credentials. |
| OAuth login completion | N/A | Required | Required | Required | Required | Blocked: requires approved test credentials. |
| Discord role verification | Not available | Expected fail/role guidance | Expected pass for required roles | Expected pass | Expected pass plus moderator check | Blocked for live positive path. |
| Profile read | Not available | Own profile only | Own profile only | Own profile only | Own profile only | Blocked for live signed-in read. |
| Profile update | Not available | Mutates own test profile | Mutates own test profile | Mutates own test profile | Mutates own test profile | Manual/staged only. |
| Upload eligibility | Signed-out gate | Missing roles or verification expired | May need active status | Ready to upload | Ready if active | Signed-out verified; other states mocked previously. |
| Upload submission | Not available | Not allowed | Not allowed unless active | Creates private Storage object and pending row | Creates private Storage object and pending row | Manual/staged only. |
| My Gallery summary | Not available | Own submissions only | Own submissions only | Shows pending/approved/rejected/archived own rows | Own submissions only | Mocked previously; live requires credentials. |
| Leader queue | Signed-out gate | Access denied | Access denied | Access denied unless moderator | Queue visible | Signed-out verified; positive path needs moderator account. |
| Approve/reject | Not available | Not available | Not available | Not available | Mutates pending row and audit event | Manual/staged only. |
| Approved Gallery feed | Public static+approved feed | Public static+approved feed | Public static+approved feed | Submitted item appears only after approval | Same | Live public feed verified in prior production smoke; N03 will deepen feed matrix. |
| Cleanup/deletion policy | N/A | N/A | N/A | Needs explicit test object cleanup plan | Needs explicit cleanup authority | Not performed. |

## 6. Safe To Automate

These can be automated without credentials or production mutation:

- Public/member page availability for `auth.html`, `account.html`, `gallery-submit.html`, and `leader-dashboard.html`.
- Signed-out gate visibility and private-panel hidden checks.
- `noindex,follow` verification on member workflow pages.
- One `h1` per page and no horizontal overflow checks.
- OAuth redirect-start only, stopping before credential entry.
- Public approved Gallery feed visibility and private path absence.
- Protected public table/function fail-closed probes using the publishable key only.
- Mocked browser states for signed-in missing-role, active member, moderator, upload success/error, queue success/error, and approved-feed success/failure.

## 7. Requires Live Credentials

These require approved test accounts and should be skipped otherwise:

- Completing Discord OAuth login.
- Reading the signed-in user's current profile from production.
- Running `verify-discord-member` with a real user JWT.
- Confirming verified guild-member role state.
- Confirming active member upload eligibility with real RLS and Storage policies.
- Reading My Gallery submissions from production.
- Listing the moderation queue as a moderator.
- Confirming moderator denial for a non-moderator signed-in user.

## 8. Destructive Or Mutating Tests

These should remain manual or staged unless the operator explicitly approves a production test-data window:

- Saving profile fields.
- Uploading a test image.
- Creating a pending `gallery_submissions` row.
- Approving a pending submission.
- Rejecting a pending submission.
- Archiving, deleting, or otherwise cleaning production submissions.
- Removing private Storage objects.
- Editing RLS policies, migrations, Storage settings, secrets, or Edge Function deployments.

## 9. Cleanup Plan For Live Upload Testing

If a future branch is approved for production test uploads:

1. Use a dedicated test Discord account and a clearly named test image.
2. Record the created submission ID and Storage path in a private operator note, not in a public report.
3. Verify the pending submission appears only to the uploader and moderators.
4. If approval is tested, verify it appears in the public approved feed, then immediately mark the test record for cleanup.
5. Cleanup should use an approved admin path or migration/runbook, not ad hoc browser deletion.
6. Confirm the Storage object is removed only after explicit approval.
7. Record cleanup completion without publishing signed URLs, bearer tokens, or private paths.

## 10. Failure-State Checks

| Failure state | Expected behavior | Safe automation |
| --- | --- | --- |
| Signed out | Login gate visible; private panels hidden. | Yes. |
| OAuth start failure | Auth error shown in `role="alert"`; status clears. | Mocked/local only. |
| Missing required roles | Account/upload guidance explains roles and next step. | Mocked/local. |
| Verification expired | User can refresh verification; upload remains blocked. | Mocked/local. |
| Suspended or archived member status | Upload blocked with leadership guidance. | Mocked/local. |
| Invalid file type | Upload rejects non-JPEG/PNG/WebP. | Mocked/local with fake file. |
| Oversized file | Upload rejects over 50 MB. | Mocked/local, no real upload. |
| Upload insert failure after Storage upload | Helper attempts Storage cleanup. | Unit/mock only; do not force in production. |
| Moderator missing role | Access denied panel visible. | Mocked/local or live with approved non-moderator test account. |
| Queue/function failure | Error alert visible; queue remains unavailable. | Mocked/local. |
| Approve/reject validation | Reject invalid action or missing decline reason. | Mocked/local. |

## 11. Recommended Test Account Requirements

Minimum useful account set:

1. `mochirii-test-unverified`: can sign in with Discord but has no guild role access.
2. `mochirii-test-verified`: in the guild with required roles but not active website member status.
3. `mochirii-test-active-member`: required roles plus active website member status.
4. `mochirii-test-moderator`: required roles plus Moderator role.

Recommended controls:

- Test accounts should be clearly named and owned by the operator.
- Test accounts should not share credentials in repo, PRs, screenshots, or logs.
- Test data should use obvious titles such as `TEST - delete after QA`.
- Any created submission ID and Storage path should stay in a private operator checklist.
- A moderator should approve cleanup before deleting records or objects.

## 12. Findings

No new member workflow blocker was found in non-mutating checks.

Current confidence:

- Signed-out member pages are safe locally and in production.
- OAuth redirect start works in production.
- Mocked positive/negative workflow states have prior coverage.
- Public approved feed has prior live coverage.

Remaining confidence gap:

- Live signed-in positive paths remain credential-gated.
- Upload, moderation, approval, and cleanup remain mutation-gated.
- The upload success message in `gallery-submit.js` still says the image will not appear until a later approval workflow exists, although the approval workflow now exists. This is a low-risk copy polish item for a future status-copy branch, not a blocker for this report-only matrix.

## 13. Branch Recommendations

| Priority | Branch | Purpose |
| --- | --- | --- |
| P1 | `qa/member-workflow-live-test-accounts` | Operator-assisted live OAuth/profile/upload/moderation test using dedicated accounts. |
| P1 | `qa/member-workflow-mocked-state-suite` | Convert the existing mocked state evidence into a repeatable dependency-free script if feasible. |
| P2 | `content/member-workflow-status-copy-polish` | Refresh stale status copy after the test-account matrix is accepted. |
| P2 | `docs/member-workflow-cleanup-checklist` | Expand the cleanup policy into a private-path-safe operator checklist. |

## 14. Safety Confirmation

- No data files changed.
- Protected content was not changed.
- No secrets were committed.
- No production member data was mutated.
- No live upload was attempted.
- No approval/rejection was attempted.
- No Storage object was created or deleted.
- No `supabase db push` was run.
- No Edge Functions were deployed.

## 15. Next Recommended Item

Continue to N03: `qa/gallery-approved-feed-regression-matrix`.
