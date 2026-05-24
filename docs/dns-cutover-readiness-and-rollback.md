# DNS Cutover Readiness and Rollback Plan

## Do Not Cut Over Yet

This document prepares for a future custom-domain cutover from the current GitHub Pages production site to the validated Vercel/Next.js production site. It is a checklist and rollback plan only.

Do not cut over `mochirii.com` DNS until the user explicitly approves the cutover window and the manual dashboard/provider steps are completed by an operator.

## Current State

- Root GitHub Pages static site files still exist and must remain available for rollback.
- The Next.js app lives under `apps/web`.
- Vercel project: `mochirii/web`.
- Vercel Root Directory: `apps/web`.
- Vercel production review URL: `https://mochirii.vercel.app`.
- Current custom-domain production surface remains the GitHub Pages site until DNS is explicitly changed.
- DNS cutover for `mochirii.com` remains deferred.
- Supabase-first architecture is preserved: Supabase remains authoritative for Auth, Postgres/RLS, Storage, Edge Functions, Discord verification, gallery moderation, signed preview URLs, and audit records.
- Vercel/Next owns routing, React UI, rendering, redirects, and browser-safe Supabase integration.

## Non-Goals

- Do not add, remove, or edit DNS records.
- Do not add, remove, or edit Vercel custom domains.
- Do not change Supabase dashboard settings.
- Do not change Discord Developer Portal settings.
- Do not change GitHub Pages settings.
- Do not change Vercel dashboard settings.
- Do not deploy manually from local CLI.
- Do not delete root GitHub Pages files or legacy auth/member workflow files.
- Do not optimize, replace, remove, or re-encode `assets/audio/mochiriiiiii.mp3`.

## Current Route Readiness

The Next/Vercel app currently implements these clean public routes:

- `/`
- `/join`
- `/ranks`
- `/leaders`
- `/codex`
- `/events`
- `/announcements`
- `/raffles`
- `/gallery`
- `/spotlight`
- `/spotify`
- `/recruitment`
- `/twills`

The Next/Vercel app currently implements these Phase 3 member workflow routes:

- `/auth`
- `/account`
- `/gallery-submit`
- `/leader-dashboard`

Legacy `.html` redirects are configured in `apps/web/next.config.ts`:

- `/index.html` -> `/`
- `/join.html` -> `/join`
- `/ranks.html` -> `/ranks`
- `/leaders.html` -> `/leaders`
- `/codex.html` -> `/codex`
- `/events.html` -> `/events`
- `/announcements.html` -> `/announcements`
- `/raffles.html` -> `/raffles`
- `/gallery.html` -> `/gallery`
- `/spotlight.html` -> `/spotlight`
- `/spotify.html` -> `/spotify`
- `/recruitment.html` -> `/recruitment`
- `/twills.html` -> `/twills`
- `/auth.html` -> `/auth`
- `/account.html` -> `/account`
- `/gallery-submit.html` -> `/gallery-submit`
- `/leader-dashboard.html` -> `/leader-dashboard`

## Production Verification Snapshot

Latest post-PR-183 production verification:

- Vercel production URL: `https://mochirii.vercel.app`
- Deployment ID: `dpl_12d12HX9a9xpTRZXtbkbXraTm6Uj`
- Target: `production`
- Commit: `a33ac30fbe303c9e865c94b81887e7100c706333`
- Status: `Ready`
- Build result: success
- PR #183 shared lightbox overlay and scroll-lock fix is included in production.
- Homepage Screenshot Spotlight full-image lightbox no longer shifts the page left, overlays the footer/header, restores scroll/focus, and keeps the image centered and viewport-contained.
- Gallery full-image lightbox no longer shifts the page left, overlays the footer/header, restores scroll/focus, and keeps the image centered and viewport-contained.
- Homepage Screenshot Spotlight randomization remains working: four thumbnails render, hard refresh changes the selected set/order, selection stays stable in-session, and thumbnails open matching full images.
- Gallery sorting/random behavior remains working: newest starts `shot-73`, `shot-72`, `shot-71`; oldest starts `shot-01`, `shot-02`, `shot-03`; random changes after hard refresh and stays stable in-session.
- Public routes, legacy redirects, and Phase 3 member workflow routes remain production-ready on `https://mochirii.vercel.app`.
- No empty image `src` warnings were observed on `/`, `/gallery`, or `/spotlight`.
- DNS cutover remains deferred.

Warnings to keep in view:

- `assets/audio/mochiriiiiii.mp3` exceeds the local asset-size warning threshold by design; preserve it as-is unless a later approved task explicitly changes the audio policy.
- Hosted Vercel build logs may show an `outputFileTracingRoot` / `turbopack.root` warning. The current production deployment still builds successfully and is Ready.
- Vercel Development env is intentionally not a cutover gate. Production and Preview envs are the relevant deployed environments.

### Step 1 Baseline Lock

Latest implementation-plan baseline lock: `2026-05-24`.

Local repository state:

- Branch: `dns-cutover-readiness-and-rollback-plan`.
- PR: #181, open draft, base `main`, head `dns-cutover-readiness-and-rollback-plan`, merge state `CLEAN`.
- Branch comparison at the start of this pass: `0` commits behind `main`, `9` commits ahead.
- Worktree remained clean after validation and generated Vercel output cleanup, before this documentation update.

Validation commands completed:

- `npm run check` passed. Known warning only: `assets/audio/mochiriiiiii.mp3` is over the local asset-size warning threshold.
- `git diff --check` passed.
- `npm run check:production` passed against the current custom-domain GitHub Pages surface.
- `cd apps/web && npm run lint` passed after running `npm run clean` to remove generated `.vercel/output` from a previous local Vercel build.
- `cd apps/web && npm run build` passed and prerendered all current App Router routes.
- `CI=1 vercel build --prod --cwd apps/web` passed with `status: ok` and target `production`.
- `npm run smoke:vercel-production` passed against `https://mochirii.vercel.app`, including clean routes, legacy `.html` redirects, and signed-out Phase 3 route content checks.

