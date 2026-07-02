# Mōchirīī — Guild Website  
*Where Winds Meet*

Official website for **Mōchirīī**, a community-focused guild for *Where Winds Meet*.  
This site serves as the public hub for guild information, events, culture, and shared media.

The project stays **static, fast, readable, and data-driven**, with a clear separation between structure, content, and behavior.

---

## Deployment Status

- `https://mochirii.com` is the current production domain and is served by the Vercel-hosted Next.js app in `apps/web`.
- `https://www.mochirii.com` redirects to `https://mochirii.com`.
- `https://mochirii.vercel.app` remains a Vercel fallback/debug URL for the same app.
- The root static GitHub Pages files and tracked `CNAME` remain rollback/reference material, not the current production surface.
- GitHub Pages is a legacy rollback/reference surface only; as of 2026-07-02 its deploy job can time out while Vercel production remains healthy, so do not treat Pages as the live host without a separate approved retirement or rollback task.
- See [`docs/deployment.md`](docs/deployment.md) for the authoritative deployment, Vercel dashboard, rollback, and public asset/data sync rules.

---

## Goals

- Provide a calm, welcoming entry point for new members
- Keep expectations, culture, and coordination transparent
- Allow non-technical contributors to update content safely via JSON
- Avoid unnecessary frameworks, build steps, or process complexity
- Keep the current Vercel/Next production app and root static rollback surface easy to validate

---

## Mochi Social Closed Playtest

Mochi Social is a closed Mochirii playtest for approved guild members. Members enter one shared 3D guild room, create a curated character, meet Lirabao, and care for the guild pet together.

The live page stays behind the tester password wall. The password opens the page, and Mochirii member sign-in is required for saved play. All playtest progress has no real value.

Player-facing playtest wording lives in [`docs/mochi-social-playtest-guide.md`](docs/mochi-social-playtest-guide.md).

---

## Mochirii Social Staging

`social.mochirii.com` is the approved staging target for the guild social platform. It is hosted outside Vercel because the social runtime needs a persistent PHP/Laravel app, database, Redis, queue worker, scheduler, media storage, backups, and monitoring.

The website repo owns only the member doorway, Supabase OAuth consent flow, `social_accounts` schema, and no-secret documentation. The staged social runtime remains admin-first, closed-registration, SSO-only, and federation-disabled until the separate first-login and moderation gates pass. Runtime source changes must move into a Mochirii-owned private fork or ops repo before further host edits.

See [`docs/pixelfed-guild-social-adr.md`](docs/pixelfed-guild-social-adr.md), [`docs/pixelfed-oidc-spike.md`](docs/pixelfed-oidc-spike.md), [`docs/pixelfed-first-login-testing.md`](docs/pixelfed-first-login-testing.md), and [`docs/pixelfed-staging-ops.md`](docs/pixelfed-staging-ops.md).

---

## Tech Stack

- **HTML5** — semantic, accessible markup
- **CSS** — handcrafted styles in `styles.css`
- **Vanilla JavaScript** — page-scoped renderers only
- **JSON** — all page content and copy
- **Next.js / React** — production app under `apps/web`
- **Vercel** — production hosting for `mochirii.com`
- **GitHub Pages** — retained rollback/reference surface
- **Supabase** — auth, membership, OAuth consent, database, storage, and Edge Functions
- **DigitalOcean Droplet / Spaces** — staging social runtime and planned object media boundary

The root static site stays dependency-light. The production app builds from `apps/web`.

---

## Architecture Overview

The site follows a strict separation of concerns:

### 1. Markup (HTML)
Each page’s `.html` file contains:
- Structural layout only
- Placeholder elements with stable IDs
- No business logic
- No styling rules
- No page-specific JavaScript behavior

Example:

index.html
join.html
events.html


---

### 2. Behavior (JavaScript)
Each page has a matching JS file that:
- Fetches its corresponding JSON file
- Injects content into predefined placeholders
- Handles page-local interactions only

JavaScript files never:
- Define layout
- Control global navigation or footer
- Contain hardcoded copy

Example:

home.js
join.js


Global behavior (header/footer mounting, shared interactions) lives in:

site.js


---

### 3. Content (JSON)
All text, images, metadata, and lists live in JSON files.

This allows:
- Easy updates without touching HTML
- Consistent spacing and rhythm
- Safer editing by non-developers

Example:

data/home.json
data/join.json
data/gallery.json


---

## Directory Structure


