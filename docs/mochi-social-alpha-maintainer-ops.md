# Mochi Social Alpha Maintainer Ops

This private maintainer guide keeps the Mochirii website doorway aligned with
the Unity Mochi Social alpha. Player-facing copy stays simple; implementation
details stay here.

## Source Hierarchy

1. User-approved Mochi Social goal and current branch state.
2. Official Unity, Supabase, Vercel, Fly, Discord, and Enjin documentation.
3. Local repository checks and no-secret reports.
4. Live provider dashboards only after action-specific approval.

## Source Basis

- Unity WebGL build output and browser bridge docs.
- Unity Authentication, Cloud Save, and Cloud Code docs.
- Supabase Edge Function, secrets, RLS, and API security docs.
- Vercel environment and deployment docs.
- Fly pricing docs for no-new-cost checks.
- Discord OAuth and credential safety docs.

## Verification Choice

Use local checks first. Do not merge, deploy, mutate provider settings, rotate
secrets, run hosted smoke/load checks, create paid resources, or fund future
chain work until the user approves that exact action.

## Alpha Preview Ready Lane

The active target is production URL access behind the tester password wall, not
public launch. Tester password unlocks the shell; member sign-in is required for
saved play and Unity auth.

The active alpha includes one shared room, curated character presets, one shared
Lirabao pet, no real value, no market, no trade, no paid assets, and no cashout.
Future chain-related code must stay server-only, inactive, and absent from
player-facing copy.

Do not set dummy IDs or fake readiness flags to clear future gates.

## Website Production Environment Matrix

| Name | Boundary |
| --- | --- |
| `MOCHI_SOCIAL_ALPHA_ACCESS_MODE` | `tester-password` for the live playtest wall |
| `MOCHI_SOCIAL_TESTER_PASSWORD` | server-only tester password |
| `NEXT_PUBLIC_MOCHI_SOCIAL_URL` | browser-safe game iframe origin |
| `NEXT_PUBLIC_SUPABASE_URL` | browser-safe Supabase URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser-safe publishable key |
| `MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY_FILE` | local no-secret smoke helper |
| `MOCHI_SOCIAL_GAME_SERVER_TOKEN` | server-to-server only |

## Supabase Authority Matrix

Supabase owns member identity, tester allowlist, terms, feedback, admin audit,
Unity player mapping, and latest Lirabao audit mirrors. Unity services own
runtime character and shared-pet state.

Use explicit grants and RLS together for new public-schema tables. RLS controls
rows; grants control whether the Data API can reach the table at all.

## Discord Boundary

Discord may help verify member access, but Discord secrets, bot tokens, OAuth
client secrets, and raw account identifiers stay out of browser code, reports,
PR text, and screenshots.

## Secret Entry Protocol

Do not place service-role keys, Unity service account credentials, tester
passwords, Discord secrets, Enjin tokens, wallet material, cookies, raw request
headers, or one-time codes in Git, browser code, logs, reports, PR comments, or
screenshots. Browser code should receive short-lived access token data only when
needed for `MOCHI_SOCIAL_AUTH`.

## Preview Verification

Run local checks before any deployment request:

```powershell
npm run check:mochi-social-alpha
npm run check:mochi-social-bridge-state
npm run check:mochi-social-edge-authority
npm run check:mochi-social-game-contract
npm run check:mochi-social-tester-password-gate
npm run check:mochi-social-report-hygiene
npm run check:supabase-edge-types
npm run check
cd apps/web
npm run lint
npm run build
```

## Manual Browser Evidence Protocol

Record pass/fail metadata only: reviewer, browser/version, URL, access mode, and
short no-secret notes. Do not capture tokens, cookies, account emails, request
headers, dashboard screenshots, or private provider values.

Tester-password evidence:

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

Strict member-persistent evidence:

```powershell
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_ACCESS_MODE="supabase"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_CONFIRMED="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER="<reviewer>"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER="<browser/version>"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_URL="https://<site>/games/mochi-social"
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

## Rollback

If the Unity build is unavailable, keep `/games/mochi-social` online, keep the
tester password wall, and replace the iframe with a playtest-paused message.
Never silently serve the legacy runtime as the alpha.
