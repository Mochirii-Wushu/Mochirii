# Cross-Site Visual Regression Review

## 1. Page Visual Audit

| Page | Viewports checked | Visual result | Accessibility result | Issues | Notes |
| --- | --- | --- | --- | --- | --- |
| Home | 360, 390, 768, 1440 | Pass | Pass | None | Threshold/identity treatment remained intact; hero, seal, doors, bulletin, spotlight, and gallery preview rendered without horizontal overflow. |
| Join | 360, 390, 768, 1440 | Pass | Pass | None | Guided onboarding panels, checklist hierarchy, and link surfaces stayed readable and touch-safe. |
| Events | 360, 390, 768, 1440 | Pass | Pass | None | Lantern schedule treatment, filter controls, cards, and current Upcoming empty state stayed stable. |
| Gallery | 360, 390, 768, 1440 | Pass | Pass | None | Moonlit gallery treatment remained image-forward; filters, controls, thumbnails, and lightbox surfaces stayed readable. |
| Ranks | 360, 390, 768, 1440 | Pass | Pass | None | Progression/service hierarchy stayed stable; rank cards and image framing did not overflow. |
| Leaders | 360, 390, 768, 1440 | Pass | Pass | None | Council/stewardship presentation stayed distinct from Ranks; profile link treatment remained clear. |
| Codex | 360, 390, 768, 1440 | Pass | Pass | None | Conduct/ritual panels remained clear and practical, with stable cards and readable rules. |
| Recruitment | 360, 390, 768, 1440 | Pass | Pass | None | Long-form hall speech treatment remained readable; audio panel and body/conclusion cards stayed stable. |
| Twills | 360, 390, 768, 1440 | Pass after scoped fix | Pass | P2 fixed | Evidence: 360, 390, 768, and 1440px showed inherited `border-shift` on `body[data-page="twills"] .hero-intro`, `.page-main .glass-card`, and `.badge-row > span`. Fixed with Twills-scoped `animation: none`; rerun passed 52/52 visual checks. |
| Announcements | 360, 390, 768, 1440 | Pass | Pass | None | Bulletin-board treatment stayed compact and readable; pinned/date hierarchy remained stable. |
| Raffles | 360, 390, 768, 1440 | Pass | Pass | None | Prize/rules/link treatment stayed fair, tappable, and plain. |
| Spotify | 360, 390, 768, 1440 | Pass | Pass | None | Listening-room shelf treatment stayed stable; search, filter chips, cards, and iframes fit mobile widths. |
| Spotlight | 360, 390, 768, 1440 | Pass | Pass | None | Appreciation/story presentation stayed warm and distinct from Leaders/Twills. |

All pages loaded with header/footer present, visible focus styles, usable 44px sampled touch targets, no horizontal overflow, no local console-breaking errors, working mobile nav open/close at 390px, working skip link at 390px, and reduced-motion-safe behavior.

## 2. Feature Behavior Audit

| Area | Check | Result | Notes |
| --- | --- | --- | --- |
| Home | Hero, doors/cards, and seal poem render | Pass | Doors: 4; content cards: 8; `seal.verse` rendered unchanged. |
| Join | Checklist and links stable | Pass | Checklist: 5 items; rendered links: 9; Discord external link kept `target="_blank"` and `rel="noopener noreferrer"`. |
| Events | Filters, sorting, UTC status, and links stable | Pass | Default Upcoming showed the current intentional empty state; computed future events: 0; past events: 1; Past and All showed the expected dated event. |
| Gallery | Counts, URL state, copy link, and lightbox stable | Pass | All 70; portraits 22; gatherings 22; action 6; scenery 5; companions 15; Back/Forward preserved category state; lightbox opened full image path, not `/thumbs/`. |
| Recruitment | Protected body/conclusion and audio stable | Pass | Body paragraphs: 7; conclusion paragraphs: 1; audio resolved HTTP 200 at `assets/audio/mochiriiiiii.mp3` with native controls and labels. |
| Codex | Data counts and View Ranks link stable | Pass | Hero pills 3; tenets 6; etiquette blocks 4; rhythm cards 4; recognition cards 3; View Ranks stayed `./ranks.html`. |
| Ranks | Rank order, groups, and images stable | Pass | Senior 3; middle 3; members 4; rank images loaded. |
| Leaders | Leader order, responsibilities, and profile links stable | Pass | Leaders 6 in data order; profile link stayed `./twills.html`; responsibility cards 3. |
| Twills | Protected bio and images render | Pass | Bio paragraphs: 4; hero/avatar images loaded; `profile.bio` rendered unchanged. |
| Announcements | Notices and pinned ordering stable | Pass | Notices: 3; first rendered notice remained `Weekly Schedule Posted`. |
| Raffles | Rules, prizes, and links stable | Pass | Rules 4; prizes 3; links 2; external Discord link kept safe attributes. |
| Spotify | Search/filter/no-match/iframes stable | Pass | Initial cards 8; no-match state appeared for impossible query; tag filter returned cards; iframe titles, embed URLs, and `loading="lazy"` remained stable. |
| Spotlight | Body/conclusion/highlights stable | Pass | Body paragraphs 3; highlights 4; conclusion rendered unchanged. |

