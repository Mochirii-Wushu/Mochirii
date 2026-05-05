# Events Visual Regression Review

## 1. Audit Findings

This QA review covered the merged Events visual schedule pilot after PR #80. The branch is report-only because no visual, accessibility, mobile, selector-scope, date, filter, sorting, rendering, or cross-page regressions were found.

| Area | Finding | Severity | Evidence | Fix needed? | Notes |
|---|---|---:|---|---:|---|
| Page load | Events page loads with body scope, header, footer, hero, metadata, Featured Event, Event Board, Recurring Events, and Participation rendered. | Pass | Viewports 360px, 390px, 768px, 1440px; page `/events.html`; sections `body[data-page="events"]`, `#header`, `#footer`, `#eventsHeading`, `#featuredCard`, `#eventsUpcoming`; observed complete page state; fix made: none; regression result: pass. | No | Browser smoke reported no console-breaking errors. |
| Hero/meta readability | Hero and metadata remain readable after the visual pilot. | Pass | Viewports 360px, 390px, 768px, 1440px; selectors `#eventsHeading`, `#eventsIntro`, `.meta-row`, `#eventsBadges`; observed `Events`, `Updated Feb 01, 2026`, `UTC+8`, and one badge rendered cleanly; fix made: none; regression result: pass. | No | Meta and badge copy are data-derived and unchanged. |
| Filter rendering | Upcoming, Past, and All controls render cleanly and remain usable touch targets. | Pass | Viewports 360px, 390px, 768px, 1440px; selector `.events-filter`; observed filters at 44px height with no overflow; fix made: none; regression result: pass. | No | Buttons remain real `button` elements. |
| Active filter state | Active state is visually clear and still driven by `aria-pressed`. | Pass | Viewports 360px, 390px, 768px, 1440px; selector `.events-filter[aria-pressed="true"]`; observed Upcoming active by default with lantern/ember active styling and inactive Past/All; fix made: none; regression result: pass. | No | State moved correctly when switching filters. |
| Default empty state | Default Upcoming empty state reads as intentional and remains behaviorally unchanged. | Pass | Viewports 360px, 390px, 768px, 1440px; selector `.events-empty`; observed `No upcoming events are posted yet. Watch Discord; the next gathering will find its hour.` inside a styled notice panel; fix made: none; regression result: pass. | No | Current data has no future dated events as of May 5, 2026 UTC. |
| Event card rendering | Past and All render the expected event card cleanly. | Pass | Viewports 360px, 390px, 768px, 1440px; selector `.events-list__item`; observed one card under Past and All for `Guild Hero's Realm: Weekly Coordination`; fix made: none; regression result: pass. | No | Upcoming correctly shows no cards. |
| Date/title hierarchy | Event date, title, summary, and link hierarchy remain clear. | Pass | Viewports 360px, 390px, 768px, 1440px; selectors `.events-list__item .kicker`, `.events-list__item .section-title`, `.events-list__item .muted`; observed `Feb 27, 2026`, `5:00 PM`, `UTC+8`, title, and summary in expected order; fix made: none; regression result: pass. | No | Date rendering remains UTC-safe. |
| Link/action presentation | Event and featured links remain stable, tappable, and safe for external navigation. | Pass | Viewport 390px; selectors `.events-list__item a`, `#featuredCard a`, participation `.badge-row a`; observed event detail link height 56px, Discord href unchanged, `target="_blank"`, `rel="noopener noreferrer"`; fix made: none; regression result: pass. | No | Internal `How to join` link remained `./join.html`. |
| Focus states | Keyboard focus remains visible on Events controls and action links. | Pass | Viewport 390px; selectors `.events-filter:focus-visible`, `.events-list__item a:focus-visible`; observed 2px solid outline plus layered focus shadow on Past filter and Open details link; fix made: none; regression result: pass. | No | Touch target and keyboard access remain stable. |
| Border behavior | No noisy/random animated border behavior appears on Events panels or pills. | Pass | Viewports 360px, 390px, 768px, 1440px; selectors `body[data-page="events"] .page-main .glass-card`, `body[data-page="events"] .badge-row > span`; observed computed animation name `none`; fix made: none; regression result: pass. | No | Static gradient rims are preserved from the pilot. |
| Mobile layout | Required mobile/tablet/desktop widths have no horizontal overflow. | Pass | Viewports 360px, 390px, 768px, 1440px; document scroll/client width check; observed no overflow at all widths; fix made: none; regression result: pass. | No | Filters wrap cleanly. |
| Reduced motion | Reduced-motion behavior is safe. | Pass | Viewport 390px with `prefers-reduced-motion: reduce`; selectors `.page-main .glass-card`, `.events-filter`; observed card animations `none` and transition duration reduced to `1e-06s`; fix made: none; regression result: pass. | No | No JS-driven visual effects are present. |
| Visual identity | Events still feels like a lantern-lit schedule/notice board without copying other visual systems. | Pass | Viewports 360px, 390px, 768px, 1440px; selectors `body[data-page="events"]`, `.events-toolbar`, `.events-empty`, `.events-list__item`; observed scoped lantern/ember/jade treatment and static schedule surfaces; fix made: none; regression result: pass. | No | No new visual ideas were added in this QA branch. |

## 2. Events Behavior And Date Audit

Smoke URL:

- `http://localhost:8765/events.html`

Results:

