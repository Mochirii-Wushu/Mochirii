# Twills Mobile Accessibility Review

Branch: `qa/twills-mobile-accessibility-review`
Scope: focused Twills/Profile mobile, keyboard, semantic, rendering, and signed-out shell QA.
Result: report-only; no Twills HTML, JS, CSS, data, assets, workflows, validation scripts, or Supabase behavior changes were needed.

## Files Reviewed

- `twills.html`
- `twills.js`
- `styles.css`
- `data/twills.json`
- `docs/twills-guide.md`
- `reports/twills-implementation-inventory.md`
- `AGENTS.md`

## Audit Findings

| Area | Finding | Severity | Evidence | Fix needed? | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile layout | Hero/profile content remained readable with no horizontal overflow at `360px`, `390px`, `768px`, and `1440px`. | Pass | Browser smoke reported `scrollWidth === clientWidth` at all checked Twills widths. | No | Shared `.grid-12` columns collapse below `980px`; no page-scoped layout defect found. |
| Mobile layout | `profile.bio` rendered as three readable paragraphs and matched `data/twills.json` `profile.bio`. | Pass | Browser smoke compared rendered `#twillsBio p` text against the JSON array and returned an exact match. | No | Protected body text remained unchanged. |
| Mobile layout | Badges wrapped safely on narrow screens. | Pass | At `360px`, all four badge spans stayed within the viewport; the email badge occupied a single centered row and Discord/UID shared the next row. | No | The current badge row is text-only and has no tap targets. |
| Mobile layout | Hero and avatar images rendered without overflow. | Pass | Hero image loaded at all checked widths. Avatar is lazy-loaded and loaded successfully after scrolling into view at `390px`. | No | Avatar alt text remained `Twills profile picture`; hero alt text remained `Twills profile banner artwork`. |
| Mobile layout | Section/card spacing remained stable. | Pass | Portrait and Bio sections used the documented `aside` plus content section structure; mobile grid collapsed to one column. | No | No CSS changes were needed. |
| Keyboard behavior | Tab order used the shared shell order without traps. | Pass | Tab trace reached skip link, brand, Join CTA, mobile menu button on mobile, then footer links; desktop trace reached dropdown triggers and shared links. | No | Twills content has no page-local interactive controls. |
| Keyboard behavior | Focus visibility is handled by existing global and shared nav focus styles. | Pass | Shared `:focus-visible` and nav/footer focus selectors apply to the focusable elements present on Twills. | No | No page-scoped Twills focus rule was needed because there are no page-local controls. |
| Screen reader / semantics | Heading order is sensible. | Pass | Rendered heading sequence is one `h1` (`Twills`) followed by `h2` headings (`Portrait`, `Bio`). | No | Matches `docs/twills-guide.md` and the implementation inventory. |
| Screen reader / semantics | Profile structure is simple and not noisy. | Pass | Portrait content is in an `aside`; bio text renders as real paragraphs; `#twillsError` is a polite status region only when needed. | No | Badges are grouped by `aria-label="Profile badges"`. |
| Screen reader / semantics | Image alt text is present where relevant. | Pass | Hero and avatar images have non-empty alt text and loaded successfully. | No | No data-driven alt fields exist in the current schema. |
| Link behavior | No page-local content links are present. | Pass | Browser smoke found no anchors inside the Twills hero/main content area. | No | Contact details are plain badge text, so external-link safe conventions are not triggered here. |
| Link behavior | Shared internal links resolved in browser smoke. | Pass | Header/footer loaded and regression pages returned `200` locally. | No | No Twills profile links were changed. |
| Content readability | `profile.bio` remained readable and unchanged. | Pass | Rendered bio exactly matched the protected JSON field. | No | No Twills copy or data changed. |
| Content readability | The protected body text does not visibly use the exact game name. | Pass | `#twillsBio` text did not contain `Where Winds Meet`. | No | Metadata and shared header/footer usage are outside the protected body-copy check. |
| Renderer/data safety | Hero, profile, badges, and bio rendered correctly. | Pass | `twills.js` loaded `data/twills.json`; `h1`, badge spans, image paths, and bio paragraphs appeared as expected. | No | Badge cap behavior remains unchanged and was not modified. |
| Renderer/data safety | Unsupported fields did not appear or break rendering. | Pass | Browser smoke found no visible `undefined` or `[object Object]`; no unsupported data fields are present in `data/twills.json`. | No | No data schema changes were made. |
| Renderer/data safety | Shared helper and shell dependencies remained intact. | Pass | `utils.js` provided `MochiriiUtils.fetchJson`; shared header/footer mounted; mobile menu opened and closed with Escape. | No | `site.js` behavior was unchanged. |
| Renderer/data safety | Supabase shell did not cause signed-out Twills runtime errors. | Pass | `window.MochiriiSupabase` was present, no console or page errors occurred, and public pages rendered signed out. | No | No Supabase behavior changed. |

## Browser Smoke Evidence

Twills viewport checks:

- `360px`: page loaded with status `200`, no console/page errors, no horizontal overflow, protected bio matched JSON.
- `390px`: page loaded with status `200`, no console/page errors, no horizontal overflow, protected bio matched JSON.
- `768px`: page loaded with status `200`, no console/page errors, no horizontal overflow, protected bio matched JSON.
- `1440px`: page loaded with status `200`, no console/page errors, no horizontal overflow, protected bio matched JSON.

Shared-shell regression checks:

- `/`
- `/join.html`
- `/events.html`
- `/gallery.html`
- `/codex.html`
- `/ranks.html`
- `/leaders.html`
- `/recruitment.html`

All regression pages returned `200`, loaded header/footer, had no console-breaking errors, and had no horizontal overflow at `390px`.

## Protected Content

Protected content was not edited:

- `data/twills.json` `profile.bio`
- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`
- `data/home.json` `seal.verse`

## Conclusion

No confirmed Twills mobile/accessibility issue was found. This branch should remain report-only unless later human review identifies a specific defect with evidence.
