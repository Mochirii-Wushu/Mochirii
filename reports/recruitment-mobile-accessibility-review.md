# Recruitment Mobile Accessibility Review

Branch: `qa/recruitment-mobile-accessibility-review`
Scope: focused Recruitment mobile, keyboard, semantic, audio/media, protected content, renderer, and signed-out shell QA.
Result: one small HTML accessibility fix for the native audio label/description relationship.

## Protected Field Snapshots

Protected fields were hashed before the audit and compared after the fix:

- `data/recruitment.json` `content.paragraphs`: `e8c613b4d920cb6d75cc702d07a7fd451f0d5b96335b7520bae620ea1d1da56b`
- `data/recruitment.json` `content.conclusion`: `b8443b4356931ee654f55409012679876760fc22f1ff8be226a1f157016e4591`
- `data/twills.json` `profile.bio`: `00cc0dfaac9a523848b45544ca9c706f8a264fc9a51cd3480049c3fdcaed7599`
- `data/home.json` `seal.verse`: `6f662fd00cfefd4727cd4d21431d11cc36f942360647d1c781affb83e2ee58e1`

## Files Reviewed

- `recruitment.html`
- `recruitment.js`
- `styles.css`
- `data/recruitment.json`
- `docs/recruitment-guide.md`
- `reports/recruitment-implementation-inventory.md`
- `AGENTS.md`

## Audit Findings

| Area | Finding | Severity | Evidence | Fix needed? | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile layout | Hero/meta content remained readable with no horizontal overflow at `360px`, `390px`, `768px`, and `1440px`. | Pass | Browser smoke reported `scrollWidth === clientWidth` at all checked widths. | No | Shared `.grid-12` columns collapse below `980px`. |
| Mobile layout | Audio block width stayed inside the viewport. | Pass | Native audio width was `288px` at `360px`, `318px` at `390px`, `688px` at `768px`, and `336px` at `1440px`; no overflow was detected. | No | The known audio file size warning is unrelated to layout. |
| Mobile layout | Protected body and conclusion remained readable. | Pass | Rendered body card widths were `328px`, `358px`, `736px`, and `792px` across the checked viewports. | No | No line-length or wrapping failure was found. |
| Keyboard behavior | Tab order reached shared shell links, the mobile menu, the native audio control, and footer links without trapping focus. | Pass | Browser tab trace included `audio#recruitmentAudio` and continued to footer links. | No | Native audio controls may create multiple internal tab stops in Chromium. |
| Keyboard behavior | Focus visibility remains handled by shared focus styles and native browser focus on the audio control. | Pass | Shared focus rules apply to shell links/buttons; the native audio control receives focus. | No | No custom keyboard handler is present or needed. |
| Screen reader / semantics | Heading order is sensible. | Pass | Rendered heading sequence is one `h1` followed by `h2` headings `A Note From Twills` and `Who We Are Looking For`. | No | Matches the guide and inventory. |
| Screen reader / semantics | The native audio control lacked a programmatic relationship to the visible title and description. | P2 | Audit showed `aria-labelledby` and `aria-describedby` were absent on `#recruitmentAudio`, while the control is keyboard-focusable. | Yes | Added `aria-labelledby="recruitmentAudioTitle"` and `aria-describedby="recruitmentAudioDesc"` in `recruitment.html`. |
| Screen reader / semantics | Paragraph grouping is stable and not noisy. | Pass | Seven body paragraphs rendered in `#recruitmentBody`; one conclusion paragraph rendered in `#recruitmentConclusion`. | No | Text is rendered with `textContent`. |
| Audio/media behavior | Audio element renders with native controls. | Pass | `#recruitmentAudio` retained `controls` and `preload="none"` at all checked widths. | No | The fix did not alter media behavior. |
| Audio/media behavior | Audio source resolves. | Pass | `HEAD /assets/audio/mochiriiiiii.mp3` returned `200` with `audio/mpeg`. | No | Source path was unchanged. |
| Audio/media behavior | Audio fallback text remains available in the static HTML. | Pass | `recruitment.html` contains native audio fallback text for unsupported browsers. | No | Browser DOM text is cleared when sources are rebuilt by `recruitment.js`, as documented. |
| Content readability | Protected body and conclusion remained unchanged. | Pass | Rendered text matched the JSON arrays; post-fix hashes matched pre-audit snapshots. | No | No Recruitment data changed. |
| Content readability | Protected body/conclusion do not visibly use the exact game name. | Pass | Rendered `content.paragraphs` and `content.conclusion` did not contain `Where Winds Meet`. | No | Metadata and shared shell text are outside the protected body-copy check. |
| Renderer/data safety | Hero, meta, badges, audio, protected body, and conclusion rendered correctly. | Pass | Browser smoke found one hero, four meta badges, one audio source, seven body paragraphs, and one conclusion paragraph. | No | No renderer code changed. |
| Renderer/data safety | Unsupported fields did not appear or break rendering. | Pass | Browser smoke found no visible `undefined` or `[object Object]`; no unsupported data fields are present in `data/recruitment.json`. | No | No data schema changes were made. |
| Renderer/data safety | Shared helper and shell dependencies remained intact. | Pass | `MochiriiUtils` loaded data; shared header/footer rendered; `window.MochiriiSupabase` was present without page errors. | No | No Supabase behavior changed. |

## Browser Smoke Evidence

Recruitment viewport checks:

- `360px`: page loaded with status `200`, no console/page errors, no horizontal overflow, protected body and conclusion matched JSON.
- `390px`: page loaded with status `200`, no console/page errors, no horizontal overflow, protected body and conclusion matched JSON.
- `768px`: page loaded with status `200`, no console/page errors, no horizontal overflow, protected body and conclusion matched JSON.
- `1440px`: page loaded with status `200`, no console/page errors, no horizontal overflow, protected body and conclusion matched JSON.

Shared-shell regression checks:

- `/`
- `/join.html`
- `/events.html`
- `/gallery.html`
- `/codex.html`
- `/ranks.html`
- `/leaders.html`
- `/twills.html`

All regression pages returned `200`, loaded header/footer, had no console-breaking errors, and had no horizontal overflow at `390px`.

## Changes Made

- Added `aria-labelledby="recruitmentAudioTitle"` and `aria-describedby="recruitmentAudioDesc"` to the native `#recruitmentAudio` element.

## Protected Content

Protected content was not edited:

- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`
- `data/twills.json` `profile.bio`
- `data/home.json` `seal.verse`

## Conclusion

Recruitment is stable after the small audio accessibility fix. The page retained its protected long-form content, media source, static-site renderer behavior, signed-out Supabase shell behavior, and mobile layout.
