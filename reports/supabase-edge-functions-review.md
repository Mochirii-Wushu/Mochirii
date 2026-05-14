# Supabase Edge Functions Review

Date: 2026-05-14
Branch: `qa/supabase-edge-functions-review`
Goal: G02
Mode: QA/report-first

## 1. Scope

This review checked the current Supabase Edge Functions used by member/gallery workflows:

- `verify-discord-member`
- `list-gallery-review-queue`
- `moderate-gallery-submission`
- `list-approved-gallery-submissions`
- shared helper code under `supabase/functions/_shared/`
- function deployment config in `supabase/config.toml`
- browser invocation path through `supabase.js`

No Edge Functions were deployed. No Supabase database mutation was run.

## 2. Current References

Official Supabase references checked during this review:

- Edge Functions overview: <https://supabase.com/docs/guides/functions>
- Edge Function Auth context: <https://supabase.com/docs/guides/functions/auth>
- Edge Function CORS guidance: <https://supabase.com/docs/guides/functions/cors>
- Edge Function secrets guidance: <https://supabase.com/docs/guides/functions/secrets>
- Supabase changelog index: <https://supabase.com/changelog.md>

Relevant current notes:

- Browser-invoked functions need CORS handling, including `OPTIONS`.
- User-scoped functions should receive a valid user JWT and should not trust browser-supplied claims without verification.
- Service-role or secret keys must stay in server/Edge runtime only.
- Public functions should be intentionally public and narrowly scoped.
- The 2026 Edge Functions recursive/nested invocation rate-limit changelog item does not materially affect the current functions because they do not call other Edge Functions.

## 3. Files Inspected

- `reports/codex-goal-roadmap.md`
- `reports/supabase-production-security-review.md`
- `supabase/config.toml`
- `supabase/README.md`
- `supabase/functions/.env.example`
- `supabase/functions/verify-discord-member/index.ts`
- `supabase/functions/list-gallery-review-queue/index.ts`
- `supabase/functions/moderate-gallery-submission/index.ts`
- `supabase/functions/list-approved-gallery-submissions/index.ts`
- `supabase/functions/_shared/gallery-moderation.ts`
- `supabase/functions/_shared/discord-api.ts`
- `supabase.js`
- `account.js`, `gallery-submit.js`, `leader-dashboard.js`, `gallery.js`

## 4. Auth Mode And Deployment Config

Local `supabase/config.toml`:

| Function | Local `verify_jwt` | Intended exposure |
| --- | ---: | --- |
| `verify-discord-member` | `true` | Signed-in user only. |
| `list-gallery-review-queue` | `true` | Signed-in moderator only. |
| `moderate-gallery-submission` | `true` | Signed-in moderator only. |
| `list-approved-gallery-submissions` | `false` | Intentional public approved gallery feed. |

Read-only `supabase functions list --project-ref deyvmtncimmcinldjyqe --output json` confirmed all four functions are deployed and `ACTIVE`:

| Function | Deployed status | Deployed `verify_jwt` | Version |
| --- | --- | ---: | ---: |
| `verify-discord-member` | `ACTIVE` | `true` | 3 |
| `list-gallery-review-queue` | `ACTIVE` | `true` | 2 |
| `moderate-gallery-submission` | `ACTIVE` | `true` | 1 |
| `list-approved-gallery-submissions` | `ACTIVE` | `false` | 2 |

Local and deployed JWT modes match.

## 5. Function Review

### `verify-discord-member`

Expected behavior:

- Allows `OPTIONS` preflight.
- Allows only `POST`.
- Requires Supabase JWT through gateway config and function code.
- Uses server-side service credentials only in Edge runtime.
- Calls Discord with `DISCORD_BOT_TOKEN`, never from browser code.
- Confirms the expected guild and required role IDs before processing.
- Updates the current user's `member_profiles` row through the trusted runtime.
- Does not log token values.

Review result: pass. No local code change required.

### `list-gallery-review-queue`

Expected behavior:

- Allows `OPTIONS` preflight.
- Allows only `POST`.
- Requires Supabase JWT through gateway config.
- Uses shared `requireModeratorAccess`.
- Revalidates Discord guild membership and moderator role server-side.
- Returns short-lived signed preview URLs only to verified moderators.
- Does not expose service keys or Discord tokens.

Review result: pass. No local code change required.

### `moderate-gallery-submission`

Expected behavior:

- Allows `OPTIONS` preflight.
- Allows only `POST`.
- Requires Supabase JWT through gateway config.
- Uses shared `requireModeratorAccess`.
- Accepts only valid UUID submission IDs.
- Accepts only `approved` and `rejected` moderation actions.
- Updates only pending submissions and writes a moderation audit event.

Review result: pass. No local code change required.

### `list-approved-gallery-submissions`

Expected behavior:

- Allows `OPTIONS` preflight.
- Allows `GET` and `POST`.
- Rejects unsupported methods.
- Is intentionally public with `verify_jwt = false`.
- Reads only approved submissions.
- Returns sanitized metadata and short-lived signed URLs.
- Does not expose raw service credentials.

Review result: pass. No local code change required.

## 6. Production Function Probes

All probes used the public Supabase URL and publishable key only. No service key was used and no mutation was performed.

