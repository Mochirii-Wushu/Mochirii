# Post-Goal Cross-Site Regression Review

Date: 2026-05-14
Branch: `qa/post-goal-cross-site-regression-review`
Goal: G15
Mode: QA/report-only

## 1. Scope

This review checked the public static site after completion of the Supabase, member Gallery, Discord widget relocation, documentation, and cleanup-planning goal sequence.

No implementation files were changed.

No data files, protected content, CSS, JavaScript, assets, workflows, validation scripts, Supabase migrations, Supabase configuration, or Edge Functions were changed.

No Supabase database mutation was run. No Edge Functions were deployed.

## 2. Routes Checked

Browser smoke used the local static server at `http://127.0.0.1:8765`.

Sitemap routes checked at `360px`, `390px`, `768px`, and `1440px`:

| Route | Result | Notes |
| --- | --- | --- |
| `/` | Pass | Home loads, header/footer render, no Discord widget, Four Doors render, guild seal renders, Home Gallery renders 4 items. |
| `/join.html` | Pass | Join loads, Discord widget appears exactly once inside Quick Start, checklist renders, no overflow. |
| `/events.html` | Pass | Events loads, Upcoming/Past/All filters work, UTC-safe rendered state remains stable. |
| `/gallery.html` | Pass | Gallery loads 73 static images locally, thumbnails use `/thumbs/`, lightbox opens full image path. |
| `/ranks.html` | Pass | Ranks loads with shell and page layout stable. |
| `/leaders.html` | Pass | Leaders loads with shell and page layout stable. |
| `/codex.html` | Pass | Codex loads with shell and page layout stable. |
| `/recruitment.html` | Pass | Recruitment loads, native audio points to `assets/audio/mochiriiiiii.mp3`, protected body renders. |
| `/announcements.html` | Pass | Announcements loads with shell and page layout stable. |
| `/raffles.html` | Pass | Raffles loads with shell and page layout stable. |
| `/spotify.html` | Pass | Spotify loads; search works; embeds keep `open.spotify.com/embed/...`, titles, and lazy loading. |
| `/spotlight.html` | Pass | Spotlight loads with shell and page layout stable. |
| `/twills.html` | Pass | Twills loads, profile page remains stable, protected profile body unchanged. |

Member workflow pages checked at the same viewports:

| Route | Result | Notes |
| --- | --- | --- |
| `/auth.html` | Pass | Signed-out state renders; Supabase helper is present and non-blocking. |
| `/account.html` | Pass | Signed-out Account gate renders; private dashboard stays unavailable without session. |
| `/gallery-submit.html` | Pass | Signed-out upload gate renders; upload panel stays unavailable without session. |
| `/leader-dashboard.html` | Pass | Signed-out dashboard gate renders; moderation queue stays unavailable without session. |

## 3. Browser Smoke Result

| Check | Result |
| --- | --- |
| Page/viewport matrix | Pass: 68 route/viewport checks. |
| Sitemap route matrix | Pass: 52 route/viewport checks. |
| Member page matrix | Pass: 16 route/viewport checks. |
| Mobile shell | Pass: 17 routes at `390px`. |
| Header/footer | Pass on every route. |
| One `h1` per page | Pass on every route. |
| No horizontal overflow | Pass at `360px`, `390px`, `768px`, and `1440px`. |
| Console/page errors | No console-breaking site errors found. |
| Skip link | Pass on every route at `390px`. |
| Mobile nav | Open, Escape close, and focus behavior passed on every route at `390px`. |
| Production smoke | `npm run check:production` passed. |

The first inline QA script used a stale Events selector and reported zero filters. Source inspection showed the current selector is `[data-events-filter]`, and a focused rerun confirmed Upcoming, Past, and All filters all activate correctly. This was a QA-script selector issue, not a site regression.

## 4. Feature Results

| Area | Result | Evidence |
| --- | --- | --- |
| Home Discord absence | Pass | Home has zero Discord widget iframes. |
| Home Gallery Spotlight | Pass | Home Gallery rendered 4 linked thumbnail items and the spotlight card image. |
| Join Discord widget | Pass | Exactly one Discord iframe, inside the Quick Start area, after existing Join links. |
| Join iframe attributes | Pass | `src`, `width`, `height`, `sandbox`, `frameborder`, `allowtransparency`, `title`, and `loading` match the expected widget contract. |
| Join checklist | Pass | Checklist renders 5 items. |
| Gallery | Pass | 73 static items locally; first grid image used a thumbnail path; lightbox used the full image path. |
| Events | Pass | Upcoming empty state, Past 1 event, and All 1 event rendered with active `aria-pressed` updates. |
| Recruitment audio | Pass | Native audio controls render and source remains `./assets/audio/mochiriiiiii.mp3`. |
| Spotify | Pass | Search for `Night` returned cards; visible embeds kept meaningful titles and lazy loading. |
| Member signed-out pages | Pass | Auth, Account, Gallery Submit, and Leader Dashboard render signed-out/gated states safely. |
| Supabase signed-out shell | Pass | `window.MochiriiSupabase` is present on member pages and does not break signed-out browsing. |

## 5. Cross-Page Regression Result

No cross-page regression was found.

Fixes made:

- None.

Files intentionally unchanged:

- `index.html`
- `join.html`
- `styles.css`
- `site.js`
- `home.js`
- `join.js`
- `gallery.js`
- `events.js`
- `recruitment.js`
- `spotify.js`
- `supabase.js`
- Supabase migrations and functions
- Data files
- Assets
- Workflows and validation scripts

## 6. Protected Content

Protected content was not changed:

- `data/home.json` `seal.verse`
- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`
- `data/twills.json` `profile.bio`

`git diff -- data/` is empty.

## 7. Supabase Safety

- No Supabase `db push` was run.
- No Edge Functions were deployed.
- No migrations were created.
- No Supabase configuration was changed.
- No production upload, profile update, moderation action, cleanup action, or Storage mutation was attempted.
- Signed-out browsing remains safe on Auth, Account, Gallery Submit, and Leader Dashboard.

## 8. Validation

| Command / check | Result |
| --- | --- |
| Browser page/viewport matrix | Passed: 68 checks. |
| Browser mobile shell smoke | Passed: 17 routes. |
| Home/Join/Gallery/Events/Recruitment/Spotify/member feature smoke | Passed. |
| `npm run check` | Passed with the known intentional MP3 size warning. |
| `git diff --check` | Passed. |
| `node scripts/check-json.mjs` | Passed. |
| `node scripts/check-js.mjs` | Passed. |
| `node scripts/check-refs.mjs` | Passed. |
| `node scripts/check-assets.mjs` | Passed with the known intentional MP3 size warning. |
| `npm run check:production` | Passed. |
| `npm run smoke:gallery` | Passed. |
| `git diff -- data/` | Empty. |

## 9. Limitations

No approved production member or moderator credentials were available in this G15 pass. As in G09, live signed-in role verification, profile update, real member upload, moderation approval/rejection, and cleanup mutation were not attempted.

Those remain credential-gated production operations and should only happen in a separately approved test-account workflow with explicit mutation and cleanup boundaries.

## 10. Recommendation

After G15 merges and the roadmap marks all G01-G15 items complete, the next safe release hygiene step is to create a stable tag, recommended name:

```text
v2.6.0-member-gallery-goal-baseline
```

