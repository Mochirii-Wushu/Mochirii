# Page Tone Audit — Mōchirīī Website

## Tone Rubric

Mōchirīī copy should feel warm, clear, lightly rhythmic, and community-centered. The voice may carry small rhymes, internal echoes, and gentle repetition when they feel natural. Cupcake warmth should appear as a thread, not a decoration in every sentence. Functional labels must stay plain. The copy should avoid generic AI-like phrasing, corporate abstractions, and polished template language.

## Protected Content

The long-form recruitment body in `data/recruitment.json` `content.paragraphs` and `content.conclusion` is protected.

The guild seal poem in `data/home.json` `seal.verse` is protected.

Both must remain unchanged.

## Protected Content Inventory

- Recruitment body: `data/recruitment.json`, `content.paragraphs` lines 33-39 and `content.conclusion` line 42.
- Guild seal poem: `data/home.json`, `seal.verse` lines 27-30.

## Copy Standards

Use:
- concrete nouns
- clear verbs
- guild-specific imagery
- warm but plain phrasing
- light rhythm
- occasional natural rhyme
- subtle Cupcake references

Avoid:
- direct reference-poem phrases
- forced rhyme
- heavy slang
- childish overuse of Cupcake
- unclear button labels
- corporate recruitment language
- generic AI vocabulary
- repetitive sentence structures

## Page Matrix

