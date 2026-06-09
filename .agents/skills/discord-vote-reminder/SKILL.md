# Discord Vote Reminder

Use this skill when work mentions Discord vote reminders, vote links, vote streaks, `Done voting`, `/vote-status`, `/vote-leaderboard`, `/vote-reminder-preview`, or channel `1082802012095266866`.

## Boundaries

- Never automate third-party upvotes, vote submissions, CAPTCHA bypasses, browser clicks, vote-site sessions, or external vote checks.
- Only implement reminders, safe link presentation, manual member confirmations, and track-only status/streak reporting.
- Keep `DISCORD_BOT_TOKEN`, `DISCORD_PUBLIC_KEY`, `VOTE_REMINDER_CRON_SECRET`, Supabase service-role keys, webhook URLs, and OAuth secrets server-side only.

## Source Order

1. `docs/vote-reminder-runbook.md`
2. `supabase/README.md`
3. Discord Interactions and Components docs
4. Supabase Edge Function scheduling and secrets docs
5. Codex manual guidance for verification-focused implementation

## Implementation Checklist

- Keep `send-vote-reminder` as the scheduled sender.
- Keep `reaper-discord-interactions` as the Discord interaction endpoint.
- Preserve raw-body Ed25519 signature verification before parsing Discord interaction JSON.
- Use `allowed_mentions: { parse: [] }` for reminder and interaction messages.
- Keep `vote_done:<YYYY-MM-DD>` custom IDs under Discord's 100-character limit.
- Store vote data in `vote_confirmations` and `vote_reminder_sends` with service-role-only access.
- Validate with `npm run check:vote-reminder`, `npm run test:vote-reminder`, `npm run check:reaper-discord-interactions`, `npm run check:supabase-edge-types`, and `git diff --check`.
