# Website Reliability Reconciliation — 2026-07-27

This public-safe ledger records the reviewed source lane and completed Website
reliability release. It grants no new provider-write authority.

## Release Result

- PR #534 was squash-merged through protected `main` as
  `21f195458a87ae96eea84af51d0e1420b770ca74` after the recorded exact-head
  repository, CodeQL, Vercel Preview, non-skipped Supabase Preview, database,
  browser and release-readiness gates passed.
- Vercel production deployment `dpl_6nHjx2vKA9wBgyDEGf4cRdpUESiJ` reached
  `READY` and is exactly bound to the merge SHA.
- Supabase applied only migrations
  `20260727211442_classify_reviewed_sya_spinner_draw.sql` and
  `20260727212838_consolidate_member_social_links_select_policy.sql`.
- The reviewed Sya aggregate readback reports `all_checks_pass=true`; the
  profile-link duplicate-policy warning cleared and exactly one SELECT policy
  remains.
- Exactly the same 33 ACTIVE Edge Functions redeployed once, every version
  advanced exactly one, and JWT configuration remained 20 true / 13 false.
- Production route, runtime, responsive and raffle/spinner acceptance passed,
  so the recorded prior Vercel deployment was not restored. Immutable raffle
  evidence was not rewritten or deleted.

## Verified Baseline

- Canonical repository: `Mochirii-Wushu/Mochirii`.
- Protected-main baseline at source preparation: commit
  `5b2ad686c9c4bf47035893b170ea8d3d659fd4ea`.
- Already merged at that baseline: Playwright 1.62, the branded global 404, stable
  Gallery thumbnail/full-image delivery and shared Home/Gallery lightbox, public raffle
  winner rendering, member profile links, and the initial authenticated-route performance
  work. This lane does not replay or fork those merged implementations.
- Read-only Vercel evidence for the preceding seven days showed eight production HTTP 503
  responses, all on `/spinner/live`, and no grouped application runtime-error cluster.
  Signed-out or unauthorized access remains an intentional opaque 404 and is not counted as
  a runtime failure.
- One Website PR was open at this lane's source-preparation readback: draft PR #532 for the earlier Social reliability
  lane, exact head `4f157d7c1adc7ba530044c35a83c12c102fd9810`, two commits behind current `main` and conflicting. Its Supabase Preview was
  cancelled/failed at the provider preview-branch concurrency limit; it was not a green or
  intentionally skipped result. Its replacement belongs to the separate Social hardening
  lane; this Website lane must not mix Social runtime or provider changes into its diff.

## Focused Source Scope

The reliability lane contains only these causal changes:

1. Classify the exact reviewed July 2026 Sya draw as official across its immutable receipt,
   completed guild-delivery record, and revealed live state. The migration derives the draw
   identifier from the immutable publication, requires exact evidence, is idempotent, skips a
   fresh Preview database, and fails closed on partial or changed production state. It
   deliberately requires that draw to remain the current revealed live state, so the
   aggregate-only readback must report `migration_ready=true` immediately before merge and
   `all_checks_pass=true` after deployment. A local execution test covers the exact populated
   transition, immediate replay, and a forced failure after the receipt update to prove that
   every row and all three normally enabled guard triggers roll back transactionally.
2. Make live-spinner polling pause when hidden or offline and retry actual failures with
   bounded exponential backoff and jitter. Stable response headers separate expected access
   denial, synchronization, command rejection, and genuine upstream failure without exposing
   member or draw identifiers.
3. Make essential Account and moderator spinner access render before optional Gallery,
   Instagram, or Social status reads finish.
4. Centralize the public guild spelling as `Mōchirīī` and short form `Mōchī`, in NFC Unicode.
   Reviewed ASCII `Mochirii` exceptions remain limited to technical identifiers, repository
   slugs, security headers, internal assets, Shopify, and `Mochirii Cosmetics` commerce
   surfaces.
5. Add fail-closed static, unit, build, database, responsive, and release-readback contracts.
6. Consolidate the two equivalent permissive `member_social_links` SELECT policies into one
   behavior-preserving owner-or-shared policy, clearing the current policy-performance warning
   without widening grants or visibility.
7. Retain the repository-local Supabase CLI 2.109.1 pin. Version 2.110.0's
   official npm integrity, signatures, attestations, no-deprecation metadata, and clean audit
   were verified, but the repository's Deno minimum-dependency-age policy still rejected that
   newly published package. Updating by bypassing the supply-chain age gate is not acceptable;
   retry the focused tool update only after the normal maturity window and full frozen-lock
   checks pass.

