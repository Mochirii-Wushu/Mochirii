# Supabase CI And Parity Review

Date: 2026-05-15
Branch: `qa/supabase-ci-and-parity-review`
Mode: QA/report-first

## 1. Scope

This review inventories the current validation boundary for the Supabase-backed member and Gallery workflows. It focuses on what is checked locally, what is checked in GitHub Actions, what still requires dashboard credentials or approved test accounts, and what should remain manual because it can mutate live data.

No site behavior, data files, CSS, JavaScript, assets, workflows, validation scripts, Supabase configuration, migrations, or Edge Functions were changed.

No `supabase db push` was run. No Edge Functions were deployed. No production member data or Storage objects were mutated.

## 2. Sources And Current Guidance

Primary references:

- Full Site Improvement Review: `reports/full-site-improvement-review.md`
- Roadmap tracker: `reports/codex-goal-roadmap.md`
- Prior Supabase reviews: `reports/supabase-production-security-review.md`, `reports/supabase-edge-functions-review.md`, and `reports/member-gallery-end-to-end-review.md`
- Supabase security checklist from the project skill: keep RLS enabled on exposed schemas, never expose service/secret keys in browser code, keep `security definer` functions out of exposed schemas where possible, and keep Storage access controlled through `storage.objects` policies.
- Official Supabase docs used for comparison:
  - <https://supabase.com/docs/guides/api/securing-your-api>
  - <https://supabase.com/docs/guides/database/postgres/row-level-security>
  - <https://supabase.com/docs/guides/storage/security/access-control>
  - <https://supabase.com/docs/guides/functions/auth>
  - <https://supabase.com/docs/guides/functions/cors>
  - <https://supabase.com/docs/guides/functions/secrets>

## 3. Files Inspected

- `reports/full-site-improvement-review.md`
- `reports/codex-goal-roadmap.md`
- `reports/supabase-production-security-review.md`
- `reports/supabase-edge-functions-review.md`
- `reports/member-gallery-end-to-end-review.md`
- `supabase.js`
- `supabase/README.md`
- `supabase/config.toml`
- `supabase/functions/**`
- `supabase/migrations/**`
- `package.json`
- `scripts/**`
- `.github/workflows/**`
- `auth.html`
- `account.html`
- `gallery-submit.html`
- `leader-dashboard.html`
- `gallery.js`

## 4. Current Supabase Surfaces

| Surface | Current source | Exposure |
| --- | --- | --- |
| Browser runtime config | `supabase.js` | Public Supabase URL, publishable key, non-secret role IDs, bucket name, upload limits. |
| Auth/session helper | `supabase.js`, `auth.js`, member pages | Browser session only; no service key in public code. |
| Profile and own submissions | `member_profiles`, `gallery_submissions` via `supabase.js` | Authenticated user path constrained by RLS and grants. |
| Member upload Storage | Private `member-gallery` bucket | Browser upload path requires active verified member and own-folder Storage policies. |
| Discord verification | `verify-discord-member` | `verify_jwt = true`; uses trusted Edge runtime and Discord bot token from secrets. |
| Moderator queue | `list-gallery-review-queue` | `verify_jwt = true`; server-side moderator role verification. |
| Moderation action | `moderate-gallery-submission` | `verify_jwt = true`; updates pending submissions and records an audit event. |
| Public approved feed | `list-approved-gallery-submissions` | `verify_jwt = false` by design; returns only approved rows with short-lived signed URLs. |

## 5. What Is Validated Locally

| Check | Current command | Coverage | Gap |
| --- | --- | --- | --- |
| JS syntax | `node scripts/check-js.mjs` through `npm run check` | Browser/page scripts and validation scripts parse. | Does not type-check Deno Edge Functions. |
| JSON syntax | `node scripts/check-json.mjs` through `npm run check` | Content/data JSON parse. | Does not validate Supabase policy intent or content schema. |
| Gallery timestamps | `node scripts/check-gallery-timestamps.mjs` | Static Gallery timestamp model. | Does not cover approved member feed timestamps. |
| Local refs | `node scripts/check-refs.mjs` | HTML/JSON/script local references. | Does not validate dashboard redirect allow-list. |
| Asset thresholds | `node scripts/check-assets.mjs` | Asset existence and large-asset warning. | Known MP3 warning remains intentional. |
| Production HTTP smoke | `npm run check:production` | Home, Gallery, Recruitment, Join, Events, robots, sitemap, limited metadata. | Does not include Auth, Account, Upload, Leader Dashboard, approved feed, or Supabase probes. |
| Gallery lightbox smoke | `npm run smoke:gallery` | First static Gallery thumbnail uses `/thumbs/`; lightbox opens full image. | Does not cover approved-feed success/failure, member category, sort, or signed URL leakage. |
| Supabase CLI local migration list | `supabase migration list --local` | Local and remote migration IDs currently match. | Not part of required validation or CI. |
| Supabase local schema lint | `supabase db lint --local` | Reported no local schema errors. | Requires Supabase CLI/local database; not part of CI. |
| Supabase local advisors | `supabase db advisors --local` | Reported no local issues. | Requires Supabase CLI/local database; not part of CI. |