Read-only provider and public-network checks completed:

- Vercel CLI account: `xartaiusx`.
- Vercel project read: `mochirii/web`.
- Vercel Production env names observed as encrypted values: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`.
- Vercel Preview env names observed as encrypted values: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`.
- Extra Vercel env name observed in both Production and Preview: `SUPABASE_PUBLISHABLE_KEY`. It is not a `NEXT_PUBLIC_` browser variable and should be reviewed later before cleanup, but it is not a current cutover blocker.
- Supabase CLI version observed locally: `2.101.0`.
- Public DNS still returns Cloudflare nameservers `igor.ns.cloudflare.com` and `naomi.ns.cloudflare.com`.
- Public apex and `www` A answers still return Cloudflare IPs `104.21.70.47` and `172.67.219.251`.
- `https://mochirii.com` still returns Cloudflare plus GitHub Pages/Fastly headers, so the custom domain has not cut over to Vercel.
- `https://www.mochirii.com` still redirects to `https://mochirii.com/`.
- `https://mochirii.vercel.app` still returns `server: Vercel` and serves the Vercel app.

No DNS, Cloudflare, Vercel dashboard, Supabase dashboard, Discord Developer Portal, GitHub Pages, Supabase database, Supabase Edge Function, or deployment mutation was performed during this baseline lock.

## Source-Aligned Operating Rules

These rules are based on the official provider references checked during the baseline pass:

- Vercel custom-domain setup should use the exact records Vercel shows for the project/domain and, with an external DNS provider such as Cloudflare, those records must be added in that external provider rather than through Vercel DNS. Source: <https://vercel.com/docs/domains/set-up-custom-domain>
- Vercel does not recommend placing Cloudflare or another reverse proxy in front of a Vercel project because it can reduce Vercel traffic visibility, security signal quality, performance, and cache reliability. Keep the planned Vercel target DNS-only unless the user explicitly approves a tested reverse-proxy exception. Source: <https://vercel.com/kb/guide/cloudflare-with-vercel>
- Cloudflare proxied `A`, `AAAA`, and `CNAME` records return Cloudflare anycast IPs publicly; this is why current public DNS answers do not reveal the GitHub Pages origin records while Cloudflare proxying remains active. Source: <https://developers.cloudflare.com/dns/proxy-status/>
- Cloudflare `MX` and `TXT` records are always DNS-only. Do not touch ProtonMail, DKIM, DMARC, SPF, or verification records during a website-hosting cutover. Source: <https://developers.cloudflare.com/dns/proxy-status/>
- Supabase Auth redirect URLs must match the `redirectTo` URLs used by the app. Use exact production custom-domain redirect paths for the final production state, and reserve wildcards for local and preview deployments. Source: <https://supabase.com/docs/guides/auth/redirect-urls>
- Supabase browser code may use publishable keys only with RLS and explicit grants. Secret keys, service-role keys, Discord bot tokens, and OAuth client secrets stay in Supabase Edge Functions or other server-only runtimes. Sources: <https://supabase.com/docs/guides/getting-started/api-keys>, <https://supabase.com/docs/guides/functions/secrets>
- New Supabase tables exposed through the Data API should keep explicit `GRANT` statements, RLS, and reviewed policies together in migrations because Supabase is moving away from automatic public-schema Data API exposure. Source: <https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically>

## Readiness Checklist

Before cutover approval, confirm:

- Vercel production at `https://mochirii.vercel.app` is Ready.
- Vercel production serves all clean public routes with HTTP 200.
- Vercel production redirects all legacy `.html` routes to clean routes.
- Homepage and gallery lightboxes remain fixed full-viewport overlays with no page-left shift and no footer/header overlap regression.
- Homepage Screenshot Spotlight randomization remains stable in-session and changes across hard refreshes.
- Gallery newest, oldest, and random sort behavior remains unchanged.
- `/auth` shows Discord login UI.
- `/account`, `/gallery-submit`, and `/leader-dashboard` show signed-out/access-check states without crashing.
- Discord OAuth works on Vercel production or a fresh Preview with the same public env values.
- `/auth` OAuth returns to `/account`.
- `/gallery-submit` blocks signed-out and unverified users.
- `/leader-dashboard` blocks signed-out and non-moderator users.
- At least one real active-member upload test is completed or explicitly deferred with a rollback owner.
- At least one moderator queue/approve/reject test is completed or explicitly deferred with a rollback owner.
- Supabase Auth redirect URLs include the future custom domains.
- Discord OAuth callback remains pointed at Supabase Auth.
- Vercel custom-domain readiness has been checked by an operator in the dashboard.
- DNS inventory has been captured before any record changes.
- Rollback owner and rollback communication path are confirmed.

## Vercel Checklist

Do not change Vercel settings while using this document unless the user has explicitly approved the cutover window.

Manual Vercel Dashboard path:

- Project: `mochirii/web`
- Verify Root Directory: `apps/web`
- Verify Production Branch: `main`
- Verify Framework: Next.js
- Verify Production env names are present:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `NEXT_PUBLIC_SITE_URL`
- Verify Preview env names are present:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `NEXT_PUBLIC_SITE_URL`

Domains to add later only after explicit cutover approval:

- `mochirii.com`
- `www.mochirii.com`, if desired

Expected Vercel custom-domain flow:

1. Add `mochirii.com` in Project -> Settings -> Domains.
2. Add `www.mochirii.com` if the guild wants the `www` hostname.
3. Copy the exact DNS records Vercel displays for each hostname.
4. Wait for Vercel domain verification.
5. Wait for HTTPS certificate provisioning.
6. Confirm Vercel marks each domain valid/ready.
7. Keep `https://mochirii.vercel.app` available as a fallback and debugging URL.

Do not hardcode expected DNS records in this repository. Use the exact records Vercel shows in Project -> Settings -> Domains.

