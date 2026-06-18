# CSP Inline Hardening Inventory

Generated: 2026-06-18T06:15:31.551Z

This file is intentionally no-secret. It inventories the current CSP and inline-sensitive production app source before any future removal of `unsafe-inline`.

## Result

- OK: yes
- Base URL: https://mochirii.com
- CSP enforced in Next config: yes
- Report-only CSP in Next config: no
- Unsafe-inline directives: script-src, style-src
- Unsafe-eval directives: none
- Scanned source files: 63

## Directives

| Directive | Sources |
| --- | --- |
| default-src | 'self' |
| base-uri | 'self' |
| object-src | 'none' |
| frame-ancestors | 'none' |
| form-action | 'self' |
| script-src | 'self' 'unsafe-inline' |
| style-src | 'self' 'unsafe-inline' |
| img-src | 'self' data: blob: https://*.supabase.co https://cdn.discordapp.com https://media.discordapp.net https://i.scdn.co https://*.scdn.co |
| font-src | 'self' data: |
| media-src | 'self' data: blob: |
| frame-src | 'self' https://discord.com https://open.spotify.com https://mochi-social-game.fly.dev |
| connect-src | 'self' https://*.supabase.co wss://*.supabase.co https://discord.com https://cdn.discordapp.com https://vitals.vercel-insights.com https://mochi-social-game.fly.dev |
| worker-src | 'self' blob: |
| upgrade-insecure-requests |  |

## Inline-Sensitive Source Inventory

| Pattern | Severity | Count | Files |
| --- | --- | ---: | --- |
| inlineStyleProp | inventory | 0 | none |
| iframeElement | inventory | 4 | apps/web/components/mochi-social/MochiSocialAlphaClient.tsx (1)<br>apps/web/components/mochi-social/MochiSocialTesterGameClient.tsx (1)<br>apps/web/components/public-pages/pages.tsx (1)<br>apps/web/components/public-pages/SpotifyBrowser.tsx (1) |
| scriptElement | review | 0 | none |
| nextScriptImport | review | 0 | none |
| dangerouslySetInnerHTML | block | 0 | none |
| srcDoc | block | 0 | none |
| evalCall | block | 0 | none |
| newFunction | block | 0 | none |

## External Origins In App Source

| Origin | Allowed by CSP | Files |
| --- | --- | --- |
| https://discord.com | frame-src, connect-src | apps/web/app/page.tsx<br>apps/web/components/SiteFooter.tsx<br>apps/web/components/SiteHeader.tsx<br>apps/web/components/member-workflow/AccountPanel.tsx<br>apps/web/components/public-pages/EventsBoard.tsx<br>apps/web/components/public-pages/pages.tsx |
| https://mochi-social-game.fly.dev | frame-src, connect-src | apps/web/components/mochi-social/MochiSocialAlphaClient.tsx<br>apps/web/components/mochi-social/MochiSocialTesterGameClient.tsx |
| https://mochirii.com | default-src, base-uri, form-action, script-src, style-src, img-src, font-src, media-src, frame-src, connect-src, worker-src | apps/web/app/account/page.tsx<br>apps/web/app/auth/page.tsx<br>apps/web/app/gallery-submit/page.tsx<br>apps/web/app/layout.tsx<br>apps/web/app/leader-dashboard/page.tsx<br>apps/web/components/public-pages/metadata.ts |
| https://www.instagram.com | none | apps/web/components/member-workflow/LeaderDashboard.tsx |

## Browser Route Matrix

| Route | Surface | CSP-sensitive features |
| --- | --- | --- |
| / | home shell | Vercel analytics, Speed Insights, gallery media |
| /join | Discord funnel | Discord links, rules and verification copy |
| /events | events | event cover images, filter state |
| /gallery | gallery | Supabase signed media, lightbox, share status |
| /auth | auth | Supabase auth client, status message |
| /account | member account | Supabase auth, profile media, status messages |
| /members | member directory | Supabase profile cards, members-only boundary |
| /gallery-submit | gallery submit | Supabase storage upload, status message |
| /leader-dashboard | moderation | Supabase moderation queues, status messages |
| /spotify | Spotify | Spotify iframe embeds |
| /spotlight | spotlight | Supabase public spotlight endpoint |
| /games/mochi-social | Mochi Social | Fly iframe, postMessage bridge |
| /codex | Codex | static conduct content |

## Live Header Sweep

| Route | Status | CSP | Report-only | Unsafe-inline |
| --- | ---: | --- | --- | --- |
| / | 200 | yes | no | script-src, style-src |
| /join | 200 | yes | no | script-src, style-src |
| /events | 200 | yes | no | script-src, style-src |
| /gallery | 200 | yes | no | script-src, style-src |
| /auth | 200 | yes | no | script-src, style-src |
| /account | 200 | yes | no | script-src, style-src |
| /members | 200 | yes | no | script-src, style-src |
| /gallery-submit | 200 | yes | no | script-src, style-src |
| /leader-dashboard | 200 | yes | no | script-src, style-src |
| /spotify | 200 | yes | no | script-src, style-src |
| /spotlight | 200 | yes | no | script-src, style-src |
| /games/mochi-social | 200 | yes | no | script-src, style-src |
| /codex | 200 | yes | no | script-src, style-src |

## Next Steps

- Keep React inline style props at zero before any style-src unsafe-inline removal.
- Run a Vercel Preview browser pass before removing style-src unsafe-inline because framework-managed image/route helpers can still emit runtime style attributes.
- Keep Spotify and Mochi Social iframe routes in the browser route sweep.
- Verify Supabase auth/storage, Discord handoff links, Vercel Analytics, Speed Insights, and Mochi Social postMessage behavior before tightening CSP.
- Treat Next.js nonce-based CSP as a separate compatibility PR because nonce middleware makes pages dynamically rendered instead of static/prerendered.
- Remove script-src unsafe-inline only after choosing a Next-compatible nonce or SRI path and proving no analytics, auth, or embed regressions.

## Warnings

- https://www.instagram.com appears in app source but is not currently allowed by CSP; confirm it is not runtime-loaded before tightening.

## Failures

- None