## 3. Visual-System Consistency

- Coherent patterns: the rollout now consistently uses stable page-scoped panel language, refined focus states, constrained mobile spacing, and static glass/rim treatments across public pages.
- Page identities: Home reads as threshold/identity; Gallery as moonlit archive; Recruitment as warm long-form hall speech; Join as guided onboarding; Events as a lantern-lit schedule; Codex/Ranks/Leaders as ceremonial structure pages; Side Pages as compact supporting utilities; Twills as a simple public profile.
- Mismatches: the only mismatch found was Twills inheriting the older global `border-shift` animation on cards/pills. That is now fixed with Twills-scoped selectors.
- Deferred polish ideas: none blocking. Future Twills visual polish can be handled as a separate design branch if desired, but this QA branch only removed the inherited animation regression.

## 4. Protected Content and Data

- `data/home.json`: no diff; `seal.verse` unchanged.
- `data/recruitment.json`: no diff; `content.paragraphs` unchanged and `content.conclusion` unchanged.
- `data/twills.json`: no diff; `profile.bio` unchanged.
- `data/gallery.json`, `data/events.json`, `data/join.json`, `data/codex.json`, `data/ranks.json`, `data/leaders.json`, `data/announcements.json`, `data/raffles.json`, `data/spotify.json`, and `data/spotlight.json`: no diffs.
- No Gallery image files, thumbnail files, assets, docs, workflows, validation scripts, `README.md`, or `AGENTS.md` changed.

## 5. Fixes Made

| File | Selector or area | Reason | Regression result |
| --- | --- | --- | --- |
| `styles.css` | `body[data-page="twills"] .hero-intro`, `body[data-page="twills"] .page-main .glass-card`, `body[data-page="twills"] .badge-row > span` | Removed inherited global `border-shift` animation from Twills hero/content cards and badges so borders are stable and deliberate like the completed visual-system pages. | Full rerun passed: 52/52 viewport visual checks and 13/13 feature behavior checks. |

## 6. Cache Query

- CSS changed: yes.
- Cache-query changed: no.
- Reason: Gallery already has a page-specific cache-query convention, while Twills and most other pages do not. The fix is small, page-scoped, and does not require adding a new cache-query pattern.

## 7. Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npm run check` | Pass | Known `assets/audio/mochiriiiiii.mp3` size warning remained intentional. |
| `git diff --check` | Pass | No whitespace errors. |
| `node scripts/check-json.mjs` | Pass | JSON OK: 16 files. |
| `node scripts/check-js.mjs` | Pass | JavaScript syntax OK: 23 files. |
| `node scripts/check-refs.mjs` | Pass | Local references OK: 420 refs checked. |
| `node scripts/check-assets.mjs` | Pass with known warning | Checked 214 asset files; known MP3 size warning only. |
| `npm run check:production` | Pass | Production smoke check OK. |
| `npm run smoke:gallery` | Pass | Gallery lightbox smoke OK with local server on port 8765. |
| Browser smoke | Pass | 52/52 viewport checks, 13/13 reduced-motion checks, and 13/13 feature behavior checks passed after the Twills fix. |

## 8. Visual Evidence

- Screenshots captured: no.
- Evidence path: none.
- Browser smoke evidence: Playwright checked all public pages at 360, 390, 768, and 1440px with shell rendering, mobile nav, skip link, focus visibility, touch-target samples, overflow, local console errors, reduced motion, and feature-specific behavior smoke. Initial Twills animation finding was reproduced at all four viewports; post-fix rerun passed 52/52 viewport checks, 13/13 reduced-motion checks, and 13/13 feature behavior checks.

## 9. Recommendation

Next recommended step after this QA branch merges cleanly:

1. Tag `v2.2.0-cross-site-visual-baseline`.
2. Then move to `docs/supabase-feature-plan`.
