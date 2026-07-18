# GitHub Actions SHA-Pinning Approval Packet

Date: 2026-07-12

## Verified State

The repository-level Actions setting `sha_pinning_required` is currently
`false` for all three independent repositories:

- `Mochirii-Wushu/Mochirii`
- `Mochirii-Wushu/mochirii-pixelfed-ops`
- `xartaiusx/mochi-pets`

Website and Mochirii Social workflows already use reviewed full commit SHAs.
Mochi Pets PR #22 pinned Checkout, Setup Node, and CodeQL to reviewed full
commit SHAs, disabled persisted checkout credentials, added a policy guard,
passed CI and CodeQL, and merged to `main` at `398fd98`.

## Provider Action

Change only `sha_pinning_required` from `false` to `true` for the three
repositories above. Retain `allowed_actions: all` and every other Actions,
ruleset, token-permission, secret, environment, and visibility setting.

## Acceptance

- Each Actions permissions readback returns `sha_pinning_required: true`.
- Current `main` workflows remain valid and green.
- A temporary local validation fixture proves a tag-based external action is
  rejected by the repository guard; no provider workflow is intentionally
  broken to test enforcement.

## Rollback

If a reviewed pinned workflow is unexpectedly blocked, change only
`sha_pinning_required` back to `false`, capture the exact failing workflow and
reference, fix it through a focused PR, and re-enable enforcement after checks.

## Exact Approval

```text
Approve changing only the GitHub Actions sha_pinning_required setting from false to true for Mochirii-Wushu/Mochirii, Mochirii-Wushu/mochirii-pixelfed-ops, and xartaiusx/mochi-pets, while leaving allowed_actions as all and leaving all other repository, Actions, ruleset, permission, secret, environment, and visibility settings unchanged.
```
