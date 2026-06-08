# Reaper Rank Role Sync Live Verification - 2026-06-08

## Summary

Reaper rank-role sync is live for the Mochirii Discord server. The rank source of truth remains `data/ranks.json` / `/ranks`, not `/leaders`.

## Live Actions

- Authorized Reaper for the Mochirii Discord server with bot scope, application command scope, and `Manage Roles`.
- Confirmed Reaper bot token is valid without printing the token.
- Registered guild-scoped `/sync-ranks` without modifying the existing `/submit` command.
- Ran `/sync-ranks mode:preview`; Discord returned a no-mutation preview for all 10 ranks.
- Ran `/sync-ranks mode:apply confirm:true`; Reaper created all 10 rank roles.

## Discord Command State

Commands registered for guild `1078630751077142608`:

| Command | Purpose | Default member permission |
| --- | --- | --- |
| `/submit` | Submit an image to the gallery moderation queue. | None |
| `/sync-ranks` | Preview or apply Mochirii vanity rank roles. | Manage Roles |

## Rank Roles Created

All created roles are vanity-only: `permissions: "0"`, `hoist:false`, `mentionable:false`, and no channel overwrites.

| Rank | Role ID suffix | Safe |
| --- | --- | --- |
| Guild Leader | 653234 | Yes |
| Vice Leader | 051083 | Yes |
| Hall Leader | 636412 | Yes |
| Dharmapala | 039460 | Yes |
| Lotus Warden | 319600 | Yes |
| Petal Keeper | 789050 | Yes |
| Mochi Blossom | 375477 | Yes |
| Young Bamboo | 329646 | Yes |
| Softwind | 957698 | Yes |
| Rice Sprout | 174070 | Yes |

## Supabase Registry

Production Supabase project `deyvmtncimmcinldjyqe` now has 10 enabled `discord_resources` rows with:

- `kind = role`
- `metadata.managedBy = reaper-rank-sync`
- `metadata.vanityOnly = true`
- `metadata.source = data/ranks.json`
- `metadata.rankOrder = 1..10`

## Profile Title Verification

Test member Twills / Discord handle `faylui` was assigned the `Guild Leader` vanity role and refreshed through the live `/account` "Check Verification" action.

Verified production state:

- `member_status = active`
- `has_required_discord_roles = true`
- fresh `discord_verified_at`
- `discord_roles` contains the `Guild Leader` role
- expected server-owned profile title resolves to `Guild Leader`

Twills' dynamic member profile remains hidden because profile publication is off. This pass did not change profile publication state.

## Code Hardening

This PR adds a stable Discord API user agent to Reaper's Discord API calls. Local PowerShell requests without a stable user agent were blocked by Discord/Cloudflare with code `40333`; explicit bot API user-agent requests succeeded.

The live `/sync-ranks` rollout succeeded before this hardening patch was deployed, so the rank roles and Supabase registry are live now. Deploy the updated `reaper-discord-interactions` function with the next Supabase function release to carry the user-agent hardening into production.

## Validation

- `git diff --check`: passed.
- `check:reaper-discord-interactions`: passed with bundled Codex Node.
- `check:member-profiles-and-ranks`: passed with bundled Codex Node.
- `check:supabase-edge-types`: passed with bundled Codex Node.

Local PATH `node.exe` is still blocked by the WindowsApps stub; bundled Codex Node was used for validation.

## Remaining Operational Notes

- Leaders manually assign rank roles in Discord for v1.
- Rank roles must not be added to website required-role, moderator-role, or privileged access configuration.
- Profile titles appear after members refresh Discord verification and only when the member is active, recently verified, and has a matching enabled Reaper-managed vanity rank role.
