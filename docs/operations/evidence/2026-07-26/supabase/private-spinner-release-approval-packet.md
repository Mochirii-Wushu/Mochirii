# Private Spinner Production Release Approval Packet

Status: Approved by the release owner on 2026-07-26 for the exact reviewed
Mochirii PR #520 release. Execution remains conditional on a green exact-head
pull request, the protected `main` merge, and the stop conditions below.

This packet is public and contains no credentials, secret values, member data,
participant names, winner information, private exports, or signed URLs.

## Exact production effect

Squash-merging PR #520 adds the native private `/spinner` experience to the
Mochirii Website. Signed-out and ineligible requests remain opaque 404s. Active,
currently verified guild members may open an exact read-only viewer session.
Existing moderators may open an exact controller session from the authorized
Leader Dashboard. The page is excluded from public navigation, indexing,
analytics, and the ordinary site shell; authenticated eligible viewers receive
session-first links in the ordinary Account header menu and footer.

The connected production integration will apply
`20260726180052_add_private_live_spinner.sql` and redeploy all 33 Edge Functions
declared in `supabase/config.toml`, not only the two new spinner functions. The
migration creates the service-only live roster, draw, session, receipt, and
delivery-outbox state plus the two named schedules documented in
`docs/operations/private-spinner.md`. It does not alter raffle eligibility,
prizes, claims, fulfillment, public navigation, or unrelated application data.

The website deployment is built from the same protected merged source. No
iframe, redirect, proxy, standalone deployment URL, roster payload, winner
payload, service credential, or bot credential is added to browser-visible
source or network requests.

## Exact provider configuration authorized

The release owner approved only these release prerequisites and acceptance
actions:

1. Keep the existing bot credential unchanged and server-only.
2. Set `DISCORD_RAFFLE_CHANNEL_ID` to the exact approved channel
   `1468667003366674721`.
3. Generate a new high-entropy `REAPER_SPINNER_DISPATCH_SECRET` and store the
   same undisclosed value under the Vault name
   `reaper_spinner_dispatch_secret`.
4. Keep the existing `project_url` Vault value and production Git integration.
5. Allow the protected `main` merge to apply the migration, redeploy the 33
   configured functions, and publish the matching Website source.
6. Invoke the dispatcher once against an empty outbox and require a zero-claim,
   zero-send result.
7. Perform one disposable two-name production acceptance draw in channel
   `1468667003366674721`; require one link post and one winner edit of that same
   message ID with all mentions disabled.

No other channel mutation, role or permission change, command registration,
credential rotation, database deletion, public release, or unrelated provider
change is authorized by this packet.

## Pre-merge evidence

Record the following under ignored `.artifacts/operations` immediately before
merge:

- exact PR head, protected checks, mergeability, and Preview deployment state;
- current production Website deployment ID and source commit;
- current production migration inventory and zero spinner-table/schedule
  baseline;
- current production 31-function inventory and no-secret version/status
  readback;
- required extension presence, integration `main` branch, and enabled
  production-deploy setting;
- presence of the bot, channel, dispatcher, `project_url`, and matching Vault
  secret names without their values;
- current backup/recovery state and the accepted forward-fix boundary.

The project currently reports no managed backup. Therefore the migration must
remain additive and forward-only, the baseline evidence is mandatory, and a
schema defect must be repaired by a reviewed forward-fix migration. Do not
attempt an ad hoc destructive rollback.

## Release and readback

1. Require the exact PR head to pass all protected checks and both Preview
   integrations. Mark the PR ready only after the final diff is reviewed.
2. Squash-merge through protected `main`; do not deploy an unmerged worktree.
3. Serialize the release until both production integrations finish.
4. Confirm `20260726180052_add_private_live_spinner.sql` and the additive
   `20260726213000_add_spinner_foreign_key_indexes.sql` follow-up each appear
   exactly once, five spinner tables exist, both schedules exist once, RLS is
   enabled, and only the service role has table privileges.
5. Confirm all 33 configured functions report successful production
   deployments and that `spinner-live-session` and
   `reaper-spinner-dispatch` retain their reviewed authorization settings.
6. Confirm the Website deployment source matches the protected merge and that a
   signed-out direct request receives an opaque, private, no-store 404 without
   spinner HTML, chunks, artwork, metadata, header, or footer.
7. Confirm an exact viewer session contains no edit or draw controls and does
   not load the controller bundle. Confirm an exact moderator session exposes
   all roster, draw, receipt, motion, replay, removal, import, and export
   controls.
8. Require the empty-outbox gate before the single approved acceptance draw.
   Verify live synchronization, the one post/edit lifecycle, disabled mentions,
   completed receipt/outbox evidence, and cleanup of the disposable roster.
9. Import a retained standalone roster only if an owner export exists. Do not
   invent or reconstruct names. Standalone archival and deployment retirement
   remain a separate final confirmation because they are destructive cutover
   actions.

## Stop and recovery

Stop before merge if the exact-head Preview or a protected check fails, the
diff expands beyond this packet, the two release secret digests do not match,
the production integration is not bound to `main`, or the required bot/channel
configuration is absent.

After merge, stop the acceptance sequence on any migration, function,
authorization, privacy, rendering, synchronization, or delivery failure. Use
the fail-closed access and delivery pause in `docs/operations/private-spinner.md`.
Promote the previous Website deployment for an unsafe web surface and prepare a
protected forward-fix for database or function defects. Do not delete tables,
receipts, outbox evidence, schedules, functions, or migration history, and do
not retry an ambiguous external message.

## Approval recorded

The release owner approved the identified fixes and directed completion of all
remaining steps needed to make the raffle spinner live, including the exact
role-separated access, protected release, server-only channel delivery, and
production verification described here. That approval applies to PR #520 and
this packet's bounded provider effects only.

## Post-deploy hardening addendum

The production database advisor review after PR #520 identified the three
spinner moderator-audit foreign keys as lacking their own lookup indexes.
PostgreSQL does not create indexes automatically on the referencing side of a
foreign key. The release owner's direction to complete the approved fixes
therefore also covers the additive
`20260726213000_add_spinner_foreign_key_indexes.sql` forward fix. It creates
only these indexes and changes no access rule, row, function, schedule,
credential, channel, or product behavior:

- `spinner_commands_actor_id_idx` on `spinner_commands(actor_id)`;
- `spinner_draw_receipts_actor_id_idx` on
  `spinner_draw_receipts(actor_id)`;
- `spinner_live_state_updated_by_idx` on
  `spinner_live_state(updated_by)`.

Release it through a separate reviewed pull request and protected `main`, run
the full 48-assertion spinner database transaction against the migrated
Preview database, then require the production advisor to report no remaining
spinner foreign-key index finding. Do not apply it manually ahead of the
protected merge.
