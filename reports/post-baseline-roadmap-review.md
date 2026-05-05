# Post-Baseline Roadmap Review

## 1. Current Stable Baseline

- Latest main commit at review start: `b3615b2994d744eece7ec8fbb6d1086562c3f94c`
- Public site architecture: static HTML/CSS/vanilla JavaScript with JSON-driven page content and no runtime package dependencies.
- Current validation status: `npm run check`, `git diff --check`, `npm run check:production`, `npm run smoke:gallery`, and individual JS/JSON/ref/asset checks passed during this review.
- Public site areas baselined: original site/content style, Gallery, Events, Codex, Join, Ranks, Leaders, Twills/Profile, Recruitment, Home/Shell, Side Pages, cross-site stability, and the 70-image Gallery content update.
- Known warnings:
  - `assets/audio/mochiriiiiii.mp3` is 3.31 MB and remains above the asset warning threshold.
  - GitHub-managed `pages-build-deployment` still has the known non-blocking Node.js 20 annotation. Checked-in workflows were already updated to current official action versions where repo-controlled.

| Tag | Status | Tagged commit |
| --- | --- | --- |
| `v0.1.0-site-baseline` | local and remote | `eb8af4f12e57a18f122a9cbcb4cc58a523bc0ff1` |
| `v0.2.0-content-style-baseline` | local and remote | `6abf848f880405921ded9b4f566efb3b6e7c7aa9` |
| `v0.3.0-gallery-baseline` | local and remote | `541422baf8cad294ae6087dc938c04073656f1a1` |
| `v0.4.0-events-baseline` | local and remote | `c85b42e87d8a780fba19aee479e663dd3fe8ba72` |
| `v0.5.0-codex-baseline` | local and remote | `718e386dad8c06269dee9d8efd60a3e437f778ae` |
| `v0.6.0-join-baseline` | local and remote | `4dcffc78a1d1b29044b0a1ee2deecef749b79985` |
| `v0.7.0-ranks-baseline` | local and remote | `10d00927ccf7650109dd237c62599e7164ab16a7` |
| `v0.8.0-leaders-baseline` | local and remote | `c0e59b534af5af73eea163a128ae4a187cad580e` |
| `v0.9.0-twills-baseline` | local and remote | `a2ff6f758387ad79f3bec18944264b78eb6d0611` |
| `v1.0.0-recruitment-baseline` | local and remote | `d5cc87dfb945170a3383007f41133cccb75c8856` |
| `v1.1.0-home-shell-baseline` | local and remote | `dc8356165982f8e21b5b3d9bb3d5a486f5140166` |
| `v1.2.0-side-pages-baseline` | local and remote | `4316b5a82a33eeae7cdafa7b56d2fa74da34a93b` |
| `v1.3.0-cross-site-stable-baseline` | local and remote | `96cf80ffcca54e525259aee88f4b3756a01f0d10` |
| `v1.4.0-gallery-content-baseline` | local and remote | `b3615b2994d744eece7ec8fbb6d1086562c3f94c` |

## 2. Current Site Health

- Production check status: `npm run check:production` passed.
- Workflow/deployment status: latest inspected `Validate static site` runs passed; latest inspected Pages deployment runs passed. Checked-in workflows are active: Manual Lighthouse audit, Production smoke check, and Validate static site.
- Gallery state: 70 images total after PR #61 and live verification in PR #62. Current counts are `portraits` 22, `gatherings` 22, `action` 6, `scenery` 5, and `companions` 15.
- Supabase scaffold state: `supabase.js`, `.env.example`, `supabase/README.md`, and `supabase/config.toml` exist. The scaffold is dependency-free and browser-safe by design.
- Remaining known warnings: MP3 size warning; GitHub-managed Pages Node.js 20 annotation.
- Documentation posture: every major page area now has a guide and implementation/mobile QA reports. `docs/roadmap.md` is older than the later baselines and still mentions early Gallery category work, so this report should be treated as the newer planning source.

## 3. Protected Content Boundaries

Future branches must preserve these fields exactly unless the user explicitly approves a change:

