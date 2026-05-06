# Cross-Site Post-Gallery Randomization Review

## 1. Gallery Randomization Audit

| Check | Result | Evidence | Notes |
|---|---|---|---|
| Full refresh randomizes display order | Pass | Refresh 1 first 10: `shot-68`, `shot-22`, `shot-52`, `shot-27`, `shot-32`, `shot-67`, `shot-08`, `shot-38`, `shot-43`, `shot-70`; refresh 2 first 10: `shot-19`, `shot-13`, `shot-05`, `shot-35`, `shot-21`, `shot-26`, `shot-68`, `shot-34`, `shot-38`, `shot-44`; refresh 3 first 10: `shot-20`, `shot-15`, `shot-13`, `shot-41`, `shot-60`, `shot-22`, `shot-37`, `shot-57`, `shot-45`, `shot-31`. | At least one refresh changed order. |
| Duplicate or missing rendered items | Pass | Each refresh rendered 73 items with 73 unique IDs. | No missing or unexpected Gallery IDs detected. |
| All count | Pass | `Showing 73 of 73 images.` | Count remains data-derived. |
| Portraits count | Pass | 23 rendered; `Showing 23 images in Portraits.` | URL state: `?category=portraits`. |
| Gatherings count | Pass | 22 rendered; `Showing 22 images in Gatherings.` | URL state: `?category=gatherings`. |
| Action count | Pass | 7 rendered; `Showing 7 images in Action.` | URL state: `?category=action`. |
| Scenery count | Pass | 6 rendered; `Showing 6 images in Scenery.` | URL state: `?category=scenery`. |
| Companions count | Pass | 15 rendered; `Showing 15 images in Companions.` | URL state: `?category=companions`. |
| Invalid category fallback | Pass | `gallery.html?category=bad-slug` replaced to `gallery.html` and rendered all 73 items. | Invalid category still falls back to All. |
| Filter clicks do not reshuffle | Pass | Portraits first 10 after two same-session visits stayed `shot-26`, `shot-17`, `shot-32`, `shot-56`, `shot-16`, `shot-38`, `shot-28`, `shot-01`, `shot-62`, `shot-02`. | Category views preserve the page-load shuffle order. |
| Back/Forward does not reshuffle | Pass | Gatherings order before navigating away matched the order restored by Back. | Same-session history navigation stayed stable. |
| Copy link | Pass | Copy status displayed `Link copied`; clipboard matched `gallery.html?category=action`. | Copy behavior unchanged. |
| Thumbnails and lightbox paths | Pass | Sampled `shot-01` and `shot-71`; grid images used `/thumbs/`, lightbox sources used full paths. | Lightbox did not open thumbnails. |
| Lightbox keyboard close | Pass | Escape closed sampled lightbox views. | Existing keyboard behavior stable. |
| Captions | Pass | Sampled captions rendered in lightbox for `shot-01` and `shot-71`. | No caption data changed. |
| Gallery viewport overflow | Pass | 360px, 390px, 768px, and 1440px had no document-level horizontal overflow. | Console errors: 0. |

## 2. Page Visual Audit

| Page | Viewports checked | Visual result | Accessibility result | Shell result | Issues | Notes |
|---|---:|---|---|---|---|---|
| Home | 360, 390, 768, 1440 | Pass | Pass | Pass | None | Hero, doors, cards, and seal rendered. |
| Join | 360, 390, 768, 1440 | Pass | Pass | Pass | None | Checklist and join links rendered. |
| Events | 360, 390, 768, 1440 | Pass | Pass | Pass | None | Event filter panel remained stable. |
| Gallery | 360, 390, 768, 1440 | Pass | Pass | Pass | None | Randomized order did not affect layout. |
| Ranks | 360, 390, 768, 1440 | Pass | Pass | Pass | None | Rank panels and images rendered. |
| Leaders | 360, 390, 768, 1440 | Pass | Pass | Pass | None | Leader grid and profile link rendered. |
| Codex | 360, 390, 768, 1440 | Pass | Pass | Pass | None | Codex sections and Ranks link rendered. |
| Recruitment | 360, 390, 768, 1440 | Pass | Pass | Pass | None | Audio panel and protected body rendered. |
| Twills | 360, 390, 768, 1440 | Pass | Pass | Pass | None | Profile visual identity remained distinct. |
| Announcements | 360, 390, 768, 1440 | Pass | Pass | Pass | None | Pinned notice remained first. |
| Raffles | 360, 390, 768, 1440 | Pass | Pass | Pass | None | Rules, prizes, and external link rendered. |
| Spotify | 360, 390, 768, 1440 | Pass | Pass | Pass | None | Search, tags, and embeds remained stable. |
| Spotlight | 360, 390, 768, 1440 | Pass | Pass | Pass | None | Spotlight body, conclusion, and highlights rendered. |

