# Supabase Cost Usage Runbook

Date checked: 2026-05-14

This runbook gives leaders a safe way to monitor Supabase usage for the member Gallery, Discord verification, approved Gallery feed, and moderation workflows. It is operational guidance, not a billing quote. Before making billing or quota decisions, check the current Supabase dashboard and the live Supabase pricing/docs pages.

Do not paste secrets, tokens, private Storage paths, signed URLs, member identifiers, or invoice screenshots into public issues, Discord channels, reports, or docs.

## Current References

Official Supabase references checked for this runbook:

- Pricing: <https://supabase.com/pricing>
- Cost controls and Spend Cap behavior: <https://supabase.com/docs/guides/platform/cost-control>
- Storage size usage: <https://supabase.com/docs/guides/platform/manage-your-usage/storage-size>
- Egress usage: <https://supabase.com/docs/guides/platform/manage-your-usage/egress>
- Monthly Active Users usage: <https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users>
- Storage file limits: <https://supabase.com/docs/guides/storage/uploads/file-limits>
- Metrics API: <https://supabase.com/docs/guides/telemetry/metrics>
- Metrics API with Grafana Cloud: <https://supabase.com/docs/guides/telemetry/metrics/grafana-cloud>
- Metrics API with Prometheus and Grafana: <https://supabase.com/docs/guides/telemetry/metrics/grafana-self-hosted>
- Vendor-neutral Metrics API setup: <https://supabase.com/docs/guides/telemetry/metrics/vendor-agnostic>
- Supabase changelog index: <https://supabase.com/changelog.md>

The 2026-05-14 changelog scan did not show a G13 blocker for member Gallery cost monitoring. Recent platform notes still matter for future work: Postgres 14 support ends on 2026-07-01, Supabase is dropping Node.js 20 support, and Edge Function recursive/nested call limits should remain in mind if future functions call other functions.

## What Can Drive Usage

Mochirii's live public site is served by the Vercel/Next.js app in `apps/web`; root static files remain rollback/reference material. Static page views, public static assets, CSS, JavaScript, and audio files are served by the site host, not Supabase.

Supabase usage comes from the member workflows:

- Auth: Discord OAuth sign-ins and active member sessions.
- Database: `member_profiles`, `gallery_submissions`, `gallery_moderation_events`, `discord_resources`, and `discord_sync_log`.
- Storage: private `member-gallery` image objects for pending, approved, rejected, and archived submissions.
- Edge Functions: `verify-discord-member`, `list-gallery-review-queue`, `moderate-gallery-submission`, `list-approved-gallery-submissions`, `submit-discord-gallery-image`, `list-instagram-publish-queue`, `mark-instagram-gallery-submission-shared`, and `publish-instagram-gallery-submission`.
- Egress: Auth/API responses, Edge Function responses, and Storage signed URL image delivery.
- Logs: function logs, moderation troubleshooting, and dashboard observability.

Expected normal use is small, human-paced, and tied to guild activity. Runaway use usually looks like sudden public approved-feed traffic, repeated verification attempts, automated upload attempts, Instagram queue retries, unexpected Storage growth, or repeated function errors.

## Current Member Gallery Policy

The active upload policy from the repo and production review is:

- Bucket: `member-gallery`
- Bucket visibility: private
- Browser and bucket upload cap: `50 MB` / `52428800` bytes
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
- Public Gallery delivery: approved submissions only, through short-lived signed URLs returned by the approved-feed function
- Pending, rejected, and archived submissions: not listed in the public Gallery

Do not make the bucket public to reduce complexity. That would change the privacy model and must be handled as a separate security-reviewed branch.

## Dashboard Checks

Use read-only dashboard checks unless a separate approved task explicitly authorizes mutation.

Check these at least monthly, and immediately after high-traffic guild events:

- Organization usage page: total usage for the current billing period.
- Billing page: upcoming invoice estimate, quota warnings, and Spend Cap state.
- Storage usage: `member-gallery` size and object growth.
- Egress usage: total egress, cached/uncached egress, and service breakdown where available.
- Edge Function metrics: invocations, errors, latency, and unusually noisy routes.
- Auth usage: Monthly Active Users and OAuth sign-in volume.
- Database size: table growth for member and moderation tables.
- Logs: repeated `401`, `403`, `429`, `5xx`, or signed URL failures.
- Metrics API dashboards, if configured through [`supabase-metrics-observability.md`](./supabase-metrics-observability.md): database CPU, IO, WAL, connection saturation, disk growth, and long-running transaction signals.

Safe dashboard actions:

- view usage charts
- filter by project/time period
- inspect function logs with private values redacted
- compare current use to the last monthly review
- export a redacted summary for internal planning

Do not perform these from a routine cost check:

- `supabase db push`
- `supabase functions deploy`
- direct Storage object deletion
- table row deletion or manual status edits
- secret changes
- plan upgrades, add-ons, Spend Cap changes, or billing mutations
- log drain setup, paid observability add-ons, or external collector changes

Those require explicit owner approval and a scoped branch or admin task.

## Thresholds

Use these bands to decide whether to keep observing or escalate.

Normal:

