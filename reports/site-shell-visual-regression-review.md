# Site Shell Visual Regression Review

## 1. Shell Visual Regression Audit

Focused QA after the site-shell visual alignment pilot found no shell visual, mobile layout, accessibility, selector-scope, cache-query, or runtime regressions. The audit was report-only; no CSS, HTML, JavaScript, data, asset, docs, workflow, or validation-script changes were made.

| Page | Shell area | Finding | Severity | Evidence | Fix needed? | Notes |
|---|---|---:|---|---|---|---|
| Home `/` | Header, footer, desktop nav, mobile nav, skip link, focus states | No issue | Pass | Viewports: `360px`, `390px`, `768px`, `1440px`; shell area: shared header/footer/nav; observed issue: none; fix made: none; regression result: pass. | No | Active state showed `Home`; page identity remained intact. |
| Join `/join.html` | Header, footer, desktop nav, mobile nav, skip link, focus states | No issue | Pass | Viewports: `360px`, `390px`, `768px`, `1440px`; shell area: shared header/footer/nav; observed issue: none; fix made: none; regression result: pass. | No | Active state showed `Join`; touch targets and focus states remained usable. |
| Events `/events.html` | Header, footer, desktop nav, mobile nav, skip link, focus states | No issue | Pass | Viewports: `360px`, `390px`, `768px`, `1440px`; shell area: shared header/footer/nav; observed issue: none; fix made: none; regression result: pass. | No | Active state showed `Events`; Events visual system remained intact. |
| Gallery `/gallery.html` | Header, footer, desktop nav, mobile nav, skip link, focus states | No issue | Pass | Viewports: `360px`, `390px`, `768px`, `1440px`; shell area: shared header/footer/nav; observed issue: none; fix made: none; regression result: pass. | No | Active state showed `Gallery`; Gallery visual system and lightbox remained intact. |
| Ranks `/ranks.html` | Header, footer, desktop nav, mobile nav, skip link, focus states | No issue | Pass | Viewports: `360px`, `390px`, `768px`, `1440px`; shell area: shared header/footer/nav; observed issue: none; fix made: none; regression result: pass. | No | Active state showed `Ranks`; ceremonial page styling remained intact. |
| Leaders `/leaders.html` | Header, footer, desktop nav, mobile nav, skip link, focus states | No issue | Pass | Viewports: `360px`, `390px`, `768px`, `1440px`; shell area: shared header/footer/nav; observed issue: none; fix made: none; regression result: pass. | No | Active state showed `Leaders`; leader cards did not inherit broken shell styling. |
| Codex `/codex.html` | Header, footer, desktop nav, mobile nav, skip link, focus states | No issue | Pass | Viewports: `360px`, `390px`, `768px`, `1440px`; shell area: shared header/footer/nav; observed issue: none; fix made: none; regression result: pass. | No | Active state showed `Codex`; Codex link behavior remained stable. |
| Recruitment `/recruitment.html` | Header, footer, desktop nav, mobile nav, skip link, focus states | No issue | Pass | Viewports: `360px`, `390px`, `768px`, `1440px`; shell area: shared header/footer/nav; observed issue: none; fix made: none; regression result: pass. | No | Active state showed `Recruitment`; audio panel and long-form reading surface remained intact. |
| Twills `/twills.html` | Header, footer, desktop nav, mobile nav, skip link, focus states | No issue | Pass | Viewports: `360px`, `390px`, `768px`, `1440px`; shell area: shared header/footer/nav; observed issue: none; fix made: none; regression result: pass. | No | Twills has no header nav item; existing active-state fallback did not change. Twills visual identity remained distinct. |
| Announcements `/announcements.html` | Header, footer, desktop nav, mobile nav, skip link, focus states | No issue | Pass | Viewports: `360px`, `390px`, `768px`, `1440px`; shell area: shared header/footer/nav; observed issue: none; fix made: none; regression result: pass. | No | Active state showed `Announcements`; side-page compact styling remained intact. |
| Raffles `/raffles.html` | Header, footer, desktop nav, mobile nav, skip link, focus states | No issue | Pass | Viewports: `360px`, `390px`, `768px`, `1440px`; shell area: shared header/footer/nav; observed issue: none; fix made: none; regression result: pass. | No | Active state showed `Raffles`; external link presentation stayed stable. |
| Spotify `/spotify.html` | Header, footer, desktop nav, mobile nav, skip link, focus states | No issue | Pass | Viewports: `360px`, `390px`, `768px`, `1440px`; shell area: shared header/footer/nav; observed issue: none; fix made: none; regression result: pass. | No | Active state showed `Playlists`; embeds and filters remained stable. |
| Spotlight `/spotlight.html` | Header, footer, desktop nav, mobile nav, skip link, focus states | No issue | Pass | Viewports: `360px`, `390px`, `768px`, `1440px`; shell area: shared header/footer/nav; observed issue: none; fix made: none; regression result: pass. | No | Active state showed `Spotlight`; side-page visual system remained intact. |

