# Production Member Workflow Smoke

Date: 2026-05-14
Branch: `qa/production-member-workflow-smoke`
PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/125>
Goal: G09
Mode: Production QA/report-only

## 1. Scope

This smoke checked the live GitHub Pages site, public Supabase browser integration, Discord Auth redirect start, signed-out member workflow states, Leader Dashboard signed-out behavior, and public Gallery approved-feed behavior.

No implementation files were changed.

No data files, Gallery captions, assets, migrations, Edge Functions, workflows, dependencies, Supabase configuration, or secrets were changed.

No Supabase database mutation was run. No Edge Functions were deployed.

## 2. Credential Boundary

No approved production test account credentials were available in this session.

Therefore, this smoke did not:

- complete Discord OAuth sign-in
- verify a live member's Discord roles
- update a live Account profile
- upload a live member Gallery image
- approve or reject a live moderation item
- mutate production Storage or database rows

Those paths require an approved test account and explicit mutation boundaries before they can be honestly marked as production-tested.

## 3. Live URLs Checked

Viewport: `390px`

| URL | Result |
| --- | --- |
| `https://mochirii.com/auth.html` | `200`; signed-out state rendered; no horizontal overflow; no console-breaking site errors. |
| `https://mochirii.com/account.html` | `200`; signed-out Account panel rendered; Account dashboard stayed hidden; no horizontal overflow; no console-breaking site errors. |
| `https://mochirii.com/gallery-submit.html` | `200`; upload gate rendered `Signed out` / `Login Required`; upload panel stayed hidden; no horizontal overflow; no console-breaking site errors. |
| `https://mochirii.com/leader-dashboard.html` | `200`; signed-out Leader Dashboard panel rendered; review panel stayed hidden; no horizontal overflow; no console-breaking site errors. |
| `https://mochirii.com/gallery.html` | `200`; Gallery rendered 74 images, including the live approved member feed; no horizontal overflow; no console-breaking site errors. |
| `https://mochirii.com/gallery.html?approvedFeed=1` | `200`; Gallery rendered 74 images; no horizontal overflow; no console-breaking site errors. |

## 4. Discord Auth Redirect Start

The production Login with Discord button was clicked only far enough to verify redirect wiring. No Discord credentials were entered.

Result:

- browser reached Discord OAuth
- redirect target included the production Account URL
- Supabase callback used project `deyvmtncimmcinldjyqe`
- no website session was created in this smoke

An external Discord authorization page emitted a `401` resource response while unauthenticated. This was not treated as a site failure because the website successfully initiated the OAuth redirect and no credentials were submitted.

## 5. Public Approved Feed Smoke

The live public Gallery currently renders:

- All: 74 images
- Member Submissions: 1 image

The member-submission filter rendered one item through a Supabase signed URL. The DOM used a short-lived signed object URL for the image source as intended, and no private Storage path text or `storage_path` field was visible in page text or rendered HTML.

No live approved-feed mutation was performed.

## 6. Workflow Results

| Workflow | Result |
| --- | --- |
| Auth signed-out state | Passed. |
| OAuth redirect start | Passed to external Discord OAuth; credentials not submitted. |
| Account signed-out state | Passed. |
| Gallery Submit signed-out gate | Passed. |
| Leader Dashboard signed-out gate | Passed. |
| Public Gallery static plus approved feed | Passed. |
| Public member-submission filter | Passed. |
| Live member role verification | Not tested; approved test credentials required. |
| Live profile update | Not tested; approved test credentials and mutation boundary required. |
| Live member upload | Not tested; approved test credentials and mutation boundary required. |
| Live moderation approve/reject | Not tested; approved moderator test credentials and mutation boundary required. |

## 7. Manual Settings To Keep Verified

These settings cannot be fully proven without dashboard access or approved test credentials:

- Supabase Auth Discord provider is enabled.
- Production Site URL is set for `https://mochirii.com`.
- Production redirect URL includes `https://mochirii.com/account.html`.
- Production redirect URL includes `https://mochirii.com/auth.html`.
- Production redirect URL includes `https://mochirii.com/gallery-submit.html`.
- Production redirect URL includes `https://mochirii.com/leader-dashboard.html`.
- Discord Developer Portal callback remains `https://deyvmtncimmcinldjyqe.supabase.co/auth/v1/callback`.
- Moderator role secret still points to the intended Moderator role.
- Approved-feed Edge Function stays public-safe and returns only approved submissions.

## 8. Findings

No production signed-out or public Gallery blocker was found.

The remaining production confidence gap is credential-limited, not a site regression: live signed-in member upload and moderation workflows need an approved test account and explicit permission to create, review, and clean up production test data.

## 9. Validation Summary

G09-specific checks completed:

- live production browser smoke for Auth, Account, Gallery Submit, Leader Dashboard, Gallery, and approved-feed Gallery
- production OAuth redirect-start check without credential entry
- live public approved-feed member-submission filter check
- private Storage path visibility check

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
| Secret-pattern scan on changed reports | Passed. |

## 10. Safety Confirmation

- No data files changed.
- Existing Gallery captions were not changed.
- Protected content was not changed.
- No secrets were committed.
- No `supabase db push` was run.
- No Edge Functions were deployed.
- No migrations were created.
- No production upload, profile update, approval, rejection, or cleanup mutation was attempted.

## 11. Next Recommended Item

G10 - `qa/secrets-and-public-config-review`