Visual audit notes:
- Header and footer rendered on every tested page.
- Mobile nav opened and closed with Escape at 360px, 390px, and 768px.
- Desktop navigation rendered at 1440px.
- Skip link target remained `#main` and became visible on focus.
- Focus states remained detectable on tested focusable controls.
- Reduced-motion media emulation was checked at 390px for every page.
- No console-breaking browser errors were detected.
- No document-level horizontal overflow was detected.
- No Gallery style leakage, broken panel/card styling, or noisy random border behavior appeared.

## 3. Feature Behavior Audit

| Area | Check | Result | Notes |
|---|---|---|---|
| Home | Hero, doors/cards, seal poem | Pass | Hero image loaded, 4 doors rendered, 4 home cards rendered, seal text rendered. |
| Join | Checklist and key links | Pass | 5 checklist items rendered; Discord link kept safe attributes; Codex, Events, and Ranks links resolved. |
| Events | Default filter, filters, sorting/count state | Pass | Default filter was Upcoming; Upcoming, Past, and All filters updated counts without runtime errors. |
| Gallery | Randomization and existing controls | Pass | Counts, URL state, Copy link, Back/Forward, thumbnails, captions, and full-image lightbox all passed. |
| Recruitment | Protected body/conclusion and audio | Pass | 7 body paragraphs rendered; conclusion rendered; `assets/audio/mochiriiiiii.mp3` resolved with native controls and `aria-labelledby`. |
| Codex | Content counts and Ranks link | Pass | 6 tenets, 4 etiquette blocks, 4 rhythm cards, 3 recognition cards, and `./ranks.html` link rendered. |
| Ranks | Rank order/groups/images | Pass | Senior 3, middle 3, and members 4 rank cards rendered; section images loaded. |
| Leaders | Leader order and profile link | Pass | 12 leader cards rendered; Twills profile link remained `./twills.html`. |
| Twills | Protected profile, badges, image paths | Pass | Bio rendered, 4 badges rendered, avatar image loaded, signed-out browsing had no runtime errors. |
| Announcements | Notices and pinned order | Pass | 3 notices rendered; first kicker was `Pinned • Feb 07, 2026`. |
| Raffles | Rules, prizes, safe external link | Pass | 4 rules and 3 prizes rendered; external raffle link kept `noopener noreferrer`. |
| Spotify | Search, tag filters, iframes, no-match state | Pass | 8 cards rendered, 13 chips rendered, no-match state appeared, iframe titles/loading/embed paths remained valid. |
| Spotlight | Body, conclusion, highlights | Pass | 3 body paragraphs, conclusion, and 4 highlights rendered. |
| Shell | Nav/footer/script order/Supabase signed-out safety | Pass | Header/footer links rendered; script order remained `utils.js`, `supabase.js`, `site.js`, page script; `window.MochiriiSupabase` was present. |

## 4. Protected Content and Data

Status:
- `data/home.json` unchanged; `seal.verse` unchanged.
- `data/recruitment.json` unchanged; `content.paragraphs` unchanged.
- `data/recruitment.json` unchanged; `content.conclusion` unchanged.
- `data/twills.json` unchanged; `profile.bio` unchanged.
- `data/gallery.json` unchanged.
- No data files changed.
- `header.html`, `footer.html`, and `site.js` unchanged.
- Header/footer links unchanged.
- Script order unchanged.

## 5. Fixes Made

No fixes were required. This remained a report-only QA branch.

## 6. Validation

| Command | Result | Notes |
|---|---|---|
| `npm run check` | Pass | JS, JSON, refs, and assets completed; known MP3 warning only. |
| `git diff --check` | Pass | No whitespace errors. |
| `node scripts/check-json.mjs` | Pass | 16 JSON files valid. |
| `node scripts/check-js.mjs` | Pass | 23 JavaScript files valid. |
| `node scripts/check-refs.mjs` | Pass | 429 local refs checked. |
| `node scripts/check-assets.mjs` | Pass with expected warning | `assets/audio/mochiriiiiii.mp3` remains over the normal threshold intentionally. |
| `npm run check:production` | Pass | Production smoke check OK. |
| `npm run smoke:gallery` | Pass | Gallery lightbox smoke OK. |

## 7. Notes

Known intentional warning remains expected:
- `assets/audio/mochiriiiiii.mp3` exceeds the normal large-asset threshold because original audio quality was restored intentionally.

Known non-blocking workflow annotation remains expected:
- GitHub-managed Pages deployment may emit a Node.js 20 annotation.
