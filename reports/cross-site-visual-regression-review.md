# Cross-Site Visual Regression Review

## 1. Page Visual Audit

Final cross-site QA was run after the page-level visual rollout, Twills visual signature update, and site-shell alignment. No cross-site visual, accessibility, mobile layout, selector-scope, cache-query, runtime, shell, or protected-content regression was found. This branch stayed report-only.

| Page | Viewports checked | Visual result | Accessibility result | Shell result | Issues | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Home `/` | `360px`, `390px`, `768px`, `1440px` | Pass | Pass | Pass | None | Evidence: page `/`, selector/section `body[data-page="home"]`, `.hero-intro`, `.home-guild-seal`, `.site-header`, `.site-footer`; observed issue: none; fix made: none; regression result: pass. Threshold/identity treatment remained intact. |
| Join `/join.html` | `360px`, `390px`, `768px`, `1440px` | Pass | Pass | Pass | None | Evidence: page `/join.html`, selector/section `body[data-page="join"]`, `.join-checklist`, `.site-header`, `.site-footer`; observed issue: none; fix made: none; regression result: pass. Guided onboarding treatment stayed readable and touch-safe. |
| Events `/events.html` | `360px`, `390px`, `768px`, `1440px` | Pass | Pass | Pass | None | Evidence: page `/events.html`, selector/section `body[data-page="events"]`, `.events-filter`, `.events-list__item`, `.site-header`, `.site-footer`; observed issue: none; fix made: none; regression result: pass. Lantern-lit schedule identity stayed stable. |
| Gallery `/gallery.html` | `360px`, `390px`, `768px`, `1440px` | Pass | Pass | Pass | None | Evidence: page `/gallery.html`, selector/section `body[data-page="gallery"]`, `.gallery-toolbar`, `.gallery-grid`, `.lightbox`, shared shell; observed issue: none; fix made: none; regression result: pass. Moonlit image-forward identity stayed intact. |
| Ranks `/ranks.html` | `360px`, `390px`, `768px`, `1440px` | Pass | Pass | Pass | None | Evidence: page `/ranks.html`, selector/section `body[data-page="ranks"]`, rank tier cards, shared shell; observed issue: none; fix made: none; regression result: pass. Ceremonial progression treatment stayed stable. |
| Leaders `/leaders.html` | `360px`, `390px`, `768px`, `1440px` | Pass | Pass | Pass | None | Evidence: page `/leaders.html`, selector/section `body[data-page="leaders"]`, `#leadersGrid`, `#respGrid`, shared shell; observed issue: none; fix made: none; regression result: pass. Council identity stayed distinct from Twills. |
| Codex `/codex.html` | `360px`, `390px`, `768px`, `1440px` | Pass | Pass | Pass | None | Evidence: page `/codex.html`, selector/section `body[data-page="codex"]`, `#tenetsGrid`, `#etiquetteBlocks`, shared shell; observed issue: none; fix made: none; regression result: pass. Conduct/rules surfaces stayed readable. |
| Recruitment `/recruitment.html` | `360px`, `390px`, `768px`, `1440px` | Pass | Pass | Pass | None | Evidence: page `/recruitment.html`, selector/section `body[data-page="recruitment"]`, `#recruitmentBody`, `#recruitmentAudio`, shared shell; observed issue: none; fix made: none; regression result: pass. Warm long-form reading treatment and audio panel stayed stable. |
| Twills `/twills.html` | `360px`, `390px`, `768px`, `1440px` | Pass | Pass | Pass | None | Evidence: page `/twills.html`, selector/section `body[data-page="twills"]`, `#twillsBio`, `#twillsBadges`, `#twillsAvatar`, shared shell; observed issue: none; fix made: none; regression result: pass. Moonlit personal profile chamber remained distinct from Leaders, Recruitment, Gallery, and Home while staying in-family. |
| Announcements `/announcements.html` | `360px`, `390px`, `768px`, `1440px` | Pass | Pass | Pass | None | Evidence: page `/announcements.html`, selector/section `body[data-page="announcements"]`, `#announcementsList`, shared shell; observed issue: none; fix made: none; regression result: pass. Compact side-page treatment stayed stable. |
| Raffles `/raffles.html` | `360px`, `390px`, `768px`, `1440px` | Pass | Pass | Pass | None | Evidence: page `/raffles.html`, selector/section `body[data-page="raffles"]`, `#rafflesRules`, `#rafflesLinks`, shared shell; observed issue: none; fix made: none; regression result: pass. Prize/rules surfaces stayed readable. |
| Spotify `/spotify.html` | `360px`, `390px`, `768px`, `1440px` | Pass | Pass | Pass | None | Evidence: page `/spotify.html`, selector/section `body[data-page="spotify"]`, `.spotify-search`, `.spotify-chip`, `.spotify-card iframe`, shared shell; observed issue: none; fix made: none; regression result: pass. Listening-room shelf stayed stable. |
| Spotlight `/spotlight.html` | `360px`, `390px`, `768px`, `1440px` | Pass | Pass | Pass | None | Evidence: page `/spotlight.html`, selector/section `body[data-page="spotlight"]`, `#spotlightBody`, `#spotlightHighlights`, shared shell; observed issue: none; fix made: none; regression result: pass. Appreciation/story identity stayed distinct. |

