# Reaper Rank Role Sync

## Purpose

Reaper can prepare Discord vanity roles that match the guild rank list. These roles are display-only and do not grant access. The existing guild/member role remains the website access role.

## Command

Production Reaper is the Supabase-hosted Discord Interactions function `reaper-discord-interactions`. The rank sync command is:

```text
/sync-ranks mode:<preview|apply> confirm:<true|false>
```

Use `mode:preview` first. It returns create, adopt, or block actions without changing Discord. Use `mode:apply confirm:true` only after owner approval and after confirming the bot role is high enough to create roles safely.

## Safety Rules

Reaper only creates or adopts roles that match the configured rank list. Each role must remain vanity-only:

- `permissions: "0"`
- `hoist:false`
- `mentionable:false`
- no channel overwrites

Unsafe same-name roles block the sync instead of being adopted silently. Created or adopted role IDs are written to `discord_resources` with `managedBy: "reaper-rank-sync"`, `vanityOnly: true`, and rank ordering metadata for website profile title display.

## Boundaries

- No CI job, Vercel build, local validation script, or browser route creates Discord roles.
- Leaders assign the vanity rank roles manually in Discord for v1.
- Reaper requires Moderator role and Discord `MANAGE_ROLES` for `/sync-ranks`.
- Do not print or commit Discord bot tokens, public keys, service-role keys, or raw interaction tokens.

## Validation

Run:

```sh
npm run check:reaper-discord-interactions
git diff --check
```

Live `/sync-ranks mode:preview` and `/sync-ranks mode:apply confirm:true` are action-time Discord mutations and require owner approval before use.
