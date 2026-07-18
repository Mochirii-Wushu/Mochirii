# Side Pages Maintenance Guide

## 1. Purpose

This guide covers the side pages:

- Announcements
- Raffles
- Spotify
- Spotlight

Current page roles:

- Announcements: updates, notices, timing, and short public bulletins.
- Raffles: raffle information, prize/chance/fairness details where supported, and participation notes.
- Spotify: listening-room mood, music/embed presentation, and atmosphere through sound.
- Spotlight: member appreciation, short human story, and featured moment or person where supported.

Side pages should stay page-specific and should not duplicate:

- Join onboarding.
- Recruitment philosophy.
- Tome rules.
- Events schedule.
- Gallery archive.
- Leaders contact structure.
- Twills personal profile.

## 2. Data Sources

Current data sources:

- Announcements: `apps/web/public/data/announcements.json`
- Raffles: `apps/web/public/data/raffles.json`
- Spotify: `apps/web/public/data/spotify.json`
- Spotlight: `apps/web/public/data/spotlight.json`
- Rolling dates and weekly schedule timing: `apps/web/public/data/guild-schedule.json`

For each file:

- Keep JSON valid.
- Preserve the current schema unless the matching page renderer changes in the same scoped task.
- Add only fields the page renderer actually supports.
- Keep copy concise.
- Keep functional labels plain.
- Avoid inline HTML inside JSON unless a renderer explicitly supports it. Current side-page renderers treat JSON copy as text.

Current data shape summary:

- Announcements: `meta` plus `items[]`.
- Raffles: `meta`, `how[]`, `rules[]`, `thisMonth`, `links[]`, and `note[]`.
- Spotify: `intro` plus `items[]`.
- Spotlight: `hero` plus `spotlight`.

## 3. Announcements Rules

Current supported fields:

- `meta.title`
- `meta.tagline`
- `meta.intro`
- `meta.updated`
- `meta.badges[]`
- `meta.hero.image`
- `meta.hero.atmosphere`
- `items[].id`
- `items[].pinned`
- `items[].date`
- `items[].title`
- `items[].summary`
- `items[].details[]`
- `items[].tags[]`

How to add or update an announcement safely:

- Edit `apps/web/public/data/announcements.json`.
- Use `YYYY-MM-DD` for date-only values.
- Use `pinned: true` only for notices that should sort above regular notices.
- Keep summaries brief.
- Use `details[]` for short supporting bullets.
- The live Next Announcements page derives `weekly-schedule` details from `apps/web/public/data/guild-schedule.json`; keep fallback JSON details aligned with that schedule.
- Use `tags[]` for short labels.
- Do not add item-level links or images unless `announcements.js` is intentionally updated and validated.

Observed rendering rules:

- Pinned items sort first.
- Within pinned/non-pinned groups, newer date strings sort first.
- Dates render through UTC-safe formatting.
- Empty announcements render `No announcements yet.`
- Load failures render an unable-to-load message.

Tone lane: word, notice, bulletin, update, timing, news.

Do not turn Announcements into long Recruitment copy, an Events schedule replacement, Tome rules, or Gallery memories.

## 4. Raffles Rules

Current supported fields:

- `meta.kicker`
- `meta.title`
- `meta.intro`
- `meta.frequency`
- `meta.timezoneLabel`
- `meta.badges[]`
- `meta.hero.image`
- `meta.hero.atmosphere`
- `how[]`
- `rules[]`
- `thisMonth.date`
- `thisMonth.time`
- `thisMonth.timezone`
- `thisMonth.prizes[]`
- `thisMonth.notes`
- `links[].label`
- `links[].href`
- `note[]`

How to add or update a raffle safely:

- Edit `apps/web/public/data/raffles.json`.
- Keep `how[]`, `rules[]`, and `note[]` as plain text arrays.
- Keep prize and draw details clear enough to understand without extra interpretation.
- Use `thisMonth` for current raffle timing, prize, and note details.
- If `thisMonth.scheduleId` is present, the live Next Raffles page derives the visible date from `apps/web/public/data/guild-schedule.json`.
- Use `links[]` only for supported label/href links.
- Use relative links for site pages.
- Use full `https://` links for external destinations.

