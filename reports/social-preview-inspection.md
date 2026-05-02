# Social Preview Inspection - Mōchirīī Guild Website

## 1. Summary

Social metadata was inspected for the primary public sharing pages on the live site and compared with the current local source. The production HTML matches the local source for the checked metadata fields, and all Open Graph/Twitter image references resolve successfully.

External Discord, X/Twitter, and similar card renderers were not directly tested from this environment because they require app-side preview behavior and cache state. Use the manual checklist below before a public recruitment push.

No source metadata fixes were needed in this pass.

## 2. Metadata Table

| Page | Title | Description | Canonical | OG title | OG image | Twitter card | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home | Mōchirīī • Where Winds Meet Guild | Join Mōchirīī, a warm Where Winds Meet guild for relaxed events, helpful progression, and wuxia community life. | `https://mochirii.com/` | Mōchirīī • Where Winds Meet Guild | `https://mochirii.com/assets/img/hero/hero.webp` | `summary_large_image` | Pass |
| Recruitment | Mōchirīī Recruitment • Where Winds Meet Guild | Who fits Mōchirīī, how to join through Discord, and what to expect from this cozy Where Winds Meet guild. | `https://mochirii.com/recruitment.html` | Mōchirīī Recruitment • Where Winds Meet Guild | `https://mochirii.com/assets/img/recruitment/hero.webp` | `summary_large_image` | Pass |
| Join | Join Mōchirīī • Where Winds Meet Guild | How to join Mōchirīī in Where Winds Meet, with clear steps, expectations, Discord guidance, and newcomer-friendly events. | `https://mochirii.com/join.html` | Join Mōchirīī • Where Winds Meet Guild | `https://mochirii.com/assets/img/join/hero.webp` | `summary_large_image` | Pass |
| Gallery | Mōchirīī Gallery • Where Winds Meet Guild | Screenshots and shared moments from the Mōchirīī guild community in Where Winds Meet. | `https://mochirii.com/gallery.html` | Mōchirīī Gallery • Where Winds Meet Guild | `https://mochirii.com/assets/img/gallery/hero.webp` | `summary_large_image` | Pass |
| Events | Mōchirīī Events • Where Winds Meet Guild | Guild events, recurring activities, RSVP notes, and coordination windows for Mōchirīī members in Where Winds Meet. | `https://mochirii.com/events.html` | Mōchirīī Events • Where Winds Meet Guild | `https://mochirii.com/assets/img/events/hero.webp` | `summary_large_image` | Pass |

## 3. Image Resolution Checks

| Image URL | Status | Content type | Dimensions | Size | Notes |
| --- | --- | --- | --- | --- | --- |
| `https://mochirii.com/assets/img/hero/hero.webp` | 200 | `image/webp` | 1536x1024 | 190,830 bytes | Suitable for large social cards |
| `https://mochirii.com/assets/img/recruitment/hero.webp` | 200 | `image/webp` | 1536x1024 | 169,158 bytes | Suitable for large social cards |
| `https://mochirii.com/assets/img/join/hero.webp` | 200 | `image/webp` | 1536x1024 | 177,010 bytes | Suitable for large social cards |
| `https://mochirii.com/assets/img/gallery/hero.webp` | 200 | `image/webp` | 1536x1024 | 205,256 bytes | Suitable for large social cards |
| `https://mochirii.com/assets/img/events/hero.webp` | 200 | `image/webp` | 1536x1024 | 266,686 bytes | Suitable for large social cards |

## 4. Manual Discord/Twitter-Like Preview Checklist

1. Paste `https://mochirii.com/` into Discord and confirm the title, description, image, and domain.
2. Paste `https://mochirii.com/recruitment.html` into Discord and confirm the recruitment-specific copy appears.
3. Paste `https://mochirii.com/join.html` into Discord and confirm the join-specific copy appears.
4. Paste `https://mochirii.com/gallery.html` into Discord and confirm the gallery image appears.
5. Paste `https://mochirii.com/events.html` into Discord and confirm the events-specific copy appears.
6. Repeat in any X/Twitter-like preview/debug tool available to the guild.
7. If a platform shows stale metadata, use that platform's cache refresh or card validator before changing source files.

## 5. Issues / Fixes

| Priority | Issue | Evidence | Fix |
| --- | --- | --- | --- |
| P3 | External app preview cache state is unverified. | Source metadata and image URLs are healthy, but Discord/X-style renderers were not accessible from this environment. | Manual preview testing recommended before a public recruitment campaign. |

## 6. Recommendation

Social preview metadata appears ready for public sharing from a source and production-delivery perspective. The only remaining check is app-side preview confirmation in Discord and any other sharing platforms the guild uses.
