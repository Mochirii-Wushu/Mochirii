# Rollback Surface Drift Audit

Generated: 2026-06-13T01:29:35.314Z

This no-secret audit verifies that the retained root static GitHub Pages surface is still coherent as rollback/reference material while the live production app remains the Vercel/Next.js app in `apps/web`.

## Summary

- Status: PASS
- Passed checks: 125
- Failed checks: 0
- Legacy root pages covered: 17
- Current decision: retain root static rollback/reference material.
- Retirement boundary: delete, archive, or GitHub Pages-setting changes require a separate approved stabilization task.

## Findings

| Status | Area | Check | Detail |
| --- | --- | --- | --- |
| PASS | rollback files | CNAME | present |
| PASS | rollback files | styles.css | present |
| PASS | rollback files | site.js | present |
| PASS | rollback files | utils.js | present |
| PASS | rollback files | supabase.js | present |
| PASS | rollback files | header.html | present |
| PASS | rollback files | footer.html | present |
| PASS | rollback files | robots.txt | present |
| PASS | rollback files | sitemap.xml | present |
| PASS | rollback files | favicon.ico | present |
| PASS | rollback files | .well-known/security.txt | present |
| PASS | legacy pages | index.html | present |
| PASS | legacy scripts | home.js | present |
| PASS | legacy data | data/home.json | present |
| PASS | legacy page wiring | index.html | loads shared rollback scripts |
| PASS | legacy page wiring | index.html -> home.js | loads matching page script |
| PASS | legacy pages | join.html | present |
| PASS | legacy scripts | join.js | present |
| PASS | legacy data | data/join.json | present |
| PASS | legacy page wiring | join.html | loads shared rollback scripts |
| PASS | legacy page wiring | join.html -> join.js | loads matching page script |
| PASS | legacy pages | gallery.html | present |
| PASS | legacy scripts | gallery.js | present |
| PASS | legacy data | data/gallery.json | present |
| PASS | legacy page wiring | gallery.html | loads shared rollback scripts |
| PASS | legacy page wiring | gallery.html -> gallery.js | loads matching page script |
| PASS | legacy pages | leaders.html | present |
| PASS | legacy scripts | leaders.js | present |
| PASS | legacy data | data/leaders.json | present |
| PASS | legacy page wiring | leaders.html | loads shared rollback scripts |
| PASS | legacy page wiring | leaders.html -> leaders.js | loads matching page script |
| PASS | legacy pages | ranks.html | present |
| PASS | legacy scripts | ranks.js | present |
| PASS | legacy data | data/ranks.json | present |
| PASS | legacy page wiring | ranks.html | loads shared rollback scripts |
| PASS | legacy page wiring | ranks.html -> ranks.js | loads matching page script |
| PASS | legacy pages | codex.html | present |
| PASS | legacy scripts | codex.js | present |
| PASS | legacy data | data/codex.json | present |
| PASS | legacy page wiring | codex.html | loads shared rollback scripts |
| PASS | legacy page wiring | codex.html -> codex.js | loads matching page script |
| PASS | legacy pages | events.html | present |
| PASS | legacy scripts | events.js | present |
| PASS | legacy data | data/events.json | present |
| PASS | legacy page wiring | events.html | loads shared rollback scripts |
| PASS | legacy page wiring | events.html -> events.js | loads matching page script |
| PASS | legacy pages | announcements.html | present |
| PASS | legacy scripts | announcements.js | present |
| PASS | legacy data | data/announcements.json | present |
| PASS | legacy page wiring | announcements.html | loads shared rollback scripts |
| PASS | legacy page wiring | announcements.html -> announcements.js | loads matching page script |
| PASS | legacy pages | raffles.html | present |
| PASS | legacy scripts | raffles.js | present |
| PASS | legacy data | data/raffles.json | present |
| PASS | legacy page wiring | raffles.html | loads shared rollback scripts |
| PASS | legacy page wiring | raffles.html -> raffles.js | loads matching page script |
| PASS | legacy pages | recruitment.html | present |
| PASS | legacy scripts | recruitment.js | present |
| PASS | legacy data | data/recruitment.json | present |
| PASS | legacy page wiring | recruitment.html | loads shared rollback scripts |
| PASS | legacy page wiring | recruitment.html -> recruitment.js | loads matching page script |
| PASS | legacy pages | auth.html | present |
| PASS | legacy scripts | auth.js | present |
| PASS | legacy page wiring | auth.html | loads shared rollback scripts |
| PASS | legacy page wiring | auth.html -> auth.js | loads matching page script |
| PASS | legacy pages | account.html | present |
| PASS | legacy scripts | account.js | present |
| PASS | legacy page wiring | account.html | loads shared rollback scripts |
| PASS | legacy page wiring | account.html -> account.js | loads matching page script |
| PASS | legacy pages | gallery-submit.html | present |
| PASS | legacy scripts | gallery-submit.js | present |
| PASS | legacy page wiring | gallery-submit.html | loads shared rollback scripts |
| PASS | legacy page wiring | gallery-submit.html -> gallery-submit.js | loads matching page script |
| PASS | legacy pages | spotify.html | present |
| PASS | legacy scripts | spotify.js | present |
| PASS | legacy data | data/spotify.json | present |
| PASS | legacy page wiring | spotify.html | loads shared rollback scripts |
| PASS | legacy page wiring | spotify.html -> spotify.js | loads matching page script |
| PASS | legacy pages | spotlight.html | present |
| PASS | legacy scripts | spotlight.js | present |
| PASS | legacy data | data/spotlight.json | present |
| PASS | legacy page wiring | spotlight.html | loads shared rollback scripts |
| PASS | legacy page wiring | spotlight.html -> spotlight.js | loads matching page script |
| PASS | legacy pages | twills.html | present |
| PASS | legacy scripts | twills.js | present |
| PASS | legacy data | data/twills.json | present |
| PASS | legacy page wiring | twills.html | loads shared rollback scripts |
| PASS | legacy page wiring | twills.html -> twills.js | loads matching page script |
| PASS | legacy pages | leader-dashboard.html | present |
| PASS | legacy scripts | leader-dashboard.js | present |
| PASS | legacy page wiring | leader-dashboard.html | loads shared rollback scripts |
| PASS | legacy page wiring | leader-dashboard.html -> leader-dashboard.js | loads matching page script |
| PASS | legacy redirects | /index.html -> / | configured in apps/web/next.config.ts |
| PASS | legacy redirects | /join.html -> /join | configured in apps/web/next.config.ts |
| PASS | legacy redirects | /gallery.html -> /gallery | configured in apps/web/next.config.ts |
| PASS | legacy redirects | /leaders.html -> /leaders | configured in apps/web/next.config.ts |
| PASS | legacy redirects | /ranks.html -> /ranks | configured in apps/web/next.config.ts |
| PASS | legacy redirects | /codex.html -> /codex | configured in apps/web/next.config.ts |
| PASS | legacy redirects | /events.html -> /events | configured in apps/web/next.config.ts |
| PASS | legacy redirects | /announcements.html -> /announcements | configured in apps/web/next.config.ts |
| PASS | legacy redirects | /raffles.html -> /raffles | configured in apps/web/next.config.ts |
| PASS | legacy redirects | /recruitment.html -> /recruitment | configured in apps/web/next.config.ts |
| PASS | legacy redirects | /auth.html -> /auth | configured in apps/web/next.config.ts |
| PASS | legacy redirects | /account.html -> /account | configured in apps/web/next.config.ts |
| PASS | legacy redirects | /gallery-submit.html -> /gallery-submit | configured in apps/web/next.config.ts |
| PASS | legacy redirects | /spotify.html -> /spotify | configured in apps/web/next.config.ts |
| PASS | legacy redirects | /spotlight.html -> /spotlight | configured in apps/web/next.config.ts |
| PASS | legacy redirects | /twills.html -> /twills | configured in apps/web/next.config.ts |
| PASS | legacy redirects | /leader-dashboard.html -> /leader-dashboard | configured in apps/web/next.config.ts |
| PASS | public sync | assets -> apps/web/public/assets | 229 files match |
| PASS | public sync | data -> apps/web/public/data | 14 files match |
| PASS | security.txt | RFC 9116 mirror | root and Next public copies match |
| PASS | docs | README.md | README.md names the retained root static surface |
| PASS | docs | README.md | README.md names rollback/reference status |
| PASS | docs | apps/web/README.md | apps/web/README.md names the retained root static surface |
| PASS | docs | apps/web/README.md | apps/web/README.md names rollback/reference status |
| PASS | docs | docs/deployment.md | docs/deployment.md names the retained root static surface |
| PASS | docs | docs/deployment.md | docs/deployment.md names rollback/reference status |
| PASS | docs | docs/current-live-state.md | docs/current-live-state.md names the retained root static surface |
| PASS | docs | docs/current-live-state.md | docs/current-live-state.md names rollback/reference status |
| PASS | docs | docs/dns-cutover-readiness-and-rollback.md | docs/dns-cutover-readiness-and-rollback.md names the retained root static surface |
| PASS | docs | docs/dns-cutover-readiness-and-rollback.md | docs/dns-cutover-readiness-and-rollback.md names rollback/reference status |
| PASS | docs | docs/deployment.md | deployment source of truth keeps retirement approval boundary |
| PASS | docs | docs/current-live-state.md | live-state index keeps retirement boundary |
| PASS | docs | docs/dns-cutover-readiness-and-rollback.md | rollback runbook marks removal as approval-gated |

## Operator Notes

- This report does not perform provider mutations.
- It does not authorize DNS, Vercel, Supabase, Discord, GitHub Pages, or data changes.
- If this audit fails because root `assets/` or `data/` drifted from `apps/web/public/`, run `npm run sync:next-public` and rerun the audit.
- If a root static page is intentionally retired later, update the root files, `apps/web/next.config.ts` legacy redirects, deployment docs, and this audit in the same scoped PR.
