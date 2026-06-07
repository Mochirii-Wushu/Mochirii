# Full Guild Site Quality Audit - 2026-06-07

## Summary

This audit reviewed the Mōchirīī guild site across the root static site, the `apps/web` Next/Vercel surface, GitHub repository controls, Supabase member workflows, and Discord integration boundaries.

Current live truth has changed from older repo docs: `https://mochirii.com` now serves the Vercel/Next app, and `https://www.mochirii.com` redirects to the apex. The root static GitHub Pages surface and `CNAME` file still exist as a rollback surface, but several docs still say the cutover is deferred.

No product behavior, schema, dashboard setting, DNS record, Supabase setting, or Discord setting was changed during this audit.

## Source Basis

- Accessibility and responsive design: <https://www.w3.org/TR/WCAG22/>, <https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design>
- Performance and launch quality: <https://web.dev/articles/vitals>, <https://developer.chrome.com/docs/lighthouse/overview>
- GitHub controls: <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets>, <https://docs.github.com/en/code-security/getting-started/github-security-features>
- Vercel production readiness: <https://vercel.com/docs/production-checklist>, <https://vercel.com/docs/environment-variables>
- Supabase security: <https://supabase.com/docs/guides/database/secure-data>, <https://supabase.com/docs/guides/auth/redirect-urls>, <https://supabase.com/docs/guides/storage/security/access-control>, <https://supabase.com/docs/guides/functions/secrets>
- Discord integration: <https://docs.discord.com/developers/topics/oauth2>, <https://docs.discord.com/developers/topics/rate-limits>

## Current State

- Branch audited: `codex/full-guild-quality-audit` from `origin/main`.
- Base commit: `8923086 Add Next discovery files for cutover (#194)`.
- Open visual-shell PR: #195, `codex/guild-emblem-clean-shell`, draft, mergeable, all checks green.
- Public root HTML inventory: 17 public pages plus `header.html` and `footer.html`.
- Next app route inventory: 17 public/member routes under `apps/web/app`, with legacy `.html` redirects in `apps/web/next.config.ts`.
- Supabase inventory: 5 Edge Functions and 6 migrations, including private `member-gallery` Storage policies and Discord role-gated member/gallery workflow tables.
- Workflow inventory: `validate-static-site`, `validate-next-app`, `production-smoke`, and manual Lighthouse.

## Live Deployment Evidence

- `https://mochirii.com/` returns `Server: Vercel`, `X-Vercel-Cache: HIT`, and `Content-Length: 72078`.
- `https://mochirii.vercel.app/` returns the same Vercel/Next deployment shape.
- `https://www.mochirii.com/` returns `308` to `https://mochirii.com/`.
- Public DNS currently resolves:
  - `mochirii.com A 76.76.21.21`
  - `www.mochirii.com CNAME c4b58a30d23b9df3.vercel-dns-017.com`
- GitHub Pages still reports `cname: mochirii.com`, source `main` `/`, status `built`; root `CNAME` still contains `mochirii.com`.

## Validation Results

- `git diff --check`: pass.
- Root static production smoke: pass.
- Supabase Edge Function contract smoke: pass.
- Vercel production smoke against `https://mochirii.vercel.app`: pass.
- Custom-domain post-cutover smoke against `https://mochirii.com` with `www` redirect mode: pass.
- Next lint via local bundled Node and existing `node_modules`: pass.
- Next production build via local bundled Node and existing `node_modules`: pass.
- Root `npm run check`: blocked because `npm` is not on PATH in this shell.
- `bun run check`: blocked with `Operation not permitted`.
- Root check via bundled Node: all checks passed except Supabase Edge Function type validation, which requires local `deno`; asset check emitted only the known `assets/audio/mochiriiiiii.mp3` warning.
- Optional Playwright smokes for gallery lightbox and Supabase auth boundary: blocked because Playwright is not installed locally.
- Lighthouse: not run locally because `lighthouse` is not installed; the repo has a manual GitHub Actions Lighthouse workflow.

