# Mochi Social Alpha Playtest Guide

Mochi Social is a closed alpha playtest for approved Mochirii guild members.
Testers enter one shared guild room, create a curated character, meet Lirabao,
care for Lirabao together, leave, return, and see saved play after member sign-in.

The live target is `/games/mochi-social` behind the tester password wall. The
tester password unlocks the page shell only. Saved play requires Mochirii member
sign-in, active tester access, and accepted alpha terms.

## Tester Guide

1. Open the tester password page.
2. Enter the tester password.
3. Sign in as a Mochirii member for saved play.
4. Accept the alpha terms when prompted.
5. Create one of the curated characters.
6. Join the shared guild room.
7. Meet Lirabao and care for the guild pet together.

No real value is attached to alpha progress. Character choices, room activity,
feedback, and Lirabao care are playtest-only.

## Active Playtest Scope

- One shared guild room.
- Three curated character presets.
- One shared guild pet: Lirabao.
- Basic movement, camera follow, wave, chat or social signal, and pet care.
- Saved character progress for signed-in testers.
- Shared Lirabao progress for all approved testers.

The playtest does not include avatar uploads, market features, trading, paid
items, cashout, multiple rooms, mobile-specific UI, or public launch behavior.

## Website Doorway

The website owns the tester-password gate, member sign-in prompts, alpha terms,
feedback, and the iframe doorway. The game repo owns the Unity runtime, room,
characters, Lirabao, manifest, status endpoint, and build artifact.

Important website values:

- `NEXT_PUBLIC_MOCHI_SOCIAL_URL`
- `MOCHI_SOCIAL_ALPHA_ACCESS_MODE=tester-password`
- `MOCHI_SOCIAL_TESTER_PASSWORD`
- `MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY_FILE`

The parent page sends `MOCHI_SOCIAL_AUTH` only after valid member sign-in and
approved alpha access. It sends no refresh token, service-role key, Discord
secret, Unity service credential, wallet material, or other private value.

## Manual Browser Gate Evidence

Default tester-password evidence uses:

```powershell
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_ACCESS_MODE="tester-password"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_CONFIRMED="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER="<reviewer>"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER="<browser/version>"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_URL="https://<site>/games/mochi-social"
$env:MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_LOCKED_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_IFRAME_ABSENT_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_INVALID_ERROR_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_IFRAME_LOADS_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_AUTH_BRIDGE_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_NO_REAL_VALUE_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_GAME_PRESENCE_OK="true"
npm run prepare:mochi-social-browser-gates
```

Strict member-persistent evidence also verifies signed-out blocking, non-tester
blocking, the terms gate, feedback audit, and admin grant/revoke.

```powershell
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_ACCESS_MODE="supabase"
$env:MOCHI_SOCIAL_SITE_BROWSER_SIGNED_OUT_BLOCKED_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_NON_TESTER_BLOCKED_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_TERMS_GATE_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_IFRAME_LOADS_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_AUTH_BRIDGE_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_FEEDBACK_AUDIT_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_NO_REAL_VALUE_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_ADMIN_GRANT_REVOKE_OK="true"
npm run prepare:mochi-social-browser-gates
```

## Local Verification

Run these before asking for production deployment approval:

```powershell
npm run check:mochi-social-alpha
npm run check:mochi-social-bridge-state
npm run check:mochi-social-edge-authority
npm run check:mochi-social-game-contract
npm run check:mochi-social-tester-password-gate
npm run check:mochi-social-report-hygiene
npm run check:mochi-social-preview-ready
npm run check
cd apps/web
npm run lint
npm run build
```

The game repo should also pass its Unity and release checks, including
`npm run alpha:load-smoke` when that approval path is active.

## Preview Acceptance

Alpha Preview Ready means:

- The tester password blocks the live page before unlock.
- The iframe appears only after the tester password unlock.
- Saved play requires signed-in Mochirii member access.
- Signed-out users, non-testers, and testers missing terms are blocked.
- Approved testers can enter the shared guild room.
- Two testers see separate characters in the same room.
- Both testers interact with the same Lirabao state.
- Character and Lirabao progress survive reload, logout, and login.
- Public copy stays simple, Mochirii-branded, and no-real-value.
- No new provider resources or costs are introduced.

## Rollback

If the Unity game is unavailable after deployment, keep the tester page online
and show a clear playtest-paused message instead of loading the iframe.

Do not roll back by switching to the legacy runtime. Do not roll back by opening
the page publicly. Keep rollback notes private and no-secret.

For maintainer details, see `docs/mochi-social-alpha-maintainer-ops.md`.
