# Private Live Spinner Operations

The Mōchirīī raffle spinner is a native Website route at `/spinner`. The Website is its only production source: do not iframe, redirect, proxy to, or link to the retired standalone deployment.

## Access Modes

Both modes use the same URL and are authorized on the server before the stage is imported.

- **Controller:** a moderator enters through the authorized Leader Dashboard. The dashboard requests the exact `controller` intent, and the server delegates the role decision to the existing moderator authority. A viewer session can never promote itself by changing a cookie, header, URL, or client state.
- **Viewer:** an active, currently verified guild member enters through Account in exact `viewer` mode. A direct `/spinner` link works only while that short-lived private session remains valid; after it expires, the member re-enters through Account. Everyone else keeps the generic 404 surface with no private client or stylesheet preload.
- **Unauthorized:** the response is HTTP 404, `private, no-store`, and unbranded. It contains no spinner title, artwork, controls, stage stylesheet, analytics destination, or controller/viewer bundle.

Approval creates a rolling cookie whose lifetime is at most ten minutes and never exceeds the access-token expiry. It is `HttpOnly`, `Secure`, `SameSite=Strict`, and limited to `Path=/spinner`. The page and live proxy read that cookie on the server. Session authorization runs immediately, every five minutes, and when focus or visibility returns. Sign-out and session failure clear access; an expired controller returns to Leader Dashboard and an expired viewer returns to Account.

The route is dynamically rendered, `noindex`, `nofollow`, `noarchive`, excluded from the sitemap, and disallowed in `robots.txt`. The ordinary site header, footer, background layer, analytics, and performance telemetry are omitted. Its content-security policy permits only same-origin runtime connections.

## Controller And Viewer Surfaces

The controller can add, edit, delete, reorder, bulk-paste, clear, import, and export a 0–100-name live roster. Numbering and equal wheel segments always derive from current order. A draw requires 2–100 unique names and locks roster mutation until the stored result is revealed.

The viewer receives a separate lazy client bundle with the shared wheel, numbered roster, status, winner, and celebration. It has no button, input, select, form, link, mutation request, click handler, or editable control. Its Full, Reduced, or Off preference is saved from Account; Reduced is the safe default and the operating-system reduced-motion preference overrides Full. Reduced motion ends at the same authoritative reveal boundary, while Off holds the pre-draw angle and snaps only at reveal.

Full-screen mode is scoped to the controller's spinner container. Decorative canvases are hidden from assistive technology; roster, status, and winner remain persistent DOM text. Every effect run is bounded below five seconds, particle counts and device-pixel ratio are capped, and no production animation dependency is used.

## Live State, Privacy, And Retention

The browser speaks only to same-origin `/spinner/session` and `/spinner/live`. The live proxy forwards the short-lived user token and exact access intent to the protected backend; no service-role or bot credential reaches the browser.

Live synchronization necessarily sends the ordered participant roster from an authorized controller to protected server state. The active roster remains there until a moderator explicitly clears or replaces it. Frozen receipts and idempotency/recovery records also contain the relevant roster snapshot and may retain those names for up to 30 days after the active roster changes. Authentication requests and dispatcher invocations contain no roster or winner data, and outbound message payloads never contain the roster.

The backend keeps service-only, default-deny state for:

- the current ordered roster and wheel state, retained until explicit clear or replacement;
- immutable draw receipts, retained for exactly the bounded 30-day window even if the stage still displays that draw;
- idempotent command and delivery records, which may contain protected roster or winner recovery copies and are also removed after 30 days;
- a moderator authorization cache valid for no more than five minutes.

The controller also keeps a local roster backup, motion setting, pending idempotency key, and latest 100 receipts on the `mochirii.com` browser origin. Export anything that must outlive the 30-day server window or browser storage. Account deletion may null an operational actor reference, but must not rewrite a receipt's frozen draw data.

## Fairness And Synchronization

On Spin, the backend reserves an idempotent command, freezes the exact ordered roster, hashes it with SHA-256, and samples one unsigned 32-bit word at a time from the secure runtime random source. Rejection sampling discards out-of-range words and prevents modulo bias. The stored result is created once before animation; retries, dropped responses, repeated clicks, reduced/off motion, hidden tabs, animation failures, or Skip never resample it.

