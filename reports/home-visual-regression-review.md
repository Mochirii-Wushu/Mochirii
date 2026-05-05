# Home Visual Regression Review

## 1. Baseline

- Branch reviewed: `qa/home-visual-regression-review`
- Source merges reviewed:
  - `content/preserve-current-data-updates` / PR #66 / merge `8c5a81362bc4df315341bbbcef2f64b5f89440a9`
  - `design/home-visual-system-pilot` / PR #67 / merge `75d1d63be50f655ce9a7d62badd03a6c078917fa`
- Mode: QA-only, report-only.
- Known warning: `assets/audio/mochiriiiiii.mp3` intentionally exceeds the normal large-asset threshold.

## 2. Home Visual Audit

| Area | Finding | Severity | Evidence | Fix needed? | Notes |
| --- | --- | --- | --- | --- | --- |
| Home load and shell | Home loaded with shared header and footer at all audited widths. | Pass | Viewports 360, 390, 768, and 1440; selectors `#header`, `#footer`; no console-breaking errors; regression result pass. | No | Shared shell behavior remained intact. |
| Mobile nav | Mobile menu opened and closed at 360 and 390 with `aria-expanded` updating. | Pass | Viewports 360 and 390; selector `#menu-btn` / `#mobile-menu`; observed open state `true`, close state `hidden`; no fix made; regression result pass. | No | Close focus target was present; focus handling did not create a trap. |
| Skip link | Skip link remained keyboard focusable with visible focus style. | Pass | Viewports 360 and 390; selector `.skip-link`; observed `outline: solid 2px`; no fix made; regression result pass. | No | Accessibility behavior preserved. |
| Hero image treatment | Hero artwork stayed contained and intentional without horizontal overflow. | Pass | Viewports 360, 390, 768, and 1440; selector `.page-hero`; observed `scrollWidth === clientWidth`; no fix made; regression result pass. | No | Desktop overlap remains part of the pilot treatment. |
| Hero intro panel | Intro panel remained readable with stable ornamental border treatment. | Pass | Viewports 360 and 390; selector `.hero-intro`; observed panel widths 328px and 358px; no overflow; no fix made; regression result pass. | No | Controlled Home panel system is active. |
| Badges and descriptors | Badges wrapped cleanly on narrow screens. | Pass | Viewports 360 and 390; selector `#heroBadges span`; badges wrap into two rows without clipping; no fix made; regression result pass. | No | No noisy/random badge animation observed. |
| Guild Bulletin | Bulletin section rendered cleanly with two secondary bulletin cards and featured panel. | Pass | Viewports 360, 390, 768, and 1440; selectors `#featuredBulletin`, `.home-bulletin`; observed two `.home-bulletin` cards; no fix made; regression result pass. | No | Rendering reflects current data. |
| Four Doors | Four Door links rendered with consistent card treatment. | Pass | Viewports 360, 390, 768, and 1440; selector `.home-door`; observed four cards; no fix made; regression result pass. | No | Focus styling remains visible. |
| Member Spotlight | Spotlight panel rendered with image, scrim, and plate intact. | Pass | Viewports 360, 390, 768, and 1440; selector `#spotlightCard .home-spotlight__plate`; no fix made; regression result pass. | No | No visual or interaction regression observed. |
| Screenshot Spotlight | Home screenshot thumbnail rendered and remained keyboard reachable. | Pass | Viewports 360, 390, 768, and 1440; selector `#galleryGrid .home-thumb`; observed one thumbnail; no fix made; regression result pass. | No | Home gallery behavior preserved. |
| Guild seal panel | Seal panel remained visually distinct and readable; seal poem rendered unchanged. | Pass | Viewports 360, 390, 768, and 1440; selectors `.home-guild-seal`, `#sealVerse`; observed readable panel and expected verse text; no fix made; regression result pass. | No | Protected `seal.verse` was not edited. |
| CTAs and focus states | CTA focus state remained visible. | Pass | Viewports 360, 390, 768, and 1440; selector `.hero-cta`; observed `outline: solid 2px`; no fix made; regression result pass. | No | Hover/focus treatment is deliberate, not noisy. |
| Random border behavior | Home-specific panel and badge animations were disabled. | Pass | Viewports 360, 390, 768, and 1440; selectors `.hero-intro`, `#heroBadges span`; observed `animation-name: none`; no fix made; regression result pass. | No | The pilot removed Home's random-border feel. |
| Reduced motion | Reduced-motion preference reduced transitions safely. | Pass | Viewports 360, 390, 768, and 1440; selectors `.hero-intro`, `.hero-cta`; observed `animation-name: none` and transition duration reduced to `1e-06s`; no fix made; regression result pass. | No | No constant motion added by this branch. |
| Body copy game-name rule | Visible Home body copy outside header/footer did not include regular body-copy `Where Winds Meet` usage. | Pass | Viewports 360, 390, 768, and 1440; selectors `main`, `.page-hero-shell`; no body-copy match found; no fix made; regression result pass. | No | Metadata/header/footer remain outside this check. |