All public pages loaded with one `h1`, shared header/footer, visible sampled focus states, no horizontal overflow, no local console-breaking errors, no noisy/random border behavior, page-specific visual variables present, no Twills selector leakage, and reduced-motion sampled animations reporting `none`.

Shell-specific smoke passed: header remained an ink-glass navigation ribbon, mobile nav remained a polished folded guild panel, footer remained compact and stable, and active/focus states stayed visible and refined. Twills has no header nav item, so the existing active-state fallback was observed but not treated as a regression.

## 2. Feature Behavior Audit

| Area | Check | Result | Notes |
| --- | --- | --- | --- |
| Home | Hero, doors/cards, and seal poem render. | Pass | Hero loaded; doors rendered `4`; sampled content cards rendered `12`; `data/home.json` `seal.verse` lines rendered unchanged. |
| Join | Checklist and links stable. | Pass | Checklist rendered `5` items; Discord link retained `target="_blank"` and `rel="noopener noreferrer"`; Codex, Events, and Ranks links resolved. |
| Events | Default Upcoming, Past/All filters, sorting, UTC-safe date behavior, and empty state stability. | Pass | Default active filter was Upcoming; Past and All filters worked; All rendered `1` data event; date classification remained data-driven through UTC-safe renderer. |
| Gallery | Counts, filters, URL state, Back/Forward, Copy link, thumbnails, full-image lightbox, and captions. | Pass | All `70`; portraits `22`; gatherings `22`; action `6`; scenery `5`; companions `15`; Back/Forward preserved category state; Copy link returned `Link copied`; thumbnail paths used `/thumbs/`; lightbox opened full image paths without `/thumbs/`; captions rendered. |
| Recruitment | Protected body/conclusion and native audio. | Pass | Rendered body matched `content.paragraphs`; conclusion matched `content.conclusion`; audio source stayed `./assets/audio/mochiriiiiii.mp3`; native controls and `aria-labelledby`/`aria-describedby` remained present. |
| Codex | Content counts and View Ranks link. | Pass | Tenets `6`, etiquette blocks `4`, rhythm cards `4`, recognition cards `3`; `#recLink` remained `./ranks.html`. |
| Ranks | Rank order, groups, and images. | Pass | Senior, Middle, and Members rank names matched data order; tier groups rendered; tier images completed. |
| Leaders | Leader order and profile link. | Pass | Six leaders rendered in data order; Twills profile link remained `./twills.html`; responsibilities rendered. |
| Twills | `profile.bio`, badges, image paths, avatar/hero images, signed-out browsing, and profile identity. | Pass | Rendered bio and badges exactly matched `data/twills.json`; hero path stayed `./assets/img/profiles/twills/hero.webp`; avatar path stayed `./assets/img/profiles/twills/avatar.webp`; `window.MochiriiSupabase` remained available and non-blocking; Twills identity variable was present only on Twills. |
| Announcements | Notices and pinned order. | Pass | Notices rendered; first notice remained pinned `Weekly Schedule Posted`. |
| Raffles | Rules, prizes, and links. | Pass | Rules and prizes rendered; external Discord link retained safe attributes; Events link remained internal. |
| Spotify | Search, tag filters, no-match state, iframes, titles, lazy loading, and embed normalization. | Pass | Impossible search showed no-match state; `Night` search returned cards; tag filter returned cards with `aria-pressed="true"`; `8` iframes rendered with meaningful `Spotify embed:` titles, normalized `open.spotify.com/embed/...` sources, and `loading="lazy"`. |
| Spotlight | Body, conclusion, and highlights. | Pass | Body paragraphs, conclusion text, and `4` highlights rendered with expected cap. |
| Shell | Nav/footer links, mobile nav, Escape/focus return, skip link, script order, and Supabase shell. | Pass | Header/mobile/footer link lists matched source; mobile nav opened/closed on every public page at `390px`; Escape closed and returned focus; skip link reached `#main`; script order stayed `utils.js -> supabase.js -> site.js -> page script`; signed-out Supabase shell had no runtime errors. |

## 3. Visual-System Consistency

Coherent patterns:

- Page-level styles use scoped page variables, static glass/rim surfaces, readable card hierarchy, and stable reduced-motion behavior.
- Shared shell styles now frame pages with jade/moon ink-glass without competing with page palettes.
- Borders are stable and deliberate; sampled page cards, pills, Gallery thumbs, and Spotify chips did not report active border animation.
- Focus states remain visible across shell controls and page controls.

Page identities:

- Home feels like threshold/identity with seal, doors, bulletin, spotlight, and gallery preview.
- Gallery feels moonlit and image-forward.
- Recruitment feels warm, readable, and long-form without changing protected body copy.
- Join feels guided and onboarding-focused.
- Events feels lantern-lit and schedule-focused.
- Codex, Ranks, and Leaders feel ceremonial and related while preserving distinct page purposes.
- Side Pages feel compact and page-specific.
- Twills feels like a moonlit personal profile chamber, clearly distinct from Leaders and Recruitment.

Twills identity result:

- `#twillsBio` stayed readable as preserved personal-note text.
- Badge/seal treatment stayed readable and text-only.
- Avatar/portrait framing stayed stable at all checked viewports.
- Twills remained in-family through moon/frost, lantern, jade, and ink-glass language.

Shell result:

- Header remained a refined ink-glass navigation ribbon.
- Mobile nav remained a polished folded guild panel with usable touch targets.
- Footer remained compact, stable, and link-oriented.
- Shell supported each page without overpowering page-specific identities.

Mismatches:

- None found in this final regression pass.

Deferred polish ideas:

- None implemented. Twills still has no dedicated header nav item; keeping that unchanged was intentional because this branch is regression-only and navigation structure is out of scope.

## 4. Protected Content and Data

- `data/home.json`: no diff; `seal.verse` unchanged and rendered unchanged.
- `data/recruitment.json`: no diff; `content.paragraphs` unchanged and rendered unchanged.
- `data/recruitment.json`: no diff; `content.conclusion` unchanged and rendered unchanged.
- `data/twills.json`: no diff; `profile.bio` unchanged and rendered unchanged.
- `data/gallery.json`, `data/events.json`, `data/join.json`, `data/codex.json`, `data/ranks.json`, `data/leaders.json`, `data/announcements.json`, `data/raffles.json`, `data/spotify.json`, and `data/spotlight.json`: no diffs.
- `header.html`: no diff; header links and labels unchanged.
- `footer.html`: no diff; footer links unchanged.
- `site.js`: no diff; shell behavior and script-order expectations unchanged.
- No Gallery image files, thumbnail files, assets, docs, workflows, validation scripts, `README.md`, or `AGENTS.md` changed.

## 5. Fix Decision

No real cross-site visual, accessibility, mobile/layout, selector-scope, cache-query, runtime, feature, Twills, shell, data, or protected-content regression was found.

- Fixes made: none.
- CSS changed: no.
- HTML changed: no.
- JavaScript changed: no.
- Data changed: no.
- Assets changed: no.

## 6. Cache Query

- CSS changed: no.
- Cache-query changed: no.
- Reason: no regression fix required a stylesheet change. Gallery already keeps its page-specific cache-query convention; this QA branch did not add or alter any shared stylesheet cache-query strings.

## 7. Validation

| Command | Result | Notes |
| --- | --- | --- |
| `npm run check` | Pass | Known intentional `assets/audio/mochiriiiiii.mp3` size warning only. |
| `git diff --check` | Pass | No whitespace errors. |
| `node scripts/check-json.mjs` | Pass | JSON validation passed. |
| `node scripts/check-js.mjs` | Pass | JavaScript validation passed. |
| `node scripts/check-refs.mjs` | Pass | Reference validation passed. |
| `node scripts/check-assets.mjs` | Pass with known warning | Asset validation passed with the expected MP3 size warning only. |
| `npm run check:production` | Pass | Production smoke check OK. |
| `npm run smoke:gallery` | Pass | Gallery lightbox smoke OK with local server on port `8765`. |
| Browser visual/shell smoke | Pass | `52` page/viewport checks, `13` reduced-motion checks, mobile nav and skip-link checks on every public page, and desktop dropdown checks passed with zero failures. |
| Browser feature smoke | Pass | Home, Join, Events, Gallery, Recruitment, Codex, Ranks, Leaders, Twills, Announcements, Raffles, Spotify, Spotlight, and Shell checks passed with zero failures. |

## 8. Visual Evidence

Screenshots captured: no.

Browser-smoke evidence was text-based:

- All public pages returned `200`, rendered one `h1`, mounted header/footer, exposed page-specific visual variables, had no horizontal overflow, had visible sampled focus states, and produced no local console-breaking or page-level runtime errors at `360px`, `390px`, `768px`, and `1440px`.
- Reduced-motion smoke sampled page cards/pills/Gallery thumbs/Spotify chips and found no active animation names across all public pages at `390px`.
- Mobile nav behavior was checked on every public page at `390px`: open, Escape close, menu-button close, body scroll lock/unlock, `aria-expanded`, focus return, close-button target, and first-link target passed.
- Skip link was checked on every public page at `390px`: visible on focus and jumped to `#main`.
- Desktop dropdown behavior was checked at `1440px`: open, Escape close, and ArrowDown focus movement passed.
- Feature smoke covered Gallery counts/state/lightbox, Events filters, Recruitment audio, Spotify embeds, Twills profile identity, shell links/behavior, and protected content rendering.

## 9. Recommendation

Next recommended step after this QA branch merges cleanly:

1. Tag `v2.2.0-cross-site-visual-baseline`.
