# Mochi Pets Visual Polish

This brief guides the Mochirii side of the Alpha Preview Ready visual pass. It is limited to the website doorway and unlocked game shell. The Unity runtime, shared room art, HUD, runtime manifest, and game assets remain in the separate Mochi Pets game repo.

## Source Basis

- Vercel environments and environment variables: https://vercel.com/docs/deployments/environments and https://vercel.com/docs/environment-variables
- Vercel Deployment Protection: https://vercel.com/docs/deployment-protection
- Supabase Edge secrets and Auth user validation: https://supabase.com/docs/guides/functions/secrets and https://supabase.com/docs/reference/javascript/auth-getuser
- Discord OAuth2: https://docs.discord.com/developers/topics/oauth2
- WCAG 2.2 and sign-in form guidance: https://www.w3.org/WAI/WCAG22/quickref/ and https://web.dev/articles/sign-in-form-best-practices
- Game Accessibility Guidelines: https://gameaccessibilityguidelines.com/full-list/

## Design Target

- Theme: Cozy Wushu arrival gate.
- Audience: approved Mochirii guild testers.
- Stop point: Alpha Preview Ready visual polish, not production launch.
- Primary state: tester-password mode.
- Secondary state: strict Supabase/Discord allowlist mode remains supported.
- Runtime state: Unity WebGL single shared room, shared Lirabao, curated character presets, and no real value. Keep future-chain labels out of player-facing copy.
- Art relationship: the website gate image and the game runtime art should feel like the same Mochirii world, but they remain separate asset surfaces. The website may use high-fidelity decorative WebP art; the game repo owns Unity 3D room assets, HUD, and runtime manifests.
- Game-art style reference: high-fidelity Cozy Wushu painterly/pixel hybrid, dusk lantern lighting, jade/red timber palette, readable silhouettes, and strong interaction cues. Do not make website docs the source of truth for Unity room dimensions, asset budgets, or runtime manifests.

## Locked Page

- Present the locked state as a tester invitation into a cozy Mochirii guild playtest, not a status dashboard.
- Use the tester-facing copy:
  - Eyebrow: `Closed Mochirii Playtest`
  - Headline: `Mochi Pets`
  - Lead: `A cozy 3D room where approved testers create a curated character, gather with guild friends, and meet the shared starter pet Lirabao.`
  - Form heading: `Enter Mochi Pets`
  - Button: `Unlock playtest`
  - Invalid password: `That password did not work. Check the tester invite and try again.`
  - Missing config: `This playtest gate is not ready yet. Please check back after the next tester notice.`
- Keep the iframe absent until the tester gate is unlocked.
- Keep tester password material and any derived verifier values server-only.
- Keep the HttpOnly, route-scoped cookie behavior in the route handlers.
- Use a password input with `id="current-password"`, `name="testerPassword"`, and `autocomplete="current-password"`.
- Place invalid-password and missing-config errors near the field with `role="alert"`.
- Lead with player-facing badges: shared guild room, Lirabao, member-saved play, tester password, and no real value.
- Replace `Preview boundaries` with tester sections:
  - `What you can test`: create a curated character preset, enter the Jade Lantern room, try local chat/emotes, and interact with shared Lirabao.
  - `Your playtest mission`: create a character, wave/chat, care for Lirabao, confirm shared state, and send feedback.
  - `Good to know`: no real money, no permanent item value, desktop recommended, member sign-in required for saved progress, and a hosting access screen may appear first.
- Keep preview-safety copy player-facing and brief.

## Gate Image

- Source asset: `assets/img/mochi-pets/gate-arrival.webp`
- Mirrored public asset: `apps/web/public/assets/img/mochi-pets/gate-arrival.webp`
- Role: decorative left-panel Wushu arrival image for the tester-password gate.
- Alt behavior: render with `alt=""` and `aria-hidden="true"` because nearby page copy carries the meaning.
- Generation mode: built-in image generation, original project art, optimized locally to WebP.
- Prompt:

```text
High fidelity hyper realistic cinematic Wushu mountain gate at dusk, same composition as the current tester gate template: symmetrical red timber roof, two warm paper lanterns, golden stone path leading toward a cozy lantern room, bamboo and misty mountain background, refined guild sanctuary atmosphere, warm jade and lantern palette, no text, no logos, no people, no UI, vertical card composition.
```

## Unlocked Page

- Preserve the iframe embed and postMessage bridge contract.
- Keep a visible bridge status pill.
- Keep no-real-value language visible as small preview safety copy while the game is loaded.
- Use player-facing badges for the main unlocked shell: Unity WebGL, single shared room, shared Lirabao, guest-only for password mode, and no real value.
- Preserve the lock-page form and route.
- Do not expose access tokens, refresh tokens, cookies, password hashes, or provider secrets in the client.

## Accessibility

- Text must remain readable over decorative art.
- Focus states must be visible for fields, links, and buttons.
- Error, sign-in, room, pet, and bridge states must not rely on color alone.
- Layout must not overlap at common laptop widths or mobile fallback widths.

## Access Boundaries

- Vercel Deployment Protection or automation bypass is hosting-level preview access.
- The Mochirii tester-password gate is player-level access for Alpha Preview Ready.
- Mochirii member sign-in and tester approval are required for saved play.
- Do not expose service-role keys, secret keys, Discord client secrets, Discord bot tokens, refresh tokens, or tester password material in browser code.
- Vercel advanced protection and provider add-ons can add cost. Do not enable, deploy, redeploy, or mutate provider settings during visual polish without fresh action-specific approval.

## Verification

Run the local checks after website changes:

```powershell
npm run check:mochi-pets-tester-password-gate
npm run check:mochi-pets-alpha
npm run check:assets
npm run check
cd apps/web
npm run lint
npm run build
```

Hosted preview verification, provider setting changes, redeploys, and hosted browser gates require fresh action-specific approval before use when they can create real provider cost or mutate external state. Public-repo commits and pushes are allowed under the current user policy; verify PR/CI results afterward.
