# Recruitment Visual Regression Review

## 1. Baseline

- Branch: `qa/recruitment-visual-regression-review`
- Source baseline: `ffde7bf` (`Merge pull request #72 from Mochirii-Wushu/design/recruitment-visual-readability-pilot`)
- Source pilot: `design/recruitment-visual-readability-pilot`
- Mode: regression QA only; report-only because no real regressions were found.
- Known accepted warning: `assets/audio/mochiriiiiii.mp3` intentionally exceeds the normal large-asset threshold.
- Known external annotation: GitHub-managed Pages deployment may still emit the Node.js 20 annotation.

## 2. Recruitment Visual Regression Audit

| Area | Finding | Severity | Evidence | Fix needed? | Notes |
| --- | --- | --- | --- | --- | --- |
| Page load and shell | Recruitment page loads with shared shell intact. | Pass | Viewports 360, 390, 768, 1440; `.site-header` and `.site-footer` rendered; no console-breaking errors. | No | Local and production browser smokes both returned page status 200. |
| Hero/meta | Hero and intro/meta panel render cleanly. | Pass | Viewports 360, 390, 768, 1440; `.page-hero`, `.hero-intro`, meta row, and badges remained inside viewport. | No | Recruitment keeps warm lantern/lotus identity, not Home/Gallery cloning. |
| Audio block | Audio card renders cleanly and remains usable. | Pass | Viewports 360, 390, 768, 1440; `#recruitmentAudio` stayed within viewport and retained native controls. | No | Audio source and label relationship unchanged. |
| Audio focus | Audio focus state is visible. | Pass | `#recruitmentAudio:focus-visible` produced a 2px warm outline with 4px offset in browser smoke. | No | Native browser controls remain in use. |
| Long-form body | Protected body remains readable. | Pass | `#recruitmentBody` rendered 7 paragraphs; body width ranged from 286px to 720px with line-height around 1.78-1.82. | No | Text is unchanged and not crowded. |
| Conclusion panel | Protected conclusion remains readable and visually distinct. | Pass | `#recruitmentConclusion` rendered 1 paragraph with a distinct lotus/lantern panel and no overflow. | No | Text is unchanged. |
| Panel hierarchy | Hero intro, audio, body, and conclusion tiers remain clear. | Pass | Recruitment-specific CSS variables present; card animation returned `none`; badges also returned `animation-name: none`. | No | No noisy/random border behavior remains. |
| Mobile layout | No horizontal overflow. | Pass | Viewports 360, 390, 768, 1440 all had `scrollWidth === clientWidth`. | No | Audio and long-form panels wrap correctly. |
| Reduced motion | Reduced-motion behavior is safe. | Pass | Reduced-motion audit returned no card animation and near-zero audio transition duration. | No | No new motion was added by QA. |
| Visual identity | Recruitment does not look like a direct Home or Gallery clone. | Pass | `--recruit-lantern` present on Recruitment; `--home-jade` and `--gallery-moon` absent on Recruitment. | No | Warm guild-hall treatment remains page-specific. |

## 3. Recruitment Behavior and Audio Audit

| Check | Result | Evidence |
| --- | --- | --- |
| Protected body renders unchanged | Pass | Browser smoke rendered 7 body paragraphs with the expected opening text from JSON. |
| Protected conclusion renders unchanged | Pass | Browser smoke rendered 1 conclusion paragraph with the expected opening text from JSON. |
| Audio element renders | Pass | `#recruitmentAudio` present in local and production smoke. |
| Audio path unchanged | Pass | Rendered source remained `./assets/audio/mochiriiiiii.mp3`. |
| Audio MIME/type | Pass | Rendered source type remained `audio/mpeg`; local `curl -I` returned `Content-type: audio/mpeg`; production returned `audio/mp3`, acceptable for MP3 delivery. |
| Audio source resolves | Pass | Local and production audio URLs returned HTTP 200. |
| Native controls | Pass | `controls=true`, `preload="none"` remained present. |
| Label/description | Pass | `aria-labelledby="recruitmentAudioTitle"` and `aria-describedby="recruitmentAudioDesc"` remained present. |
| Console errors | Pass | No console-breaking errors during local or production Recruitment browser smoke. |

Production checks:

- `https://mochirii.com/recruitment.html`: HTTP 200, rendered header/footer, 7 body paragraphs, 1 conclusion paragraph, native audio source.
- `https://mochirii.com/assets/audio/mochiriiiiii.mp3`: HTTP 200, MP3 content type, expected large file size.

## 4. Cross-Page Regression Audit

| Page | Result | Notes |
| --- | --- | --- |
| `/` | Pass | Home visual variables remained intact; no Recruitment variable leakage. |
| `/join.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/events.html` | Pass | Page loaded, shell rendered, no overflow; Events All filter remained usable. |
| `/gallery.html` | Pass | Page loaded, 70 thumbnails rendered, Gallery count text remained correct, Gallery visual variable remained intact. |
| `/ranks.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/leaders.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/codex.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/twills.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/announcements.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/raffles.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |
| `/spotify.html` | Pass | Page loaded, 8 embeds rendered, search no-match state worked, Night filter showed 2 cards. |
| `/spotlight.html` | Pass | Page loaded, shell rendered, no overflow at 390px. |

`npm run smoke:gallery` also passed.

## 5. Protected and Immutable Content

- `data/home.json` `seal.verse`: unchanged.
- `data/recruitment.json` `content.paragraphs`: unchanged.
- `data/recruitment.json` `content.conclusion`: unchanged.
- `data/twills.json` `profile.bio`: unchanged.
- `assets/audio/mochiriiiiii.mp3`: unchanged.
- Recruitment audio path: unchanged.

## 6. Fixes Made

None. This branch is report-only.

## 7. Cache Query

- `styles.css` changed in this QA branch: no.
- Cache-query changed in this QA branch: no.
- Reason: no regression fixes were needed, and Recruitment does not currently use a page-specific stylesheet query convention like Gallery.

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
| Recruitment browser smoke | Pass | Local 360, 390, 768, 1440; production 390. |
| Cross-page browser smoke | Pass | Checked 12 public pages at 390px. |

## 9. Visual Evidence

- Committed screenshots: none.
- Browser-smoke evidence is recorded above with viewport, selector or section, observed result, and regression result.
- No screenshot assets were committed.

## 10. Deferred Polish Ideas

No real regressions or necessary fixes were found. Any future subjective Recruitment polish should wait for a separate design branch rather than this regression-only QA branch.

## 11. Recommendation

Tag `v1.7.0-recruitment-visual-baseline` if post-merge validation remains clean.
