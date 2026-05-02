# Production Lighthouse Review — Mōchirīī Guild Website

## 1. Summary

Production is live, current, and broadly healthy. GitHub Pages reported a successful deployment from `main`, the checked production URLs returned HTTP 200, and browser smoke tests confirmed that the shared header/footer, gallery thumbnails, full-size lightbox images, mobile menu, recruitment page, sitemap, robots file, and metadata are present.

Major strengths:
- Accessibility and SEO Lighthouse scores are consistently 100 on audited pages.
- Desktop performance is strong on key pages, with near-instant FCP/LCP and no blocking time.
- Gallery optimization is effective: thumbnails are used in the grid and the lightbox opens full gallery images.
- Static validation and production smoke checks are now repeatable.

Major risks:
- Mobile Lighthouse performance is weak on several pages, mostly due to the global 2.7 MB PNG background, large total payload, CSS size, and image delivery opportunities.
- Lighthouse reports accessible-name mismatches on some visual links whose `aria-label` omits visible text.
- Desktop CLS is noticeable on home and recruitment, likely from late-mounted partials/content and unsized images.
- Some best-practice warnings come from Cloudflare challenge scripts rather than first-party code, but they still affect Lighthouse.

Highest-value next fixes:
1. Optimize remaining non-gallery background/rank/value/audio assets, especially `assets/bg/wuxia-bg.png`.
2. Add explicit dimensions or stable aspect boxes for remaining dynamic images.
3. Clarify recruitment/join copy now that the site is faster and more public-ready.
4. Add a read-only production smoke workflow so deployment regressions are easier to catch.

## 2. URLs Audited

| URL | Status | Audited? | Notes |
|---|---:|---|---|
| `https://mochirii.com/` | 200 | yes | Lighthouse mobile + desktop, browser smoke, metadata |
| `https://mochirii.com/gallery.html` | 200 | yes | Lighthouse mobile + desktop, gallery/lightbox smoke |
| `https://mochirii.com/recruitment.html` | 200 | yes | Lighthouse mobile + desktop, metadata and CTA smoke |
| `https://mochirii.com/join.html` | 200 | yes | Lighthouse mobile |
| `https://mochirii.com/events.html` | 200 | yes | Lighthouse mobile |
| `https://mochirii.com/spotify.html` | 200 | smoke only | Spotify iframe host checked in browser smoke |
| `https://mochirii.com/robots.txt` | 200 | yes | `text/plain` |
| `https://mochirii.com/sitemap.xml` | 200 | yes | `application/xml`, XML parses locally |

## 3. Lighthouse Scores

| URL | Device/profile | Performance | Accessibility | Best Practices | SEO | Key notes |
|---|---|---:|---:|---:|---:|---|
| `/` | mobile | 60 | 100 | 81 | 100 | LCP 20.3 s, FCP 3.5 s, 4.7 MB payload |
| `/gallery.html` | mobile | 47 | 100 | 81 | 100 | LCP 20.3 s, TBT 540 ms, 4.9 MB payload |
| `/recruitment.html` | mobile | 47 | 100 | 81 | 100 | LCP 20.5 s, TBT 550 ms |
| `/join.html` | mobile | 45 | 100 | 81 | 100 | LCP 20.2 s, TBT 650 ms |
| `/events.html` | mobile | 47 | 100 | 77 | 100 | LCP 20.7 s, TBT 530 ms |
| `/` | desktop | 87 | 100 | 81 | 100 | FCP 0.8 s, LCP 0.9 s, CLS 0.188 |
| `/gallery.html` | desktop | 96 | 100 | 81 | 100 | FCP/LCP 0.8 s, CLS 0.065 |
| `/recruitment.html` | desktop | 87 | 100 | 81 | 100 | FCP/LCP 0.9 s, CLS 0.194 |

Raw Lighthouse HTML/JSON artifacts were generated locally during the audit and then intentionally left out of version control. This report preserves the durable findings without committing bulky generated diagnostic files.

## 4. Performance Findings

### P1 — Global PNG background dominates mobile payload
- Affected page/assets: all pages using `.bg-photo`, especially `assets/bg/wuxia-bg.png`.
- Evidence: Lighthouse reports `assets/bg/wuxia-bg.png` at about 2.86 MB with an estimated 2.6 MB image-delivery saving. Mobile total payload is roughly 3.5-4.9 MB on audited pages.
- Recommendation: Convert the global background to real WebP/AVIF or add responsive background variants, keeping the current visual mood.
- Estimated effort: Medium.

### P1 — Mobile LCP is consistently high
- Affected pages/assets: home, gallery, recruitment, join, events.
- Evidence: mobile LCP is about 20.2-20.7 s across audited pages despite good desktop LCP.
- Recommendation: Reduce above-the-fold payload, prioritize/preload true LCP images with `fetchpriority="high"` where appropriate, and reduce global background cost.
- Estimated effort: Medium.

