# Route Information Architecture

Generated: 2026-06-13T03:16:11.316Z

This file is intentionally no-secret. It records route inventory, navigation grouping, auth-gated utility exposure, footer coverage, protected noindex status, and website/game ownership boundaries. It does not read provider dashboards or authorize live mutations.

## Result

- OK: yes
- Git branch: codex/route-information-architecture-audit
- Git head: 7a33d8a793b9
- Discovered page routes: 20
- Expected page routes: 20
- Provider mutations authorized: no
- Live provider reads: no

## Route Groups

| Group | Purpose | Routes |
| --- | --- | --- |
| Guild | Repeated guild destinations members naturally revisit. | /, /spotlight, /gallery, /members, /games/mochi-social |
| Culture | Stable identity and conduct reference material. | /join, /ranks, /leaders, /codex, /spotify |
| Updates | Time-sensitive community activity and notices. | /announcements, /events, /raffles |
| Account and Tools | Auth-gated or utility workflows that should not dominate public browsing. | /auth, /account, /gallery-submit, /leader-dashboard, /recruitment |
| Contextual | Routes reached from cards, profile links, or direct workflow context. | /twills, /members/[slug] |

## Header And Footer

- Header primary routes: /, /spotlight, /gallery, /members, /games/mochi-social, /join, /ranks, /leaders, /codex, /spotify, /announcements, /events, /raffles, /recruitment, /auth, /account, /gallery-submit, /leader-dashboard
- Header utility routes: /recruitment, /auth, /account, /members, /gallery-submit, /games/mochi-social, /leader-dashboard
- Footer routes: /, /spotlight, /gallery, /members, /gallery-submit, /join, /ranks, /leaders, /codex, /spotify, /auth, /account, /announcements, /events, /raffles
- Footer action routes: /, /recruitment

## Route Matrix

| Route | Surface | Group | Primary header | Utility header | Footer | Auth | Noindex |
| --- | --- | --- | --- | --- | --- | --- | --- |
| / | public | guild | yes | no | yes | public/contextual | n/a |
| /spotlight | public | guild | yes | no | yes | public/contextual | n/a |
| /gallery | public | guild | yes | no | yes | public/contextual | n/a |
| /members | member | guild | yes | yes | yes | verified | yes |
| /games/mochi-social | alpha | guild | yes | yes | no | signed-in | yes |
| /join | public | culture | yes | no | yes | public/contextual | n/a |
| /ranks | public | culture | yes | no | yes | public/contextual | n/a |
| /leaders | public | culture | yes | no | yes | public/contextual | n/a |
| /codex | public | culture | yes | no | yes | public/contextual | n/a |
| /spotify | public | culture | yes | no | yes | public/contextual | n/a |
| /announcements | public | updates | yes | no | yes | public/contextual | n/a |
| /events | public | updates | yes | no | yes | public/contextual | n/a |
| /raffles | public | updates | yes | no | yes | public/contextual | n/a |
| /recruitment | utility | account-tools | no | yes | yes | public/contextual | n/a |
| /auth | account | account-tools | no | yes | yes | signed-out | yes |
| /account | account | account-tools | no | yes | yes | signed-in | yes |
| /gallery-submit | member-tool | account-tools | no | yes | yes | verified | yes |
| /leader-dashboard | moderator-tool | account-tools | no | yes | no | signed-in | yes |
| /twills | contextual | contextual | no | no | no | public/contextual | n/a |
| /members/[slug] | contextual-member | contextual | no | no | no | public/contextual | yes |

## Source Basis

- https://www.w3.org/TR/WCAG22/
- https://www.w3.org/WAI/WCAG21/Understanding/consistent-navigation.html
- https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks
- https://web.dev/learn/html/navigation
- https://web.dev/articles/headings-and-landmarks
- https://designsystem.digital.gov/components/header/
- https://designsystem.digital.gov/components/in-page-navigation/

## Warnings

- None

## Failures

- None
