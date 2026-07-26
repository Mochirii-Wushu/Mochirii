# Supabase Edge Dependency Refresh Approval Packet

Status: Approved by the release owner on 2026-07-25 for the exact PR #511
deployment, then expanded on 2026-07-26 UTC to cover the unavoidable
31-function redeployments caused by each named follow-up `main` merge. Execution
remains gated by the final exact-head preflight and protected-branch checks.

This packet is public and contains no credentials, provider tokens, customer
data, or private provider exports.

## Exact production effect

Squash-merging PR #511 changes the function-local dependency configuration in
the production branch. The existing Supabase GitHub integration will therefore
redeploy the 31 functions declared in `supabase/config.toml` to project
`deyvmtncimmcinldjyqe`.

The source logic, JWT settings, database schema, migrations, secrets, schedules,
domains, and customer-facing copy do not change. Each function moves its direct
Supabase Edge Runtime type and JavaScript client declarations from broad `@2`
and `^2` ranges to exact version `2.110.8`. The repository lock previously
resolved those ranges to `2.106.1`, but that root lock is not a function-local
deployment manifest and does not prove the version resolved by the live
deployment service. The exact `tweetnacl@1.0.3` import used by
`reaper-discord-interactions` remains unchanged. The deployment resolver's
current graph and the repository's local Deno graph must both audit with no
known vulnerabilities before release.

## Production integration trigger behavior

The connected Supabase production integration deploys every Edge Function
declared in `supabase/config.toml` on each push or merge to the production
branch, even when that commit has no `supabase/` diff. Production readback for
PR #514 confirmed a fresh 31-function deployment from a documentation-only
merge. The release owner explicitly authorized the same 31-function integration
redeployment after PR #509, PR #510, PR #512, the reviewed Playwright 1.62
replacement PR, PR #508, and the final release-record PR. Those deployments
must remain serialized and integration-driven; no manual deployment is
authorized.

The retained Mochi Pets functions remain quarantined provider endpoints during
this dependency-only redeployment. This packet does not authorize exposing,
calling, deleting, or otherwise changing them, and the static
`/games/mochi-pets` page remains independent from them.

## Exact function inventory

1. `verify-discord-member`
2. `verify-member-access`
3. `review-member-verification`
4. `list-gallery-review-queue`
5. `moderate-gallery-submission`
6. `delete-rejected-gallery-submission`
7. `list-approved-gallery-submissions`
8. `submit-discord-gallery-image`
9. `reaper-discord-interactions`
10. `reaper-discord-member-sync`
11. `send-vote-reminder`
12. `send-member-spotlight-poll`
13. `publish-member-spotlight-winner`
14. `get-current-spotlight-winner`
15. `list-instagram-publish-queue`
16. `publish-instagram-gallery-submission`
17. `mark-instagram-gallery-submission-shared`
18. `check-instagram-api-status`
19. `list-member-profiles`
20. `list-visible-profile-cards`
21. `get-member-profile`
22. `submit-member-profile-media`
23. `list-member-profile-media-queue`
24. `moderate-member-profile-media`
25. `mochi-pets-alpha-session`
26. `mochi-pets-unity-auth`
27. `mochi-pets-alpha-action`
28. `mochi-pets-alpha-progress`
29. `mochi-pets-alpha-admin`
30. `submit-mochi-pets-feedback`
31. `sync-pixelfed-social-account`

## Required preflight

- Rebase PR #511 onto the final preceding `main` and verify its exact head.
- Confirm the diff contains only the reviewed dependency manifests, Deno lock,
  dependency contracts, and this release packet.
- Run the full repository check plus the focused Supabase security, config,
  provider-style type, resolved-dependency audit, and relevant Deno tests.
- Require all strict current-head GitHub checks and a real successful Supabase
  Preview for the exact PR head; a skipped Preview does not pass.
- From the Preview, run fail-closed signed-out checks for every non-game public
  function surface and authenticated test-fixture checks only where the
  existing runbook permits them. The smoke must print its final success marker;
  a network warning or successful skip does not pass. Do not create production
  data, send Discord messages, or invoke quarantined Mochi Pets functions.
- Capture the production function version inventory and the exact previous
  source commit in the ignored operations evidence boundary before merge.

## Release and readback

1. Record the approved PR head and current production source commit.
2. Squash-merge through protected `main`; do not run a separate local deploy.
3. Wait for the Supabase production integration to finish before merging any
   later Supabase change.
4. Confirm all 31 functions report a successful deployment from the merged
   commit and the expected exact direct dependency configuration.
5. Run the strict no-secret public-boundary, authentication-failure, Gallery,
   visible-profile, Spotlight, Reaper, vote-reminder and Pixelfed-sync contract
   checks. Require the final contract-smoke success marker. Do not send a
   Discord message, publish media, mutate a schedule, or invoke quarantined game
   functions.
6. Preserve the deployment readback under ignored operations evidence.

## Stop and rollback

Stop before merge if the exact-head Preview is skipped or fails, the resolved
graph has an advisory, any direct import differs from this packet, or any
function source/config outside the reviewed set changes.

After merge, stop the sequence if any deployment or boundary check fails. Open
a focused revert PR restoring the prior manifests and source-binding record;
merge it through the same protected checks and integration. Do not edit secrets,
database state, schedules, Auth, Storage, or function settings as a workaround.
Escalate before any manual provider deployment or emergency configuration
change.

## Exact approvals recorded

> Approve squash-merging the exact reviewed head of Mochirii PR #511 and allow
> the existing Supabase GitHub integration to perform the dependency-only
> redeployment of the 31 functions listed in this packet to project
> `deyvmtncimmcinldjyqe`, followed by the listed no-secret readbacks and, only if
> required, a protected revert PR through the same integration. Keep schemas,
> migrations, database data, secrets, Auth, Data API exposure, Storage,
> schedules, domains, branch settings, function enablement, Discord sends,
> quarantined Mochi Pets behavior, and all unrelated provider settings unchanged.

Approval of another task, a general request to update tools, or a green local
check is not a substitute for this exact deployment approval.

The release owner subsequently approved revising the sequence to merge PR #511
first after a successful exact-head, non-skipped Supabase Preview. The same
approval authorizes the existing protected-main integration to redeploy exactly
the 31 functions in this packet after each named follow-up merge: PR #509, PR
#510, PR #512, the reviewed Playwright 1.62 replacement PR, PR #508, and the
final release-record PR. The existing 19/12 JWT configuration must remain
unchanged. Migrations, schema or data, secrets, Auth, Data API exposure,
Storage, schedules, branch settings, function enablement, and all other provider
configuration remain outside scope. Manual deployment remains prohibited.