### P2 — Single global CSS has unused and unminified cost
- Affected files: `styles.css`.
- Evidence: Lighthouse estimates about 120 KiB unused CSS and 15 KiB minification savings.
- Recommendation: Keep architecture static for now, but organize future CSS by page/feature and consider a no-dependency minification step only if it stays simple.
- Estimated effort: Medium.

### P2 — Remaining images need explicit dimensions or responsive variants
- Affected assets/components: home seal, bulletins, tiles, page hero images.
- Evidence: Lighthouse reports unsized images and image delivery savings for 1536x960 assets displayed much smaller on mobile.
- Recommendation: Add width/height attributes where data-driven image sizes are stable, and generate smaller non-gallery variants for mobile/card use.
- Estimated effort: Medium.

### P3 — Cache lifetime is not ideal for immutable assets
- Affected environment/assets: GitHub Pages/Cloudflare static assets.
- Evidence: Lighthouse cache insight flags 4-hour cache lifetimes for large assets.
- Recommendation: Since GitHub Pages controls much of this, prefer filename-based cache busting and optimized asset sizes over trying to tune headers directly.
- Estimated effort: Small/Medium depending on hosting control.

## 5. Accessibility Findings

### P2 — Some link accessible names do not include visible text
- Affected components: brand link, footer brand link, featured bulletin card, spotlight card.
- Evidence: Lighthouse `label-content-name-mismatch` flags `aria-label="Mōchirīī Home"`, `aria-label="Featured bulletin"`, and `aria-label="Spotlight card"` where visible text is richer.
- Recommendation: Remove redundant `aria-label`s or update them to include visible text so speech-input users can activate visible labels naturally.
- Estimated effort: Small.

### P3 — Continue preserving keyboard/modal behavior
- Affected components: mobile menu, gallery lightbox.
- Evidence: production smoke passed skip link, menu, and lightbox behavior.
- Recommendation: Keep `npm run smoke:gallery` and production smoke checks in future workflows.
- Estimated effort: Small.

## 6. SEO/Social Findings

### P3 — SEO foundation is strong
- Affected files: all HTML pages, `sitemap.xml`, `robots.txt`.
- Evidence: audited pages scored 100 SEO, canonical URLs use `https://mochirii.com/`, sitemap and robots are reachable, and homepage JSON-LD parses.
- Recommendation: Keep metadata page-specific as copy evolves.
- Estimated effort: Small.

### P3 — Social preview should be manually inspected in chat apps
- Affected assets/pages: OG images and descriptions.
- Evidence: OG image URLs resolve, but Lighthouse cannot verify how Discord/Twitter-like surfaces crop or cache cards.
- Recommendation: Manually paste key URLs into Discord and a Twitter-like card validator after production cache settles.
- Estimated effort: Small.

## 7. Production Smoke Findings

- GitHub Pages API: status `built`, source `main`, CNAME `mochirii.com`.
- Latest listed deployment: `main`, `github-pages`, created `2026-05-02T12:49:16Z`.
- Checked production pages returned HTTP 200.
- `sitemap.xml` returned XML-compatible content and parsed locally.
- `robots.txt` returned text content.
- Browser smoke passed for homepage, gallery, recruitment, mobile menu, and gallery lightbox.
- Gallery grid images use `/thumbs/`; lightbox images do not.
- Metadata and OG image references resolved.
- No severe first-party console errors were observed in the smoke tests.

## 8. Recommended Next Implementation Tasks

1. Remaining asset polish: convert/compress non-gallery PNG/background/rank/value assets and review audio bitrate.
2. Recruitment clarity: make the join path, community promise, activity expectations, and Discord CTA clearer.
3. Visual polish: reduce CLS, tune hero/card spacing, add missing dimensions where practical, and improve responsive image/card rhythm.
4. Deployment preview checks: add a read-only production smoke workflow and optional local `check:production` command.

## 9. Commands Run

- `git status --short`
- `git branch --show-current`
- `git remote -v`
- `gh auth status`
- `git fetch --all --prune`
- `git checkout main`
- `git pull --ff-only origin main`
- `git log --oneline -10`
- `npm run check`
- `git diff --check`
- `du -sh assets`
- `du -sh assets/img/gallery`
- `find assets -type f -size +1M -print | sort`
- `gh run list --limit 10`
- `gh workflow list`
- `gh api repos/:owner/:repo/pages`
- `gh api repos/:owner/:repo/deployments --paginate ...`
- `curl -I -L --max-time 20` for production pages, sitemap, and robots
- `curl -L --max-time 20` for homepage and recruitment metadata files
- Node metadata/OG-image checks using built-in `fs` and `fetch`
- Playwright production browser smoke tests
- `npx --yes lighthouse@latest ...` for mobile and desktop production Lighthouse audits
