# Reaper Pending Verification Containment

Reaper can repair pending-verification Discord visibility with the Supabase-hosted Discord Interactions function:

```text
/sync-pending-verification mode:<preview|apply> confirm:<true|false>
```

This is a containment backstop, not the primary onboarding model. Discord Rules Screening, Community Onboarding, AutoMod, Raid Protection, verification level, role hierarchy, and moderator 2FA stay separate Discord-native controls.

## Scope

The command targets only members whose Discord member `roles` array is exactly:

```text
["1468659807736299520"]
```

Members with role `1078630751077142615`, any extra role, or a bot user are skipped. Reaper manages only `VIEW_CHANNEL` visibility for the target members. It does not grant or deny send, voice, moderation, invite, mention, event, or thread permissions.

The allowed tree is category `1468658801388290048` plus every current guild channel whose `parent_id` is `1468658801388290048`.

## Permission Model

Reaper uses member-specific permission overwrites, because Discord applies member overwrites after role overwrites. This avoids helper-role deny collisions when another role has an explicit `VIEW_CHANNEL` allow.

On apply:

- Inside the allowed tree, Reaper adds its tracked member-specific `VIEW_CHANNEL` allow and removes only its tracked `VIEW_CHANNEL` deny.
- Outside the allowed tree, Reaper adds its tracked member-specific `VIEW_CHANNEL` deny and removes only its tracked `VIEW_CHANNEL` allow.
- All unrelated allow and deny bits are preserved.
- Members that no longer match the target predicate have only Reaper-owned `VIEW_CHANNEL` bits removed.
- A member overwrite is deleted only when no manual bits remain after Reaper-owned bits are removed.

Manual member-specific conflicts block apply:

- A non-Reaper `VIEW_CHANNEL` allow outside the allowed tree.
- A non-Reaper `VIEW_CHANNEL` deny inside the allowed tree.

Preview lists conflict channels so a moderator can make an intentional Discord-side decision first.

## Storage And Logs

Reaper stores only owned permission bits in service-role-only table `discord_managed_permission_overwrites`. Browser clients receive no direct grants.

Each preview and apply writes a redacted `discord_sync_log` row with `sync_type: "role_check"`. Logs contain counts and IDs only. Do not store tokens, webhook URLs, private message content, raw interaction tokens, or unrestricted Discord message content.

## Live Command Rules

Preview is the safe first command:

```text
/sync-pending-verification mode:preview confirm:false
```

Apply requires all of:

- The expected guild `1078630751077142608`.
- The configured Moderator role `1078630751165222984`.
- Discord `MANAGE_ROLES` on the invoking moderator.
- `confirm:true`.
- No manual conflicts.
- Planned Discord overwrite writes at or below the max-mutation guard.

Live apply remains owner/moderator approved:

```text
/sync-pending-verification mode:apply confirm:true
```

Discord audit log reasons on permission writes use:

```text
Reaper pending verification containment
```

Responses are ephemeral. Do not publicly shame or announce contained users.

## Gateway Follow-Up

Full automatic coverage is a second release after the slash-command repair path. The private Reaper Gateway worker posts redacted `guildMemberAdd` and role-changing `guildMemberUpdate` events to:

```text
reaper-discord-member-sync
```

That Edge Function requires header `x-mochirii-reaper-member-sync-secret`, fetches the current Discord member before mutating, and uses the same shared containment policy as `/sync-pending-verification`. It blocks manual conflicts, enforces the same max-mutation guard, and writes redacted `discord_sync_log` rows.

Gateway requirements:

- Use only `Guilds` and `GuildMembers` intents.
- Do not request Message Content or Presence intents.
- Do not mutate roles or channel permissions directly.
- Do not store Supabase service-role keys in the Gateway runtime.
- Keep Discord bot tokens and server-to-server secrets in private runtime secrets only.

See [`reaper-pending-verification-activation-packet.md`](reaper-pending-verification-activation-packet.md) for the release gate, endpoint contract, and rollback steps.

## Validation

Run before deployment:

```sh
npm run check:reaper-discord-interactions
npm run check:discord-reaper-parity
npm run check:supabase-edge-types
npm run check
git diff --check
```

Primary references:

- [Discord permissions](https://docs.discord.com/developers/topics/permissions)
- [Discord channel permissions API](https://docs.discord.com/developers/resources/channel)
- [Discord rate limits](https://docs.discord.com/developers/topics/rate-limits)
- [Discord privileged intents](https://support-dev.discord.com/hc/en-us/articles/6207308062871-What-are-Privileged-Intents)
- [Community Onboarding FAQ](https://support.discord.com/hc/en-us/articles/11074987197975-Community-Onboarding-FAQ)
- [Rules Screening FAQ](https://support.discord.com/hc/en-us/articles/1500000466882-Rules-Screening-FAQ)
- [Raid Protection](https://support.discord.com/hc/en-us/articles/10989121220631-How-to-Protect-Your-Server-from-Raids-101)