## 2. Shell Behavior Regression Audit

| Area | Check | Result | Evidence | Notes |
|---|---|---:|---|---|
| Desktop brand link | Brand link resolves to `./index.html`. | Pass | Viewport: `1440px`; shell area: header brand; observed issue: none; fix made: none; regression result: pass. | Header HTML unchanged. |
| Desktop primary nav | All nav labels and hrefs matched `header.html`. | Pass | Viewports: `360px`, `390px`, `768px`, `1440px`; shell area: desktop and mobile nav; observed issue: none; fix made: none; regression result: pass. | Header links, labels, and routes unchanged. |
| Desktop dropdowns | Guild, Culture, and Updates open, close on Escape, and ArrowDown moves focus to the first item. | Pass | Viewport: `1440px`; shell area: dropdown navigation; observed issue: none; fix made: none; regression result: pass. | `aria-expanded` updated as expected. |
| Active/current page state | Current page state is clear where a page has a header nav item. | Pass | Viewports: `360px`, `390px`, `768px`, `1440px`; shell area: active nav; observed issue: none; fix made: none; regression result: pass. | Twills has no header nav item; existing fallback was not changed. |
| Focus order | Header, mobile nav, skip link, dropdown, and footer controls remain keyboard reachable. | Pass | Viewports: `390px`, `1440px`; shell area: focus states; observed issue: none; fix made: none; regression result: pass. | Focus rings stayed visible after the pilot. |
| Footer links | Footer nav links matched `footer.html`. | Pass | Viewports: `360px`, `390px`, `768px`, `1440px`; shell area: footer nav; observed issue: none; fix made: none; regression result: pass. | Footer links unchanged. |
| Mobile menu open | `#menu-btn` opens `#mobile-menu`, sets `aria-expanded="true"`, locks body overflow, and moves focus to close. | Pass | Viewport: `390px`; shell area: mobile nav; observed issue: none; fix made: none; regression result: pass. | Close button and mobile links measured at usable touch-target sizes. |
| Mobile menu close | Menu button, Escape, and scrim close the panel. | Pass | Viewport: `390px`; shell area: mobile nav; observed issue: none; fix made: none; regression result: pass. | Focus returned to the menu button when supported. |
| Mobile keyboard reachability | Mobile links remain reachable and focus does not escape the dialog while open. | Pass | Viewport: `390px`; shell area: mobile nav focus; observed issue: none; fix made: none; regression result: pass. | No lost-focus or trap regression observed. |
| Skip link | Skip link appears on keyboard focus and jumps to `#main`. | Pass | Viewport: `390px`; shell area: skip link; observed issue: none; fix made: none; regression result: pass. | Main content landed at viewport top without layout break. |
| Supabase signed-out shell | Signed-out public browsing produced no shell runtime errors. | Pass | Viewports: `360px`, `390px`, `768px`, `1440px`; shell area: all pages; observed issue: none; fix made: none; regression result: pass. | `window.MochiriiSupabase` remained available and non-blocking. |

## 3. Cross-Page Feature Regression Audit

| Area | Result | Evidence | Notes |
|---|---:|---|---|
| Home | Pass | Hero, doors/cards, and guild seal poem rendered; observed issue: none; fix made: none; regression result: pass. | Protected seal verse checked against rendered lines. |
| Join | Pass | Checklist rendered with 5 items; Discord link kept safe attrs; Codex, Events, and Ranks links resolved. | Join shell and onboarding behavior unchanged. |
| Events | Pass | Default filter was Upcoming; Past and All filters worked; All rendered the expected event count. | UTC-safe classification and sorting behavior unchanged. |
| Gallery | Pass | All showed 70 images; category counts were Portraits 22, Gatherings 22, Action 6, Scenery 5, Companions 15. | URL state, Back/Forward, Copy link, thumbnails, full-image lightbox, and captions passed. |
| Recruitment | Pass | Protected body and conclusion matched JSON; audio source, controls, and accessible labeling rendered. | Recruitment audio behavior unchanged. |
| Codex | Pass | Content rendered and View Ranks link resolved to `./ranks.html`. | Data/link behavior stable. |
| Ranks | Pass | Rank order, tier groups, and rank images rendered from data. | Rank hierarchy unchanged. |
| Leaders | Pass | Leader order matched data and Twills profile link resolved. | Leader link behavior unchanged. |
| Twills | Pass | `profile.bio`, badges, hero image, and avatar paths matched data. | Twills stayed visually distinct and Twills data was unchanged. |
| Announcements | Pass | Notices rendered and pinned notice remained first. | Side-page behavior stable. |
| Raffles | Pass | Rules, prizes/note area, and links rendered with safe external attributes where needed. | Footer/header shell did not affect side-page link styling. |
| Spotify | Pass | Search, tag filters, no-match state, iframe titles, `loading="lazy"`, and normalized embed URLs passed. | Spotify behavior unchanged. |
| Spotlight | Pass | Body, conclusion, and highlights rendered with expected highlight count. | Spotlight side-page layout stable. |
| Gallery smoke script | Pass | `npm run smoke:gallery` passed against local server on port `8765`. | Confirms gallery behavior outside the browser QA script too. |

