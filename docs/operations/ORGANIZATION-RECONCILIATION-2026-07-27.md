# Mōchirīī Organization Reconciliation Ledger

This public-safe mutable ledger records the canonical GitHub organization,
repository, pull-request, issue, branch, worktree, and production-ownership
baseline. It contains no secrets, host addresses, private provider exports,
member data, or credential values. Mutable values were read back on
2026-07-29 and must be rechecked at every release gate.

Sealed evidence, merged pull requests, historical check output, and provider
audit metadata are immutable records. Old repository URLs that occur only in
those records are retained; GitHub redirects them to the canonical repository.
Active source, documentation, configuration, and new pull-request prose use the
canonical names below.

## Canonical Repository Inventory

| Repository | Visibility/state | Default branch and verified SHA | Current classification | Production ownership |
| --- | --- | --- | --- | --- |
| `Mochirii-Wushu/Mochirii-Website` | Public, active | `main` at `2eec9e467b4679fd77648ef61e77cf246ec9589b` | PRs #536, #538, and draft #539 are open. A clean 49-migration/45-function local union preserves their reviewed intent but has no remote branch or PR; the open PRs remain until replacement parity, review, and checks are proved. Issues #443 and #475 are classified trackers. | Owns the Vercel Website, Shopify theme source, Social source, and Supabase source. A protected-`main` merge invokes the connected Vercel and Supabase integrations; Social-source merges can also publish a GHCR image. Provider effects remain release-gated. |
| `Mochirii-Wushu/Mochirii-Social-Mobile` | Private, dormant | `main` at `57deb668620da6312d571090dee55e8fb58547d2` | PR #19 merged with exact reviewed-tree parity; its feature branch was deleted and merge-SHA CI passed. No open PRs. Issue #9 remains a classified dependency/toolchain tracker. | Source validation only; no Apple build, submission, or provider mutation occurred. |
| `Mochirii-Wushu/Mochirii-Pets` | Private, dormant | `main` at `09357c0432bf6aeb55742a27699110f0a0cb76ac` | PR #4 is open at naming-only head `aadaaedc19aaf6e85d7bd742102c616c35b3c77f`. Its repository contract passes, but the Unity editor job fails before testing because neither approved Unity license secret is configured. The separate local manual-only CI-policy commit is not part of the naming candidate. Issue #3 is classified future Unity work. | Fresh Unity source only; no hosted runtime, deployment, Apple submission, or recurring provider cost. |
| `Mochirii-Wushu/Reaper-Discord-Bot` | Private, active source | `main` at `79023914ee5c6502520b88aebe861904af9c2472` | PR #7 is merged; no open PRs or issues; only `main` remains remotely. A clean additive six-function ownership candidate is prepared locally at `e1d67374aaf4934a2bf8c506753e2f57d872929a` (tree `37f9579d976f8e5a52e835396eeb0eb83cb82f70`) and remains unpushed. | Source and rollback reference only. The merge ran repository CI and did not deploy Reaper or send Discord messages. The additive candidate grants no deployment authority. |
| `Mochirii-Wushu/Mochirii-Raffle-Spinner` | Private, archived | `main` at `95e917357517faeb43be9e2da6551baec213aed8` | No open PRs or issues. Two historical Dependabot branches are intentionally retained. | Historical source only; no current deployment or schedule depends on it. |
| `Mochirii-Wushu/Mochirii-Forums` | Private, empty; governance seed prepared | No branch refs; `main` is reserved for an approval-gated bootstrap. | No PRs, issues, or runtime source. The clean local governance-only seed at `9a3291dd4f0adba903dcfe2ecc73b7bd99dd8760` remains unpushed pending separate authorization. | No production dependency, provider effect, runtime, or recurring cost. Application source and provider connection require separate future approval. |
| `Mochirii-Wushu/Mochirii-Social` | Private, empty placeholder | No branch refs | No PRs, issues, or active source. The hosted Social source remains under `Mochirii-Website/services/social`. | No production dependency or provider effect. |

GitHub reports exactly these seven repositories. The configured default branch
for either empty repository does not create a branch ref. Private-repository plan
limits leave procedural review and CI gates where enforceable rulesets are not
available. Website releases must use protected `main`, current exact-head
checks, accountable review, and no owner bypass.

## Pull Requests, Issues, and Remote Branches

