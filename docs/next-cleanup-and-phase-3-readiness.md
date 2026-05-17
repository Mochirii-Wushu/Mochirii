# Next Cleanup and Phase 3 Readiness

## Current State

This repository currently keeps two site surfaces side by side:

- The original root GitHub Pages static site remains in place and is still the source for the deferred auth/member workflows.
- The Vercel-ready Next.js App Router app lives in `apps/web`.
- Vercel Root Directory is expected to remain `apps/web`.
- Production Vercel review URL is `https://mochirii.vercel.app`.
- DNS cutover for `mochirii.com` remains deferred.

The cleanup branch was created from a clean `main` after the Phase 1, Phase 2, homepage seal, and gallery sort fixes were merged.

## Current Next Routes

Implemented in `apps/web/app`:

- `/`
- `/join`
- `/ranks`
- `/leaders`
- `/codex`
- `/events`
- `/announcements`
- `/raffles`
- `/gallery`
- `/spotlight`
- `/spotify`
- `/recruitment`
- `/twills`

Deferred clean routes that do not have Next pages yet:

- `/auth`
- `/account`
- `/gallery-submit`
- `/leader-dashboard`

## Current Root Static Routes

Root HTML files still present:

- `/index.html`
- `/join.html`
- `/gallery.html`
- `/leaders.html`
- `/ranks.html`
- `/codex.html`
- `/events.html`
- `/announcements.html`
- `/raffles.html`
- `/recruitment.html`
- `/spotify.html`
- `/spotlight.html`
- `/twills.html`
- `/auth.html`
- `/account.html`
- `/gallery-submit.html`
- `/leader-dashboard.html`

Root JS files still present and intentionally untouched for this cleanup:

- `auth.js`
- `account.js`
- `gallery-submit.js`
- `leader-dashboard.js`
- `supabase.js`
- existing public page scripts and shared helpers

## Migrated Routes

Phase 1 migrated the Next scaffold, shared shell, copied assets/data/styles, homepage, and legacy `.html` redirects.

Phase 2 migrated public/static routes:

- `/join`
- `/ranks`
- `/leaders`
- `/codex`
- `/events`
- `/announcements`
- `/raffles`
- `/gallery`
- `/spotlight`
- `/spotify`
- `/recruitment`
- `/twills`

Public interactions migrated into Next include event filters, Spotify filtering, gallery filters, gallery query state, gallery sort state, gallery copy link, and gallery lightbox behavior.

## Deferred Routes

These routes remain Phase 3 work and were not migrated in this cleanup:

- `/auth`
- `/account`
- `/gallery-submit`
- `/leader-dashboard`

The existing root static pages and scripts continue to document the current browser-side behavior for these workflows.

## Vercel State

- Vercel CLI is available locally and the `apps/web` project has been linked in prior verification.
- Root Directory must remain `apps/web`.
- Production and Preview environments have the required public env names configured.
- Development environment was missing `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` during this audit. No values were printed or changed.
- `.vercel/`, `.env*`, `.next/`, and `.vercel/output` must remain local-only and ignored.

Manual Development env follow-up:

```sh
cd apps/web
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY development
vercel pull --environment=development
```

Do not print or commit the value.

## Supabase and Auth State

The current static implementation uses:

- `supabase.js` as the browser helper on root static pages.
- Supabase Auth with Discord OAuth for login.
- `member_profiles` for Discord identity, profile fields, role verification state, and member status.
- `gallery_submissions` for member gallery upload metadata.
- `gallery_moderation_events` for moderation history.
- `discord_resources` and `discord_sync_log` for Discord integration registry/audit support.
- Private Supabase Storage bucket `member-gallery`.
- Edge Functions:
  - `verify-discord-member`
  - `list-approved-gallery-submissions`
  - `list-gallery-review-queue`
  - `moderate-gallery-submission`

The Next app does not yet migrate these auth/member/upload/moderation behaviors.

## Warning Inventory

| Warning | Classification | Decision |
| --- | --- | --- |
| `assets/audio/mochiriiiiii.mp3` exceeds static asset size threshold | Document as intentional | Preserve audio asset unchanged; current validator accepts this as warning-only. |
| Vercel CLI warns that `.next` should not be uploaded | Document as local hygiene | Keep `.next` ignored; use cleanup scripts before local `vercel build --prod` when needed. |
| Vercel deployment logs warn `outputFileTracingRoot` and `turbopack.root` differ | Document as non-blocking after safe config attempt | `next build` no longer infers the wrong home-directory root. Local `vercel build --prod` still injects an `outputFileTracingRoot` for the linked `apps/web` root and logs the warning while passing. Recheck dashboard logs after the PR deployment. |
| React warns about an empty string `img src` | Fix now | Do not render lightbox images until an item is open. |
| Development env missing `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Needs manual decision | Document exact manual Vercel env follow-up; do not change dashboard or values in this task. |

## Cleanup Candidates

Safe cleanup completed or planned in this branch:

- Set `turbopack.root` to the repository root in `apps/web/next.config.ts` to prevent local `next build` from inferring an unrelated home-directory lockfile.
- Render no lightbox `<img>` when no image is open.
- Add opt-in `apps/web` cleanup scripts for `.next` and `.vercel/output`.
- Ignore generated `.next` and `.vercel` directories in the root local reference checker.
- Document intentional warnings and Phase 3 blockers.

Not cleaned in this branch:

- Audio asset size. It is intentional and user-facing.
- Vercel Development env mismatch. This needs a manual env value.
- Local `vercel build --prod` root mismatch warning. The build passes, and the remaining warning comes from local Vercel CLI project-root injection.
- Any Phase 3 route implementation.
- Any root static HTML/JS/CSS/data/assets.

## Reference Notes

- Next.js documents that Turbopack automatically detects the root directory from lockfiles in typical project layouts.
- React supports conditionally rendering nothing with `null` or conditional JSX.
- Vercel builds are framework-aware and generate local build output; local generated output must stay ignored.
- Supabase Auth redirect URLs, RLS, Storage access control, and Edge Function secrets must be rechecked before Phase 3 implementation.

## Final Cleanup Results

Final validation was completed on this branch after the cleanup patch:

- Root validation: `npm run check`, `npm run check:json`, `npm run check:refs`, `npm run check:production`, and `git diff --check` passed.
- `apps/web` validation: `npm run lint` and `npm run build` passed.
- Local Vercel production build: `vercel build --prod` passed; it still logs the documented local root mismatch warning.
- Route smoke: `/`, `/gallery`, `/join`, `/ranks`, `/leaders`, `/codex`, `/events`, `/announcements`, `/raffles`, `/spotlight`, `/spotify`, `/recruitment`, and `/twills` returned 200 locally.
- Redirect smoke: `/index.html` redirected to `/`; `/gallery.html` redirected to `/gallery`.
- Gallery smoke: Newest started `shot-73`, `shot-72`, `shot-71`; Oldest started `shot-01`, `shot-02`, `shot-03`; Random changed after hard refresh and stayed stable during one category-toggle session; lightbox opened the correct full image.
- Empty image source warning: no empty `img src` nodes or empty-src console warnings were seen in local browser smoke for `/`, `/gallery`, and `/spotlight`.
- Safety checks: passed. `.vercel`, `.env.local`, `.next`, and `.vercel/output` are ignored/not tracked; generated `.next` and `.vercel/output` were cleaned after validation; secret scan found expected placeholder/env-name references only.