The implementation follows current [Next.js server/client composition and data-fetching
guidance](https://nextjs.org/docs/app/getting-started/server-and-client-components),
[Vercel observability guidance](https://vercel.com/docs/observability),
[Supabase migration and database-testing guidance](https://supabase.com/docs/guides/deployment/database-migrations),
and [WCAG 2.2 reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

## Retained Trackers

- Issue #443, **Track ESLint 10 and TypeScript 7 compatibility**, remains a legitimate
  compatibility tracker. It is not resolved by this lane and should close only after the
  repository's supported toolchain and plugins can adopt those majors with clean checks.
- Issue #475, **Modernize Mochirii Social from Vue 2 and Laravel Mix**, remains the legitimate
  retirement path for the tracked Vue 2/Laravel Mix development-server risk. Production-image
  exclusion is mitigation, not completion of the migration.

Neither issue is an unresolved Website release defect, and neither should be closed merely to
reach zero pull requests.

## Advisor Classification

The source review classifies the current Supabase advisor findings as follows:

- `get_latest_official_raffle_winner`, `create_member_social_link`, and
  `reorder_member_social_links` intentionally use `SECURITY DEFINER`. Each has a fixed search
  path, an exact return/argument contract, least-privilege execution grants, authenticated or
  verified-member checks, and pgTAP coverage. The first must read service-only immutable result
  tables while returning four bounded public fields; the latter two preserve atomic per-owner
  limits and ordering without granting direct insert or sort-order update access. Converting
  them to invoker rights would require broader table privileges, so the three advisor warnings
  are reviewed design exceptions rather than silent findings.
- The duplicate permissive SELECT-policy performance warning is remediated by migration
  `20260727212838_consolidate_member_social_links_select_policy.sql` and must clear in Preview
  and post-release advisor readback.
- Leaked-password protection is an Auth-provider setting. Enabling it is recommended by the
  [Supabase password-security guidance](https://supabase.com/docs/guides/auth/password-security)
  but is not authorized by this source lane; it requires a separate exact Auth configuration
  packet, dependency/readback review, and rollback plan.
- Unused-index notices are observations, not deletion evidence. Newly introduced and
  low-frequency access paths need a representative observation window before any index removal.
  A later database-performance review should use query plans and production statistics, following
  the [Supabase database-linter guidance](https://supabase.com/docs/guides/database/database-linter),
  rather than dropping indexes from a one-time count.

## Worktree And Branch Disposition

- Preserve intentional user work in the canonical Social OAuth, hosted Mochi Pets auth,
  full-stack raffle, Social guild-chat, and universal-lightbox worktrees.
- Preserve the active Social hardening replacement lane until it is reviewed independently.
- Clean historical branch worktrees may be removed only after their commits are proven merged
  or intentionally superseded and the owning release record is complete.
- Never reconstruct the retired Mochi Pets prototype or move credentials into a repository.
- The target repository end state is zero open pull requests and a clean canonical checkout;
  open issues remain when they are genuine, bounded future-work records.

## Provider Effects And Approval Boundary

Local source work, tests, and review do not change providers. A protected-main merge would:

- create a normal Vercel production deployment;
- apply migration `20260727211442_classify_reviewed_sya_spinner_draw.sql`; and
- apply migration `20260727212838_consolidate_member_social_links_select_policy.sql`; and
- invoke the existing Supabase Git integration, which redeploys all 33 functions currently
  declared in `supabase/config.toml`, even though this lane changes no function source or JWT
  setting.

Therefore a merge requires exact approval for the Vercel publication, both migrations, and
one automatic 33-function redeployment preserving 20 `verify_jwt=true` and 13 false. Never
deploy Supabase manually. Do not change secrets, Auth, Data API exposure, Storage, schedules,
branch settings, function enablement, DigitalOcean, Cloudflare, Discord/Reaper, Shopify,
payments, ActivityPub, Unity, iOS, or any other provider configuration under this lane.

Post-merge acceptance must prove exact source binding, the exact 33-name function inventory and
20/13 parity, every expected function version advancing exactly once, aggregate-only Sya
classification readback, public and authenticated spinner behavior, responsive route checks,
and no new runtime-error cluster. Any mismatch stops the release and requires a reviewed forward
fix or rollback; immutable raffle evidence must not be deleted or rewritten.

## Local Database Verification

Run the database gates serially against the local Supabase stack:

```text
supabase db reset --local
npm run test:supabase-db
supabase db lint --local --level warning --fail-on error
supabase db advisors --local --type all --level info --fail-on none
npm run test:reviewed-sya-spinner-classification
```

`test:supabase-db` discovers only top-level `*_test.sql` files. It deliberately
does not pass the entire `supabase/tests` directory to `pg_prove`, because that
directory also contains data fixtures that are not TAP programs and must never
be executed as independent persistent tests.