- Website PR #535 was squash-merged through protected `main` as
  `075937a30a9509faa189e9b1917a2ad9b847c7b0`; it is historical merged work,
  not an open release candidate or authority for the local union.
- Website PR #536, `chore(social): harden private-media bootstrap controls`,
  remains at remote head `bf62698fd390e9e60453beee1809f605791b8190`.
  Its reviewed sequence is represented in the local union, but #536 must not be
  closed until exact replacement parity and a green reviewed union PR exist.
- Website PR #538 remains at remote head
  `9887798aaf8868b3cbbb59deee21904e28d1813e`; every listed context except
  `validate-theme` passes there. The clean local repair descendant preserves
  sealed approved-copy and migration evidence byte-for-byte and is represented
  in the union, but its final replacement head still requires exact review and
  checks.
- Website draft PR #539, `feat(meta): add public privacy and deletion
  readiness`, remains at remote head
  `71d71d092d87be4dab4f6eb733dec36980cdd545`. Its public privacy/deletion
  routes and its latest union-alignment corrections are replayed in the union.
  The branch-specific `validate` failure is limited to canonical-origin checks
  that depend on PR #538; the integrated union passes the complete repository
  check. #539 remains open until replacement parity and exact-head checks are
  proved.
- Mochirii Pets PR #4 remains at naming-only head
  `aadaaedc19aaf6e85d7bd742102c616c35b3c77f`. The automatic repository
  contract succeeds, while exact-editor fails before running Unity because the
  protected Unity license environment is not configured. Resolving that CI
  policy or configuring provider secrets is a separate owner decision; it must
  not be hidden inside the naming change.
- Provider-generated CodeQL output for the current PR still contains a former
  Website URL. That immutable output redirects correctly and is not source
  drift. Recheck newly generated output after the PR head changes.
- The four open issues are Website #443 and #475, Social Mobile #9, and Mochi
  Pets #3. Each is intentionally classified; zero open issues is not the
  acceptance criterion.
- Remote feature branches include the four open implementation PRs and
  two retained historical Dependabot branches in the archived spinner repository:
  - `dependabot/github_actions/main/github-actions-901392d03b` at
    `46fe90ceeea592888eec49b9135ef8f43dcd9f0e`.
  - `dependabot/npm_and_yarn/main/npm-dependencies-7fdb227275` at
    `29372056a6e75966694664ea120ea14a36242c45`.
- The two archived branches are immutable historical references. Do not
  unarchive the repository merely to remove them.

## Local Website Worktrees

The latest 2026-07-29 readback finds 48 registered Website worktrees. The canonical
`Website` checkout remains at the exact upstream SHA with two known user-owned
`.codex/` paths; those paths and every intentional dirty lane must be
preserved. The worktree count is not a cleanup allowlist: every path requires a
fresh status, exact-head, patch/tree parity, and unique-file proof before any
separately approved removal.

| Worktree | Exact head | Classification |
| --- | --- | --- |
| `Website` | `2eec9e467b4679fd77648ef61e77cf246ec9589b` | HEAD equals `origin/main` while the checked-out branch is `mochi/vendor-mcp-setup`; preserve its two user-owned `.codex/` paths. |
| `Website-full-stack-integration-rehearsal-20260729` | Integration baseline `efc216d9e1e90cfd89f1896a1eaddbd5dceeb8a8` before this mutable ledger update. | Authoritative clean local union: 49 migrations, 45 functions, 28/17 source JWT expectation, bounded server-auth transport, and preserved #536/#538/#539 intent. It is unpushed and has no PR or provider effect. |
| `Website-repository-name-reconciliation-20260728` | `661afd9299221f521e2f1bf805728442ff6be4c1` | Canonical-name reconciliation source for PR #538; retain until replacement parity is proved. |
| `Website-repository-separation-adrs-20260729` | `331ed1e91e8cee65b4b1478b30fc545f41b57dd0` | Architecture/governance candidate; no provider or source-ownership transfer. |
| `Website-shopify-prepayment-safety-20260729` | `5b3834ca2558df9bc5063119f673662b04e5bb62` | Storefront prepayment-safety candidate; preserves sealed copy evidence and authorizes no Shopify mutation or publication. |
| `Website-phone-auth-fail-closed-20260729` | `c6f0702762b9135d7dacdcb055bcabfae98a9313` | Clean fail-closed phone-login source candidate; phone authentication remains disabled and provider activation is not authorized. |
| `Website-social-private-media-bootstrap-20260728` | `7f19b9cbf51a4cc2ec3a3d680cc99e02a2bb704a` | Active PR #536 replacement/hardening lane. |
| `Website-gallery-data-v2-20260728` | `bd6f4f50ed8201c029ab2f588e18e63dc66dd580` | Clean, sealed Gallery data/media release source. |
| `Website-raffle-full-stack-disabled-20260728` | `7b0001c86843aefbeb4aa5724105456f7a3d293a` | Clean, sealed disabled raffle-foundation source. |
| `Website-meta-gallery-publishing-20260728` | `db6aac31a58f054c6ad9491d7274153890984955` | Intentional concurrent Meta publishing worktree; preserve all tracked and untracked work. |
| `Website-meta-gallery-backend-20260729` | `71d71d092d87be4dab4f6eb733dec36980cdd545` | Parallel Meta backend source lane; provider state and the shared Supabase stack remain outside this documentation task. |
| `Website-meta-gallery-release-20260729` | `c9e1da01524b2721a7a88e385c07c94501a6b78f` | Source-only Meta handoff; both publish flags remain false and no post was created. |
| `Website-meta-public-readiness-20260729` | `71d71d092d87be4dab4f6eb733dec36980cdd545` | Draft PR #539 source; retained until union replacement parity is proved. |
| `Website-gallery-full-stack-p0-20260728` | `9d0303250fdbc99d99b87af8ff2ddf8ccbf127ad` | Superseded candidate; retain until Gallery replacement parity is proved. |
| `Website-gallery-raffle-integration-20260728` | `e920f7b93070f2c25fa343405f8957aab5052747` | Ordered Gallery/raffle verification composition; not a production branch. |
| `Website-raffle-consolidation-utc8-20260728` | `313ef528f73cbf1f629d703aa0eb8a2f0fc8bf21` | Superseded candidate; retain until integrated raffle parity is proved. |
| `Website-raffle-edge-port-20260728` | `23c3b500b63b3e2166de9089ff79a0b848a48cdd` | Superseded extraction candidate; retain until ownership parity is proved. |
| `Website-raffle-integrated-20260728` | `9494561368797c5eb06e20f40896dcb89e573d07` | Superseded integration candidate; retain until disabled-foundation parity is proved. |
| `Website-raffle-leaderboard-foundation-20260728` | `9f68986d3ad8bca5940f6a0f74a9329e9ac97210` | Superseded candidate; retain until integrated raffle parity is proved. |
| `Website-raffle-reward-relay-20260728` | `645b6796111042e1e653edadbca4d71fb5c5e10f` | Superseded reward-relay candidate; retain until disabled-foundation parity is proved. |
| `Website-raffle-ssr-boundary-20260728` | `2d89eb3c057c96b72d39ff1571755d750e3e2846` | Superseded SSR-boundary candidate; retain until disabled-foundation parity is proved. |

The other registered paths are also classified as preserved local evidence,
source, or rehearsal lanes, even where their intent is present in the union:

`Website-auth-replay-rehearsal-20260729`,
`Website-discord-gallery-ingest-hmac-20260729`,
`Website-full-stack-completion-governance-20260729`,
`Website-gallery-finalization-20260729`,
`Website-integration-exposure-catalog-20260729`,
`Website-meta-gallery-snapshot-rehearsal-20260729`,
`Website-node-validation-16f923d`,
`Website-phone-otp-abuse-controls-20260729`,
`Website-raffle-final-hardening-rehearsal-20260729`,
`Website-raffle-sql-hardening-20260729`,
`Website-repository-governance-salvage-20260729`,
`Website-route-inventory-20260729`,
`Website-server-auth-boundaries-20260729`,
`Website-social-private-media-auth-assurance-reconciled-20260729`,
`Website-social-private-media-bootstrap-reconciled-20260729`,
`Website-social-private-media-combined-final-20260729`,
`Website-social-private-media-hardening-20260729`,
`Website-social-private-media-replay-rehearsal-20260729`,
`Website-stack-auth-final-rehearsal-20260729`,
`Website-stack-discord-gallery-hmac-20260729`,
`Website-stack-integration-catalog-20260729`,
`Website-stack-phone-otp-20260729`,
`Website-stack-route-inventory-20260729`,
`Website-stack-server-auth-csp-20260729`,
`Website-stacked-gallery-delivery-hardening-20260729`,
`Website-stacked-raffle-consolidation-20260729`, and
`Website-stacked-shopify-prepayment-safety-20260729`.

Final cleanup requires the complete 48-worktree inventory, exact patch/tree
comparison, clean status, recorded head, and proof that no unique source,
asset, test, or documentation would be lost. Destructive worktree or branch
removal is separately approval-gated.

## Provider Connection Readback

- The last verified Vercel production project readback was labeled as connected to
  `Mochirii-Wushu/Mochirii-Website`. A provider-generated hyperlink still uses
  the former GitHub path and follows GitHub's redirect; no source or provider
  mutation is required for repository naming.
- The last verified hosted Supabase baseline contains 34 applied migrations
  and 33 ACTIVE functions with 20 `verify_jwt=true` / 13 false. Its GitHub
  integration was visibly connected to
  `Mochirii-Wushu/Mochirii-Website`, working directory `.`, production branch
  `main`, and production deployment enabled.
- The local union contains 49 migrations and 45 declared functions with 28/17
  source parity. It has not been pushed, previewed, or deployed and therefore
  does not alter the hosted readback. Its isolated 49/49 migration reset and
  480/480 pgTAP result are local evidence only. Warning-level lint, INFO
  security advisors, and WARN performance advisors were empty. The 54
  remaining INFO performance observations were fresh-empty-database
  `unused_index` notices and are not deletion evidence. The shared local stack
  and all hosted providers were untouched.
- The source-only Meta lanes retain
  `FACEBOOK_PAGE_PUBLISH_ENABLED=false` and
  `INSTAGRAM_PUBLISH_ENABLED=false`; no post was created. No provider identity,
  secret, or readiness claim is inferred from local source validation.
- The separate Vercel project named `web` is not Git-connected. It is only a
  cleanup candidate until domains, deployments, environment dependencies, and
  rollback impact are proved. Do not delete it without a separate exact packet.
- Reaper, DigitalOcean, Cloudflare, DNS, Spaces, Shopify, Apple, Unity, Discord,
  payments, and ActivityPub are not changed by this documentation release.

## Public Brand and Technical Identity

- Public guild name: `Mōchirīī`.
- Public short name: `Mōchī`.
- Public Social product: `Mōchirīī Social`.
- Cosmetics commerce: `Mochirii Cosmetics`.
- Repositories, domains, code symbols, migrations, environment variables,
  logs, containers, OAuth identifiers, and other technical surfaces: ASCII
  `Mochirii` and the canonical repository names in this ledger.
- Game product: `Mochi Pets`.

Do not perform blind global replacement. Required upstream names remain in
licenses, dependencies, source-compatibility notes, and internal provider
documentation. Public/customer surfaces remain Mōchirīī-branded.

## Release and Rollback Boundaries

- Re-read repository names, base/head SHAs, required checks, open PRs, function
  inventory/JWT parity, migration list, provider previews, and rollback target
  immediately before every merge.
- A Website protected-`main` merge can publish through Vercel and invoke the
  Supabase Git integration even when its patch has no Supabase source changes.
  Exact authorization must name those effects.
- Social source publication to GHCR and any DigitalOcean deployment are
  distinct approvals. Shopify publication, payment activation, Discord sends,
  Apple/Unity work, Cloudflare/DNS changes, ActivityPub, and paid resources are
  not implied.
- Credentials stay in provider secret stores and the private `Mochi Creds`
  recovery boundary. Never print, hash, summarize, commit, relocate, or inspect
  those values.
- Stop on head drift, unexpected provider effects, changed migration or
  function inventory, JWT-parity drift, failed required checks, missing
  rollback evidence, or cleanup-target mismatch.

## Completion Standard

- Zero unclassified repositories, pull requests, issues, branches, worktrees,
  provider connections, or production effects.
- Zero open scoped implementation PRs after every approved release completes;
  classified future-risk issues may remain open.
- Canonical Website and Social Mobile checkouts are clean.
- Final Vercel production metadata equals final Website `main`; Supabase source,
  migrations, function inventory, enablement, and JWT parity equal final source.
- README, architecture, integration, current-state, and release records match
  the verified live state without rewriting immutable history.
- No credential exposure and no unapproved provider or paid-resource change.
