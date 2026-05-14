# Join Discord Widget Review

## 1. Implementation Inspection

Home widget absence:

- `index.html` no longer contains the Home Discord widget section.
- No Home widget iframe, `.home-discord-widget`, or `.discord-widget-frame` markup is present.
- Four Doors now flows directly into Member Spotlight.

Join widget count:

- `join.html` contains one Discord widget iframe.
- The iframe appears inside `.join-discord-widget`.

Join widget placement:

- The widget is inside the existing Quick Start card.
- It appears directly after the existing `#joinLinks` row.
- The placement remains adjacent to the Join path without creating a new standalone section.

Iframe attributes:

- `src="https://discord.com/widget?id=1078630751077142608&theme=dark"` is preserved.
- `width="350"` is preserved.
- `height="500"` is preserved.
- `sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"` is preserved.
- `frameborder="0"` is preserved.
- `allowtransparency="true"` is preserved.

Iframe title/loading status:

- `title="Mōchirīī Discord server widget"` is present and meaningful.
- `loading="lazy"` is present.

Join link status:

- Current refined Quick Start links are `Events`, `Guild Codex`, and `Ranks`.
- The Discord invite remains present in the checklist as `Open Discord`.
- Notes links remain `Leaders Hall` and `Home`.
- No link destinations were changed in this QA branch.

CSS scope:

- Widget styles are scoped to `body[data-page="join"]`.
- No broad global CSS selectors are used for the widget.
- The wrapper is capped with `width:min(100%, 350px)` and `max-width:350px`.

JS/data status:

- `join.js` unchanged.
- `home.js` unchanged.
- `data/join.json` unchanged in this QA branch.
- `data/home.json` unchanged.

Supabase safety status:

- No Supabase files changed.
- No Supabase commands were run.
- Signed-out browsing remains owned by the existing shared shell behavior.

## 2. Home Widget Absence Audit

Browser smoke passed at 360px, 390px, 640px, 768px, and 1440px.

- Home loads with header and footer intact.
- Discord widget iframe is absent from Home.
- `.home-discord-widget` and `.discord-widget-frame` are absent from Home.
- Four Doors still renders 4 cards.
- Home Gallery Spotlight still renders exactly 4 images.
- Guild seal poem renders unchanged.
- No broken spacing was found where the widget was removed.
- Horizontal overflow measured 0px at every checked viewport.
- No console-breaking errors were found.

## 3. Join Widget Audit

Browser smoke passed at 360px, 390px, 640px, 768px, and 1440px.

- Join loads with header and footer intact.
- Discord widget is present exactly once.
- The widget remains inside the existing Quick Start card.
- The widget appears directly after the existing `#joinLinks` row.
- The iframe wrapper stays compact: 286px at 360px viewport, 316px at 390px, 350px at 640px, 350px at 768px, and 315px inside the desktop Quick Start column at 1440px.
- Horizontal overflow measured 0px at every checked viewport.
- Existing Quick Start links remain `Events`, `Guild Codex`, and `Ranks`.
- Existing checklist links remain usable, including `Open Discord`, `Read the Codex`, and `View Events`.
- Notes links remain `Leaders Hall` and `Home`.
- Focus outlines are visible on checked Quick Start and Discord links.
- Checklist titles remain unchanged.
- No console-breaking errors were found.

Iframe attribute audit:

- `src` preserved.
- `width="350"` preserved.
- `height="500"` preserved.
- `sandbox` preserved.
- `frameborder="0"` preserved.
- `allowtransparency="true"` preserved.
- `title="Mōchirīī Discord server widget"` present.
- `loading="lazy"` present.

External iframe limitation:

- The audit verifies page markup, sizing, and layout stability. Any third-party Discord iframe content/network blocking would not by itself be treated as a site regression.

## 4. Cross-Page Regression Audit

Browser smoke passed at 390px for:

- `/events.html`
- `/gallery.html`
- `/recruitment.html`
- `/twills.html`
- `/spotify.html`

Results:

- Pages load with header and footer intact.
- Horizontal overflow measured 0px on each checked page.
- No console-breaking errors were found.
- Gallery thumbnails render and `npm run smoke:gallery` passes.
- Recruitment audio renders with the expected restored `mochiriiiiii.mp3` asset.
- Spotify embeds render with lazy loading.

## 5. Protected And Immutable Content Audit

Diff checks were empty for:

- `data/home.json`
- `data/join.json`
- `data/recruitment.json`
- `data/twills.json`
- `data/gallery.json`

Protected content remains unchanged:

- `data/home.json` `seal.verse`
- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`
- `data/twills.json` `profile.bio`

## 6. Fix Decision

No regressions were found. This QA branch is report-only.

- No HTML changes were made.
- No CSS changes were made.
- No JS changes were made.
- No data changes were made.
- No Supabase behavior changed.

## 7. Validation

| Command | Result |
| --- | --- |
| `node -e "JSON.parse(require('fs').readFileSync('data/join.json','utf8')); console.log('data/join.json JSON OK');"` | Passed |
| `npm run check` | Passed with the known intentional `assets/audio/mochiriiiiii.mp3` size warning |
| `git diff --check` | Passed |
| `node scripts/check-json.mjs` | Passed |
| `node scripts/check-js.mjs` | Passed |
| `node scripts/check-refs.mjs` | Passed |
| `node scripts/check-assets.mjs` | Passed with the known intentional `assets/audio/mochiriiiiii.mp3` size warning |
| `npm run check:production` | Passed |
| `npm run smoke:gallery` | Passed |

Supabase safety:

- No `supabase db push` was run.
- No Edge Functions were deployed.
