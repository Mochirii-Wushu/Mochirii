# DNS Cutover Approval Packet Template

This template defines the final human approval packet for the future `mochirii.com` cutover from the current GitHub Pages custom-domain surface to the Vercel/Next.js production site.

Do not treat this template as approval. A completed packet must be reviewed during an approved window before any dashboard or DNS changes happen.

Completed packets may include dashboard screenshots, exact DNS record values, operator names, account labels, rollback contacts, or private cleanup notes. Keep completed packets in a private operator location, not in this repository, unless every sensitive value has been redacted.

The rehearsal helper fails if tracked filenames look like completed cutover packets, private evidence bundles, dashboard screenshots, or cutover-specific operator artifacts. That guard is only a backstop; operators should keep completed packets outside the repo from the start.

## Source Rules

- Vercel custom-domain records must come from the production-serving Vercel project's Domains dashboard or same-window `vercel domains inspect` output for the exact host.
- Cloudflare remains authoritative DNS unless a future migration explicitly says otherwise.
- Supabase Auth production redirects should use exact production paths for the final state.
- Supabase Storage and gallery moderation must remain protected by RLS, private buckets, Edge Functions, and server-side secrets.
- Discord OAuth callback remains the Supabase callback, not a Vercel or custom-domain callback.

Primary references:

- DNS runbook: [`docs/dns-cutover-readiness-and-rollback.md`](./dns-cutover-readiness-and-rollback.md)
- Live member QA runbook: [`docs/member-workflow-production-qa-runbook.md`](./member-workflow-production-qa-runbook.md)
- Vercel custom domains: <https://vercel.com/docs/domains/set-up-custom-domain>
- Cloudflare DNS TTL behavior: <https://developers.cloudflare.com/dns/manage-dns-records/reference/ttl/>
- Supabase Auth redirect URLs: <https://supabase.com/docs/guides/auth/redirect-urls>
- Supabase Storage access control: <https://supabase.com/docs/guides/storage/security/access-control>
- Supabase Edge Function secrets: <https://supabase.com/docs/guides/functions/secrets>

## Packet Metadata

```text
Packet prepared by:
Prepared at:
Approval meeting/window:
Cutover operator:
Rollback owner:
Communication channel:
Decision: GO / NO-GO
```

## Required Same-Window Commands

Run these before the approval decision:

```sh
npm run check:dns-cutover-rehearsal
npm run check
git diff --check
npm run check:production
npm run smoke:vercel-production
npm run smoke:supabase-edge-functions
npm run smoke:supabase-auth-boundary
npm run smoke:gallery-approved-feed
```

If the same-window check runs on a machine without browser smoke support, record why and name the machine or CI check that supplied equivalent evidence.

## Public State Evidence

Record pass/fail only unless the value is already public and safe:

```text
Current custom domain still pre-cutover:
Vercel production review URL healthy:
Legacy .html redirects healthy:
GitHub Pages rollback files present:
Cloudflare nameservers still authoritative:
ProtonMail records preserved:
Known accepted warning only:
```

Accepted warning:

- `assets/audio/mochiriiiiii.mp3` is intentionally above the asset-size warning threshold.

## Vercel Dashboard Evidence

Confirm in the production-serving project:

```text
Team/account:
Project name:
Project ID:
Root Directory:
Production Branch:
Framework:
Node.js version:
Production env names present:
Preview env names present:
mochirii.com domain present/ready:
www.mochirii.com domain present/ready or intentionally omitted:
Exact apex DNS instruction captured privately:
Exact www DNS instruction captured privately:
Certificate status:
```

Do not copy secret values. Env names may be recorded; encrypted or raw env values must not be pasted into docs, PRs, issues, or chat.

Stop if the dashboard project does not match the production-serving project from the runbook or if the dashboard DNS instructions do not match the same-window Vercel domain inspection.

## Cloudflare Dashboard Evidence

Capture before any approved DNS change:

```text
Account/zone:
DNSSEC state:
SSL/TLS mode:
Apex web records captured privately:
WWW web record captured privately:
Mail records untouched:
Verification TXT records untouched:
Unrelated subdomains reviewed:
Proxy setting for future Vercel web records:
TTL plan:
Rollback DNS records captured privately:
```

Do not touch MX, SPF/TXT, DKIM, DMARC, CAA, verification TXT, or unrelated subdomains during the website cutover.

Stop if exact pre-change web records are not captured, if unrelated records are ambiguous, or if the planned Vercel web records are not DNS-only unless a tested reverse-proxy exception has been explicitly approved.

## Supabase Evidence

Confirm in the Supabase dashboard:

```text
Project ref:
Project health:
Site URL before change:
Site URL planned after change:
Redirect URLs include Vercel production/review URL:
Redirect URLs include exact custom-domain production paths:
Discord provider still enabled:
Edge Function secret names/freshness checked:
No raw secret values copied:
```

For live-member workflow:

```text
D02 live OAuth/account smoke: passed / failed
D03 live upload/moderation smoke: passed / deferred
If deferred, rollback owner:
If D03 ran, cleanup status: complete / deferred by owner
```

Stop if D02 fails, if D03 is neither passed nor explicitly deferred with a rollback owner, if any service-role or secret key appears in browser/public output, or if signed URLs/private Storage paths are exposed outside the private operator note.

## Discord Evidence

Confirm in the Discord Developer Portal:

```text
Application:
OAuth callback remains Supabase Auth callback:
No callback changed to Vercel/custom domain:
Bot/guild role assumptions still match the live-member QA runbook:
```

Expected callback:

```text
https://deyvmtncimmcinldjyqe.supabase.co/auth/v1/callback
```

Stop if the callback has drifted or if role assumptions cannot be reconciled with the test identities.

## GitHub Pages Rollback Evidence

Confirm before cutover:

```text
GitHub Pages status:
GitHub Pages custom domain:
Tracked CNAME still present:
Root static files still present:
Rollback DNS values captured privately:
Rollback owner can restore DNS:
```

Do not remove the root static site, tracked `CNAME`, or GitHub Pages rollback path during the cutover window.

## Go / No-Go Decision

All items below must be true for `GO`:

```text
Same-window rehearsal and validation passed:
Vercel dashboard project and DNS instructions confirmed:
Cloudflare pre-change and rollback records captured:
Supabase Auth redirect plan confirmed:
Discord callback confirmed:
D02 passed:
D03 passed or explicitly deferred with rollback owner:
Rollback owner and communication path confirmed:
No secrets, tokens, private Storage paths, signed URLs, or private account identifiers exposed:
```

Mark `NO-GO` if any stop condition is triggered.

## Post-Decision Notes

For `GO`, record only safe public notes in PRs or docs:

```text
Cutover approved:
Approved by:
Window:
Rollback owner:
Live-member QA status:
Cleanup status:
```

After the approved DNS change and Vercel verification, run:

```sh
npm run smoke:dns-cutover-post -- --base-url=https://mochirii.com --www-mode=redirect
```

Use the approved `www` decision from the packet: `redirect`, `serve`, or `skip`.

For `NO-GO`, record:

```text
No-go reason:
Next owner:
Next review date:
Current public surface remains:
```

Keep completed private packet details out of this repository unless they are fully redacted.
