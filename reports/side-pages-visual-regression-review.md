# Side Pages Visual Regression Review

## 1. Audit Findings

This QA pass reviewed the merged Side Pages visual polish pilot as a regression-only branch. No visual, accessibility, mobile/layout, selector-scope, behavior, data, link, embed, or protected-content regression was found, so no CSS, HTML, JavaScript, data, asset, docs, workflow, or validation-script changes were made.

| Page | Area | Finding | Severity | Evidence | Fix needed? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Announcements | Page load and shell | Announcements loads with header/footer and one `h1`. | Pass | `360px`, `390px`, `768px`, `1440px`; `/announcements.html`; status 200, no console errors; fix made: none; regression result: pass. | No | Page remains a compact bulletin board. |
| Announcements | Hero/meta | Hero and metadata remain readable. | Pass | `360px` through `1440px`; `.hero-intro`, `#announcementsUpdated`, `#announcementsTagline`; observed current hero text and 3 badges; fix made: none; regression result: pass. | No | No copy changed. |
| Announcements | Bulletin cards | Bulletin cards render cleanly with the pinned notice first. | Pass | `360px` through `1440px`; `#announcementsList [data-announcement]`; observed 3 notices, first title `Weekly Schedule Posted`, 10 detail items; fix made: none; regression result: pass. | No | Rendered notice count and ordering match data. |
| Announcements | Motion and layout | No noisy/random border behavior and no horizontal overflow. | Pass | `360px` through `1440px`; side-page cards and pills reported `animation-name: none`; document width matched viewport; fix made: none; regression result: pass. | No | Reduced-motion behavior safe by construction. |
| Raffles | Page load and shell | Raffles loads with header/footer and one `h1`. | Pass | `360px`, `390px`, `768px`, `1440px`; `/raffles.html`; status 200, no console errors; fix made: none; regression result: pass. | No | Page remains clear and fair. |
| Raffles | Rules/month sections | How, rules, prizes, and note sections render cleanly. | Pass | `360px` through `1440px`; `#rafflesHow`, `#rafflesRules`, `#rafflesThisMonth`; observed 3 how paragraphs, 4 rules, 3 prizes; fix made: none; regression result: pass. | No | Rules remain plain and readable. |
| Raffles | Links | Raffle links render, resolve, and keep safe attributes. | Pass | `360px` through `1440px`; `#rafflesLinks a`; observed `Raffle channel` href `https://discord.com/invite/dPafqMwWPK` with `target="_blank"` and `rel="noopener noreferrer"`, plus `Events page` href `./events.html`; fix made: none; regression result: pass. | No | Touch target height measured 56px. |
| Raffles | Focus and motion | Link focus remains visible and border animation is absent. | Pass | `390px`; keyboard tab to `#rafflesLinks a`; observed 2px solid outline and 56px height; cards/pills reported `animation-name: none`; fix made: none; regression result: pass. | No | No mobile overflow. |
| Spotify | Page load and shell | Spotify loads with header/footer and one `h1`. | Pass | `360px`, `390px`, `768px`, `1440px`; `/spotify.html`; status 200, no console errors; fix made: none; regression result: pass. | No | Page remains a listening-room shelf. |
| Spotify | Search and filters | Search input and tag chips render cleanly and remain keyboard accessible. | Pass | `360px` through `1440px`; `#spotifySearch`, `.spotify-chip`; observed 44px search input and 13 chips; keyboard tab found input and `All` chip with 2px solid outline; fix made: none; regression result: pass. | No | `aria-pressed` preserved. |
| Spotify | Search behavior | Search behavior remains stable. | Pass | `390px`; typed `Night`; observed 2 cards: `Guild Album - Quiet Current` and `Guild Track - Night Walk`; fix made: none; regression result: pass. | No | Debounce and matching behavior unchanged. |
| Spotify | Tag filter behavior | Tag filter behavior remains stable. | Pass | `390px`; clicked `Calm`; observed active chip `Calm` and 1 rendered card after clearing search; fix made: none; regression result: pass. | No | Button rendering remains data-driven. |
| Spotify | No-match empty state | No-match empty state works. | Pass | `390px`; query `zzzz-no-match`; observed empty state visible and 0 cards; fix made: none; regression result: pass. | No | No JS change. |
| Spotify | Iframe embeds | Iframe markup and normalization remain stable. | Pass | `360px` through `1440px`; `#spotifyGrid iframe`; observed 8 iframes, meaningful `Spotify embed: ...` titles, `loading="lazy"`, `width="100%"`, and normalized `https://open.spotify.com/embed/...` sources; fix made: none; regression result: pass. | No | Third-party iframe content itself was not treated as a site failure gate. |
| Spotify | Invalid embed handling | Invalid/missing embed normalization remains stable. | Pass | `390px`; `MochiriiUtils.toSpotifyEmbedSrc("")`, unsupported host, and unsupported kind returned empty strings; fix made: none; regression result: pass. | No | Unsupported embeds still do not render. |
| Spotify | Motion and layout | No noisy/random border behavior and no horizontal overflow. | Pass | `360px` through `1440px`; cards reported `animation-name: none`; iframe boxes stayed within viewport; fix made: none; regression result: pass. | No | Reduced-motion smoke reported chip transition duration `1e-06s`. |
| Spotlight | Page load and shell | Spotlight loads with header/footer and one `h1`. | Pass | `360px`, `390px`, `768px`, `1440px`; `/spotlight.html`; status 200, no console errors; fix made: none; regression result: pass. | No | Page remains warm and appreciative. |
| Spotlight | Body and conclusion | Body and conclusion render cleanly. | Pass | `360px` through `1440px`; `#spotlightBody`, `#spotlightConclusion`; observed 3 body paragraphs and 1 conclusion paragraph; fix made: none; regression result: pass. | No | Rendered fields unchanged. |
| Spotlight | Highlights and caps | Highlights and badge caps remain stable. | Pass | `360px` through `1440px`; `#spotlightBadges`, `#spotlightHighlights`; observed 3 badges, max badge length 17, and 4 highlights; fix made: none; regression result: pass. | No | Caps remain under current renderer limits. |
| Spotlight | Motion and layout | No noisy/random border behavior and no horizontal overflow. | Pass | `360px` through `1440px`; cards and pills reported `animation-name: none`; document width matched viewport; fix made: none; regression result: pass. | No | Spotlight does not duplicate Leaders/Twills profile styling. |

