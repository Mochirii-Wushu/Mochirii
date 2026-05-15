# Live Member Workflow Setup Goal Progress

Started: 2026-05-15
Baseline main at start: `78ce8fcb89ae9dd18ebb8e136db5c45cabca33b9`
Purpose: prepare the documentation, local-only template, preflight checks, and cleanup protocol required before blocked D02/D03 live member workflow QA can resume.

This tracker records setup-only runway work. It does not authorize live OAuth, upload, moderation, approval/rejection, cleanup, Supabase production mutation, schema changes, Storage changes, Edge Function deployment, workflow edits, protected-content edits, data edits, CSS edits, or public-copy changes.

## Progress

| ID | Branch or tag | Status | PR | Merge commit or tag object | Blockers | Next |
| --- | --- | --- | --- | --- | --- | --- |
| E01 | `docs/live-member-test-account-setup-runbook` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/163> | `3b4e233a70d2e665fd75da8e4c0e017e461318f5` | None | E02 |
| E02 | `chore/live-member-qa-local-template` | In progress | Pending | Pending | None | E03 |
| E03 | `qa/live-member-workflow-preflight-check` | Pending | Pending | Pending | Requires E02 merge | E04 |
| E04 | `qa/post-live-member-setup-regression-review` | Pending | Pending | Pending | Requires E03 merge | E05 |
| E05 | `v3.0.0-live-member-workflow-setup-baseline` | Pending | n/a | Pending | Requires E01-E04 complete | Final validation |

## E01 Notes

- Branch: `docs/live-member-test-account-setup-runbook`
- Report: `reports/live-member-test-account-setup-runbook.md`
- PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/163>
- Merge commit: `3b4e233a70d2e665fd75da8e4c0e017e461318f5`
- Current state: complete.
- Validation summary: full standard branch validation, CI validation, and post-merge validation passed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Blockers or limitations: none for report-only setup documentation.
- Next item: E02 `chore/live-member-qa-local-template`.

## E02 Notes

- Branch: `chore/live-member-qa-local-template`
- Report: `reports/live-member-qa-local-template.md`
- Current state: in progress.
- Validation summary: pending branch validation.
- Blockers or limitations: none for local-template documentation. `.env.live-member-qa` is already ignored by the existing `.env.*` rule, so no `.gitignore` change is needed.
- Next item: E03 `qa/live-member-workflow-preflight-check` after E02 PR merge and post-merge validation.

## Credential Status

- Test member account: not available.
- Test moderator account: not available.
- Live OAuth: not attempted.
- Live upload: not attempted.
- Live moderation: not attempted.
- Cleanup: not needed.

## Safety

- Protected content must remain unchanged.
- Data files must remain unchanged.
- No secrets or real credentials may be committed.
- No Supabase production mutation is allowed in this milestone.
- No `supabase db push` or Edge Function deployment is allowed.
