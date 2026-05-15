# Live Member Workflow QA Deferred

Date: 2026-05-15
Branch: `docs/defer-live-member-workflow-qa`
Mode: documentation / tracker branch

This report formally defers the live credentialed member workflow QA path because approved disposable test accounts are not available. The deferral is intentional and does not indicate a newly discovered site regression.

No live OAuth, upload, moderation, approval/rejection, cleanup, Storage deletion, Supabase production mutation, `supabase db push`, Edge Function deployment, schema change, RLS policy change, Storage policy change, data-file edit, protected-content edit, public-copy change, CSS change, workflow edit, secret commit, or credential commit was performed.

## 1. Reason For Deferral

D02 and D03 remain blocked because the required safe test setup does not exist yet:

- no disposable signed-in Discord user without required roles;
- no disposable verified active member account;
- no disposable moderator/leader account;
- no disposable test image selected for production QA;
- no approved cleanup path for a test upload or moderation artifact;
- no approval to perform live OAuth, upload, approval/rejection, cleanup, or Storage deletion.

The user has chosen to skip credential-gated live workflow QA for now and continue with the next non-credentialed roadmap milestone.

## 2. What Remains Unverified

Deferred live credentialed checks:

- completed Discord OAuth with a disposable test account;
- signed-in account/profile read state in production;
- live Discord role verification with a real user JWT;
- active member upload eligibility from a real account;
- live private member Gallery upload;
- member "My Gallery" summary after a live upload;
- moderator/leader queue visibility with a real moderator account;
- approval or rejection of only a disposable test submission;
- public approved-feed visibility of a newly approved disposable test item;
- cleanup of the disposable submission and Storage object.

No branch in this milestone should claim those checks have passed.

## 3. Already Covered By Non-Mutating Automation

Current non-credentialed coverage includes:

- signed-out `auth.html`, `account.html`, `gallery-submit.html`, and `leader-dashboard.html` behavior;
- public Gallery static and approved-feed smokes;
- approved-feed mocked member submission behavior;
- protected Edge Function fail-closed contract smoke;
- Supabase public config and secret guardrails;
- protected-content hash checks;
- content guardrails;
- local live-member workflow preflight in normal mode;
- production public page smoke and Gallery smoke.

Relevant scripts:

- `npm run check`
- `npm run check:supabase-config`
- `npm run check:live-member-workflow-preflight`
- `npm run smoke:gallery`
- `npm run smoke:gallery-approved-feed`
- `npm run smoke:supabase-auth-boundary`
- `npm run smoke:supabase-edge-functions`

## 4. Exact Requirements To Resume Later

Before resuming D02:

1. Provide an approved disposable Discord test account.
2. Confirm the account can be used for non-mutating live OAuth/profile verification.
3. Confirm credentials, cookies, tokens, screenshots, and private identifiers will not be committed or printed.
4. Confirm no profile save, upload, moderation, cleanup, or Storage deletion will occur in D02.

Before resuming D03:

1. Complete and merge D02.
2. Provide a disposable verified active member account.
3. Provide a disposable moderator/leader account.
4. Provide a disposable test image outside the repo.
5. Approve the exact upload and moderation action.
6. Approve or define the cleanup path.
7. Confirm the test artifact can be identified without exposing private IDs or touching real member content.

## 5. Baseline Tag Boundary

`v3.1.0-live-member-workflow-qa-baseline` must not be created yet.

That tag remains reserved for a future milestone where live OAuth, live profile/verification behavior, live upload/moderation, approved-feed visibility, and cleanup status are actually verified with approved disposable accounts.

The existing setup-only tag remains:

- `v3.0.0-live-member-workflow-setup-baseline`

## 6. Next Non-Credentialed Milestone

Proceed with member Gallery lifecycle and cleanup planning/hardening:

1. `docs/member-gallery-lifecycle-cleanup-plan`
2. `qa/member-gallery-cleanup-safety-review`
3. `qa/gallery-approved-feed-lifecycle-regression`
4. `v3.1.0-member-gallery-lifecycle-planning-baseline`

This milestone can proceed without credentials because it is documentation, safety review, and non-mutating approved-feed regression work.

## 7. Future Resume Command

When approved disposable test accounts are available and D02 is explicitly reopened:

```sh
git checkout main
git pull --ff-only origin main
git checkout -b qa/live-auth-profile-verification-smoke
```

Do not start D03 until D02 is merged and D03 has an approved active member account, moderator account, disposable test image, and cleanup path.

## 8. Validation Result

F01 branch validation passed:

- `npm run check`
- `git diff --check`
- `node scripts/check-json.mjs`
- `node scripts/check-js.mjs`
- `node scripts/check-refs.mjs`
- `node scripts/check-assets.mjs`
- `npm run check:protected-content`
- `npm run check:content`
- `npm run check:supabase-config`
- `npm run check:live-member-workflow-preflight`
- `npm run check:production`
- `npm run smoke:gallery`
- `npm run smoke:gallery-approved-feed`
- `npm run smoke:supabase-auth-boundary`
- `npm run smoke:supabase-edge-functions`

Known expected warning:

- `assets/audio/mochiriiiiii.mp3` remains over the normal large-asset threshold.

## 9. Safety Confirmation

- Protected content unchanged.
- Data files unchanged.
- No secrets committed.
- No credentials committed.
- No live OAuth attempted.
- No upload attempted.
- No approval/rejection attempted.
- No Storage deletion attempted.
- No Supabase production data mutation.
- No `supabase db push`.
- No Edge Functions deployed.