| Page | Source files | User-facing copy areas | Current tone | Needs edit? | Cupcake usage | Rhyme/rhythm opportunity | AI-like phrasing found | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | `index.html`, `data/home.json`, `home.js` | Metadata, hero, badges, bulletin intros, door tiles, spotlight, gallery teaser, seal | Warm and guild-like after prior tone pass | Light edit | None on page copy; acceptable, because Home already carries warmth through hall language | Hero and tile copy can gain a softer beat without changing CTAs | Minor generic badge/copy texture: "Community Focused", "helpful progression" | Do not alter `seal.verse`. |
| Join | `join.html`, `data/join.json`, `join.js` | Metadata, hero, joining path, quick start, checklist, culture, notes | Clear, welcoming, and already Cupcake-aware | Light edit | Present in checklist and break note; not excessive | Steps can sound more human and less procedural | Some onboarding copy reads system-like: "proper role is assigned", "clear expectations" | Preserve Join checklist behavior and clear labels. |
| Events | `events.html`, `data/events.json`, `events.js` | Metadata, hero, featured event, filters, empty states, recurring, participation | Functional and warm enough | Light edit | None needed | Empty states and recurring copy can carry more gentle cadence | "clear goals", "coordination windows" read slightly generic in metadata | Preserve UTC-safe filtering and labels. |
| Gallery | `gallery.html`, `data/gallery.json`, `gallery.js` | Metadata, hero, intro, captions, alt text, lightbox captions | Clear but stiff; many captions sound catalog-like | Strong edit | One subtle gallery-level note is enough | Captions can use short concrete phrases with natural rhythm | "observed", "interval", repeated "during" and "after" patterns | Preserve `thumb` and `full` paths exactly. |
| Ranks | `ranks.html`, `data/ranks.json`, `ranks.js` | Metadata, hero, progression, tier descriptions, rank bodies | Clear but formal in places | Light edit | Not needed | Leadership/member copy can gain plain warmth | "overall vision & direction", "contribution recognition" feel institutional | Keep rank names and hierarchy intact. |
| Leaders | `leaders.html`, `data/leaders.json`, `leaders.js` | Metadata, hero, panel, council, roster summaries, responsibilities | Useful but a little operational | Light edit | Not needed | Contact guidance can be steadier and warmer | "broader alignment", "operations consistent", "support roles" | Keep contact safety guidance clear. |
| Codex | `codex.html`, `data/codex.json`, `codex.js` | Metadata, hero, values intro, tenets, etiquette, rhythm, recognition | Strong, clear, community-centered | Light edit | Present in one rest line; acceptable | Tenets and notes can carry a little more cadence | "community standards" and "conduct expectations" are plain but not harmful | Keep rules readable; do not soften serious guidance too much. |
| Recruitment | `recruitment.html`, `data/recruitment.json`, `recruitment.js` | Metadata, hero, audio note, protected long-form body | Protected body is strong and must stay exact | Light edit outside body only | None needed | Meta and audio note can be warmer | "public guide" and "what conduct we expect" are slightly stiff | Edit only `meta`/`audio`; do not touch `content.paragraphs` or `content.conclusion`. |
| Announcements | `announcements.html`, `data/announcements.json`, `announcements.js` | Metadata, hero, notices, summaries, details | Clear and practical | Light edit | None needed | Notice summaries can gain more natural pulse | "community updates" is generic but acceptable in metadata | Keep schedule details precise. |
| Raffles | `raffles.html`, `data/raffles.json`, `raffles.js` | Metadata, hero, how-to, rules, monthly prize note | Clear, slightly dry | Light edit | No direct Cupcake needed; thank-you tone is enough | Raffle note can sound more like a guild thank-you | "eligibility details", "claim instructions" are formal but useful | Rules should stay plain. |
| Spotify | `spotify.html`, `data/spotify.json`, `spotify.js` | Metadata, hero, intro, search empty state, item descriptions | Quiet but still catalog-like | Strong edit | None needed | Listening copy can become softer without losing search clarity | "curated", "continuous", "broader exploration", "uninterrupted sessions" | Keep embed data untouched. |
| Spotlight | `spotlight.html`, `data/spotlight.json`, `spotlight.js` | Metadata, hero, appreciation body, highlights | Warm and close to target | Light edit | None needed | Appreciation can use a small natural echo | "Active Engagement", "Positive Influence" feel generic | Keep member name and appreciation intent. |
| Twills | `twills.html`, `data/twills.json`, `twills.js` | Metadata, profile badges, bio | Human and sincere | Light edit | None needed | Bio can be slightly less polished and more direct | "contact point" in metadata is generic but clear | Keep contact details unchanged. |
| Header | `header.html`, `site.js` | Brand, nav labels, CTA, mobile labels | Clear and accessible | No edit | None | No change; functional labels should stay plain | None | Preserve nav/routing. |
| Footer | `footer.html` | Brand description, CTA, footer nav | Warm, could use a touch more cadence | Light edit | Can carry one subtle Cupcake-thread line without overuse | Footer description can be smoother | "soft guild home" is fine, but sentence is long | Keep footer links and Discord CTA clear. |
| Metadata | Root HTML pages | Titles, descriptions, social cards | SEO-friendly, some phrases generic | Light edit | Avoid Cupcake in metadata unless natural | Make descriptions warmer while preserving game/guild keywords | Spotify uses "curated"; several pages use institutional labels | Keep titles stable and descriptions concise. |

## Planned Sweep

- Warm metadata where it reads generic, especially Gallery, Raffles, Spotify, Leaders, and Recruitment.
- Rewrite Gallery page intro and captions for more natural guild-memory texture while preserving all image paths.
- Smooth Join, Events, Ranks, Leaders, Codex, Announcements, Raffles, Spotlight, Spotify, Twills, and Footer copy where wording is stiff or overly neat.
- Keep Cupcake language sparse: the existing Join checklist remains the main explicit use, with at most one small shared-warmth reference elsewhere if it fits.
- Do not edit protected recruitment body or guild seal poem.

## Sweep Outcome

- Edited only copy, metadata, docs guidance, and this report.
- Preserved all routes, scripts, workflows, assets, gallery `thumb` paths, and gallery `full` paths.
- Kept Cupcake language sparse in public copy: the Join checklist remains the clear playful anchor, with no new dessert motif spread across the rules or navigation.
- Removed the most catalog-like gallery captions and the Spotify "curated" metadata phrasing.
- Protected recruitment body and guild seal poem stayed out of the edited diff.
