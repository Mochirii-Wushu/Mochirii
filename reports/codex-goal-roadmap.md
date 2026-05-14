# Codex Goal Roadmap

Date: 2026-05-14
Branch: `docs/codex-goal-roadmap`
Mode: planning/tracker only

This roadmap is the durable tracker for future `/goal` sessions. It records the current verified site state, the remaining workstreams, the recommended order, hard scope boundaries, validation gates, merge gates, and the update protocol that should happen after every PR.

## 1. Current Verified Repo State

- Repository: Mōchirīī static guild website.
- Architecture: static HTML, handcrafted CSS, vanilla JavaScript, JSON content, GitHub Pages hosting, no framework or build step.
- Current base branch: `main`.
- Verified base commit: `e566081dc932216d29b45036c3c513a56ab3574e`.
- Latest merged PR on base at inspection time: PR #107, `qa/join-discord-widget-review`.
- Latest Join Discord widget baseline tag: `v2.5.0-join-discord-widget-baseline`, peeled to `e566081dc932216d29b45036c3c513a56ab3574e`.
- Package scripts available: `npm run check`, `npm run check:assets`, `npm run check:gallery-timestamps`, `npm run check:js`, `npm run check:json`, `npm run check:refs`, `npm run check:production`, and `npm run smoke:gallery`.
- Validation before this branch: `npm run check`, `git diff --check`, `npm run check:production`, and `npm run smoke:gallery` passed. The only expected warning was the restored large MP3 asset.
- Public sitemap includes Home, Join, Events, Gallery, Auth, Account, Gallery Submit, Ranks, Leaders, Codex, Recruitment, Announcements, Raffles, Spotify, Spotlight, and Twills.
- Supabase runtime remains browser-safe through `supabase.js` and `window.MochiriiSupabase`.
- Auth/member pages are static pages using Supabase JS v2 from CDN followed by `supabase.js`, `site.js`, and page-local scripts.
- Edge Functions are present under `supabase/functions/` for Discord member verification, moderation queue listing, moderation actions, and approved gallery feed listing.
- No files outside this report are changed by this branch.

## 2. Completed Baselines And Features

- Static site baseline and page-by-page content baselines are tagged through the v1.x and v2.x series.
- Cross-site visual QA and baseline tagging are complete.
- Gallery sorting, randomization, spotlight rotation, approved feed, member account polish, and Discord integration hub work have prior reports and tags.
- Discord widget relocation is complete: Home widget removed, Join widget added inside the Quick Start card after `#joinLinks`.
- Join Discord widget QA is complete in `reports/join-discord-widget-review.md`.
- The stable Join Discord widget baseline tag exists: `v2.5.0-join-discord-widget-baseline`.

## 3. Known Warnings And Non-Blocking Notes

- `assets/audio/mochiriiiiii.mp3` intentionally exceeds the normal asset-size threshold because the original audio quality was restored.
- GitHub-managed Pages may continue to emit a Node.js 20 annotation outside repo-controlled workflow files.
- Discord iframe content can be affected by third-party network or Discord-side blocking; layout and markup stability are the site-owned responsibility.
- Discord/Twitter-like social preview caches require manual app-side checks when preview freshness matters.
- Supabase production checks may require credentials or dashboard access that are intentionally not committed.

## 4. Protected Content

Never change these in a goal branch unless the user explicitly opens that exact content scope:

