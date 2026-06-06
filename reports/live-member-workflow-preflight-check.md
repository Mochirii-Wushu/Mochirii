# Live Member Workflow Preflight Check

Date: 2026-05-15
Branch: `qa/live-member-workflow-preflight-check`
Mode: local-safe QA automation

This branch adds a non-mutating preflight script for the blocked live member workflow QA path. The script checks repository readiness for future disposable test-account use without requiring live credentials, logging secret values, performing OAuth, uploading files, approving/rejecting submissions, deleting Storage objects, or mutating Supabase production data.

## 1. Script Added

Package script:

```sh
npm run check:live-member-workflow-preflight
```

Node entrypoint:

```sh
node scripts/check-live-member-workflow-preflight.mjs
```

Normal mode is credential-free and CI-safe. It passes when `.env.live-member-qa` is missing and reports the state as not configured.

Strict local readiness mode:

```sh
npm run check:live-member-workflow-preflight -- --strict
```

Optional mutation-approval readiness mode for a future D03 operator check:

```sh
npm run check:live-member-workflow-preflight -- --strict --require-mutation-approval
```

The mutation-approval flag only verifies local readiness state. It does not authorize live upload, moderation, approval/rejection, cleanup, or any Supabase mutation.

## 2. What It Checks

The preflight verifies:

- `.env.live-member-qa` is ignored by Git;
- no local live-member QA credential file is tracked;
- `reports/live-member-qa-local-template.md` exists;
- all required variable names are documented;
- `QA_ALLOW_LIVE_MUTATION=false` is the committed template default;
- normal mode does not fail merely because live credentials are missing;
- strict mode can fail when the local ignored readiness file is missing, incomplete, or not explicitly prepared;
- local QA values do not contain obvious token/secret values;
- strict D02 mode keeps `QA_ALLOW_LIVE_MUTATION=false`;
- mutation-approval mode requires `--strict` and `QA_ALLOW_LIVE_MUTATION=true`;
- strict mode requires safe non-private labels and an absolute repo-external JPEG/PNG/WebP test image under 50 MB.

Required local variable names:

- `QA_TEST_MEMBER_EMAIL_OR_LABEL`
- `QA_TEST_UNVERIFIED_DISCORD_LABEL`
- `QA_TEST_VERIFIED_MEMBER_LABEL`
- `QA_TEST_MODERATOR_LABEL`
- `QA_TEST_IMAGE_PATH_LOCAL`
- `QA_TEST_TITLE_PREFIX`
- `QA_TEST_CAPTION_MARKER`
- `QA_ALLOW_LIVE_MUTATION`

## 3. What It Refuses To Check

The script does not:

- perform live OAuth;
- read browser cookies or local browser sessions;
- upload files;
- approve, reject, archive, or delete submissions;
- delete Storage objects;
- call mutation-capable Supabase flows;
- run `supabase db push`;
- deploy Edge Functions;
- print credential values.

## 4. Secret Protection

The script never prints local environment values. It reports only whether required keys are present, empty, missing, ignored, or tracked.

If a local `.env.live-member-qa` exists, strict-mode failures name only key names, line numbers, or value classes such as secret token, email-like identifier, or unsupported image type. Values and paths stay local and unprinted.

## 5. Check Wiring

The new script is exposed as `check:live-member-workflow-preflight` but is not wired into `npm run check`.

Reason: the normal mode is local-safe, but the script is specifically a live workflow setup/runway tool. Keeping it explicit avoids making future CI output look like live QA is configured when credentials remain unavailable.

## 6. Validation Result

E03 branch validation passed:

- `npm run check:live-member-workflow-preflight`
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

## 7. Safety Confirmation

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
