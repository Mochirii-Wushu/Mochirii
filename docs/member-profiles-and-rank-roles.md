# Member Profiles And Rank Roles

## Purpose

This feature adds members-only profile pages and Discord vanity rank roles while keeping privilege decisions server-side. Discord remains the role source of truth, Supabase stores verified state and approved profile media, and Vercel/Next renders the member directory and profile pages.

## Boundaries

- Discord rank roles are vanity-only. They grant no website, channel, moderation, or Discord access.
- Profiles are members-only. `/members` and `/members/[slug]` require active, recently verified Discord membership.
- Profile publishing is opt-in. New and existing profiles stay hidden until the member enables publication from Account.
- Profile media requires moderator approval. Pending, rejected, and archived avatar/banner uploads never appear on profile pages.
- No Discord role mutation happens from CI, local validation, Vercel, or browser code. The `/sync-ranks` command performs live Discord role work only when a moderator runs `mode:apply confirm:true`.
- No service-role key, Discord bot token, or Storage signing secret reaches Vercel, browser code, docs, screenshots, or PR text.

## Rank Role Sync

Production Reaper is the Supabase-hosted Discord Interactions function `reaper-discord-interactions`. It now supports:

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

Migration `20260608210000_add_member_profiles_and_media.sql` adds:

- `member_profiles.profile_slug`
- `member_profiles.profile_public_enabled`
- `member_profiles.profile_published_at`
- approved avatar/banner media references
- `member_profile_media`
- `member_profile_media_events`
- private Storage bucket `member-profile-media`

Direct broad profile reads are not opened. Browser code calls Edge Functions that return safe profile DTOs.

Profile Edge Functions:

- `list-member-profiles`
- `get-member-profile`
- `submit-member-profile-media`
- `list-member-profile-media-queue`
- `moderate-member-profile-media`

Member profile listing and profile loading require active, recent Discord verification. Moderator media queue and approval use the same server-side Moderator role check as the Leader Dashboard gallery queue.

## Next App Surface

Routes:

- `/members`
- `/members/[slug]`

Both routes are marked `noindex`. Do not add them to the public sitemap unless a later owner-approved visibility decision changes that.

The Twills page remains a protected static profile and now shares a reusable profile display component. Do not change `data/twills.json` `profile.bio` while working on dynamic member profiles.

Account adds:

- profile visibility toggle
- profile link when published
- avatar and banner upload controls
- latest avatar/banner review status

Leader Dashboard adds:

- profile media review queue
- avatar/banner preview
- approve/decline controls
- decline reason capture

## Verification

Run:

```sh
npm run check:member-profiles-and-ranks
npm run check:reaper-discord-interactions
npm run check:supabase-edge-types
git diff --check
cd apps/web && npm run lint && npm run build
```

Manual preview:

- signed-out `/members` is blocked
- active verified member can load `/members`
- unpublished profiles stay hidden
- published profile loads at `/members/[slug]`
- pending/rejected media does not render on profiles
- approved avatar/banner media renders through signed URLs
- non-moderator cannot open profile media queue
- moderator can approve/reject profile media
- `/twills` remains unchanged

Live Discord role sync is not part of automated tests. Run `/sync-ranks mode:preview` first, then use `mode:apply confirm:true` only after owner approval and Discord role hierarchy verification.
