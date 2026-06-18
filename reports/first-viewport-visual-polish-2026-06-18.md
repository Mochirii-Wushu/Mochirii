# First-Viewport Visual Polish

Date: 2026-06-18
Branch: `codex/first-viewport-visual-polish`

## Scope

- Refined the shared Next visual system without changing visible copy, images, routes, schedules, Supabase behavior, Discord behavior, or provider settings.
- Added explicit surface tiers for hero shell, primary content card, quiet card, tool panel, and admin/member panels.
- Reduced first-viewport hero dominance on Home, Events, and Gallery with page-scoped hero frame and overlap tokens.
- Kept decorative glints/footer geometry paint-contained on small screens.

## Browser QA

Local production server: `http://127.0.0.1:3210`

Checked routes:
`/`, `/events`, `/gallery`, `/join`, `/leaders`, `/members`, `/account`, `/leader-dashboard`, `/spotify`

Checked widths:
`390`, `768`, `1024`, `1440`

Result:
- 36 route/viewport checks passed.
- No horizontal overflow detected.
- No route status failures or page exceptions detected.
- Local-only Vercel Analytics and Speed Insights script 404s were verified as expected for `next start` and ignored.

First-viewport evidence:
- Home shows its primary CTA layer in every checked viewport.
- Events shows its first content context in the first viewport at `390`, `768`, and `1440`; the hero intro remains visible at `1024`.
- Gallery shows its first content context in the first viewport at `390`, `768`, and `1440`; the page transition begins at the fold at `1024`.

## Validation

- `npm run check:universal-hero-spacing`: passed.
- `cd apps/web && npm run build`: passed.
- `git diff --check`: passed.
- `npm run check`: passed, with the known large audio warning for `assets/audio/mochiriiiiii.mp3`.
- `npm run check:production`: passed.
- `npm run smoke:supabase-edge-functions`: passed.
- `cd apps/web && npm run lint`: passed.
- `cd apps/web && npm audit --audit-level=moderate`: passed with 0 vulnerabilities.

## Notes

- The update is CSS/docs/guardrail only.
- No `data/`, public asset, Supabase, Discord, Vercel, Cloudflare, or secret changes were made.
