# Mochirii Operator Index

This is the no-secret map for operating the live Mochirii stack. Start here when a task touches release readiness, production smoke, Supabase, Discord/Reaper, Mochi Social, Fly, Enjin, or rollback. This index does not approve live changes by itself.

Use the linked runbooks as the source of truth, then record only redacted status, command names, PR links, timestamps, and rollback targets in reports or private operator notes. Do not paste raw tokens, service-role keys, webhook URLs, cookies, private message content, payment details, wallet material, or browser authorization headers into Git, PR text, screenshots, reports, or chat.

## Current Live Surface

- Canonical live domain: `https://mochirii.com`.
- Production app: `apps/web`, deployed through Vercel from `main`.
- Retained rollback/reference surface: root static files, root `assets/`, root `data/`, and the tracked `CNAME`.
- Current posture index: `docs/current-live-state.md`.
- Deployment source of truth: `docs/deployment.md`.
- App-local operations: `apps/web/README.md`.

Run before deployment-sensitive work:

```sh
npm run check
git diff --check

cd apps/web
npm run lint
npm run build
```

## Release And Rollback

- Production release source of truth: `docs/deployment.md`.
- DNS, Vercel, static rollback, and same-window rollback checklist: `docs/dns-cutover-readiness-and-rollback.md`.
- Private approval packet template: `docs/dns-cutover-approval-packet.md`.
- Redacted full-stack release evidence: `reports/full-stack-release-evidence.md`.
- Historical live-site verification: `reports/live-site-verification-2026-06-07.md`.

Safe local evidence:

```sh
npm run check:full-stack-release-evidence
npm run check:production
npm run smoke:dns-cutover-post -- --base-url=https://mochirii.com --www-mode=redirect
```

Provider reads or hosted smoke checks should stay opt-in and no-secret. A provider dashboard or CLI mutation still needs a release packet unless the user gives fresh action-specific approval in the same work window.

## Vercel And Next

- Vercel/Next production settings: `docs/deployment.md`.
- App root, local dev, env names, observability scripts, route list, and rollback notes: `apps/web/README.md`.
- Current state and known deferred warnings: `docs/current-live-state.md`.

Operational boundaries:

- Vercel browser env may contain only public-safe `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL`.
- Do not add service-role keys, Discord bot tokens, OAuth client secrets, Enjin tokens, Wallet Daemon material, or payment data to Vercel browser env.
- Keep `https://www.mochirii.com` redirecting to the apex unless a separate DNS plan changes it.

## Supabase

- Supabase integration rules, project ref, RLS boundaries, Edge Function notes, and Discord bridge architecture: `supabase/README.md`.
- Auth/member workflow and profile/rank-role boundaries: `docs/member-profiles-and-rank-roles.md`.
- Production member QA and cleanup boundaries: `docs/member-workflow-production-qa-runbook.md`.
- Supabase cost and usage monitoring: `docs/supabase-cost-usage-runbook.md`.
- Manual Supabase parity checklist: `reports/supabase-manual-parity-runbook.md`.

Operational boundaries:

- Browser clients receive public keys only.
- Privileged work stays in Supabase Edge Functions, Vault, or the Supabase service-role runtime.
- RLS must stay enabled for browser-exposed tables.
- `service_role` access is for trusted backend/admin paths only.
- Do not run `supabase db push`, deploy Edge Functions, change secrets, or alter production data from this index alone.

## Discord And Reaper

- Reaper runtime health: `docs/reaper-runtime-health-checklist.md`.
- Discord event sync: `docs/reaper-event-sync-runbook.md`.
- Rank-role sync: `docs/reaper-rank-role-sync.md`.
- Pending-verification containment policy: `docs/reaper-pending-verification-containment.md`.
- Pending-verification activation and rollback packet: `docs/reaper-pending-verification-activation-packet.md`.
- Vote reminder safety and rollout: `docs/vote-reminder-runbook.md`.
- Discord/Reaper static parity evidence: `reports/discord-reaper-parity-2026-06-10.md`.

Operational boundaries:

- Discord native safety controls remain first: Rules Screening, Community Onboarding, AutoMod, Raid Protection, verification levels, role hierarchy, and moderator 2FA.
- Slash commands that mutate Discord must stay preview-first and owner/moderator approved.
- Reaper Gateway automation is a second gate after slash-command stability.
- Do not mirror unrestricted Discord message content.
- Do not store Discord bot tokens, webhook URLs, interaction tokens, or private conversations in reports.

