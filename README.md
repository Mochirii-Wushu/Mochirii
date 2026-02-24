# Mōchirīī — Guild Website  
*Where Winds Meet*

This repository contains the official website for **Mōchirīī**, a guild in *Where Winds Meet*.  
The site is designed to be visually rich, lightweight, and easy to maintain using static files only.

It is built for **GitHub Pages**, requires **no backend**, and uses a JSON-driven content system.

---

## Design Philosophy

- Image-first layout
- Minimal text
- No gradients or decorative borders
- Visual clarity over density
- Simple maintenance through structured data
- Static hosting friendly

The site is meant to feel calm, atmospheric, and alive without visual noise.

---

## Project Structure

```
/
├── index.html
├── home.js
├── data/
│   └── home.json
├── assets/
│   └── img/
│       ├── hero/
│       ├── bulletins/
│       ├── tiles/
│       ├── featured/
│       ├── gallery/
│       └── members/
└── README.md
```

---

## How the Site Works

### index.html
Defines:
- Layout
- Typography
- Section structure

Contains no dynamic content logic.

---

### home.js
Handles:
- Loading `home.json`
- Rendering all homepage sections
- Gallery modal behavior
- Scroll-based animation
- Graceful fallbacks

This file does not need regular editing.

---

### home.json (Primary Content File)

All editable content lives here.

Controls:
- Hero section
- Bulletin updates
- Navigation tiles
- Spotlight feature
- Gallery images
- Footer text

To update the site, edit this file only.

---

## Image Organization

All images live under:

```
/assets/img/
```

Recommended structure:

```
hero/         → main banner image
bulletins/    → events, raffles, updates
tiles/        → navigation tiles
featured/     → spotlight feature
gallery/      → visual gallery
members/      → portraits (optional)
```

### Image Guidelines
- Use `.webp` when possible
- Keep file size under 400 KB
- Prefer strong focal points
- Avoid text baked into images

---

## Editing Content

### Hero Section
Edit in:
```json
"hero": {
  "image": "...",
  "descriptor": "...",
  "badges": []
}
```

---

### Bulletins
Located in:
```json
"bulletins": []
```

Supports:
- events
- raffles
- announcements
- member updates

The item with `"pinned": true` becomes the featured bulletin.

---

### Navigation Tiles
Located in:
```json
"tiles": []
```

Each tile includes:
- title
- subtitle
- image
- link
- label

---

### Spotlight
Located in:
```json
"spotlight": {}
```

Used for:
- major announcements
- promotions
- seasonal highlights

Only one spotlight displays at a time.

---

### Gallery
Located in:
```json
"gallery": []
```

- Images only
- Click to enlarge
- No captions required

---

## Fonts & Styling

Fonts used:
- **Zhi Mang Xing** – display / calligraphic
- **Noto Serif SC** – body text

Styling principles:
- No gradients
- No borders
- Subtle motion only
- Image-driven color
- Consistent spacing

---

## Deployment (GitHub Pages)

1. Push repository to GitHub
2. Open **Settings → Pages**
3. Set source to:
   ```
   Branch: main
   Folder: /root
   ```
4. Save

Your site will be available at:
```
https://username.github.io/repository-name/
```

---

## Maintenance Notes

- Edit content in `home.json`
- Replace images as needed
- No build tools required
- No frameworks required
- Works entirely on GitHub Pages

---

## Future Expansion

The structure supports:
- Additional pages (Ranks, Leaders, Codex)
- Event expiration logic
- Seasonal themes
- Member features
- Multiple galleries

Without changing the core architecture.

---

## Final Notes

If it feels busy, remove something.  
If it needs explaining, simplify it.  
If it distracts from the visuals, it doesn’t belong.

This site is meant to feel composed, calm, and alive.
