# Event Social Publication Operations

## Scope and non-authorization

This runbook covers the reusable one-hour event reminders owned by the Website
repository. It does not authorize a merge, migration, function deployment,
secret change, destination activation, Discord send, Facebook Page post, or
Instagram publication. Each production mutation requires its own exact owner
approval.

The only public destinations are the pinned Mochirii Facebook Page, the pinned
`mochirii_guild` Instagram Business account, and the approved Mochirii Discord
announcement channel. There is no Facebook Groups API path. Public copy and
artwork contain no website link, domain, QR code, link prompt, or hashtag.

## Source contract

- Timing authority: `apps/web/public/data/guild-schedule.json`
- Reusable copy: `apps/web/public/data/event-social-content.json`
- Exact asset identities: `apps/web/public/data/event-social-assets.json`
- Server template projection: `supabase/functions/_shared/event-social-templates.ts`
- Scheduler and job schema:
  `supabase/migrations/20260731115926_add_event_social_publication_scheduler.sql`
- Foreign-key performance hardening:
  `supabase/migrations/20260801201945_add_event_social_foreign_key_indexes.sql`
- Immutable actor-retention hardening:
  `supabase/migrations/20260801210500_enforce_event_social_event_actor_retention.sql`
- Moderator disable/list endpoint: `manage-event-social-publication`
- Secret-authenticated worker: `run-event-social-publication`
- Moderator reconciliation endpoint: `resolve-event-social-publication-reconciliation`

The candidate source inventory is 49 configured Edge Functions: 31 with
`verify_jwt=true` and 18 with `verify_jwt=false`. Recalculate this inventory at
the exact reviewed release head; do not copy these counts into a provider
approval if the source has moved.

## Required preflight

Before any production change, capture a no-secret baseline and require all of
the following:

1. Exact reviewed commit and tree, clean status, protected-main review, and
   immutable Supabase and Vercel Preview results.
2. Exact migration allowlist and hosted migration readback. Never use
   `--include-all` or migration-history repair.
3. Exact configured-function inventory, deployed versions, and `verify_jwt`
   readback.
4. The event-social focused checks, including the isolated database test, Edge
   response contract, security hardening, and provider-mocked tests.
5. Twenty-four template rows: eight schedule event IDs by three destinations.
   Every row must initially be `approved=false` and `enabled=false`.
   Every template media path must contain the full SHA-256 of the exact public
   derivative, and that filename digest must match the sidecar and bytes.
6. Three destination rows, all `enabled=false`.
7. Every repository and Edge publication flag remains `false`.
8. Meta Graph is pinned to `v26.0`; Facebook resolves to the pinned Page;
   Instagram resolves to the pinned Business account and exact username; and
   Discord resolves to the pinned bot, guild, and channel.
9. No unresolved event-social reconciliation job exists.
10. The owner selected the one-time August 7 Breaking Army announcement as a
    manual-only action. The scheduler suppresses the August 5 Breaking Army
    reminder, creates no August 7 automated occurrence or reminder, and resumes
    the normal Wednesday reminder on August 12. A future automation change
    requires a newly reviewed occurrence override contract.

Do not print copy bodies, media hashes, provider identifiers, moderator user
IDs, tokens, secrets, raw provider responses, or Vault values in evidence.

## Secret and Vault prerequisites

Store values only in Supabase Edge Function secrets and Vault. Use name-only
inventory readback. Required names are documented in
`supabase/functions/.env.example`; committed values stay empty or `false`.

The foundation migration creates no cron job. A later, separately approved
one-minute database job requires:

- Vault `project_url`, exactly the Mochirii Supabase project URL;
- Vault `event_social_scheduler_secret`; and
- the same high-entropy value in Edge secret `EVENT_SOCIAL_SCHEDULER_SECRET`.

The scheduler secret does not authorize a destination by itself. The database
destination switch, event-specific Edge switch, provider-wide switch, exact
template approval, current schedule projection, provider configuration, and
atomic due-time gate must all agree.

## Deployment order

After separate exact approvals:

1. Keep every publication flag false and every database destination disabled.
2. Apply only the reviewed migration allowlist through the coordinated
   Supabase release operator.
3. Deploy the manager, scheduler, and reconciliation functions from the exact
   reviewed commit with their reviewed JWT classifications.
4. Read back migration identity, function version, function count, JWT parity,
   the absence of `event-social-publication-every-minute`, destination rows,
   and template rows. Do not invoke a provider.
5. Invoke the worker only in Preview with exact `{}` and the Preview secret.
   Require zero provider requests while all flags are false.
6. Stop with no production scheduler secret and no cron job. Scheduler
   activation is a separate release decision.

For a later scheduler activation, obtain exact approval for the Vault-name
installation and a separately reviewed `cron.schedule` change. Keep every
destination and publication flag false, revalidate the exact project URL and
secret-name parity, then read back exactly one
`event-social-publication-every-minute` job at `* * * * *`. With destinations
disabled, the tick may project future occurrences but cannot stage or publish
provider content. Any unexpected job, schedule, or function invocation fails
the activation gate.