## Supabase Checklist

Do not change Supabase settings while using this document unless the user has explicitly approved the cutover window.

Manual Supabase Dashboard path:

- Authentication -> URL Configuration

### Supabase Redirect Planning

Eventual Site URL after cutover:

- `https://mochirii.com`

Preview/local redirect URLs:

- `https://mochirii.vercel.app/**`
- `https://*-mochirii.vercel.app/**`
- `http://localhost:3000/**`

Broad custom-domain wildcards may be useful during transition:

- `https://mochirii.com/**`
- `https://www.mochirii.com/**`

Exact hardened final production redirect URLs after cutover:

- `https://mochirii.com/auth`
- `https://mochirii.com/account`
- `https://mochirii.com/gallery-submit`
- `https://mochirii.com/leader-dashboard`
- `https://www.mochirii.com/auth` if `www` serves app traffic.
- `https://www.mochirii.com/account` if `www` serves app traffic.

Keep Vercel and local URLs during the transition until rollback risk is gone. Broad production wildcards may be useful during transition, but exact production redirect URLs are the hardened final state.

Supabase behavior that must stay unchanged:

- Auth authority remains in Supabase.
- RLS remains central and must not be bypassed by browser code.
- Storage permissions remain in Supabase Storage policies.
- `verify-discord-member` remains a Supabase Edge Function.
- `list-gallery-review-queue` remains a Supabase Edge Function.
- `moderate-gallery-submission` remains a Supabase Edge Function.
- `list-approved-gallery-submissions` remains a Supabase Edge Function.
- Service-role and Discord bot secrets remain in Supabase Edge Functions or other server-only locations.

OAuth test after cutover:

1. Open `https://mochirii.com/auth`.
2. Start Discord login.
3. Confirm Supabase Auth returns to `https://mochirii.com/account`.
4. Confirm account UI loads without `Invalid supabaseUrl`.
5. Run Discord verification with a real account.
6. Confirm failed/blocked states are clear for users without the required roles.

Rollback for Supabase redirect settings:

1. Keep a screenshot/copy of pre-cutover Site URL and Redirect URLs.
2. If OAuth breaks only on the custom domain, restore the previous working Site URL/Redirect URL set.
3. Keep `https://mochirii.vercel.app/**` allowed while investigating.
4. Do not remove GitHub Pages/static callback URLs until rollback risk is gone.

## Discord Checklist

Do not change Discord Developer Portal settings while using this document unless the user has explicitly approved the cutover window.

Discord OAuth callback should remain:

- `https://deyvmtncimmcinldjyqe.supabase.co/auth/v1/callback`

Do not point Discord callback directly to Vercel, `mochirii.com`, or `www.mochirii.com`. Supabase Auth remains the OAuth callback owner.

Discord verification behavior to test after cutover:

- OAuth login starts from `/auth`.
- Auth returns to `/account`.
- `verify-discord-member` can read the Discord identity through Supabase Auth.
- Required role checks still distinguish unverified, verified, active member, and moderator states.

## Current DNS Inventory Snapshot

Snapshot time: `2026-05-17T22:16:31Z`

Tools used:

- `dig`
- `curl`
- `whois`
- `jq`
- `gh`
- `git`
- `rg`

Commands used:

- `dig mochirii.com NS/SOA/A/AAAA/CNAME/MX/TXT/CAA +noall +answer`
- `dig www.mochirii.com CNAME/A/AAAA/TXT +noall +answer`
- `dig @1.1.1.1` and `dig @8.8.8.8` for apex and `www` cross-checks.
- `dig _dmarc.mochirii.com TXT +noall +answer`
- `dig selector1._domainkey.mochirii.com TXT/CNAME +noall +answer`
- `dig selector2._domainkey.mochirii.com TXT/CNAME +noall +answer`
- `dig default._domainkey.mochirii.com TXT/CNAME +noall +answer`
- `dig protonmail._domainkey.mochirii.com TXT/CNAME +noall +answer`
- `dig google._domainkey.mochirii.com TXT/CNAME +noall +answer`
- `dig api.mochirii.com A/CNAME +noall +answer`
- `dig photos.mochirii.com A/CNAME +noall +answer`
- `dig gallery.mochirii.com A/CNAME +noall +answer`
- `dig discord.mochirii.com A/CNAME +noall +answer`
- `whois mochirii.com`
- `curl -sL https://rdap.org/domain/mochirii.com`
- `curl -I http://mochirii.com`
- `curl -I https://mochirii.com`
- `curl -I http://www.mochirii.com`
- `curl -I https://www.mochirii.com`
- `gh api repos/Mochirii-Wushu/Mochirii/pages`
- `gh repo view Mochirii-Wushu/Mochirii --json nameWithOwner,defaultBranchRef,homepageUrl,url`
- `test -f CNAME && cat CNAME`
- `git ls-files | grep -E '(^|/)CNAME$'`
- `rg` for `mochirii.com`, `github.io`, `CNAME`, and GitHub Pages references.

Confidence labels:

- `CONFIRMED_PUBLIC_DNS`: observed from public DNS, WHOIS/RDAP, or HTTP response data.
- `CONFIRMED_REPO`: observed from tracked repository files.
- `CONFIRMED_GITHUB_API`: observed from GitHub API or GitHub CLI API output.
- `CONFIRMED_CLOUDFLARE_DASHBOARD`: observed from user-provided Cloudflare dashboard confirmation with sensitive values redacted.
- `CONFIRMED_VERCEL_DASHBOARD`: observed from user-provided Vercel Domains DNS instructions.
- `INFERRED`: reasoned from multiple public observations, but not directly proven by a dashboard.
- `MANUAL_CONFIRMATION_REQUIRED`: not provable from the allowed public/repo sources.

GitHub Pages direct-record reference set used for comparison:

