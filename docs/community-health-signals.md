# Community Health Signals Matrix

This matrix defines the safe, aggregate signals Mochirii can use to understand whether the website-to-Discord community loop is healthy. It is an operator planning artifact only. It does not authorize schema changes, Edge Function deployment, Discord command apply, Fly deployment, Enjin funded-chain work, live data export, or any provider mutation.

The intent is to measure progress without mirroring Discord chat or exposing private member state. Every implementation path must keep raw identifiers, private content, and secrets out of browser code, public reports, pull requests, screenshots, and chat.

## Source Basis

- Discord Server Insights: <https://support.discord.com/hc/en-us/articles/360032807371-Server-Insights-FAQ>
- Discord Community Onboarding: <https://support.discord.com/hc/en-us/articles/11074987197975-Community-Onboarding-FAQ>
- Discord Rules Screening: <https://support.discord.com/hc/en-us/articles/1500000466882-Rules-Screening-FAQ>
- Discord Raid Protection: <https://support.discord.com/hc/en-us/articles/10989121220631-How-to-Protect-Your-Server-from-Raids-101>
- Supabase Row Level Security: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase API keys: <https://supabase.com/docs/guides/getting-started/api-keys>
- Supabase Securing your data: <https://supabase.com/docs/guides/database/secure-data>
- Supabase Edge Function secrets: <https://supabase.com/docs/guides/functions/secrets>
- WCAG status messages: <https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html>

## Non-Negotiable Boundaries

- Use aggregate counts, rates, time buckets, queue ages, and status totals first.
- Keep service-role work in Supabase Edge Functions, local operator scripts, or trusted server jobs only.
- Keep RLS enabled on exposed-schema tables and avoid direct browser grants for private operational tables.
- Never expose a service-role key, secret key, Discord bot token, webhook URL, OAuth secret, interaction token, cookie, raw header, signed Storage URL, or private Storage path.
- Store no Discord message content, no private conversations, no unrestricted chat logs, and no public member-specific Discord IDs in reports.
- Do not use Discord message content mirroring for health metrics.
- Do not publicly shame, list, or announce contained, pending, suspended, or inactive users; no public shaming belongs in community health reporting.
- Do not imply third-party vote completion; vote data is manual, track-only confirmation.
- Do not mark Enjin cENJ, Fuel Tank, Wallet Daemon, collection ID, or finality gates green from this matrix.
- Do not perform provider mutation from this matrix; no provider mutation belongs in report generation or health review.

## Signal Matrix

