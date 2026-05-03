# Mōchirīī — Guild Website  
*Where Winds Meet*

Official website for **Mōchirīī**, a community-focused guild for *Where Winds Meet*.  
This site serves as the public hub for guild information, events, culture, and shared media.

The project stays **static, fast, readable, and data-driven**, with a clear separation between structure, content, and behavior.

---

## Goals

- Provide a calm, welcoming entry point for new members
- Keep expectations, culture, and coordination transparent
- Allow non-technical contributors to update content safely via JSON
- Avoid unnecessary frameworks, build steps, or tooling complexity
- Remain deployable via GitHub Pages with zero backend dependencies

---

## Tech Stack

- **HTML5** — semantic, accessible markup
- **CSS** — handcrafted styles in `styles.css`
- **Vanilla JavaScript** — page-scoped renderers only
- **JSON** — all page content and copy
- **GitHub Pages** — static hosting

No frameworks. No bundlers. No transpilers.

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

For Codex data, conduct, tone, protected-content, accessibility, and smoke-test conventions, see [`docs/codex-guide.md`](docs/codex-guide.md).

For Events data, date, filter, accessibility, and smoke-test conventions, see [`docs/events-guide.md`](docs/events-guide.md).

For Gallery image, category, tag, caption, URL state, cache-query, and smoke-test conventions, see [`docs/gallery-guide.md`](docs/gallery-guide.md).

For future scoped branches and deferred ideas, see [`docs/roadmap.md`](docs/roadmap.md).

---

## Development Notes

- No build step required
- Open files directly in browser or via static server
- Use `git pull --rebase` (recommended) to keep history clean
- GitHub Pages deploys automatically from `main`
- Optional Lighthouse audits can be run manually from GitHub Actions using **Manual Lighthouse audit**; they are not required PR gates.

---

## License & Use

This site is purpose-built for the Mōchirīī guild.

Content, branding, and structure are not intended for redistribution without permission.

---

## Maintainers

- Guild leadership
- Design & architecture maintained in-house

For structural changes, follow existing patterns.  
Consistency matters more than novelty.

---
