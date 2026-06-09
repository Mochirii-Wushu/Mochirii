# Reaper Event Sync Runbook

## Purpose

Reaper syncs the website schedule into Discord Scheduled Events after the website release is live. The source of truth is `data/guild-schedule.json`, mirrored to `apps/web/public/data/guild-schedule.json` and served at:

```text
https://mochirii.com/data/guild-schedule.json
```

## Command

```text
/sync-events mode:<preview|apply> confirm:<true|false>
```

Rules:

- `preview` never changes Discord.
- `apply` requires `confirm:true`.
- The caller must have the configured Moderator role.
- `apply` also requires Discord Create Events and Manage Events permissions.
- Events are external scheduled events pointing to `https://mochirii.com/events`.
- Reaper records managed Discord event IDs in `discord_resources` with `managedBy: "reaper-event-sync"`.

## Schedule Rules

- Monthly gathering: next upcoming first Saturday in UTC+8.
- Monthly raffle: same next upcoming first Saturday in UTC+8.
- Guild Party: every day, 9:30 PM - 10 PM UTC+8.
- Breaking Army: Mondays and Wednesdays, 10 PM - 12 AM UTC+8.
- Showdown: Tuesdays and Thursdays, 10 PM - 12 AM UTC+8.
- Guild Wars: Saturdays and Sundays, 8:30 PM - 11:30 PM UTC+8.
- Guild Hero's Realm: Fridays, 10 PM - 11 PM UTC+8.
- United Resolve: Fridays, 11 PM - 12 AM UTC+8.

## Deployment

After the website PR is merged and Vercel production is Ready:

```sh
supabase functions deploy list-visible-profile-cards
supabase functions deploy reaper-discord-interactions
```

Register or update the guild-scoped Discord command with:

- string option `mode`: `preview` or `apply`
- boolean option `confirm`

Run:

```text
/sync-events mode:preview confirm:false
```

Only after the preview output is clean and owner approval is current, run:

```text
/sync-events mode:apply confirm:true
```

## Rollback

If the apply step creates incorrect Discord events, cancel or edit only the Reaper-managed events shown in the preview/apply output, then revert the website schedule branch or correct `data/guild-schedule.json` and redeploy. Do not delete unrelated Discord events.