## 4. Protected and Immutable Content Audit

| File or behavior | Result | Evidence | Notes |
|---|---:|---|---|
| `data/home.json` `seal.verse` | Pass | `git diff -- data/home.json` was empty; rendered verse lines matched JSON. | Guild seal poem unchanged. |
| `data/recruitment.json` `content.paragraphs` | Pass | `git diff -- data/recruitment.json` was empty; rendered body matched JSON. | Recruitment body unchanged. |
| `data/recruitment.json` `content.conclusion` | Pass | `git diff -- data/recruitment.json` was empty; rendered conclusion matched JSON. | Recruitment conclusion unchanged. |
| `data/twills.json` `profile.bio` | Pass | `git diff -- data/twills.json` was empty; rendered bio matched JSON. | Twills profile body unchanged. |
| Header links and labels | Pass | `git diff -- header.html` was empty; browser nav-link extraction matched the expected header list. | Header HTML unchanged. |
| Footer links | Pass | `git diff -- footer.html` was empty; browser footer-link extraction matched the expected footer list. | Footer HTML unchanged. |
| `site.js` behavior | Pass | `git diff -- site.js` was empty; browser smoke confirmed mobile menu, Escape close, focus return, dropdown, skip-link, and shell mount behavior. | Script order and shell behavior unchanged. |

## 5. Fix Decision

No real shell visual, accessibility, mobile layout, selector-scope, runtime, or feature regressions were found. This QA branch stayed report-only.

- CSS changed: no.
- HTML changed: no.
- JavaScript changed: no.
- Data changed: no.
- Fixes made: none.

## 6. Cache Query

- CSS changed: no.
- Cache-query changed: no.
- Reason: no regression fix required a stylesheet change, and this repo does not use a shared stylesheet cache-query convention outside Gallery's page-specific convention.

## 7. Validation

| Command | Result | Notes |
|---|---:|---|
| `npm run check` | Pass | Includes expected large MP3 warning for `assets/audio/mochiriiiiii.mp3`. |
| `git diff --check` | Pass | No whitespace errors. |
| `node scripts/check-json.mjs` | Pass | JSON validation passed. |
| `node scripts/check-js.mjs` | Pass | JavaScript validation passed. |
| `node scripts/check-refs.mjs` | Pass | Reference validation passed. |
| `node scripts/check-assets.mjs` | Pass | Asset validation passed with the known intentional MP3 size warning. |
| `npm run check:production` | Pass | Production validation passed with known intentional warning only. |
| `npm run smoke:gallery` | Pass | Local server was running on `http://127.0.0.1:8765`. |
| Browser shell and feature smoke | Pass | 13 public pages checked at `360px`, `390px`, `768px`, and `1440px`; targeted shell and feature interactions passed. |

## 8. Visual Evidence

Screenshots captured: no.

Browser-smoke evidence was text-based:

- All public pages returned `200`, rendered one `h1`, mounted header/footer, had no horizontal overflow, and produced no console-breaking or page-level runtime errors.
- Shell sweep covered `360px`, `390px`, `768px`, and `1440px` for all public pages.
- Mobile nav behavior was verified at `390px`: open, close, Escape close, scrim close, `aria-expanded`, focus return, dialog focus retention, and usable touch targets.
- Desktop dropdown behavior was verified at `1440px`: open, Escape close, and ArrowDown focus movement.
- Skip link behavior was verified at `390px`: visible on focus and jumped to `#main`.
- Key page features were verified after shell alignment, including Gallery, Events, Recruitment audio, Spotify, and protected content rendering.

## 9. Deferred Polish Ideas

No non-blocking shell polish ideas were implemented in this regression-only branch. Twills has no header nav item, so the existing active-nav fallback is not treated as a regression here; any future decision to add profile-level shell state should be handled in a separate design/navigation branch.
