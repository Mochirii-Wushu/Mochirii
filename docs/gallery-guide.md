# Gallery Maintenance Guide

## 1. Purpose

The Gallery is Mōchirīī's visual memory: screenshots of scenes, members, gatherings, action, scenery, and small guild moments worth keeping. It should feel image-led, concise, and easy to browse.

## 2. Data Source

- Gallery data lives in `data/gallery.json`.
- The current static Gallery source has 73 images in the `general` album.
- Approved member and Discord submissions are added at runtime through Supabase signed URLs and are not written into `data/gallery.json`.
- Do not change image paths unless assets are actually added, replaced, or removed in the same scoped task.
- Captions and alt text should match visible image content.
- Do not invent player identities, events, locations, or actions that are not visible or otherwise confirmed.

## 3. Image Paths

- Thumbnail paths must use `assets/img/gallery/thumbs/`.
- Full image paths must use the optimized full-size Gallery path, such as `assets/img/gallery/shot-01.webp`.
- The grid uses thumbnails for page speed.
- The lightbox opens full images.
- Never let the lightbox open `/thumbs/` images.

## 4. Categories

Current categories:

- `portraits`
- `gatherings`
- `action`
- `scenery`
- `companions`

Category rules:

- Categories power the visible Gallery filters.
- Every image needs a valid `category`.
- Category labels and counts are generated from `data/gallery.json`.
- Do not hardcode category totals in HTML or JavaScript.
- Keep category slugs lowercase and kebab-case if new categories are ever approved.

## 5. Tags

- Tags are currently non-rendered.
- Tags support future search or filtering work.
- Tags should be short, lowercase, and kebab-case.
- Use 1-4 useful tags per image.
- Avoid vague tags like `misc`, `nice`, `pretty`, `cool`, `memory`, or `moment`.
- Tags should support finding an image; they should not repeat the caption word for word.

## 6. Captions and Alt Text

- Captions should be concise and image-specific.
- Prefer concrete nouns and verbs.
- Use light xianxia flavor only when it fits the image.
- Avoid generic adjectives and filler phrases.
- Avoid "Where Winds Meet" in visible captions.
- Alt text should describe visible content for someone who cannot see the image.
- Keep captions and alt text distinct when possible: captions can carry mood; alt text should identify the visible subject.

## 7. URL State

Gallery category URLs use `?category=`.

Valid examples:

- `gallery.html?category=portraits`
- `gallery.html?category=gatherings`
- `gallery.html?category=action`
- `gallery.html?category=scenery`
- `gallery.html?category=companions`

Invalid categories fall back to All and clean the URL. Browser Back and Forward should preserve the selected filter, image count, and `aria-pressed` state.

## 8. Copy Link

- Copy link copies the current Gallery URL.
- Category URLs include the selected category.
- All uses the clean `gallery.html` URL where possible.
- Feedback uses a short `aria-live` status message.
- Keep the control plain: `Copy link`, `Link copied`, and `Copy failed`.

## 9. Counts

Counts appear in filter buttons and are generated from Gallery data.

Expected current static counts:

- All - 73
- Portraits - 23
- Gatherings - 22
- Action - 7
- Scenery - 6
- Companions - 15
- Member Submissions - runtime approved-feed count only

If image data changes, counts should change from data automatically. Do not patch the labels by hand.

## 10. Cache Query Convention

- `gallery.html` uses query strings for CSS/JS cache busting.
- Update the `styles.css` query in `gallery.html` when Gallery CSS changes.
- Update the `gallery.js` query in `gallery.html` when Gallery JS changes.
- If shared Gallery behavior depends on `site.js` or `utils.js`, update those Gallery page queries in the same scoped task.
- Do not add build tools, service workers, or runtime cache hacks for this convention.

## 11. Validation

Run:

```sh
npm run check
git diff --check
node scripts/check-json.mjs
node scripts/check-refs.mjs
node scripts/check-assets.mjs
npm run smoke:gallery
npm run check:production
```

`npm run smoke:gallery` expects a local static server on port `8765`.

## 12. Manual Smoke Checklist

- Open `/gallery.html`.
- Open `/gallery.html?category=portraits`.
- Open `/gallery.html?category=gatherings`.
- Open `/gallery.html?category=action`.
- Open `/gallery.html?category=scenery`.
- Open `/gallery.html?category=companions`.
- Open an invalid category URL and confirm it falls back to All.
- Check mobile widths at 360px, 390px, and 768px.
- Confirm All shows the current static Gallery image count before approved member submissions load.
- Confirm counts match current data.
- Confirm Copy link works.
- Confirm Browser Back and Forward update the selected filter.
- Confirm the lightbox opens full images, not `/thumbs/`.
- Confirm Escape closes the lightbox.
- Confirm no horizontal overflow.

## 13. Protected Content

Gallery work must not alter:

- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`
- `data/home.json` `seal.verse`
