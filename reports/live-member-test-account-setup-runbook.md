# Live Member Test Account Setup Runbook

Date: 2026-05-15
Branch: `docs/live-member-test-account-setup-runbook`
Mode: documentation / report-only

This runbook defines the exact credential and setup runway required before the blocked live member workflow QA branches can resume. It does not authorize live OAuth, profile edits, uploads, moderation, cleanup, Supabase mutations, schema changes, Storage changes, or Edge Function deployment.

No secrets, credentials, user tokens, cookies, Discord secrets, private Storage paths, signed URLs, protected content, data files, site behavior, public copy, CSS, Supabase configuration, migrations, RLS policies, Storage policies, Edge Functions, or production data were changed.

## 1. Source Evidence

Primary reports:

- `reports/live-member-workflow-readiness-review.md`
- `reports/live-member-workflow-goal-progress.md`
- `reports/member-workflow-test-account-matrix.md`
- `reports/production-member-workflow-smoke.md`
- `reports/supabase-manual-parity-runbook.md`
- `reports/supabase-parity-hardening-goal-progress.md`

Member workflow surfaces inspected:

- `auth.html`
- `account.html`
- `gallery-submit.html`
- `leader-dashboard.html`
- `supabase.js`

Current evidence says signed-out, public Gallery, approved-feed, auth-boundary, Edge Function fail-closed, protected-content, content, and Supabase public-config checks are already covered by local-safe validation. The remaining gap is credential-gated and mutation-gated live positive-path QA.

## 2. Required Test Identities

| Identity | Purpose | Required state | Mutation allowed? |
| --- | --- | --- | --- |
| Anonymous visitor | Signed-out gates, public pages, public Gallery, OAuth redirect start. | No credentials. | No. |
| Disposable signed-in Discord user without required roles | D02 OAuth completion, signed-in shell, missing-role guidance, sign-out. | Discord account can complete OAuth but lacks required guild/role access. | No. |
| Disposable verified active member | D02 account/profile/verification display and D03 upload eligibility. | Discord account is in the server, has required roles, has active website member status. | D02 no; D03 only with approval. |
| Disposable moderator/leader account | D03 leader queue visibility and moderation action on only the disposable test submission. | Discord account has moderator/leader access recognized by the site. | D03 only with approval. |

The test identities must be disposable, operator-owned or explicitly approved for QA, and never stored in the repo. Do not use personal accounts for production-mutating tests unless leadership explicitly approves that exact use.

## 3. Discord Account Requirements

Each disposable Discord identity should have:

- a clear QA-only display label known to the operator;
- no shared password or token pasted into terminal output, reports, PRs, screenshots, or chat;
- access to the production OAuth flow only after the D02 branch is opened and approved;
- no private member content, real member profile data, or production-only screenshots attached to the account.

The unverified test identity must be able to sign in but must not have the required guild roles. This proves the missing-role and upload-denied states without touching real member data.

## 4. Discord Server Role Requirements

The verified active member identity needs the same role conditions enforced by the website:

- Discord server membership;
- completed Discord verification;
- `Mochirii - WWM`;
- `Verified`;
- any additional server-side role or membership state currently required by the production Supabase functions.

The moderator/leader identity must additionally have the moderator role required by the protected moderation queue and `moderate-gallery-submission` flow.

Public reports should record only role-state outcomes such as "verified active member: pass" or "moderator access: pass". Do not record Discord user IDs, raw role IDs from private dashboards, tokens, cookies, or screenshots that expose account details.

## 5. Website Member Status Requirements

For D02 non-mutating checks:

- the signed-in test account must be safe to read from `account.html`;
- profile display, Discord verification display, upload eligibility display, and sign-out may be observed;
- no profile save should be performed unless a future branch explicitly approves a disposable profile mutation.

For D03 controlled mutation checks:

- the uploader account must show active member status;
- upload eligibility must be visible before selecting a file;
- the moderator account must reach the review dashboard without changing any submission until the exact disposable test submission is identified.

## 6. Upload Eligibility Requirements

Before any D03 upload:

- D01/D02 evidence must confirm sign-in and account state are working.
- The active member test account must be verified, active, and eligible to upload.
- The local operator must have a disposable test image that meets the browser rules: JPEG, PNG, or WebP, under 50 MB.
- The planned title, caption, category, and cleanup boundary must be written in a private operator note.
- Human approval must explicitly allow one disposable production upload and the chosen approval or rejection path.

Do not upload from a real member account, use real member images, or upload anything containing private chat, account IDs, faces, sensitive information, copyrighted third-party material, or content that cannot safely remain briefly visible if approval is tested.

## 7. Moderator Dashboard Access Requirements

Before D03 moderation:

- a disposable moderator/leader account must be available;
- the queue must be opened only after the disposable test submission exists;
- the operator must identify the test submission by the agreed marker, timestamp, and private note;
- no real member submission may be approved, rejected, archived, deleted, or otherwise changed;
- signed private previews must not be copied into reports, PRs, screenshots, or logs.

If the test submission cannot be distinguished from real member content, stop immediately.

## 8. Test Image And Marker Convention

Use one unique marker across filename, title, and caption so the test artifact can be located without exposing private IDs.

Recommended values:

- Filename: `mochirii-qa-test-YYYYMMDD.webp`
- Title prefix: `Mochirii QA Test`
- Title example: `Mochirii QA Test - 2026-05-15`
- Caption marker: `Mochirii QA Test disposable upload for live workflow verification.`
- Category: `gatherings` unless a later branch explicitly selects another supported category.