## Gallery, Instagram, And Member Moderation

- Public Gallery behavior: `docs/gallery-guide.md`.
- Member Gallery moderation: `docs/member-gallery-moderation-runbook.md`.
- Member Gallery cleanup planning: `docs/member-gallery-cleanup-plan.md`.
- Instagram publishing deployment and manual-share boundaries: `docs/instagram-gallery-publishing-deployment-runbook.md`.

Operational boundaries:

- Approved public Gallery feed uses signed URLs from private Supabase Storage.
- Instagram sharing remains opt-in and moderator-controlled.
- Any completed private cleanup note, signed URL, Storage path, dashboard screenshot, or moderation evidence belongs outside the repo unless fully redacted.

## Mochi Social, Fly, And Enjin

- Website-side Alpha Preview Ready scope and gates: `docs/mochi-social-alpha.md`.
- Codex/operator rules for Mochi Social alpha: `docs/mochi-social-alpha-codex-ops.md`.
- Visual polish boundaries for the tester doorway: `docs/mochi-social-visual-polish.md`.
- Redacted Preview Ready evidence: `reports/mochi-social-preview-ready.md`.
- Mochi Social report hygiene: `reports/mochi-social-report-hygiene.md`.
- Browser gate evidence shape: `reports/mochi-social-browser-gates.md`.

Operational boundaries:

- Mochirii owns the website doorway, Vercel route, Supabase allowlist, terms, feedback, Discord OAuth/admin surface, and no-real-value labels.
- The separate Mochi Social game repo owns runtime gameplay, Fly hosting, RPGJS assets, game manifests, live presence, and Enjin runtime documents.
- Fly deploys, restarts, hosted checks, and tester invite waves need current game evidence and action-specific approval.
- Enjin stays preview-only as `configured-preview-stub` until cENJ, Fuel Tank, Wallet Daemon, collection IDs, and finality proof receive a separate funded-chain approval.
- Do not set dummy Enjin IDs, fund cENJ, create Fuel Tanks, start signer-connected Wallet Daemon work, or mark funded-chain gates green from this repo.

## Accessibility, Performance, And Security

- Accessibility route matrix: `reports/accessibility-route-matrix.md`.
- CSP inline hardening inventory: `reports/csp-inline-hardening-inventory.md`.
- Full-stack release evidence: `reports/full-stack-release-evidence.md`.
- Deployment security and CSP notes: `docs/deployment.md`.

Recommended starting checks:

```sh
npm run check:accessibility-route-matrix -- --write
npm run check:csp-inline-hardening -- --write
npm run check:full-stack-release-evidence -- --write
```

Manual browser evidence should cover keyboard order, focus-visible behavior, reduced motion, status messages, form errors, iframe titles, color contrast, route overflow, Core Web Vitals, and production console/CSP noise.

## Content And Page Guides

- Global content rules: `docs/content-guide.md`.
- Home and shell: `docs/home-shell-guide.md`.
- Join funnel: `docs/join-guide.md`.
- Events: `docs/events-guide.md`.
- Gallery: `docs/gallery-guide.md`.
- Ranks: `docs/ranks-guide.md`.
- Leaders: `docs/leaders-guide.md`.
- Codex: `docs/codex-guide.md`.
- Recruitment: `docs/recruitment-guide.md`.
- Side pages: `docs/side-pages-guide.md`.
- Twills/profile: `docs/twills-guide.md`.
- Future work queue: `docs/roadmap.md`.

Preserve protected copy boundaries in `AGENTS.md` and the page-specific guides. Keep exact game-name usage out of regular visible body copy except where the repository guidance allows it.

## Stop Lines

Stop and create a separate release packet before any of these actions:

- no live provider mutation without a same-window approval packet;
- no secrets in Git, PRs, reports, screenshots, logs, browser code, or chat;
- no production data deletion or broad rollback without a rollback owner;
- no payment entry, MFA/OTP entry, CAPTCHA solving, seed phrase, private key, wallet mnemonic, or Wallet Daemon passphrase handling;
- no funded-chain action, Enjin finality claim, cENJ funding, Fuel Tank creation, or signer-connected Wallet Daemon work without a separate funded-chain goal;
- no Discord message-content mirroring or unrestricted chat-log ingestion;
- no service-role key exposure to browser clients, public env vars, screenshots, or reports.

## Validation For This Index

This index is guarded by:

```sh
npm run check:operator-index
```

Refresh the redacted report after changing this file or moving runbooks:

```sh
npm run check:operator-index -- --write
```
