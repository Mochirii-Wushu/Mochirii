# Visual Hierarchy And Text-Fit Audit

This runbook keeps Mochirii's wuxia/glass identity readable and durable across the live Next app and retained static rollback surface. Use it before approving broad visual polish, dense dashboard changes, card-heavy page edits, or any work that changes shared typography, spacing, panels, navigation, or responsive behavior.

Primary sources:

- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- WCAG Reflow understanding: https://www.w3.org/WAI/WCAG21/Understanding/reflow.html
- WCAG Resize Text understanding: https://www.w3.org/WAI/WCAG21/Understanding/resize-text
- WCAG Focus Visible understanding: https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
- WCAG Focus Not Obscured understanding: https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum
- Web Vitals: https://web.dev/articles/vitals
- Cumulative Layout Shift: https://web.dev/articles/cls

## Scope

Audit these route groups after shared visual changes:

- Public guild routes: `/`, `/join`, `/events`, `/gallery`, `/ranks`, `/leaders`, `/codex`, `/recruitment`, `/announcements`, `/raffles`, `/spotify`, `/spotlight`, `/twills`
- Member and moderator routes: `/auth`, `/account`, `/gallery-submit`, `/members`, `/members/[slug]`, `/leader-dashboard`
- Alpha doorway: `/games/mochi-social`
- Static rollback routes when matching root files change, such as `index.html`, `join.html`, `events.html`, and `gallery.html`

## Viewport Matrix

Check at least these widths:

- `360px`
- `390px`
- `768px`
- `1024px`
- `1440px`

At each width, confirm:

- no horizontal page overflow
- text does not overlap adjacent content
- buttons do not clip labels
- long words, URLs, handles, event titles, status text, and moderation labels wrap or resize cleanly
- focus indicators remain visible and are not hidden behind sticky headers, overlays, menus, or iframe shells
- cards and panels keep stable dimensions when labels, badges, counters, or loading text change

## Text Resize And Reflow

For pages touched by visual work, test browser zoom or text scaling up to `200%` where practical.

Acceptable behavior:

- content remains readable without two-dimensional scrolling except for components that genuinely require it
- controls remain reachable by keyboard
- form errors and status messages stay near their controls
- tables, queues, grids, and galleries have clear overflow treatment when dense content cannot reflow into one column

Reject a change if:

- hero-scale headings are used inside compact cards, panels, dashboards, filters, or toolbars
- text is forced onto one line in narrow containers without a measured reason
- viewport-width font sizing creates unexpected growth or shrinkage
- negative letter spacing is introduced
- cards are nested inside cards for page layout
- decorative panels or backgrounds obscure text
- color alone communicates an error, locked state, moderation state, or active filter

## Visual Hierarchy Expectations

- Reserve hero-scale type for true page heroes.
- Use compact headings inside cards, sidebars, forms, dashboards, filters, and status panels.
- Prefer full-width sections or unframed layouts for page structure; use cards for repeated items, forms, modals, and genuinely framed tools.
- Keep repeated card density low enough that members can scan the page without losing the primary action.
- Avoid UI sections that read as marketing hero pages when the page is a tool, dashboard, account workflow, or moderation queue.
- Keep controls close to the content they affect.
- Do not add visible in-app text that explains keyboard shortcuts, styling decisions, or implementation details.

## Evidence Rules

Record no-secret evidence only:

- branch and commit
- route and viewport coverage
- pass/fail notes for overflow, overlap, focus visibility, text resize, and status message placement
- screenshots only for public routes or redacted local fixtures
- private/member route findings as route-level notes, never as screenshots containing private data

Never record:

- cookies
- Supabase access tokens or refresh tokens
- service-role keys
- Discord bot tokens
- OAuth client secrets
- webhook URLs
- private message content
- member email addresses or personal account data
- unredacted moderator queues

## Evidence Template

```md
## Visual Hierarchy And Text-Fit Audit

- Date:
- Branch:
- Commit:
- Routes checked:
- Viewports checked: 360, 390, 768, 1024, 1440
- Text resize checked: yes/no/partial
- Horizontal overflow: pass/fail
- Text overlap/clipping: pass/fail
- Focus visibility/not obscured: pass/fail
- Status and error messages: pass/fail
- Card density and heading scale: pass/fail
- Protected-route evidence kept private/redacted: yes/no
- Follow-up PRs/tasks:
- Notes: no secrets recorded
```