- Storage grows only when members upload images.
- Approved-feed traffic follows normal public Gallery traffic.
- Function invocations roughly match sign-ins, queue checks, moderation actions, and Gallery approved-feed loads.
- Function errors are rare and tied to expected signed-out or unauthorized states.
- Monthly Active Users resemble the current active Discord/member population.

Watch:

- Storage grows faster than known member upload activity.
- Many files sit in pending or rejected states for more than a review cycle.
- `list-approved-gallery-submissions` invocations jump after public sharing.
- `publish-instagram-gallery-submission` retries repeat after a Meta or credential failure.
- `verify-discord-member` calls spike without a matching guild event.
- Function `429`, `5xx`, or signed URL errors repeat.
- Egress rises without a matching public traffic explanation.
- Billing dashboard shows quota or overage warnings.

Stop and escalate:

- A secret, service role key, bot token, private Storage path, or long-lived signed URL appears in a public place.
- Storage grows from unknown prefixes or unknown users.
- The private bucket becomes public.
- Protected functions accept anonymous mutation requests.
- Billing shows unexpected overage risk or runaway usage.
- Fixing the problem appears to require database mutation, Storage deletion, Edge Function deployment, or secret rotation.

## Cleanup Implications

Storage cleanup must be planned carefully because database rows, private objects, moderation events, and public signed URL behavior are linked.

- Deleting a `gallery_submissions` row alone does not prove the Storage object was removed.
- Deleting a Storage object alone can leave a row whose preview or approved feed no longer works.
- Rejected and archived submissions remain private but may still consume Storage.
- Approved submissions may be visible in the public Gallery until their status or object state changes through the approved admin path.
- Moderation events are accountability records and should not be rewritten as routine cleanup.

If cleanup is needed, use `docs/member-gallery-cleanup-plan.md` once G14 exists. Until then, escalate cleanup as a scoped admin task and avoid ad hoc production deletion.

## Normal Review Checklist

Monthly:

1. Open the Supabase organization usage page.
2. Check Storage size and egress for the Mochirii project.
3. Check Edge Function invocation and error trends.
4. Check Auth Monthly Active Users.
5. Check database size for member/gallery tables.
6. Review whether pending/rejected/archived submissions are accumulating.
7. Record a redacted summary in the relevant internal tracker.

After a guild event or traffic spike:

1. Check `list-approved-gallery-submissions` invocation volume.
2. Check egress and public Gallery traffic timing.
3. Check function error logs for repeated signed URL failures.
4. Check whether new uploads match known member activity.
5. If growth is abnormal, stop and open a scoped QA/admin branch.

## Incident Response

For unexpected usage:

1. Capture the symptom: affected service, time window, rough magnitude, and dashboard page.
2. Redact all private values before sharing.
3. Confirm whether public site traffic, Discord event activity, or moderation work explains the change.
4. Inspect function logs without copying tokens or private identifiers into public channels.
5. If a bug is likely, open a scoped QA branch and reproduce locally or with safe mocks.
6. If data mutation is needed, stop and get explicit owner approval.

For suspected credential exposure:

1. Stop routine work.
2. Do not paste the credential into chat, docs, reports, or PRs.
3. Rotate the secret from the trusted provider/dashboard.
4. Review affected logs and function access.
5. Open a security report branch only after the secret is rotated or redacted.

## Safe Command Boundary

Safe read-only commands may include:

```sh
supabase --version
supabase status --help
supabase functions list --project-ref deyvmtncimmcinldjyqe --output json
supabase secrets list
```

Read-only SQL or dashboard checks are acceptable only when credentials are already available and the current task authorizes inspection. Do not include query output containing private member data in public reports.

Do not run without explicit approval:

```sh
supabase db push
supabase functions deploy
supabase migration new
supabase secrets set
```

Do not run Storage deletion or table mutation commands from this runbook.

## Supabase Metrics API Boundary

The Supabase Metrics API is an operator-only monitoring lane, not a browser or game feature. The production endpoint shape is:

```text
https://deyvmtncimmcinldjyqe.supabase.co/customer/v1/privileged/metrics
```

Authenticate with HTTP Basic Auth using `service_role` as the username and a dedicated Supabase Secret API key such as the documented `sb_secret_...` key class as the password. Store the key only in Grafana Cloud, a private Prometheus secret manager, or another approved operator secret store. Keep the scrape interval at 60 seconds unless Supabase updates its guidance. Do not put metrics credentials in `NEXT_PUBLIC_*`, Vercel browser env vars, Mochi Social game runtime env, screenshots, reports, PR text, Discord, or chat.

Log drains are separate from Metrics API dashboards and can be plan-sensitive or cost-bearing. Do not enable log drains from this runbook without a later approved provider-action plan.

## Definition Of Healthy

The member Gallery cost posture is healthy when:

- the site remains static and browser-safe
- the `member-gallery` bucket remains private
- uploads stay capped at 50 MB and image-only MIME types
- approved public images are served through short-lived signed URLs
- protected functions fail closed for anonymous users
- usage growth matches member activity
- dashboard checks show no quota, invoice, or error surprises
- cleanup decisions are planned before Storage is deleted

