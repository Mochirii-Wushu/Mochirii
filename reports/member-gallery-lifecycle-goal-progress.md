# Member Gallery Lifecycle Goal Progress

Started: 2026-05-15
Baseline main at start: `bd59d4043569a439f3efb0ed20485d0c531c7113`
Purpose: formally defer credential-gated live member workflow QA, then complete non-credentialed member Gallery lifecycle and cleanup planning/hardening.

This tracker records report-only and non-mutating QA work. It does not authorize live OAuth, uploads, moderation actions, approval/rejection, cleanup, Storage deletion, Supabase production mutation, schema changes, RLS changes, Storage policy changes, Edge Function deployment, data edits, protected-content edits, CSS edits, public-copy edits, or workflow edits.

## Progress

| ID | Branch or tag | Status | PR | Merge commit or tag object | Deferred credential-gated status | Blockers | Next |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F01 | `docs/defer-live-member-workflow-qa` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/168> | `9b6e94b1a4e6792997e2d9fc5449a1540e7cd074` | D02/D03 deferred | None | F02 |
| F02 | `docs/member-gallery-lifecycle-cleanup-plan` | In progress | Pending | Pending | D02/D03 deferred | None | F03 |
| F03 | `qa/member-gallery-cleanup-safety-review` | Pending | Pending | Pending | D02/D03 deferred | Requires F02 merge | F04 |
| F04 | `qa/gallery-approved-feed-lifecycle-regression` | Pending | Pending | Pending | D02/D03 deferred | Requires F03 merge | F05 |
| F05 | `v3.1.0-member-gallery-lifecycle-planning-baseline` | Pending | n/a | Pending | D02/D03 deferred | Requires F01-F04 complete | Final validation |

## F01 Notes

- Branch: `docs/defer-live-member-workflow-qa`
- Report: `reports/live-member-workflow-qa-deferred.md`
- PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/168>
- Merge commit: `9b6e94b1a4e6792997e2d9fc5449a1540e7cd074`
- Current state: complete.
- Validation summary: full standard branch validation, CI validation, and post-merge validation passed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Deferred credential-gated status: D02 and D03 are intentionally deferred because disposable test accounts are unavailable.
- Blockers or limitations: live credentialed QA remains blocked; this branch only records the deferral.
- Next item: F02 `docs/member-gallery-lifecycle-cleanup-plan`.

## F02 Notes

- Branch: `docs/member-gallery-lifecycle-cleanup-plan`
- Report: `reports/member-gallery-lifecycle-cleanup-plan-v2.md`
- Current state: in progress.
- Validation summary: pending branch validation.
- Deferred credential-gated status: D02 and D03 remain deferred.
- Blockers or limitations: none for report-only lifecycle planning. No cleanup, mutation, or Storage deletion is performed.
- Next item: F03 `qa/member-gallery-cleanup-safety-review` after F02 PR merge and post-merge validation.

## Credential-Gated QA Status

- D02 `qa/live-auth-profile-verification-smoke`: deferred.
- D03 `qa/live-member-upload-moderation-smoke`: deferred.
- Test member account: not available.
- Test moderator account: not available.
- Live OAuth: not attempted.
- Live upload: not attempted.
- Live moderation: not attempted.
- Cleanup artifact: none.

## Safety

- Protected content must remain unchanged.
- Data files must remain unchanged.
- No secrets or credentials may be committed.
- No Supabase production mutation is allowed in this milestone.
- No `supabase db push` or Edge Function deployment is allowed.
- No Storage deletion is allowed.