| Probe | Result | Assessment |
| --- | --- | --- |
| `verify-discord-member` `OPTIONS` without JWT | `200`, CORS headers present | Preflight works. |
| `verify-discord-member` `POST` without JWT | `401 UNAUTHORIZED_NO_AUTH_HEADER` | Fails closed at gateway. |
| `verify-discord-member` `POST` with malformed JWT | `401 UNAUTHORIZED_INVALID_JWT_FORMAT` | Fails closed. |
| `verify-discord-member` `POST` with publishable key as bearer | `401 UNAUTHORIZED_INVALID_JWT_FORMAT` | Publishable key cannot act as JWT. |
| `verify-discord-member` `GET` without JWT | `401 UNAUTHORIZED_NO_AUTH_HEADER` | Gateway blocks before method handler, acceptable for protected route. |
| `list-gallery-review-queue` `OPTIONS` without JWT | `200`, CORS headers present | Preflight works. |
| `list-gallery-review-queue` `POST` without JWT | `401 UNAUTHORIZED_NO_AUTH_HEADER` | Fails closed at gateway. |
| `list-gallery-review-queue` `POST` with malformed JWT | `401 UNAUTHORIZED_INVALID_JWT_FORMAT` | Fails closed. |
| `list-gallery-review-queue` `POST` with publishable key as bearer | `401 UNAUTHORIZED_INVALID_JWT_FORMAT` | Publishable key cannot act as JWT. |
| `list-gallery-review-queue` `GET` without JWT | `401 UNAUTHORIZED_NO_AUTH_HEADER` | Gateway blocks before method handler, acceptable for protected route. |
| `moderate-gallery-submission` `OPTIONS` without JWT | `200`, CORS headers present | Preflight works. |
| `moderate-gallery-submission` `POST` without JWT | `401 UNAUTHORIZED_NO_AUTH_HEADER` | Fails closed at gateway. |
| `moderate-gallery-submission` `POST` with malformed JWT | `401 UNAUTHORIZED_INVALID_JWT_FORMAT` | Fails closed. |
| `moderate-gallery-submission` `POST` with publishable key as bearer | `401 UNAUTHORIZED_INVALID_JWT_FORMAT` | Publishable key cannot act as JWT. |
| `moderate-gallery-submission` `GET` without JWT | `401 UNAUTHORIZED_NO_AUTH_HEADER` | Gateway blocks before method handler, acceptable for protected route. |
| `list-approved-gallery-submissions` `OPTIONS` | `200`, CORS headers present | Preflight works. |
| `list-approved-gallery-submissions` `GET` | `200`, `count: 1`, signed URL TTL `3600` | Intended public feed works. |
| `list-approved-gallery-submissions` `POST` | `200`, `count: 1`, signed URL TTL `3600` | Intended public feed works. |
| `list-approved-gallery-submissions` `DELETE` | `405 Method not allowed` | Unsupported methods rejected. |

Signed URLs returned by the approved-feed probe were not copied into this report.

## 7. Secret Boundary

Review result:

- Browser code invokes functions through `supabase-js` with the publishable key and user session.
- Service-role values are read only from Edge runtime environment variables.
- Discord bot token is read only from Edge runtime environment variables.
- `.env.example` and `supabase/functions/.env.example` contain placeholders only.
- No committed real service-role key, Supabase secret key, Discord bot token, webhook URL, database password, JWT secret, access token, or refresh token was found by scan.
- Function logs record boolean configuration state, error codes, statuses, and IDs, not token values.

## 8. Local Tooling Notes

- Supabase CLI is available: `2.95.4`.
- Supabase CLI reports a newer version exists: `2.98.2`; this is informational only.
- `deno` is not installed in this environment, so `deno check` could not be run.
- No function source changed in this branch, so the Deno check gap is not blocking for this report-only review.
- Local `supabase functions serve` was not run because local `.env.local` secrets are intentionally not committed. Production read-only function probes and deployment-list checks covered the safe review surface.

## 9. Findings

No P0 Edge Function security blocker was found.

Follow-up notes:

1. G04/G09 should use approved test accounts if live signed-in role flows need full positive-path proof.
2. G02 did not deploy functions; if future code changes are made, run `deno check` or an equivalent Edge Function type/load check in an environment with Deno available before deployment.
3. Dashboard-only secret inventory remains a manual/operator-assisted check because secret values should not be printed or committed.

## 10. Validation Summary

| Command / check | Result |
| --- | --- |
| Current Supabase docs/changelog review | Completed. |
| Local config and function source inspection | Completed. |
| Read-only `supabase functions list` | Completed; deployed auth modes match local config. |
| Public production function probes | Completed; protected functions failed closed and public approved feed behaved as intended. |
| Function invocation path scan | Completed. |
| Secret scan | Passed; hits were documentation placeholders or prior report command text. |
| `npm run check` | Passed with the known `assets/audio/mochiriiiiii.mp3` size warning. |
| `git diff --check` | Passed. |
| `node scripts/check-json.mjs` | Passed. |
| `node scripts/check-js.mjs` | Passed. |
| `node scripts/check-refs.mjs` | Passed. |
| `node scripts/check-assets.mjs` | Passed with the known MP3 size warning. |
| `npm run check:production` | Passed. |
| `npm run smoke:gallery` | Passed. |
| `git diff -- data/` | Empty. |

## 11. Safety Confirmation

- No data files changed.
- Protected content was not changed.
- No secrets were committed.
- No `supabase db push` was run.
- No Edge Functions were deployed.
- No migrations were created.
- No Supabase configuration was changed.

## 12. Next Recommended Item

G03 - `qa/member-gallery-upload-limit-review`
