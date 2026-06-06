# Live Member D03 Cleanup Note Template

This template gives operators a private working note for D03 live upload/moderation cleanup. It is not public evidence, does not authorize D03 mutation, does not approve cleanup deferral, and does not authorize DNS cutover.

Keep completed cleanup notes outside the repository. Do not paste raw values from a completed note into PRs, public reports, issues, chat, the live-member result packet, or the DNS approval packet.

Validate a completed private copy without printing values:

```sh
npm --silent run check:live-member-cleanup-note -- --note=/absolute/private/live-member-cleanup-note.md
```

The checker permits the submission ID and Storage object path that belong in this private note, but rejects obvious secrets, token assignments, database URLs, Discord webhooks, and signed Storage URLs.

## Metadata

```text
Prepared by:
Prepared at:
Test window:
Operator:
Communication channel:
Runbook section: D03 live upload/moderation smoke
```

## Approval Boundary

```text
D02 completed before D03:
Explicit D03 mutation approval:
QA_ALLOW_LIVE_MUTATION reviewed locally:
One disposable upload only:
Approved moderation decision:
Cleanup owner:
```

Stop before upload if approval covers more than one artifact, if a real member submission could be affected, or if cleanup ownership is unclear.

## D03 Artifact Identifiers

```text
Submission ID:
Storage bucket:
Storage object path:
Local image marker:
Title marker:
Caption marker:
Upload timestamp:
Moderation timestamp:
```

Do not store signed URLs unless there is a specific private incident need. If a signed URL is temporarily needed, record only where it is stored privately and when it expires.

## Moderation Decision

```text
Pending item confirmed not public before moderation:
Moderator account label:
Decision performed:
Queue or audit state checked:
Public approved feed checked:
Public result:
```

## Cleanup Action

```text
Cleanup status: complete / deferred by owner
Cleanup action performed:
Storage object removed or retained safely:
Database row removed, rejected, or retained safely:
Approved-feed visibility after cleanup:
Cleanup deferral owner:
Cleanup deferral reason:
Cleanup follow-up date:
```

## Cleanup Verification

```text
Post-cleanup Gallery route checked:
Post-cleanup approved feed checked:
Post-cleanup leader queue checked:
No unrelated artifacts changed:
No private identifiers copied into public docs:
```

## Public Status To Copy Elsewhere

```text
D03 public status:
Cleanup public status:
Safe note for result packet:
```

Only copy status-level text from this section into the live-member result packet or DNS approval packet.

## Stop Or Rollback Notes

```text
Stop condition observed:
Rollback owner:
Rollback action:
Communication sent:
Next review:
```
