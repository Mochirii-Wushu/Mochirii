# Live Member Workflow Result Packet Template

This template gives operators a sanitized private handoff after D02 or D03 live-member QA. It does not authorize DNS changes, dashboard changes, production mutation, upload/moderation mutation, or cutover by itself.

Keep completed packets in a private operator location. Do not commit completed packets unless every private value is removed. The private cleanup note may contain submission IDs and Storage paths, but this result packet must not.

The DNS rehearsal helper fails if tracked filenames look like completed live-member result packets, private D02/D03 evidence bundles, screenshots, cleanup notes, or operator artifacts. That guard is only a backstop; operators should keep completed packets and private evidence outside the repo from the start.

Validate the completed result packet before copying its safe status into the DNS cutover approval packet:

```sh
DNS_CUTOVER_PRIVATE_PACKET_DIR=/absolute/private/directory npm --silent run prepare:dns-cutover-private-packets
```

The preparation helper creates a private draft copy outside the repository. It does not create completed evidence, does not authorize D02, D03, or cutover, and does not print absolute paths.

For D03 cleanup identifiers, prepare a separate private cleanup-note draft before upload:

```sh
LIVE_MEMBER_CLEANUP_NOTE_PATH=/absolute/private/live-member-cleanup-note.md npm --silent run prepare:live-member-cleanup-note
```

The cleanup-note helper refuses repository-local output, writes only a Markdown draft, does not print absolute paths, and does not authorize upload, moderation, cleanup deferral, or cutover. Keep submission IDs, Storage paths, and any signed-URL handling details in that private note; copy only status-level cleanup text into this result packet.

```sh
npm run check:live-member-workflow-result-packet -- --packet=/path/to/private/completed-live-member-result.md
```

The checker reads a private local file and prints only pass/fail labels. It fails if the packet is tracked, if an in-repo packet path is not ignored by Git, if `Result: READY` lacks D02/D03 evidence, if D02 is not passed, if D03 is neither passed nor explicitly deferred with a rollback owner, or if obvious secret/private identifier values appear.

## Source Rules

- D02 must be non-mutating.
- D03 requires explicit human mutation approval and `QA_ALLOW_LIVE_MUTATION=true` in the local ignored QA file.
- Supabase Auth redirect URLs must match the app `redirectTo` plan.
- Supabase Storage and moderation must remain protected by RLS, private buckets, Edge Functions, and server-side secrets.
- Public docs, PRs, and issues may record only safe status, account type, route name, and cleanup status.

Primary references:

- Live member QA runbook: [`docs/member-workflow-production-qa-runbook.md`](./member-workflow-production-qa-runbook.md)
- DNS approval packet: [`docs/dns-cutover-approval-packet.md`](./dns-cutover-approval-packet.md)
- Supabase Auth redirect URLs: <https://supabase.com/docs/guides/auth/redirect-urls>
- Supabase Storage access control: <https://supabase.com/docs/guides/storage/security/access-control>
- Supabase Edge Function secrets: <https://supabase.com/docs/guides/functions/secrets>

## Packet Metadata

```text
Packet prepared by:
Prepared at:
Test window:
Operator:
Communication channel:
Result: READY / NO-GO
```

## D02 Evidence

```text
D02 strict preflight passed:
Vercel production review URL healthy:
Supabase redirect plan confirmed:
Discord callback confirmed:
D02 live OAuth/account smoke: passed / failed
Unverified account checked:
Verified active member checked:
Moderator account checked:
No D02 mutation performed:
No credentials exposed:
```

Stop if D02 fails, if credentials or account identifiers appear in public output, or if D02 requires upload, moderation, dashboard, schema, Edge Function, or provider changes.

## D03 Evidence

For a completed D03 run:

```text
D03 live upload/moderation smoke: passed
D03 mutation approval preflight passed:
One disposable upload only:
Pending item not public before moderation:
Moderator action completed:
Audit or moderation history checked:
Public gallery result verified:
```

For a deferred D03 run:

```text
D03 live upload/moderation smoke: deferred
D03 deferral reason:
D03 deferral explicitly approved:
If deferred, rollback owner:
```

Stop if D03 changes more than the approved disposable artifact, if the queue contains ambiguous real member content, if cleanup ownership is unclear, or if signed URLs/private Storage paths leak outside the private operator note.

## Cleanup Evidence

```text
Cleanup status: complete / deferred by owner
Cleanup owner:
Artifact identifiers kept in private operator note:
```

Use `Cleanup owner` only when cleanup is deferred. Do not paste submission IDs, Storage paths, signed URLs, or screenshots showing private operational details into this packet.

## Final Validation

Record pass/fail only:

```text
Post-QA validation passed:
No private identifiers exposed:
```

Expected validation after D02 or D03:

```sh
npm run check
git diff --check
npm run check:production
npm run smoke:vercel-production
npm run smoke:supabase-edge-functions
npm run smoke:supabase-auth-boundary
npm run smoke:gallery-approved-feed
npm run check:live-member-workflow-preflight
npm run check:cutover-validators
```

If Gallery behavior changed or cleanup touched public feed behavior, also run:

```sh
npm run smoke:gallery
```

## Public Result Summary

```text
Safe public D02 status:
Safe public D03 status:
Cleanup public status:
Ready for approval packet:
```

For `NO-GO`, record:

```text
No-go reason:
Next owner:
Next review date:
Current public surface remains:
```

Keep completed private packet details out of this repository unless they are fully redacted.
