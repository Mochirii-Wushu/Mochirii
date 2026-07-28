# Mōchirīī Organization Reconciliation Ledger — 2026-07-27

This public-safe ledger records the exact source and governance baseline used to
reconcile the repositories owned by `Mochirii-Wushu`. It contains no secrets,
host addresses, private provider exports, member data, or credential values.
Provider state and branch heads are mutable and must be read back again at each
release gate.

## Repository Baseline

| Repository | Visibility/state | Default branch and exact SHA | Current work | Latest recorded `main` workflow | Production ownership and merge effect |
| --- | --- | --- | --- | --- | --- |
| `Mochirii-Wushu/Mochirii-Website` | Public, active | `main` at `21f195458a87ae96eea84af51d0e1420b770ca74` | PR #534 is released; conflicting PR #532 is closed unmerged; reviewed Social replacement PR #535 is the only open organization PR and remains production-gated; issues #443 and #475 remain classified trackers | PR #535 exact-head repository, CodeQL, Vercel, Supabase Preview, and Social production-image checks: success before the current documentation reconciliation | Owns Website, Shopify theme, Social source, and Supabase. Protected-`main` merges publish Website through Vercel and invoke the connected Supabase deployment. Social-source merges also publish an immutable GHCR image; neither Shopify nor DigitalOcean is deployed automatically. |
| `Mochirii-Wushu/Mochirii-Social-Mobile` | Private, active/dormant | `main` at `7e840fe337a425b659b065abf7e04e5256614cba` | PR #17 closed unmerged at preserved head `2bcab5e7f58ebcae087dc07de81ca15fcd20a2e4`; issue #9 is classified | Dependency workflow run `30242819447`: success | Source validation only. No Apple build, submission, or provider mutation follows from `main`. |
| `Mochirii-Wushu/Mochirii-Pets` | Private, active/dormant | `main` at `09357c0432bf6aeb55742a27699110f0a0cb76ac` | Issue #3 is classified as dormant future work | Dependency workflow run `30273752691`: success | Fresh future Unity source only. No hosted runtime, deployment, Apple submission, or recurring provider cost. |
| `Mochirii-Wushu/Reaper` | Private, active | `main` at `79023914ee5c6502520b88aebe861904af9c2472` | PR #7 merged from reviewed head `8179c80af5a16c14911a99f6d199edbbe834116e`; only `main` remains | CI run `30329689062`: success | The source merge ran CI only. It did not deploy the Discord Gateway worker or send a Discord message. |
| `Mochirii-Wushu/Mochirii-Raffle-Spinner` | Private, archived | `main` at `95e917357517faeb43be9e2da6551baec213aed8` | No PRs or issues; two historical Dependabot branches are intentionally retained | Dependency workflow run `30231800839`: success | Historical source only. No current deployment or schedule depends on this repository. |

Private-repository plan limits leave Social Mobile, Mochi Pets, Reaper, and the
archived spinner without enforceable branch protection. Their review and CI
gates remain procedural. The Website rulesets require current successful
`validate`, `validate-next`, `validate-theme`, `validate-social`, `Vercel`, and
`Supabase Preview` contexts. The ruleset currently permits an owner bypass and
does not require an approving review, so releases must explicitly refuse the
bypass and record accountable review.

## Remote Branch Classification

### Website

- `agent/member-profile-links` at
  `36c27cf9608f9620ecb2035ddef0297d4c4b1a6b`: merged into current `main`;
  remove after final patch-parity readback.
- `agent/raffle-winner-flair` at
  `7cbda0d81eadbbebf52f77e36a859292c0cda764`: merged through PR #533;
  remove after final patch-parity readback.
- `agent/web-runtime-performance` at
  `4c9ff637e455984b5bb8776eb2f6c2fae6354e1c`: merged through PR #533;
  remove after final patch-parity readback.
- `fix/universal-lightbox` at
  `73e17b945b09f7ba4806880c0182b50b943e8de5`: merged through PR #533;
  remove after final patch-parity readback.
- `agent/social-reliability` at reviewed head
  `4f157d7c1adc7ba530044c35a83c12c102fd9810`: PR #532 was closed unmerged and
  the remote branch was deleted after PR #535 proved replacement traceability
  and passed exact-head checks and both provider previews.