/
├─ index.html
├─ join.html
├─ events.html
├─ styles.css
├─ site.js
├─ home.js
├─ join.js
│
├─ data/
│ ├─ home.json
│ ├─ join.json
│ ├─ gallery.json
│
├─ assets/
│ ├─ img/
│ │ ├─ hero/
│ │ ├─ join/
│ │ ├─ gallery/
│ │ ├─ tiles/
│ │ ├─ brand/
│
└─ README.md


---

## Page Breakdown

### Home (`index.html`)
- Guild introduction
- Hero section with badges
- Featured bulletin + recent bulletins
- Four Doors navigation
- Member spotlight
- Screenshot gallery with modal viewer
- Guild seal (fully data-driven)

Data source:

data/home.json


---

### Join (`join.html`)
- Joining steps
- Expectations & culture
- Quick start links
- Notes & clarifications

Spacing and rhythm are controlled purely by CSS stack rules, not JS.

Data source:

data/join.json


---

### Gallery / Album
- Structured albums
- Captioned images
- Taggable items
- Designed for future filtering or expansion

Data source:

data/gallery.json


---

## Styling Philosophy

- Global rhythm via reusable stack classes
- Page-specific adjustments gated by `body[data-page="…"]`
- No inline layout hacks
- No JS-controlled spacing
- Predictable vertical flow

All styling lives in:

styles.css


---

## Accessibility

- Semantic HTML landmarks
- ARIA labels where appropriate
- Keyboard-navigable modals
- Meaningful alt text for all images
- No essential content hidden behind JS

---

## Content Editing Guidelines

When updating content:

- Edit **JSON only**
- Do not add inline HTML inside JSON
- Preserve array structures (`intro`, `cards`, `items`)
- Images should be `.webp` where possible
- Dates should be ISO-compatible when used programmatically

If content fails to load, pages degrade gracefully.

For detailed content, date, asset, gallery, link, tone, and PR validation conventions, see [`docs/content-guide.md`](docs/content-guide.md).

For Home data, shared header/footer/nav behavior, script order, protected seal poem, and shell smoke-test conventions, see [`docs/home-shell-guide.md`](docs/home-shell-guide.md).

For Join onboarding, checklist, link, tone, accessibility, and smoke-test conventions, see [`docs/join-guide.md`](docs/join-guide.md).

For Events data, date, filter, accessibility, and smoke-test conventions, see [`docs/events-guide.md`](docs/events-guide.md).

For Ranks data, hierarchy, image, tone, accessibility, and smoke-test conventions, see [`docs/ranks-guide.md`](docs/ranks-guide.md).

For Leaders roster, profile-link, image, tone, accessibility, and smoke-test conventions, see [`docs/leaders-guide.md`](docs/leaders-guide.md).

For Twills/Profile protected body text, contact detail, image, tone, accessibility, and smoke-test conventions, see [`docs/twills-guide.md`](docs/twills-guide.md).

For Recruitment protected body/conclusion, audio, tone, accessibility, and smoke-test conventions, see [`docs/recruitment-guide.md`](docs/recruitment-guide.md).

For Announcements, Raffles, Spotify, and Spotlight data, embed, link, tone, accessibility, and smoke-test conventions, see [`docs/side-pages-guide.md`](docs/side-pages-guide.md).

For Gallery image, category, tag, caption, URL state, cache-query, and smoke-test conventions, see [`docs/gallery-guide.md`](docs/gallery-guide.md).

For the Mochi Social closed playtest, shared room, Lirabao care, tester access, and no-real-value boundaries, see [`docs/mochi-social-playtest-guide.md`](docs/mochi-social-playtest-guide.md).

For future scoped branches and deferred ideas, see [`docs/roadmap.md`](docs/roadmap.md).

---

## Development Notes

- Root static files can still be opened directly in a browser or via static server for rollback/reference checks.
- Production changes are validated through the Next app in `apps/web` and Vercel.
- Use `git pull --rebase` (recommended) to keep history clean
- Vercel deploys the production app from `main` with Root Directory `apps/web`.
- GitHub Pages/root static files remain available as rollback/reference material until a later stabilization task retires them.
- Keep root `assets/` and `data/` as the editable content source for now; use `npm run sync:next-public` to mirror them into `apps/web/public/`.
- Optional Lighthouse audits can be run manually from GitHub Actions using **Manual Lighthouse audit**; they are not required PR gates.

---

## License & Use

This site is purpose-built for the Mōchirīī guild.

Content, branding, and structure are not intended for redistribution without permission.

This repository is public but not open source. See [`COPYRIGHT.md`](COPYRIGHT.md) and [`NOTICE.md`](NOTICE.md).

---

## Maintainers

- Guild leadership
- Design & architecture maintained in-house

For structural changes, follow existing patterns.  
Consistency matters more than novelty.

---
