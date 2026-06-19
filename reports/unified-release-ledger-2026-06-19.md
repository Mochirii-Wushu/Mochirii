# Unified Release Ledger - 2026-06-19

This no-secret ledger freezes the current release baseline for bringing Mochirii, Mochi Social, provider integrations, and the password-gated Shopify storefront up to date without rolling back live work.

## Baseline

- Mochirii production source: `Mochirii-Wushu/Mochirii`, branch `main`.
- Current `origin/main`: `22c88035c74b5dc4c697e09a0e363dbf2842416f`.
- Current Vercel production deployment: `mochirii-gywsxob6w-mochirii.vercel.app`, status `Ready`.
- Production aliases: `https://mochirii.com`, `https://www.mochirii.com`, `https://mochirii.vercel.app`.
- DNS readback: apex resolves to Vercel A records; `www.mochirii.com` is a CNAME to Vercel DNS.
- Primary checkout warning: `C:\Users\xtyty\Documents\Mochirii` is dirty and behind on `codex/reaper-modmail-audit`; do not use it as the release base.
- Clean release base used for this ledger: `C:\Users\xtyty\Documents\Mochirii-twills-avatar`.

## Provider Readback

- Vercel CLI `inspect https://mochirii.com --scope mochirii` returned production `Ready`.
- Supabase project ref remains `deyvmtncimmcinldjyqe`.
- Supabase CLI `functions list` timed out during this pass. Do not infer a failed deploy from that timeout; use Dashboard readback or retry once later before any function deploy.
- GitHub classic branch protection endpoint returned `Branch not protected`, matching the repo's ruleset-based release model. Verify rulesets in GitHub UI or a working rulesets API path before changing gate policy.
- Cloudflare/Vercel posture remains DNS-only for Vercel web records; do not proxy apex or `www` as part of this release ladder.
- Discord/Reaper provider mutations remain preview-first and owner-approved. This ledger does not approve `/sync-* apply`, command registration, token rotation, scheduled event mutation, or live reminder sends.

## Mochirii Open PR Queue

Do not merge these as a batch. Rebase or rebuild each against current `origin/main`, inspect for rollback risk, validate, preview, and merge one release packet at a time.

### First user-facing packets

- #320 draft, behind: `Add themed Recruitment audio player` (`codex/recruitment-custom-audio-player`).
- #306 draft, behind: `Improve Instagram manual sharing workflow` (`codex/instagram-manual-share-meta-diagnostic`).

### Provider/security/backend packets

- #301 ready, behind: `Clean up auth provider state` (`codex/auth-provider-state-cleanup`).
- #272 ready, dirty: `Add accessibility smoke and font CSP fix` (`codex/accessibility-basics-smoke`).
- #271 ready, behind: `Align CI with release ladder` (`codex/pr-ci-release-ladder`).
- #270 ready, dirty: `Document production review gate` (`codex/production-review-gate-evidence`).
- #279 draft, behind: `Add Supabase advisor lint cadence` (`codex/supabase-advisor-lint-cadence`).
- #274 draft, behind: `Add Supabase security definer audit` (`codex/supabase-security-definer-audit`).
- #290 draft, dirty: `Add Discord native safety audit` (`codex/discord-native-safety-audit`).

### Mochi Social packets

- #305 draft, behind: `Add Mochirii alpha progress Edge contract` (`codex/mochi-social-live-copy`).
- #292 ready, behind: `Add Mochi Social tester password local smoke` (`codex/mochi-social-alpha-rc`).
- #283 draft, dirty: `Polish Mochi Social tester journey` (`codex/mochi-social-tester-journey-clarity`).
- #280 draft, behind: `Add Mochi Social Fly evidence guard` (`codex/mochi-social-fly-evidence`).

Keep Mochi Social Alpha Preview boundaries intact: tester-password first, no-real-value, Enjin as `configured-preview-stub`, no mainnet, no funded-chain gate clearing, no dummy Enjin IDs, and no hosted paid/quota actions without action-time approval.

### Visual, QA, and process packets

- #291 draft, behind: `Add visual hierarchy text-fit audit`.
- #288 draft, behind: `Polish events community board`.
- #287 draft, dirty: `Polish gallery discovery search`.
- #286 draft, behind: `Add refinement merge queue snapshot`.
- #285 draft, behind: `Add route information architecture guard`.
- #284 draft, behind: `Add parallel agent merge coordination guard`.
- #282 draft, behind: `Add visual screenshot evidence matrix`.
- #281 draft, behind: `Add social preview QA matrix`.
- #278 draft, behind: `Add community health signal matrix`.
- #277 draft, behind: `Polish Join onboarding funnel`.
- #276 draft, dirty: `Add operator index audit`.
- #275 draft, behind: `Expand manual Lighthouse route matrix`.
- #273 draft, behind: `Add rollback surface drift audit`.

## Shopify Queue

- Theme repository: `C:\Users\xtyty\Documents\Shopify Store\Velesari-Holdings`.
- GitHub repository: `Anthyphera/Velesari-Holdings`.
- Deployable base branch: `shopify-theme`.
- Open PR: #44 draft, clean, `codex/product-label-artwork-system` into `shopify-theme`.
- Storefront stays password-gated.
- Product work must preserve Selfnamed source truth, 2.2x markup, launch-surface restrictions, lightweight wuxia/beauty placeholders, and no payment/activation actions without explicit approval.

## Release Ladder

1. Keep new feature work frozen while the queue is reconciled.
2. Merge this ledger first so every later packet can cite the current baseline.
3. Rebuild or rebase #320 and #306 against current `origin/main`, preserving the birthday splash refresh behavior and latest custom audio/card work.
4. Reconcile provider/security/backend packets with Supabase Preview, Vercel Preview, and no-secret evidence.
5. Reconcile Mochi Social PRs while preserving alpha preview boundaries.
6. Reconcile Shopify PR #44 against `shopify-theme`, validate Theme Check and product/source guardrails, and keep the storefront password-gated.
7. After each merge, wait for production readiness, smoke affected routes, update this ledger or `docs/current-live-state.md`, then proceed to the next packet.

## Required Validation

For Mochirii packets:

- `git diff --check`
- `npm run check`
- `npm run check:production`
- `npm run smoke:supabase-edge-functions`
- `cd apps/web && npm run lint && npm run build && npm audit --audit-level=moderate`

For Mochi Social packets, add the relevant alpha checks:

- `npm run check:mochi-social-alpha`
- `npm run check:mochi-social-bridge-state`
- `npm run check:mochi-social-edge-authority`
- `npm run check:mochi-social-report-hygiene`
- `npm run check:mochi-social-preview-ready`
- `npm run check:mochi-social-game-contract` when the game URL is available

For Shopify packets:

- JSON and section-schema parse checks
- route hardcode scan
- Selfnamed/source and 2.2x markup audit
- placeholder image audit
- `git diff --check`
- `bun x @shopify/cli@latest theme check`

## No-Rollback Checks

Reject or rebuild any branch that reverts:

- birthday splash refresh behavior;
- Recruitment custom audio player behavior once released;
- protected Home, Recruitment, Twills, and guild seal copy;
- event schedules, UTC+8 timing, or Discord event cover image paths;
- Supabase CORS/security posture, signed URL DTO privacy, or service-role-only boundaries;
- Discord command names, confirmation gates, or preview-first provider mutation rules;
- Mochi Social tester-password/no-real-value alpha posture;
- Shopify password gating, Selfnamed product truth, 2.2x markup, or launch restrictions.
