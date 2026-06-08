# Provider Security Verification - 2026-06-08

## Summary

This report records the provider-side security verification pass after the GitHub ruleset hardening and CSP enforcement releases. Evidence was collected from GitHub CLI/API, live HTTP checks, Vercel dashboard, Cloudflare dashboard, Supabase dashboard, Supabase connector state, and Discord API checks.

No secret values are included in this report.

## GitHub

- Active ruleset: `Primary Rules`.
- Ruleset enforcement: active.
- Required checks on `main`:
  - `validate`
  - `validate-next`
  - `CodeQL`
  - `Vercel`
  - `Supabase Preview`
- Open Dependabot alerts: `0`.
- Open code scanning alerts: `0`.
- PR #225 hardened the ruleset and merged to `main`.
- PR #226 promoted CSP to enforcement and merged to `main`.

## Vercel

- Canonical project: `mochirii/mochirii`.
- Production deployment after CSP enforcement: Ready.
- Deployment evidence: `https://vercel.com/mochirii/mochirii/DNoJQwR8tPQZ166syNi4wNCHiT3t`.
- Dashboard project settings verified:
  - Root/project settings point to the production Next app.
  - Production branch is `main`.
  - Production domains are valid.
  - `www.mochirii.com` redirects to apex.
  - Web Analytics dashboard is accessible.
  - Speed Insights dashboard is accessible.
  - Firewall page is accessible, active, and showed no active alerts during the pass.
- Follow-up note: Vercel dashboard currently showed Node.js `24.x`, while local and GitHub CI validation use Node 22. Builds are green, so this was recorded only as a follow-up setting review rather than changed silently.

## Live Site Headers

Live route header smoke after PR #226 reached Vercel production:

| Route | Status | Server | CSP | CSP Report Only | Nosniff | Frame |
| --- | ---: | --- | --- | --- | --- | --- |
| `/` | 200 | Vercel | present | absent | nosniff | DENY |
| `/gallery` | 200 | Vercel | present | absent | nosniff | DENY |
| `/auth` | 200 | Vercel | present | absent | nosniff | DENY |
| `/account` | 200 | Vercel | present | absent | nosniff | DENY |
| `/gallery-submit` | 200 | Vercel | present | absent | nosniff | DENY |
| `/leader-dashboard` | 200 | Vercel | present | absent | nosniff | DENY |
| `/spotify` | 200 | Vercel | present | absent | nosniff | DENY |
| `/members` | 200 | Vercel | present | absent | nosniff | DENY |
| `/members/twills` | 200 | Vercel | present | absent | nosniff | DENY |

## Cloudflare

- Cloudflare remains the DNS provider.
- Vercel web records remain DNS-only, not proxied:
  - `mochirii.com` CNAME to Vercel recommended target, DNS only.
  - `www.mochirii.com` CNAME to Vercel recommended target, DNS only.
- Mail and verification records remain DNS-only.
- Cloudflare's proxy/security banner remains advisory for this architecture. Vercel stays the active production edge/security layer unless a separate Cloudflare reverse-proxy plan is approved.

## Supabase

- Project verified: `deyvmtncimmcinldjyqe`.
- Auth Site URL: `https://mochirii.com`.
- Redirect URLs were tightened:
  - Removed broad production wildcard `https://mochirii.com/**`.
  - Removed stale phase-3 preview wildcard.
  - Kept exact production clean routes and legacy `.html` routes required by current app flows.
  - Kept Vercel preview wildcard and localhost development wildcard.
- Storage buckets verified in dashboard:
  - `member-gallery`: private, 50 MB limit, JPEG/PNG/WebP only.
  - `member-profile-media`: private, 50 MB limit, JPEG/PNG/WebP only.
- Edge Function deployed `verify_jwt` settings match current repo intent:
  - Signed-in/member/moderator functions require JWT.
  - Public approved-gallery feed remains `verify_jwt=false` by design and returns approved, signed, public-safe data only.
  - Discord ingest remains `verify_jwt=false` by design and is guarded by shared secret plus server-side membership checks.
  - Reaper Discord Interactions remains `verify_jwt=false` by design and is guarded by Discord Ed25519 signatures plus timestamp checks.
- Secret names verified by dashboard name only:
  - Discord guild, role, bot token, public key, application ID, gallery channel, and ingest secret names are present.
  - Supabase platform-provided function secrets are present.
  - `INSTAGRAM_*` secrets are not currently set; this matches the current manual Instagram sharing mode.

## Discord/Reaper

- Application checked: Reaper.
- Bot member exists in the guild.
- Reaper bot role posture:
  - Administrator permission: false.
  - Manage Roles permission: true.
  - Highest bot role position: above the vanity rank roles.
- Rank role posture:
  - All 10 ranks from `data/ranks.json` exist in Discord.
  - All 10 rank roles have permissions `0`.
  - All 10 rank roles have `hoist:false`.
  - All 10 rank roles have `mentionable:false`.
  - Unsafe rank-role count: `0`.
- Token rotation status: blocked on Discord MFA prompt. The token reset was initiated in Chrome, but Discord required MFA before issuing the new token. The old local token still worked for read-only Discord API verification at the time of this report; no token value was printed or committed.

## Validation

- `git diff --check`: passed.
- `npm run check`: passed with known large audio asset warning only.
- `npm run check:production`: passed after local DNS recovered.
- `npm run smoke:supabase-edge-functions`: passed after local DNS recovered.
- `npm run check:reaper-discord-interactions`: passed.
- `cd apps/web && npm audit --audit-level=moderate`: `found 0 vulnerabilities`.
- `cd apps/web && npm run lint`: passed.
- `cd apps/web && npm run build`: passed.

## Remaining Action-Time Items

- Complete Discord MFA, reset the Reaper bot token, copy the new token directly into Supabase secret `DISCORD_BOT_TOKEN`, then clear the clipboard.
- After token rotation, rerun:
  - `npm run check:reaper-discord-interactions`
  - Discord API bot-role verification with the new token.
  - `/sync-ranks mode:preview confirm:false` from an approved Discord moderator account if available.
- Decide whether Vercel's Node.js dashboard setting should be aligned from `24.x` to Node 22 to match GitHub CI and local validation.
