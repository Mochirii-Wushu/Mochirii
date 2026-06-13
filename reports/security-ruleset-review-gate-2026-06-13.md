# Security Ruleset Review Gate - 2026-06-13

## Summary

This report records the provider-side production review gate activation for `Mochirii-Wushu/Mochirii`. The active default-branch ruleset now requires one approving review before production merges, while preserving the existing required checks and review-thread resolution gate.

No app code, public copy, assets, DNS, Vercel project settings, Supabase settings, Discord settings, Cloudflare settings, Fly settings, Enjin settings, or secrets changed in this repo evidence packet.

## Source Basis

- GitHub protected branches: <https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches>
- GitHub repository rulesets: <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets>
- GitHub REST repository rulesets: <https://docs.github.com/en/rest/repos/rules>

## Provider Change

- Repository: `Mochirii-Wushu/Mochirii`
- Ruleset: `Primary Rules`
- Ruleset id: `13652003`
- Target: default branch
- Enforcement: `active`
- Changed field: `pull_request.parameters.required_approving_review_count`
- Previous value: `0`
- New value: `1`

Two malformed JSON update attempts returned HTTP 400 before any provider mutation. A readback confirmed the ruleset still had `required_approving_review_count: 0` before the final UTF-8 payload was applied.

## Readback Evidence

Final GitHub API readback showed:

- `required_approving_review_count`: `1`
- `required_review_thread_resolution`: `true`
- `strict_required_status_checks_policy`: `true`
- required checks: `validate`, `validate-next`, `CodeQL`, `Vercel`, `Supabase Preview`
- deletion blocked
- non-fast-forward pushes blocked
- bypass actors: `0`
- `current_user_can_bypass`: `never`

## Operational Behavior

Future production PRs should not merge until:

- at least one approving review is present
- open review threads are resolved
- the required checks pass
- the branch is current with `main`

This intentionally turns the prior solo-maintainer convenience gap into an explicit governance gate. If an emergency release must bypass it, treat that as a live provider mutation and record the reason, same-window ruleset readback, release action, restoration readback, and rollback owner in the private release ledger.

## Rollback

To revert the gate, update the `Primary Rules` ruleset so `required_approving_review_count` returns to `0`, then immediately capture readback evidence. Do not remove the required status checks, review-thread resolution, deletion protection, or non-fast-forward protection during that rollback unless a separate incident packet explicitly approves it.