Current local tool notes:

- Supabase CLI is installed at `2.95.4`; the CLI reports `2.98.2` is available.
- `deno` is not installed, so `deno check` cannot currently run in this environment.
- `supabase migration list --local` showed the four local migration IDs aligned with the remote migration list.
- `supabase db lint --local` and `supabase db advisors --local` returned no issues.

## 6. What Is Validated In CI

| Workflow | Trigger | Current command | Coverage | Gap |
| --- | --- | --- | --- | --- |
| `validate-static-site.yml` | Pull request and push to `main` | `npm run check` | JS/JSON/Gallery timestamp/ref/asset checks. | Does not run `git diff --check`, production smoke, Gallery browser smoke, Supabase CLI checks, Edge Function checks, or secret-pattern scan. |
| `production-smoke.yml` | Weekly schedule and manual dispatch | `npm run check:production` | Public production availability and limited metadata. | Not required for PR merge and not member/Supabase-complete. |
| `manual-lighthouse.yml` | Manual dispatch | Lighthouse for Home, Recruitment, Gallery. | Performance/a11y/SEO snapshot artifact. | Not required and does not cover member pages or Supabase workflows. |

CI parity finding:

The PR-required CI path is intentionally lightweight and static-site safe, but it is not equivalent to the local release ladder used in this goal. The current PR check omits `git diff --check`, `npm run check:production`, `npm run smoke:gallery`, Supabase CLI read-only checks, and any Edge Function type/load validation.

## 7. Safe Read-Only Evidence Collected In This Review

### Function deployment parity

Read-only `supabase functions list --project-ref deyvmtncimmcinldjyqe --output json` confirmed all four functions are deployed and active:

| Function | Local `verify_jwt` | Deployed `verify_jwt` | Deployed status | Version |
| --- | ---: | ---: | --- | ---: |
| `verify-discord-member` | `true` | `true` | `ACTIVE` | 3 |
| `list-gallery-review-queue` | `true` | `true` | `ACTIVE` | 2 |
| `moderate-gallery-submission` | `true` | `true` | `ACTIVE` | 1 |
| `list-approved-gallery-submissions` | `false` | `false` | `ACTIVE` | 2 |

### Public production probes

All probes used the public project URL and publishable browser key only. No service key was used.

| Probe | Result | Assessment |
| --- | --- | --- |
| `auth/v1/settings` | `200` | Auth settings endpoint reachable as expected. |
| `rest/v1/` | `401 Secret API key required` | REST root remains hardened. |
| `member_profiles` anon select | `401 42501 permission denied` | Protected table fails closed. |
| `gallery_submissions` anon select | `401 42501 permission denied` | Protected table fails closed. |
| `gallery_moderation_events` anon select | `401 42501 permission denied` | Protected table fails closed. |
| `discord_resources` anon select | `401 42501 permission denied` | Protected table fails closed. |
| `discord_sync_log` anon select | `401 42501 permission denied` | Protected table fails closed. |
| `storage/v1/object/list/member-gallery` fake prefix | `200`, empty array | No public object listing returned for fake prefix. |
| Protected functions without JWT | `401 UNAUTHORIZED_NO_AUTH_HEADER` | `verify-discord-member`, `list-gallery-review-queue`, and `moderate-gallery-submission` fail closed at gateway. |
| `list-approved-gallery-submissions` public GET | `200` | Intended public approved-feed endpoint responds. Signed URLs were not copied into this report. |

## 8. Dashboard Or Manual Only

These checks are important, but should not be automated in public PR CI:

| Check | Why manual/dashboard-only |
| --- | --- |
| Supabase Auth Site URL and redirect URL allow-list | Requires dashboard/project access and should be compared without printing credentials. |
| Discord provider client secret presence | Secret value must not be exposed to CI logs or reports. |
| Production Edge Function secret inventory | `supabase secrets list` can confirm names, but the operator must ensure values exist without printing them. |
| Full deployed RLS/policy introspection | Requires authenticated project access or SQL; safe when read-only, but not appropriate for public PRs without secret management. |
| Storage bucket settings beyond public probes | Requires dashboard/SQL access; should avoid printing signed URLs or object names unnecessarily. |
| OAuth positive path | Needs approved test Discord accounts and redirect/user-state handling. |
| Live member upload/moderation lifecycle | Mutates production rows and private Storage unless isolated test accounts and cleanup are approved. |