- `agent/social-hardening-replacement-20260727`: active PR #535. Preserve until
  its separately authorized production merge and post-release readbacks are
  complete; use the pull request as the authoritative exact-head record.

### Other repositories

- Social Mobile has only `main`; the closed PR #17 branch was removed after its
  pull-request head remained retrievable.
- Mochi Pets has only `main`.
- Reaper PR #7 merged as `79023914ee5c6502520b88aebe861904af9c2472`.
  Its final tree exactly matches reviewed head
  `8179c80af5a16c14911a99f6d199edbbe834116e`; push CI passed. The reviewed
  branch and superseded legacy head
  `79fbabd9bd0c0528d7c0f331d195088c3410dcff` were deleted only after both PR
  heads remained retrievable. Reaper now has only `main`.
- The archived spinner retains
  `dependabot/github_actions/main/github-actions-901392d03b` at
  `46fe90ceeea592888eec49b9135ef8f43dcd9f0e` and
  `dependabot/npm_and_yarn/main/npm-dependencies-7fdb227275` at
  `29372056a6e75966694664ea120ea14a36242c45` as immutable historical
  references. Do not unarchive the repository merely to remove them.

## Issue Classification

The following open issues are intentional records, not incomplete current
releases. Each issue contains its owner, risk, activation trigger, and next
review date:

- Mochi Pets #3: dormant future Unity validation.
- Social Mobile #9: tracked Expo/React Native/Jest toolchain advisory paths.
- Website #475: tracked Vue 2/Laravel Mix Social modernization.
- Website #443: tracked ESLint 10/TypeScript 7 ecosystem compatibility.

They must remain open until their documented acceptance criteria are met; they
must not be closed merely to produce a zero issue count.

## Local Website Worktrees

The 2026-07-27 audit recorded 28 Website worktrees: 22 clean and 6 dirty. No
worktree, ref, credential, or archive was changed during that audit.

### Active integration lanes

- `Website-reliability-20260727` at
  `2b78b228de33c78dad548a12557e7e953d009005`: superseded local preparation;
  the reviewed reliability lane merged through PR #534 and must pass final
  patch-parity proof before this worktree is removed.
- `Website-social-hardening-replacement-20260727`: active Social replacement
  PR #535 based on current `main` at
  `21f195458a87ae96eea84af51d0e1420b770ca74`. Use the pull request head as the
  authoritative release identity and rerun every exact-head gate after changes.
- `Website` at `b41fb46b987bde86a70add27e612a0a492e441cb`: intentionally dirty
  Social OAuth source material; preserve until the Social replacement is
  reviewed and merged.
- `Website-identity-cleanup` at
  `5b2ad686c9c4bf47035893b170ea8d3d659fd4ea`: temporary clean `main`
  holder; remove only after the canonical `Website` path safely becomes the
  clean `main` checkout.

### Proven merged or superseded

These worktrees have recorded exact-tree or patch-parity evidence and are
eligible for cleanup only after the owning replacement release is complete:

