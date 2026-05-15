# Supabase Manual Parity Runbook

Date: 2026-05-15
Branch: `docs/supabase-manual-parity-runbook`
Mode: documentation / manual QA runbook

This runbook covers Supabase checks that should remain manual, dashboard-only, credential-gated, or approval-gated. It is designed to complement the local-safe scripts added during the Supabase parity hardening milestone:

- `npm run check:supabase-config`
- `npm run smoke:supabase-auth-boundary`
- `npm run smoke:supabase-edge-functions`

No Supabase data, Storage objects, schema, RLS policies, Storage policies, Edge Functions, migrations, secrets, public copy, CSS, data files, or protected content were changed for this runbook.

## 1. Source Reports

Primary sources:

- `reports/supabase-ci-and-parity-review.md`
- `reports/member-workflow-test-account-matrix.md`
- `reports/supabase-production-security-review.md`
- `reports/supabase-edge-functions-review.md`
- `reports/supabase-auth-boundary-smoke.md`
- `reports/supabase-edge-function-contract-smoke.md`
- `docs/supabase-cost-usage-runbook.md`
- `docs/member-gallery-cleanup-plan.md`
- `docs/member-gallery-moderation-runbook.md`

Relevant repository facts:

- Static site runtime config lives in `supabase.js`.
- The member Gallery bucket is `member-gallery` and remains private.
- Protected Edge Functions are `verify-discord-member`, `list-gallery-review-queue`, and `moderate-gallery-submission`.
- The public approved-feed Edge Function is `list-approved-gallery-submissions`.
- The local and live-safe scripts prove public config hygiene, signed-out member-page behavior, protected-function fail-closed behavior, and public approved-feed shape.

## 2. Before Manual Checks

Start with a clean, current local baseline:

```sh
git checkout main
git pull --ff-only origin main
git status --short
npm run check
git diff --check
npm run check:production
npm run smoke:gallery
npm run smoke:gallery-approved-feed
npm run check:supabase-config
npm run smoke:supabase-auth-boundary
npm run smoke:supabase-edge-functions
```

Expected note: `assets/audio/mochiriiiiii.mp3` may remain above the normal large-asset threshold.

Stop before any dashboard or credentialed work if:

- local validation fails for anything other than the known MP3 warning;
- the branch has data or protected-content diffs;
- a secret-like value appears in the diff;
- a check appears to require `supabase db push`, `supabase functions deploy`, direct Storage deletion, or production data mutation without explicit approval.

## 3. Manual RLS Verification Checklist

Use dashboard SQL/editor access only when explicitly authorized for read-only inspection. Do not paste table rows, user IDs, JWTs, emails, Discord IDs, private Storage paths, or signed URLs into public reports.

Verify these conditions:

- RLS is enabled on `member_profiles`.
- RLS is enabled on `gallery_submissions`.
- RLS is enabled on `gallery_moderation_events`.
- RLS is enabled on `discord_resources`.
- RLS is enabled on `discord_sync_log`.
- `anon` cannot read or mutate member/profile/moderation/Discord tables.
- `authenticated` access is scoped to intended own-profile and own-submission workflows.
- moderator-only reads and moderation actions are enforced through server-side checks, not browser-only state.
- `service_role` use stays in trusted Edge/admin contexts only.
- security-definer helper functions remain reviewed, execute-revoked from browser roles where applicable, and not callable as public browser APIs.

Recommended evidence to record in a public PR:

- checklist pass/fail by table and policy group;
- no raw row output;
- no user identifiers;
- no policy SQL containing secrets.

Human approval required before:

- changing RLS policies;
- granting table access;
- moving security-definer functions;
- creating migrations;
- running `supabase db push`.

## 4. Manual Storage Policy Checklist

Verify these conditions in the Supabase dashboard or through approved read-only SQL:

- `member-gallery` exists.
- `member-gallery` remains private.
- upload size and MIME expectations match the site policy: JPEG, PNG, WebP, up to 50 MB.
- signed preview URLs for review remain short-lived.
- public approved-feed signed URLs remain short-lived.
- browser users can operate only on their own approved member-upload folder where intended.
- pending, rejected, and archived submissions do not become public Storage listings.
- no public bucket setting was enabled as a convenience fix.

Recommended evidence to record:

- bucket name and visibility;
- policy names or checklist status;
- upload cap and allowed MIME summary;
- no object paths or signed URLs.

Do not perform from this runbook:

- direct Storage object deletion;
- Storage metadata edits through SQL;
- making the bucket public;
- uploading test files without an approved test account and cleanup plan.

## 5. Manual Edge Function Secret Checklist

Use dashboard secret inventory or `supabase secrets list` only when the current task authorizes read-only secret-name inspection.

Confirm secret presence by name only for the functions that need them:

- Supabase service/runtime credentials required by server-side function clients.
- Discord bot token for server-side role verification.
- Discord guild and role configuration values where stored server-side.
- Any other provider secrets referenced by current Edge Function code.

Record only:

- secret name present / missing;
- affected function;
- date checked;
- operator initials if useful internally.

Never record:

- secret values;
- token prefixes/suffixes;
- screenshots that show secret values;
- local `.env` contents;
- copied authorization headers.

Human approval required before:

- setting or rotating secrets;
- changing function environment variables;
- redeploying Edge Functions after secret changes.

## 6. Manual Discord Provider Settings Checklist

In Supabase Auth provider settings and the Discord developer application, verify:

- Discord provider is enabled only for the intended project.
- client ID matches the intended Discord application.
- client secret is present but not copied into reports.
- OAuth callback URL points to the Supabase project callback endpoint.
- requested scopes support the current sign-in flow.
- the Discord application settings match the production domain and local QA needs.

Record:

- provider enabled / disabled;
- redirect/callback shape checked;
- no secret values.

Do not:

- paste client secrets into chat, PRs, docs, screenshots, or terminal output;
- change provider settings during a routine parity check;
- use a personal production account for destructive tests.

## 7. Manual Redirect URL Checklist

Verify Supabase Auth redirect settings include only intended site destinations:

- production GitHub Pages/custom-domain account callback path, if configured;
- allowed local development callback path, if explicitly needed;
- no broad wildcard that would allow unknown hosts;
- no stale preview or unrelated domain unless intentionally documented.

Suggested public evidence:

- "production account callback allowed";
- "local callback allowed" or "local callback not required";
- "no unexpected hosts observed";
- no full URLs with private query strings.

Human approval required before adding broad wildcard redirects or changing production callback routing.

## 8. Manual Member Workflow Test Checklist

Use dedicated test accounts only. Recommended account types are:

- anonymous visitor;
- signed-in unverified Discord user;
- verified guild member;
- active member eligible to upload;
- moderator/leader.

Non-mutating checks:

- anonymous visitor sees signed-out gates on `auth.html`, `account.html`, `gallery-submit.html`, and `leader-dashboard.html`;
- OAuth redirect starts and returns to the intended site path;
- unverified user sees clear verification or role guidance;
- verified member can view own profile state;
- active member sees upload eligibility without uploading;
- moderator/leader sees dashboard access without taking moderation action.

Mutation-gated checks, requiring explicit approval:

- profile update;
- test image upload;
- pending submission creation;
- approval or rejection;
- archive or cleanup status change;
- Storage object deletion.

Recommended public evidence:

- account type tested;
- page state observed;
- pass/fail status;
- no screenshots with private identifiers or signed URLs.

## 9. Manual Moderator Workflow Test Checklist

Use a dedicated moderator test account. Do not use real member submissions unless leadership explicitly authorizes the exact action.

Read-only checks:

- direct visit to `leader-dashboard.html` requires signed-in moderator access;
- non-moderator test account is denied;
- moderator queue loads expected tabs;
- queue errors are understandable and do not expose secrets;
- private preview links are treated as operational-only.

