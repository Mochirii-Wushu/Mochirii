# Side Pages Mobile Accessibility Review

## Scope

Focused QA review for:

- `/announcements.html`
- `/raffles.html`
- `/spotify.html`
- `/spotlight.html`

Reference docs:

- `docs/side-pages-guide.md`
- `reports/side-pages-implementation-inventory.md`
- `AGENTS.md`

This review checked current side-page behavior only. It did not change side-page data, copy, schemas, Spotify embed normalization, Supabase behavior, protected content, docs, assets, workflows, or validation scripts.

## Baseline

- `main` was clean before branch creation.
- Latest local `main` included merge commit `6242929`, which is later than side-pages docs merge `62429290b01a12107ddc380e2a0db956ed44f99c`.
- `npm run check` passed with the known `assets/audio/mochiriiiiii.mp3` size warning.
- `git diff --check` passed.
- `npm run check:production` passed.
- Initial `npm run smoke:gallery || true` was non-blocking due to `ERR_CONNECTION_REFUSED` before the local server was started.

## Audit Findings

| Page | Area | Finding | Severity | Evidence | Fix needed? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Announcements | Mobile layout | Hero, metadata, badges, cards, and details rendered without horizontal overflow at `360px`, `390px`, `768px`, and `1440px`. | Pass | Playwright DOM smoke showed `overflow: false`, one `h1`, expected `h2`/`h3` order, and no console/page errors. | No | No links, buttons, iframes, or page-local controls are rendered in Announcements. |
| Announcements | Screen reader / semantics | Heading order, section cards, list content, image alt text, and hidden atmosphere image matched current guide expectations. | Pass | Rendered headings were `h1` page title, `h2` Latest Notices, and `h3` announcement titles. Hero image had meaningful alt text; atmosphere image remained empty-alt and `aria-hidden`. | No | `aria-live` remains on the announcements list and error status exists. |
| Announcements | Page behavior | Pinned/date ordering, badges, and details rendered as expected. | Pass | Rendered order was Weekly Schedule Posted, Training Focus: Fundamentals, Gallery Submissions Open, matching pinned-first then newest-date behavior. | No | No public links are currently supported or rendered. |
| Raffles | Mobile layout | Layout, rules, current-month content, and note rendered without horizontal overflow at `360px`, `390px`, `768px`, and `1440px`. | Pass | Playwright DOM smoke showed `overflow: false`, one `h1`, expected `h2`/`h3` order, and no console/page errors. | No | Main grid collapses through existing responsive grid behavior. |
| Raffles | Link touch targets | Raffle links were keyboard reachable and safe, but the anchor boxes were only text-height instead of touch-target sized. | P2 | Before fix, at `360px` and `390px`, `Raffle channel` measured about `90x17px` and `Events page` about `73x17px`. After fix, both links measured at least `44px` high, with no overflow or console errors. | Fixed | Added a scoped `body[data-page="raffles"] #rafflesLinks > span > a` CSS rule in `styles.css`. |
| Raffles | Link safety | External raffle link used `target="_blank"` and `rel="noopener noreferrer"`; internal Events link stayed same-tab. | Pass | Rendered link attributes matched `raffles.js` safe-link behavior. | No | Link behavior should not change. |
| Spotify | Mobile layout / embeds | Spotify cards and iframes rendered without horizontal overflow at `360px`, `390px`, `768px`, and `1440px`. | Pass | Eight iframes rendered from valid data; all used `width="100%"`, meaningful `title`, and `loading="lazy"`. | No | Third-party iframe content itself was not treated as a site failure boundary. |
| Spotify | Search input focus / touch target | Search input was keyboard reachable, but its inline CSS removed the visible focus outline and its measured height was below the expected touch target. | P2 | Before fix, keyboard audit showed `#spotifySearch` focused with computed outline `none`; measured height was about `37px`. After fix, the input measured `44px` high and had a visible `2px` focus outline at checked widths. | Fixed | Updated page-local CSS in `spotify.html`; search behavior was preserved. |
| Spotify | Tag filter touch targets | Tag buttons were keyboard accessible and used `aria-pressed`, but their measured target height was below the expected touch target. | P2 | Before fix, tag buttons measured about `30px` high. After fix, filter chips measured at least `44x44px` at checked widths, with no overflow or console errors. | Fixed | Updated page-local CSS in `spotify.html`; filter behavior and `aria-pressed` were preserved. |
| Spotify | Search/filter behavior | Search, tag filtering, and no-match empty state worked. | Pass | Search for `Night` returned two cards; `Calm` tag selected by keyboard returned one card with `aria-pressed="true"`; no-match query rendered empty state. | No | Behavior should not change. |
| Spotify | URL normalization / invalid data safety | Normalization allowed supported Spotify URLs and returned an empty string for unsupported host, unsupported kind, missing, and malformed values. | Pass | `toSpotifyEmbedSrc()` returned `/embed/track/...` for a valid track, `/embed/album/...` for embed album, and `""` for invalid cases. | No | No Spotify embed behavior change is needed. |
| Spotlight | Mobile layout | Hero, body, conclusion, badges, and highlights rendered without horizontal overflow at `360px`, `390px`, `768px`, and `1440px`. | Pass | Playwright DOM smoke showed `overflow: false`, one `h1`, expected `h2`/`h3` order, and no console/page errors. | No | No page-local interactive controls are rendered. |
| Spotlight | Screen reader / semantics | Heading order, paragraphs, highlights list, hero alt text, and hidden atmosphere image matched current guide expectations. | Pass | Rendered headings were `h1` Spotlight title, `h2` Appreciation, and `h3` Highlights. Hero image had meaningful alt text; atmosphere image remained empty-alt and `aria-hidden`. | No | Present-but-unrendered `hero.atmosphereImage` did not affect rendering. |
| Shared shell | Header/footer/mobile nav | Header and footer rendered on all side pages; mobile menu opened/closed and returned focus at `360px`, `390px`, and `768px`. | Pass | Playwright smoke confirmed `aria-expanded` changed, Escape closed the menu, and focus returned to `#menu-btn`. | No | Desktop viewport correctly hides the mobile menu button. |
| Shared shell | Script order / Supabase | Side pages kept `utils.js` -> `supabase.js` -> `site.js` -> page script; `window.MochiriiSupabase` loaded without signed-out runtime errors. | Pass | Script scan matched expected order on all four side pages; browser smoke showed no console/page errors and `window.MochiriiSupabase` present. | No | No Supabase behavior changed. |
| Shared shell | Game-name rule / protected content | Visible body copy outside header/footer avoided `Where Winds Meet`; protected data files were not edited. | Pass | Browser text scan outside header/footer found no exact game-name phrase in side-page body copy. | No | Titles and metadata may retain the exact game name per guide. |