- A: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- AAAA: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`

### Current DNS Summary

| Item | Value | Source | Confidence | Notes |
| --- | --- | --- | --- | --- |
| Registrar | Cloudflare, Inc.; IANA ID `1910` | `whois`; RDAP | CONFIRMED_PUBLIC_DNS | Public registration data confirms the registrar. |
| Registration status | `client transfer prohibited` | `whois`; RDAP | CONFIRMED_PUBLIC_DNS | No dashboard access used. |
| DNSSEC | enabled; `mochirii.com` protected | user-provided Cloudflare DNS Settings screenshot; `whois`; RDAP `secureDNS.delegationSigned=true` | CONFIRMED_CLOUDFLARE_DASHBOARD | Keep enabled. Do not alter DNSSEC during cutover without explicit approval. |
| Authoritative nameservers | `igor.ns.cloudflare.com.`, `naomi.ns.cloudflare.com.` | `dig NS`; `whois`; RDAP | CONFIRMED_PUBLIC_DNS | Current NS set is Cloudflare-branded. |
| DNS provider | Cloudflare DNS | user-provided Cloudflare dashboard confirmation; authoritative nameservers | CONFIRMED_CLOUDFLARE_DASHBOARD | Dashboard confirmation identifies Cloudflare as the DNS provider. |
| Cloudflare proxy classification | Apex A records and `www` CNAME are orange-cloud proxied | user-provided Cloudflare dashboard confirmation; Cloudflare HTTP headers | CONFIRMED_CLOUDFLARE_DASHBOARD | Mail, security, and verification records are DNS only. |
| Cloudflare SSL/TLS mode | Full | user-provided Cloudflare dashboard screenshot | CONFIRMED_CLOUDFLARE_DASHBOARD | Full encrypts Cloudflare-to-origin traffic but does not validate the origin certificate. After the Vercel certificate is active and verified, consider Full (strict). |
| Apex dashboard web records | four `mochirii.com` A records, Proxied, TTL Auto; IP values redacted | user-provided Cloudflare dashboard confirmation | CONFIRMED_CLOUDFLARE_DASHBOARD | Preserve until an approved cutover uses exact Vercel-provided records. |
| `www` dashboard web record | `www` CNAME, Proxied, TTL Auto; target redacted | user-provided Cloudflare dashboard confirmation | CONFIRMED_CLOUDFLARE_DASHBOARD | Preserve until an approved cutover defines final `www` behavior. |
| Apex web origin | GitHub Pages behind Cloudflare likely | GitHub Pages API/CNAME; HTTP `x-github-request-id`, Fastly headers, and Cloudflare headers | INFERRED | Direct DNS answers are Cloudflare proxy IPs, not GitHub Pages IPs. |
| GitHub Pages custom domain | `mochirii.com` | GitHub Pages API | CONFIRMED_GITHUB_API | API reports Pages `status: built`, `cname: mochirii.com`, source `main` `/`. |
| Repository CNAME file | `CNAME` contains `mochirii.com` | tracked `CNAME` file | CONFIRMED_REPO | Keep root static files and CNAME available for rollback until stabilization. |
| Repository homepage URL | `https://mochirii.vercel.app` | GitHub repo API | CONFIRMED_GITHUB_API | Repo metadata points to the Vercel production review URL. |
| GitHub Pages A classification | no direct GitHub Pages A match; proxied / ambiguous | public DNS vs GitHub Pages reference A values | INFERRED | Current A records are Cloudflare IPs, so direct GitHub Pages A comparison is hidden by proxying. |
| GitHub Pages AAAA classification | no direct GitHub Pages AAAA match; proxied / ambiguous | public DNS vs GitHub Pages reference AAAA values | INFERRED | Current AAAA records are Cloudflare IPs, so direct GitHub Pages AAAA comparison is hidden by proxying. |
| `www` routing intent | `https://www.mochirii.com` redirects to `https://mochirii.com/` | `curl -I` | CONFIRMED_PUBLIC_DNS | Whether `www` should remain redirect-only or serve app traffic is a cutover decision. |

### Current Observed Public DNS Snapshot

