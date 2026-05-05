# Codex / Ranks / Leaders Visual Regression Review

## 1. Audit Findings

This QA pass reviewed the merged Codex/Ranks/Leaders ceremonial visual pilot as a regression-only branch. No real visual, accessibility, mobile, behavior, data/order, or selector-scope regression was found, so no CSS, HTML, JavaScript, data, asset, docs, workflow, or validation-script changes were made.

| Page | Area | Finding | Severity | Evidence | Fix needed? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Codex | Page load and shell | Codex loads with header/footer and one `h1`. | Pass | `360px`, `390px`, `768px`, `1440px`; `/codex.html`; shell and heading audit; status 200, no console errors; fix made: none; regression result: pass. | No | Page remains clear and practical. |
| Codex | Hero and pills | Hero/intro remain readable and hero pills match data. | Pass | `360px` through `1440px`; `#codexHeroPills`; observed 3 pills; fix made: none; regression result: pass. | No | Pill animation reports `none`. |
| Codex | Tenets | Tenet cards render correctly and remain readable. | Pass | `360px` through `1440px`; `#tenetsGrid`; observed 6 cards matching `data/codex.json`; fix made: none; regression result: pass. | No | Conduct cards retain ceremonial treatment without obscuring text. |
| Codex | Etiquette | Etiquette list blocks render correctly. | Pass | `360px` through `1440px`; `#etiquetteBlocks`; observed 4 blocks matching data; fix made: none; regression result: pass. | No | List rhythm remains readable. |
| Codex | Rhythm and recognition | Rhythm/recognition cards render and `View Ranks` remains stable. | Pass | `360px` through `1440px`; `#rhythmGrid`, `#recGrid`, `#recLink`; observed 4 rhythm cards, 3 recognition cards, href `./ranks.html`; fix made: none; regression result: pass. | No | Recognition link target unchanged. |
| Codex | Focus and motion | Focus remains visible and no noisy border behavior appears. | Pass | `390px`; `#recLink`; observed 2px visible outline, 44px link height, card/pill `animation-name: none`; fix made: none; regression result: pass. | No | Reduced-motion context also reported card/pill animation `none`. |
| Codex | Mobile layout | No document-level horizontal overflow. | Pass | `360px`, `390px`, `768px`, `1440px`; page/document widths matched viewport; fix made: none; regression result: pass. | No | Some inner card measurements appear wider than content box because of grid/card decoration, but document/body do not overflow. |
| Ranks | Page load and shell | Ranks loads with header/footer and one `h1`. | Pass | `360px`, `390px`, `768px`, `1440px`; `/ranks.html`; shell and heading audit; status 200, no console errors; fix made: none; regression result: pass. | No | Page remains progression/service focused. |
| Ranks | Rank groups | Senior, middle, and member groups render. | Pass | `360px` through `1440px`; `#seniorRanks`, `#middleRanks`, `#membersRanks`; observed 3/3/4 cards; fix made: none; regression result: pass. | No | Hierarchy remains visually clear. |
| Ranks | Rank names/order | Rank names, order, and hierarchy remain unchanged. | Pass | `360px` through `1440px`; rank headings; Senior: Guild Leader, Vice Leader, Hall Leader; Middle: Dharmapala, Lotus Warden, Petal Keeper; Members: Mochi Blossom, Young Bamboo, Softwind, Rice Sprout; fix made: none; regression result: pass. | No | Matches `data/ranks.json`. |
| Ranks | Images/emblems | Rank hero and tier images render. | Pass | `360px` through `1440px`; `#ranksHeroImage`, `#seniorImage`, `#middleImage`, `#membersImage`; browser reported images loaded; fix made: none; regression result: pass. | No | No asset paths changed. |
| Ranks | Focus and motion | Page-local focus remains visible and border animation is absent. | Pass | `390px`; `main a.footer-link`; observed 2px visible outline, 44px link height, card/pill `animation-name: none`; fix made: none; regression result: pass. | No | Reduced-motion context safe. |
| Ranks | Mobile layout | No horizontal overflow. | Pass | `360px`, `390px`, `768px`, `1440px`; document/body widths matched viewport; fix made: none; regression result: pass. | No | Duty text remains readable. |
| Leaders | Page load and shell | Leaders loads with header/footer and one `h1`. | Pass | `360px`, `390px`, `768px`, `1440px`; `/leaders.html`; shell and heading audit; status 200, no console errors; fix made: none; regression result: pass. | No | Page remains stewardship/council focused. |
| Leaders | Council roster | Leader cards render and order remains unchanged. | Pass | `360px` through `1440px`; `#leadersGrid`; observed Twills, Vice Leader, Hall Leader, Isawisima, Sinbell, Meenari; fix made: none; regression result: pass. | No | Matches `data/leaders.json`. |
| Leaders | Profile links | Twills profile link remains stable. | Pass | `360px` through `1440px`; `#leadersGrid a.footer-link`; href `./twills.html`; fix made: none; regression result: pass. | No | Profile link behavior unchanged. |
| Leaders | Responsibilities | Responsibility cards render and order remains unchanged. | Pass | `360px` through `1440px`; `#respGrid`; observed Direction & strategy, Ops & coordination, Culture & people; fix made: none; regression result: pass. | No | Responsibility text remains readable. |
| Leaders | Focus and motion | Profile link focus remains visible and no noisy border behavior appears. | Pass | `390px`; `#leadersGrid a.footer-link`; observed 2px visible outline, 44px link height, card/pill `animation-name: none`; fix made: none; regression result: pass. | No | Reduced-motion context safe. |
| Leaders | Mobile layout | No horizontal overflow. | Pass | `360px`, `390px`, `768px`, `1440px`; document/body widths matched viewport; fix made: none; regression result: pass. | No | Leaders does not duplicate Ranks hierarchy visually. |

