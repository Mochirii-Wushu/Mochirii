# CSP Inline Hardening Inventory

Generated: 2026-07-25T11:37:21.731Z

This file is intentionally no-secret. It inventories the current CSP and inline-sensitive production app source before any future removal of `unsafe-inline`.

## Result

- OK: yes
- Base URL: https://mochirii.com
- CSP enforced in Next config: yes
- Report-only CSP in Next config: no
- Unsafe-inline directives: script-src, style-src
- Unsafe-eval directives: none
- Scanned source files: 112

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
| frame-src | 'self' https://discord.com https://open.spotify.com |
| connect-src | 'self' https://*.supabase.co wss://*.supabase.co https://discord.com https://cdn.discordapp.com https://vitals.vercel-insights.com |
| worker-src | 'self' blob: |
| upgrade-insecure-requests |  |

## Inline-Sensitive Source Inventory

| Pattern | Severity | Count | Files |
| --- | --- | ---: | --- |
| inlineStyleProp | inventory | 0 | none |
| iframeElement | inventory | 2 | apps/web/components/public-pages/route-pages/JoinPage.tsx (1)<br>apps/web/components/public-pages/SpotifyBrowser.tsx (1) |
| scriptElement | review | 1 | apps/web/app/page.tsx (1) |
| nextScriptImport | review | 0 | none |
| dangerouslySetInnerHTML | block | 1 | apps/web/app/page.tsx (1) |
| srcDoc | block | 0 | none |
| evalCall | block | 0 | none |
| newFunction | block | 0 | none |

## External Origins In App Source

| Origin | Allowed by CSP | Files |
| --- | --- | --- |
| https://discord.com | frame-src, connect-src | apps/web/components/public-pages/route-pages/JoinPage.tsx |
| https://schema.org | none | apps/web/app/page.tsx |
| https://www.instagram.com | none | apps/web/components/member-workflow/LeaderDashboardParts.tsx |

## Browser Route Matrix

| Route | Surface | CSP-sensitive features |
| --- | --- | --- |
| / | home shell | Vercel analytics, Speed Insights, gallery media |
| /join | Discord funnel | Discord links, rules and verification copy |
| /events | events | event cover images, filter state |
| /gallery | gallery | Supabase signed media, lightbox, share status |
| /auth | auth | Supabase auth client, status message |
| /account | member account | Supabase auth, gallery submissions, social handoff, status messages |
| /gallery-submit | gallery submit | Supabase storage upload, status message |
| /leader-dashboard | moderation | Supabase moderation queues, status messages |
| /spotify | Spotify | Spotify iframe embeds |
| /spotlight | spotlight | Supabase public spotlight endpoint |
| /games/mochi-pets | Mochi Pets | static project-status content |
| /tome | Tome | static conduct content |

## Live Header Sweep

| Route | Status | CSP | Report-only | Unsafe-inline |
| --- | ---: | --- | --- | --- |
| skipped | run with --live to check production headers | n/a | n/a | n/a |

## Next Steps

- Keep React inline style props at zero before any style-src unsafe-inline removal.
- Run a Vercel Preview browser pass before removing style-src unsafe-inline because framework-managed image/route helpers can still emit runtime style attributes.
- Keep Spotify iframe routes in the browser route sweep.
- Verify Supabase auth/storage, Discord handoff links, Vercel Analytics, and Speed Insights before tightening CSP.
- Treat Next.js nonce-based CSP as a separate compatibility PR because nonce middleware makes pages dynamically rendered instead of static/prerendered.
- Remove script-src unsafe-inline only after choosing a Next-compatible nonce or SRI path and proving no analytics, auth, or embed regressions.

## Warnings

- https://schema.org appears in app source but is not currently allowed by CSP; confirm it is not runtime-loaded before tightening.
- https://www.instagram.com appears in app source but is not currently allowed by CSP; confirm it is not runtime-loaded before tightening.

## Failures

- None
