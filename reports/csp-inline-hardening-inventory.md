# CSP Inline Hardening Inventory

Generated: 2026-07-30T02:26:13.878Z

This file is intentionally no-secret. It inventories the current CSP and inline-sensitive production app source before any future removal of `unsafe-inline`.
Every non-test external origin/file pair and every non-literal runtime load must match an exact reviewed contract. This avoids relying on URL declarations and browser sinks appearing on the same source line.

## Result

- OK: yes
- Base URL: https://mochirii.com
- CSP enforced in Next config: yes
- Report-only CSP in Next config: no
- Unsafe-inline directives: script-src, style-src
- Unsafe-eval directives: none
- Scanned source files: 285
- Reviewed inline-style props: 8
- Unreviewed inline-style props: 0
- Reviewed non-literal runtime loads: 4
- Unreviewed non-literal runtime loads: 0

The reviewed inline-style count is intentionally nonzero. These controlled component styles remain documented until a separately browser-verified CSP reduction removes or replaces them; any new unreviewed inline script or style fails this check.

## Policy Contexts

| Context | Source | Unsafe-inline | Unsafe-eval |
| --- | --- | --- | --- |
| default | apps/web/next.config.ts#contentSecurityPolicy | script-src, style-src | none |
| auth | apps/web/next.config.ts#authContentSecurityPolicy | script-src, style-src | none |
| spinner | apps/web/next.config.ts#spinnerContentSecurityPolicy | script-src, style-src | none |
| protected | apps/web/lib/security/protected-csp.ts#protectedPageContentSecurityPolicy | style-src-attr | none |

## Directives

| Context | Directive | Sources |
| --- | --- | --- |
| default | default-src | 'self' |
| default | base-uri | 'self' |
| default | object-src | 'none' |
| default | frame-ancestors | 'none' |
| default | form-action | 'self' |
| default | script-src | 'self' 'unsafe-inline' |
| default | style-src | 'self' 'unsafe-inline' |
| default | img-src | 'self' data: blob: https://*.supabase.co https://cdn.discordapp.com https://media.discordapp.net https://i.scdn.co https://*.scdn.co |
| default | font-src | 'self' data: |
| default | media-src | 'self' data: blob: |
| default | frame-src | 'self' https://discord.com https://open.spotify.com |
| default | connect-src | 'self' https://*.supabase.co wss://*.supabase.co https://discord.com https://cdn.discordapp.com https://vitals.vercel-insights.com |
| default | worker-src | 'self' blob: |
| default | upgrade-insecure-requests |  |
| auth | default-src | 'self' |
| auth | base-uri | 'self' |
| auth | object-src | 'none' |
| auth | frame-ancestors | 'none' |
| auth | form-action | 'self' |
| auth | script-src | 'self' 'unsafe-inline' https://challenges.cloudflare.com |
| auth | style-src | 'self' 'unsafe-inline' |
| auth | img-src | 'self' data: blob: https://*.supabase.co https://cdn.discordapp.com https://media.discordapp.net https://i.scdn.co https://*.scdn.co |
| auth | font-src | 'self' data: |
| auth | media-src | 'self' data: blob: |
| auth | frame-src | 'self' https://discord.com https://open.spotify.com https://challenges.cloudflare.com |
| auth | connect-src | 'self' https://*.supabase.co wss://*.supabase.co https://discord.com https://cdn.discordapp.com https://vitals.vercel-insights.com |
| auth | worker-src | 'self' blob: |
| auth | upgrade-insecure-requests |  |
| spinner | default-src | 'self' |
| spinner | base-uri | 'self' |
| spinner | object-src | 'none' |
| spinner | frame-ancestors | 'none' |
| spinner | form-action | 'self' |
| spinner | script-src | 'self' 'unsafe-inline' |
| spinner | style-src | 'self' 'unsafe-inline' |
| spinner | img-src | 'self' data: blob: |
| spinner | font-src | 'self' data: |
| spinner | media-src | 'self' data: blob: |
| spinner | connect-src | 'self' |
| spinner | worker-src | 'self' blob: |
| spinner | upgrade-insecure-requests |  |
| protected | default-src | 'self' |
| protected | base-uri | 'self' |
| protected | object-src | 'none' |
| protected | frame-ancestors | 'none' |
| protected | form-action | 'self' |
| protected | script-src | 'self' 'nonce-${nonce}' 'strict-dynamic' |
| protected | style-src | 'self' 'nonce-${nonce}' |
| protected | style-src-attr | 'unsafe-inline' |
| protected | img-src | 'self' data: blob: https://*.supabase.co https://cdn.discordapp.com https://media.discordapp.net |
| protected | font-src | 'self' data: |
| protected | media-src | 'self' data: blob: |
| protected | connect-src | 'self' https://*.supabase.co wss://*.supabase.co https://discord.com https://cdn.discordapp.com https://vitals.vercel-insights.com |
| protected | worker-src | 'self' blob: |
| protected | upgrade-insecure-requests |  |

## Inline-Sensitive Source Inventory

