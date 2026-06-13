# Visual Screenshot Evidence Report

Generated: 2026-06-13T02:48:41.260Z

This report is intentionally no-secret. It records screenshot evidence policy and route coverage only; it does not capture screenshots or call providers.

## Result

- OK: yes
- Public routes: 13
- Protected routes: 7
- Default committed screenshots: none

## Source Basis

- https://playwright.dev/docs/screenshots
- https://playwright.dev/docs/test-snapshots
- https://www.w3.org/TR/WCAG22/
- https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- https://web.dev/articles/vitals

## Viewports

| Viewport | Purpose |
| --- | --- |
| 360x800 | tight mobile |
| 390x844 | common mobile |
| 768x1024 | tablet portrait |
| 1024x768 | compact desktop |
| 1440x1000 | wide desktop |

## Public Route Screenshot Candidates

| Route | File | Policy |
| --- | --- | --- |
| `/` | apps/web/app/page.tsx | public signed-out screenshots allowed only when useful and reviewed |
| `/join` | apps/web/app/join/page.tsx | public signed-out screenshots allowed only when useful and reviewed |
| `/events` | apps/web/app/events/page.tsx | public signed-out screenshots allowed only when useful and reviewed |
| `/gallery` | apps/web/app/gallery/page.tsx | public signed-out screenshots allowed only when useful and reviewed |
| `/ranks` | apps/web/app/ranks/page.tsx | public signed-out screenshots allowed only when useful and reviewed |
| `/leaders` | apps/web/app/leaders/page.tsx | public signed-out screenshots allowed only when useful and reviewed |
| `/codex` | apps/web/app/codex/page.tsx | public signed-out screenshots allowed only when useful and reviewed |
| `/recruitment` | apps/web/app/recruitment/page.tsx | public signed-out screenshots allowed only when useful and reviewed |
| `/announcements` | apps/web/app/announcements/page.tsx | public signed-out screenshots allowed only when useful and reviewed |
| `/raffles` | apps/web/app/raffles/page.tsx | public signed-out screenshots allowed only when useful and reviewed |
| `/spotify` | apps/web/app/spotify/page.tsx | public signed-out screenshots allowed only when useful and reviewed |
| `/spotlight` | apps/web/app/spotlight/page.tsx | public signed-out screenshots allowed only when useful and reviewed |
| `/twills` | apps/web/app/twills/page.tsx | public signed-out screenshots allowed only when useful and reviewed |

## Protected Route Policy

| Route | File | Policy |
| --- | --- | --- |
| `/auth` | apps/web/app/auth/page.tsx | do not commit; use DOM metrics or private operator evidence |
| `/account` | apps/web/app/account/page.tsx | do not commit; use DOM metrics or private operator evidence |
| `/gallery-submit` | apps/web/app/gallery-submit/page.tsx | do not commit; use DOM metrics or private operator evidence |
| `/leader-dashboard` | apps/web/app/leader-dashboard/page.tsx | do not commit; use DOM metrics or private operator evidence |
| `/members` | apps/web/app/members/page.tsx | do not commit; use DOM metrics or private operator evidence |
| `/members/[slug]` | apps/web/app/members/[slug]/page.tsx | do not commit; use DOM metrics or private operator evidence |
| `/games/mochi-social` | apps/web/app/games/mochi-social/page.tsx | do not commit; use DOM metrics or private operator evidence |

## Committed Screenshot Artifacts

- None

## Warnings

- None

## Failures

- None