## 3. Cross-Page Regression Audit

| Page | Result | Evidence | Notes |
| --- | --- | --- | --- |
| `/join.html` | Pass | 390px smoke: header/footer rendered, no overflow, focus visible, no console-breaking errors. | Home-scoped CSS variables did not leak. |
| `/events.html` | Pass | 390px smoke: header/footer rendered, no overflow, focus visible, `All` filter set `aria-pressed="true"`, count showed `All: 1 event`, no console-breaking errors. | Event filtering remained functional. |
| `/gallery.html` | Pass | 390px smoke: count showed `Showing 70 of 70 images.`, category filter updated URL to `?category=portraits`, Copy link surfaced status, lightbox opened `./assets/img/gallery/shot-01.webp` instead of `/thumbs/`. | `npm run smoke:gallery` also passed. Clipboard returned `Copy failed` in local non-secure context, which is an expected fallback. |
| `/ranks.html` | Pass | 390px smoke: header/footer rendered, no overflow, focus visible, no console-breaking errors. | No Home-only styling leaked. |
| `/leaders.html` | Pass | 390px smoke: header/footer rendered, no overflow, focus visible, no console-breaking errors. | No Home-only styling leaked. |
| `/codex.html` | Pass | 390px smoke: header/footer rendered, no overflow, focus visible, no console-breaking errors. | No Home-only styling leaked. |
| `/recruitment.html` | Pass | 390px smoke: audio element existed, native controls were enabled, source remained `./assets/audio/mochiriiiiii.mp3` with `audio/mpeg`, no console-breaking errors. | Intentional large MP3 remains the known warning. |
| `/twills.html` | Pass | 390px smoke: header/footer rendered, no overflow, focus visible, no console-breaking errors. | Protected Twills profile text was not edited. |
| `/announcements.html` | Pass | 390px smoke: header/footer rendered, no overflow, focus visible, no console-breaking errors. | No Home-only styling leaked. |
| `/raffles.html` | Pass | 390px smoke: header/footer rendered, no overflow, focus visible, no console-breaking errors. | No Home-only styling leaked. |
| `/spotify.html` | Pass | 390px smoke: eight cards rendered, iframe title was present, `loading="lazy"` remained, embed did not overflow, no-match search state appeared, `Night` chip filtered to two cards. | Third-party Spotify network playback was not required for this local smoke. |
| `/spotlight.html` | Pass | 390px smoke: header/footer rendered, no overflow, focus visible, no console-breaking errors. | No Home-only styling leaked. |

## 4. Preserved Data Review

Data files reviewed after PR #66:

- `data/announcements.json`
- `data/codex.json`
- `data/events.json`
- `data/home.json`
- `data/join.json`
- `data/leaders.json`
- `data/raffles.json`
- `data/ranks.json`
- `data/recruitment.json`
- `data/spotlight.json`
- `data/twills.json`

Observed result:

- JSON parsed successfully for every reviewed data file.
- Rendered page smoke checks did not reveal an unsupported schema break.
- `data/home.json` had no branch diff.
- `data/recruitment.json` had no branch diff.
- `data/twills.json` had no branch diff.
- Protected content remained unchanged.

## 5. Issues Found

No real Home visual regression, cross-page regression, accessibility blocker, data-rendering blocker, or protected-content issue was found.

## 6. Fixes Made

None. This branch is report-only.

## 7. Cache Query Note

`styles.css` was not changed in this branch, so no production cache-query change was needed. The Home visual pilot CSS remains as merged in PR #67.

## 8. Validation

| Command / Check | Result | Notes |
| --- | --- | --- |
| `npm run check` | Passed | Known intentional MP3 size warning remains. |
| `git diff --check` | Passed | No whitespace errors. |
| `npm run check:production` | Passed | Production URLs remained reachable. |
| `node scripts/check-json.mjs` | Passed | JSON valid. |
| `node scripts/check-js.mjs` | Passed | JavaScript syntax valid. |
| `node scripts/check-refs.mjs` | Passed | References valid. |
| `node scripts/check-assets.mjs` | Passed with known warning | `assets/audio/mochiriiiiii.mp3` exceeds normal threshold intentionally. |
| `npm run smoke:gallery` | Passed | Gallery thumbnails/lightbox behavior remained intact. |
| Home Playwright smoke | Passed | 360, 390, 768, and 1440 viewports; no overflow or console-breaking errors. |
| Cross-page Playwright smoke | Passed | 390px smoke for Join, Events, Gallery, Ranks, Leaders, Codex, Recruitment, Twills, Announcements, Raffles, Spotify, and Spotlight. |

## 9. Recommendation

If post-merge validation remains clean, this review supports tagging `v1.5.0-home-visual-system-baseline` before beginning another visual rollout or Supabase planning branch.
