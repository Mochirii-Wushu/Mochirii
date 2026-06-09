# Sitewide Visual Quality Polish

Date: 2026-06-10

Branch: `codex/sitewide-visual-quality-polish`

## Scope

This pass is a visual-quality and rendering polish pass for the live Next/Vercel app. It does not change visible copy, schedule data, timestamps, public routes, Supabase schema, Discord commands, provider settings, secrets, or static content JSON.

## Changes

- Added shared visual tokens in `apps/web/app/mochirii.css` for glass surfaces, rim colors, shadows, spacing, and focus rings.
- Refined shared card, hero, image, hover, and focus treatment so pages read as one premium guild system while preserving page-specific flair.
- Added a `StaticImage` wrapper around Next Image for safe static public assets.
- Converted high-impact static heroes and card images on Home and public content pages to the wrapper while preserving source paths, alt text, dimensions, priority/lazy intent, and visual layout.
- Left Supabase signed media and external embeds out of the wrapper so private storage and provider behavior stay unchanged.

## Verification

Local checks completed before PR:

- `git diff --check`
- `npm run check`
- `npm run check:production`
- `cd apps/web && npm run lint`
- `cd apps/web && npm run build`
- `cd apps/web && npm audit --audit-level=moderate`

Browser checks completed locally on `http://127.0.0.1:3000`:

- Route sweep: `/`, `/join`, `/events`, `/gallery`, `/ranks`, `/leaders`, `/codex`, `/announcements`, `/raffles`, `/spotify`, `/spotlight`, `/twills`, `/auth`, `/account`, `/members`, `/gallery-submit`, `/leader-dashboard`.
- Responsive matrix: `360`, `390`, `768`, `1024`, and `1440` widths for Home, Events, Gallery, Members, Account, Gallery Submit, and Leader Dashboard.
- Confirmed no horizontal overflow, no broken images, and no obvious card/image overlap in the checked viewports.
- Confirmed the Events board remains a bounded scroll panel and the list remains reachable.

## Notes

- Browser console showed a Google/FedCM identity-token retrieval warning during the route sweep. It is existing browser/provider noise and not caused by this visual pass.
- Provider dashboards were not mutated. GitHub and Vercel preview evidence should be recorded in the PR/check history after push.