## 2. Behavior and Data Regression Audit

| Page | Check | Result | Evidence |
| --- | --- | --- | --- |
| Announcements | Data renders unchanged | Pass | Rendered 3 notices, 3 badges, and 10 detail items, matching `data/announcements.json`. |
| Announcements | Ordering | Pass | Pinned notice remained first: `Weekly Schedule Posted`. |
| Raffles | Data renders unchanged | Pass | Rendered 3 how paragraphs, 4 rules, 3 prizes, and 2 links, matching `data/raffles.json`. |
| Raffles | Link safety | Pass | External Discord link retained `target="_blank"` and `rel="noopener noreferrer"`; Events link remained internal. |
| Spotify | Data renders unchanged | Pass | Rendered 8 cards and 13 tag chips, matching `data/spotify.json`. |
| Spotify | Search/filter behavior | Pass | Search, tag filters, and no-match empty state worked in browser smoke. |
| Spotify | Iframe behavior | Pass | All 8 iframes kept normalized `open.spotify.com/embed/...` sources, meaningful titles, `loading="lazy"`, and `width="100%"`. |
| Spotlight | Data renders unchanged | Pass | Rendered 3 badges, 3 body paragraphs, 1 conclusion paragraph, and 4 highlights, matching `data/spotlight.json`. |
| Spotlight | Field caps | Pass | Badges and highlights stayed within current renderer caps. |

## 3. Cross-Page Regression Audit

| Page | Result | Evidence | Notes |
| --- | --- | --- | --- |
| `/` | Pass | `390px`; status 200, header/footer rendered, no console errors, no horizontal overflow; side-page variables absent. | Home visual system remained scoped. |
| `/join.html` | Pass | `390px`; status 200, header/footer rendered, no console errors, no horizontal overflow; side-page variables absent. | Join visual system remained scoped. |
| `/events.html` | Pass | `390px`; status 200, header/footer rendered, no console errors, no horizontal overflow; 3 event filters found. | Events filters still render. |
| `/gallery.html` | Pass | `390px`; status 200, header/footer rendered, no console errors, no horizontal overflow; 70 thumbnails and 6 filters found. | Gallery behavior smoke also passed. |
| `/ranks.html` | Pass | `390px`; status 200, header/footer rendered, no console errors, no horizontal overflow; side-page variables absent. | Ranks ceremonial styling remained scoped. |
| `/leaders.html` | Pass | `390px`; status 200, header/footer rendered, no console errors, no horizontal overflow; side-page variables absent. | Leaders ceremonial styling remained scoped. |
| `/codex.html` | Pass | `390px`; status 200, header/footer rendered, no console errors, no horizontal overflow; side-page variables absent. | Codex ceremonial styling remained scoped. |
| `/recruitment.html` | Pass | `390px`; status 200, header/footer rendered, no console errors, no horizontal overflow; audio rendered with source `./assets/audio/mochiriiiiii.mp3`. | Recruitment visual system and audio remained stable. |
| `/twills.html` | Pass | `390px`; status 200, header/footer rendered, no console errors, no horizontal overflow; side-page variables absent. | Twills page unaffected. |

`npm run smoke:gallery` returned `Gallery lightbox smoke OK.`

## 4. Protected and Immutable Content Audit

Protected and immutable diff checks were empty:

- `data/home.json` unchanged; `seal.verse` unchanged.
- `data/announcements.json` unchanged.
- `data/raffles.json` unchanged.
- `data/spotify.json` unchanged.
- `data/spotlight.json` unchanged.
- `data/recruitment.json` unchanged; `content.paragraphs` unchanged.
- `data/recruitment.json` unchanged; `content.conclusion` unchanged.
- `data/twills.json` unchanged; `profile.bio` unchanged.

## 5. Fix Decision

No real visual, accessibility, mobile/layout, selector-scope, cache-query, runtime, semantic, behavior, data, link, embed, or protected-content regression was found.

Fixes made:

- None.

Files intentionally changed in this QA branch:

- `reports/side-pages-visual-regression-review.md`

Cache-query decision:

- CSS changed: no.
- Cache-query changed: no.
- Reason: report-only branch; Announcements, Raffles, Spotify, and Spotlight do not use a page-specific stylesheet query convention like Gallery.

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

- Announcements, Raffles, Spotify, and Spotlight were checked at `360px`, `390px`, `768px`, and `1440px`.
- Keyboard focus checks were performed for Raffles links, Spotify search, and Spotify tag chips at `390px`.
- Reduced-motion smoke was performed on Spotify at `390px`.
- Cross-page regression routes were checked at `390px`.
- No screenshots were committed because text browser metrics were sufficient and no visual regression required image evidence.

## 8. Deferred Polish Ideas

None found during this regression-only QA pass. Any future aesthetic preferences should wait for a separately scoped design branch rather than this report-only QA branch.
