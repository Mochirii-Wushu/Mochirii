# Secrets And Public Config Review

Date: 2026-05-14
Branch: `qa/secrets-and-public-config-review`
PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/127>
Goal: G10
Mode: QA/report-only

## 1. Scope

This review scanned tracked source, reports, docs, examples, Supabase config, Edge Function source, browser config, and committed environment examples for real secrets or unsafe private values.

No implementation files were changed.

No data files, migrations, Edge Functions, workflows, dependencies, Supabase configuration, or secrets were changed.

No Supabase database mutation was run. No Edge Functions were deployed.

## 2. Files And Areas Checked

- tracked file inventory: 413 files
- tracked docs/source/config inventory subset: 182 files
- `.env.example`
- `supabase/functions/.env.example`
- `supabase/README.md`
- `supabase/config.toml`
- `supabase.js`
- `supabase/functions/**`
- `supabase/migrations/**`
- `reports/**`
- `docs/**`
- public HTML/JS files

No tracked accidental `.env` file was found. Only `.env.example` and `supabase/functions/.env.example` are tracked.

No ignored or untracked `.env` path appeared in `git status --ignored --short`.

## 3. Scan Patterns

The review searched for:

- `sb_secret_`
- `service_role`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SECRET_KEYS`
- `DISCORD_BOT_TOKEN`
- `client_secret`
- `JWT_SECRET`
- `SUPABASE_DB_PASSWORD`
- credentialed database URLs and `postgres://`
- Discord webhook URLs
- JWT-like `eyJ...` values
- high-entropy token/secret/password assignments
- accidental `.env` files

## 4. Hit Classification

| Hit type | Classification | Notes |
| --- | --- | --- |
| `supabase.js` project ref, URL, and `sb_publishable_...` key | Public-safe | Browser client uses only public Supabase URL and publishable key. |
| `.env.example` and `supabase/functions/.env.example` | Placeholder | Values are blank or documented placeholders; no real secret values are committed. |
| `DISCORD_BOT_TOKEN=<set manually, never commit>` in docs | Placeholder | Documentation-only warning text, not a token. |
| `DISCORD_WEBHOOK_*=<set manually, never commit>` in docs | Placeholder | Documentation-only warning text, not webhook URLs. |
| `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_SECRET_KEYS` in Edge Function source | Backend-only env var names | Source reads runtime environment variables; no values are committed. |
| `DISCORD_BOT_TOKEN` in Edge Function source | Backend-only env var name | Source reads runtime environment variable; no value is committed. |
| `service_role` in migrations | Database role name | Grants reference the Postgres/Supabase role name, not a secret key. |
| `service_role` in reports/docs | Documentation-only | Prior reviews and runbooks describe the boundary. |
| `client_secret`, `JWT_SECRET`, `postgres://`, and secret scan examples in reports | Documentation-only | Prior reports list scan patterns and safety gates. |
| `supabase/config.toml` project id and `verify_jwt` settings | Public config | Project id is not a secret; `list-approved-gallery-submissions` is intentionally public with server-side filtering. |

## 5. Negative Findings

No committed real value was found for:

- Supabase secret key
- Supabase service-role key
- database password
- credentialed database URL
- Discord bot token
- Discord webhook URL
- Discord client secret
- JWT secret
- access token
- refresh token

No runtime secret value was found in public browser JavaScript.

## 6. Public Config Review

`supabase.js` exposes:

- project ref
- project URL
- publishable key
- Discord guild id
- required role ids and labels
- moderator role id in shared docs/config context
- member Gallery bucket name
- upload size/type constraints

Those values are public configuration and do not grant privileged access by themselves. Privileged workflows remain behind RLS, private Storage, and Edge Function runtime secrets.

`supabase/config.toml` keeps:

- `verify-discord-member`: `verify_jwt = true`
- `list-gallery-review-queue`: `verify_jwt = true`
- `moderate-gallery-submission`: `verify_jwt = true`
- `list-approved-gallery-submissions`: `verify_jwt = false`

The only public function is the approved Gallery feed, which is intended for signed-out public Gallery browsing and returns approved public-safe data.

## 7. Findings

No G10 blocker was found. No removal, rotation, or public-config correction is required from this review.

Follow-up note:

- Keep secret scans in future Supabase branches whenever docs, examples, function source, or deployment notes mention credentials.

## 8. Validation Summary

G10-specific checks completed:

- tracked environment-file inventory
- ignored/untracked `.env` path check
- secret-pattern scan
- high-entropy assignment scan
- public browser config review
- Supabase function config review
- hit classification

Final command validation is recorded in the roadmap and PR after this report is committed.

Final command validation:

| Command | Result |
| --- | --- |
| `npm run check` | Passed, with the known intentional MP3 size warning. |
| `git diff --check` | Passed. |
| `node scripts/check-json.mjs` | Passed. |
| `node scripts/check-js.mjs` | Passed. |
| `node scripts/check-refs.mjs` | Passed. |
| `node scripts/check-assets.mjs` | Passed, with the known intentional MP3 size warning. |
| `npm run check:production` | Passed. |
| `npm run smoke:gallery` | Passed. |
| `git diff -- data/ --stat` | Empty. |
| Secret-pattern scan on changed report | Passed; matches were documentation-only pattern names. |

## 9. Safety Confirmation

- No data files changed.
- Protected content was not changed.
- No secrets were committed.
- No `supabase db push` was run.
- No Edge Functions were deployed.
- No migrations were created.
- No Supabase configuration was changed.

## 10. Next Recommended Item

G11 - `chore/document-large-audio-exception`