| Host | Type | Value | TTL | Resolver / Source | Confidence | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `mochirii.com` | NS | `igor.ns.cloudflare.com.` | `86400`; `21600` from `8.8.8.8` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | TTL variance observed between resolvers. |
| `mochirii.com` | NS | `naomi.ns.cloudflare.com.` | `86400`; `21600` from `8.8.8.8` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | TTL variance observed between resolvers. |
| `mochirii.com` | SOA | `igor.ns.cloudflare.com. dns.cloudflare.com. 2404491762 10000 2400 604800 1800` | `1800` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Cloudflare SOA. |
| `mochirii.com` | A | `104.21.70.47` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Cloudflare-fronted web record. |
| `mochirii.com` | A | `172.67.219.251` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Cloudflare-fronted web record. |
| `mochirii.com` | AAAA | `2606:4700:3030::ac43:dbfb` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Cloudflare-fronted web record. |
| `mochirii.com` | AAAA | `2606:4700:3035::6815:462f` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Cloudflare-fronted web record. |
| `mochirii.com` | CNAME | no public answer | n/a | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Apex CNAME/ALIAS/ANAME dashboard state cannot be proven from public DNS. |
| `mochirii.com` | MX | `10 mail.protonmail.ch.` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Email record. Do not touch. |
| `mochirii.com` | MX | `20 mailsec.protonmail.ch.` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Email record. Do not touch. |
| `mochirii.com` | TXT | `v=spf1 include:_spf.protonmail.ch -all` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | SPF. Do not touch. |
| `mochirii.com` | TXT | `openai-domain-verification=dv-7wrk9X8LfsQRks41kOG5G5jI` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Verification TXT. Do not touch unless the owner approves. |
| `mochirii.com` | TXT | `protonmail-verification=55f321dbe5e35efd1b6fdbb8b3be9e3a7eca934f` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Proton verification TXT. Do not touch. |
| `mochirii.com` | CAA | no public answer | n/a | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | No observed CAA record; do not add one during cutover unless separately approved. |
| `www.mochirii.com` | CNAME | no public answer | n/a | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | `www` currently resolves through A/AAAA, likely Cloudflare proxied. |
| `www.mochirii.com` | A | `104.21.70.47` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Same visible Cloudflare A set as apex. |
| `www.mochirii.com` | A | `172.67.219.251` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Same visible Cloudflare A set as apex. |
| `www.mochirii.com` | AAAA | `2606:4700:3030::ac43:dbfb` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Same visible Cloudflare AAAA set as apex. |
| `www.mochirii.com` | AAAA | `2606:4700:3035::6815:462f` | `300` | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | Same visible Cloudflare AAAA set as apex. |
| `www.mochirii.com` | TXT | no public answer | n/a | system resolver; `1.1.1.1`; `8.8.8.8` | CONFIRMED_PUBLIC_DNS | No observed `www` TXT. |
| `_dmarc.mochirii.com` | TXT | `v=DMARC1; p=quarantine; rua=mailto:dmarc@mochirii.com; ruf=mailto:dmarc@mochirii.com; fo=1` | `300` | system resolver | CONFIRMED_PUBLIC_DNS | DMARC. Do not touch. |
| `protonmail._domainkey.mochirii.com` | CNAME | `protonmail.domainkey.daf6yajm373drajzjqjvbaedayzfr3yeglwbrbv5eby4j5kbhhl6a.domains.proton.ch.` | `300` | system resolver | CONFIRMED_PUBLIC_DNS | DKIM selector. Do not touch. |
| `protonmail._domainkey.mochirii.com` | TXT | resolved via Proton CNAME target; DKIM public key observed at target | `1200` at Proton target | system resolver | CONFIRMED_PUBLIC_DNS | Preserve the CNAME; the long DKIM key is hosted at Proton. |
| `selector1._domainkey.mochirii.com` | TXT/CNAME | no public answer | n/a | system resolver | CONFIRMED_PUBLIC_DNS | No observed record. |
| `selector2._domainkey.mochirii.com` | TXT/CNAME | no public answer | n/a | system resolver | CONFIRMED_PUBLIC_DNS | No observed record. |
| `default._domainkey.mochirii.com` | TXT/CNAME | no public answer | n/a | system resolver | CONFIRMED_PUBLIC_DNS | No observed record. |
| `google._domainkey.mochirii.com` | TXT/CNAME | no public answer | n/a | system resolver | CONFIRMED_PUBLIC_DNS | No observed record. |

### Current Apex And WWW HTTP Behavior

| URL | Status | Location | Server / headers | Source | Confidence | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `http://mochirii.com` | `301` | `https://mochirii.com/` | `server: cloudflare`, `cf-ray` | `curl -I` | CONFIRMED_PUBLIC_DNS | HTTP redirects to HTTPS apex. |
| `https://mochirii.com` | `200` | n/a | `server: cloudflare`, `x-github-request-id`, Fastly cache headers | `curl -I` | CONFIRMED_PUBLIC_DNS | HTTPS apex serves current GitHub Pages site through Cloudflare. |
| `http://www.mochirii.com` | `301` | `https://www.mochirii.com/` | `server: cloudflare`, `cf-ray` | `curl -I` | CONFIRMED_PUBLIC_DNS | HTTP redirects to HTTPS `www`. |
| `https://www.mochirii.com` | `301` | `https://mochirii.com/` | `server: cloudflare`, `x-github-request-id`, Fastly cache headers | `curl -I` | CONFIRMED_PUBLIC_DNS | `www` redirects to apex over HTTPS. |

### GitHub Pages State

| Item | Value | Source | Confidence | Notes |
| --- | --- | --- | --- | --- |
| Pages status | `built` | `gh api repos/Mochirii-Wushu/Mochirii/pages` | CONFIRMED_GITHUB_API | Current GitHub Pages site is built. |
| Pages custom domain | `mochirii.com` | `gh api repos/Mochirii-Wushu/Mochirii/pages` | CONFIRMED_GITHUB_API | Matches tracked `CNAME`. |
| Pages source | branch `main`, path `/` | `gh api repos/Mochirii-Wushu/Mochirii/pages` | CONFIRMED_GITHUB_API | Root static files remain the rollback source. |
| Pages public flag | `true` | `gh api repos/Mochirii-Wushu/Mochirii/pages` | CONFIRMED_GITHUB_API | Do not change Pages settings in this readiness phase. |
| Pages HTTPS enforced | `false` | `gh api repos/Mochirii-Wushu/Mochirii/pages` | CONFIRMED_GITHUB_API | Cloudflare currently provides the visible HTTPS behavior; dashboard confirmation required before changing anything. |
| Tracked CNAME | `mochirii.com` | `CNAME`; `git ls-files` | CONFIRMED_REPO | Do not remove during cutover readiness work. |
| Default Pages domain | likely `mochirii-wushu.github.io/Mochirii/` before custom domain | repository owner/name convention | INFERRED | Not directly returned by the GitHub API output used here; use GitHub Pages dashboard/API if this matters for rollback. |

### Future Cutover Action Table

