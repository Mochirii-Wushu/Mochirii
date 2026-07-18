# Mochi Pets Code-Scanning Note

Prepared: 2026-07-12 PDT

## Read-Only Finding

The newly pinned CodeQL workflow exposed three open high-severity alerts in
`xartaiusx/mochi-pets`:

- Alerts #2 and #3: `js/missing-rate-limiting` in
  `apps/game/src/entries/express.ts`.
- Alert #1: `js/incomplete-url-substring-sanitization` in
  `scripts/check-alpha-sync-approval-self-test.mjs`.

Dependabot and secret-scanning report zero open alerts. No alert was dismissed,
and no game runtime or contract code was changed during the website/APAC pass.

## Next Packet

Use a separate Mochi Pets security PR. First prove which Express routes are
network-reachable and whether an existing upstream or application limiter
already applies. Add the narrowest tested limiter only where needed. Repair the
URL allowlist check with parsed URL origin/host comparisons instead of substring
matching. Run the full game test/build suite and CodeQL before merge. Keep Fly,
Unity, Enjin, hosted runtime, secrets, and deployment untouched without a new
exact approval.