## Viewport And Accessibility Evidence

Browser probes covered 17 pages across widths `360`, `390`, `768`, `1024`, and `1440` on both the local root static surface and the live clean Next routes.

Live Next results:

- 85 route/viewport combinations checked.
- No true document-level horizontal overflow.
- Every page had one visible H1.
- Header, main, footer, nav landmarks were present.
- No visible images missing `alt`.
- No unnamed interactive controls after accounting for image alt inside gallery thumbnail buttons.
- Skip link was present.
- No browser console errors or warnings captured during the sweep.

Notes:

- Mobile footer decorative elements and footer columns visually extend near or beyond the viewport edge but do not create document-level horizontal scroll. This is a polish target, not a current functional break.
- The Join Discord iframe slightly exceeds the narrow viewport in one measurement but remains clipped by layout and does not create page scroll.
- Navigation links are functional and named. At tablet/desktop widths, their measured height is about 38 px; this is not a WCAG 2.5.8 failure, but slightly taller hit areas would feel better.

## Platform Review

GitHub:

- Ruleset `Primary Rules` is active for the default branch.
- Rules block deletion, block non-fast-forward pushes, require PRs, and require `validate` plus `validate-next`.
- Auto-delete head branches is enabled.
- Code scanning open alerts: 0.
- Secret scanning open alerts: 0.
- Dependabot security updates are enabled.
- Open Dependabot alerts: 1 medium `postcss` advisory, `GHSA-qx2v-qp2m-jg93`, in `apps/web/package-lock.json`.
- Several Dependabot PRs still show failing `Vercel - web` contexts while the production-serving `Vercel - mochirii` context succeeds. Required checks currently avoid relying on the duplicate failing project.

Vercel:

- The live apex and `www` routing are already on Vercel.
- Legacy `.html` redirects pass on Vercel.
- The custom-domain smoke confirms the app serves clean routes and signed-out member pages on `https://mochirii.com`.
- Repo docs still describe `https://mochirii.com` as GitHub Pages and DNS cutover as deferred, which is now stale.

Supabase:

- Public config guardrails passed.
- Browser code uses public Supabase config names only.
- Service-role/secret/Discord bot token names appear only as placeholders, docs, migrations, or Edge Function runtime environment references; no committed secret value was found by targeted scan.
- RLS and Storage policy migrations are present for `member_profiles`, `gallery_submissions`, `gallery_moderation_events`, `discord_resources`, `discord_sync_log`, and private `member-gallery` Storage objects.
- Edge Function contract smoke passed, but local type validation still needs Deno installed or an equivalent documented fallback.

Discord:

- Browser OAuth uses Discord provider scope `identify email`.
- Supabase remains the OAuth callback owner.
- Discord guild-member and role checks stay inside Supabase Edge Functions.
- Edge Function code handles Discord `429` rate limits and `401/403/404` failure modes.
- No bot token or Discord client secret is exposed to browser code.

## Prioritized Findings

### P0 Bugs

None found during this audit.

### P1 Launch Blockers

1. Deployment source-of-truth drift: docs still say `mochirii.com` is GitHub Pages and DNS cutover is deferred, while live DNS and headers show Vercel/Next. Update `README.md`, `apps/web/README.md`, `docs/deployment.md`, and the DNS cutover runbook so operators do not roll back or validate against an outdated mental model.
2. Local validation environment is incomplete. `npm`, `deno`, Playwright, and Lighthouse are unavailable in this shell, which prevents exact local reproduction of the documented validation sequence. Either install/document the expected local toolchain or add a repo-local fallback script that uses bundled Node plus CI-only Deno/browser gates.
3. One medium Dependabot alert remains open for `postcss` in `apps/web/package-lock.json`. Resolve through the relevant Dependabot PR or a scoped dependency update after confirming `validate-next` still passes.

### P2 Polish

