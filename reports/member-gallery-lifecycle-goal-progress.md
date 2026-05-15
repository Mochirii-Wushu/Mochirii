# Member Gallery Lifecycle Goal Progress

Started: 2026-05-15
Baseline main at start: `bd59d4043569a439f3efb0ed20485d0c531c7113`
Purpose: formally defer credential-gated live member workflow QA, then complete non-credentialed member Gallery lifecycle and cleanup planning/hardening.

This tracker records report-only and non-mutating QA work. It does not authorize live OAuth, uploads, moderation actions, approval/rejection, cleanup, Storage deletion, Supabase production mutation, schema changes, RLS changes, Storage policy changes, Edge Function deployment, data edits, protected-content edits, CSS edits, public-copy edits, or workflow edits.

## Progress

| ID | Branch or tag | Status | PR | Merge commit or tag object | Deferred credential-gated status | Blockers | Next |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F01 | `docs/defer-live-member-workflow-qa` | In progress | Pending | Pending | D02/D03 deferred | None | F02 |
| F02 | `docs/member-gallery-lifecycle-cleanup-plan` | Pending | Pending | Pending | D02/D03 deferred | Requires F01 merge | F03 |
| F03 | `qa/member-gallery-cleanup-safety-review` | Pending | Pending | Pending | D02/D03 deferred | Requires F02 merge | F04 |
| F04 | `qa/gallery-approved-feed-lifecycle-regression` | Pending | Pending | Pending | D02/D03 deferred | Requires F03 merge | F05 |
| F05 | `v3.1.0-member-gallery-lifecycle-planning-baseline` | Pending | n/a | Pending | D02/D03 deferred | Requires F01-F04 complete | Final validation |

## F01 Notes

- Branch: `docs/defer-live-member-workflow-qa`
- Report: `reports/live-member-workflow-qa-deferred.md`
- Current state: in progress.
- Validation summary: pending branch validation.
- Deferred credential-gated status: D02 and D03 are intentionally deferred because disposable test accounts are unavailable.
- Blockers or limitations: live credentialed QA remains blocked; this branch only records the deferral.
- Next item: F02 `docs/member-gallery-lifecycle-cleanup-plan` after F01 PR merge and post-merge validation.

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