Observed rendering rules:

- `how[]` and `note[]` render as prose paragraphs.
- `rules[]` and `thisMonth.prizes[]` render as lists.
- `thisMonth.date`, `thisMonth.time`, and `thisMonth.timezone` join into one meta line.
- External `http` links receive `target="_blank"` and `rel="noopener noreferrer"`.
- Load failures render an unable-to-load message in the how-it-works area.

Tone lane: draw, ticket, prize, fairness, thanks, chance.

Rules should remain plain and clear. Raffles should not duplicate Events schedule, Join onboarding, Recruitment philosophy, or Announcements beyond short notice context.

## 5. Spotify Rules

Current supported fields:

- `intro`
- `items[].title`
- `items[].subtitle`
- `items[].description`
- `items[].type`
- `items[].tags[]`
- `items[].url`
- `items[].embed`
- `items[].height`

Current rendering:

- Spotify content renders as iframe embeds.
- Cards do not render external links.
- Search filters title, subtitle, description, tags, and type.
- Tag filters render as buttons with `aria-pressed`.
- Missing item fields receive safe defaults.

Valid Spotify URL expectations:

- The renderer accepts only `open.spotify.com`.
- It supports Spotify `album`, `artist`, `episode`, `playlist`, `show`, and `track` paths.
- It accepts normal Spotify URLs and existing `/embed/...` URLs.
- It normalizes supported URLs to `https://open.spotify.com/embed/{kind}/{id}?utm_source=generator`.
- Unsupported hosts, unsupported kinds, missing IDs, malformed URLs, and blank URLs do not render an embed card.

Current iframe behavior:

- Spotify iframe embeds are deferred by a player shell and mount only when the card nears the viewport.
- The deferred shell uses `IntersectionObserver`; when that browser API is unavailable, the player loads safely instead of leaving an empty card.
- Iframes use `width="100%"`.
- Height comes from `items[].height` when positive, otherwise the default is `352`.
- Iframes include `loading="lazy"`.
- Iframes include meaningful `title="Spotify embed: {title}"`.
- Iframes include the existing allow list: `autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture`.
- `.spotify-embed` hides overflow and the grid becomes one column below `980px`.

Fallback behavior:

- Invalid or missing item embed data skips that card.
- When no valid cards match the active search/filter state, the empty state appears.
- If playlist JSON fails to load, the page shows an unable-to-load intro and grid error message.

Tone lane: song, room, rhythm, rest, listening, quiet.

Do not add unsafe embeds, unsupported providers, custom iframe behavior, or URL-state behavior without renderer work and validation.

## 6. Spotlight Rules

Current supported fields:

- `hero.image`
- `hero.alt`
- `spotlight.kicker`
- `spotlight.title`
- `spotlight.date`
- `spotlight.tag`
- `spotlight.intro`
- `spotlight.badges[]`
- `spotlight.body[]` or a single body string
- `spotlight.conclusion`
- `spotlight.highlights[]`

How to add or update Spotlight safely:

- Edit `apps/web/public/data/spotlight.json`.
- Keep body text short and specific to the featured person or moment.
- Use `highlights[]` for concise appreciation bullets.
- Keep `spotlight.date` as a date-only value when possible.
- The live Next Spotlight page derives the visible date from the first day of the current UTC+8 month. It may replace the configured fallback title with the finalized monthly Discord poll winner name from `get-current-spotlight-winner`; that public poll path must display the winner name only and must not expose Discord handles, profile links, avatars, vote counts, or candidate lists.
- Keep hero alt text meaningful.
- Do not add profile/contact fields unless `spotlight.js` is intentionally updated and validated.

Observed rendering rules:

- Body renders as paragraphs.
- Badges are capped at 10 and each label is trimmed to 34 characters.
- Highlights are capped at 10.
- Missing body and missing highlights have placeholder fallbacks.
- `hero.atmosphereImage` is present in current JSON but is not read by `spotlight.js`.

Tone lane: name, gesture, thanks, story, moment, appreciation.

