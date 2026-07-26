# Reaper spinner delivery

`reaper-spinner-dispatch` is the server-only outbox consumer for live Mōchirīī
raffles. It posts the live-page message once, stores the returned message ID,
and edits that same message with the result after the authoritative reveal
time. Protected browser-to-live command requests necessarily carry roster
data. Roster and winner data never enter dispatcher invocation requests or the
start-message payload; only the final edit includes the winner. All bot and
dispatcher credentials remain server-only.

## Release prerequisites

Provider changes remain approval-gated. During an approved Supabase release:

1. Apply `20260726180052_add_private_live_spinner.sql` and deploy
   `spinner-live-session` plus `reaper-spinner-dispatch` from the same validated
   commit.
2. Configure the Edge environment with `DISCORD_RAFFLE_CHANNEL_ID` set to
   `1468667003366674721`, the existing server-only `DISCORD_BOT_TOKEN`, and a
   new high-entropy `REAPER_SPINNER_DISPATCH_SECRET`. Never copy any of those
   values into the website, repository, logs, or a command transcript.
3. Store the canonical Supabase project URL in Vault as `project_url`. Store
   the exact same high-entropy dispatcher secret in Vault as
   `reaper_spinner_dispatch_secret`; the Edge environment and Vault values must
   be rotated together. The migration
   installs a five-second maintenance job using `pg_cron`, `pg_net`, and those
   Vault values. It also queues an asynchronous dispatcher call in the same
   transaction that creates an outbox row; network delivery begins only after
   commit and never delays the authoritative spin response. Do not put either
   value in migration SQL.
4. Run the dispatcher once with an empty outbox, then perform one approved
   preview draw. Verify that one message links to
   `https://mochirii.com/spinner` and that the same message ID is edited after
   reveal. Confirm no users, roles, `@here`, or `@everyone` were mentioned.

Claims use a 60-second lease and row locks with `SKIP LOCKED`. Start messages
use Discord's enforced nonce with a stable draw-derived value, limiting
duplicates if a successful HTTP response is lost. Rate limits and transient
server errors retry with a bounded delay; invalid payloads, denied channels,
missing message IDs, and exhausted attempts fail closed for operator review.
The nonce is best-effort idempotency across the external message service and
database, not an atomic exactly-once guarantee. If a post succeeds but its
message ID cannot be recorded through a prolonged outage, reconcile that draw
before retrying after the provider's nonce-deduplication window.

Attempts interrupted after reservation but before the selected result is
durably staged fail closed. An unstaged spin command is terminalized as
`spin_result_not_durable`, and a moderator must initiate a new command ID;
reusing that command ID can never invoke the random source again. If staging
committed but its response was lost, the frozen payload is retained and
replayed without resampling.

The ordinary viewer response withholds the selected index and winner until the
authoritative reveal time. This is presentation control, not cryptographic
secrecy: the frozen roster and deterministic final wheel rotation allow a
technically skilled observer to infer the target before the visible reveal.
Receipts make the selection arithmetic replayable but are not independently
tamper-proof.

No function deployment, Vault or function-secret mutation, database push, or
Discord request is performed by adding these source files. Applying the
migration during an approved release creates the scheduler source described
above.
