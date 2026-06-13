# Social Preview QA Report

Generated: 2026-06-13T02:42:30.269Z

This report is intentionally no-secret. It records local metadata and discovery checks only; it does not call Discord, Vercel, Supabase, Fly, Enjin, or any external card renderer.

## Result

- OK: yes
- Public routes checked: 13
- Protected routes checked: 7

## Source Basis

- https://nextjs.org/docs/app/getting-started/metadata-and-og-images
- https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- https://ogp.me/
- https://vercel.com/docs/og-image-generation
- https://support.discord.com/hc/en-us/community/posts/360055886251-Extended-metadata-tags-for-embeds

## Public Route Matrix

| Route | Metadata owner | Image | Image present | Sitemap expected |
| --- | --- | --- | --- | --- |
| `/` | apps/web/app/layout.tsx | `/assets/img/hero/hero.webp` | yes | yes |
| `/join` | apps/web/components/public-pages/metadata.ts | `/assets/img/join/hero.webp` | yes | yes |
| `/events` | apps/web/components/public-pages/metadata.ts | `/assets/img/events/hero.webp` | yes | yes |
| `/gallery` | apps/web/components/public-pages/metadata.ts | `/assets/img/gallery/hero.webp` | yes | yes |
| `/ranks` | apps/web/components/public-pages/metadata.ts | `/assets/img/ranks/hero.webp` | yes | yes |
| `/leaders` | apps/web/components/public-pages/metadata.ts | `/assets/img/leaders/hero.webp` | yes | yes |
| `/codex` | apps/web/components/public-pages/metadata.ts | `/assets/img/codex/hero.webp` | yes | yes |
| `/recruitment` | apps/web/components/public-pages/metadata.ts | `/assets/img/recruitment/hero.webp` | yes | yes |
| `/announcements` | apps/web/components/public-pages/metadata.ts | `/assets/img/announcements/hero.webp` | yes | yes |
| `/raffles` | apps/web/components/public-pages/metadata.ts | `/assets/img/raffles/hero.webp` | yes | yes |
| `/spotify` | apps/web/components/public-pages/metadata.ts | `/assets/img/spotify/hero.webp` | yes | yes |
| `/spotlight` | apps/web/components/public-pages/metadata.ts | `/assets/img/spotlight/hero.webp` | yes | yes |
| `/twills` | apps/web/components/public-pages/metadata.ts | `/assets/img/profiles/twills/hero.webp` | yes | yes |

## Protected Route Matrix

| Route | Source | Noindex expected | Sitemap expected |
| --- | --- | --- | --- |
| `/auth` | apps/web/app/auth/page.tsx | yes | no |
| `/account` | apps/web/app/account/page.tsx | yes | no |
| `/gallery-submit` | apps/web/app/gallery-submit/page.tsx | yes | no |
| `/leader-dashboard` | apps/web/app/leader-dashboard/page.tsx | yes | no |
| `/members` | apps/web/app/members/page.tsx | yes | no |
| `/members/[slug]` | apps/web/app/members/[slug]/page.tsx | yes | no |
| `/games/mochi-social` | apps/web/app/games/mochi-social/page.tsx | yes | no |

## Manual Platform Checks

- https://mochirii.com/
- https://mochirii.com/join
- https://mochirii.com/events
- https://mochirii.com/gallery
- https://mochirii.com/recruitment
- https://mochirii.com/games/mochi-social

Record only pass/fail, route, observed title, observed image presence, observed domain, and stale-cache notes.

## Stop Lines

- no tokens, cookies, service-role keys, bot tokens, OAuth secrets, webhook URLs, or raw request headers
- no signed URLs or private Supabase Storage object paths
- no Discord IDs, email addresses, account names, or private member profile data
- no screenshots from logged-in private member or moderator pages
- no real Discord channel posts, automated preview spam, or provider mutations without an approved release packet

## Warnings

- None

## Failures

- None
