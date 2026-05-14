# Join Discord Widget Relocation

## 1. Current State

Current Home widget location:

- `index.html` contains a Home-only Discord widget section after the Four Doors section and before Member Spotlight.
- The Home widget is a standalone `section.home-discord-widget` with copy, a Discord CTA, and the iframe.

Current iframe attributes:

- `title="Mōchirīī Discord server widget"`
- `src="https://discord.com/widget?id=1078630751077142608&theme=dark"`
- `width="350"`
- `height="500"`
- `loading="lazy"`
- `allowtransparency="true"`
- `frameborder="0"`
- `sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"`

Current Home widget styles:

- `styles.css` has Home-scoped selectors for `.home-discord-widget`, `.home-discord-widget__copy`, `.home-discord-widget__actions`, and `.discord-widget-frame`.
- The Home layout uses two columns at wider widths and a centered single column below `640px`.
- The frame is capped at `350px` and uses `box-sizing:border-box`.

Current Join page structure:

- `join.html` is a static shell with placeholder containers.
- `join.js` renders Join content from `data/join.json` into those placeholders.
- The first main grid has an `8/4` split: The Joining Path on the left and Quick Start on the right.
- Quick Start already contains the Discord path through `#joinLinks`, which renders the existing `Join Discord`, `Events`, `Guild Codex`, and `Ranks` links.
- The newcomer checklist follows directly after the first grid row.

Best minimal Join placement:

- Place the iframe inside the existing Quick Start card, directly after `#joinLinks`.
- This keeps the widget adjacent to the current Discord CTA/link area without adding a large new standalone section.
- The existing `Join Discord` link remains data-rendered, safe-linked, and unchanged.

Join data/rendering status:

- Join is mixed: layout in `join.html`, content in `data/join.json`, rendering in `join.js`.
- No Join data or renderer change is needed for a static iframe embed.
- No JavaScript changes are needed.

## 2. Relocation Plan

- Remove Home Discord widget markup from `index.html`.
- Remove obsolete Home-only widget styles from `styles.css`.
- Add compact Join-only Discord widget markup to `join.html` inside the existing Quick Start card, after `#joinLinks`.
- Preserve the iframe `src` and required attributes from the Home implementation.
- Preserve iframe `title` and `loading="lazy"`.
- Keep existing Join data/copy unchanged.
- Keep existing Discord invite CTA/link behavior unchanged.
- Keep the widget visually minimal.
- Use Join-scoped styles.
- Avoid JS changes unless strictly required.

Compact layout requirements:

- The iframe wrapper should use `max-width:350px`.
- The iframe should use `width:100%` inside the wrapper.
- The widget must avoid mobile overflow.
- The widget should center on mobile.
- The widget should fit naturally in Join's current visual system.
- The widget should not overpower the Join checklist or onboarding content.

## 3. Changes Made

Home widget removal:

- Removed the standalone Home Discord widget section from `index.html`.
- Removed obsolete Home-only widget selectors from `styles.css`.
- Home still keeps its existing hero Discord CTA and How to Join link.
- Four Doors now flows directly into Member Spotlight, restoring the previous Home section rhythm.

Join widget placement:

- Added the Discord iframe to `join.html` inside the existing Quick Start card.
- Placement is directly after the existing `#joinLinks` row that renders Join Discord, Events, Guild Codex, and Ranks.
- No new visible Join copy was added.
- The wrapper uses `aria-label="Mōchirīī Discord server widget"` and the iframe keeps its own meaningful `title`.

Iframe attribute status:

- `src` preserved: `https://discord.com/widget?id=1078630751077142608&theme=dark`.
- `width="350"` preserved.
- `height="500"` preserved.
- `sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"` preserved.
- `frameborder="0"` preserved.
- `allowtransparency="true"` preserved.
- `title="Mōchirīī Discord server widget"` preserved.
- `loading="lazy"` preserved.

CTA/link status:

- Existing Join Discord, Events, Guild Codex, and Ranks links remain data-rendered from `data/join.json`.
- Existing Discord invite URL remains `https://discord.com/invite/dPafqMwWPK`.
- Existing external-link safety behavior remains owned by `join.js`.
- Checklist links and Notes links were not changed.

CSS scope:

- Added compact Join-scoped styles for `.join-discord-widget` and `.join-discord-widget__frame`.
- The frame uses `width:min(100%, 350px)`, `max-width:350px`, and `box-sizing:border-box`.
- The iframe uses `width:100%`, `max-width:350px`, and `height:500px`.
- No global CSS selectors, heavy animation, new assets, or new dependencies were added.

JS/data status:

- `join.js` unchanged.
- `home.js` unchanged.
- `data/join.json` unchanged.
- No Supabase behavior changed.

## 4. QA Results

Command validation:

| Command | Result | Notes |
| --- | --- | --- |
| `npm run check` | Pass | Known intentional `assets/audio/mochiriiiiii.mp3` size warning only. |
| `git diff --check` | Pass | No whitespace errors. |
| `node scripts/check-json.mjs` | Pass | JSON validation passed. |
| `node scripts/check-js.mjs` | Pass | JavaScript syntax validation passed. |
| `node scripts/check-refs.mjs` | Pass | Local references OK, `474` refs checked. |
| `node scripts/check-assets.mjs` | Pass with known warning | `assets/audio/mochiriiiiii.mp3` exceeds the normal threshold intentionally. |
| `npm run check:production` | Pass | Production smoke check OK. |
| `npm run smoke:gallery` | Pass | Gallery lightbox smoke OK with a local server on port `8765`. |

Home result:

- Home loaded at `360px`, `390px`, `640px`, `768px`, and `1440px`.
- Discord iframe widget is absent from Home.
- Four Doors rendered `4` cards.
- Home Gallery Spotlight rendered `4` items.
- Guild seal poem rendered expected text.
- No broken spacing, horizontal overflow, or console-breaking errors were observed.

Join desktop/mobile result:

- Join loaded at `360px`, `390px`, `640px`, `768px`, and `1440px`.
- Discord iframe widget is present exactly once on Join.
- Widget is placed directly under the existing Quick Start links.
- Frame rendered within cap: `286px` at `360px`, `316px` at `390px`, `350px` at `640px`, `350px` at `768px`, and `315px` inside the desktop Quick Start column at `1440px`.
- No horizontal overflow or console-breaking errors were observed.

Iframe/network limitation:

- The site layout and markup validated successfully.
- If Discord blocks iframe content in a browser or network context, that should be treated as an external widget/network limitation, not a site failure, as long as markup and layout remain stable.

Link result:

- `Join Discord` remains `https://discord.com/invite/dPafqMwWPK` with safe external-link attributes.
- `Events` remains `./events.html`.
- `Guild Codex` remains `./codex.html`.
- `Ranks` remains `./ranks.html`.
- Checklist `Open Discord`, `Read the Codex`, and `View Events` links remain unchanged.
- Checklist titles and count remained unchanged.
- Focus states remained visible.

Cross-page regression result:

- `/events.html`: Pass at `390px`.
- `/gallery.html`: Pass at `390px`.
- `/recruitment.html`: Pass at `390px`.
- `/twills.html`: Pass at `390px`.
- `/spotify.html`: Pass at `390px`.
- Gallery smoke also passed through the project smoke script.

Protected content result:

- `data/home.json`: no diff; `seal.verse` unchanged.
- `data/join.json`: no diff.
- `data/recruitment.json`: no diff; protected body and conclusion unchanged.
- `data/twills.json`: no diff; `profile.bio` unchanged.
- `data/gallery.json`: no diff.

Known warnings:

- `assets/audio/mochiriiiiii.mp3` intentionally exceeds the normal large-asset threshold.
- GitHub-managed Pages may still emit the known non-blocking Node.js 20 annotation.