## 2. Behavior and Data/Order Regression Audit

| Page | Check | Result | Evidence |
| --- | --- | --- | --- |
| Codex | Rendered content unchanged | Pass | Hero pills 3, tenets 6, etiquette blocks 4, rhythm cards 4, recognition cards 3; all match `data/codex.json`. |
| Codex | `View Ranks` link | Pass | `#recLink` remained `./ranks.html`. |
| Ranks | Data renders unchanged | Pass | Senior/middle/member groups rendered 3/3/4 rank cards. |
| Ranks | Rank hierarchy | Pass | Fixed senior, middle, member section order remained unchanged. |
| Ranks | Rank order | Pass | Rendered rank order matched `data/ranks.json` at every checked viewport. |
| Ranks | Images/emblems | Pass | Hero, senior, middle, and members images loaded after scroll smoke. |
| Leaders | Data renders unchanged | Pass | Six leader cards and three responsibility cards rendered. |
| Leaders | Leader order | Pass | Rendered order matched `data/leaders.json`. |
| Leaders | Responsibility order | Pass | Rendered order matched `data/leaders.json`. |
| Leaders | Profile links | Pass | Twills profile link remained `./twills.html`; Return to Home remained `./index.html`. |

## 3. Cross-Page Regression Audit

| Page | Result | Evidence | Notes |
| --- | --- | --- | --- |
| `/` | Pass | `390px`; status 200, header/footer rendered, no console errors, no horizontal overflow; ceremonial variables absent. | Home visual variables remained present. |
| `/join.html` | Pass | `390px`; status 200, header/footer rendered, no console errors, no horizontal overflow; ceremonial variables absent. | Join visual variables remained present. |
| `/events.html` | Pass | `390px`; status 200, header/footer rendered, no console errors, no horizontal overflow; three event filters found. | Events filter surface still renders. |
| `/gallery.html` | Pass | `390px`; status 200, header/footer rendered, no console errors, no horizontal overflow; 70 thumbnails and six filters found. | Gallery visual variables remained present. |
| `/recruitment.html` | Pass | `390px`; status 200, header/footer rendered, no console errors, no horizontal overflow; `#recruitmentAudio` rendered with source `./assets/audio/mochiriiiiii.mp3`. | Recruitment audio still renders. |
| `/twills.html` | Pass | `390px`; status 200, header/footer rendered, no console errors, no horizontal overflow. | No ceremonial leakage. |
| `/announcements.html` | Pass | `390px`; status 200, header/footer rendered, no console errors, no horizontal overflow. | No ceremonial leakage. |
| `/raffles.html` | Pass | `390px`; status 200, header/footer rendered, no console errors, no horizontal overflow. | No ceremonial leakage. |
| `/spotify.html` | Pass | `390px`; status 200, header/footer rendered, no console errors, no horizontal overflow; one search input and eight Spotify iframes found. | Spotify search/embed surface still renders. |
| `/spotlight.html` | Pass | `390px`; status 200, header/footer rendered, no console errors, no horizontal overflow. | No ceremonial leakage. |

`npm run smoke:gallery` returned `Gallery lightbox smoke OK.` during baseline validation.

## 4. Protected and Immutable Content Audit

Protected and immutable diff checks were empty:

- `data/home.json` unchanged; `seal.verse` unchanged.
- `data/codex.json` unchanged.
- `data/ranks.json` unchanged.
- `data/leaders.json` unchanged.
- `data/recruitment.json` unchanged; `content.paragraphs` unchanged.
- `data/recruitment.json` unchanged; `content.conclusion` unchanged.
- `data/twills.json` unchanged; `profile.bio` unchanged.

## 5. Fix Decision

No real visual, accessibility, mobile/layout, selector-scope, cache-query, runtime, semantic, behavior, data/order, or protected-content regression was found.

Fixes made:

- None.

Files intentionally changed in this QA branch:

- `reports/codex-ranks-leaders-visual-regression-review.md`

Cache-query decision:

- CSS changed: no.
- Cache-query changed: no.
- Reason: report-only branch; Codex, Ranks, and Leaders do not use a page-specific stylesheet query convention like Gallery.

## 6. Validation

| Command/check | Result | Notes |
| --- | --- | --- |
| `npm run check` | Pass | Known MP3 warning only. |
| `git diff --check` | Pass | No whitespace errors. |
| `node scripts/check-json.mjs` | Pass | JSON OK. |
| `node scripts/check-js.mjs` | Pass | JavaScript syntax OK. |
| `node scripts/check-refs.mjs` | Pass | Local references OK. |
| `node scripts/check-assets.mjs` | Pass with warning | Known `assets/audio/mochiriiiiii.mp3` size warning only. |
| `npm run check:production` | Pass | Production smoke check OK. |
| `npm run smoke:gallery` | Pass | Gallery lightbox smoke OK. |

Known warnings:

- `assets/audio/mochiriiiiii.mp3` intentionally exceeds the normal large-asset threshold.
- GitHub-managed Pages deployment may still emit the known non-blocking Node.js 20 annotation.

## 7. Visual Evidence

Screenshots captured: no.

Browser-smoke evidence:

- Codex, Ranks, and Leaders were checked at `360px`, `390px`, `768px`, and `1440px`.
- Cross-page regression routes were checked at `390px`.
- No screenshots were committed because text browser metrics were sufficient and no visual regression required image evidence.

## 8. Deferred Polish Ideas

None found during this regression-only QA pass. Minor future polish should wait for a separately scoped design branch rather than this report-only QA branch.