- `data/home.json` `seal.verse`
- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`
- `data/twills.json` `profile.bio`

## 4. Supabase Readiness Review

Current Supabase files:

- `supabase.js`: public browser helper loaded before `site.js` and page scripts.
- `supabase/README.md`: repo-specific browser-helper, key, migration, and CLI guidance.
- `supabase/config.toml`: project id only.
- `.env.example`: placeholders for `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_PROJECT_REF`, plus commented private examples.
- `.gitignore`: ignores local `.env`, `supabase/.branches/`, `supabase/.temp/`, and function env files while keeping committed config and future migrations trackable.

What exists:

- `window.MochiriiSupabase` with `getConfig`, `createHeaders`, `request`, `select`, `insert`, and `probe` helpers.
- A public publishable key in browser code, intentionally public runtime configuration.
- Shared script inclusion across public pages in this order: `utils.js` -> `supabase.js` -> `site.js` -> page-specific script. `gallery.html` preserves the same order with cache-query strings.
- Signed-out browsing expectation: Supabase helper loads without page-load network requests and must not block public page rendering.

What does not exist yet:

- No committed migrations.
- No committed tables.
- No committed RLS policies.
- No committed storage buckets.
- No committed Edge Functions.
- No auth UI.
- No user profiles.
- No uploads.
- No Supabase-backed page content.
- No package dependency for Supabase runtime use in `package.json`.

Security rules for future work:

- Never put a `service_role` key, secret key, database password, JWT secret, database URL, access token, or refresh token in browser code or committed files.
- Keep `.env` files local; keep `.env.example` placeholder-only.
- Public publishable/anon config may be browser-side only when intentional and paired with RLS-scoped access.
- Every exposed table must enable RLS before browser access.
- Every browser-visible table must document owner/user relationship and select/insert/update/delete policy intent.
- Every storage bucket must document public/private access, owner rules, upload rules, overwrite/upsert rules, deletion rules, file-type limits, and moderation flow.
- Auth flows must preserve signed-out public browsing and fail gracefully when Supabase is unavailable.
- User-generated content needs moderation/admin boundaries before public display.
- Do not run destructive Supabase CLI commands in normal Codex tasks. Schema work should be migration-based and review-gated.

External Supabase documentation spot-check:

- Supabase documents that browser access is safe only when RLS is enabled on exposed tables: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase API key docs distinguish publishable keys from secret keys and warn that secret keys must not be exposed publicly: <https://supabase.com/docs/guides/getting-started/api-keys>
- Supabase Storage access control depends on policies on `storage.objects`, and overwrite/upsert needs additional permissions: <https://supabase.com/docs/guides/storage/security/access-control>
- Supabase function secret docs distinguish browser-safe publishable/anon values from secret/service-role values that bypass RLS: <https://supabase.com/docs/guides/functions/secrets>

## 5. Candidate Workstreams

| Candidate | Summary | Value | Risk | Dependencies | Recommended branch | Before first Supabase implementation? |
| --- | --- | --- | --- | --- | --- | --- |
| A. Supabase feature planning | Define the product slices, non-goals, data ownership, moderation model, and rollout order before schema/auth/storage work. | High | Low | Current scaffold and baselines. | `docs/supabase-feature-plan` | Yes; should happen next. |
| B. Auth/login scaffold | Add sign-in/sign-out state and minimal auth UI while preserving public pages. | High | Medium/High | Feature plan, schema/security plan, final auth provider decisions. | `feature/auth-login-scaffold` | No; plan and security gates first. |
| C. Member profile foundation | Define member profile data, display rules, edit flow, privacy, and moderation. | High | High | Auth scaffold, profile schema, RLS policies, owner model. | `feature/member-profile-foundation` | No; should follow auth and schema/security planning. |
| D. Gallery upload foundation | Allow future member-submitted screenshots through storage and moderation. | High | High | Auth, storage bucket policies, image validation, moderation queue, asset optimization flow. | `feature/gallery-upload-foundation` | No; after auth/profile/admin decisions. |
| E. Forum/discussion foundation | Add future guild discussion features. | Medium | Very High | Auth, profiles, rate limits, moderation, visibility rules, admin tools. | `feature/forum-discussion-foundation` | No; defer until simpler Supabase flows are proven. |
| F. MP3 asset optimization | Reduce or replace `assets/audio/mochiriiiiii.mp3` to remove the known asset warning. | Medium | Low/Medium | Source audio availability or acceptable recompression target. | `performance/audio-asset-optimization` | Optional before implementation; useful to clean validation noise. |
| G. SEO/social preview verification | Recheck social cards after Gallery image additions and production cache settling. | Medium | Low | Live production access and manual app-side preview surfaces. | `qa/social-preview-verification` | Optional; not a Supabase blocker. |
| H. Manual Lighthouse follow-up | Refresh Lighthouse results after stabilization and Gallery content update. | Medium | Low | Manual workflow/browser availability. | `qa/manual-lighthouse-follow-up` | Optional; useful before heavy Supabase UI work. |
| I. Production cache policy review | Decide whether broader cache-query/versioning is needed beyond Gallery. | Low/Medium | Medium | Stable asset strategy and future CSS/JS changes. | `qa/cache-policy-follow-up` | No; wait until a shared CSS/JS implementation branch creates a real cache need. |

## 6. Recommended Next Branches

| Priority | Branch | Type | Goal | Why now | Risk | Gate before merge |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `docs/supabase-feature-plan` | Planning | Define the first real Supabase product slice, non-goals, user roles, public/private data boundaries, moderation model, and rollout order. | Supabase is the next major area, but implementation should not start until the guild chooses what the backend is responsible for. | Low | Report-only; no migrations, auth UI, data, JS, CSS, or secrets. |
| 2 | `docs/supabase-schema-security-plan` | Planning/security | Design initial schema, RLS/storage/auth policy intent, migration naming rules, and review gates without creating schema. | Prevents drifting into unsafe browser access or vague policies once implementation starts. | Medium | Must cite intended RLS/storage rules, no schema files yet, human approval before implementation. |
| 3 | `performance/audio-asset-optimization` | Cleanup | Address the known MP3 size warning with a scoped audio optimization or replacement. | Removes the only current first-party validation warning before security-sensitive Supabase work. | Low/Medium | Audio still resolves, recruitment page still labels/renders it, protected copy unchanged, asset check cleaner. |
| 4 | `feature/auth-login-scaffold` | Supabase implementation | Add minimal sign-in/sign-out state and UI while keeping all public pages usable signed out. | Auth is the lowest-level prerequisite for profiles/uploads. | Medium/High | Security review, no service/secret keys, signed-out smoke, no global login assumption, human review before merge. |
| 5 | `feature/member-profile-foundation` | Supabase implementation | Add the first profile data model and read/edit flow with privacy boundaries. | Profiles give auth a concrete use case before uploads or discussion features. | High | Timestamped migrations, RLS policies, owner model, private/public field split, moderation/admin decisions, human review before merge. |

Not immediate:

- `feature/gallery-upload-foundation` should follow auth/profile and a moderation plan because it introduces storage, user-generated media, file validation, and public-display risk.
- `feature/forum-discussion-foundation` should wait until auth/profile/moderation patterns are proven.
- `qa/social-preview-verification`, `qa/manual-lighthouse-follow-up`, and `qa/cache-policy-follow-up` are useful but not blockers for planning the Supabase rollout.

## 7. Suggested Supabase Rollout Sequence

1. `docs/supabase-feature-plan`
2. `docs/supabase-schema-security-plan`
3. `feature/auth-login-scaffold`
4. `feature/member-profile-foundation`
5. `feature/gallery-upload-foundation`

Rationale:

- Planning comes first because no committed schema, auth UI, storage, or Edge Functions exist yet.
- Schema/security planning should precede implementation so RLS, storage policy, owner, and moderation questions are explicit before code lands.
- Auth should land before profiles or uploads.
- Profiles should land before uploads because storage ownership and moderation need user identity.
- Gallery uploads should come after the site proves auth/profile behavior and establishes moderation/admin boundaries.

## 8. Risks and Guardrails

- Secrets: no service-role key, secret key, database URL, database password, JWT secret, access token, or refresh token may appear in the repo or browser code.
- RLS: every public/exposed table needs RLS and documented policy intent before browser access.
- Storage policies: upload, select, update, delete, and upsert behavior must be explicitly scoped before member uploads.
- Moderation: user-generated profiles, screenshots, or discussion posts need admin/moderation workflows before public display.
- Signed-out browsing: all public pages must continue to render without requiring auth or live Supabase data.
- Production deployment: keep GitHub Pages static hosting and current checked-in workflow behavior unless a separate approved deployment branch changes it.
- Branch discipline: do not mix Supabase schema/auth/storage work with copy, CSS redesign, Gallery behavior, workflow maintenance, or protected content.
- Validation: keep `npm run check`, `git diff --check`, JS/JSON/ref/asset checks, production check, and signed-out browser smoke as recurring gates.

## 9. Supabase Branch Gates

### `docs/supabase-feature-plan`

- Scope: choose first Supabase-backed product slices, non-goals, user roles, moderation responsibilities, and branch order.
- Likely files: reports or docs only.
- Must not change: migrations, schema, auth UI, JS behavior, CSS, data, assets, workflows, protected content.
- Security gate: document no-secret and browser-key rules.
- Data/schema gate: list candidate tables/storage concepts only; do not create them.
- UI gate: no UI changes.
- Validation gate: `npm run check`, `git diff --check`, JS/JSON/ref/asset checks, production check.
- Merge gate: report-only may merge after validation; no implementation review needed beyond scope confirmation.

### `docs/supabase-schema-security-plan`

- Scope: define initial schema, RLS policy intent, storage access rules, migration naming expectations, and auth role assumptions.
- Likely files: reports/docs only.
- Must not change: actual migration files, tables, storage buckets, runtime JS, data, CSS, assets, workflows, protected content.
- Security gate: no service-role key in browser, no secrets in repo, `.env.example` placeholder-only, public config only where intentional.
- Data/schema gate: every proposed table documents owner/user relationship and policy intent for select/insert/update/delete.
- UI gate: no UI changes; signed-out browsing requirements documented.
- Validation gate: repo validation plus optional Supabase CLI `--help`/version checks only if CLI is available.
- Merge gate: human approval recommended because this report becomes the implementation contract.

### `feature/auth-login-scaffold`

- Scope: add minimal auth state, sign-in/sign-out UI, and graceful signed-out behavior.
- Likely files: `supabase.js`, a new auth-focused page or scoped shell UI, relevant HTML, data if explicitly needed, tests/reports.
- Must not change: protected content, Gallery behavior, Events behavior, unrelated copy, broad CSS redesign, workflows.
- Security gate: no service-role/secret/database credentials, no access/refresh tokens committed, browser uses only publishable/anon config.
- Data/schema gate: no tables required unless explicitly approved; if sessions/profile bootstrap is added, migrations must be timestamped and RLS-scoped.
- UI gate: public pages render signed out; auth failure is non-fatal; no global logged-in assumption.
- Validation gate: repo validation, production check, signed-out browser smoke, auth UI smoke, secret scan of diff.
- Merge gate: implementation branch should not auto-merge; require human review of auth/security decisions.

### `feature/member-profile-foundation`

- Scope: create member profile schema and first read/edit flow with clear public/private fields.
- Likely files: Supabase migration(s), scoped profile JS/HTML/data if needed, `supabase/README.md` updates only if implementation rules change, report.
- Must not change: protected content, unrelated page data/copy, Gallery upload behavior, forum/discussion features.
- Security gate: no secrets, RLS enabled, policies scoped by authenticated user/admin role, no `user_metadata` authorization decisions.
- Data/schema gate: timestamp-named migrations, owner/user relationship documented, select/insert/update/delete intent documented, no destructive CLI commands or remote push unless explicitly approved.
- UI gate: profile UI handles signed-out users and private fields clearly; no public leak of private profile data.
- Validation gate: repo validation, production check, local signed-out smoke, safe Supabase CLI checks if available, migration review, secret scan.
- Merge gate: require human review before merge because schema and RLS are introduced.

### `feature/gallery-upload-foundation`

- Scope: introduce upload model after auth/profile is stable, with storage rules and moderation before public Gallery display.
- Likely files: storage/schema migration(s), upload UI, moderation/admin plan or report, scoped JS, validation updates only if explicitly approved.
- Must not change: existing Gallery categories/count behavior unless the branch explicitly scopes upload queue integration; no raw uploads committed.
- Security gate: storage policies required, file type/size validation required, no service keys in browser, no direct public display before moderation.
- Data/schema gate: bucket access rules, object ownership, moderation status, and delete/update/upsert policy intent documented.
- UI gate: signed-out users get a safe prompt; upload errors are clear; public Gallery remains stable.
- Validation gate: repo validation, local browser smoke, storage policy review, upload failure-path smoke, secret scan.
- Merge gate: require human review before merge; do not auto-merge storage/user-generated-content branches.

## 10. Recommendation

Start `docs/supabase-feature-plan` next.

Why:

- The site is stable and all major public areas are baselined.
- Supabase exists only as a browser-safe scaffold today.
- The next major risk is not code mechanics; it is choosing the first backend responsibility and writing down what must remain public, private, moderated, and signed-out safe.

Do not implement yet:

- auth UI
- migrations
- tables
- RLS policies
- storage buckets
- Edge Functions
- member profiles
- uploads
- forum/discussion features
