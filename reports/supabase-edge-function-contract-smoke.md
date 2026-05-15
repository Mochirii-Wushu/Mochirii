# Supabase Edge Function Contract Smoke

Date: 2026-05-15
Branch: `qa/supabase-edge-function-contract-smoke`
Mode: QA automation

No data files, protected content, public copy, CSS, Supabase schema, migrations, Storage policies, Edge Functions, workflows, secrets, or production data were changed.

## 1. Current Gap

Previous reviews proved Edge Function auth and public-feed behavior with one-off read-only probes. This branch makes that proof repeatable through a local package script without requiring credentials or mutating Supabase.

Source reports:

- `reports/supabase-edge-functions-review.md`
- `reports/supabase-production-security-review.md`
- `reports/gallery-approved-feed-regression-matrix.md`
- `reports/supabase-ci-and-parity-review.md`

## 2. Script Added

Added:

- `scripts/smoke-supabase-edge-functions.mjs`
- package script `smoke:supabase-edge-functions`

The script is not wired into `npm run check` because it calls the live Supabase Edge Function gateway and should remain an explicit network smoke.

## 3. Functions Checked

Protected functions:

- `verify-discord-member`
- `list-gallery-review-queue`
- `moderate-gallery-submission`

Public function:

- `list-approved-gallery-submissions`

## 4. Expected Behavior

Protected functions must:

- answer `OPTIONS` with CORS headers;
- reject POST without a user JWT;
- reject POST with a malformed JWT;
- reject POST when the browser publishable key is incorrectly used as a bearer token.

The public approved-feed function must:

- answer `OPTIONS` with CORS headers;
- answer public `GET` with `200`;
- return JSON with `ok: true`, `data.submissions`, `data.count`, and `data.signedUrlSeconds`;
- keep `data.count` aligned with the number of returned submissions;
- keep signed URL TTL at 3600 seconds;
- reject unsupported `DELETE` with `405`;
- avoid exposing private row fields such as `user_id`, `storage_path`, `storage_bucket`, `reviewed_by`, or `rejection_reason`.

## 5. Safety Notes

The script uses only:

- the public Supabase URL from `supabase.js`;
- the browser-safe `sb_publishable_` key from `supabase.js`;
- missing/malformed bearer tokens for protected fail-closed checks.

It does not upload files, update rows, approve/reject submissions, delete Storage objects, run SQL, deploy functions, or require live user credentials.

Signed URLs are redacted in failure summaries.

## 6. Network Behavior

The script exits successfully with a warning only when the network is unavailable or the request times out before a contract result can be observed. If the gateway is reachable and a protected function becomes publicly accessible, the script fails.

## 7. Validation Result

`npm run smoke:supabase-edge-functions` passed on this branch.

Standard branch validation also passed, with the known intentional `assets/audio/mochiriiiiii.mp3` large-asset warning only.

## 8. CI Suitability

This script should stay outside `npm run check` for now. It is safe and non-mutating, but network-sensitive. It is appropriate for release validation, post-merge validation, and manual parity checks.

## 9. Safety Confirmation

- No data files changed.
- Protected content was not changed.
- No secrets were committed.
- No Supabase data was mutated.
- No files were uploaded.
- No approvals, rejections, cleanup, or Storage deletions were performed.
- No `supabase db push` was run.
- No Edge Functions were deployed.
- No migrations, schemas, RLS policies, or Storage policies were changed.
