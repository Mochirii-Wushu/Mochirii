# Post Live Member Setup Regression Review

Date: 2026-05-15
Branch: `qa/post-live-member-setup-regression-review`
Mode: QA/report-first

This review verifies that the live member workflow setup runway added by E01-E03 does not introduce credential exposure risk, brittle validation, production mutation, or public site regressions.

No site behavior, public copy, CSS, data files, protected content, workflows, Supabase schema/config, RLS policies, Storage policies, Edge Functions, migrations, production data, live OAuth, upload, moderation, approval/rejection, cleanup, or Storage objects were changed.

## 1. Artifacts Reviewed

- `reports/live-member-test-account-setup-runbook.md`
- `reports/live-member-qa-local-template.md`
- `.gitignore`
- `scripts/check-live-member-workflow-preflight.mjs`
- `package.json`
- `reports/live-member-workflow-preflight-check.md`
- `reports/live-member-workflow-setup-goal-progress.md`

## 2. Secret And Credential Exposure Review

Result: passed.

Evidence:

- The runbook and template describe account labels and placeholder names only.
- No credential values, cookies, access tokens, refresh tokens, service-role keys, Discord secrets, bot tokens, client secrets, database URLs, private Storage paths, signed URLs, real Discord user IDs, or real account identifiers are present.
- `.env.live-member-qa` is intentionally local-only and ignored by the existing `.env.*` rule.
- No real `.env.live-member-qa` file was created.
- The preflight script prints only key names and state, never local values.
- `npm run check:supabase-config` passes, which means the current secret/public-config guardrail did not detect committed secret values.

## 3. Local Credential File Review

Result: passed.

Evidence:

- `.gitignore` already contains:

```text
.env
.env.*
```

- `git check-ignore -v .env.live-member-qa` resolves to the `.env.*` rule.
- The setup chose a report-based template instead of committing `.env.live-member-qa.example`, preserving the existing Supabase scanner rule that only `.env.example` and `supabase/functions/.env.example` are allowed tracked environment examples.

## 4. Template Placeholder Review

Result: passed.

The committed template lists only safe placeholders:

- `QA_TEST_MEMBER_EMAIL_OR_LABEL`
- `QA_TEST_UNVERIFIED_DISCORD_LABEL`
- `QA_TEST_VERIFIED_MEMBER_LABEL`
- `QA_TEST_MODERATOR_LABEL`
- `QA_TEST_IMAGE_PATH_LOCAL`
- `QA_TEST_TITLE_PREFIX`
- `QA_TEST_CAPTION_MARKER`
- `QA_ALLOW_LIVE_MUTATION=false`

`QA_ALLOW_LIVE_MUTATION=false` remains the committed default. The template tells future operators to keep real credentials in a password manager and to keep private cleanup notes outside the repo.

## 5. Preflight Normal Mode Review

Result: passed.

Command:

```sh
npm run check:live-member-workflow-preflight
```

Observed behavior:

- Confirms `.env.live-member-qa` is ignored.
- Confirms no live member QA credential files are tracked.
- Confirms required variable names are documented.
- Confirms `QA_ALLOW_LIVE_MUTATION=false` is the committed default.
- Reports `.env.live-member-qa` as not configured when the local file is absent.
- Exits successfully without live credentials.

This matches the milestone requirement that missing credentials must not fail normal local/CI-safe validation.

## 6. Strict Mode Review

Result: passed by source review and documentation review.

Strict mode is intentionally not used as a merge gate because the current environment has no approved disposable test accounts. The script is designed to fail strict mode when `.env.live-member-qa` is missing or incomplete, and that behavior is documented in `reports/live-member-workflow-preflight-check.md`.

Strict mode remains a future operator readiness check, not proof that D02/D03 credentials exist today.

## 7. Supabase Mutation Review

Result: passed.

The preflight script:

- uses local filesystem checks;
- uses Git checks for ignored/tracked files;
- reads only the committed template and optional ignored local readiness file;
- does not import or call `supabase.js`;
- does not call Supabase REST, Auth, Storage, or Edge Functions;
- does not upload, approve, reject, delete, archive, or mutate anything.

No `supabase db push`, Edge Function deployment, schema change, RLS policy change, or Storage policy change was performed.

## 8. Validation And Public Site Review

Result: passed.

The standard validation suite passed after the setup artifacts were added:

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
- `npm run check:live-member-workflow-preflight`

Known expected warning:

- `assets/audio/mochiriiiiii.mp3` remains over the normal large-asset threshold.

## 9. D02/D03 Blocker Status

D02 and D03 remain blocked until approved disposable test accounts are provided.

Current credential status:

- disposable unverified Discord account: unavailable;
- disposable verified active member account: unavailable;
- disposable moderator/leader account: unavailable;
- disposable test image: not provided;
- cleanup approval: not provided;
- live OAuth: not attempted;
- live upload/moderation: not attempted.

This is expected. E01-E04 prepare the setup runway only; they do not fake live workflow success.

## 10. Findings

No regression was found.

The setup is safe to tag as a credential/setup baseline because:

- it adds documentation and a non-mutating local preflight;
- it preserves existing secret guardrails;
- it does not require credentials to pass normal validation;
- it keeps D02/D03 blocked until approved test accounts and mutation approval exist;
- it does not change public site behavior.

## 11. Safety Confirmation

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
