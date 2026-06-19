# Mochi Social Visual Polish

This brief guides the Mochirii side of the Alpha Preview Ready visual pass. It is limited to the website doorway and unlocked game shell. The game runtime, town art, HUD, runtime manifest, and game asset ledger remain in the separate Mochi Social game repo.

## Source Basis

- Codex best practices and AGENTS.md guidance: https://developers.openai.com/codex/learn/best-practices and https://developers.openai.com/codex/guides/agents-md
- Vercel environments and environment variables: https://vercel.com/docs/deployments/environments and https://vercel.com/docs/environment-variables
- Vercel Deployment Protection: https://vercel.com/docs/deployment-protection
- Supabase Edge secrets and Auth user validation: https://supabase.com/docs/guides/functions/secrets and https://supabase.com/docs/reference/javascript/auth-getuser
- Discord OAuth2: https://docs.discord.com/developers/topics/oauth2
- Enjin Platform, Fuel Tanks, and transaction state/finality arguments: https://docs.enjin.io/enjin-platform, https://docs.enjin.io/guides/platform/managing-users/using-fuel-tanks, and https://docs.enjin.io/api-reference/important-arguments
- WCAG 2.2 and sign-in form guidance: https://www.w3.org/WAI/WCAG22/quickref/ and https://web.dev/articles/sign-in-form-best-practices
- Game Accessibility Guidelines: https://gameaccessibilityguidelines.com/full-list/

## Design Target

- Theme: Cozy Wushu arrival gate.
- Audience: approved Mochirii guild testers, not operators or developers.
- Stop point: Alpha Preview Ready visual polish, not production launch.
- Primary state: tester-password mode.
- Secondary state: strict Supabase/Discord allowlist mode remains supported.
- Chain state: Enjin Canary `configured-preview-stub`, no real value, fixed-price only. Keep this visible as preview safety context, not as the page's main story.
- Art relationship: the website gate image and the game runtime art should feel like the same Mochirii world, but they remain separate asset surfaces. The website may use high-fidelity decorative WebP art; the game repo owns RPGJS runtime sprites, maps, HUD, and its own asset ledger.
- Game-art style reference: high-fidelity Cozy Wushu painterly/pixel hybrid, dusk lantern lighting, jade/red timber palette, readable silhouettes, and strong interaction cues. Do not make website docs the source of truth for game runtime dimensions or Tiled/RPGJS contracts.

## Locked Page

- Present the locked state as a tester invitation into a cozy Mochirii guild playtest, not a status dashboard.
- Use the tester-facing copy:
  - Eyebrow: `Closed Mochirii Playtest`
  - Headline: `Mochi Social`
  - Lead: `A cozy Wushu RPG town where approved testers can raise Mochi Spirits, meet guild friends, and try early social trading.`
  - Form heading: `Enter the town`
  - Button: `Unlock playtest`
  - Invalid password: `That password did not work. Check the tester invite and try again.`
  - Missing config: `This playtest gate is not ready yet. Please check back after the next tester notice.`
- Keep the iframe absent until the tester gate is unlocked.
- Keep tester password material and any derived verifier values server-only.
- Keep the HttpOnly, route-scoped cookie behavior in the route handlers.
- Use a password input with `id="current-password"`, `name="testerPassword"`, and `autocomplete="current-password"`.
- Place invalid-password and missing-config errors near the field with `role="alert"`.
- Lead with player-facing badges: closed alpha, no purchases, test coins only, and progress may reset.
- Replace `Preview boundaries` with tester sections:
  - `What you can test`: raise Mochi Spirits, explore the town, try local chat/emotes, and test market board/direct trade.
  - `Your playtest mission`: attune Lirabao, care for a Mochi Spirit, wave/chat, inspect the market board, and send feedback.
  - `Good to know`: no real money, no permanent blockchain value, desktop recommended, and Vercel may show a preview access screen first.
- Keep Enjin Canary, `configured-preview-stub`, and Vercel protection language in a small preview-safety note.

## Gate Image

- Source asset: `assets/img/mochi-social/gate-arrival.webp`
- Mirrored public asset: `apps/web/public/assets/img/mochi-social/gate-arrival.webp`
- Role: decorative left-panel Wushu arrival image for the tester-password gate.
- Alt behavior: render with `alt=""` and `aria-hidden="true"` because nearby page copy carries the meaning.
- Generation mode: built-in image generation, original project art, optimized locally to WebP.
- Prompt:

```text
High fidelity hyper realistic cinematic Wushu mountain gate at dusk, same composition as the current tester gate template: symmetrical red timber roof, two warm paper lanterns, golden stone path leading toward a cozy hidden town, bamboo and misty mountain background, refined guild sanctuary atmosphere, warm jade and lantern palette, no text, no logos, no people, no UI, vertical card composition.
```

## Unlocked Page

- Preserve the iframe embed and postMessage bridge contract.
- Keep a visible bridge status pill.
- Keep no-real-value and configured-preview-stub language visible as small preview safety copy while the game is loaded.
- Use player-facing badges for the main unlocked shell: local town, Mochi Spirit care, test coins only, market board preview, and no real value.
- Preserve the lock-page form and route.
- Do not expose access tokens, refresh tokens, cookies, password hashes, or provider secrets in the client.

## Accessibility

- Text must remain readable over decorative art.
- Focus states must be visible for fields, links, and buttons.
- Error, auth, chain, market, and bridge states must not rely on color alone.
- Layout must not overlap at common laptop widths or mobile fallback widths.

## Access Boundaries

- Vercel Deployment Protection or automation bypass is hosting-level preview access.
- The Mochirii tester-password gate is player-level access for Alpha Preview Ready.
- Supabase/Discord allowlist is the strict auth/admin mode.
- Do not expose service-role keys, secret keys, Discord client secrets, Discord bot tokens, Enjin tokens, Wallet Daemon seeds/passphrases, refresh tokens, or tester password material in browser code.
- Vercel advanced protection and provider add-ons can add cost. Do not enable, deploy, redeploy, or mutate provider settings during visual polish without fresh action-specific approval.

## Verification

Run the local checks after website changes:

```powershell
npm run check:mochi-social-tester-password-gate
npm run check:mochi-social-alpha
npm run check:assets
npm run check
cd apps/web
npm run lint
npm run build
```

Hosted preview verification, provider setting changes, redeploys, and hosted browser gates require fresh action-specific approval before use when they can create real provider cost or mutate external state. Public-repo commits and pushes are allowed under the current user policy; verify PR/CI results afterward.
