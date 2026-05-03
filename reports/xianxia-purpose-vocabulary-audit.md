# Xianxia Purpose and Vocabulary Audit — Mōchirīī Website

## Scope

This audit reviews public page purpose, visible copy overlap, Mōchirīī xianxia house style, repeated vocabulary, Cupcake usage, AI-like phrasing, and visible body-copy use of the exact game name.

Protected content remains out of scope for editing:
- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`
- `data/home.json` `seal.verse`

## Corrected Game-Name Rule

The exact phrase `Where Winds Meet` may remain in titles, metadata, Open Graph, Twitter metadata, JSON-LD, validation scripts, internal code, docs, reports, `header.html`, and `footer.html`.

The phrase should be avoided in regular visible body copy outside header/footer. Fields were classified by renderer behavior, not file type alone.

## Matrix 1 — Page Purpose

| Page | Source files | Primary purpose | Overlap risk | Necessary? | Notes |
| --- | --- | --- | --- | --- | --- |
| Home | `index.html`, `data/home.json`, `home.js` | First impression, guild identity, paths into Join, Events, Gallery, Codex | Medium | Yes | Hero and tiles should invite without becoming Join/Event copy. |
| Join | `join.html`, `data/join.json`, `join.js` | Onboarding, checklist, Discord, first steps | Medium | Yes | Keep action-focused; avoid repeating Recruitment philosophy or full Codex. |
| Events | `events.html`, `data/events.json`, `events.js` | Schedule browsing, filters, participation cues | Low | Yes | Event board owns timing and RSVP language. |
| Gallery | `gallery.html`, `data/gallery.json`, `gallery.js` | Visual memory and screenshots | Low | Yes | Should preserve moments, not recruit or explain policy. |
| Ranks | `ranks.html`, `data/ranks.json`, `ranks.js` | Progression, trust, rank meaning | Medium | Yes | Avoid duplicating Leaders; keep rank-path meaning. |
| Leaders | `leaders.html`, `data/leaders.json`, `leaders.js` | Stewardship, contact clarity, leadership presence | Medium | Yes | Contact hierarchy belongs here, not Ranks or Codex. |
| Codex | `codex.html`, `data/codex.json`, `codex.js` | Values, conduct, customs, rules | Medium | Yes | Rules stay clear; no dessert language in serious guidance. |
| Recruitment | `recruitment.html`, `data/recruitment.json`, `recruitment.js` | Recruitment philosophy and protected long-form message | Medium | Yes | Do not duplicate Join checklist or Codex; protected body unchanged. |
| Announcements | `announcements.html`, `data/announcements.json`, `announcements.js` | Updates, notices, timing | Low | Yes | Schedule details should remain precise. |
| Raffles | `raffles.html`, `data/raffles.json`, `raffles.js` | Raffle rules, thanks, fairness | Low | Yes | Rules stay plain; gratitude can be warmer. |
| Spotify | `spotify.html`, `data/spotify.json`, `spotify.js` | Listening-room mood and music atmosphere | Low | Yes | Owns ambient mood; not a guild policy page. |
| Spotlight | `spotlight.html`, `data/spotlight.json`, `spotlight.js` | Member appreciation and human story | Low | Yes | Keep specific and personal. |
| Twills | `twills.html`, `data/twills.json`, `twills.js` | Personal leader voice and contact presence | Low | Yes | Keep signature voice distinct from Leaders page. |
| Header | `header.html` | Navigation only | Low | Yes | Exact game name allowed. |
| Footer | `footer.html` | Compact identity and closing warmth | Low | Yes | Exact game name allowed. |
| Metadata | root HTML heads, JSON-LD | SEO/social context | Low | Yes | Exact game name allowed; not part of regular body copy. |

## Matrix 2 — Tone and Style

| Page | Source files | Current voice | Xianxia fit | Cupcake fit | AI-like phrasing | Needs edit? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home | `index.html`, `data/home.json` | Warm, broad, slightly repetitive | Medium | Sparse | Low | Yes | Replace visible game-name body use; add more house identity without metadata churn. |
| Join | `join.html`, `data/join.json` | Clear and welcoming | Medium | Present but not heavy | Low | Yes | Replace visible game-name body use; reduce procedural language. |
| Events | `events.html`, `data/events.json` | Clear, calm | Medium | None needed | Low | Yes | Replace visible game-name body use; use calendar/path language lightly. |
| Gallery | `gallery.html`, `data/gallery.json` | Warm after prior caption sweep | Medium | None needed | Low | Light | Add slight visual-memory distinction; preserve paths. |
| Ranks | `ranks.html`, `data/ranks.json` | Useful, slightly formal | Medium | None needed | Low | Light | Reduce overlap with Leaders; emphasize cultivation/trust. |
| Leaders | `leaders.html`, `data/leaders.json` | Operational but kind | Medium | None needed | Low | Light | Sharpen stewardship and contact clarity. |
| Codex | `codex.html`, `data/codex.json` | Clear values and conduct | Medium | Minimal | Low | Light | Keep rules plain; use house style in supporting copy only. |
| Recruitment | `recruitment.html`, `data/recruitment.json` | Strong protected essay | Medium | None needed | Low | Light outside body | Visible badge uses exact game name; editable fields only. |
| Announcements | `announcements.html`, `data/announcements.json` | Practical | Low-Medium | None needed | Low | Light | Keep notices distinct from Events. |
| Raffles | `raffles.html`, `data/raffles.json` | Clear, dry | Low-Medium | Light thank-you only | Low | Light | Add fairness/thanks warmth. |
| Spotify | `spotify.html`, `data/spotify.json` | Quiet | Medium | None needed | Low | Light | Strengthen listening-room purpose. |
| Spotlight | `spotlight.html`, `data/spotlight.json` | Warm and human | Medium | None needed | Low | No/Light | Already distinct; small wording only if useful. |
| Twills | `twills.html`, `data/twills.json` | Personal and sincere | Medium | None needed | Low | No | Leave contact details untouched. |
| Header | `header.html` | Plain navigation | N/A | None | None | No | Leave stable. |
| Footer | `footer.html` | Compact warmth | Medium | Sparse | Low | Light | Exact game name allowed here. |
| Metadata | HTML heads, JSON-LD | SEO-oriented | N/A | None | Some generic by design | No | Preserve game-name phrase and production expectations. |

## Matrix 3 — Vocabulary Repetition

| Term / phrase | Rough frequency | Pages affected | Keep / reduce / replace | Notes |
| --- | ---: | --- | --- | --- |
| guild | High | Most pages | Keep, reduce where crowded | Necessary identity term; use hall/path/road sparingly as alternates. |
| hall | Medium | Home, Join, Events, Leaders, Codex, Footer | Keep | Core house image; avoid every sentence using it. |
| steady | Medium | Home, Ranks, Leaders, Codex, Spotlight | Reduce slightly | Useful but repeated; replace with calm, clear, rooted, patient where natural. |
| care | Medium | Many content pages | Keep, reduce only when stacked | A core value; avoid abstract clusters. |
| shared runs / runs | Medium | Home, Join, Events, Gallery, Codex | Keep page-specific | Events owns participation; Gallery owns memory; Home teasers stay brief. |
| clear | Medium | Join, Events, Leaders, Codex, docs | Keep for instruction | Functional clarity matters. |
| warm / warmth | Medium | Home, Join, Spotlight, Footer | Keep sparse | Pairs with Cupcake thread; avoid overuse. |
| road / path | Medium | Home, Join, Gallery, Leaders, Ranks | Keep sparingly | Good xianxia house flavor, but not every page. |
| Cupcake | Low | Join, docs/reports | Keep sparse | Existing checklist/naps are enough. |
| Where Winds Meet | Many overall, few visible data fields | Metadata, header/footer, data visible copy, docs, reports, scripts | Preserve allowed; remove from visible body copy outside header/footer | Metadata and validation usage remains unchanged. |

## Game-Name Classification

Allowed occurrences:
- `header.html`: public brand text
- `footer.html`: public brand/footer text
- root HTML `<title>`, meta descriptions, Open Graph, Twitter metadata, JSON-LD
- `scripts/check-production.mjs`: validation expectation
- `package.json`, `README.md`, `docs/content-guide.md`: internal/docs context
- existing reports: historical report content

Needs review and selected for editing because fields render as visible body copy:
- `index.html`: `#homeKicker`
- `data/home.json`: `hero.descriptor[0]`
- `data/join.json`: `hero.intro`
- `data/join.json`: `steps.items[0].description`
- `data/events.json`: `meta.intro`
- `data/recruitment.json`: `meta.badges[0]`