## Exact reusable-template approval

Template approval is an owner/operator action; the moderator endpoint cannot
perform it. Review one immutable manifest containing all 24 rows. For each row,
verify the event ID, destination, final rendered caption examples, alt text,
media path, media SHA-256, schedule SHA-256, content SHA-256, and exact
`template_revision` in a private operator session.

For each approved row, call the service-role-only RPC
`set_event_social_template_approval` with:

```text
p_source_event_id       exact reviewed event ID
p_destination           facebook_page | instagram | discord
p_approved              true
p_enabled               true
p_expected_revision     exact reviewed template revision
p_actor_id               authenticated owner/operator user ID
p_confirm               true
```

Approve no row whose revision differs from the signed review manifest. Read
back exactly 24 approved-and-enabled templates and zero unreviewed enabled
templates. An account owning an active authorization must not be deleted:
disable destinations and revoke active templates first, then follow the
separately reviewed retention/deletion procedure for historical job evidence.
Historical publication-event actor references are immutable and explicitly
restrict deletion; never detach attribution by rewriting an audit event.

## Independent destination activation

Activate only one destination at a time, after a new explicit approval naming
that destination and the first genuine event occurrence.

1. Confirm no job is `reconcile_required` for the destination.
2. Validate provider identity and permissions read-only.
3. Set only the destination's event-specific Edge flag true. For Facebook and
   Instagram, also require the existing provider-wide flag; leave every other
   flag false.
4. Call service-role-only `set_event_social_destination_enabled` with the exact
   destination, `p_enabled=true`, the authenticated owner/operator ID, and
   `p_confirm=true`.
5. Read back the one enabled destination and the exact first due occurrence.
6. At the first genuine occurrence, require exactly one job, one provider
   mutation, one canonical provider identity, and one immutable audit result.
7. Observe the destination for 24 hours before approving normal operation or
   activating another destination.

Facebook posts only to the official Page. Any Page-to-Guild-group share is a
separate manual public action. Instagram stages one non-public container 15 to
10 minutes before the one-hour reminder and performs `media_publish` only in
the two-minute final gate. Discord uploads the reviewed file as an attachment
with its reviewed description and suppresses mentions.

## Emergency disable and rollback

At the first identity mismatch, unexpected public content, repeated provider
failure, or ambiguous public mutation:

1. Set the affected event-specific Edge flag false.
2. Use the moderator emergency-disable action or service-role RPC to set the
   database destination false.
3. Keep every job, occurrence, template revision, and immutable audit event.
4. Do not retry an ambiguous public mutation.
5. Inspect only the pinned provider account through the reconciliation path.

Application rollback does not reverse the forward-only migration. Use a
reviewed forward fix. Never redeploy a historical publisher against this
schema, delete audit rows, repair migration history, or hand-edit a job into a
retryable state.

## Reconciliation

The JWT-protected resolver derives destination and current job state on the
server. A moderator supplies the exact job ID, its current `updated_at`, one
bounded inspection note, explicit confirmation, and only the provider evidence
needed for the chosen result. The function then performs provider readback and
commits through the service-role-only reconciliation RPC.

- `confirmed_published` requires a verified canonical object owned by the
  pinned Page/account/channel. Instagram also requires the exact container ID
  already stored by the server.
- `confirmed_not_published` requires no stored or submitted provider identity.
  If an ambiguous Instagram `media_publish` retained its server container ID,
  the generic no-post resolution remains intentionally closed; keep Instagram
  disabled and use a separately reviewed provider-specific recovery change
  rather than erasing the container or guessing that no post exists.
- Both results are terminal, keep the destination disabled, reject stale
  revisions, and exclude notes and provider identifiers from public DTOs and
  immutable event details.

## Validation and evidence

Run:

```text
npm run check:event-social-schedule-parity
npm run check:event-social-content
npm run test:event-social-content
npm run check:event-social-assets
npm run test:event-social-assets
npm run test:event-social-schedule
npm run test:event-social-templates
npm run test:event-social-publishing
npm run test:event-social-reconciliation
npm run test:event-social-publication-db
npm run check:supabase-edge-types
npm run check:edge-response-contracts
npm run check:security-hardening
```

The database test must run only in a newly named isolated Supabase project with
unique ports. Never use shared ports `54321`–`54327` as release evidence.
Set `EVENT_SOCIAL_ISOLATED_PROJECT_ID` to a unique
`mochirii-event-social-*` name, set `EVENT_SOCIAL_PGTAP_DB_URL` to an explicit
password-free loopback PostgreSQL URL on the isolated port, and supply the
ephemeral password only through `EVENT_SOCIAL_PGTAP_DB_PASSWORD`. The guarded
test wrapper rejects remote hosts, implicit ports, embedded URL passwords, and
the shared port family before starting pgTAP.
Provider tests remain mocked or read-only until an independently approved
genuine canary. A green source check is not production verification.