If processing is interrupted after command reservation but before the selected result is durably staged, that command ID becomes terminal and cannot be retried or resampled. The controller reports that no winner was retained and requires a new, explicit Spin action with a new command ID.

The server schedules a short lead-in and returns its current clock with every snapshot. Full viewers use the same animation start, duration, start angle, and final angle; late joiners use a negative animation offset instead of replaying the path faster. Reduced motion starts later but ends at the common reveal. Off and Skip do not point at the winning segment early.

Ordinary viewer responses withhold the selected index, winner, and receipt until reveal. This is presentation control, not cryptographic secrecy: a technically skilled authorized viewer can infer the target from the frozen roster and deterministic final rotation. Receipts make the selection arithmetic replayable, but they are not independently tamper-proof.

## Reaper Delivery

Every accepted draw creates one service-only outbox item for channel `1468667003366674721`.

1. Reaper posts one message containing the live-page link, with a stable enforced nonce and all mentions disabled.
2. At or after the authoritative reveal time, Reaper edits that same message ID with the sanitized winner, draw ID, and roster hash.
3. Rate limits and transient failures retry with bounded leases and backoff. Invalid channels, unsafe mentions, missing message IDs, or exhausted retries fail closed for operator review.

The stable nonce provides best-effort duplicate suppression during ordinary retries. Because the message service and database cannot share one atomic transaction, a prolonged outage after a successful post but before its message ID is stored can require operator reconciliation and may otherwise produce a duplicate start message.

The dispatcher never receives the participant roster. It receives only prebuilt start/result payloads, and the bot token remains in server-side function secrets. Detailed no-secret release prerequisites are in `supabase/functions/reaper-spinner-dispatch/README.md`.

## Approval-Gated Release

Source, tests, migration, and function code may be reviewed in a PR. The following remain separate owner-approved provider mutations:

- applying `20260726180052_add_private_live_spinner.sql`;
- deploying `spinner-live-session` and `reaper-spinner-dispatch`;
- setting `DISCORD_RAFFLE_CHANNEL_ID`, `REAPER_SPINNER_DISPATCH_SECRET`, or changing any existing bot secret;
- adding the matching Vault values used by scheduled dispatch;
- exercising the target channel or promoting a production deployment.

During an approved release, apply the migration and both functions from the same validated commit. Configure the channel allowlist to the exact target, generate a distinct dispatcher secret, and store the project URL and matching dispatcher secret in Vault as documented by the dispatcher runbook. Never paste secret values into source, PR text, logs, or command transcripts.

## Validation

From the repository root:

```powershell
npm ci
npm run toolchain:check
npm run check:private-spinner
npm run test:spinner
npm run check:live-spinner-backend
npm run test:live-spinner-backend
npm run check:supabase-edge-types
npm run check
npm audit --audit-level=moderate
git diff --check
```

From `apps/web`:

```powershell
npm ci
npm run toolchain:check
npm run lint
npm run build
npm run check:client-bundle
npm run check:font-bundle
npm run check:route-css-bundle
npm audit --audit-level=moderate
```

Preview validation must cover signed-out direct access, inactive/unverified members, an active verified viewer, an authorized moderator, exact-mode non-promotion, refresh/back navigation, expired or revoked access, focus/visibility recovery, all motion modes, Skip-before-response, late joins, mobile layout, fullscreen, dropped spin responses, and repeated clicks. Inspect the production network trace to prove the unauthorized 404 loads no spinner stage chunks and the viewer loads no controller chunk. Exercise post/edit delivery only after the exact channel action is approved.

## Standalone Cutover

Browser storage is origin-scoped, so standalone data does not migrate automatically.

1. Before retirement, export the existing standalone roster and every receipt that must be retained.
2. After the protected `main` release and provider changes are explicitly approved, import the roster through the controller at `/spinner` and run one disposable preview draw.
3. Verify viewer synchronization, controller receipt export, unauthorized 404 behavior, and the approved Reaper post/edit lifecycle.
4. Only after explicit owner confirmation, archive the standalone private repository read-only and disable or delete its owner-only deployment.

Do not leave redirects, embedded URLs, credentials, or production links to the retired origin. Asset provenance remains in `docs/integrations/spinner-asset-provenance.md`.
