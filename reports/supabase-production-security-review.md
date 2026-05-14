# Supabase Production Security Review

Date: 2026-05-14
Branch: `qa/supabase-production-security-review`
PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/109>
Goal: G01
Mode: read-only QA/report

## 1. Scope

This review checked the public Supabase security boundary for the static GitHub Pages site. It focused on browser-safe configuration, anonymous REST behavior, private Storage expectations, signed-out browsing, Edge Function auth posture at the gateway, and secret hygiene.

No site behavior, data files, CSS, JavaScript, Supabase migrations, Supabase functions, workflows, validation scripts, or assets were changed.

No Supabase database mutation was run. No Edge Functions were deployed.

## 2. Current References

Official Supabase references checked during this review:

- Supabase securing API documentation: <https://supabase.com/docs/guides/api/securing-your-api>
- Supabase row-level security documentation: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase Storage access-control documentation: <https://supabase.com/docs/guides/storage/security/access-control>
- Supabase OpenAPI anon-key changelog note: <https://supabase.com/changelog/42949-breaking-change-removing-access-to-openapi-spec-via-the-anon-key>

Relevant current guidance:

- Data API exposure is controlled by grants plus RLS policies.
- Tables in exposed schemas should have RLS enabled.
- Service/secret keys must not be exposed in browser code.
- Storage access is controlled through `storage.objects` RLS policies.
- The REST OpenAPI root now requires a secret API key, which matches the current production probe result.

## 3. Files Inspected

- `reports/codex-goal-roadmap.md`
- `supabase.js`
- `supabase/README.md`
- `supabase/config.toml`
- `supabase/migrations/20260513081523_create_discord_role_gated_gallery_uploads.sql`
- `supabase/migrations/20260513193110_increase_member_gallery_upload_limit_to_50mb.sql`
- `supabase/migrations/20260513195853_create_gallery_moderation_events.sql`
- `supabase/migrations/20260514010338_create_discord_integration_hub.sql`
- `supabase/functions/verify-discord-member/index.ts`
- `supabase/functions/list-gallery-review-queue/index.ts`
- `supabase/functions/moderate-gallery-submission/index.ts`
- `supabase/functions/list-approved-gallery-submissions/index.ts`
- `supabase/functions/_shared/gallery-moderation.ts`
- `supabase/functions/_shared/discord-api.ts`
- `auth.html`, `account.html`, `gallery-submit.html`, `leader-dashboard.html`, `gallery.html`
- `auth.js`, `account.js`, `gallery-submit.js`, `leader-dashboard.js`, `gallery.js`, `site.js`
- `.gitignore`, `.env.example`, `supabase/functions/.env.example`

## 4. Public Runtime Config

`supabase.js` exposes only browser-safe runtime configuration:

- Project URL: `https://deyvmtncimmcinldjyqe.supabase.co`
- Publishable key: `sb_publishable_...`
- Non-secret Discord guild and role IDs
- Non-secret gallery bucket name and upload limits

No service-role key, Supabase secret key, database URL/password, Discord bot token, Discord webhook URL, JWT secret, access token, or refresh token is present in browser code.

The static-site architecture remains intact. Pages load Supabase through the CDN and the shared `supabase.js` helper; privileged work remains behind Edge Functions.

## 5. Database And RLS Expectations

Migration review found:

- `member_profiles` has RLS enabled.
- `gallery_submissions` has RLS enabled.
- `gallery_moderation_events` has RLS enabled.
- `discord_resources` has RLS enabled.
- `discord_sync_log` has RLS enabled.
- `anon` table access is revoked for member/profile/moderation/Discord tables.
- `authenticated` access is intentionally scoped to own profile/submission workflows.
- `service_role` is reserved for trusted backend/admin workflows.
- Storage bucket `member-gallery` is created as private.
- `storage.objects` has policies for authenticated users to operate only on their own folder and only after active Discord role verification.

One hardening note remains: `public.handle_new_member_profile()` is a `security definer` trigger helper in the `public` schema. Execute is revoked from `public`, `anon`, and `authenticated`, and the function is used by the `auth.users` trigger rather than public browser calls. Public probes did not show an exploitable anonymous path. Current Supabase guidance still prefers keeping `security definer` functions out of exposed schemas, so this should be verified and, if needed, moved to a private schema in a future migration/hardening branch. This branch did not create migrations by design.

## 6. Read-Only Production Probes

All probes used the public Supabase URL and the browser publishable key only. No service key was used.

