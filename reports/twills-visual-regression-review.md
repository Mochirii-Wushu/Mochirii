# Twills Visual Regression Review

## 1. Twills Visual Regression Audit

Twills was audited after the merged visual signature pilot at `360px`, `390px`, `768px`, and `1440px` using the local static server at `http://127.0.0.1:8765/twills.html`. The audit found no visual, accessibility, layout, selector-scope, cache-query, runtime, or protected-content regression. This branch is report-only.

| Area | Finding | Severity | Evidence | Fix needed? | Notes |
| --- | --- | --- | --- | --- | --- |
| Page load and shell | Twills loaded cleanly with the shared header and footer at every checked viewport. | Pass | `360px`, `390px`, `768px`, `1440px`; page `twills.html`; selectors `.site-header`, `.site-footer`, `#main`; observed issue: none; fix made: none; regression result: pass. | No | Status `200`; no local request failures or console-breaking errors. |
| Hero/profile render | Hero/profile presentation remained clean and stable after the Twills pilot. | Pass | `360px`, `390px`, `768px`, `1440px`; selectors `#twillsHeroImage`, `.hero-intro`; observed issue: none; fix made: none; regression result: pass. | No | Hero image completed with natural size `1536x1024`; no horizontal overflow. |
| Portrait/avatar framing | Avatar frame remained stable, portrait-forward, and scoped to Twills. | Pass | `360px`, `390px`, `768px`, `1440px`; selector `#twillsAvatar`; observed issue: none; fix made: none; regression result: pass. | No | Avatar completed with natural size `787x909`; rendered frame stayed within viewport at all sizes. |
| `profile.bio` reading surface | Bio remained readable and visually distinct as the personal-note surface. | Pass | `360px`, `390px`, `768px`, `1440px`; selector `#twillsBio`; observed issue: none; fix made: none; regression result: pass. | No | Four rendered paragraphs exactly matched `data/twills.json` `profile.bio`. |
| Badge/seal treatment | Badges remained readable, wrapped safely, and stayed text-only. | Pass | `360px`, `390px`, `768px`, `1440px`; selector `#twillsBadges > span`; observed issue: none; fix made: none; regression result: pass. | No | Four rendered badge strings exactly matched `data/twills.json` `profile.badges`. |
| Image paths | Twills hero and avatar paths remained unchanged. | Pass | `360px`, `390px`, `768px`, `1440px`; selectors `#twillsHeroImage`, `#twillsAvatar`; observed issue: none; fix made: none; regression result: pass. | No | Hero path stayed `./assets/img/profiles/twills/hero.webp`; avatar path stayed `./assets/img/profiles/twills/avatar.webp`. |
| Mobile layout | Mobile layout had no horizontal overflow or broken wrapping. | Pass | `360px`, `390px`; sections `.hero-intro`, `#twillsBadges`, `.page-main`, `#twillsBio`; observed issue: none; fix made: none; regression result: pass. | No | `scrollWidth - clientWidth` was `0` for document and body. |
| Desktop/tablet layout | Tablet and desktop layout remained balanced and readable. | Pass | `768px`, `1440px`; selectors `.grid-12`, `.col-4`, `.col-8`, `#twillsBio`; observed issue: none; fix made: none; regression result: pass. | No | Bio stayed within a readable measure; portrait card stayed supportive. |
| Focus states | Shared focus states remained visible. | Pass | `360px`, `390px`, `768px`, `1440px`; selector `.skip-link`; observed issue: none; fix made: none; regression result: pass. | No | Browser smoke observed visible outline/box-shadow focus feedback. |
| Border and motion behavior | No noisy/random border animation returned. | Pass | `360px`, `390px`, `768px`, `1440px`; selectors `.hero-intro`, `.page-main .glass-card`, `.badge-row > span`; observed issue: none; fix made: none; regression result: pass. | No | Computed `animation-name` was `none` for sampled Twills cards and badges. |
| Reduced-motion safety | Reduced-motion smoke found no unsafe active Twills motion. | Pass | `360px`, `390px`, `768px`, `1440px` with reduced motion; sampled Twills panels and badges; observed issue: none; fix made: none; regression result: pass. | No | The pilot remains static CSS with no JavaScript-driven visual effects. |
| Distinct page identity | Twills remained distinct from Leaders, Recruitment, Gallery, and Home while staying in-family. | Pass | `390px` cross-page smoke; selector scope `body[data-page="twills"]`; observed issue: none; fix made: none; regression result: pass. | No | `--twills-moon` was present on Twills and absent on all non-Twills pages checked. |
| Selector scope | Twills visual variables and panel styles did not leak to other pages. | Pass | `390px`; routes `/`, `/join.html`, `/events.html`, `/gallery.html`, `/ranks.html`, `/leaders.html`, `/codex.html`, `/recruitment.html`, `/announcements.html`, `/raffles.html`, `/spotify.html`, `/spotlight.html`; observed issue: none; fix made: none; regression result: pass. | No | All sampled non-Twills pages loaded with header/footer, one `h1`, visible focus state, no overflow, and no Twills CSS variable leakage. |