Avoid duplicating Leaders/Twills/Gallery roles. Spotlight should not become a contact profile, personal profile, full archive, or Recruitment essay.

## 7. Links, Images, and Embeds

- Internal links must resolve.
- External links must follow existing safe-link conventions.
- Raffles external links currently receive `target="_blank"` and `rel="noopener noreferrer"` through `raffles.js`.
- Image paths must resolve.
- Alt text should match visible content.
- Decorative or hidden atmosphere images should remain empty-alt and hidden.
- Spotify/embed URLs must follow current renderer expectations.
- Spotify embeds should not overflow on mobile.
- Spotify embeds use a two-column grid on desktop/tablet and a single column on mobile.
- Spotify iframe titles should remain meaningful.
- Unsupported link, image, or embed fields should not be added without renderer changes.

## 8. Script Load Order and Shared Shell

Current shared script order on side pages:

```text
utils.js -> supabase.js -> site.js -> page-specific script
```

Current side-page script order:

- `announcements.html`: `./utils.js` -> `./supabase.js` -> `./site.js` -> `./announcements.js`
- `raffles.html`: `./utils.js` -> `./supabase.js` -> `./site.js` -> `./raffles.js`
- `spotify.html`: `./utils.js` -> `./supabase.js` -> `./site.js` -> `./spotify.js`
- `spotlight.html`: `./utils.js` -> `./supabase.js` -> `./site.js` -> `./spotlight.js`

Do not reorder scripts casually. `utils.js` should remain available before shared and page scripts. `supabase.js` must not break signed-out public browsing. `site.js` owns shared header/footer/nav behavior and currently loads before page-specific scripts.

## 9. Tone Rules

- Side pages should stay concise and page-specific.
- Xianxia/Cupcake tone may appear lightly only where it fits.
- Functional labels stay plain.
- Avoid generic AI-like language.
- Avoid forced rhyme.
- Avoid `Where Winds Meet` in regular visible body copy outside header/footer.

The exact game name may remain in titles, metadata, SEO, JSON-LD, validation scripts, docs, reports, internal code, header, and footer.

## 10. Accessibility

Preserve these expectations:

- Side pages keep one sensible `h1`.
- Major sections use sensible `h2`/`h3` headings.
- Cards and lists remain readable.
- Focus states remain visible for links, buttons, and inputs.
- Interactive controls remain usable touch targets.
- Spotify search keeps a visible label.
- Spotify tag filters keep button semantics and `aria-pressed`.
- Spotify embeds keep meaningful iframe titles.
- Header, main, and footer landmarks remain sensible.
- Skip link continues to target `#main`.
- Mobile layouts should not have horizontal overflow.
- Screen reader text should stay clear and not noisy.

## 11. Validation

Run these checks before opening or merging side-page work:

```sh
npm run check
git diff --check
node scripts/check-json.mjs
node scripts/check-js.mjs
node scripts/check-refs.mjs
node scripts/check-assets.mjs
npm run check:production
```

Use `npm run smoke:gallery` as a general regression check if shared behavior could affect the gallery baseline. It expects a local static server on port `8765`.

## 12. Manual Side Pages Smoke Checklist

- `/announcements.html` loads.
- `/raffles.html` loads.
- `/spotify.html` loads.
- `/spotlight.html` loads.
- Header/footer render.
- Mobile nav works.
- Links resolve.
- Images render if present.
- Spotify embeds render if present.
- Spotify embeds do not overflow.
- Mobile widths `360px`, `390px`, and `768px` have no horizontal overflow.
- No console-breaking errors occur.
- Supabase page shell does not cause signed-out runtime errors.
- Protected recruitment body remains unchanged.
- Protected recruitment conclusion remains unchanged.
- Twills protected body remains unchanged.
- Guild seal poem remains unchanged.

## 13. Protected Content

Side-page work must not alter:

- `apps/web/public/data/home.json` `seal.verse`
- `apps/web/public/data/recruitment.json` `content.paragraphs`
- `apps/web/public/data/recruitment.json` `content.conclusion`
- `apps/web/public/data/twills.json` `profile.bio`
