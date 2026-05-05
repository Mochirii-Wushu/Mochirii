# Home/Shell Mobile Accessibility Review

## Scope

Focused QA review for the Home page and shared site shell on branch `qa/home-shell-mobile-accessibility-review`.

Reviewed:

- Home mobile layout at 360px, 390px, 768px, and 1440px.
- Shared header, navigation, mobile menu, skip link, landmarks, footer, and link safety.
- Shared script shell and signed-out public browsing.
- Home protected seal rendering and visible game-name rule.
- Regression behavior for Join, Events, Gallery, Ranks, Leaders, Codex, Recruitment, and Twills.

Protected data files were not edited.

## Script-Order Check

Expected order:

```text
utils.js -> supabase.js -> site.js -> page-specific script
```

| Page | Result | Script order |
| --- | --- | --- |
| `index.html` | Pass | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./home.js` |
| `join.html` | Pass | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./join.js` |
| `events.html` | Pass | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./events.js` |
| `gallery.html` | Pass | `./utils.js?v=2026-05-gallery-cache` -> `./supabase.js?v=2026-05-gallery-cache` -> `./site.js?v=2026-05-gallery-cache` -> `./gallery.js?v=2026-05-gallery-cache` |
| `ranks.html` | Pass | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./ranks.js` |
| `leaders.html` | Pass | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./leaders.js` |
| `codex.html` | Pass | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./codex.js` |
| `recruitment.html` | Pass | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./recruitment.js` |
| `announcements.html` | Pass | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./announcements.js` |
| `raffles.html` | Pass | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./raffles.js` |
| `spotify.html` | Pass | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./spotify.js` |
| `spotlight.html` | Pass | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./spotlight.js` |
| `twills.html` | Pass | `./utils.js` -> `./supabase.js` -> `./site.js` -> `./twills.js` |

No script-order issue was found. Gallery keeps the same order while using its existing cache-query strings.

## Findings

| Area | Finding | Severity | Evidence | Fix needed? | Notes |
| --- | --- | --- | --- | --- | --- |
| Home mobile layout | Home has no horizontal overflow at 360px. | Pass | `scrollWidth 360`, `clientWidth 360`. | No | Hero, seal, four doors, and Home gallery thumbnail rendered. |
| Home mobile layout | Home has no horizontal overflow at 390px. | Pass | `scrollWidth 390`, `clientWidth 390`. | No | CTA buttons measured 108x64 and 105x64. |
| Home mobile layout | Home has no horizontal overflow at 768px. | Pass | `scrollWidth 768`, `clientWidth 768`. | No | Hero and seal render side by side at this width. |
| Home mobile layout | Home desktop sanity check at 1440px is stable. | Pass | `scrollWidth 1440`, `clientWidth 1440`. | No | Home hero, seal, cards, doors, and gallery render. |
| Home mobile layout | Badges, descriptors, CTAs, doors, bulletin cards, spotlight, and gallery fit within mobile width. | Pass | Browser smoke found no overflow; Home CTAs stayed above 44px high. | No | No Home data or copy changes were needed. |
| Header/navigation | Header renders and desktop/mobile nav links resolve through existing reference checks and browser smoke. | Pass | `node scripts/check-refs.mjs` passed; browser smoke checked header links. | No | External Discord links keep `target="_blank"` and `rel="noopener noreferrer"`. |
| Header/navigation | Mobile menu opens, moves focus inside, closes with Escape, and returns focus to `#menu-btn`. | Pass | `aria-expanded` changed `false -> true -> false`; active focus returned to `menu-btn`. | No | Body scroll lock cleared after close. |
| Header/navigation | Mobile menu link targets are usable. | Pass | Mobile links measured 359x45 at 390px. | No | No keyboard trap found. |
| Header/navigation | Mobile close button hit area was below 44px before fix. | P2 | Audit measured `#mobile-menu button[data-close]` at 37x37px. | Yes | Fixed in `styles.css` by adding `min-width: 44px`, `min-height: 44px`, and `box-sizing: border-box` to `.icon-btn`; post-fix measurement is 44x44px. |
| Header/navigation | Active desktop nav state is present for Home. | Pass | `[data-nav="home"]` receives `aria-current="page"` through `site.js`. | No | Mobile links do not use active state; existing behavior documented. |
| Footer | Footer renders and remains compact on mobile. | Pass | Browser smoke found footer present and no document overflow at 390px. | No | Footer game-name usage remains allowed shell copy. |
| Footer | Footer external links use safe conventions. | Pass | Discord footer CTA has `target="_blank"` and `rel="noopener noreferrer"`. | No | No footer file changes. |
| Skip link / landmarks | Skip link appears with keyboard focus. | Pass | Keyboard Tab focused `.skip-link`; fresh check measured it visible at top of viewport. | No | Earlier programmatic-focus check was not used as a defect because keyboard focus is the real path. |
| Skip link / landmarks | Skip link jumps to main content. | Pass | Activating skip link set `location.hash` to `#main`, placed `main` at the top of the viewport, and next Tab moved into Home main content. | No | No markup or JS change needed. |
| Skip link / landmarks | Header/main/footer landmarks are sensible. | Pass | Shared header and footer mount; Home has `main#main`. | No | No duplicate landmark issue found. |
| Screen reader / semantics | Home has one sensible `h1`. | Pass | Browser query found one `h1`: `Mōchirīī`. | No | Static Home heading remains unchanged. |
| Screen reader / semantics | Major Home sections use sensible headings. | Pass | Main headings include Guild Bulletin, Four Doors, Member Spotlight, and Screenshot Spotlight. | No | Rendered card titles appear as `h3` where present. |
| Screen reader / semantics | Image alt behavior is acceptable. | Pass | Hero, seal, door, bulletin, spotlight, and gallery images have meaningful or intentionally empty alt paths. | No | Decorative atmosphere image remains empty-alt and `aria-hidden`. |
| Shared script shell | `utils.js`, `supabase.js`, `site.js`, and `home.js` load on Home. | Pass | Browser smoke found `window.MochiriiUtils` and `window.MochiriiSupabase` as objects and Home content rendered. | No | Script order unchanged. |
| Shared script shell | Signed-out public browsing works without Supabase runtime errors. | Pass | Browser smoke found no console/page errors on Home and regression pages. | No | `supabase.js` was not edited. |
| Game-name/protected content | Visible Home body copy outside header/footer avoids `Where Winds Meet`. | Pass | DOM text scan excluding `#header` and `#footer` found no exact game name. | No | Metadata/header/footer remain allowed contexts. |
| Game-name/protected content | Guild seal poem renders unchanged. | Pass | Browser smoke found seal text beginning with `Silvered jade softly gleams` and ending with `kindred spirits grew.` | No | `data/home.json` was not edited. |
| Game-name/protected content | Protected Recruitment and Twills content remained untouched. | Pass | `git diff -- data/recruitment.json data/twills.json` is empty. | No | No data files changed. |
| Regression behavior | Gallery categories, count, Copy link, URL state, and lightbox still work. | Pass | Browser smoke: 6 filters, `category=portraits` URL state, Copy link status, lightbox loaded full image path instead of `/thumbs/`. | No | `npm run smoke:gallery` also passes with local server. |
| Regression behavior | Events filters still work. | Pass | Browser smoke activated All filter; `aria-pressed="true"` and count rendered. | No | No Events behavior changed. |
| Regression behavior | Join checklist still renders. | Pass | Browser smoke found 5 checklist items. | No | No Join behavior changed. |
| Regression behavior | Codex, Ranks, Leaders, Recruitment, and Twills still load. | Pass | Browser smoke found main content on all checked pages with no console/page errors. | No | No page-specific files changed. |

## Fix Applied

Confirmed issue:

- Mobile menu close button rendered at 37x37px, below the 44px touch target expectation.

Applied fix:

- Updated `.icon-btn` in `styles.css` with `min-width: 44px`, `min-height: 44px`, and `box-sizing: border-box`.

Post-fix evidence:

- Mobile close button measured 44x44px at 390px.
- Escape close and focus return to `#menu-btn` still pass.
- No horizontal overflow was introduced.

## Cache Query Note

`styles.css` changed. The current repository convention only applies cache-query strings to Gallery references; most public pages load `./styles.css` without a query string. No cache-query strings were changed in this QA branch because the current convention does not provide a repo-wide shared CSS versioning pattern, and the requested scope limits changes to Home/Shell QA files.

## Protected Content Confirmation

No changes were made to:

- `data/home.json` `seal.verse`
- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`
- `data/twills.json` `profile.bio`