## 2. Twills Behavior/Data Regression Audit

| Check | Result | Evidence | Notes |
| --- | --- | --- | --- |
| `profile.bio` render | Pass | `#twillsBio p` rendered four paragraphs exactly matching `data/twills.json` `profile.bio`. | Protected body text unchanged. |
| Badges render | Pass | `#twillsBadges > span` rendered four badges exactly matching `data/twills.json` `profile.badges`. | Badge content unchanged and remains text-only. |
| Hero/avatar images | Pass | `#twillsHeroImage` path matched `./assets/img/profiles/twills/hero.webp`; `#twillsAvatar` path matched `./assets/img/profiles/twills/avatar.webp`. | Image paths unchanged. |
| Heading order | Pass | Rendered headings were `H1:Twills`, `H2:Portrait`, `H2:Bio`. | Sensible profile heading order preserved. |
| Signed-out browsing | Pass | Twills rendered with `window.MochiriiSupabase` available and no page/runtime errors. | Supabase shell did not block signed-out browsing. |
| Rendering behavior | Pass | `twills.js` still renders data-derived text with `textContent`; no HTML/JS changes were made. | Behavior unchanged. |

## 3. Cross-Page Regression Audit

Cross-page smoke was run at `390px` for the public pages most likely to expose selector leakage from the Twills visual pilot.

| Page | Result | Evidence | Notes |
| --- | --- | --- | --- |
| `/` | Pass | Status `200`; header/footer rendered; one `h1`; no overflow; no Twills variable leakage. | Home visual system remained intact. |
| `/join.html` | Pass | Status `200`; header/footer rendered; one `h1`; no overflow; no Twills variable leakage. | Join visual system remained intact. |
| `/events.html` | Pass | Status `200`; header/footer rendered; one `h1`; no overflow; no Twills variable leakage. | Events visual system remained intact. |
| `/gallery.html` | Pass | Status `200`; header/footer rendered; one `h1`; no overflow; no Twills variable leakage; `70` gallery thumbs rendered. | Filter counts rendered as `All 70`, `Portraits 22`, `Gatherings 22`, `Action 6`, `Scenery 5`, `Companions 15`. |
| `/ranks.html` | Pass | Status `200`; header/footer rendered; one `h1`; no overflow; no Twills variable leakage. | Ranks visual system remained intact. |
| `/leaders.html` | Pass | Status `200`; header/footer rendered; one `h1`; no overflow; no Twills variable leakage. | Leaders visual system remained distinct from Twills. |
| `/codex.html` | Pass | Status `200`; header/footer rendered; one `h1`; no overflow; no Twills variable leakage. | Codex visual system remained intact. |
| `/recruitment.html` | Pass | Status `200`; header/footer rendered; one `h1`; no overflow; no Twills variable leakage; audio rendered with controls and label/description references. | Audio source remained `./assets/audio/mochiriiiiii.mp3`. |
| `/announcements.html` | Pass | Status `200`; header/footer rendered; one `h1`; no overflow; no Twills variable leakage. | Side Pages visual system remained intact. |
| `/raffles.html` | Pass | Status `200`; header/footer rendered; one `h1`; no overflow; no Twills variable leakage. | Side Pages visual system remained intact. |
| `/spotify.html` | Pass | Status `200`; header/footer rendered; one `h1`; no overflow; no Twills variable leakage; `8` Spotify cards/iframes rendered. | Iframe titles remained meaningful, `loading="lazy"` remained present, search no-match and tag filtering worked. |
| `/spotlight.html` | Pass | Status `200`; header/footer rendered; one `h1`; no overflow; no Twills variable leakage. | Side Pages visual system remained intact. |