- Events data renders unchanged.
- Default filter remains Upcoming.
- Upcoming filter works and shows `Upcoming: none posted`.
- Past filter works and shows `Past: 1 event`.
- All filter works and shows `All: 1 event`.
- The current local/production data has no future dated events as of May 5, 2026 UTC, so Upcoming sort order is not applicable for the current dataset.
- Past events sort newest first; current dataset has one Past event dated `2026-02-27`.
- All preserves the current behavior: upcoming first, then past; current dataset shows the single Past event.
- Date-only classification remains UTC-safe for the current data: `2026-02-27` is classified as Past on `2026-05-05`.
- Event link remains `https://discord.com/invite/dPafqMwWPK`.
- Empty-state behavior remains stable.
- No console-breaking errors were observed.

Rendered event evidence:

- Past/All title: `Guild Hero's Realm: Weekly Coordination`
- Past/All date line: `Feb 27, 2026`, `5:00 PM`, `UTC+8`
- Event detail link: `https://discord.com/invite/dPafqMwWPK`
- External attributes: `target="_blank"`, `rel="noopener noreferrer"`

## 3. Cross-Page Regression Audit

Browser smoke at 390px covered:

- `/`
- `/join.html`
- `/gallery.html`
- `/ranks.html`
- `/leaders.html`
- `/codex.html`
- `/recruitment.html`
- `/twills.html`
- `/announcements.html`
- `/raffles.html`
- `/spotify.html`
- `/spotlight.html`

Results:

- Each page loaded.
- Header and footer rendered.
- No horizontal overflow was observed at 390px.
- No console-breaking errors were observed.
- Focus states remained visible on the first reachable focusable element.
- No non-Events page matched Events-only styling selectors.
- Home, Gallery, Recruitment, Join, Codex/Ranks/Leaders, and Side Pages visual systems remained intact.
- Gallery rendered 70 thumbnails, reported `Showing 70 of 70 images.`, and opened the lightbox.
- Recruitment audio still rendered with `./assets/audio/mochiriiiiii.mp3`.
- Spotify rendered search, 13 filter chips, 8 embeds, meaningful iframe titles, and `loading="lazy"` on checked embeds.
- Spotify no-match search hid visible embeds and showed an empty state.
- Spotify chip filtering still activated the `Ambient` chip.

## 4. Protected And Immutable Content Audit

Diff checks returned no changes for:

- `data/home.json`
- `data/events.json`
- `data/recruitment.json`
- `data/twills.json`

Confirmed:

- `data/home.json` `seal.verse` unchanged.
- `data/events.json` unchanged.
- `data/recruitment.json` `content.paragraphs` unchanged.
- `data/recruitment.json` `content.conclusion` unchanged.
- `data/twills.json` `profile.bio` unchanged.
- Event copy unchanged.
- Event dates unchanged.
- Event links unchanged.
- Upcoming/Past/All behavior unchanged.
- Default filter unchanged.
- UTC-safe date classification unchanged.
- Sorting behavior unchanged.

## 5. Fixes

No fixes were made.

The audit found no real regressions. This branch is report-only and does not change `styles.css`, `events.html`, `events.js`, data files, assets, docs, workflows, or validation scripts.

## 6. Cache Query

- CSS changed in this QA branch: no.
- Cache-query changed: no.
- Reason: no CSS or HTML changes were needed, and Events does not use a page-specific stylesheet query convention like Gallery.

## 7. Validation

| Check | Result | Notes |
|---|---|---|
| `npm run check` | Pass | Known `assets/audio/mochiriiiiii.mp3` large-asset warning only. |
| `git diff --check` | Pass | No whitespace errors. |
| `node scripts/check-json.mjs` | Pass | `JSON OK (16 files).` |
| `node scripts/check-js.mjs` | Pass | `JavaScript syntax OK (23 files).` |
| `node scripts/check-refs.mjs` | Pass | `Local references OK (420 refs checked).` |
| `node scripts/check-assets.mjs` | Pass with expected warning | MP3 remains intentionally over threshold. |
| `npm run check:production` | Pass | `Production smoke check OK.` |
| `npm run smoke:gallery` | Pass | `Gallery lightbox smoke OK.` |

Known warnings:

- `assets/audio/mochiriiiiii.mp3` remains over the normal large-asset threshold because the original Recruitment audio quality was restored intentionally.
- The GitHub-managed Pages Node.js 20 annotation remains a known non-blocking workflow annotation.

## 8. Visual Evidence

Screenshots captured: no.

Browser-smoke evidence was captured in text:

- Events viewports: 360px, 390px, 768px, 1440px.
- Events page status: loaded with header/footer and no console-breaking errors.
- Events overflow: none at all required widths.
- Filters: Upcoming/Past/All all measured 44px tall.
- Active default: Upcoming with `aria-pressed="true"`.
- Empty state: visible and panel-styled for default Upcoming.
- Past/All: one event card rendered with expected date/title/link.
- Focus: Past filter and Open details link showed visible 2px outlines and layered focus shadows at 390px.
- Reduced motion: Events card animations computed as `none`.
- Cross-page: all requested pages passed 390px smoke.

## 9. Deferred Polish Ideas

None. No non-blocking polish ideas were identified that should be acted on in this regression-only branch.

## 10. Recommendation

Events visual schedule pilot is stable from this focused QA pass.

Recommended next step:

- `tag v2.1.0-events-visual-baseline`