## Fixes Applied

Confirmed issues were limited to touch target and focus styling:

- Added a page-scoped Raffles rule for `#rafflesLinks a` so rendered raffle links use a usable inline-flex target without changing link behavior.
- Adjusted Spotify page-local CSS so `#spotifySearch` has a visible `:focus-visible` state and a `44px` minimum target height.
- Adjusted Spotify tag button CSS so filter chips have `44px` minimum target dimensions without changing filtering behavior.

No data, copy, schema, docs, README, AGENTS, assets, workflows, validation scripts, Supabase behavior, or protected content changes are required.

Because `styles.css` changed for the scoped Raffles fix, production cache should be watched during deployment. This branch does not add cache-query changes.

## Fix Verification

Post-fix targeted browser checks confirmed:

- Raffles rendered links measured at least `44px` high at `360px`, `390px`, `768px`, and `1440px`.
- Spotify search input measured `44px` high and had visible focus styling at `360px`, `390px`, `768px`, and `1440px`.
- Spotify tag controls measured at least `44x44px` at `360px`, `390px`, `768px`, and `1440px`.
- No horizontal overflow, console errors, or page errors appeared in the targeted fix verification.

## Regression Smoke

Browser smoke also checked:

- `/`
- `/join.html`
- `/events.html`
- `/gallery.html`
- `/codex.html`
- `/ranks.html`
- `/leaders.html`
- `/recruitment.html`
- `/twills.html`

At `390px`, these pages loaded header/footer, had no horizontal overflow, exposed `window.MochiriiSupabase`, and produced no console-breaking or page errors.

## Validation Results

| Check | Result |
| --- | --- |
| `npm run check` | Pass; known `assets/audio/mochiriiiiii.mp3` size warning only. |
| `git diff --check` | Pass. |
| `node scripts/check-js.mjs` | Pass. |
| `node scripts/check-json.mjs` | Pass. |
| `node scripts/check-refs.mjs` | Pass. |
| `node scripts/check-assets.mjs` | Pass; known MP3 size warning only. |
| `npm run check:production` | Pass. |
| Side pages browser smoke | Pass at `360px`, `390px`, `768px`, and `1440px`. |
| Regression browser smoke | Pass for `/`, Join, Events, Gallery, Codex, Ranks, Leaders, Recruitment, and Twills at `390px`. |
| `npm run smoke:gallery` | Pass with local server running on port `8765`. |

## Protected Content

No diffs were present in:

- `data/home.json`
- `data/recruitment.json`
- `data/twills.json`
