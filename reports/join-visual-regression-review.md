# Join Visual Regression Review

## 1. Baseline

- Branch: `qa/join-visual-regression-review`
- Source baseline: `b03875b` (`Merge pull request #74 from Mochirii-Wushu/design/join-visual-onboarding-pilot`)
- Source pilot: `design/join-visual-onboarding-pilot`
- Mode: regression QA only; report-only because no real regressions were found.
- Known accepted warning: `assets/audio/mochiriiiiii.mp3` intentionally exceeds the normal large-asset threshold.
- Known external annotation: GitHub-managed Pages deployment may still emit the Node.js 20 annotation.

## 2. Join Visual Regression Audit

| Area | Finding | Severity | Evidence | Fix needed? | Notes |
| --- | --- | --- | --- | --- | --- |
| Page load and shell | Join page loads with shared shell intact. | Pass | Viewports 360, 390, 768, 1440; `.site-header` and `.site-footer` rendered; page returned HTTP 200; no console-breaking errors. | No | Local browser smoke only; production behavior covered by `npm run check:production`. |
| Hero readability | Hero image, intro panel, metadata, and badges remain readable. | Pass | Viewports 360, 390, 768, 1440; one `h1`; hero and intro panel stayed within viewport. | No | Join keeps its jade/lotus/lantern identity. |
| Joining path / steps | Joining path renders cleanly and remains readable. | Pass | Viewports 360, 390, 768, 1440; `#joinStepsList` rendered 5 items; first step used a stable solid path-card surface. | No | Ordered-list semantics remain intact. |
| Quick Start / action surface | Quick Start remains clear and action-oriented. | Pass | Viewports 360, 390, 768, 1440; `#joinLinks` rendered 4 links; first action remained visually emphasized. | No | Discord emphasis is clear without hiding Events, Codex, or Ranks. |
| Newcomer checklist | Checklist remains readable and well structured. | Pass | Viewports 360, 390, 768, 1440; `.join-checklist__item` rendered 5 cards; first marker rendered `01`; no overflow. | No | Checklist remains non-interactive, as intended. |
| Checklist markers | Markers remain clear and decorative. | Pass | Viewports 360, 390, 768, 1440; `.join-checklist__marker` rendered stable numbered markers and remained inside the card grid. | No | `aria-hidden` marker behavior unchanged in source. |
| CTA/link clarity | Discord, Codex, Events, Ranks, checklist, and notes links remain clear. | Pass | Quick-start and notes links measured 56px tall; checklist links measured 45px tall. | No | Touch targets remain usable. |
| Focus states | Focus is visible and page-aligned. | Pass | `#joinLinks a` and `.join-checklist__link` focus returned a 2px solid outline with `rgba(244, 255, 248, 0.78)`. | No | Keyboard reachability preserved. |
| Border/motion behavior | No noisy/random border behavior appears on Join. | Pass | `.page-main .glass-card`, `#joinBadges > span`, and `#joinLinks > span` all returned `animation-name: none`. | No | The pilot's animation cleanup holds. |
| Mobile layout | No horizontal overflow. | Pass | Viewports 360, 390, 768, 1440 all had `scrollWidth === clientWidth`. | No | Checklist grid collapses safely. |
| Reduced motion | Reduced-motion behavior is safe. | Pass | 390px reduced-motion smoke returned no card/badge animation and shortened checklist transitions. | No | No new motion was added by QA. |
| Visual identity | Join does not look like a direct Home, Gallery, or Recruitment clone. | Pass | `--join-jade` present on Join; `--home-jade`, `--gallery-moon`, and `--recruit-lantern` absent on Join. | No | Uses shared visual-system discipline with page-specific palette. |

## 3. Join Behavior and Link Audit

| Check | Result | Evidence |
| --- | --- | --- |
| Join data renders unchanged | Pass | Browser smoke rendered 5 steps, 4 quick-start links, 5 checklist items, 4 culture cards, and 2 notes links. |
| Checklist content renders unchanged | Pass | Checklist item count stayed 5; item titles, body text, and link labels are data-rendered and no data diff exists. |
| Discord link | Pass | `Join Discord` and `Open Discord` retained `https://discord.com/invite/dPafqMwWPK`. |
| Discord safe attributes | Pass | Discord links retained `target="_blank"` and `rel="noopener noreferrer"`. |
| Codex link | Pass | `Guild Codex` and `Read the Codex` retained `./codex.html`. |
| Events link | Pass | `Events` and `View Events` retained `./events.html`. |
| Ranks link | Pass | `Ranks` retained `./ranks.html`. |
| Notes links | Pass | `Leaders Hall` retained `./leaders.html`; `Home` retained `./index.html`. |
| Keyboard reachability | Pass | Quick-start and checklist links were focusable in browser smoke with visible outlines. |
| Console errors | Pass | No console-breaking errors during Join browser smoke at checked viewports. |

## 4. Cross-Page Regression Audit

| Page | Result | Notes |
| --- | --- | --- |
| `/` | Pass | Home visual variables remained intact; no Join variable leakage. |
| `/events.html` | Pass | Page loaded, shell rendered, no overflow; Events filter changed from Upcoming to Past. |
| `/gallery.html` | Pass | Page loaded, no overflow, Gallery count showed 70 images, and 70 thumbnails rendered. |
| `/ranks.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/leaders.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/codex.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/recruitment.html` | Pass | Page loaded, shell rendered, no overflow; `#recruitmentAudio` rendered with `./assets/audio/mochiriiiiii.mp3`. |
| `/twills.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/announcements.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/raffles.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/spotify.html` | Pass | Page loaded, 8 embeds rendered, Night chip filtered to 2 embeds, no-match search state appeared, no overflow. |
| `/spotlight.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |

`npm run smoke:gallery` also passed.

## 5. Protected and Immutable Content

- `data/home.json` `seal.verse`: unchanged.
- `data/join.json`: unchanged.
- `data/recruitment.json` `content.paragraphs`: unchanged.
- `data/recruitment.json` `content.conclusion`: unchanged.
- `data/twills.json` `profile.bio`: unchanged.
- Join copy, checklist content, and link destinations: unchanged.

## 6. Fixes Made

None. This branch is report-only.

## 7. Cache Query

- `styles.css` changed in this QA branch: no.
- Cache-query changed in this QA branch: no.
- Reason: no regression fixes were needed, and Join does not currently use a page-specific stylesheet query convention like Gallery.

## 8. Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npm run check` | Pass | Known large-audio warning remains accepted. |
| `git diff --check` | Pass | No whitespace issues. |
| `node scripts/check-json.mjs` | Pass | JSON remains valid. |
| `node scripts/check-js.mjs` | Pass | JavaScript syntax checks pass. |
| `node scripts/check-refs.mjs` | Pass | References resolve. |
| `node scripts/check-assets.mjs` | Pass with known warning | `assets/audio/mochiriiiiii.mp3` remains intentionally above threshold. |
| `npm run check:production` | Pass | Production smoke check OK. |
| `npm run smoke:gallery` | Pass | Local server on port 8765. |
| Join browser smoke | Pass | Local 360, 390, 768, 1440. |
| Cross-page browser smoke | Pass | Checked 12 public pages at 390px. |

## 9. Visual Evidence

- Committed screenshots: none.
- Browser-smoke evidence is recorded above with viewport, selector or section, observed result, and regression result.
- No screenshot assets were committed.

## 10. Deferred Polish Ideas

No real regressions or necessary fixes were found. Any future subjective Join polish should wait for a separate design branch rather than this regression-only QA branch.

## 11. Recommendation

Tag `v1.8.0-join-visual-baseline` if post-merge validation remains clean.
