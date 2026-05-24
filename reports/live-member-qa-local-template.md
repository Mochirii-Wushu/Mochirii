# Live Member QA Local Template

Date: 2026-05-15
Branch: `chore/live-member-qa-local-template`
Mode: local template / safety branch

This report defines the local-only credential readiness template for future live member workflow QA. It intentionally does not commit a tracked `.env.live-member-qa.example` file because the current Supabase public-config guardrail allows only `.env.example` and `supabase/functions/.env.example`; keeping that rule strict reduces accidental secret-file drift.

No live OAuth, upload, moderation, cleanup, Supabase mutation, site behavior change, data edit, protected-content edit, CSS edit, workflow edit, or secret commit was performed.

## 1. Template Purpose

The future D02/D03 live workflow branches need a local place for an operator to record approved disposable test-account labels, test image path, marker text, and mutation approval state without committing credentials or real account details.

The committed source of truth remains this report. The local working file, if an operator creates it, must be:

```text
.env.live-member-qa
```

That file is ignored by `.gitignore` through the existing `.env.*` rule:

```text
.env.*
```

## 2. Local File Template

Operators may create `.env.live-member-qa` locally with placeholder-style labels only. Do not store passwords, tokens, cookies, access tokens, refresh tokens, Discord client secrets, Discord bot tokens, service-role keys, database URLs, signed URLs, private Storage paths, or real member identifiers.

Preferred preparation command:

```sh
npm --silent run prepare:live-member-qa-local
```

The helper verifies the local file is ignored, writes safe placeholder labels only, keeps `QA_ALLOW_LIVE_MUTATION=false`, and refuses to overwrite existing local QA values unless `--force` is supplied.

```sh
# Local-only live member workflow QA readiness values.
# Keep this file ignored. Never commit it.

QA_TEST_MEMBER_EMAIL_OR_LABEL=
QA_TEST_UNVERIFIED_DISCORD_LABEL=
QA_TEST_VERIFIED_MEMBER_LABEL=
QA_TEST_MODERATOR_LABEL=
QA_TEST_IMAGE_PATH_LOCAL=
QA_TEST_TITLE_PREFIX=Mochirii QA Test
QA_TEST_CAPTION_MARKER=Mochirii QA Test disposable upload
QA_ALLOW_LIVE_MUTATION=false
```

Use labels that are meaningful to the operator but safe to mention publicly, such as `qa-unverified-discord`, `qa-active-member`, or `qa-moderator`. Keep actual login details in the operator's password manager, not in the repo and not in this file.

## 3. How To Fill Locally

Suggested local values:

- `QA_TEST_MEMBER_EMAIL_OR_LABEL`: a non-sensitive label for the primary test member identity.
- `QA_TEST_UNVERIFIED_DISCORD_LABEL`: a non-sensitive label for the signed-in account without required roles.
- `QA_TEST_VERIFIED_MEMBER_LABEL`: a non-sensitive label for the verified active member account.
- `QA_TEST_MODERATOR_LABEL`: a non-sensitive label for the moderator/leader account.
- `QA_TEST_IMAGE_PATH_LOCAL`: an absolute repo-external local path to the disposable test image.
- `QA_TEST_TITLE_PREFIX`: should remain `Mochirii QA Test` unless the runbook changes.
- `QA_TEST_CAPTION_MARKER`: should clearly mark disposable QA data.
- `QA_ALLOW_LIVE_MUTATION`: keep `false` until a D03 branch receives explicit human approval.

Do not put the disposable image inside the repo unless a future branch explicitly approves a small evidence asset. Prefer a local path outside the repository. Strict preflight rejects repo-local, missing, empty, oversized, or unsupported test image paths without printing the path value.

## 4. What Must Never Be Committed

Never commit:

- `.env.live-member-qa`;
- screenshots showing account details, cookies, tokens, signed URLs, or private paths;
- real Discord usernames, emails, IDs, role dumps, or private profile data;
- generated browser storage state;
- Supabase access tokens, refresh tokens, service-role keys, database URLs, or dashboard exports;
- Discord passwords, client secrets, bot tokens, or webhook URLs;
- private cleanup notes containing submission IDs or Storage object paths.

The only committed evidence should be sanitized pass/fail status, account type, and whether cleanup is complete or deferred.

## 5. Missing Values Policy

Codex and local scripts should treat missing `.env.live-member-qa` values as "not configured", not as a validation failure during normal CI-safe checks.

Strict readiness checks may fail locally when:

- the local QA file is missing;
- required variable names are missing;
- `QA_ALLOW_LIVE_MUTATION` is not explicitly reviewed before D03;
- the test image path is missing before an upload branch;
- local labels look like private identifiers or the file contains raw private Storage paths or token-like secret values;
- any credential file is tracked by Git.

Normal repository validation must not require live credentials.

## 6. Validation Result

E02 branch validation passed:

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

- `.env.live-member-qa` is ignored by `.gitignore`.
- No real local credential file was created or committed.
- No tracked `.env.*` example was added.
- Protected content unchanged.
- Data files unchanged.
- No secrets committed.
- No live OAuth attempted.
- No upload attempted.
- No approval/rejection attempted.
- No Storage deletion attempted.
- No Supabase production data mutation.
- No `supabase db push`.
- No Edge Functions deployed.
