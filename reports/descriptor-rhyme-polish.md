# Descriptor and Cadence Polish Audit

## Scope

This pass reviews visible copy for adjective-heavy wording, repeated descriptors, cadence issues, and xianxia vocabulary balance. It is content-only and does not change JavaScript, CSS, assets, workflows, routing, validation scripts, gallery behavior, Events filtering, Join checklist behavior, titles, SEO metadata, Open Graph metadata, Twitter metadata, or JSON-LD.

Protected content is out of scope:
- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`
- `data/home.json` `seal.verse`

The exact phrase `Where Winds Meet` may remain in header/footer, metadata, validation scripts, internal code, docs, reports, and package metadata. It remains avoided in regular visible body copy outside header/footer.

## Audit Matrix

| Page | Source files | Adjective density | Repeated descriptors | Rhyme/cadence opportunity | Xianxia vocabulary fit | Needs edit? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home | `data/home.json` | Medium-high in hero and footer-like teasers | cozy, friendly, relaxed, helpful, soft, little | Trim stacked descriptors; keep one light lantern echo | Good; hall/lantern fits | Yes | Hero can say the same thing with fewer modifiers. |
| Join | `data/join.json` | Medium-high in hero, badges, checklist intro, culture copy | quiet, active, relaxed, simple, small, gentle, clear | Shorten first-step and checklist cadence | Good; step/greeting/checklist lane is clear | Yes | Onboarding should feel lighter and plainer. |
| Events | `data/events.json` | Medium in intro and featured lead | simple, kind, calm, relaxed, harder | Use hour/gathering language without padding | Good; hour/run/trial fits | Yes | Keep filter behavior untouched; tighten body copy only. |
| Gallery | `data/gallery.json` | Medium across captions | quiet, little, soft, steady, long, calm | Let captions read like frames, not prose | Good; scene/road/frame lane fits | Yes | A few captions can be shorter without losing mood. |
| Ranks | `data/ranks.json` | Medium | consistent, helpful, respectful, patient, positive | Tighten rank duty language | Good; trust/service/station lane fits | Yes | Reduce abstract descriptors around progression. |
| Leaders | `data/leaders.json` | Medium | fair, calm, clear, reliable, active, welcoming | Shorten stewardship copy | Good; guide/support/calm lane fits | Yes | Contact clarity should stay direct. |
| Codex | `data/codex.json` | Medium | clear, kind, shared, gentle, patient | Keep rules plain; trim support copy | Good; rule/custom/conduct lane fits | Yes | Serious guidance stays clear, not cute. |
| Recruitment | `data/recruitment.json` | Low outside protected body | steady, softer, kind | Minor badge/audio trim only if outside protected body | Good; recruiting/invitation lane fits | Yes, outside body only | Protected body and conclusion remain unchanged. |
| Announcements | `data/announcements.json` | Low-medium | fresh, small, brief | Bulletin copy can stay practical | Good; notice/update lane fits | No | Copy is already concise and page-specific. |
| Raffles | `data/raffles.json` | Low-medium | small, lively, clear, smooth | Tighten thanks/claim note | Good; draw/ticket/prize lane fits | Yes | Small content polish also fixes an existing indentation oddity. |
| Spotify | `data/spotify.json` | High across item descriptions | quiet, soft, calm, slower, subdued, gentle, slow | Use song/room/rhythm language with fewer adjectives | Good; listening-room lane fits | Yes | This page repeats mood adjectives the most. |
| Spotlight | `data/spotlight.json` | Medium | patient, calm, kind, warm, small | Keep appreciation human; trim stacked warmth | Good; name/gesture/thanks lane fits | Yes | The page works; a few descriptors can be removed. |
| Twills | `data/twills.json` | Low-medium | quiet, seen, guided, open | Leave personal voice intact | Good; voice/contact lane fits | No | No concrete issue beyond normal warmth. |
| Header | `header.html` | Low | None | None | Navigation only | No | Header copy is navigation/brand only. |
| Footer | `footer.html` | High in description | quiet, cozy, friendly, soft, kind, little | Make closing warmer with fewer adjectives | Good; closing/link lane fits | Yes | Footer can be shorter while preserving game-name allowance. |

## Planned Polish

- Edit only pages marked `Yes`.
- Prefer nouns and verbs over descriptor stacks.
- Keep one cadence accent where it improves the line; no forced rhyme.
- Keep xianxia flavor present but sparse.
- Keep Cupcake usage sparse and existing.
- Preserve functional labels and serious rules.
- Leave protected recruitment body and guild seal poem unchanged.

## Sweep Outcome

- Trimmed stacked descriptors on Home, Join, Events, Gallery, Ranks, Leaders, Codex, Recruitment support copy, Raffles, Spotify, Spotlight, and Footer.
- Left Announcements, Twills, Header, metadata, scripts, styles, workflows, assets, routing, and behavior unchanged.
- Preserved xianxia guild-house vocabulary through hall, path, road, lantern, table, and guild-specific nouns without adding high-risk cultivation language.
- Kept Cupcake language sparse and unchanged in role where it already worked.
- Preserved `Where Winds Meet` in allowed header/footer and metadata contexts while keeping it out of regular visible body copy outside header/footer.
- Verified the protected recruitment body and guild seal poem stayed unchanged.
