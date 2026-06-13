# Reaper Pending Verification Activation Packet

This packet activates pending-verification containment in two releases:

1. Supabase slash-command repair path.
2. Private Reaper Gateway member-event forwarding.

Do not combine those approvals. Live provider mutations stay owner/moderator approved.

## Approval-Required Live Mutations

- `supabase db push`
- `supabase functions deploy reaper-discord-interactions --project-ref deyvmtncimmcinldjyqe`
- `supabase functions deploy reaper-discord-member-sync --project-ref deyvmtncimmcinldjyqe`
- `npm run register:reaper-pending-verification-command -- --apply`
- Discord `/sync-pending-verification mode:apply confirm:true`
- `npm run rollback:reaper-pending-verification -- --apply --confirm-guild=1078630751077142608`
- Private Reaper Gateway deployment

Dry runs, static validation, local type checks, and PR checks are safe local/repo work.

## Local Validation

Run from `C:\Users\xtyty\Documents\Mochirii`:

```sh
npm run check:reaper-discord-interactions
npm run check:reaper-pending-verification
npm run check:discord-reaper-parity
npm run check:supabase-edge-types
npm run check
git diff --check
```

If website files under `apps/web` changed, also run:

```sh
cd apps/web
npm run lint
npm run build
```

## Release 1: Slash Command Repair Path

1. Open a scoped PR from the implementation branch.
2. Wait for GitHub, Vercel Preview, and repository checks to pass.
3. Merge only after review.
4. Confirm Supabase migration state:

```sh
supabase migration list
supabase db push --dry-run
```

5. After approval, apply the migration:

```sh
supabase db push
```

6. After approval, deploy only the Interactions function:

```sh
supabase functions deploy reaper-discord-interactions --project-ref deyvmtncimmcinldjyqe
```

7. Dry-run the Discord command registration:

```sh
npm run register:reaper-pending-verification-command
```

8. After approval, upsert only `/sync-pending-verification`:

```sh
npm run register:reaper-pending-verification-command -- --apply
```

The registration script must use `default_member_permissions: "268435456"` for Discord `MANAGE_ROLES`, `dm_permission: false`, and POST/PATCH only the named guild command.

## Discord-Native Safety Checklist

Use [`docs/discord-native-safety-audit.md`](discord-native-safety-audit.md) for the recurring Discord Native Safety Audit. Before live apply, keep its evidence current and confirm:

- Category `1468658801388290048` contains clear verification, rules, and help channels.
- Rules Screening and Community Onboarding are intentionally configured.
- AutoMod mention-spam controls and Raid Protection alerts are configured.
- Verification level and role hierarchy match current moderator expectations.
- Moderator accounts use 2FA.
- Non-admin and non-moderator roles cannot mention `@everyone`, `@here`, or all roles unless explicitly intended.
- Reaper can edit channel permission overwrites and its role position is adequate.

Do not publicly announce contained users. Slash-command responses stay ephemeral and operational logs stay private/redacted.

## Live Preview And Apply

1. Run:

```text
/sync-pending-verification mode:preview confirm:false
```

2. If preview lists manual conflicts, resolve those exact member-specific `VIEW_CHANNEL` conflicts in Discord and rerun preview.
3. After owner/moderator approval, run:

```text
/sync-pending-verification mode:apply confirm:true
```

4. Verify:

- A WWM-only unverified test member can see only category `1468658801388290048` and its children.
- A verified member or extra-role member has Reaper-owned overwrites removed.
- `discord_sync_log` contains redacted `role_check` entries.
- Discord audit log entries include `Reaper pending verification containment`.

## Release 2: Gateway Automation

The private Reaper Gateway worker posts member add/update events to:

```text
https://deyvmtncimmcinldjyqe.supabase.co/functions/v1/reaper-discord-member-sync
```

Endpoint contract:

```json
{
  "event_type": "guildMemberAdd | guildMemberUpdate",
  "guild_id": "1078630751077142608",
  "discord_user_id": "<snowflake>",
  "roles": ["<snowflake>"],
  "gateway_sequence": 123,
  "occurred_at": "2026-06-12T00:00:00.000Z"
}
```

The endpoint has `verify_jwt = false` and requires header `x-mochirii-reaper-member-sync-secret`. It fetches the current Discord member before mutating, uses the shared containment policy, blocks manual conflicts, enforces the same max-mutation guard, logs redacted counts, and writes only tracked member-specific `VIEW_CHANNEL` overwrites.

Gateway requirements:

- Use only `Guilds` and `GuildMembers` intents.
- Listen to `guildMemberAdd` and role-changing `guildMemberUpdate`.
- Do not request Message Content or Presence intents.
- Do not mutate roles or channel permissions directly.
- Do not store Supabase service-role keys in the Gateway runtime.

Validation from `C:\Users\xtyty\Documents\Reaper`:

```sh
bun install
bun run typecheck
bun test
bun run build
```

Deploy the Gateway only after those checks pass and owner approval is given.

## Rollback

Immediate stop:

1. Disable/unregister `/sync-pending-verification`, or redeploy the previous `reaper-discord-interactions` function.
2. Disable Gateway event-posting env vars or redeploy the previous Gateway worker.

Permission cleanup dry run:

```sh
npm run rollback:reaper-pending-verification
```

After approval:

```sh
npm run rollback:reaper-pending-verification -- --apply --confirm-guild=1078630751077142608
```

The rollback script removes only Reaper-owned `VIEW_CHANNEL` bits tracked in `discord_managed_permission_overwrites`. It preserves manual bits and marks cleared registry rows inactive. Database table removal is not required for emergency stop.

## Evidence Fields

Record these in the PR or private operator note:

- Branch and commit SHA.
- GitHub/Vercel/Supabase check status.
- Supabase migration list result.
- Supabase function deploy command and timestamp.
- Command registration dry-run/apply output.
- Preview target count, conflict count, planned Discord write count, and registry write count.
- Apply result counts.
- Test member visibility result.
- `discord_sync_log` row timestamp.
- Discord audit log timestamp.
- Rollback dry-run output if rollback is needed.

## Source Basis

- [Discord permissions](https://docs.discord.com/developers/topics/permissions)
- [Discord channel permissions API](https://docs.discord.com/developers/resources/channel)
- [Discord rate-limit guidance](https://support-dev.discord.com/hc/en-us/articles/6223003921559-My-Bot-is-Being-Rate-Limited)
- [Discord privileged intents](https://support-dev.discord.com/hc/en-us/articles/6207308062871-What-are-Privileged-Intents)
- [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Edge Function deploys](https://supabase.com/docs/guides/functions/deploy)
- [Vercel Preview environments](https://vercel.com/docs/deployments/environments)