Gallery behavior was also covered by `npm run smoke:gallery`, which confirmed the lightbox opens the full image path and not `/thumbs/`.

## 4. Protected and Immutable Content Audit

| Content | Result | Evidence | Notes |
| --- | --- | --- | --- |
| `data/home.json` `seal.verse` | Pass | `git diff -- data/home.json` returned no diff. | Guild seal poem unchanged. |
| `data/twills.json` | Pass | `git diff -- data/twills.json` returned no diff. | Twills data unchanged. |
| `data/twills.json` `profile.bio` | Pass | Rendered text exactly matched the JSON and the file diff was empty. | Protected Twills body text unchanged. |
| `data/twills.json` badges | Pass | Rendered badges exactly matched the JSON and the file diff was empty. | Badge content unchanged. |
| Twills image paths | Pass | Rendered hero/avatar paths matched JSON and the file diff was empty. | Image paths unchanged. |
| `data/recruitment.json` protected body/conclusion | Pass | `git diff -- data/recruitment.json` returned no diff. | Recruitment body and conclusion unchanged. |

## 5. Fix Decision

No real Twills visual, accessibility, mobile/layout, selector-scope, cache-query, runtime, or protected-content regressions were found. No CSS, HTML, JavaScript, data, asset, docs, workflow, or validation-script changes were made.

## 6. Cache Query

| Item | Result | Reason |
| --- | --- | --- |
| CSS changed in this QA branch? | No | No regression fix was required. |
| Cache-query changed? | No | Twills does not use a Gallery-style page-specific stylesheet query convention, and this report-only branch did not require cache changes. |

## 7. Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npm run check` | Pass | Full repo validation completed; known MP3 size warning only. |
| `git diff --check` | Pass | No whitespace errors. |
| `node scripts/check-json.mjs` | Pass | `JSON OK (16 files).` |
| `node scripts/check-js.mjs` | Pass | `JavaScript syntax OK (23 files).` |
| `node scripts/check-refs.mjs` | Pass | `Local references OK (420 refs checked).` |
| `node scripts/check-assets.mjs` | Pass with known warning | Checked `214` asset files; `assets/audio/mochiriiiiii.mp3` remains over the normal threshold intentionally. |
| `npm run check:production` | Pass | `Production smoke check OK.` |
| `npm run smoke:gallery` | Pass | `Gallery lightbox smoke OK.` Local server on port `8765`. |
| Twills desktop/mobile browser smoke | Pass | `360px`, `390px`, `768px`, `1440px`; no overflow, no console-breaking errors, protected render stable. |
| Twills behavior/data smoke | Pass | Bio, badges, images, heading order, and signed-out browsing stable. |
| Cross-page browser smoke | Pass | All requested public pages checked at `390px`; no Twills selector leakage or visible shell regressions. |

## 8. Visual Evidence

Screenshots captured: no.

Browser smoke evidence was captured in text:

- Twills `360px`: status `200`; header/footer rendered; one `h1`; no overflow; four bio paragraphs matched JSON; four badges matched JSON; hero/avatar paths matched JSON; focus visible; sampled animations `none`.
- Twills `390px`: status `200`; header/footer rendered; one `h1`; no overflow; four bio paragraphs matched JSON; four badges matched JSON; hero/avatar paths matched JSON; focus visible; sampled animations `none`.
- Twills `768px`: status `200`; header/footer rendered; one `h1`; no overflow; four bio paragraphs matched JSON; four badges matched JSON; hero/avatar paths matched JSON; focus visible; sampled animations `none`.
- Twills `1440px`: status `200`; header/footer rendered; one `h1`; no overflow; four bio paragraphs matched JSON; four badges matched JSON; hero/avatar paths matched JSON; focus visible; sampled animations `none`.
- Cross-page `390px`: `/`, `/join.html`, `/events.html`, `/gallery.html`, `/ranks.html`, `/leaders.html`, `/codex.html`, `/recruitment.html`, `/announcements.html`, `/raffles.html`, `/spotify.html`, and `/spotlight.html` loaded without overflow, console-breaking errors, or Twills CSS variable leakage.

## 9. Deferred Polish Ideas

No blocking or regression-related polish was found. Any subjective Twills refinements should wait for a separate future design branch because this branch is regression-only.
