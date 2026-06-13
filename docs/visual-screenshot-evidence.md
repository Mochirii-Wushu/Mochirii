# Visual Screenshot Evidence

This runbook defines how Mochirii captures visual evidence after meaningful UI, layout, or design changes without turning private member state into committed artifacts.

## Source Basis

- [Playwright screenshots](https://playwright.dev/docs/screenshots)
- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WCAG Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- [Web Vitals](https://web.dev/articles/vitals)

## Policy

Screenshots are useful for visual review, but they are not neutral artifacts. They can preserve account names, private moderation state, signed URLs, cookies, or stale third-party iframe content. For this repo:

- Commit no screenshot image files by default.
- Prefer route matrices, DOM measurements, lint/build output, and redacted Markdown/JSON evidence in public PRs.
- Keep screenshots temporary or private unless the route is public, signed out, secret-safe, and explicitly useful for review.
- Record viewport, route, auth state, and pass/fail outcome instead of raw images for protected/member workflows.
- Treat visual comparison baselines as environment-sensitive. If screenshot baselines are ever adopted, generate and compare them in one stable CI environment.

## Viewport Matrix

Use these widths for visual review:

- `360x800`
- `390x844`
- `768x1024`
- `1024x768`
- `1440x1000`

The `360` and `390` widths cover tight mobile layouts. `768`, `1024`, and `1440` cover tablet, compact desktop, and wide desktop reading density.

## Route Matrix

Public, signed-out screenshot candidates:

- `/`
- `/join`
- `/events`
- `/gallery`
- `/ranks`
- `/leaders`
- `/codex`
- `/recruitment`
- `/announcements`
- `/raffles`
- `/spotify`
- `/spotlight`
- `/twills`

Protected/member routes should use DOM evidence or private operator screenshots only:

- `/auth`
- `/account`
- `/gallery-submit`
- `/leader-dashboard`
- `/members`
- `/members/[slug]`
- `/games/mochi-social`

## What To Capture

For public routes, capture or record:

- full first viewport at each width
- no horizontal overflow
- header and footer alignment
- hero/media framing
- readable card and panel density
- visible focus state for the first interactive controls
- reduced-motion behavior when motion is part of the change

For protected/member routes, record:

- signed-out state only in public reports
- noindex status
- form/status visibility as counts or pass/fail labels
- whether private screenshots were stored outside the repo
- cleanup owner if a private evidence packet is created

For iframe routes, record:

- iframe title presence
- frame container sizing
- whether third-party content loaded or was blocked
- whether any provider cache/availability issue affected the screenshot

## Command

Run:

```sh
npm run check:visual-screenshot-evidence
```

To refresh the redacted reports:

```sh
npm run check:visual-screenshot-evidence -- --write
```

This command is local-only and does not capture images, start Playwright, call providers, or mutate live systems.

## Stop Lines

Do not commit or paste:

- screenshots from logged-in member or moderator pages
- account names, emails, Discord IDs, cookies, access tokens, refresh tokens, or raw headers
- Supabase signed URLs, private Storage paths, service-role keys, Discord bot tokens, OAuth secrets, Enjin tokens, or wallet material
- provider dashboard screenshots with project secrets, billing details, account labels, or rollback values
- screenshots from real Discord channels unless the owner has approved that exact public evidence

If screenshot evidence is needed for a protected workflow, keep it outside the repo and record only a redacted pass/fail summary here.
