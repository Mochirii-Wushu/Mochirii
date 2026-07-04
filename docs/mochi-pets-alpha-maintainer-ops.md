# Mochi Pets Alpha Maintainer Ops

This private maintainer guide keeps the Mochirii website doorway aligned with
the Unity Mochi Pets alpha. Player-facing copy stays simple; implementation
details stay here.

## Source Hierarchy

1. User-approved Mochi Pets goal and current branch state.
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

## Live Production Password Gate

Live production for this alpha means
`https://mochirii.com/games/mochi-pets` remains closed behind the tester
password wall. It is not a public launch. The tester password opens the page
shell only; saved play still requires Mochirii member sign-in, tester approval,
accepted terms, and valid Unity auth.

Before changing production env, merging, deploying, or running hosted checks,
get explicit approval for the exact action. Confirm that the action reuses
existing provider projects and does not create new Fly apps, machines, volumes,
IPs, databases, paid resources, Enjin funding, Fuel Tanks, Wallet Daemon
signing, or chain transactions.

After an approved production deploy, hosted verification must prove:

- `/games/mochi-pets` is still password-gated and noindexed.
- The unlocked shell blocks signed-out users until member sign-in.
- Non-testers and terms-missing testers are blocked.
- Valid testers enter the Unity WebGL room.
- Two testers see distinct characters and shared Lirabao state.
- Character and Lirabao progress survive reload, logout, and login.
- Public copy keeps no-real-value boundaries and omits market, trade,
  funded-chain, cashout, and public-launch language.

## Website Production Environment Matrix

| Name | Boundary |
| --- | --- |
| `MOCHI_PETS_ALPHA_ACCESS_MODE` | `tester-password` for the live playtest wall |
| `MOCHI_PETS_TESTER_PASSWORD` | server-only tester password |
| `NEXT_PUBLIC_MOCHI_PETS_URL` | browser-safe game iframe origin |
| `NEXT_PUBLIC_SUPABASE_URL` | browser-safe Supabase URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser-safe publishable key |
| `MOCHI_PETS_ALPHA_EDGE_PUBLISHABLE_KEY_FILE` | local no-secret smoke helper |
| `MOCHI_PETS_GAME_SERVER_TOKEN` | server-to-server only |

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
needed for `MOCHI_PETS_AUTH`.

## Preview Verification

Run local checks before any deployment request:

```powershell
npm run check:mochi-pets-alpha
npm run check:mochi-pets-bridge-state
npm run check:mochi-pets-edge-authority
npm run check:mochi-pets-game-contract
npm run check:mochi-pets-tester-password-gate
npm run check:mochi-pets-report-hygiene
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

Do not mark these gates complete from the tester password wall alone, static
screenshots, copied environment variables, the legacy runtime, dummy data, or a
hosted page that has not been approved for hosted verification. The review must
directly observe the member sign-in path, allowlist/terms blocks, Unity iframe
auth bridge, feedback/audit path, no-real-value copy, and shared game presence.
The stored browser evidence access mode must match the current page mode; a
strict member-only review cannot replace the live tester-password wall review.
The recorded review URL must be the Mochi Pets page route,
`/games/mochi-pets`, not a nearby account, admin, or generic preview page.

Tester-password production evidence:

```powershell
$env:MOCHI_PETS_SITE_BROWSER_GATES_ACCESS_MODE="tester-password"
$env:MOCHI_PETS_SITE_BROWSER_GATES_CONFIRMED="true"
$env:MOCHI_PETS_SITE_BROWSER_GATES_REVIEWER="<reviewer>"
$env:MOCHI_PETS_SITE_BROWSER_GATES_BROWSER="<browser/version>"
$env:MOCHI_PETS_SITE_BROWSER_GATES_URL="https://<site>/games/mochi-pets"
$env:MOCHI_PETS_SITE_BROWSER_PASSWORD_LOCKED_OK="true"
$env:MOCHI_PETS_SITE_BROWSER_PASSWORD_IFRAME_ABSENT_OK="true"
$env:MOCHI_PETS_SITE_BROWSER_PASSWORD_INVALID_ERROR_OK="true"
$env:MOCHI_PETS_SITE_BROWSER_SIGNED_OUT_BLOCKED_OK="true"
$env:MOCHI_PETS_SITE_BROWSER_NON_TESTER_BLOCKED_OK="true"
$env:MOCHI_PETS_SITE_BROWSER_TERMS_GATE_OK="true"
$env:MOCHI_PETS_SITE_BROWSER_IFRAME_LOADS_OK="true"
$env:MOCHI_PETS_SITE_BROWSER_AUTH_BRIDGE_OK="true"
$env:MOCHI_PETS_SITE_BROWSER_FEEDBACK_AUDIT_OK="true"
$env:MOCHI_PETS_SITE_BROWSER_NO_REAL_VALUE_OK="true"
$env:MOCHI_PETS_SITE_BROWSER_GAME_PRESENCE_OK="true"
$env:MOCHI_PETS_SITE_BROWSER_ADMIN_GRANT_REVOKE_OK="true"
npm run prepare:mochi-pets-browser-gates
```

Direct strict member-persistent evidence without password-wall checks:

```powershell
$env:MOCHI_PETS_SITE_BROWSER_GATES_ACCESS_MODE="supabase"
$env:MOCHI_PETS_SITE_BROWSER_GATES_CONFIRMED="true"
$env:MOCHI_PETS_SITE_BROWSER_GATES_REVIEWER="<reviewer>"
$env:MOCHI_PETS_SITE_BROWSER_GATES_BROWSER="<browser/version>"
$env:MOCHI_PETS_SITE_BROWSER_GATES_URL="https://<site>/games/mochi-pets"
$env:MOCHI_PETS_SITE_BROWSER_SIGNED_OUT_BLOCKED_OK="true"
$env:MOCHI_PETS_SITE_BROWSER_NON_TESTER_BLOCKED_OK="true"
$env:MOCHI_PETS_SITE_BROWSER_TERMS_GATE_OK="true"
$env:MOCHI_PETS_SITE_BROWSER_IFRAME_LOADS_OK="true"
$env:MOCHI_PETS_SITE_BROWSER_AUTH_BRIDGE_OK="true"
$env:MOCHI_PETS_SITE_BROWSER_FEEDBACK_AUDIT_OK="true"
$env:MOCHI_PETS_SITE_BROWSER_NO_REAL_VALUE_OK="true"
$env:MOCHI_PETS_SITE_BROWSER_ADMIN_GRANT_REVOKE_OK="true"
npm run prepare:mochi-pets-browser-gates
```

## Rollback

If the Unity build is unavailable, keep `/games/mochi-pets` online, keep the
tester password wall, and replace the iframe with a playtest-paused message.
Never silently serve the legacy runtime as the alpha.
