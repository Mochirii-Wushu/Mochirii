# Lighthouse Route Matrix

Generated: 2026-06-13T01:44:14.948Z

This no-secret report defines the optional manual Lighthouse audit matrix for the live Vercel/Next production domain. It keeps route coverage explicit while avoiding required score gates in ordinary PR validation.

## Summary

- Status: PASS
- Routes covered: 11
- Lighthouse audit targets: 13
- Required backlog routes: 11
- Failures: 0
- Live mutation: none

## Source Basis

| Source | Why It Matters |
| --- | --- |
| [Chrome Lighthouse](https://developer.chrome.com/docs/lighthouse/overview) | Lighthouse audits page quality across performance, accessibility, SEO, and related categories. |
| [web.dev Web Vitals](https://web.dev/articles/vitals) | Core Web Vitals keep LCP, CLS, and INP visible as current user-experience signals. |
| [web.dev Lighthouse CI](https://web.dev/articles/lighthouse-ci) | Repeatable Lighthouse evidence is useful for tracking changes over time without making this a required score gate. |
| [GitHub Actions artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data) | Manual workflow artifacts keep bulky Lighthouse HTML/JSON output out of Git. |

## Audit Targets

| Output ID | Route | Profile | Workflow |
| --- | --- | --- | --- |
| home-mobile | / | mobile | public landing and guild identity |
| home-desktop | / | desktop | public landing and guild identity |
| join-mobile | /join | mobile | website to Discord funnel |
| events-mobile | /events | mobile | community heartbeat |
| gallery-mobile | /gallery | mobile | public gallery discovery |
| gallery-desktop | /gallery | desktop | public gallery discovery |
| recruitment-mobile | /recruitment | mobile | public recruiting context |
| auth-mobile | /auth | mobile | Discord login entry |
| account-mobile | /account | mobile | signed-out and member account boundary |
| members-mobile | /members | mobile | members-only directory boundary |
| gallery-submit-mobile | /gallery-submit | mobile | member upload gate |
| leader-dashboard-mobile | /leader-dashboard | mobile | moderator workflow gate |
| mochi-social-mobile | /games/mochi-social | mobile | tester game doorway |

## Findings

| Status | Area | Check | Detail |
| --- | --- | --- | --- |
| PASS | static wiring | package script | includes "check:lighthouse-route-matrix": "node scripts/check-lighthouse-route-matrix.mjs" |
| PASS | static wiring | check-all | includes ["check:lighthouse-route-matrix", ["node", "scripts/check-lighthouse-route-matrix.mjs"]] |
| PASS | static wiring | manual workflow runner | includes node scripts/run-lighthouse-route-matrix.mjs |
| PASS | static wiring | manual workflow base URL | includes --base-url=https://mochirii.com |
| PASS | static wiring | manual workflow artifact | includes path: reports/lighthouse/ |
| PASS | static wiring | deployment docs | includes npm run check:lighthouse-route-matrix -- --write |
| PASS | static wiring | live-state docs | includes npm run check:lighthouse-route-matrix |
| PASS | route coverage | / | Home is included in the Lighthouse route matrix. |
| PASS | route coverage | /join | Join is included in the Lighthouse route matrix. |
| PASS | route coverage | /events | Events is included in the Lighthouse route matrix. |
| PASS | route coverage | /gallery | Gallery is included in the Lighthouse route matrix. |
| PASS | route coverage | /recruitment | Recruitment is included in the Lighthouse route matrix. |
| PASS | route coverage | /auth | Auth is included in the Lighthouse route matrix. |
| PASS | route coverage | /account | Account is included in the Lighthouse route matrix. |
| PASS | route coverage | /members | Members is included in the Lighthouse route matrix. |
| PASS | route coverage | /gallery-submit | Gallery Submit is included in the Lighthouse route matrix. |
| PASS | route coverage | /leader-dashboard | Leader Dashboard is included in the Lighthouse route matrix. |
| PASS | route coverage | /games/mochi-social | Mochi Social is included in the Lighthouse route matrix. |
| PASS | route ids | home | route id is URL/file safe. |
| PASS | route profiles | home:mobile | supported profile. |
| PASS | route profiles | home:desktop | supported profile. |
| PASS | route ids | join | route id is URL/file safe. |
| PASS | route profiles | join:mobile | supported profile. |
| PASS | route ids | events | route id is URL/file safe. |
| PASS | route profiles | events:mobile | supported profile. |
| PASS | route ids | gallery | route id is URL/file safe. |
| PASS | route profiles | gallery:mobile | supported profile. |
| PASS | route profiles | gallery:desktop | supported profile. |
| PASS | route ids | recruitment | route id is URL/file safe. |
| PASS | route profiles | recruitment:mobile | supported profile. |
| PASS | route ids | auth | route id is URL/file safe. |
| PASS | route profiles | auth:mobile | supported profile. |
| PASS | route ids | account | route id is URL/file safe. |
| PASS | route profiles | account:mobile | supported profile. |
| PASS | route ids | members | route id is URL/file safe. |
| PASS | route profiles | members:mobile | supported profile. |
| PASS | route ids | gallery-submit | route id is URL/file safe. |
| PASS | route profiles | gallery-submit:mobile | supported profile. |
| PASS | route ids | leader-dashboard | route id is URL/file safe. |
| PASS | route profiles | leader-dashboard:mobile | supported profile. |
| PASS | route ids | mochi-social | route id is URL/file safe. |
| PASS | route profiles | mochi-social:mobile | supported profile. |
| PASS | audit target count | targets | 13 Lighthouse audits are configured. |

## Operator Notes

- Run the GitHub Actions workflow **Manual Lighthouse audit** when production evidence is needed.
- The workflow uploads raw Lighthouse HTML/JSON artifacts; do not commit those bulky generated artifacts.
- This route matrix is evidence only. It does not create required Lighthouse score gates.