## Planned Sweep

- Remove the exact game name only from visible body copy outside header/footer.
- Keep titles, SEO metadata, JSON-LD, validation scripts, and reports unchanged.
- Strengthen page-specific vocabulary so Home invites, Join orients, Events schedules, Gallery remembers, Ranks explains progression, Leaders directs contact, Codex defines conduct, Recruitment preserves philosophy, and side pages keep their own jobs.
- Keep Cupcake language sparse and avoid adding dessert language to rules.
- Do not edit JS, CSS, assets, workflows, routes, validation scripts, protected recruitment body, or guild seal poem.

## Sweep Outcome

- Removed the exact game name only from regular visible body copy outside header/footer.
- Preserved titles, SEO metadata, Open Graph, Twitter metadata, JSON-LD, validation scripts, internal code, docs, and historical reports.
- Kept `scripts/check-production.mjs` unchanged.
- Replaced visible body-copy game-name mentions with clearer house-style language: `Jianghu Guild Hall`, `cozy guild hall`, `guild home`, `the guild`, `the game channels`, and `The Jianghu`.
- Reduced repeated "steady" wording with more page-specific alternatives such as patient, rooted, calm, clear, and grounded.
- Added xianxia flavor sparingly through lantern, Jianghu, path, table, rooted, and hall language.
- Kept Cupcake language sparse and did not add it to rules or serious conduct guidance.
- Left the protected recruitment body and guild seal poem unchanged.
