# Full Site Improvement Review

Date: 2026-05-15
Branch: `audit/full-site-improvement-review`
Mode: report-only audit and brainstorming

No implementation files, data files, CSS, JavaScript, assets, workflows, validation scripts, Supabase configuration, migrations, or Edge Functions were changed for this review.

## 1. Executive Summary

The current Mōchirīī site is a healthy static guild website with a clear no-build architecture, strong content/data separation, broad page coverage, and several recent QA reports around Supabase, member Gallery, account, and visual regression behavior. Baseline validation passed before this report branch, with the known intentional `assets/audio/mochiriiiiii.mp3` large-asset warning.

The strongest areas are the static-site discipline, JSON-driven page content, public page metadata, signed-out member-page safety, Gallery thumbnail/full-image separation, and the existing validation ladder. The newest and riskiest areas are not broken in the current source, but they are under-proved: Supabase/member positive paths, production role workflows, Edge Function type/load validation, approved member Gallery feed behavior, and accessibility checks beyond basic smoke tests.

The top recommendation is to start with `qa/supabase-ci-and-parity-review`: a report-first QA branch that inventories the exact validation missing for migrations, Edge Functions, RLS/storage policies, public function exposure, and secret hygiene without mutating Supabase or deploying anything.

## 2. Repository Snapshot

Latest main commit at branch creation:

```text
9d0734459203ed2b9c61ca81eaf096e4bca9404b Merge pull request #139 from Mochirii-Wushu/codex/home-status-copy
```

Current package scripts:

| Script | Command |
| --- | --- |
| `check` | `node scripts/check-all.mjs` |
| `check:assets` | `node scripts/check-assets.mjs` |
| `check:gallery-timestamps` | `node scripts/check-gallery-timestamps.mjs` |
| `check:js` | `node scripts/check-js.mjs` |
| `check:json` | `node scripts/check-json.mjs` |
| `check:refs` | `node scripts/check-refs.mjs` |
| `check:production` | `node scripts/check-production.mjs` |
| `smoke:gallery` | `node scripts/smoke-gallery-lightbox.mjs` |

Major pages present:

`index.html`, `join.html`, `events.html`, `gallery.html`, `ranks.html`, `leaders.html`, `codex.html`, `recruitment.html`, `announcements.html`, `raffles.html`, `spotify.html`, `spotlight.html`, `twills.html`, `auth.html`, `account.html`, `gallery-submit.html`, and `leader-dashboard.html`.

Supabase/member features present:

- Discord OAuth entry through `auth.html`, `auth.js`, and `supabase.js`.
- Account dashboard and profile helpers in `account.html`, `account.js`, and `supabase.js`.
- Member Gallery upload flow through `gallery-submit.html`, `gallery-submit.js`, private Storage, and `gallery_submissions`.
- Moderator review queue through `leader-dashboard.html`, `leader-dashboard.js`, `list-gallery-review-queue`, and `moderate-gallery-submission`.
- Public approved member Gallery feed through `list-approved-gallery-submissions` with `verify_jwt = false`, server-side signed URLs, and `gallery.js` normalization.
- Supabase migrations for profiles, submissions, moderation events, Discord resources, storage policies, and upload limits.

Known warnings and review notes:

- `assets/audio/mochiriiiiii.mp3` is intentionally above the normal large-asset threshold.
- `npm run smoke:gallery` requires a local server at `http://127.0.0.1:8765` unless `SMOKE_BASE_URL` is set.
- Previous reports show no current public P0 Supabase blocker, but also document credential-gated gaps for live signed-in member/moderator workflows.
- This audit's local browser sweep checked 17 routes at `390px` and `1440px`: all returned 200, had one `h1`, rendered header/footer shell, avoided horizontal overflow, and kept signed-out member-gated panels hidden.

Protected content for this task:

