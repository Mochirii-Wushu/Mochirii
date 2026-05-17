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

Latest readiness verification before this document:

- Vercel production URL: `https://mochirii.vercel.app`
- Deployment ID: `dpl_vSg6q5gP4PFw35wGKfpm7o4B1J8i`
- Target: `production`
- Commit: `f5e7d98`
- Status: `Ready`
- Build result: success

Warnings to keep in view:

- `assets/audio/mochiriiiiii.mp3` exceeds the local asset-size warning threshold by design; preserve it as-is unless a later approved task explicitly changes the audio policy.
- Hosted Vercel build logs may show an `outputFileTracingRoot` / `turbopack.root` warning. The current production deployment still builds successfully and is Ready.
- Vercel Development env is intentionally not a cutover gate. Production and Preview envs are the relevant deployed environments.

## Readiness Checklist

Before cutover approval, confirm:

- Vercel production at `https://mochirii.vercel.app` is Ready.
- Vercel production serves all clean public routes with HTTP 200.
- Vercel production redirects all legacy `.html` routes to clean routes.
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

Eventual Site URL after cutover:

- `https://mochirii.com`

Redirect URLs should include:

- `https://mochirii.com/**`
- `https://www.mochirii.com/**`
- `https://mochirii.vercel.app/**`
- `https://*-mochirii.vercel.app/**`
- `http://localhost:3000/**`

Exact final route targets recommended:

- `https://mochirii.com/auth`
- `https://mochirii.com/account`
- `https://mochirii.com/gallery-submit`
- `https://mochirii.com/leader-dashboard`

Keep Vercel and local URLs during the transition until rollback risk is gone.

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
