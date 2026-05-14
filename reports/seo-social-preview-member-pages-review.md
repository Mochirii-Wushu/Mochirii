# SEO Social Preview Member Pages Review

Date: 2026-05-14
Branch: `qa/seo-social-preview-member-pages-review`
Goal: G12
Mode: Metadata/indexing review with narrow fix

## 1. Scope

This review checked metadata and indexing behavior for:

- `auth.html`
- `account.html`
- `gallery-submit.html`
- `leader-dashboard.html`

The review covered titles, descriptions, canonical URLs, Open Graph tags, Twitter tags, preview images, `robots.txt`, `sitemap.xml`, source metadata, and production metadata.

No page behavior JavaScript, CSS, data files, assets, workflows, Supabase files, or protected content were changed.

No Supabase database mutation was run. No Edge Functions were deployed.

## 2. Production State Before Fix

Production metadata was fetched from `https://mochirii.com`.

| Page | Production metadata | Production robots | Production sitemap |
| --- | --- | --- | --- |
| `auth.html` | Title, description, canonical, OG image, and Twitter image present. | None. | Listed. |
| `account.html` | Title, description, canonical, OG image, and Twitter image present. | None. | Listed. |
| `gallery-submit.html` | Title, description, canonical, OG image, and Twitter image present. | None. | Listed. |
| `leader-dashboard.html` | Title, description, canonical, OG image, and Twitter image present. | None. | Not listed. |

`robots.txt` allows crawling and points to the sitemap.

## 3. Indexing Decision

The member workflow pages are useful to people who follow site links, but they are not useful as public search-entry pages:

- Auth is a login surface.
- Account is signed-in account management.
- Gallery Submit is a signed-in upload gate.
- Leader Dashboard is moderator-only.

Decision:

- Keep the pages reachable from normal site links.
- Keep canonical, Open Graph, and Twitter preview metadata for clean sharing.
- Mark the four member workflow pages `noindex,follow`.
- Remove Auth, Account, and Gallery Submit from `sitemap.xml`.
- Keep `robots.txt` as `Allow: /` so crawlers can see the `noindex` directive.

## 4. Changes Made

Added this meta tag to each member workflow page:

```html
<meta name="robots" content="noindex,follow" />
```

Updated `sitemap.xml` to remove:

- `https://mochirii.com/auth.html`
- `https://mochirii.com/account.html`
- `https://mochirii.com/gallery-submit.html`

`leader-dashboard.html` was already absent from the sitemap.

## 5. Local Metadata After Fix

| Page | Robots | Canonical | Preview image |
| --- | --- | --- | --- |
| `auth.html` | `noindex,follow` | `https://mochirii.com/auth.html` | `https://mochirii.com/assets/img/join/hero.webp` |
| `account.html` | `noindex,follow` | `https://mochirii.com/account.html` | `https://mochirii.com/assets/img/leaders/panel.webp` |
| `gallery-submit.html` | `noindex,follow` | `https://mochirii.com/gallery-submit.html` | `https://mochirii.com/assets/img/gallery/hero.webp` |
| `leader-dashboard.html` | `noindex,follow` | `https://mochirii.com/leader-dashboard.html` | `https://mochirii.com/assets/img/gallery/hero.webp` |

Local `sitemap.xml` no longer lists any of the four member workflow pages.

## 6. Manual Preview Checklist

Manual social preview checks remain optional because they depend on third-party cache behavior:

- Discord link preview after production deploy
- Open Graph debugger cache refresh if needed
- Twitter/X card cache behavior if relevant

Expected preview behavior after deployment:

- shared direct links still have title, description, and image metadata
- search crawlers should not index the member workflow pages
- sitemap only advertises public-facing site pages

## 7. Findings

One indexing issue was found and fixed: gated member workflow pages were indexable, and Auth/Account/Gallery Submit were advertised in the sitemap.

No metadata image or canonical URL blocker was found.

## 8. Validation Summary

G12-specific checks completed:

- source metadata inspection
- production metadata inspection
- local after-fix metadata inspection
- sitemap membership check
- robots.txt review
- preview image path review

Final command validation is recorded in the roadmap and PR after this report is committed.

Final command validation:

| Command | Result |
| --- | --- |
| `npm run check` | Passed, with the known intentional MP3 size warning. |
| `git diff --check` | Passed. |
| `node scripts/check-json.mjs` | Passed. |
| `node scripts/check-js.mjs` | Passed. |
| `node scripts/check-refs.mjs` | Passed. |
| `node scripts/check-assets.mjs` | Passed, with the known intentional MP3 size warning. |
| `npm run check:production` | Passed. |
| `npm run smoke:gallery` | Passed. |
| `git diff -- data/ --stat` | Empty. |
| `git diff -- assets/ --stat` | Empty. |

## 9. Safety Confirmation

- No data files changed.
- Protected content was not changed.
- No page behavior JavaScript changed.
- No CSS changed.
- No assets changed.
- No secrets were committed.
- No `supabase db push` was run.
- No Edge Functions were deployed.

## 10. Next Recommended Item

G13 - `docs/supabase-cost-usage-runbook`