| Signal ID | Question | Source tables and systems | Safe aggregate view | Explicit stop lines | Review cadence |
| --- | --- | --- | --- | --- | --- |
| onboarding_completion | Are new website sign-ins moving through Discord verification and first useful account state? | `member_profiles`, `discord_sync_log`, Discord Community Onboarding and Rules Screening settings | Count sign-ins by week, count pending versus active profiles, median time from first account row to `discord_verified_at`, and redacted `role_check` status totals | No raw Discord IDs in public reports, no account emails, no OAuth tokens, no individual pending-user list | Weekly private operator review |
| verified_conversion | Are WWM-only members receiving verified access or staying stuck? | `member_profiles`, `discord_sync_log`, `discord_managed_permission_overwrites`, Reaper `/sync-pending-verification` preview output | Aggregate verified conversion rate, active containment row count, preview target count, conflict count, and cleanup count | No public shaming, no member-specific channel overwrite listing, no Discord apply from reporting | Weekly while containment is active |
| profile_setup | Are verified members completing useful opt-in profile fields? | `member_profiles`, profile media moderation functions, member profile runbook | Counts for active profiles, published profiles, profiles with safe display fields, approved avatar/banner counts, and missing-completeness buckets | No private profile media URLs, no rejected media previews, no raw user IDs, no emails | Monthly |
| gallery_participation | Are members safely contributing approved gallery content? | `gallery_submissions`, `gallery_moderation_events`, private `member-gallery` bucket, approved gallery feed function | Counts by status, category, upload source, opt-in Instagram job state, moderation queue age, and approval/rejection totals | No signed URLs, no private Storage paths, no pending/rejected image previews in reports, no private submission IDs outside operator notes | Weekly during active submission periods |
| event_heartbeat | Are website events and Discord scheduled-event links staying aligned? | `data/guild-schedule.json`, `discord_resources`, `/sync-events` preview/apply logs, public Events route | Counts of upcoming events, adopted Discord scheduled events, missing deep links, duplicate-retired counts, and stale schedule warnings | No event mutation from report generation, no webhook send, no private channel scrape | Before monthly schedule publish |
| vote_reminder_engagement | Are manual vote reminders being seen and acknowledged without automation? | `vote_reminder_sends`, `vote_confirmations`, Discord vote reminder commands | Reminder sent/skipped/failed totals, link count, manual confirmation count, streak buckets, and preview readiness | No vote-site automation, no CAPTCHA bypass, no browser clicks, no reward claim that external votes were accepted | Weekly if vote reminders are enabled |
| spotlight_participation | Is the monthly member spotlight loop healthy and fair? | `spotlight_poll_cycles`, `spotlight_poll_candidates`, `spotlight_poll_results`, public `get-current-spotlight-winner` endpoint | Cycle status, candidate count bucket, published winner month, send/finalize success, and void/failed counts | No raw vote totals publicly, no candidate list publicly, no Discord handles/profile links/avatar exposure from private tables | Monthly |
| discord_resource_hygiene | Are Reaper-managed Discord references fresh and non-secret? | `discord_resources`, `discord_sync_log`, Reaper parity checks | Enabled resource counts by kind, stale managed rows, missing public/deep links, and redacted sync outcomes | No webhook URLs, no private channel content, no unrestricted message content | Monthly |
| moderation_throughput | Are moderator queues manageable without exposing private content? | Gallery, profile media, Instagram queue, Leader Dashboard Edge Functions | Queue counts, oldest pending age, action totals by queue type, and failure counts | No screenshots with private member data, no raw submission IDs in public reports, no private signed previews | Weekly |
| mochi_social_alpha_health | Are testers reaching the preview safely without implying funded-chain readiness? | Mochi Social alpha allowlist, terms, feedback/audit rows, `/games/mochi-social`, Fly game contract reports | Tester access counts, terms accepted count, feedback count, blocked/error buckets, iframe contract state, and game health state | Keep Mochi Social as configured-preview-stub, no real value, no funded-chain gate clearing, no cENJ/Fuel Tank/Wallet Daemon actions | Before tester waves |

## Visibility Model

Private operator reports may include aggregate counts, pass/fail status, route names, queue age buckets, source system names, and redacted operational errors. They may not include raw Discord IDs, emails, private Storage paths, signed URLs, cookies, access tokens, service-role keys, secret digests, webhook URLs, raw headers, or Discord message content.

Moderator-only dashboards may show scoped per-row detail only when needed to operate a queue, and only through existing authenticated/server-side authorization paths. Public website surfaces should expose only already-approved public outcomes, such as approved gallery items, public event pages, published Spotlight winner names/months, or high-level non-identifying community stats after a separate privacy review.

## Implementation Ladder

1. Keep this matrix and its generated report as the shared source of truth.
2. Add a dry-run local operator script that reads private tables with a local service-role key and prints only aggregate counts.
3. Move recurring privileged reads into a Supabase Edge Function with server-side authorization and redacted logs.
4. Add a moderator-only Leader Dashboard panel after the function has static tests and no-secret smoke coverage.
5. Consider public aggregate snippets only after a separate design, privacy, accessibility, and Core Web Vitals review.

Each step must be reviewed independently. Live Supabase, Discord, Fly, Vercel, or Enjin mutations require their own release packet.

## Related Local Runbooks

- Supabase integration: [`../supabase/README.md`](../supabase/README.md)
- Member workflow QA: [`member-workflow-production-qa-runbook.md`](./member-workflow-production-qa-runbook.md)
- Vote reminders: [`vote-reminder-runbook.md`](./vote-reminder-runbook.md)
- Pending verification containment: [`reaper-pending-verification-containment.md`](./reaper-pending-verification-containment.md)
- Mochi Social alpha ops: [`mochi-social-alpha-codex-ops.md`](./mochi-social-alpha-codex-ops.md)
- Full-stack release evidence: [`../reports/full-stack-release-evidence.md`](../reports/full-stack-release-evidence.md)

## Acceptance Checks

Run the static guard before merging work that adds, removes, or changes health signals:

```sh
npm run check:community-health-signals
```

When refreshing the redacted report:

```sh
npm run check:community-health-signals -- --write
```

The generated report must remain no-secret, no-provider-mutation, aggregate-first, and aligned with the current Supabase/Discord/Reaper/Fly/Enjin boundaries.