| Host | Type | Current state | Future action | Final value | Source | Confidence | Cutover action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `mochirii.com` / `@` | CNAME | Dashboard shows four proxied A records with Auto TTL; IP values redacted | Replace current apex web records only during an approved cutover | `c4b58a30d23b9df3.vercel-dns-017.com`; Proxy disabled / DNS only | user-provided Vercel Domains DNS instructions; Cloudflare dashboard confirmation | CONFIRMED_VERCEL_DASHBOARD | CHANGE ONLY DURING APPROVED CUTOVER |
| `www.mochirii.com` / `www` | CNAME | Dashboard shows proxied `www` CNAME with Auto TTL; current target redacted | Replace or update `www` only during an approved cutover | `c4b58a30d23b9df3.vercel-dns-017.com`; Proxy disabled / DNS only | user-provided Vercel Domains DNS instructions; Cloudflare dashboard confirmation | CONFIRMED_VERCEL_DASHBOARD | CHANGE ONLY DURING APPROVED CUTOVER |
| `mochirii.com` | MX | ProtonMail MX records | Leave unchanged | `10 mail.protonmail.ch.`; `20 mailsec.protonmail.ch.` | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `mochirii.com` | TXT | SPF and verification TXT records | Leave unchanged | Existing public TXT values | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `_dmarc.mochirii.com` | TXT | DMARC quarantine policy | Leave unchanged | Existing DMARC TXT value | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `protonmail._domainkey.mochirii.com` | CNAME | ProtonMail DKIM selector | Leave unchanged | Existing Proton DKIM CNAME target | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `protonmail2._domainkey.mochirii.com` | CNAME | ProtonMail DKIM selector | Leave unchanged | Existing dashboard value redacted | Cloudflare dashboard confirmation | CONFIRMED_CLOUDFLARE_DASHBOARD | DO NOT TOUCH |
| `protonmail3._domainkey.mochirii.com` | CNAME | ProtonMail DKIM selector | Leave unchanged | Existing dashboard value redacted | Cloudflare dashboard confirmation | CONFIRMED_CLOUDFLARE_DASHBOARD | DO NOT TOUCH |
| `mochirii.com` | CAA | no public answer | Leave unchanged unless certificate policy is separately approved | n/a | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |

### Records To Preserve

| Record / Host | Type | Current observed value | TTL | Purpose | Source | Confidence | Cutover action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `mochirii.com` | MX | `10 mail.protonmail.ch.` | `300` | ProtonMail inbound mail | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `mochirii.com` | MX | `20 mailsec.protonmail.ch.` | `300` | ProtonMail inbound mail fallback | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `mochirii.com` | TXT | `v=spf1 include:_spf.protonmail.ch -all` | `300` | SPF email authorization | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `mochirii.com` | TXT | `protonmail-verification=55f321dbe5e35efd1b6fdbb8b3be9e3a7eca934f` | `300` | ProtonMail domain verification | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `mochirii.com` | TXT | `openai-domain-verification=dv-7wrk9X8LfsQRks41kOG5G5jI` | `300` | OpenAI domain verification | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `_dmarc.mochirii.com` | TXT | `v=DMARC1; p=quarantine; rua=mailto:dmarc@mochirii.com; ruf=mailto:dmarc@mochirii.com; fo=1` | `300` | DMARC reporting and policy | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `protonmail._domainkey.mochirii.com` | CNAME | `protonmail.domainkey.daf6yajm373drajzjqjvbaedayzfr3yeglwbrbv5eby4j5kbhhl6a.domains.proton.ch.` | `300` | ProtonMail DKIM selector | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH |
| `protonmail2._domainkey.mochirii.com` | CNAME | redacted in dashboard screenshot | Auto | ProtonMail DKIM selector | Cloudflare dashboard confirmation | CONFIRMED_CLOUDFLARE_DASHBOARD | DO NOT TOUCH |
| `protonmail3._domainkey.mochirii.com` | CNAME | redacted in dashboard screenshot | Auto | ProtonMail DKIM selector | Cloudflare dashboard confirmation | CONFIRMED_CLOUDFLARE_DASHBOARD | DO NOT TOUCH |
| `mochirii.com` | CAA | no public answer | n/a | Certificate authority policy | public DNS | CONFIRMED_PUBLIC_DNS | DO NOT TOUCH unless certificate policy is separately approved |
| `CNAME` repository file | file | `mochirii.com` | n/a | GitHub Pages custom-domain rollback reference | repo | CONFIRMED_REPO | DO NOT TOUCH until after stabilization |

### Vercel-Provided DNS Records For Future Cutover

Source: user-provided Vercel Domains DNS instructions.
Confidence: `CONFIRMED_VERCEL_DASHBOARD`.

These records are documented for a future approved cutover only. They have not been applied in Cloudflare, and DNS cutover remains deferred.

| Host / Name | Type | Value | Proxy setting | Cutover action |
| --- | --- | --- | --- | --- |
| `mochirii.com` / `@` | CNAME | `c4b58a30d23b9df3.vercel-dns-017.com` | Disabled / DNS only | Replace current apex web records only during an approved cutover. |
| `www.mochirii.com` / `www` | CNAME | `c4b58a30d23b9df3.vercel-dns-017.com` | Disabled / DNS only | Replace or update current `www` web record only during an approved cutover. |

Cloudflare remains authoritative DNS. Vercel is only the web hosting target for the approved app domains.

### Records Likely To Change During Future Cutover

- Apex `mochirii.com` web record should change to the Vercel-provided DNS-only CNAME above during an approved cutover.
- `www.mochirii.com` should change to the Vercel-provided DNS-only CNAME above during an approved cutover.
- Do not touch MX, SPF, DKIM, DMARC, CAA, verification TXT, email, or unrelated records.
- Do not change Cloudflare DNS before the explicit cutover window.

### Unrelated Subdomains And Do-Not-Touch List

Allowed-source repo search found only `www.mochirii.com` references in this cutover document. Public A/CNAME checks for the listed known/discussed hosts `api.mochirii.com`, `photos.mochirii.com`, `gallery.mochirii.com`, and `discord.mochirii.com` returned no public answers. That does not prove the full zone lacks those hosts.

