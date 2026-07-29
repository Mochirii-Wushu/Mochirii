# Accessibility Route Matrix

Generated: 2026-07-29T22:41:42.949Z

This file is intentionally no-secret. It records WCAG 2.2 AA-oriented accessibility coverage for Mochirii route workflows and names the browser checks that still require manual or Playwright evidence.

## Result

- OK: yes
- Routes: 25
- Protected/noindex routes: 8
- Routes with live regions: 14
- Routes with alerts: 7
- Routes with forms: 5
- Routes with iframes: 2

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
| /account | member | profile and verification | 2 | 4 | 1 | 0/0 | yes |
| /announcements | public | updates | 1 | 0 | 0 | 0/0 | n/a |
| /auth | protected-entry | Discord OAuth | 2 | 1 | 3 | 0/0 | yes |
| /events | public | community schedule | 5 | 0 | 0 | 0/0 | n/a |
| /gallery | public | media browsing | 4 | 0 | 1 | 0/0 | n/a |
| /gallery-submit | member | member upload | 1 | 3 | 1 | 0/0 | yes |
| /games/mochi-pets | public-with-protected-entry | public concept and private tester doorway | 1 | 1 | 2 | 0/0 | n/a |
| /join | public | website to Discord funnel | 1 | 0 | 0 | 1/1 | n/a |
| /leader-dashboard | moderator | moderation queues | 2 | 3 | 0 | 0/0 | yes |
| /leader-dashboard/raffle | moderator | private monthly raffle administration | 0 | 0 | 0 | 0/0 | yes |
| /leaders | public | stewardship reference | 0 | 0 | 0 | 0/0 | n/a |
| /meta-data-deletion | public | data deletion instructions | 1 | 0 | 0 | 0/0 | n/a |
| /oauth/consent | protected-entry | Supabase OAuth consent | 1 | 1 | 0 | 0/0 | yes |
| /privacy | public | privacy notice | 1 | 0 | 0 | 0/0 | n/a |
| /raffle | public | monthly raffle program and inactive drawing status | 0 | 0 | 0 | 0/0 | n/a |
| /raffle/claim | member | private winner reward claim | 0 | 0 | 0 | 0/0 | yes |
| /ranks | public | progression reference | 0 | 0 | 0 | 0/0 | n/a |
| /recruitment | public | recruiting copy | 0 | 0 | 0 | 0/0 | n/a |
| /social | member | guild social doorway | 1 | 1 | 0 | 0/0 | yes |
| /spotify | public | embedded playlists | 0 | 0 | 0 | 1/1 | n/a |
| /spotlight | public | member spotlight | 0 | 0 | 0 | 0/0 | n/a |
| /tome | public | conduct reference | 0 | 0 | 0 | 0/0 | n/a |
| /twills | public | profile reference | 0 | 0 | 0 | 0/0 | n/a |
| /__mochirii-unknown-route__ | public | unknown-route recovery | 0 | 0 | 0 | 0/0 | n/a |

## Manual Browser Matrix

- Keyboard tab order and Escape behavior for header dropdowns and mobile menu at 360x800, 375x812, 390x844, 414x896, 430x932, 1280x720, 1366x768, 1440x900, 1536x864, and 1920x1080.
- Visible focus rings for nav, buttons, gallery thumbnails, forms, queue tabs, Spotify chips, and project-page links.
- Color contrast for muted text, status pills, form errors, badges, and glass panels in light and dark image areas.
- Reduced motion behavior for hover transforms, glints, gallery/home image motion, and scroll behavior.
- Screen reader status updates for auth, account verification, gallery submit, gallery filters/share, events filters, and leader queues.
- Mochi Pets member-check status, passcode error announcement, signed-out guidance, and unlocked waiting-room facts.
- Iframe keyboard reachability and titles for the user-activated Discord preview and deferred Spotify embeds.

## Warnings

- /leaders: no route-specific live region found; confirm static-only page status remains intentional.
- /raffle: no route-specific live region found; confirm static-only page status remains intentional.
- /ranks: no route-specific live region found; confirm static-only page status remains intentional.
- /recruitment: no route-specific live region found; confirm static-only page status remains intentional.
- /spotify: no route-specific live region found; confirm static-only page status remains intentional.
- /spotlight: no route-specific live region found; confirm static-only page status remains intentional.
- /tome: no route-specific live region found; confirm static-only page status remains intentional.
- /twills: no route-specific live region found; confirm static-only page status remains intentional.
- /__mochirii-unknown-route__: no route-specific live region found; confirm static-only page status remains intentional.

## Failures

- None
