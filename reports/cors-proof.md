# Mochirii CORS Proof

Generated: 2026-07-06T09:20:45.038Z

This file is intentionally no-secret. It records current website CORS behavior and static handoff evidence only; it does not approve or perform header narrowing.

## Result

- OK: yes
- Base URL: https://mochirii.com
- Expected CORS origin: https://mochirii.com
- Social host: https://social.mochirii.com
- Mochi Pets origin: https://mochi-pets-game.fly.dev

## Route Evidence

| Surface | Route | Status | Access-Control-Allow-Origin | Future CORS need |
| --- | --- | ---: | --- | --- |
| home | GET / | 200 | https://mochirii.com | none observed; same-origin page load |
| auth | GET /auth | 200 | https://mochirii.com | none observed; Supabase Auth is reached from client code, not by cross-origin reads of this route |
| account | GET /account | 200 | https://mochirii.com | none observed; browser access is same-origin |
| social | GET /social | 200 | https://mochirii.com | none observed; handoff is navigation to social.mochirii.com |
| oauth-consent | GET /oauth/consent | 200 | https://mochirii.com | none observed; Pixelfed/Supabase reach this through browser navigation |
| oauth-decision | POST /api/oauth/decision | 401 | https://mochirii.com | possible future scoped candidate only if cross-origin browser callers are introduced |
| mochi-pets | GET /games/mochi-pets | 200 | https://mochirii.com | none observed; iframe uses frame-src and postMessage origin checks instead of CORS |
| favicon | GET /favicon.ico | 200 | https://mochirii.com | none observed; static assets do not need CORS for the current first-party flows |

## Static Handoff Evidence

| Check | File | OK | Claim |
| --- | --- | --- | --- |
| next-global-cors | apps/web/next.config.ts | yes | Current Next.js headers apply the configured Access-Control-Allow-Origin value globally. |
| oauth-consent-page | apps/web/app/oauth/consent/page.tsx | yes | OAuth consent is a noindex website page used for browser authorization review. |
| oauth-decision-api | apps/web/app/api/oauth/decision/route.ts | yes | The OAuth decision endpoint is a POST-only same-origin API that forwards the consent decision to Supabase. |
| pixelfed-first-login | docs/pixelfed-first-login-testing.md | yes | Pixelfed first-login docs route the browser through the consent page and same-origin decision API. |
| mochi-pets-postmessage | apps/web/components/mochi-pets/MochiPetsAlphaClient.tsx | yes | Mochi Pets uses an iframe plus strict postMessage origin checks, not permissive CORS. |

## Future Scope Recommendation

- Current global header source: apps/web/next.config.ts source /(.*)
- Current required-route global header observed: yes
- Smallest future candidate: /api/:path* is the narrowest candidate if future browser evidence proves any cross-origin JSON route needs CORS; current OAuth, social handoff, and Mochi Pets evidence does not prove public pages or static assets need it.
- Guardrail: Do not narrow the global header until OAuth consent approve/deny, Pixelfed OIDC return, and Mochi Pets iframe/postMessage are browser-tested on a Vercel preview.

## Warnings

- None

## Failures

- None