Mutation-gated checks:

- approving a pending test submission;
- rejecting a pending test submission;
- changing archived/rejected status;
- verifying moderation events after an action.

Before any mutation:

1. Confirm the test submission is clearly marked as test content.
2. Confirm the submission ID and Storage path are recorded privately, not in a public PR.
3. Confirm the action and cleanup plan are approved.
4. Confirm no real member content is affected.

## 10. Cleanup Steps After Test Uploads

Use this only after an approved test upload branch or admin task. Do not delete objects as part of routine parity checks.

Cleanup sequence:

1. Record test submission count, not raw private paths, in public notes.
2. Confirm each candidate is test content and not a real member upload.
3. If approved content was made public, remove it through the approved moderation/admin path before Storage cleanup.
4. Use a trusted admin path and the Storage API for object deletion if deletion is explicitly approved.
5. Do not delete Storage metadata with SQL.
6. Confirm public Gallery no longer renders removed test content.
7. Confirm member/account and moderator views handle the cleanup state.
8. Record cleanup completion without signed URLs, private object paths, user IDs, or tokens.

If cleanup cannot be completed safely, leave the test artifact private where possible and escalate to a scoped admin cleanup task.

## 11. What Not To Test On Production

Do not perform these on production during routine parity checks:

- upload files;
- approve/reject real submissions;
- delete Storage objects;
- edit database rows;
- change RLS or Storage policies;
- rotate or print secrets;
- run `supabase db push`;
- deploy Edge Functions;
- create migrations;
- make `member-gallery` public;
- test broad redirect wildcards;
- force errors with real member accounts or real member content.

## 12. What Requires Test Accounts

Test accounts are required for:

- completed Discord OAuth login;
- signed-in profile read checks;
- Discord role verification positive and negative paths;
- active member upload eligibility;
- moderator queue positive path;
- non-moderator denial while signed in;
- My Gallery summary checks.

Keep test credentials out of the repo, PRs, screenshots, shell history, and public docs.

## 13. What Requires Human Approval

Human approval is required before:

- any production data mutation;
- any upload to `member-gallery`;
- any approval, rejection, archive, or cleanup action;
- any Storage deletion;
- any secret change;
- any redirect/provider setting change;
- any migration;
- any `supabase db push`;
- any Edge Function deployment;
- any billing, quota, or spend-cap change.

## 14. Schedule And Frequency

Recommended cadence:

- every PR: run local static validation and local-safe Supabase scripts;
- every release candidate: run public production smoke, Gallery smoke, approved-feed smoke, auth-boundary smoke, Edge Function contract smoke, and this manual checklist at checklist level;
- monthly: review Supabase usage, Storage growth, function error trends, Auth usage, and pending/rejected/archived accumulation;
- after guild events or traffic spikes: check approved-feed invocation volume, egress, Storage growth, and function errors;
- before any Supabase schema/function change: run the manual RLS, Storage, secrets, redirect, and function checklist with human review.

## 15. Safe Public Reporting Template

Use this shape for future PRs or reports:

```md
## Manual Supabase Parity Check

- Date:
- Operator:
- Project ref confirmed: yes/no
- RLS checklist: pass/fail/not checked
- Storage checklist: pass/fail/not checked
- Edge Function secret-name inventory: pass/fail/not checked
- Discord provider settings: pass/fail/not checked
- Redirect URL allow-list: pass/fail/not checked
- Member workflow test accounts: pass/fail/not checked
- Moderator workflow test account: pass/fail/not checked
- Mutations performed: none / approved test-only
- Cleanup required: none / private tracker
- Secrets or private paths in report: no
```

## 16. Safety Confirmation

- No data files changed.
- Protected content was not changed.
- No secrets were committed.
- No production data was mutated.
- No files were uploaded.
- No approvals, rejections, cleanup, or Storage deletions were performed.
- No `supabase db push` was run.
- No Edge Functions were deployed.
- No migrations, schemas, RLS policies, or Storage policies were changed.
