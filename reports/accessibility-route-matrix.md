# Accessibility Route Matrix

Generated: 2026-06-13T00:10:39.020Z

This file is intentionally no-secret. It records WCAG 2.2 AA-oriented accessibility coverage for Mochirii route workflows and names the browser checks that still require manual or Playwright evidence.

## Result

- OK: yes
- Routes: 20
- Protected/noindex routes: 7
- Routes with live regions: 10
- Routes with alerts: 5
- Routes with forms: 3
- Routes with iframes: 3

## Shell Foundations

| Check | Result |
| --- | --- |
| htmlLang | pass |
| mainTargetCoverage | pass |
| skipLink | pass |
| primaryNavLabel | pass |
| mobileMenuControls | pass |
| mobileFocusTrap | pass |
| escapeClosesMenu | pass |
| focusReturn | pass |
| srOnlyClass | pass |
| focusVisible | pass |
| reducedMotion | pass |
| footerNavLabel | pass |

## Route Matrix

| Route | Type | Workflow | Live regions | Alerts | Forms | Iframes titled | Noindex |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| / | public | guild overview | 1 | 0 | 0 | 0/0 | n/a |
| /join | public | website to Discord funnel | 1 | 0 | 0 | 1/1 | n/a |
| /events | public | community schedule | 5 | 0 | 0 | 0/0 | n/a |
| /gallery | public | media browsing | 4 | 0 | 0 | 0/0 | n/a |
| /ranks | public | progression reference | 0 | 0 | 0 | 0/0 | n/a |
| /leaders | public | stewardship reference | 0 | 0 | 0 | 0/0 | n/a |
| /codex | public | conduct reference | 0 | 0 | 0 | 0/0 | n/a |
| /recruitment | public | recruiting copy | 0 | 0 | 0 | 0/0 | n/a |
| /announcements | public | updates | 1 | 0 | 0 | 0/0 | n/a |
| /raffles | public | giveaway reference | 0 | 0 | 0 | 0/0 | n/a |
| /spotify | public | embedded playlists | 0 | 0 | 0 | 1/1 | n/a |
| /spotlight | public | member spotlight | 0 | 0 | 0 | 0/0 | n/a |
| /twills | public | profile reference | 0 | 0 | 0 | 0/0 | n/a |
| /auth | protected-entry | Discord OAuth | 1 | 1 | 0 | 0/0 | yes |
| /account | member | profile and verification | 5 | 4 | 1 | 0/0 | yes |
| /gallery-submit | member | member upload | 3 | 3 | 1 | 0/0 | yes |
| /leader-dashboard | moderator | moderation queues | 8 | 4 | 0 | 0/0 | yes |
| /members | member | member directory | 1 | 0 | 0 | 0/0 | yes |
| /members/[slug] | member | member profile | 0 | 0 | 0 | 0/0 | yes |
| /games/mochi-social | alpha | tester game doorway | 0 | 1 | 3 | 2/2 | yes |

## Manual Browser Matrix

- Keyboard tab order and Escape behavior for header dropdowns and mobile menu at 360, 390, 768, 1024, and 1440 widths.
- Visible focus rings for nav, buttons, gallery thumbnails, forms, queue tabs, Spotify chips, and Mochi Social gate controls.
- Color contrast for muted text, status pills, form errors, badges, and glass panels in light and dark image areas.
- Reduced motion behavior for hover transforms, glints, gallery/home image motion, and scroll behavior.
- Screen reader status updates for auth, account verification, gallery submit, gallery filters/share, events filters, leader queues, and Mochi Social gate errors.
- Iframe keyboard reachability and titles for Discord, Spotify, and Mochi Social embeds.

## Warnings

- /ranks: no route-specific live region found; confirm static-only page status remains intentional.
- /leaders: no route-specific live region found; confirm static-only page status remains intentional.
- /codex: no route-specific live region found; confirm static-only page status remains intentional.
- /recruitment: no route-specific live region found; confirm static-only page status remains intentional.
- /raffles: no route-specific live region found; confirm static-only page status remains intentional.
- /spotify: no route-specific live region found; confirm static-only page status remains intentional.
- /spotlight: no route-specific live region found; confirm static-only page status remains intentional.
- /twills: no route-specific live region found; confirm static-only page status remains intentional.
- /games/mochi-social: no route-specific live region found; confirm static-only page status remains intentional.

## Failures

- None