1. Finish and merge the clean-emblem shell PR (#195), then re-run the viewport smoke on the merged branch so header/footer branding matches the latest desired look.
2. Refine footer mobile layout so decorative glints and columns do not sit near/off the viewport edge, even when clipped safely.
3. Add explicit `aria-label` values to gallery thumbnail buttons such as `Open gallery image: ...`; the current image alt appears to name the buttons, but explicit labels are more robust for a button-driven lightbox.
4. Make tablet/desktop navigation targets slightly taller for comfort, aiming for a more relaxed 40-44 px visual hit area without bloating the header.
5. Recheck the Join Discord iframe at 360 px and constrain the embed to the visible content box.
6. Add optional automated viewport evidence, such as a small Playwright/axe audit script, so future visual regressions are caught before manual review.
7. Update stale references to `mochirii.vercel.app` as the production review URL now that the apex domain is already serving Vercel.

### P3 Future Refinement

1. Run the manual Lighthouse workflow after docs are corrected and PR #195 is merged; record baselines for Home, Join, Recruitment, Gallery, Auth, Account, Gallery Submit, and Leader Dashboard.
2. Revisit draft Vercel Analytics/Speed Insights PRs only after the duplicate `web` Vercel project/status surface is retired or disconnected.
3. Consider a lightweight field Web Vitals monitor after the domain/source-of-truth cleanup is merged.
4. Create a post-cutover stabilization checklist: decide how long GitHub Pages, root `CNAME`, and rollback-specific docs should remain active now that apex traffic is Vercel.
5. Expand page-specific visual identity in a later design pass: keep the cohesive glass/wuxia shell, but give Events, Gallery, Recruitment, Ranks, Leaders, and Member pages more distinct top-section compositions.

## Recommended Next Steps

1. Merge or finish PR #195 if the clean emblem treatment is approved.
2. Open a scoped docs PR to correct deployment source-of-truth drift and mark Vercel/Next as the live apex production surface.
3. Resolve the open `postcss` Dependabot alert with `validate-next`.
4. Install or document the local toolchain gap: `npm`, `deno`, Playwright, and Lighthouse.
5. Apply the P2 layout/accessibility refinements in small page/shell PRs, starting with footer mobile alignment and gallery thumbnail labels.
6. Run the manual Lighthouse workflow and attach results to a follow-up performance report.

## Commands And Checks Run

```text
gh pr list --repo Mochirii-Wushu/Mochirii --state open --limit 20
gh api repos/Mochirii-Wushu/Mochirii/rulesets/13652003
gh api repos/Mochirii-Wushu/Mochirii/pages
gh api repos/Mochirii-Wushu/Mochirii
gh api repos/Mochirii-Wushu/Mochirii/code-scanning/alerts
gh api repos/Mochirii-Wushu/Mochirii/dependabot/alerts
gh api repos/Mochirii-Wushu/Mochirii/secret-scanning/alerts
Resolve-DnsName mochirii.com -Type A
Resolve-DnsName www.mochirii.com -Type CNAME
Invoke-WebRequest -Method Head https://mochirii.com/
Invoke-WebRequest -Method Head https://www.mochirii.com/
Invoke-WebRequest -Method Head https://mochirii.vercel.app/
node scripts/check-all.mjs
git diff --check
node scripts/check-production.mjs
node scripts/smoke-gallery-lightbox.mjs
node scripts/smoke-supabase-auth-boundary.mjs
node scripts/smoke-supabase-edge-functions.mjs
node scripts/smoke-vercel-production.mjs
node scripts/smoke-dns-cutover-post.mjs --base-url=https://mochirii.com --www-mode=redirect
node node_modules/eslint/bin/eslint.js .
node node_modules/next/dist/bin/next build
Browser viewport probes at 360, 390, 768, 1024, and 1440 px
```

## Owner-Approval Boundaries

The following were not changed and should still require explicit approval:

- DNS, Cloudflare, Vercel dashboard settings, GitHub Pages settings, Supabase dashboard settings, Discord application settings.
- Supabase migrations, Edge Function deploys, Storage bucket policy changes, live member upload/moderation actions, or cleanup of production data.
- Removing GitHub Pages rollback artifacts such as the root `CNAME` file.
