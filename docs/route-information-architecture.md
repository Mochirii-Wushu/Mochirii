# Route Information Architecture

This runbook keeps the Mochirii live-domain route map clear while the website, Supabase, Discord/Reaper, Mochi Social, Fly, and Enjin-adjacent workstreams continue in parallel. It is intentionally a contract and audit surface first; visual menu changes should happen in a later UI branch after overlapping PRs settle.

## Source Basis

- WCAG 2.2 navigation criteria: https://www.w3.org/TR/WCAG22/
- WAI Understanding 3.2.3 Consistent Navigation: https://www.w3.org/WAI/WCAG21/Understanding/consistent-navigation.html
- WAI Understanding 2.4.1 Bypass Blocks: https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks
- web.dev semantic navigation guidance: https://web.dev/learn/html/navigation
- web.dev headings and landmarks guidance: https://web.dev/articles/headings-and-landmarks
- U.S. Web Design System header guidance: https://designsystem.digital.gov/components/header/
- U.S. Web Design System in-page navigation guidance: https://designsystem.digital.gov/components/in-page-navigation/

## Route Groups

Keep the primary navigation task-oriented and guild-useful:

| Group | Purpose | Routes |
| --- | --- | --- |
| Guild | Repeated guild destinations members naturally revisit. | `/`, `/spotlight`, `/gallery`, `/members`, `/games/mochi-social` |
| Culture | Stable identity and conduct reference material. | `/join`, `/ranks`, `/leaders`, `/codex`, `/spotify` |
| Updates | Time-sensitive community activity and notices. | `/announcements`, `/events`, `/raffles` |
| Account and Tools | Auth-gated or utility workflows that should not dominate public browsing. | `/auth`, `/account`, `/gallery-submit`, `/leader-dashboard`, `/recruitment` |
| Contextual | Reachable from cards, profile links, or direct workflow context rather than top-level nav. | `/twills`, `/members/[slug]` |

Do not turn the site into a marketing funnel. The first-level route map should help a guild member answer: what is happening, where do I belong, what can I submit, what do leaders need to review, and where does Mochi Social alpha live?

## Navigation Rules

- Keep repeated header and footer navigation in a consistent relative order.
- Keep the skip link pointing to `#main` on every page route.
- Keep auth-gated links declared with `data-auth-signed-out`, `data-auth-signed-in`, or `data-auth-verified` so visibility stays explicit.
- Keep `/members`, `/members/[slug]`, `/account`, `/gallery-submit`, `/leader-dashboard`, `/auth`, and `/games/mochi-social` `noindex`.
- Mochirii owns the website tester doorway at `/games/mochi-social` only. RPGJS runtime, game art, HUD, maps, manifests, Fly runtime, and Enjin finality remain in the separate Mochi Social game repo.
- Keep Enjin visible as preview/no-real-value until funded-chain approval exists; route IA must not imply cENJ, Fuel Tank, Wallet Daemon, or finality readiness.
- Add any new route to the IA matrix before exposing it in header/footer navigation.

## Suggested Next UI Pass

When the open navigation-adjacent PRs are merged or rebased, use this sequence:

1. Preserve the current `Guild`, `Culture`, and `Updates` mental model.
2. Make account/tool links easier to scan for signed-in users without hiding public guild routes.
3. Keep member-only and moderator-only routes discoverable only after the relevant auth state.
4. Add route screenshots at 360, 390, 768, 1024, and 1440 before and after any menu layout change.
5. Verify keyboard tab order, Escape handling, focus return, mobile menu scroll lock, and active route state.

## Local Guard

Run this before publishing route, navigation, account, member, or Mochi Social doorway changes:

```powershell
npm run check:route-information-architecture -- --write
npm run check:route-information-architecture
```

The command writes `reports/route-information-architecture.json` and `reports/route-information-architecture.md`. Both reports are no-secret and provider-read-free.
