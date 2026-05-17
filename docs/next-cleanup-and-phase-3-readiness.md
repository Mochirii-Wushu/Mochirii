# Next Cleanup and Phase 3 Readiness

## Current State

This repository currently keeps two site surfaces side by side:

- The original root GitHub Pages static site remains in place and is still the source for the deferred auth/member workflows.
- The Vercel-ready Next.js App Router app lives in `apps/web`.
- Vercel Root Directory is expected to remain `apps/web`.
- Production Vercel review URL is `https://mochirii.vercel.app`.
- DNS cutover for `mochirii.com` remains deferred.
- Phase 3 auth/member/upload/moderation migration has not started.

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
- Development environment was missing `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` during this audit. This is intentionally skipped for now. No values were printed or changed.
- `.vercel/`, `.env*`, `.next/`, and `.vercel/output` must remain local-only and ignored.
- Root-level `vercel link --repo` was attempted as a reversible documented monorepo-link cleanup path. It prompted for confirmation before linking the Git repository to Vercel projects, so the prompt was cancelled and the previous `apps/web/.vercel` link was restored.
- The local Vercel root mismatch is fixed in `apps/web/next.config.ts` by matching `turbopack.root` to the `apps/web` project root used by `vercel build --prod --cwd apps/web`.

Manual Development env follow-up, only if local Vercel Development workflows are needed later:

```sh
cd apps/web
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY development
vercel pull --environment=development
```

Do not print or commit the value.

Recommended local Vercel workflow:

```sh
cd apps/web
vercel pull --environment=production --yes
npm run clean
cd ../..
vercel build --prod --cwd apps/web
```

If the operator wants to retry root-level linking later, run `vercel link --repo` from the repository root with the operator present for prompts. Select the `mochirii` team, `web` project, and `apps/web` root directory if prompted. Do not commit `.vercel` files.

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
| `assets/audio/mochiriiiiii.mp3` exceeds static asset size threshold | Document as intentional | Preserve audio asset exactly as-is; audio quality is preferred. This is not a Vercel blocker, and compression/re-encoding/replacement/deletion/external storage require explicit future user approval. |
| Vercel CLI warns that `.next` should not be uploaded | Document as local hygiene | Keep `.next` ignored; use cleanup scripts before local `vercel build --prod` when needed. |
| Vercel local build previously logged that `outputFileTracingRoot` and `turbopack.root` differed | Fixed | `turbopack.root` now points at the `apps/web` project root, matching the effective tracing root used by `vercel build --prod --cwd apps/web`. The local Vercel build passes without the mismatch warning. |
| React warns about an empty string `img src` | Fix now | Do not render lightbox images until an item is open. |
| Development env missing `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Skipped intentionally | Production and Preview are the required environments for deployed and PR-preview builds. Do not prompt for or add Development env values in this task. |

## Cleanup Candidates

Safe cleanup completed or planned in this branch:

- Set `turbopack.root` to the `apps/web` project root in `apps/web/next.config.ts` so it matches Vercel CLI's effective `outputFileTracingRoot` when building with `vercel build --prod --cwd apps/web`.
- Render no lightbox `<img>` when no image is open.
- Add opt-in `apps/web` cleanup scripts for `.next` and `.vercel/output`.
- Ignore generated `.next` and `.vercel` directories in the root local reference checker.
- Document intentional warnings and Phase 3 blockers.

Not changed in this branch:

- Audio asset size. It is intentional, user-facing, and explicitly preserved.
- Vercel Development env mismatch. It is intentionally skipped for now.
- Local root-level Vercel relink. It needs operator confirmation at the interactive prompt and is no longer required for the warning fix.
- Any Phase 3 route implementation.
- Any root static HTML/JS/CSS/data/assets.

## Reference Notes

- Next.js documents that Turbopack automatically detects the root directory from lockfiles in typical project layouts.
- React supports conditionally rendering nothing with `null` or conditional JSX.
- Vercel builds are framework-aware and generate local build output; local generated output must stay ignored.
- Supabase Auth redirect URLs, RLS, Storage access control, and Edge Function secrets must be rechecked before Phase 3 implementation.
- Vercel documents monorepo Root Directory as a project/dashboard setting; the local root repo-link flow is optional and must be done with operator prompt approval.
- Vercel CLI documents `--cwd` as the safe way to run a command from a different working directory, which keeps local validation aligned with the `apps/web` project root.

## Final Cleanup Results

Final validation was completed on this branch after the pre-Phase-3 cleanup updates:

- Root validation: `npm run check`, `npm run check:json`, `npm run check:refs`, `npm run check:production`, and `git diff --check` passed.
- `apps/web` validation: `npm run lint` and `npm run build` passed.
- Local Vercel production build: `vercel build --prod --cwd apps/web` passed; Vercel root mismatch result is `FIXED` because `turbopack.root` now matches the effective `apps/web` tracing root. Root-level `vercel link --repo` still needs operator approval if retried later, but it is not required for this local build path.
- Env-name verification: Production and Preview include `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL`; Development includes `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SITE_URL` but is missing `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, which is intentionally skipped.
- Route smoke: `/`, `/gallery`, `/join`, `/ranks`, `/leaders`, `/codex`, `/events`, `/announcements`, `/raffles`, `/spotlight`, `/spotify`, `/recruitment`, and `/twills` returned 200 locally.
- Redirect smoke: `/index.html` redirected to `/`; `/gallery.html` redirected to `/gallery`.
- Gallery smoke: Newest started `shot-73`, `shot-72`, `shot-71`; Oldest started `shot-01`, `shot-02`, `shot-03`; Random changed after hard refresh and stayed stable during one category-toggle session; lightbox opened the correct full image.
- Empty image source warning: no empty `img src` nodes or empty-src console warnings were seen in local browser smoke for `/`, `/gallery`, and `/spotlight`.
- Safety checks: passed. `.vercel`, `.env.local`, `.next`, and `.vercel/output` are ignored/not tracked; generated `.next` and `.vercel/output` were cleaned after validation; secret scan found expected placeholder/env-name references only; `assets/audio/mochiriiiiii.mp3` remained untouched.
