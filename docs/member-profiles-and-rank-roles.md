# Retired Member Profile Surface And Rank Roles

## Purpose

The website member profile surface is retired. `/members` and `/members/[slug]` should stay absent from the Next app and resolve through normal 404 behavior with no redirect. Mochirii Social is now the member social/profile destination.

This document remains as the durable boundary for shared backend identity data, Discord verification, and vanity rank-role behavior. Do not delete or migrate backend profile/media objects from this document alone.

## Boundaries

- Discord rank roles are vanity-only. They grant no website, channel, moderation, or Discord access.
- The `/members` and `/members/[slug]` website routes are retired and must not be reintroduced without a new owner-approved product decision.
- Member profile publishing is retired on the website. Account must not show profile publication, member-page links, or avatar/banner upload controls.
- Shared backend identity data remains in Supabase until a separate Supabase dependency audit/migration is approved.
- Discord handle is server-owned. `verify-discord-member` writes it from Discord user data, and the Account form must render it read-only.
- Editable member fields are limited to display name, game UID, region, timezone, and a bio of up to 1,000 characters.
- Legacy `member-profile-media` tables, bucket, and Edge Functions are retained for now because they are historical/shared backend objects; do not deploy removal without a migration plan.
- No Discord role mutation happens from CI, local validation, Vercel, or browser code. The `/sync-ranks` command performs live Discord role work only when a moderator runs `mode:apply confirm:true`.
- No service-role key, Discord bot token, Storage signing secret, OAuth secret, or host-private value reaches Vercel, browser code, docs, screenshots, or PR text.

## Rank Role Sync

Production Reaper is the Supabase-hosted Discord Interactions function `reaper-discord-interactions`. It supports:

```text
/sync-ranks mode:<preview|apply> confirm:<true|false>
```

The command is guild-scoped and moderator-only. The invoking Discord member must have the configured Moderator role and Discord `MANAGE_ROLES`. `preview` returns create/adopt/block actions without mutating Discord. `apply` requires `confirm:true`.

Rank roles are created or adopted only when safe:

- `permissions: "0"`
- `hoist:false`
- `mentionable:false`
- no channel overwrites

Unsafe same-name roles block the sync rather than being adopted. Created/adopted role IDs are recorded in `discord_resources` with metadata showing `managedBy: "reaper-rank-sync"`, `vanityOnly: true`, and `rankOrder`.

Leaders assign rank roles manually in Discord for v1. The existing guild role `1468659807736299520` remains the access role.

## Supabase Profile Layer

The retained Supabase profile/media migrations include:

- `member_profiles.profile_slug`
- `member_profiles.profile_public_enabled`
- `member_profiles.profile_published_at`
- approved avatar/banner media references
- `member_profile_media`
- `member_profile_media_events`
- private Storage bucket `member-profile-media`

These objects are shared backend identity data and historical workflow state. Keep RLS, grants, and Edge Function boundaries intact until a separate migration decides whether to remove, archive, or repurpose them.

Legacy profile Edge Functions remain configured:

- `list-member-profiles`
- `list-visible-profile-cards`
- `get-member-profile`
- `submit-member-profile-media`
- `list-member-profile-media-queue`
- `moderate-member-profile-media`

`list-visible-profile-cards` is the only public-safe profile-card exception retained for configured display surfaces. It accepts explicit configured slugs and returns limited display data; it must not expose Discord handle, game UID, region, timezone, raw Storage paths, the broader member list, or dead `/members` links.

## Next App Surface

Retired website routes:

- `/members`
- `/members/[slug]`

Current member-adjacent website surfaces:

- `/auth`
- `/account`
- `/social`
- `/oauth/consent`
- `/gallery-submit`
- `/leader-dashboard`

Account keeps:

- Discord verification state
- read-only Discord handle from verified Discord identity
- editable fields for display name, game UID, region, timezone, and bio only
- gallery submission history
- Mochirii Social handoff

Account must not show:

- profile visibility toggle
- member profile link
- avatar and banner upload controls
- profile media review status

Leader Dashboard keeps gallery moderation, member verification review, Instagram queue controls, and Mochi Pets alpha controls. It must not show the old profile media review queue.

## Verification

Run:

```sh
npm run check:member-profiles-and-ranks
npm run check:member-workflow-qa
npm run check:site-navigation
npm run check:observability-metadata-smoke
npm run check:supabase-edge-types
git diff --check
cd apps/web && npm run lint && npm run build
```

Manual preview:

- `/members` returns 404
- `/members/twills` returns 404
- header, footer, and mobile navigation have no `Members` link
- Account shows Discord verification, safe editable fields, gallery submission history, and Mochirii Social handoff
- Account does not show profile publishing or avatar/banner upload controls
- Leader Dashboard does not show the profile media queue
- `/social` remains a noindex handoff/support page for Mochirii Social
- Mochirii Social remains the member social/profile destination

Live Discord role sync is not part of automated tests. Run `/sync-ranks mode:preview` first, then use `mode:apply confirm:true` only after owner approval and Discord role hierarchy verification.