## 9. Credential-Gated Checks

These are safe only with approved credentials and strict redaction:

- Real Discord OAuth login with a test user.
- `verify-discord-member` with a real Supabase user JWT.
- Verified member profile read/update.
- Own `gallery_submissions` read after sign-in.
- Moderator access check with a moderator test account.
- Read-only queue listing for a moderator.
- Production Edge Function deployment list and secret-name inventory through authenticated Supabase CLI.
- Read-only SQL inspection of RLS policies, grants, function schemas, and bucket settings.

## 10. Live-Mutation-Gated Checks

Do not automate these in ordinary CI:

- Uploading a real file to `member-gallery`.
- Inserting a real `gallery_submissions` row.
- Approving or rejecting a real submission.
- Deleting or archiving production submissions.
- Removing Storage objects.
- Running `supabase db push`.
- Deploying Edge Functions.
- Setting or rotating Supabase/Discord secrets.

These belong in an operator-assisted staging or production test-account workflow with explicit record IDs, cleanup steps, and confirmation that no real member content is affected.

## 11. Proposed Safe CI Improvements

Recommended future branches, in order:

| Priority | Branch | Change | Why it is safe | Validation |
| --- | --- | --- | --- | --- |
| P1 | `chore/static-ci-whitespace-parity` | Add `git diff --check` to the PR validation workflow. | No network, no secrets, no mutation. | PR CI plus local `git diff --check`. |
| P1 | `qa/gallery-approved-feed-regression-matrix` | Decide whether to add a dependency-free Gallery matrix script or keep it local/manual. | Can test static-only and mocked failure states without Supabase mutation. | Local server plus `npm run smoke:gallery`. |
| P1 | `chore/edge-function-deno-check-plan` | Add documented Deno check commands, then consider a CI job only if Deno install/runtime is reliable. | Type/load checks only; no deployment. | `deno check` for each function. |
| P2 | `chore/production-smoke-pr-gate-review` | Evaluate whether `npm run check:production` should run on PRs or remain scheduled/manual. | Read-only HTTP checks, but network flake risk should be reviewed. | Production smoke against known URLs. |
| P2 | `qa/supabase-readonly-probe-script-plan` | Design a sanitized public probe script that never prints keys, signed URLs, or private object paths. | Uses publishable key only and read-only endpoints. | Public fail-closed probes with redacted output. |

No workflow or script change is made in this N01 branch because the goal is report-first and the safe CI changes should each get a small dedicated review.

## 12. Proposed Manual Verification Checklist

Before a Supabase-impacting release:

1. Confirm clean `main` and run the standard validation ladder.
2. Confirm Supabase CLI version and note whether an upgrade is required.
3. Run `supabase functions list --project-ref deyvmtncimmcinldjyqe --output json` and compare function status/auth modes against `supabase/config.toml`.
4. Run `supabase migration list --local` and confirm local and remote migration IDs match.
5. Run `supabase db lint --local` and `supabase db advisors --local` when local database access is available.
6. Run `deno check` for changed Edge Functions if Deno is installed.
7. Run sanitized public probes for protected table fail-closed behavior and intended public approved feed behavior.
8. Confirm dashboard-only items manually: redirect allow-list, provider secrets, Edge Function secret names, and bucket settings.
9. If live member testing is approved, use test accounts only and record cleanup status.
10. Confirm no data/protected-content diffs, no secret-like values in diff, no `supabase db push`, and no function deployment unless explicitly approved.

## 13. Do Not Automate Yet

- Real Discord OAuth login.
- Role verification with real user JWTs.
- Profile update mutations.
- Gallery file upload and cleanup.
- Moderation approval/rejection.
- Storage object deletion.
- Dashboard secret-value checks.
- `supabase db push`.
- `supabase functions deploy`.
- Any check that prints signed URLs, bearer tokens, refresh tokens, service-role keys, Discord bot tokens, webhook URLs, or private object paths.

## 14. Findings

No new P0 blocker was found.

Important gaps remain:

1. PR CI does not match the full local validation ladder.
2. Edge Functions have no required `deno check` path because Deno is not installed locally and CI does not install it.
3. Supabase parity checks are currently manual/read-only, not scripted.
4. Dashboard-only checks remain operator-owned.
5. Live positive-path member checks require approved test accounts and explicit mutation boundaries.

## 15. Safety Confirmation

- No data files changed.
- Protected content was not changed.
- No secrets were committed.
- No `supabase db push` was run.
- No Edge Functions were deployed.
- No migrations were created.
- No Supabase configuration changed.
- No production member data was mutated.
- No Storage objects were created, deleted, or listed beyond a fake-prefix empty-list probe.

## 16. Next Recommended Item

Continue to N02: `qa/member-workflow-test-account-matrix`.
