# Sitewide Hero Presentation Release - 2026-06-08

## Summary

This release packet is for branch `codex/home-cinematic-guild-hall-design`. It refines the Next/Vercel guild site presentation so Home and shared `PageHero` routes show full-frame hero images without crop, tint, scrim, filter, or intro-card overlap.

The only data/copy change in this packet is the approved grammar correction in `data/home.json`, mirrored to `apps/web/public/data/home.json` through the existing source-of-truth sync rule.

## Current Production State

- `https://mochirii.com` remains the live Vercel/Next production site from `apps/web`.
- `https://www.mochirii.com` redirects to the apex domain.
- Root static GitHub Pages files and the tracked `CNAME` remain rollback/reference material.
- This branch is not live on production until the draft PR is approved, merged to `main`, and the Vercel production deployment completes.

## Files In Scope

- `apps/web/app/mochirii.css`
- `data/home.json`
- `apps/web/public/data/home.json`
- `docs/home-shell-guide.md`
- `apps/web/README.md`
- `reports/sitewide-hero-presentation-release-2026-06-08.md`

No image files, image paths, routes, metadata, Supabase code, Discord code, Vercel settings, DNS settings, or dashboard settings are changed in this release packet.

## Visual Contract

- Hero frame: `3 / 2`.
- Hero image fit: `object-fit: contain`.
- Hero image treatment: no crop, tint, scrim, CSS filter, transform, or overlay card coverage.
- Intro placement: below the hero image with positive spacing.
- Page identity: existing page-specific palette, glass, borders, focus states, and responsive rules stay in place.

## Validation Evidence

Local checks completed before staging:

- `git diff --check`: passed.
- `scripts/check-next-public-sync.mjs`: passed.
- `scripts/check-json.mjs`: passed.
- `scripts/check-protected-content.mjs`: passed.
- `scripts/check-refs.mjs`: passed.
- `scripts/check-assets.mjs`: passed with the existing `assets/audio/mochiriiiiii.mp3` large-asset warning only.
- `scripts/check-production.mjs`: passed.
- `apps/web` ESLint through bundled Node: passed.
- `apps/web` Next build through bundled Node: passed.

Browser verification completed in the in-app browser:

- Checked 17 routes at `360`, `390`, `768`, `1024`, and `1440` pixel widths.
- Verified `object-fit: contain`, `filter: none`, `transform: none`, positive intro spacing, no hero/intro overlap, no horizontal overflow, and no console errors.
- Verified Gallery lightbox opens a full image path, not a `/thumbs/` path.
- Verified signed-out `/auth`, `/account`, `/gallery-submit`, and `/leader-dashboard` surfaces keep forms/file inputs hidden while signed out.

Optional local Playwright smoke scripts were unavailable on this workstation because local Playwright is not installed. Equivalent rendered checks were completed with the in-app browser. GitHub Actions remains the canonical CI gate for PR validation.

## Release Status

- Draft PR: [#203](https://github.com/Mochirii-Wushu/Mochirii/pull/203).
- Initial implementation commit: `01955f2dc7176c0511f37d17f2c09449176c4cbf`.
- PR #203 status: merged to `main` on 2026-06-08.
- Design release merge commit: `bd766a31731e019656bc572a8c01f6e53d545c34`.
- Vercel production status for the design release: Ready.
- Vercel production deployment evidence: `https://vercel.com/mochirii/mochirii/HbJcD85t2sf1cksfMP95AKPjYmgp`.
- Vercel preview status: passed before merge.
- Vercel preview URL: `https://mochirii-git-codex-home-cinematic-guild-hall-design-mochirii.vercel.app`.
- GitHub checks: `validate`, `validate-next`, CodeQL, Vercel, and Vercel Preview Comments passed before merge. Supabase Preview skipped on the PR because no `supabase` directory changes were detected, then succeeded on the merged `main` commit.
- Preview browser note: the in-app browser was redirected to Vercel login/deployment protection for the preview URL before merge.
- Preview limitation resolution: production route-level browser smoke was completed after merge on the public `https://mochirii.com` routes.

Current live domain status after production deployment:

- `https://mochirii.com/`: `200 OK`, `Server: Vercel`, `X-Vercel-Cache: PRERENDER`.
- `https://mochirii.com/join`: `200 OK`, `Server: Vercel`, `X-Vercel-Cache: PRERENDER`.
- `https://mochirii.com/gallery`: `200 OK`, `Server: Vercel`, `X-Vercel-Cache: PRERENDER`.
- `https://mochirii.com/auth`: `200 OK`, `Server: Vercel`, `X-Vercel-Cache: PRERENDER`.
- `https://mochirii.com/leader-dashboard`: `200 OK`, `Server: Vercel`, `X-Vercel-Cache: PRERENDER`.
- `https://www.mochirii.com/`: `308 Permanent Redirect` to `https://mochirii.com/`, then `200 OK`.

Post-merge browser verification:

- Checked `/`, `/join`, `/gallery`, `/auth`, and `/leader-dashboard` at `390px` and `1440px`.
- All checked routes rendered a hero image with `object-fit: contain`, `filter: none`, `transform: none`, no intro-card overlap, and no horizontal overflow.
- No browser console errors were observed during the live route smoke.