- `Website-branded-404` — `d268f96bf7785799718e5d2ee329017740af63df`.
- `Website-ci-toolchain` — `5c47ef49a3e01421f7039b15ff89ecbe750f2fbf`.
- `Website-gallery-performance-20260727` — `73e17b945b09f7ba4806880c0182b50b943e8de5`.
- `Website-mochi-pets-doorway` — `6c8ecc1350a2b8836b6702f04053d95f3ce3c76f`.
- `Website-playwright-1.62` — `c3bebace81788c2249ee9e4c90159b9ff537af46`.
- `Website-playwright-1.62-reviewed` — `630a1bd86ff48ca05947de57386cacd8bb8d966d`.
- `Website-profile-links-20260727` — `36c27cf9608f9620ecb2035ddef0297d4c4b1a6b`.
- `Website-public-pages-release` — `7697f46a3151aac1cf332e13af3090d52fad6a26`.
- `Website-raffle-public` — `f2feb1c10fa97bf56a2da8682f14e7677ebc7ee1`.
- `Website-raffle-public-final` — `ece6640243d2254b795415ff428d9e80dea197cd`.
- `Website-raffle-winner-flair-20260727` — `7cbda0d81eadbbebf52f77e36a859292c0cda764`.
- `Website-recovery-tooling` — `fbe03bd3c8dc5ab432f286177bea3e9090022817`.
- `Website-release-integration-20260727` — `c048073b4108d40c099c843dcc702b8ef47d1dda`.
- `Website-social-release-integration-20260727` — `2cd4c63f3a709aa63e44f6cdf69556627e2b354f`.
- `Website-social-reliability-20260727` — `4f157d7c1adc7ba530044c35a83c12c102fd9810`.
- `Website-supabase-edge-lock` — `b16064a4b76a2b50af7fccdc16afeece1a8e2960`.
- `Website-tooling-security` — `a0d1fa0367c1bcf29827fca2f9ac6e22fe2373a8`.
- `Website-universal-lightbox` — `38d31f1ce2e6e62c462ccc5eb54d576dccb5ef20`.
- `Website-web-runtime-20260727` — `4c9ff637e455984b5bb8776eb2f6c2fae6354e1c`.

The superseded Social reliability remote branch is deleted, but its local
worktree remains preserved until PR #535 completes its production release and
the final cleanup packet revalidates the exact target list.

The dirty universal-lightbox worktree contains only two stale generated Mochi
Pets hygiene reports, not unique implementation. Preserve those files until an
approved cleanup packet names them exactly.

### Inactive source that must be sealed before removal

- `Website-monthly-prize-draw` at
  `b41fb46b987bde86a70add27e612a0a492e441cb`: unique historical full-stack
  raffle work.
- `Website-raffle-core-foundation` at
  `da564dc542cdb93e3f1ce663c085abcca07bb2ce`: disabled raffle foundation.
- `Website-raffle-reward-relay` at
  `f46dd425fbf30b2044f641e474add28dd26579e3`: disabled reward-relay
  extension.
- `Website-mochi-pets-hosted-auth` at
  `9a0340ff36aa29747122861a90a811ab7b3cc47e`: unique inactive hosted-auth
  source.
- `Website-social-guild-chat` at
  `6ffb542049adf15fdab950f1cd116ff92f55ab21`: unique inactive guild-chat
  source plus untracked middleware/configuration work.

Before removing any of these, secret-scan its patch, create one source-only
archive commit or ignored Git bundle per logical feature, verify its readback
and SHA-256, and classify it `Archived — not active`. Never place these archives
in `Mochi Creds`, inspect credential values, restore the retired Mochi Pets
prototype, or activate a provider/runtime.

## Release And Rollback Boundaries

- Reaper PR #7 merged after accountable exact-head authorization. The merge and
  successful `main` CI did not authorize or perform a Discord send or runtime
  deployment; any future runtime change remains separately gated.
- Website reliability PR #534 completed as
  `21f195458a87ae96eea84af51d0e1420b770ca74`. Vercel production is exactly
  bound to that SHA; only the two approved migrations applied; and the same 33
  ACTIVE functions advanced once with 20 JWT-verified and 13 non-JWT
  functions. No manual Supabase deployment occurred.
- The Social hardening PR follows only after the reliability production binding
  is verified. It is expected to add no migration and make no function-inventory
  or JWT-configuration change. Its merge still requires separate authorization
  for Vercel, the unavoidable redeployment of the same 33 functions with 20/13
  parity, and GHCR effects; inventory or parity drift stops the release.
  Deploying its immutable image to DigitalOcean is a later, separately approved
  packet.
- Shopify, payments, ActivityPub, Apple, Unity, Discord sends, Cloudflare, DNS,
  Spaces, secrets, schedules, and paid resources remain unchanged.
- Stop on any head drift, unexpected provider effect, changed function inventory
  or JWT parity, failed required context, missing rollback evidence, or archive
  target mismatch.

Final acceptance requires zero open pull requests, every remaining issue and
branch classified, only clean canonical Website and Social Mobile checkouts,
no obsolete Website worktrees, exact Vercel/Supabase source binding, and no
unapproved provider or credential change.