| Host | Classification | Observed records | Source | Confidence | Cutover action |
| --- | --- | --- | --- | --- | --- |
| `www.mochirii.com` | website/custom-domain related | Cloudflare-fronted A/AAAA; HTTPS redirects to apex | public DNS; HTTP | CONFIRMED_PUBLIC_DNS | Change only if the approved Vercel cutover plan includes `www`. |
| `api.mochirii.com` | unknown / manual confirmation required | no public A/CNAME answer from allowed check | public DNS; repo search | MANUAL_CONFIRMATION_REQUIRED | DO NOT TOUCH unless found in provider dashboard and explicitly scoped. |
| `photos.mochirii.com` | unknown / manual confirmation required | no public A/CNAME answer from allowed check | public DNS; repo search | MANUAL_CONFIRMATION_REQUIRED | DO NOT TOUCH unless found in provider dashboard and explicitly scoped. |
| `gallery.mochirii.com` | unknown / manual confirmation required | no public A/CNAME answer from allowed check | public DNS; repo search | MANUAL_CONFIRMATION_REQUIRED | DO NOT TOUCH unless found in provider dashboard and explicitly scoped. |
| `discord.mochirii.com` | unknown / manual confirmation required | no public A/CNAME answer from allowed check | public DNS; repo search | MANUAL_CONFIRMATION_REQUIRED | DO NOT TOUCH unless found in provider dashboard and explicitly scoped. |

### Dashboard Confirmation And Remaining Manual Items

Confirmed from the Cloudflare DNS dashboard:

- DNS provider dashboard is Cloudflare.
- Apex web records are four `mochirii.com` A records, orange-cloud Proxied, with Auto TTL; IP values remain redacted.
- `www` is a CNAME record, orange-cloud Proxied, with Auto TTL; target remains redacted.
- SSL/TLS Current encryption mode is Full. Full encrypts Cloudflare-to-origin traffic but does not validate the origin certificate.
- After cutover, consider Full (strict) only after the Vercel certificate is active and verified.
- ProtonMail DKIM CNAME records `protonmail._domainkey`, `protonmail2._domainkey`, and `protonmail3._domainkey` must be preserved.
- Apex MX records, apex TXT records, and `_dmarc` TXT records must be preserved.
- Mail, security, and verification records are DNS only.

Manual confirmation still required:

- Full exact dashboard record content values remain redacted in the provided screenshot and must be captured from Cloudflare before any approved DNS change.
- Whether `www` should redirect to apex or serve app traffic remains a cutover decision.
- Whether any unpublished/private/unreferenced subdomains exist and must not be touched.

### Cloudflare DNS Settings Confirmation

Source: user-provided Cloudflare DNS Settings screenshot.
Confidence: `CONFIRMED_CLOUDFLARE_DASHBOARD`.

Cloudflare remains the authoritative DNS provider. Vercel is only the future web hosting target for the approved app domains; it should not replace Cloudflare as the DNS provider during this cutover plan.

| DNS Setting | Current state | Cutover guidance |
| --- | --- | --- |
| DNSSEC | Enabled; `mochirii.com` is protected | Keep enabled. Do not disable or rotate DNSSEC during website cutover. |
| Multi-signer DNSSEC | Off | Keep off unless a future multi-signer migration is explicitly planned. |
| Multi-provider DNS | Off | Keep off. This cutover does not introduce another authoritative DNS provider. |
| Email Security | Not configured | Do not configure during website cutover. ProtonMail email records must be preserved, and Cloudflare Email Security is out of scope. |

Preserve ProtonMail MX, SPF/TXT, DKIM CNAME, verification TXT, and `_dmarc` records exactly. Website hosting changes should only touch the approved apex/`www` web records that Vercel requires during a future cutover window.

### Cloudflare Active Rules Confirmation

Source: user-provided Cloudflare dashboard review.
Confidence: `CONFIRMED_CLOUDFLARE_DASHBOARD`.

The reviewed Cloudflare rules pages show template/create screens or no visible active entries. DNS cutover remains deferred, and no Cloudflare rules should be created during cutover unless a specific redirect, cache, or origin issue is found. Prefer Vercel domain settings and app-level redirects first.

| Cloudflare Area | Current visible state | Cutover guidance |
| --- | --- | --- |
| Redirect Rules | No active rules visible; templates/create screen only | Do not create redirect rules unless Vercel/app redirects fail a specific smoke check. |
| Page Rules | No active rules visible | Do not add legacy Page Rules during readiness work. |
| Cache Rules | No active rules visible; templates/create screen only | Do not add cache rules before production behavior requires a tested exception. |
| Configuration Rules | No active rules visible | Do not create configuration rules during cutover readiness. |
| Transform Rules | No active custom rules visible; Managed Transforms documented separately | Keep custom transforms off unless a narrow tested need appears. |
| Origin Rules | No active rules visible | Prefer Vercel domain/origin setup before adding Cloudflare origin rules. |
| Workers Routes | No active routes found for `mochirii.com`, `www.mochirii.com`, or `*.mochirii.com` | Do not add Workers routes during DNS cutover readiness. |

### Cloudflare Managed Transforms Recommendations

Source: user-provided Cloudflare Rules -> Settings -> Managed Transforms dashboard screenshot.
Confidence: `CONFIRMED_CLOUDFLARE_DASHBOARD`.

Managed Transforms apply zone-wide, so keep recommendations conservative before DNS cutover. Do not introduce broad request-header changes or a zone-wide security-header bundle during readiness work.

| Managed Transform | Recommendation | Notes |
| --- | --- | --- |
| Remove X-Powered-By headers | ON | Low-risk response-header cleanup that reduces unnecessary technology disclosure. |
| Add TLS client auth headers | OFF | Do not add client-certificate request headers before cutover. |
| Add visitor location headers | OFF | Avoid adding location-derived request headers before app, auth, and privacy behavior are reviewed. |
| Remove visitor IP headers | OFF | Do not alter visitor IP signal before logging, moderation, Supabase, and Vercel behavior are verified. |
| Add True-Client-IP header | OFF | Do not add broad client-IP forwarding headers before there is a tested origin-side need. |
| Add leaked credentials checks header | OFF | Keep request-header behavior unchanged during DNS readiness. |
| Add security headers | OFF for now | Revisit in a dedicated, tested Next/Vercel security-header PR instead of enabling zone-wide during cutover readiness. |