- `data/home.json` `seal.verse`
- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`
- `data/twills.json` `profile.bio`

## 3. Source Framework

Credible sources used:

- W3C WCAG 2.2: accessibility principles, testable success criteria, label/name/focus/status-message reasoning. <https://www.w3.org/TR/WCAG22/>
- web.dev Core Web Vitals: LCP, CLS, and INP readiness as the current user-experience performance model. <https://web.dev/articles/vitals>
- Google Search Central SEO Starter Guide: crawlability, canonical URLs, metadata, sitemaps, and resource accessibility. <https://developers.google.com/search/docs/fundamentals/seo-starter-guide>
- Nielsen Norman Group 10 Usability Heuristics: visibility of system status, consistency, error prevention, and recovery feedback. <https://www.nngroup.com/articles/ten-usability-heuristics/>
- Supabase Row Level Security docs: RLS on exposed schemas, grants, security-definer caution, and policy performance. <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase Storage access-control docs: private bucket behavior and `storage.objects` policies. <https://supabase.com/docs/guides/storage/security/access-control>
- Supabase Edge Function auth and CORS docs: `verify_jwt`, browser-invoked functions, public functions, service-key boundaries, and CORS headers. <https://supabase.com/docs/guides/functions/auth> and <https://supabase.com/docs/guides/functions/cors>
- GitHub Pages docs: branch/workflow publishing behavior and public nature of Pages sites. <https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site>

## 4. Category Scores

| Category | Current strength | Risk | Evidence from repo | Weakest point | Improvement opportunity | Suggested branch | Priority |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| Security and Supabase safety | 4 | Medium | `supabase/config.toml` has protected functions with `verify_jwt = true`; public approved feed is intentional; migrations enable RLS; prior production security report shows anon paths fail closed. | Edge Function, RLS, storage, and dashboard parity checks are not part of `npm run check`; `public.handle_new_member_profile()` remains a `security definer` helper in `public`. | Add a report-first security validation matrix and determine safe checks for Deno, migration linting, public probes, and dashboard-only items. | `qa/supabase-ci-and-parity-review` | P0 |
| Accessibility | 3 | Medium | Pages generally have one `h1`, skip link, labels, no mobile overflow; member gate states render safely. | No automated WCAG/axe pass in required validation; several `aria-label` values may not match visible labels exactly. | Run label-in-name, keyboard, focus, status-message, and member-form accessibility review before visual changes. | `qa/accessibility-name-and-member-pages-review` | P1 |
| Performance and Core Web Vitals readiness | 3 | Medium | Static pages, WebP gallery images, thumbnails, optional Lighthouse workflow, asset checker. `styles.css` is 4,872 lines and `supabase.js` is 929 lines. | No required Core Web Vitals/Lighthouse baseline; Supabase CDN helpers load on member-aware pages and CSS is monolithic. | Establish current LCP/CLS/TBT baseline before optimizing assets, CSS, and third-party scripts. | `qa/core-web-vitals-current-baseline` | P1 |
| SEO and social previews | 4 | Low | Public pages include metadata/canonicals; `robots.txt` and `sitemap.xml` exist; member pages use `noindex,follow`. | Production check only verifies metadata on home and recruitment. | Expand metadata/canonical/social validation across all public indexable pages. | `qa/public-metadata-coverage-review` | P2 |
| Visual design consistency | 4 | Low | Wuxia/glass identity is consistent; recent visual reports show route/viewport stability; local sweep found no overflow. | Large shared CSS makes small style changes high-blast-radius. | Create a current-state visual token/section inventory before refactoring. | `docs/current-visual-system-manifest` | P2 |
| UX and usability | 3 | Medium | Navigation, Join checklist, Gallery filters, account signed-out gates, and moderation pages exist. | Some member workflow status text is stale or under-tested, including upload success copy that references a future approval workflow. | Review status messages and error recovery for member tasks with NN/g visibility/error-prevention heuristics. | `qa/member-workflow-copy-and-status-review` | P1 |
| Member workflow quality | 3 | High | Account/upload/moderation source exists and signed-out pages fail safe. Prior reports rely on mocked or signed-out proof for many positive paths. | No approved production member/moderator credential matrix for live OAuth, verification, upload, approval, and cleanup. | Define a safe test-account workflow with mutation boundaries and cleanup rules before feature changes. | `qa/member-workflow-test-account-matrix` | P0 |
| Gallery/media architecture | 4 | Medium | Static Gallery has 73 items, thumbnails, full-image lightbox, sort/filter controls, and public approved feed integration. | Required smoke checks only first static lightbox item; Home Gallery spotlight is static-data based while Gallery can include approved member submissions. | Add a Gallery matrix for approved feed, local fallback, sort, category URL state, lightbox, signed URL safety, and Home spotlight expectations. | `qa/gallery-approved-feed-regression-matrix` | P1 |
| Maintainability and code organization | 3 | Medium | Plain JS/page scripts are understandable and dependency-free. | `styles.css`, `supabase.js`, and `site.js` carry broad responsibilities; validation scripts are useful but partial. | Produce a refactor-readiness manifest before splitting code or CSS. | `docs/current-state-validation-manifest` | P2 |
| Validation and test coverage | 3 | Medium | `npm run check`, production check, local Gallery smoke, refs/assets/JS/JSON checks, and CI workflow exist. | `check-all.mjs` does not include production smoke, Gallery browser smoke, Edge Function checks, route matrix, axe, or secret scan. | Decide which checks stay local/manual versus required CI, then add narrowly. | `qa/validation-gap-matrix` | P1 |
| Content/data governance | 3 | Medium | Content lives in JSON with guides and protected copy boundaries. JSON syntax validation passes. | Syntax checks do not catch copy quality drift, e.g. current Home copy has small grammar/spacing issues outside protected seal text. | Add schema/readability/content-guide review for non-protected JSON fields. | `qa/content-schema-and-style-guardrails` | P1 |
| Operations and runbooks | 4 | Medium | Supabase README and member Gallery moderation runbook exist; deployment boundaries are documented. | Dashboard-only checks and live test-account flows remain operator-dependent. | Add an operator checklist for safe member workflow production testing and cleanup. | `docs/member-workflow-production-qa-runbook` | P1 |
| Deployment and production resilience | 4 | Medium | GitHub Actions run static validation; production smoke runs manually/scheduled; GitHub Pages docs align with static branch publishing. | No automatic post-merge full public route/member signed-out smoke; production smoke covers only a small page set. | Extend production smoke coverage in a QA branch after deciding acceptable runtime cost. | `qa/production-smoke-coverage-expansion` | P2 |

## 5. Weakest Points

### 1. Supabase validation gaps sit outside the normal required checks

What it is: the normal `npm run check` path validates JS syntax, JSON, Gallery timestamps, local refs, and assets, but it does not type/load-check Edge Functions, inspect migrations, scan for security-sensitive function patterns, validate deployed function parity, or run public Supabase probes.

Where it appears: `scripts/check-all.mjs`, `scripts/check-production.mjs`, `supabase/config.toml`, `supabase/functions/**`, `supabase/migrations/**`, and prior reports such as `reports/supabase-production-security-review.md` and `reports/supabase-edge-functions-review.md`.

Why it matters: Supabase is the only part of the site that can affect private member data, private Storage, moderation state, and production auth behavior. Supabase guidance expects RLS on exposed tables, careful grants, correct Edge Function auth modes, and protected service credentials.

Source/best-practice basis: Supabase RLS, Storage access-control, and Edge Function auth guidance.

Severity: High. Effort: Medium. Risk: Medium.

Recommended branch: `qa/supabase-ci-and-parity-review`

Expected files: report first under `reports/`; later follow-up may touch `scripts/`, `.github/workflows/`, `supabase/README.md`, or Supabase source only after explicit approval.

Files that must not change: protected data fields, data files in report-only mode, CSS, JS behavior, assets, migrations, Supabase config, and workflows unless a later branch explicitly widens scope.

Validation gate: `npm run check`, `git diff --check`, individual JSON/JS/ref/asset checks, `npm run check:production`, `npm run smoke:gallery`, read-only public probes, no Supabase mutation, no function deploy.

Definition of done: a source-grounded validation matrix names which Supabase checks are required, optional, dashboard-only, or blocked; no secrets or signed URLs are recorded.

### 2. Live member workflow positive paths remain credential-gated

What it is: signed-out and mocked states are well covered, but live production OAuth, Discord verification, profile save, upload, approval/rejection, and cleanup require approved test accounts and explicit mutation boundaries.

Where it appears: `auth.html`, `account.html`, `gallery-submit.html`, `leader-dashboard.html`, `auth.js`, `account.js`, `gallery-submit.js`, `leader-dashboard.js`, `supabase.js`, and reports such as `reports/post-goal-cross-site-regression-review.md` and `reports/account-member-dashboard-review.md`.

Why it matters: the member journey is now a real workflow. If it fails, users may be stuck between Discord verification, upload eligibility, submission status, and moderator decisions.

Source/best-practice basis: NN/g visibility of system status and error-prevention heuristics; Supabase Auth and Edge Function auth boundaries.

Severity: High. Effort: Medium. Risk: High because live testing may mutate data if not scoped.

Recommended branch: `qa/member-workflow-test-account-matrix`

Expected files: report/runbook first; optional test scripts only after scope approval.

Files that must not change: protected data fields, production data outside approved test records, Supabase config/migrations/functions.

Validation gate: approved test accounts, mutation/cleanup checklist, screenshots or logs without tokens, all standard validation commands.

Definition of done: each member role state has a pass/fail table with exact account prerequisites, actions taken, cleanup status, and remaining blocked checks.

### 3. Gallery approved-feed behavior is stronger than the required smoke coverage

What it is: `gallery.js` merges static Gallery data with approved member submissions in production, while the required smoke test currently checks the first static lightbox item only. Home Gallery spotlight continues to use static Gallery data, so the relationship between Home spotlight and approved member submissions should be explicitly decided.

Where it appears: `gallery.js`, `home.js`, `scripts/smoke-gallery-lightbox.mjs`, `supabase/functions/list-approved-gallery-submissions/index.ts`, and `supabase/README.md`.

Why it matters: Gallery is a high-visibility media surface and now depends on private Storage, signed URLs, public Edge Function behavior, local fallback, randomization, sort order, and category URL state.

Source/best-practice basis: web.dev performance guidance for media-heavy experiences; NN/g consistency and system-status heuristics; Supabase public function and signed URL boundaries.

Severity: Medium-High. Effort: Medium. Risk: Medium.

Recommended branch: `qa/gallery-approved-feed-regression-matrix`

Expected files: report first; later likely `scripts/` if approved.

Files that must not change: Gallery data, protected data, CSS/JS behavior in the report phase, private Storage objects.

Validation gate: static-only, approved-feed success, approved-feed failure, sort/category URL, lightbox full-image, no private path leak, and Home spotlight expectation checks.

Definition of done: the matrix states what is guaranteed by required validation and what remains manual/operator-only.

### 4. Content governance catches syntax, not house-style or readability drift

What it is: JSON checks confirm syntax, but they do not catch copy issues, house-style drift, missing spaces, stale status wording, or accidental awkward phrasing outside protected fields.

Where it appears: `data/home.json`, `gallery-submit.js`, `docs/content-guide.md`, and page-specific guides.

Why it matters: this is a public guild site where clear, warm, human copy is part of trust and usability. Small copy issues can make current workflows look unfinished even when the code works.

Source/best-practice basis: WCAG understandability principles, Google people-first content guidance, and explicit repository content guides.

Severity: Medium. Effort: Low-Medium. Risk: Low if report-first.

Recommended branch: `qa/content-schema-and-style-guardrails`

Expected files: report first; later optional schema/readability script after approval.

Files that must not change: protected recruitment body, recruitment conclusion, guild seal poem, Twills profile bio.

Validation gate: `node scripts/check-json.mjs`, protected diff checks, page rendering smoke, and human review for flagged copy.

Definition of done: a checklist identifies which JSON fields are protected, which are editable, and which copy checks can be automated safely.

### 5. Accessibility proof is mostly structural, not WCAG-complete

What it is: route smokes confirm one `h1`, no overflow, shell rendering, and signed-out gates, but required validation does not run axe, label-in-name checks, full keyboard flows, focus management, or live-region/status-message checks across member workflows.

Where it appears: shared `header.html`, `footer.html`, `site.js`, `account.html`, `gallery-submit.html`, `leader-dashboard.html`, `gallery.js`, and `account.js`.

Why it matters: member pages include forms, auth state, status messages, modals/lightboxes, and controls where keyboard and screen-reader behavior must remain clear.

Source/best-practice basis: WCAG 2.2 perceivable, operable, understandable, robust principles; specific relevance to headings/labels, focus visible/order, label in name, name/role/value, and status messages.

Severity: Medium. Effort: Medium. Risk: Low-Medium.

Recommended branch: `qa/accessibility-name-and-member-pages-review`

Expected files: report first; optional smoke script after approval.

Files that must not change: protected content, data, CSS/JS behavior in the report phase.

Validation gate: axe/manual keyboard matrix, lightbox focus, auth/account/upload/moderation status messages, standard validation commands.

Definition of done: findings are ranked with exact selectors, affected pages, WCAG basis, and safe follow-up branches.

### 6. Performance readiness lacks a current measured baseline

What it is: the site is static and asset-conscious, but Core Web Vitals readiness is not part of the required validation ladder. There is an optional Lighthouse workflow, a 34 MB asset tree, a 132 KB global stylesheet, and member pages that rely on external Supabase scripts.

Where it appears: `.github/workflows/manual-lighthouse.yml`, `styles.css`, `supabase.js`, assets under `assets/`, and `scripts/check-assets.mjs`.

Why it matters: visual polish and media growth can slowly harm LCP, CLS, and interaction readiness if there is no periodic baseline.

Source/best-practice basis: web.dev Core Web Vitals guidance.

Severity: Medium. Effort: Medium. Risk: Low.

Recommended branch: `qa/core-web-vitals-current-baseline`

Expected files: report and optional small screenshots/traces if approved.

Files that must not change: implementation files during baseline.

Validation gate: Lighthouse/manual CWV snapshots for public pages and member pages, plus standard validation.

Definition of done: baseline metrics are recorded with top candidate improvements and no premature optimization patch.

### 7. Shared JS and CSS have high change blast radius

What it is: the site keeps a simple no-framework architecture, but shared files are now broad: `styles.css` has 4,872 lines, `supabase.js` has 929 lines, and `site.js` has 571 lines.

Where it appears: `styles.css`, `site.js`, `supabase.js`, and page scripts.

Why it matters: large shared files make small visual/member changes harder to reason about and increase regression risk for unrelated pages.

Source/best-practice basis: engineering maintainability rationale; NN/g consistency/stability implications for user-facing regressions.

Severity: Medium. Effort: Medium-High. Risk: Medium if changed directly.

Recommended branch: `docs/current-state-validation-manifest`

Expected files: docs/report first.

Files that must not change: CSS/JS behavior before a manifest and test plan exist.

Validation gate: source inventory, ownership map, route matrix, existing validation commands.

Definition of done: a refactor map exists with safe ownership boundaries and clear rollback points.

### 8. Moderation audit writes should be reviewed before future moderation expansion

What it is: `moderate-gallery-submission` updates a pending submission and then inserts a moderation event. If future behavior expands, audit integrity would benefit from a transaction/RPC review.

Where it appears: `supabase/functions/moderate-gallery-submission/index.ts` and `supabase/migrations/20260513195853_create_gallery_moderation_events.sql`.

Why it matters: moderation history is operational evidence. Audit trails should be hard to partially write or lose.

Source/best-practice basis: engineering reliability rationale plus Supabase guidance to keep privileged database work carefully scoped server-side.

Severity: Medium. Effort: Medium. Risk: Medium because it touches database behavior if implemented.

Recommended branch: `qa/moderation-audit-integrity-review`

Expected files: report first; implementation would require explicit migration/function approval later.

Files that must not change: Supabase migrations/functions in the report phase.

Validation gate: source review, test-account plan, no unauthorized `supabase db push`, no Edge Function deployment.

Definition of done: clear decision whether current behavior is acceptable or a future transactional RPC is warranted.

## 6. Improvement Roadmap

### Immediate P0/P1 hardening

| Priority | Branch | Goal | Why now | Source or rationale | Likely files | Validation | Risk | Mode |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P0 | `qa/supabase-ci-and-parity-review` | Inventory missing Supabase validation and safe parity checks. | Supabase holds the highest-impact privacy and workflow boundary. | Supabase RLS, Storage, Edge Function auth docs. | `reports/`; later maybe `scripts/`, `.github/workflows/`, `supabase/README.md`. | Standard checks, read-only probes, no mutation/deploy. | Medium | QA-only |
| P0 | `qa/member-workflow-test-account-matrix` | Define live member/moderator test-account coverage. | Current proof is strong for signed-out/mocked states, weak for live positive paths. | NN/g status/error prevention; Supabase Auth. | `reports/`, possible runbook. | Approved accounts, cleanup plan, standard checks. | High | QA-only |
| P1 | `qa/moderation-audit-integrity-review` | Review moderation update/audit-event atomicity. | Moderation history should remain reliable before workflow expansion. | Engineering reliability; privileged Supabase operation boundary. | `reports/`; later migration/function only if approved. | Report-only, no db push/deploy. | Medium | QA-only |
| P1 | `docs/member-workflow-production-qa-runbook` | Document operator-safe live QA and cleanup boundaries. | Dashboard/test-account checks are currently tribal knowledge. | Operations runbook rationale; no-secret safety. | `docs/` or `reports/`. | Links/ref checks, no secrets. | Low | docs |

### UX/member workflow improvements

| Priority | Branch | Goal | Why now | Source or rationale | Likely files | Validation | Risk | Mode |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | `qa/member-workflow-copy-and-status-review` | Review Account, upload, verification, and moderation status text. | Upload success copy still references a future approval workflow. | NN/g visibility of system status and recovery. | `reports/`; later `gallery-submit.js`, `account.js`, `leader-dashboard.js`. | Browser state matrix, standard checks. | Low-Medium | QA-only first |
| P2 | `feature/member-status-clarity-polish` | Improve verified/member/moderator status explanations after QA. | Makes member self-service less confusing. | UX rationale from prior QA findings. | `account.html`, `account.js`, `gallery-submit.html`. | Mocked and signed-out member smoke, standard checks. | Medium | feature |

### Gallery/media improvements

| Priority | Branch | Goal | Why now | Source or rationale | Likely files | Validation | Risk | Mode |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | `qa/gallery-approved-feed-regression-matrix` | Expand Gallery proof for approved feed, fallback, sort, categories, signed URLs, and Home spotlight expectations. | Gallery behavior now spans static JSON, Edge Functions, and private Storage. | Supabase public function boundary; web.dev media performance; NN/g consistency. | `reports/`; later `scripts/smoke-gallery-lightbox.mjs` or new smoke script. | Static/feed success/failure matrix and standard checks. | Medium | QA-only first |
| P2 | `feature/home-gallery-approved-feed-decision` | Decide whether Home spotlight should stay static-only or include approved member submissions. | Current behavior may be intentional but should be explicit. | Product consistency rationale. | `reports/`; later `home.js`, `docs/home-shell-guide.md`. | Home + Gallery smoke, production check. | Medium | report-only first |
| P2 | `qa/member-gallery-storage-cost-review` | Review approved-feed signed URL count, upload limit, and cleanup/cost posture. | Public feed can create signed URLs and uploads allow up to 50 MB. | Supabase Storage access-control and operational cost rationale. | `reports/`, Supabase docs. | Read-only checks, no cleanup mutation unless later approved. | Medium | QA-only |

### Accessibility/performance/SEO improvements

| Priority | Branch | Goal | Why now | Source or rationale | Likely files | Validation | Risk | Mode |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | `qa/accessibility-name-and-member-pages-review` | Run WCAG-focused review for names, labels, keyboard, focus, status messages, and lightbox behavior. | Current checks are structural, not WCAG-complete. | WCAG 2.2. | `reports/`; optional smoke script later. | axe/manual keyboard matrix and standard checks. | Low-Medium | QA-only |
| P1 | `qa/core-web-vitals-current-baseline` | Capture current Lighthouse/CWV baseline across public and member pages. | Avoid optimizing without current measurements. | web.dev Core Web Vitals. | `reports/`; optional evidence screenshots/traces. | Lighthouse/manual CWV, standard checks. | Low | QA-only |
| P2 | `qa/public-metadata-coverage-review` | Check metadata/canonical/social previews across all public pages. | Production check covers only a subset. | Google Search Central. | `reports/`; later `scripts/check-production.mjs`. | Production metadata matrix, standard checks. | Low | QA-only |

### Maintainability improvements

| Priority | Branch | Goal | Why now | Source or rationale | Likely files | Validation | Risk | Mode |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | `qa/content-schema-and-style-guardrails` | Define safe content/schema/readability checks for non-protected JSON fields. | Syntax checks do not catch house-style drift. | WCAG understandability; repo content guides. | `reports/`; later `scripts/`, docs. | JSON checks, protected diffs, standard checks. | Low | QA-only first |
| P2 | `docs/current-state-validation-manifest` | Map pages, scripts, data owners, protected fields, and required checks. | Reduces risk before splitting shared CSS/JS. | Engineering maintainability. | `docs/` or `reports/`. | Ref/link checks and standard validation. | Low | docs |
| P2 | `refactor/shared-script-boundary-plan` | Plan safe future split of `supabase.js` and `site.js` responsibilities. | Shared files are now broad. | Maintainability rationale. | `reports/`; implementation later. | Report-only first. | Medium | report-only |

### Future polish

| Priority | Branch | Goal | Why now | Source or rationale | Likely files | Validation | Risk | Mode |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P3 | `feature/progressive-enhancement-member-pages` | Improve signed-out/member page progressive enhancement and fallback states. | Helpful after security and workflow QA are locked. | Accessibility/usability rationale. | Member pages and scripts. | Member workflow matrix, standard checks. | Medium | feature |
| P3 | `feature/visual-motion-polish-pass` | Add restrained polish once accessibility/performance baselines exist. | Avoids decoration before measured stability. | WCAG motion/focus considerations; visual consistency. | `styles.css`, page scripts. | Lighthouse, accessibility, route smoke. | Medium | feature |
| P3 | `docs/privacy-safe-analytics-options` | Brainstorm optional privacy-safe analytics without implementation. | Useful only after core workflows are stable. | Operational/product rationale. | `reports/` or `docs/`. | Report-only, no tracking code. | Low | docs |

## 7. Recommended Next 5 Branches

| Priority | Branch | Type | Goal | Why now | Risk | Gate before merge |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `qa/supabase-ci-and-parity-review` | qa | Inventory and prove safe Supabase validation gaps. | Highest privacy/workflow boundary with the most manual proof. | Medium | Report-only, read-only probes, no db push, no function deploy, standard validation. |
| 2 | `qa/member-workflow-test-account-matrix` | qa | Define live OAuth/profile/upload/moderation positive-path QA with cleanup. | Signed-out/mocked coverage is not enough for member workflows. | High | Approved test accounts, explicit mutation cleanup, no secrets recorded. |
| 3 | `qa/gallery-approved-feed-regression-matrix` | qa | Prove static Gallery plus approved feed behavior across fallback, sort, categories, and Home expectations. | Gallery combines public pages, private Storage, and signed URLs. | Medium | Static/feed success/failure matrix, no private path leak, standard validation. |
| 4 | `qa/accessibility-name-and-member-pages-review` | qa | Run WCAG-focused accessibility review for names, keyboard, focus, status messages, and lightbox/member flows. | Current checks are structural but not WCAG-complete. | Low-Medium | axe/manual matrix, no protected-content changes, standard validation. |
| 5 | `qa/content-schema-and-style-guardrails` | qa | Define safe checks for JSON schema, protected fields, and house-style drift. | Content quality can regress while syntax still passes. | Low | Protected diffs, JSON checks, report-only first. |

## 8. Guardrails

Protected content:

- Do not alter `data/home.json` `seal.verse`.
- Do not alter `data/recruitment.json` `content.paragraphs`.
- Do not alter `data/recruitment.json` `content.conclusion`.
- Do not alter `data/twills.json` `profile.bio`.

Supabase safety:

- Do not run `supabase db push` without explicit approval.
- Do not deploy Edge Functions without explicit approval.
- Do not create migrations during report-only or QA-only review branches.
- Do not print or commit secrets, signed URLs, bearer tokens, refresh tokens, database URLs, Discord tokens, or dashboard secret values.
- Keep public approved-feed checks sanitized to counts, metadata shape, TTL, status, and exposure mode.

Validation requirements:

- `npm run check`
- `git diff --check`
- `node scripts/check-json.mjs`
- `node scripts/check-js.mjs`
- `node scripts/check-refs.mjs`
- `node scripts/check-assets.mjs`
- `npm run check:production`
- `npm run smoke:gallery` with a local server or explicit `SMOKE_BASE_URL`
- Task-specific browser, accessibility, Supabase, or Gallery smoke checks when the branch touches those areas

## 9. Conclusion

The best next branch is `qa/supabase-ci-and-parity-review`. It is the highest-value starting point because it does not require implementation, can stay mutation-free, and clarifies the validation boundary around the site's most sensitive systems: member identity, private Storage, approved Gallery publishing, moderation, and Edge Functions. After that, the live member test-account matrix and Gallery approved-feed regression matrix should follow before feature work or refactors.