The unique marker should be public-safe, short, and obvious enough that a moderator will not mistake the item for real member content.

## 9. Cleanup Expectations

Before D03 starts, create a private operator note with:

- test account label;
- upload timestamp;
- local test filename;
- title prefix and caption marker;
- created submission ID after upload;
- created Storage object path after upload;
- moderation decision used for the test;
- approved-feed observation;
- final cleanup decision and evidence.

Public reports may record only sanitized cleanup status:

- disposable test submission created / not created;
- pending hidden from public Gallery;
- approved visible / not tested;
- rejected hidden / not tested;
- cleanup complete / cleanup deferred with reason.

Do not publish raw submission IDs, private Storage paths, signed URLs, user IDs, emails, tokens, cookies, or Discord identifiers.

Deletion is not allowed unless:

- the object or row is proven to belong to this test run;
- deletion is explicitly approved;
- the cleanup path is supported by the website/admin process or an approved manual runbook.

If deletion is not supported or not approved, leave the artifact in the safest non-public state available and document the remaining artifact privately.

## 10. Allowed Actions

Allowed before D02:

- inspect repo files and reports;
- run local-safe validation scripts;
- prepare local-only credential notes outside the repo;
- verify signed-out pages and OAuth redirect start without entering credentials.

Allowed during D02 after approval:

- complete OAuth with a disposable test account;
- view signed-in account state;
- view Discord verification and upload eligibility state;
- refresh verification only if approved as a non-mutating or acceptable self-profile check;
- sign out.

Allowed during D03 after approval:

- upload one disposable test image from the approved active member test account;
- verify the pending item is not public;
- inspect only the disposable submission in the moderator queue;
- approve or reject only that disposable submission as agreed;
- verify approved-feed visibility if approval is selected;
- perform only the approved cleanup action.

## 11. Forbidden Actions

Do not:

- commit credentials or real local QA files;
- print tokens, cookies, access tokens, refresh tokens, Discord secrets, bot tokens, service-role keys, database URLs, private paths, or signed URLs;
- use real member submissions for moderation testing;
- upload non-test images;
- approve, reject, archive, delete, or alter any real member submission;
- delete Storage objects unless they are proven test artifacts and deletion is approved;
- run `supabase db push`;
- deploy Edge Functions;
- change schema, migrations, RLS policies, Storage policies, or provider settings;
- change protected content, data files, public copy, CSS, workflows, or site behavior as part of setup.

## 12. Pre-Approval Checklist Before D02

D02 may resume only when all items are true:

- An approved disposable Discord test account is available.
- The account is intended for non-mutating live OAuth/profile verification.
- The operator confirms credentials will not be pasted into repo files, logs, PRs, or reports.
- The test can be run without saving profile fields, uploading files, moderating submissions, or deleting anything.
- Local validation passes on current `main`.
- The expected branch is `qa/live-auth-profile-verification-smoke`.

Stop before D02 if any credential is missing, personal-only, not approved, or likely to expose secrets in logs.

## 13. Pre-Approval Checklist Before D03

D03 may resume only when all items are true:

- D02 completed and confirmed live sign-in/sign-out account behavior.
- An active verified member test account is available.
- A moderator/leader test account is available.
- A disposable test image is prepared.
- The title prefix, caption marker, and filename marker follow this runbook.
- A private cleanup note exists before upload.
- Human approval explicitly allows one disposable upload and one moderation decision.
- The cleanup path is clear and limited only to the test artifact.
- Local validation passes on current `main`.
- The expected branch is `qa/live-member-upload-moderation-smoke`.

Stop before D03 if cleanup is unclear, the moderator account is unavailable, the submission could be confused with real content, or any production change outside the test artifact appears necessary.

## 14. Stop Conditions

Stop immediately if:

- a secret, token, cookie, signed URL, private Storage path, or real credential appears in terminal output, a diff, a report, a screenshot, or a PR;
- a required test account is unavailable or fails login;
- live OAuth cannot complete without exposing credentials;
- upload eligibility requires profile, schema, RLS, Storage, provider, or Edge Function changes;
- the selected submission might be real member content;
- cleanup cannot be tied only to the disposable test artifact;
- `supabase db push` or Edge Function deployment appears necessary;
- validation fails outside the known intentional MP3 warning;
- the test would mutate anything not covered by explicit approval.

## 15. Approval Owner

Live mutation testing requires explicit human approval from the repository/operator owner or delegated guild leadership responsible for the production Supabase project and member Gallery data.

Approval must cover:

- which account labels are allowed;
- whether OAuth is permitted;
- whether upload is permitted;
- whether approval or rejection is permitted;
- whether deletion/cleanup is permitted;
- what evidence may be recorded publicly.

Absence of approval means no mutation.

## 16. Exact Next Command Once Credentials Are Ready

Once the D02 pre-approval checklist is satisfied, resume the live QA path from current `main`:

```sh
git checkout main
git pull --ff-only origin main
git checkout -b qa/live-auth-profile-verification-smoke
```

Then run the D02 branch validation and record only sanitized credentialed results in `reports/live-auth-profile-verification-smoke.md`.

Do not start D03 until D02 is merged, validated, and the D03 pre-approval checklist is satisfied.

## 17. Validation Result

E01 branch validation passed:

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

## 18. Safety Confirmation

- Protected content unchanged.
- Data files unchanged.
- No secrets committed.
- No real credentials committed.
- No live OAuth attempted.
- No upload attempted.
- No approval/rejection attempted.
- No Storage deletion attempted.
- No Supabase production data mutation.
- No `supabase db push`.
- No Edge Functions deployed.