- `data/home.json` `seal.verse`
- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`
- `data/twills.json` `profile.bio`
- Existing Gallery captions unless the branch is explicitly a Gallery content branch
- Existing Join copy/checklist unless the branch is explicitly a Join content branch
- Existing Events, Announcements, Raffles, Spotlight, Ranks, Leaders, and Codex prose unless that page's content scope is explicitly opened

## 5. Codex Goal Config Inspection

- `~/.codex/config.toml` exists.
- `.codex/config.toml` does not exist in this repository.
- Installed CLI: `codex-cli 0.125.0`.
- The user-level config already contains:

```toml
[features]
memories = true
terminal_resize_reflow = true
goals = true
prevent_idle_sleep = true
```

- `codex --help` documents generic feature overrides through `--enable <FEATURE>`, equivalent to `-c features.<name>=true`.
- `codex features list` did not enumerate `goals` as a known feature entry in this installed CLI.
- No project-scoped Codex config was added because the repo does not already use `.codex/config.toml`, and the installed CLI's known-feature list did not expose a documented project-level `/goal` key beyond the existing user config.
- Future sessions should invoke `/goal` manually and use this report as the durable tracker until the installed CLI/schema exposes a clearly documented project config key.

## 6. Recommended Order

Run the workstreams in this order unless a production incident changes priority:

1. G01 `qa/supabase-production-security-review`
2. G02 `qa/supabase-edge-functions-review`
3. G03 `qa/member-gallery-upload-limit-review`
4. G04 `qa/member-gallery-end-to-end-review`
5. G05 `qa/account-member-dashboard-review`
6. G06 `qa/gallery-approved-feed-integration-review`
7. G07 `qa/gallery-behavior-matrix-suite`
8. G08 `docs/member-gallery-moderation-runbook`
9. G09 `qa/production-member-workflow-smoke`
10. G10 `qa/secrets-and-public-config-review`
11. G11 `chore/document-large-audio-exception`
12. G12 `qa/seo-social-preview-member-pages-review`
13. G13 `docs/supabase-cost-usage-runbook`
14. G14 `docs/member-gallery-cleanup-plan`
15. G15 `qa/post-goal-cross-site-regression-review`

## 7. Common Gates For Every Goal Session

- Start from clean `main`.
- Run `git pull --ff-only origin main`.
- Stop if unexpected dirty or untracked files exist.
- Create exactly one scoped branch per goal.
- Inspect before editing.
- Prefer report-only for QA branches.
- Fix only confirmed regressions inside the goal's allowed files.
- Keep static GitHub Pages architecture intact.
- Do not run `supabase db push` unless that exact goal explicitly allows a mutating production database operation.
- Do not deploy Edge Functions unless that exact goal explicitly allows a production deployment.
- Do not commit secrets.
- Verify `git diff -- data/` when protected content could be touched.
- Run `npm run check`, `git diff --check`, `npm run check:production`, and task-specific smoke checks before PR.
- Run `npm run smoke:gallery` whenever Gallery, shared shell, Supabase runtime, page routes, or cross-site behavior might regress. Start `python3 -m http.server 8765 --bind 127.0.0.1` first.

## 8. Goal Items

### G01 - Supabase Production Security Review

- ID: G01
- Title: Supabase production security review
- Why it exists: Confirm the deployed Supabase project still fails closed for public clients, keeps private member-gallery Storage private, and exposes only intended browser-safe behavior before deeper member workflow QA.
- Priority: P0
- Dependencies: Clean `main`, PR #107 merged, `v2.5.0-join-discord-widget-baseline` tag present.
- Branch: `qa/supabase-production-security-review`
- Scope: Read-only security review of public config, RLS expectations, Storage privacy, Auth redirect assumptions, public anon behavior, and signed-out browsing. Use dashboard/MCP/CLI only when credentials are available and read-only.
- Allowed files: `reports/supabase-production-security-review.md`; only add a narrow follow-up report if credentials are missing.
- Forbidden files: `data/**`, `styles.css`, site HTML/JS, `supabase/migrations/**`, `supabase/functions/**`, `.env*`, workflow files, validation scripts.
- Validation: `npm run check`; `git diff --check`; `node scripts/check-json.mjs`; `node scripts/check-js.mjs`; `node scripts/check-refs.mjs`; `node scripts/check-assets.mjs`; `npm run check:production`; `npm run smoke:gallery`; read-only Supabase checks if authenticated access exists; secret scan.
- Definition of done: Report states which production access paths were checked, which were blocked by missing credentials, whether anon/service-role boundaries look safe, and whether any follow-up implementation branch is required.
- Merge gate: No data diffs, no secrets, no mutating Supabase commands, validation passes, and any unresolved production security concern is clearly called out.
- Status: Complete. Branch: `qa/supabase-production-security-review`. Report: `reports/supabase-production-security-review.md`. PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/109>. Merge commit: `99f49fad255b7fd9eadfeadd0ba175f8a9bc75e4`. Validation summary: `npm run check`, `git diff --check`, `node scripts/check-json.mjs`, `node scripts/check-js.mjs`, `node scripts/check-refs.mjs`, `node scripts/check-assets.mjs`, `npm run check:production`, `npm run smoke:gallery`, read-only public Supabase probes, signed-out browser smoke, secret scan, protected-data diff checks, and post-merge validation passed. Blockers: no P0 public blocker found; dashboard-only checks require authenticated Supabase access and are documented in the report. Next recommended item: G02 `qa/supabase-edge-functions-review`.

### G02 - Supabase Edge Functions Review

- ID: G02
- Title: Supabase Edge Functions review
- Why it exists: The current member workflows depend on Edge Functions for Discord role verification, moderation, and approved feed access; they need a focused fail-closed review before broader workflow smoke.
- Priority: P0
- Dependencies: G01 complete or explicitly deferred.
- Branch: `qa/supabase-edge-functions-review`
- Scope: Review `verify-discord-member`, `list-gallery-review-queue`, `moderate-gallery-submission`, `list-approved-gallery-submissions`, shared helpers, CORS, auth requirements, method handling, secret handling, error messages, and deployment config.
- Allowed files: `reports/supabase-edge-functions-review.md`; `supabase/functions/**` only if a confirmed local code defect is fixed; `supabase/README.md` only if documentation is stale.
- Forbidden files: `data/**`, public page copy, unrelated site CSS/JS, migrations unless the review proves a schema mismatch and the user approves a separate implementation branch, `.env*`, workflow files.
- Validation: `npm run check`; `git diff --check`; `node scripts/check-js.mjs`; `npm run check:production`; `npm run smoke:gallery`; `deno check` for changed functions if Deno is available; function serve/load checks if safe; secret scan.
- Definition of done: Report confirms auth mode per function, fail-closed paths, secret boundaries, public approved-feed behavior, moderator-only behavior, and deployment status or blockers.
- Merge gate: No Edge Function deployment unless separately approved; no database mutation; validation passes; any code fix is narrow and function-scoped.
- Status: Complete. Branch: `qa/supabase-edge-functions-review`. Report: `reports/supabase-edge-functions-review.md`. PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/111>. Merge commit: `b487e323751b812492d8e0d330f640dcb0cd23d6`. Validation summary: `npm run check`, `git diff --check`, `node scripts/check-json.mjs`, `node scripts/check-js.mjs`, `node scripts/check-refs.mjs`, `node scripts/check-assets.mjs`, `npm run check:production`, `npm run smoke:gallery`, local config/source inspection, read-only deployment list, public function probes, secret scan, protected-data diff checks, and post-merge validation passed. Blockers: none found; `deno` is not installed and no function source changed. Next recommended item: G03 `qa/member-gallery-upload-limit-review`.

### G03 - Member Gallery Upload Limit Review

- ID: G03
- Title: Member gallery upload limit review
- Why it exists: The upload limit is 50 MB across browser checks, database constraints, and Storage bucket settings; drift would create confusing upload failures.
- Priority: P1
- Dependencies: G01 and G02 should be complete or explicitly deferred.
- Branch: `qa/member-gallery-upload-limit-review`
- Scope: Verify 50 MB limit alignment in `supabase.js`, `gallery-submit.html`, `gallery-submit.js`, migrations, bucket docs, and reports. Confirm accepted MIME types remain JPEG, PNG, and WebP.
- Allowed files: `reports/member-gallery-upload-limit-review.md`; `gallery-submit.html`, `gallery-submit.js`, `supabase.js`, `supabase/README.md`, or migration follow-up report only if confirmed drift exists and the user approves the fix scope.
- Forbidden files: protected data, Gallery static captions/images, unrelated CSS, unrelated Supabase functions, secrets, workflow files.
- Validation: `npm run check`; `git diff --check`; `node --check gallery-submit.js`; `node --check supabase.js` if touched; `npm run check:production`; `npm run smoke:gallery`; optional local mock upload gate test; secret scan if Supabase docs change.
- Definition of done: Report states the effective browser, database, and Storage limits; MIME type alignment; expected failure messages; and whether production bucket settings need manual confirmation.
- Merge gate: No hidden limit change; no data changes; no Supabase mutation unless a separate approved branch handles it.
- Status: Complete. Branch: `qa/member-gallery-upload-limit-review`. Report: `reports/member-gallery-upload-limit-review.md`. PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/113>. Merge commit: `31bdf4c307b676447ad41d4d3a44368994cefb56`. Validation summary: `npm run check`, `git diff --check`, `node --check gallery-submit.js`, `node --check supabase.js`, `node scripts/check-json.mjs`, `node scripts/check-js.mjs`, `node scripts/check-refs.mjs`, `node scripts/check-assets.mjs`, `npm run check:production`, `npm run smoke:gallery`, source scan, migration review, README review, prior report drift scan, read-only production SQL for Storage bucket and constraints, local browser smoke, protected-data diff checks, and post-merge validation passed. Blockers: none found. Next recommended item: G04 `qa/member-gallery-end-to-end-review`.

### G04 - Member Gallery End-To-End Review

- ID: G04
- Title: Member gallery end-to-end review
- Why it exists: Member gallery flow crosses sign-in, Discord verification, profile state, upload, moderation, approval, and public Gallery feed; the full path needs one integrated QA pass.
- Priority: P1
- Dependencies: G01, G02, and G03 complete or explicitly deferred.
- Branch: `qa/member-gallery-end-to-end-review`
- Scope: End-to-end QA of `auth.html`, `account.html`, `gallery-submit.html`, `leader-dashboard.html`, `gallery.html`, and related JS helpers. Prefer mocked browser states when live credentials are unavailable.
- Allowed files: `reports/member-gallery-end-to-end-review.md`; narrow fixes in `auth.js`, `account.js`, `gallery-submit.js`, `leader-dashboard.js`, `gallery.js`, `supabase.js`, or corresponding HTML only for confirmed regressions.
- Forbidden files: `data/**`, public Gallery images/captions, protected copy, migrations, Edge Function deployments, workflow files, dependencies.
- Validation: `npm run check`; `git diff --check`; `node --check` for any touched JS; `npm run check:production`; `npm run smoke:gallery`; browser smoke for signed-out, signed-in-mocked, denied, eligible, pending, approved, rejected, and error states where feasible.
- Definition of done: Report documents each state, the evidence collected, limitations from missing live credentials, and the exact follow-up branch for any blocker.
- Merge gate: No broad behavior changes; no unreviewed upload or moderation permission changes; validation passes.
- Status: In review on `qa/member-gallery-end-to-end-review`. Report: `reports/member-gallery-end-to-end-review.md`. PR: pending. Merge commit: pending. Validation summary: member workflow source inspection, mocked browser state matrix, upload success regression repro/fix proof, `npm run check`, `git diff --check`, workflow `node --check`, JSON/JS/ref/asset checks, `npm run check:production`, `npm run smoke:gallery`, and protected-data diff checks passed. Blockers: no approved live test account/session available, so positive live upload/moderation remains deferred to G09 or an approved test-account workflow. Next recommended item: G05 `qa/account-member-dashboard-review`.

### G05 - Account Member Dashboard Review

- ID: G05
- Title: Account member dashboard review
- Why it exists: Account is the member-facing control surface for profile, verification, upload eligibility, submission summaries, and moderator link visibility.
- Priority: P1
- Dependencies: G04 preferred; can run after G02 if account-only QA is urgent.
- Branch: `qa/account-member-dashboard-review`
- Scope: Review Account signed-out state, signed-in overview, profile form payload ordering, profile completeness, verification CTA, upload guidance, submission summaries, and Leader Dashboard link gating.
- Allowed files: `reports/account-member-dashboard-review.md`; `account.html`, `account.js`, `styles.css`, `supabase.js` only for confirmed account regressions.
- Forbidden files: data files, migrations, Edge Functions, Gallery images, unrelated pages, docs except the report.
- Validation: `npm run check`; `git diff --check`; `node --check account.js`; `node --check supabase.js` if touched; `npm run check:production`; `npm run smoke:gallery`; focused mocked Account browser smoke.
- Definition of done: Report confirms Account states, accessible status/error messaging, safe profile fields, and no private Storage URL exposure.
- Merge gate: Account remains browser-safe and signed-out-safe; no data/protected content changes; validation passes.
- Status: Not started.

### G06 - Gallery Approved Feed Integration Review

- ID: G06
- Title: Gallery approved feed integration review
- Why it exists: Public Gallery now can merge static Gallery JSON with approved member submissions from a public-safe Edge Function; this needs focused feed behavior QA.
- Priority: P1
- Dependencies: G02 and G04 preferred.
- Branch: `qa/gallery-approved-feed-integration-review`
- Scope: Review `gallery.js`, approved feed loading, `approvedFeed` URL behavior, fallback on Edge Function failure, signed URL handling, item normalization, lightbox behavior, and static Gallery preservation.
- Allowed files: `reports/gallery-approved-feed-integration-review.md`; `gallery.js`, `styles.css`, `supabase.js` only for confirmed feed regressions.
- Forbidden files: `data/gallery.json` unless the branch is explicitly reopened as Gallery content; Gallery image assets; migrations; Edge Function deployment; protected data.
- Validation: `npm run check`; `git diff --check`; `node --check gallery.js`; `node --check supabase.js` if touched; `npm run check:production`; `npm run smoke:gallery`; browser smoke for static-only and approved-feed failure states.
- Definition of done: Report confirms static gallery still works, approved feed fails gracefully, signed URLs are not persisted into data files, and lightbox opens full images.
- Merge gate: Gallery smoke passes; no caption/image/data changes; no public leak of private Storage paths beyond intended short-lived signed URLs.
- Status: Not started.

### G07 - Gallery Behavior Matrix Suite

- ID: G07
- Title: Gallery behavior matrix suite
- Why it exists: Gallery behavior now includes static images, randomization, timestamp sorting, category URL state, copy links, approved feed, and lightbox behavior; future changes need a repeatable matrix.
- Priority: P1
- Dependencies: G06 complete.
- Branch: `qa/gallery-behavior-matrix-suite`
- Scope: Build or document a dependency-free Gallery behavior matrix that covers filters, sort modes, URL state, copy link, lightbox, thumbnails vs full images, approved feed fallback, keyboard behavior, and no-overflow checks.
- Allowed files: `reports/gallery-behavior-matrix-suite.md`; optional future `scripts/` test file and `package.json` script only if the goal explicitly approves adding a dependency-free validation entrypoint.
- Forbidden files: data files, assets, Supabase files, protected copy, workflows, dependencies.
- Validation: `npm run check`; `git diff --check`; `node scripts/check-json.mjs`; `node scripts/check-js.mjs`; `node scripts/check-refs.mjs`; `node scripts/check-assets.mjs`; `npm run check:production`; `npm run smoke:gallery`; any new script if approved.
- Definition of done: Matrix exists with clear expected behavior and pass/fail evidence, and any automated script is dependency-free and documented.
- Merge gate: No broad Gallery redesign; no data or image churn; smoke remains green.
- Status: Not started.

### G08 - Member Gallery Moderation Runbook

- ID: G08
- Title: Member gallery moderation runbook
- Why it exists: Leaders need an operational guide for pending submissions, approvals, rejections, reason text, moderator role assumptions, and what to do when functions fail.
- Priority: P2
- Dependencies: G04 and G05 preferred.
- Branch: `docs/member-gallery-moderation-runbook`
- Scope: Document moderator workflow, access prerequisites, review queues, approval/rejection expectations, audit events, common errors, escalation paths, and non-secret deployment notes.
- Allowed files: `docs/member-gallery-moderation-runbook.md`; `supabase/README.md` only for a short cross-link; `reports/member-gallery-moderation-runbook.md` if a report companion is useful.
- Forbidden files: site behavior files, data files, assets, migrations, functions, workflows, secrets.
- Validation: `npm run check`; `git diff --check`; `node scripts/check-json.mjs`; `node scripts/check-js.mjs`; `node scripts/check-refs.mjs`; `node scripts/check-assets.mjs`; `npm run check:production`; `npm run smoke:gallery` if links or shared references are changed.
- Definition of done: A leader can follow the runbook without knowing implementation details, and the guide never exposes tokens, service-role keys, private URLs, or unsafe admin shortcuts.
- Merge gate: Docs only, links resolve, no secret-like values, validation passes.
- Status: Not started.

### G09 - Production Member Workflow Smoke

- ID: G09
- Title: Production member workflow smoke
- Why it exists: Local QA does not prove the live GitHub Pages site, Supabase project, Discord Auth provider, deployed functions, and redirect URLs align.
- Priority: P1
- Dependencies: G01 through G08 preferred, or at minimum G01 and G02.
- Branch: `qa/production-member-workflow-smoke`
- Scope: Read-only and minimally mutating production smoke for Auth, Account, Gallery Submit, Leader Dashboard, Gallery approved feed, redirects, signed-out browsing, and visible error states. Use test accounts only if approved.
- Allowed files: `reports/production-member-workflow-smoke.md`; no code changes unless a confirmed production-only static-site regression is found and the user approves the fix.
- Forbidden files: data files, migrations, Edge Function deployment, secrets, workflows, broad styling or copy changes.
- Validation: `npm run check`; `git diff --check`; `npm run check:production`; `npm run smoke:gallery`; live browser checks for listed pages; redirect URL verification; secret scan if any docs are touched.
- Definition of done: Report lists exact live URLs checked, account state limitations, pass/fail result per workflow, and required manual Supabase/Discord settings if any are missing.
- Merge gate: No production mutation beyond approved test account actions; no data changes; no unresolved blocker hidden as pass.
- Status: Not started.

### G10 - Secrets And Public Config Review

- ID: G10
- Title: Secrets and public config review
- Why it exists: The repo now includes Supabase public config, function examples, reports, and deployment notes; secrets must stay out of public source.
- Priority: P0
- Dependencies: Can run any time; recommended after G09 so production smoke notes are included.
- Branch: `qa/secrets-and-public-config-review`
- Scope: Scan source, reports, docs, examples, Supabase config, function env examples, and public browser config for real secrets or unsafe private values.
- Allowed files: `reports/secrets-and-public-config-review.md`; `.env.example`, `supabase/functions/.env.example`, `supabase/README.md` only if placeholder wording needs correction.
- Forbidden files: runtime behavior files unless a secret is actually committed there and must be removed; data copy; workflows; migrations.
- Validation: `npm run check`; `git diff --check`; `node scripts/check-json.mjs`; `node scripts/check-js.mjs`; `node scripts/check-refs.mjs`; `node scripts/check-assets.mjs`; `npm run check:production`; secret scan with patterns for `sb_secret_`, `service_role`, `DISCORD_BOT_TOKEN`, `client_secret`, JWT/database URLs, webhook URLs, and accidental `.env`.
- Definition of done: Report classifies each hit as public-safe, placeholder, documentation-only, or blocker, and no real secret remains committed.
- Merge gate: Hard stop on any real secret until removed and rotated as needed; no broad refactor.
- Status: Not started.

### G11 - Document Large Audio Exception

- ID: G11
- Title: Document large audio exception
- Why it exists: The expected MP3 warning appears in repeated validation and should be documented in the durable contributor/runbook layer.
- Priority: P3
- Dependencies: None.
- Branch: `chore/document-large-audio-exception`
- Scope: Add or strengthen documentation that `assets/audio/mochiriiiiii.mp3` is intentionally above the asset warning threshold because original audio quality was restored.
- Allowed files: `docs/content-guide.md`, `reports/audio-original-restore.md`, or a new `reports/large-audio-exception.md`.
- Forbidden files: audio assets, validation scripts, workflows, data files, CSS, JS, Supabase files.
- Validation: `npm run check`; `git diff --check`; `node scripts/check-json.mjs`; `node scripts/check-js.mjs`; `node scripts/check-refs.mjs`; `node scripts/check-assets.mjs`; `npm run check:production`; `npm run smoke:gallery`.
- Definition of done: Future validation runs have a clear source-of-truth note explaining that the MP3 warning is accepted unless the user reopens audio optimization.
- Merge gate: Docs/report only; no audio file churn; validation passes with known warning.
- Status: Not started.

### G12 - SEO Social Preview Member Pages Review

- ID: G12
- Title: SEO and social preview member pages review
- Why it exists: Auth, Account, Gallery Submit, and Leader Dashboard now exist in the sitemap and may appear in links, but their metadata and share behavior need review.
- Priority: P2
- Dependencies: G09 preferred.
- Branch: `qa/seo-social-preview-member-pages-review`
- Scope: Review metadata, canonical URLs, OG/Twitter tags, robots/sitemap expectations, preview images, and whether member/private pages should be indexable or only discoverable.
- Allowed files: `reports/seo-social-preview-member-pages-review.md`; `auth.html`, `account.html`, `gallery-submit.html`, `leader-dashboard.html`, `sitemap.xml`, `robots.txt` only if confirmed metadata/indexing fixes are needed.
- Forbidden files: page behavior JS, CSS, data files, assets unless a missing referenced image is confirmed and explicitly scoped, workflows, Supabase files.
- Validation: `npm run check`; `git diff --check`; `node scripts/check-refs.mjs`; `npm run check:production`; local and production metadata inspection; optional manual Discord preview checklist.
- Definition of done: Report states whether member pages should be indexed, whether source metadata is healthy, whether production metadata matches source, and which manual preview checks remain.
- Merge gate: No copy rewrite beyond metadata labels/descriptions; no protected data changes; validation passes.
- Status: Not started.

### G13 - Supabase Cost Usage Runbook

- ID: G13
- Title: Supabase cost and usage runbook
- Why it exists: Member uploads, private Storage, Edge Functions, signed URLs, and Discord verification can consume quota; leaders need operational guardrails.
- Priority: P2
- Dependencies: G01 through G10 preferred.
- Branch: `docs/supabase-cost-usage-runbook`
- Scope: Document expected cost drivers, quotas to watch, Storage cleanup implications, Edge Function invocation patterns, upload size policy, and safe dashboard checks.
- Allowed files: `docs/supabase-cost-usage-runbook.md`; `supabase/README.md` only for a cross-link.
- Forbidden files: runtime site files, data files, migrations, Edge Functions, secrets, workflows.
- Validation: `npm run check`; `git diff --check`; `node scripts/check-json.mjs`; `node scripts/check-js.mjs`; `node scripts/check-refs.mjs`; `node scripts/check-assets.mjs`; `npm run check:production`; `npm run smoke:gallery` if links changed.
- Definition of done: Runbook explains what to monitor, what thresholds matter, what not to mutate without approval, and how to separate normal usage from runaway behavior.
- Merge gate: Docs only; no secret exposure; no unsupported cost claims presented as verified current billing data.
- Status: Not started.

### G14 - Member Gallery Cleanup Plan

- ID: G14
- Title: Member gallery cleanup plan
- Why it exists: Private uploads and moderation states need a retention and cleanup plan before storage grows or rejected/orphaned files accumulate.
- Priority: P2
- Dependencies: G03, G04, G08, and G13 preferred.
- Branch: `docs/member-gallery-cleanup-plan`
- Scope: Plan retention for pending, rejected, archived, approved, orphaned Storage objects, moderation events, signed URL expectations, and manual/admin cleanup responsibilities.
- Allowed files: `docs/member-gallery-cleanup-plan.md`; optional `reports/member-gallery-cleanup-plan.md`.
- Forbidden files: cleanup scripts, migrations, Edge Functions, Storage mutation, data files, assets, workflows, secrets.
- Validation: `npm run check`; `git diff --check`; `node scripts/check-json.mjs`; `node scripts/check-js.mjs`; `node scripts/check-refs.mjs`; `node scripts/check-assets.mjs`; `npm run check:production`; `npm run smoke:gallery` if links changed.
- Definition of done: Plan identifies cleanup policies, risks, manual approval points, and future implementation branches without deleting or mutating any production data.
- Merge gate: Docs/report only; no destructive cleanup work; validation passes.
- Status: Not started.

### G15 - Post-Goal Cross-Site Regression Review

- ID: G15
- Title: Post-goal cross-site regression review
- Why it exists: After the member/Supabase/Gallery goal sequence, the public static site needs a final cross-page confidence pass.
- Priority: P0 at the end of the sequence.
- Dependencies: G01 through G14 complete or explicitly deferred.
- Branch: `qa/post-goal-cross-site-regression-review`
- Scope: Browser-driven review of all public routes, signed-out browsing, mobile nav, skip link, header/footer, Home, Join widget, Gallery, Recruitment audio, Events filters, Spotify embeds, member pages, Supabase signed-out safety, and no horizontal overflow.
- Allowed files: `reports/post-goal-cross-site-regression-review.md`; narrow page-scoped CSS/HTML/JS fixes only for confirmed regressions.
- Forbidden files: data files unless a broken reference is proven and content scope is explicitly approved; migrations; Edge Function deployment; workflows; dependencies; broad redesign.
- Validation: `npm run check`; `git diff --check`; `node scripts/check-json.mjs`; `node scripts/check-js.mjs`; `node scripts/check-refs.mjs`; `node scripts/check-assets.mjs`; `npm run check:production`; `npm run smoke:gallery`; browser smoke at `360`, `390`, `768`, and `1440` for all sitemap routes; protected data diffs.
- Definition of done: Report documents page-by-page pass/fail, fixes if any, residual risks, production status, and recommended stable tag if clean.
- Merge gate: No unresolved regression, no protected content change, no unexpected files, validation passes.
- Status: Not started.

## 9. Update Protocol After Every PR

After each workstream PR merges:

1. Check out `main`.
2. Run `git pull --ff-only origin main`.
3. Run `git status --short`.
4. Run at least `npm run check`, `git diff --check`, and `npm run check:production`.
5. Run `npm run smoke:gallery` when Gallery, shell, page routes, Supabase runtime, or cross-site behavior could be affected.
6. Update this report on a dedicated docs/tracker branch or in the next goal branch:
   - Change the completed item status to `Completed`.
   - Add PR number, merge commit, and date.
   - Add validation summary.
   - Add any follow-up branch created by the PR.
   - Do not rewrite protected content or completed evidence.
7. If a goal is deferred, mark status `Deferred` with the reason and the next unblocker.
8. If a goal finds a blocker but cannot fix it safely, mark status `Blocked` and create a narrow next branch name.
9. Do not reorder remaining goals unless a documented dependency or production risk justifies it.

## 10. Initial Status Summary

| ID | Branch | Status |
| --- | --- | --- |
| G01 | `qa/supabase-production-security-review` | Complete - PR #109, merge `99f49fad255b7fd9eadfeadd0ba175f8a9bc75e4` |
| G02 | `qa/supabase-edge-functions-review` | Complete - PR #111, merge `b487e323751b812492d8e0d330f640dcb0cd23d6` |
| G03 | `qa/member-gallery-upload-limit-review` | Complete - PR #113, merge `31bdf4c307b676447ad41d4d3a44368994cefb56` |
| G04 | `qa/member-gallery-end-to-end-review` | In review - report drafted, PR pending |
| G05 | `qa/account-member-dashboard-review` | Not started |
| G06 | `qa/gallery-approved-feed-integration-review` | Not started |
| G07 | `qa/gallery-behavior-matrix-suite` | Not started |
| G08 | `docs/member-gallery-moderation-runbook` | Not started |
| G09 | `qa/production-member-workflow-smoke` | Not started |
| G10 | `qa/secrets-and-public-config-review` | Not started |
| G11 | `chore/document-large-audio-exception` | Not started |
| G12 | `qa/seo-social-preview-member-pages-review` | Not started |
| G13 | `docs/supabase-cost-usage-runbook` | Not started |
| G14 | `docs/member-gallery-cleanup-plan` | Not started |
| G15 | `qa/post-goal-cross-site-regression-review` | Not started |

## 11. First Recommended Goal

Start with:

```text
/goal qa/supabase-production-security-review
```

Reason:

G01 is the highest-value gate because it verifies the production Supabase security boundary before future `/goal` sessions spend time on upload, account, approved-feed, and production member workflow details.