| Path | Result | Assessment |
| --- | --- | --- |
| `auth/v1/settings` | `200` | Auth settings endpoint reachable as expected. |
| `rest/v1/` | `401 Secret API key required` | Matches current Supabase OpenAPI anon-key hardening. |
| `rest/v1/member_profiles?select=id&limit=1` | `401 42501 permission denied` | Anon table read fails closed. |
| `rest/v1/gallery_submissions?select=id,status&limit=1` | `401 42501 permission denied` | Anon table read fails closed. |
| `rest/v1/gallery_moderation_events?select=id&limit=1` | `401 42501 permission denied` | Anon table read fails closed. |
| `rest/v1/discord_resources?select=id&limit=1` | `401 42501 permission denied` | Anon table read fails closed. |
| `rest/v1/discord_sync_log?select=id&limit=1` | `401 42501 permission denied` | Anon table read fails closed. |
| `storage/v1/object/list/member-gallery` with root/fake-user prefix | `200 []` | No public object listing returned. |
| `functions/v1/verify-discord-member` without JWT | `401 UNAUTHORIZED_NO_AUTH_HEADER` | Protected function fails closed at gateway. |
| `functions/v1/list-gallery-review-queue` without JWT | `401 UNAUTHORIZED_NO_AUTH_HEADER` | Protected function fails closed at gateway. |
| `functions/v1/moderate-gallery-submission` without JWT | `401 UNAUTHORIZED_NO_AUTH_HEADER` | Protected function fails closed at gateway. |
| `functions/v1/list-approved-gallery-submissions` | `200`, `count: 1`, signed URL TTL `3600` | Intended public approved-feed path works and returns short-lived signed URL data. |

The public approved-feed probe intentionally did not write signed URLs into this report. The sanitized result confirmed count, TTL, and non-URL metadata keys only.

## 7. Signed-Out Browser Smoke

Local static server: `http://127.0.0.1:8765`

Checked pages at `390px` and `1440px`:

- `/`
- `/auth.html`
- `/account.html`
- `/gallery-submit.html`
- `/leader-dashboard.html`
- `/gallery.html`

Results:

- Pages returned `200`.
- Header and footer rendered.
- Signed-out auth nav was visible.
- Signed-in and verified-only nav controls remained hidden.
- No horizontal overflow was detected.
- No console-breaking errors were detected.

## 8. Secret Scan

Scans checked for:

- `sb_secret_`
- real `SUPABASE_SERVICE_ROLE_KEY=...`
- real `DISCORD_BOT_TOKEN=...`
- Discord webhook URLs
- `client_secret`
- `JWT_SECRET`
- credentialed Postgres URLs
- JWT-like tokens
- accidental `.env` files

Findings:

- `.env` and `.env.*` are ignored; only `.env.example` is present.
- `supabase/.temp/`, `supabase/.branches/`, and `supabase/functions/.env*` are ignored.
- Secret-pattern hits were placeholders, docs, grant names, environment variable reads, or prior report command text.
- No committed real secret was found.

## 9. Blocked Or Dashboard-Only Checks

These checks require dashboard, Supabase MCP, or authenticated project access that is intentionally not committed:

- Auth Site URL and redirect URL allow-list in Supabase Dashboard.
- Discord Auth provider client secret presence.
- Production Edge Function secret inventory without printing secret values.
- Full deployed schema/RLS introspection beyond public probes.
- Full Storage bucket settings through dashboard or authenticated SQL.
- Deployment parity between local `supabase/functions/**` and the currently deployed functions.

The public production probes still provide useful evidence that anonymous Data API access fails closed for the protected tables and that protected functions reject missing JWTs.

## 10. Findings

No P0 public security blocker was found in this read-only review.

Follow-up notes:

1. Review `public.handle_new_member_profile()` in a future database hardening branch because it is a `security definer` function in `public`. The current migration revokes execute from browser roles and public probes fail closed, so this is not a merge blocker for this report-only branch.
2. Continue with G02, the Edge Functions review, before deeper member workflow QA. G02 should confirm CORS, method handling, function deployment parity, secret handling, and fail-closed function bodies.
3. Production dashboard-only checks should be covered in G09 or an operator-assisted Supabase settings pass.

## 11. Validation Summary

| Command / check | Result |
| --- | --- |
| `npm run check` | Passed with the known `assets/audio/mochiriiiiii.mp3` size warning. |
| `git diff --check` | Passed. |
| `node scripts/check-json.mjs` | Passed. |
| `node scripts/check-js.mjs` | Passed. |
| `node scripts/check-refs.mjs` | Passed. |
| `node scripts/check-assets.mjs` | Passed with the known MP3 size warning. |
| `npm run check:production` | Passed. |
| `npm run smoke:gallery` | Passed. |
| Read-only public Supabase probes | Passed; protected anon paths failed closed and intended public approved feed returned sanitized metadata. |
| Signed-out browser smoke | Passed for `/`, `/auth.html`, `/account.html`, `/gallery-submit.html`, `/leader-dashboard.html`, and `/gallery.html` at `390px` and `1440px`. |
| Secret scan | Passed; hits were placeholders, docs, grant names, environment variable reads, or prior report command text. |
| `git diff -- data/` | Empty. |

## 12. Safety Confirmation

- No data files changed.
- Protected content was not changed.
- No secrets were committed.
- No `supabase db push` was run.
- No Edge Functions were deployed.
- No migrations were created.
- No Supabase configuration was changed.

## 13. Next Recommended Item

G02 - `qa/supabase-edge-functions-review`