Stronger security headers should be handled later through a tested Next/Vercel security-header PR with route, auth, gallery, browser, and production smoke coverage. Do not enable Cloudflare Managed Transforms as a shortcut for that work before cutover.

## DNS Provider Inventory Template

Fill this in before any DNS change:

```text
DNS provider / registrar:
Account owner / operator:
Current nameservers:

Current apex A records:
- name:
  value:
  TTL:

Current apex AAAA records, if any:
- name:
  value:
  TTL:

Current CNAME records:
- name:
  value:
  TTL:

Current GitHub Pages records:
- record:
  value:
  TTL:

Current www behavior:
- redirects to apex:
- serves separate site:
- CNAME target:

Cloudflare or proxy enabled:
- yes/no:
- proxied records:
- DNS-only records:

Email records that must not be touched:
- MX:
- SPF TXT:
- DKIM TXT/CNAME:
- DMARC TXT:

Other unrelated subdomains that must not be touched:
- name:
  purpose:
  record/value:
```

Future DNS action checklist:

1. Lower TTL before cutover if the provider supports it and the operator approves.
2. Record current DNS values before changing anything.
3. Add or replace apex record according to Vercel's dashboard instructions.
4. Add or replace `www` record according to Vercel's dashboard instructions.
5. Do not touch MX/TXT/email records.
6. Do not touch unrelated subdomains.
7. Verify DNS propagation.
8. Verify Vercel domain status.
9. Verify HTTPS certificate status.
10. Verify redirects and app routes.

Use the exact records Vercel shows in Project -> Settings -> Domains.

## GitHub Pages Rollback Readiness

Rollback assumptions:

- Root GitHub Pages files still exist.
- The old static site remains in the repository.
- Old auth/member/upload/moderation files remain available in the repository as rollback reference.
- GitHub Pages can be restored if DNS points back to its previous records.
- Do not delete legacy files until after post-cutover stabilization.

Rollback checklist:

1. Revert DNS records to the previous GitHub Pages values captured in the DNS inventory.
2. Restore Supabase Site URL and Redirect URLs to pre-cutover values if OAuth breaks.
3. Keep `https://mochirii.vercel.app` available for debugging.
4. Revert the latest risky PR only if a code regression is identified.
5. Confirm GitHub Pages production responds again.
6. Re-test `/auth` or the legacy workflow if rollback is needed.
7. Keep the rollback notes and timestamps in the incident handoff.

## Cutover Execution Plan

Do not execute this plan until the user explicitly approves cutover.

### Pre-Cutover

1. Run final Vercel production validation.
2. Verify Supabase Auth Site URL and Redirect URLs include the custom-domain plan.
3. Verify Discord OAuth callback remains the Supabase callback.
4. Screenshot/copy current DNS records.
5. Confirm rollback owner and expected rollback steps.
6. Optionally reduce DNS TTL if the provider supports it.
7. Confirm no unrelated DNS/email records will be touched.
8. Confirm the latest `main` deployment is Ready on Vercel.

### Cutover

1. Add `mochirii.com` to the Vercel project.
2. Add `www.mochirii.com` if desired.
3. Apply exact DNS records shown by Vercel.
4. Wait for Vercel domain verification.
5. Confirm HTTPS is active.
6. Confirm `mochirii.com` routes serve the Vercel app.
7. Confirm legacy `.html` redirects.
8. Confirm `/auth` OAuth returns to `https://mochirii.com/account`.
9. Confirm `/gallery-submit` and `/leader-dashboard` access behavior.

### Post-Cutover

1. Monitor browser console and network errors.
2. Monitor Supabase Auth and Edge Function logs.
3. Monitor Vercel deployment/runtime logs.
4. Keep GitHub Pages rollback path available.
5. Avoid deleting legacy static files.
6. After a stabilization period, plan cleanup separately.

## Post-Cutover Smoke Checklist

HTTP clean routes:

- `/`
- `/join`
- `/ranks`
- `/leaders`
- `/codex`
- `/events`
- `/announcements`
- `/raffles`
- `/gallery`
- `/spotlight`
- `/spotify`
- `/recruitment`
- `/twills`
- `/auth`
- `/account`
- `/gallery-submit`
- `/leader-dashboard`

Legacy redirects:

- `/index.html` -> `/`
- `/join.html` -> `/join`
- `/ranks.html` -> `/ranks`
- `/leaders.html` -> `/leaders`
- `/codex.html` -> `/codex`
- `/events.html` -> `/events`
- `/announcements.html` -> `/announcements`
- `/raffles.html` -> `/raffles`
- `/gallery.html` -> `/gallery`
- `/spotlight.html` -> `/spotlight`
- `/spotify.html` -> `/spotify`
- `/recruitment.html` -> `/recruitment`
- `/twills.html` -> `/twills`
- `/auth.html` -> `/auth`
- `/account.html` -> `/account`
- `/gallery-submit.html` -> `/gallery-submit`
- `/leader-dashboard.html` -> `/leader-dashboard`

Browser/auth checks:

- `/auth` renders Discord login UI.
- `/account` loads signed-out or authenticated account state without crashing.
- `/gallery-submit` enforces signed-out/unverified/active-member access.
- `/leader-dashboard` blocks signed-out and non-moderator users.
- Real Discord OAuth returns to `/account`.
- Browser console has no `Invalid supabaseUrl`.
- No empty image `src` warnings appear on public or Phase 3 routes.

Optional read-only helper:

```sh
npm run smoke:vercel-production
BASE_URL=https://mochirii.com npm run smoke:vercel-production
```

## Decision Gates Requiring User Approval

- Approving a cutover window.
- Adding custom domains in Vercel.
- Changing DNS records.
- Changing Supabase Auth Site URL or Redirect URLs.
- Changing Discord Developer Portal settings.
- Reducing DNS TTL.
- Removing GitHub Pages records.
- Removing root static files or legacy workflow files.
- Deleting or archiving rollback paths after stabilization.