| Pattern | Severity | Count | Reviewed | Unreviewed | Files |
| --- | --- | ---: | ---: | ---: | --- |
| inlineStyleProp | block-unless-reviewed | 8 | 8 | 0 | apps/web/components/spinner/RaffleSpinner.tsx (2)<br>apps/web/components/spinner/ViewerRaffleSpinner.tsx (2)<br>apps/web/app/spinner/not-found.tsx (1)<br>apps/web/components/public-pages/common.tsx (1)<br>apps/web/components/public-pages/RecruitmentAudioPlayer.tsx (1)<br>apps/web/components/ResponsiveGalleryMedia.tsx (1) |
| iframeElement | block-unless-reviewed | 2 | 2 | 0 | apps/web/components/public-pages/DiscordServerPreview.tsx (1)<br>apps/web/components/public-pages/SpotifyBrowser.tsx (1) |
| scriptElement | block-unless-reviewed | 1 | 1 | 0 | apps/web/app/page.tsx (1) |
| dynamicScriptElement | block-unless-reviewed | 1 | 1 | 0 | apps/web/components/member-workflow/AuthCaptcha.tsx (1) |
| styleElement | block-unless-reviewed | 1 | 1 | 0 | apps/web/components/public-pages/GalleryBrowser.tsx (1) |
| dynamicStyleElement | block-unless-reviewed | 0 | 0 | 0 | none |
| nextScriptImport | block-unless-reviewed | 0 | 0 | 0 | none |
| dangerouslySetInnerHTML | block-unless-reviewed | 1 | 1 | 0 | apps/web/app/page.tsx (1) |
| srcDoc | block | 0 | 0 | 0 | none |
| evalCall | block | 0 | 0 | 0 | none |
| newFunction | block | 0 | 0 | 0 | none |

## External Reference Classification

| Category | Unique origins or contracts | Meaning |
| --- | ---: | --- |
| runtime resources | 3 | Validated against the effective route policy |
| navigation and data | 17 | Exact reviewed origin/file contracts for ordinary hyperlinks, redirect targets, placeholders, metadata identifiers, or validated stored values |
| test fixtures | 58 | Test-only origins excluded from runtime CSP analysis |
| policy declarations | 5 | Exact reviewed origins declared by a CSP helper, not source-triggered requests |
| unreviewed external references | 0 | Fail-closed until assigned an exact origin/file contract |

Full navigation/data, test-fixture, and policy-declaration origin/file lists remain in the JSON inventory. New non-test origin/file pairs fail until reviewed; test-only URLs remain separately classified.

## Runtime Resource Contracts

| Origin | Routes | Policy context | Required directives | Allowed directives | Runtime use |
| --- | --- | --- | --- | --- | --- |
| https://challenges.cloudflare.com | /auth | auth | script-src, frame-src | script-src, frame-src | Turnstile API script and its provider-injected challenge frame |
| https://discord.com | /join | default | frame-src | frame-src | user-activated server-preview iframe |
| https://open.spotify.com | /spotify | default | frame-src | frame-src | deferred playlist and media iframe |

## Browser Route Matrix

| Route | Surface | Policy context | CSP-sensitive features |
| --- | --- | --- | --- |
| / | home shell | default | Vercel analytics, Speed Insights, gallery media |
| /join | Discord funnel | default | Discord link, optional Discord iframe |
| /events | events | default | event cover images, filter state |
| /gallery | gallery | default | Supabase signed media, lightbox, share status |
| /auth | auth | auth | Supabase auth client, Cloudflare Turnstile script and frame |
| /account | member account | default | Supabase auth, gallery submissions, social handoff, status messages |
| /gallery-submit | gallery submit | default | Supabase storage upload, status message |
| /leader-dashboard | moderation | protected | Supabase moderation queues, status messages |
| /oauth/consent | OAuth consent | protected | server-verified authorization, status messages |
| /raffle/claim | raffle claim | protected | server-verified winner claim |
| /leader-dashboard/raffle | raffle administration | protected | server-verified moderator controls |
| /spinner | private spinner | spinner | same-origin live spinner resources |
| /spotify | Spotify | default | Spotify iframe embeds |
| /spotlight | spotlight | default | Supabase public spotlight endpoint |
| /games/mochi-pets | Mochi Pets | default | same-origin tester form, disconnected waiting room |
| /tome | Tome | default | static conduct content |

## Live Header Sweep

| Route | Status | CSP | Report-only | Unsafe-inline |
| --- | ---: | --- | --- | --- |
| skipped | run with --live to check production headers | n/a | n/a | n/a |

## Next Steps

- Keep the reviewed inline-style allowlist exact; remove or redesign each controlled runtime style before tightening style-src or style-src-attr.
- Run a Vercel Preview browser pass before removing style-src unsafe-inline because framework-managed image/route helpers can still emit runtime style attributes.
- Keep auth Turnstile, Discord preview, and Spotify iframe routes in the browser route sweep.
- Verify Supabase auth/storage, Vercel Analytics, and Speed Insights before tightening CSP.
- Keep nonce-based strict script CSP on the already-dynamic auth routes and include them in every browser release sweep.
- Keep public routes static while Turbopack lacks stable hash-based SRI; reconsider global script-src unsafe-inline only when a cache-compatible stable path exists.

## Warnings

- None

## Failures

- None
