# Live Member Workflow Goal Progress

Started: 2026-05-15
Baseline main at start: `ba8c3ff9301abbec45e371d72bb8a5f4dc0a87c6`
Baseline tag at start: `v2.9.0-supabase-parity-hardening-baseline`

This tracker records the live credentialed member workflow QA milestone. Live login, profile reads, uploads, moderation, approval/rejection, cleanup, and tagging must proceed only when disposable test credentials and a safe cleanup path are available.

Protected content, data files, public copy, CSS, Supabase schema/config, RLS policies, Storage policies, Edge Function deployments, migrations, workflows, secrets, real member submissions, and real member Storage objects remain out of scope.

## Progress

| ID | Branch or tag | Status | PR | Merge commit or tag object | Credentials available? | Next |
| --- | --- | --- | --- | --- | --- | --- |
| D01 | `qa/live-member-workflow-readiness-review` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/161> | `2564b3a07d51eabcf80d63f33d74e9f13d085f63` | No | Stop before D02 unless credentials are provided |
| D02 | `qa/live-auth-profile-verification-smoke` | Blocked | Pending | Pending | No | Requires approved non-mutating test credentials |
| D03 | `qa/live-member-upload-moderation-smoke` | Blocked | Pending | Pending | No | Requires active member, moderator, test image, and cleanup approval |
| D04 | `qa/post-live-member-workflow-regression` | Blocked | Pending | Pending | No | Requires D03 completion |
| D05 | `v3.0.0-live-member-workflow-qa-baseline` | Blocked | n/a | Not created | No | Requires full live path verification |

## D01 Notes

- Branch: `qa/live-member-workflow-readiness-review`
- Report: `reports/live-member-workflow-readiness-review.md`
- PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/161>
- Merge commit: `2564b3a07d51eabcf80d63f33d74e9f13d085f63`
- Current state: complete.
- Credential status: no approved unverified test account, active member test account, moderator test account, test image, or cleanup authority is available in this run.
- Validation summary: full standard branch validation, CI validation, and post-merge validation passed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Blockers or limitations: D02-D05 must not start until approved disposable credentials and cleanup authority are provided.
- Next item: stop and report the credential/setup requirements.

## Stop State

This run stopped after D01 by design.

Credentials available: no.

Required before continuing to D02:

- approved disposable Discord test account for OAuth completion;
- explicit confirmation that non-mutating signed-in profile/account checks may be run;
- no profile-save, upload, moderation, cleanup, token logging, or credential storage.

Required before continuing to D03:

- active verified member test account;
- moderator/leader test account;
- disposable test image and title/caption marker;
- documented cleanup path and human approval for upload/moderation/cleanup;
- confirmation that no real member submission or Storage object will be changed.

D05 tag status: `v3.0.0-live-member-workflow-qa-baseline` was not created because the live upload/moderation path was not verified.
