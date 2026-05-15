# Post Supabase Parity Hardening Regression

Date: 2026-05-15
Branch: `qa/post-supabase-parity-hardening-regression`
Mode: QA/report-first

This review verifies the Supabase parity hardening additions are safe, local-friendly where intended, non-mutating, and do not regress normal static-site validation or public smoke coverage.

No implementation files, data files, protected content, public copy, CSS, workflows, Supabase schema/config, migrations, RLS policies, Storage policies, Edge Functions, secrets, or production data were changed for this regression review.

## 1. Scope Reviewed

Files and reports inspected:

- `package.json`
- `scripts/check-all.mjs`
- `scripts/check-supabase-public-config.mjs`
- `scripts/smoke-supabase-auth-boundary.mjs`
- `scripts/smoke-supabase-edge-functions.mjs`
- `reports/supabase-public-config-and-secret-guardrails.md`
- `reports/supabase-auth-boundary-smoke.md`
- `reports/supabase-edge-function-contract-smoke.md`
- `reports/supabase-manual-parity-runbook.md`
- `reports/gallery-approved-feed-smoke-automation.md`
- `reports/supabase-parity-hardening-goal-progress.md`

## 2. Package Script Review

Current relevant scripts:

| Script | Purpose | In `npm run check`? | Regression result |
| --- | --- | ---: | --- |
| `check:supabase-config` | Local secret/public-config guardrail. | Yes | Appropriate: deterministic, local-only, dependency-free, non-mutating. |
| `smoke:supabase-auth-boundary` | Local browser smoke for signed-out member pages using a mocked Supabase client. | No | Appropriate: requires Playwright and a local server. |
| `smoke:supabase-edge-functions` | Live network smoke for protected Edge Function fail-closed behavior and public approved-feed shape. | No | Appropriate: non-mutating but network-sensitive. |
| `smoke:gallery-approved-feed` | Local browser smoke for mocked approved-feed integration and static fallback. | No | Appropriate: requires Playwright and a local server. |

`scripts/check-all.mjs` now runs `check:supabase-config` through the normal `npm run check` ladder. The network and browser smokes are intentionally explicit commands, so routine static validation is not brittle on local server state or live network availability.

## 3. Supabase Public Config Guardrails

Result: pass.

Regression notes:

- The script scans tracked text files and non-ignored env files for obvious secrets.
- It allows the intended public Supabase URL, project ref, `sb_publishable_` browser key, Discord role IDs, bucket name, and upload limits.
- It checks `.gitignore` coverage for local env files.
- It masks suspicious values in failure output.
- It does not read ignored local `.env` contents, which avoids handling real local secrets.

This check is suitable for PR validation because it is local-only and does not require credentials.

## 4. Auth Boundary Smoke

Result: pass.

Regression notes:

- The smoke uses a mocked signed-out Supabase browser client.
- It checks `auth.html`, `account.html`, `gallery-submit.html`, `leader-dashboard.html`, and `gallery.html`.
- It verifies signed-out gates remain graceful and protected panels remain hidden.
- It fails if signed-out pages make protected data, function, or Storage calls through the mock.
- It performs no real OAuth login, no database reads, no uploads, no approvals, and no cleanup.

This smoke should remain explicit rather than part of `npm run check` because it needs Playwright and a local static server.

## 5. Edge Function Contract Smoke

Result: pass.

Regression notes:

- The smoke uses only the public Supabase URL and publishable browser key from `supabase.js`.
- Protected functions are checked for `OPTIONS` CORS and `POST` fail-closed behavior without JWT, with malformed JWT, and with the publishable key misused as bearer auth.
- The public approved-feed function is checked for `OPTIONS`, public `GET`, expected response shape, signed URL TTL metadata, private-field absence, and unsupported `DELETE` rejection.
- Signed URLs are redacted in failure summaries.
- Network unavailable or timeout states produce a warning and skip, while reachable unsafe public access remains a hard failure.

This smoke is safe and non-mutating, but should remain manual/release validation because it touches the live Supabase function gateway.

## 6. Manual Runbook Review

Result: pass.

Regression notes:

- The runbook keeps dashboard-only checks out of CI.
- It gives manual RLS, Storage, Edge Function secret, Discord provider, redirect URL, member workflow, moderator workflow, and cleanup checklists.
- It clearly marks production mutations, uploads, approvals/rejections, Storage deletion, schema/policy changes, secret rotation, `supabase db push`, and Edge Function deployment as approval-gated.
- It avoids secret values, private object paths, signed URLs, real tokens, and production member data.

The runbook fills the remaining parity gap without creating a new automated mutation path.

## 7. Public Site And Gallery Regression

Result: pass.

Validated behavior:

- `npm run check` still completes normally with the known MP3 warning only.
- `npm run check:production` still passes.
- `npm run smoke:gallery` still passes.
- `npm run smoke:gallery-approved-feed` still passes.
- No public page behavior, Gallery data, Gallery images, CSS, or Home/Gallery runtime code changed in this branch.

## 8. Failure Actionability

The new guardrails produce useful failure surfaces:

- `check:supabase-config` reports file/line and masks suspicious values.
- `smoke:supabase-auth-boundary` names the failing page and signed-out boundary expectation.
- `smoke:supabase-edge-functions` names the function and contract expectation, while redacting signed URLs.
- The manual runbook gives stop conditions and approval gates for dashboard and credentialed checks.

No subjective content checks or environment-specific live-credential requirements were added to `npm run check`.

## 9. Validation Result

Branch validation passed:

- `npm run check`
- `git diff --check`
- `node scripts/check-json.mjs`
- `node scripts/check-js.mjs`
- `node scripts/check-refs.mjs`
- `node scripts/check-assets.mjs`
- `npm run check:protected-content`
- `npm run check:content`
- `npm run check:production`
- `npm run smoke:gallery`
- `npm run smoke:gallery-approved-feed`
- `npm run check:supabase-config`
- `npm run smoke:supabase-auth-boundary`
- `npm run smoke:supabase-edge-functions`

Known expected warning:

- `assets/audio/mochiriiiiii.mp3` remains over the normal large-asset threshold.

## 10. Safety Confirmation

- Protected content unchanged.
- Data files unchanged.
- No secrets committed.
- No production data mutation.
- No uploads.
- No approval/rejection.
- No Storage deletion.
- No `supabase db push`.
- No Edge Functions deployed.
- No Supabase schema, RLS policy, or Storage policy changes.

## 11. Recommendation

Proceed to C06: tag `v2.9.0-supabase-parity-hardening-baseline` after the C01-C05 branches are merged and final validation passes.
