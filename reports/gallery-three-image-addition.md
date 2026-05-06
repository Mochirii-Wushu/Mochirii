# Gallery Three Image Addition

## 1. Source Images

Raw source files are outside the repository and are not staged or committed.

| Source filename | Dimensions | File type | File size | SHA-256 | Visual subject summary |
| --- | ---: | --- | ---: | --- | --- |
| `Anarchy 3.jpg` | 3840x1748 | JPEG | 519846 bytes | `49a25031af92dfaf73a4a4ead821178d72e76e8fd22858273921cbdb56d7ac90` | Figure in a low reaching pose beneath pink-blossomed trees with falling petals. |
| `Anarchy 2.png` | 1423x799 | PNG | 1801643 bytes | `f93a17c7d290987d15cd9bdf240d2763e763c42d841a694ffa4a0e434632ec78` | Night courtyard and bridge complex with lanterns, water, and purple trees. |
| `Anarchy 1.png` | 1440x804 | PNG | 1312405 bytes | `59e0f0592c71f866c798a5381c28d9d6cac72dbfedd8e357bd08c1dc88dd82ea` | Solo figure standing on a wooden balcony before a bright orange sunset. |

## 2. Existing Gallery Conventions

- Current item count before this addition: 70.
- Highest current shot number before this addition: `shot-70`.
- Naming pattern: `shot-##.webp`, two-digit sequence.
- Full image path convention: `./assets/img/gallery/shot-##.webp`.
- Thumbnail path convention: `./assets/img/gallery/thumbs/shot-##.webp`.
- Image format: optimized WebP for both full-size images and thumbnails.
- Full-size convention: max 1920px wide where the source is larger; do not upscale smaller sources.
- Thumbnail convention: 900px wide where the source is larger; do not upscale smaller sources.
- Current category slugs: `portraits`, `gatherings`, `action`, `scenery`, `companions`.
- Current tag vocabulary style: lowercase, short, useful subject tags; kebab-case if a tag has multiple words.
- Caption style: concise, image-specific, concrete visible content with light atmosphere only where natural.
- Alt text style: direct visible-subject descriptions distinct from captions where practical.

## 3. Gallery Data Additions

Duplicate review method:

- Exact duplicate check used SHA-256 for incoming versus incoming, existing full Gallery images, and existing thumbnails.
- Near-duplicate check used Pillow-generated 256-bit dHash and aHash distances against existing full images and thumbnails.
- Visual review used the attached images and the closest perceptual-match captions from existing Gallery data.

| Source | Dimensions | Duplicate status | Existing match if any | Accepted? | Proposed file | Category | Tags | Caption | Alt text | Notes |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Anarchy 3.jpg` | 3840x1748 | Distinct; no exact or near duplicate found. | None. Closest perceptual candidates were distant content-neighbors, not same-scene matches. | Yes | `shot-71.webp` | `action` | `action`, `petals`, `blossoms` | Petals scatter over a low sweeping reach. | Figure reaching from a low pose beneath pink-blossomed trees. | Accepted as a new blossom action scene. |
| `Anarchy 2.png` | 1423x799 | Distinct; no exact or near duplicate found. | None. Closest perceptual candidates were distant content-neighbors, not same-scene matches. | Yes | `shot-72.webp` | `scenery` | `scenery`, `lanterns`, `night`, `courtyard` | Lantern bridges thread through a night courtyard. | Night view of a courtyard complex with bridges, lanterns, and purple trees. | Accepted as a new night courtyard scenery image. |
| `Anarchy 1.png` | 1440x804 | Distinct; no exact or near duplicate found. | None. Closest perceptual candidates were distant content-neighbors, not same-scene matches. | Yes | `shot-73.webp` | `portraits` | `portrait`, `solo`, `sunset`, `balcony` | A balcony portrait stands before the low sun. | Solo figure standing on a wooden balcony with a bright sunset over distant hills. | Accepted as a new sunset balcony portrait. |

| New item | Category | Tags | Caption | Alt text | Confidence |
| --- | --- | --- | --- | --- | --- |
| `shot-71` | `action` | `action`, `petals`, `blossoms` | Petals scatter over a low sweeping reach. | Figure reaching from a low pose beneath pink-blossomed trees. | medium |
| `shot-72` | `scenery` | `scenery`, `lanterns`, `night`, `courtyard` | Lantern bridges thread through a night courtyard. | Night view of a courtyard complex with bridges, lanterns, and purple trees. | medium |
| `shot-73` | `portraits` | `portrait`, `solo`, `sunset`, `balcony` | A balcony portrait stands before the low sun. | Solo figure standing on a wooden balcony with a bright sunset over distant hills. | medium |

## 4. Generated Image Verification

| New item | Full image | Full dimensions | Full size | Thumbnail | Thumbnail dimensions | Thumbnail size | Valid? |
| --- | --- | ---: | ---: | --- | ---: | ---: | --- |
| `shot-71` | `assets/img/gallery/shot-71.webp` | 1920x874 | 272508 bytes | `assets/img/gallery/thumbs/shot-71.webp` | 900x410 | 67000 bytes | yes |
| `shot-72` | `assets/img/gallery/shot-72.webp` | 1423x799 | 77662 bytes | `assets/img/gallery/thumbs/shot-72.webp` | 900x505 | 22144 bytes | yes |
| `shot-73` | `assets/img/gallery/shot-73.webp` | 1440x804 | 64150 bytes | `assets/img/gallery/thumbs/shot-73.webp` | 900x503 | 20230 bytes | yes |

Path checks:

- Full image paths do not include `/thumbs/`.
- Thumbnail paths include `/thumbs/`.
- Every thumbnail is smaller than its matching full image.
- Generated files opened successfully with ImageMagick.

## 5. Count Summary

- Previous total count: 70.
- Accepted images: 3.
- Skipped exact duplicates: 0.
- Skipped near duplicates: 0.
- New total count: 73.

| Category | Count after update |
| --- | ---: |
| `portraits` | 23 |
| `gatherings` | 22 |
| `action` | 7 |
| `scenery` | 6 |
| `companions` | 15 |

## 6. Protected Content

- `data/home.json` `seal.verse`: unchanged.
- `data/recruitment.json` `content.paragraphs`: unchanged.
- `data/recruitment.json` `content.conclusion`: unchanged.
- `data/twills.json` `profile.bio`: unchanged.

## 7. Validation

| Command / check | Result | Notes |
| --- | --- | --- |
| `npm run check` | Pass with known warning | Known intentional `assets/audio/mochiriiiiii.mp3` large-asset warning only. |
| `git diff --check` | Pass | No whitespace errors. |
| `node scripts/check-json.mjs` | Pass | `JSON OK (16 files).` |
| `node scripts/check-js.mjs` | Pass | `JavaScript syntax OK (23 files).` |
| `node scripts/check-refs.mjs` | Pass | `Local references OK (429 refs checked).` |
| `node scripts/check-assets.mjs` | Pass with known warning | Known intentional `assets/audio/mochiriiiiii.mp3` large-asset warning only. |
| `npm run check:production` | Pass | `Production smoke check OK.` |
| `npm run smoke:gallery` | Pass | Local server running on port 8765; `Gallery lightbox smoke OK.` |
| Local Gallery browser smoke | Pass | 73 total items; category counts matched data; new thumbnails rendered; new lightboxes opened full images, not `/thumbs/`; captions rendered; Copy link, URL state, and Back/Forward worked. |
| Regression smoke | Pass | `/`, `/join.html`, `/events.html`, `/recruitment.html`, and `/twills.html` loaded with no horizontal overflow at 360px, 390px, 768px, or 1440px. |
