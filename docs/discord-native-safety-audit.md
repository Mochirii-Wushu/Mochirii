# Discord Native Safety Audit

This runbook keeps Discord community safety controls visible as the primary onboarding and moderation layer. Reaper, Supabase Edge Functions, and website checks are support systems; they must not replace Discord-native Rules Screening, Community Onboarding, AutoMod, Raid Protection, role hierarchy hygiene, and moderator account safety.

Primary sources:

- Discord Community Onboarding FAQ: https://support.discord.com/hc/en-us/articles/11074987197975-Community-Onboarding-FAQ
- Discord Rules Screening FAQ: https://support.discord.com/hc/en-us/articles/1500000466882-Rules-Screening-FAQ
- Discord AutoMod FAQ: https://support.discord.com/hc/en-us/articles/4421269296535-AutoMod-FAQ
- Discord Raid Protection: https://support.discord.com/hc/en-us/articles/10989121220631-How-to-Protect-Your-Server-from-Raids-101
- Discord Activity Alerts and Security Actions: https://support.discord.com/hc/en-us/articles/17439993574167-Activity-Alerts-Security-Actions
- Discord Server Setup Guide: https://support.discord.com/hc/en-us/articles/33023827550359-Discord-Server-Setup-Guide
- Discord Community Server setup: https://support.discord.com/hc/en-us/articles/360047132851-Enabling-Your-Community-Server

## Cadence

Run this audit monthly, and before any release that changes:

- Discord verification or onboarding channels
- Reaper slash commands or Gateway member handling
- role sync or rank-role behavior
- vote reminders, spotlight polls, or event sync
- public Join, Events, Account, or member workflow copy

This audit is read-only evidence unless a separate owner-approved Discord operations packet explicitly authorizes a server change.

## No-Secret Evidence Rules

Record only:

- audit date
- operator
- guild id `1078630751077142608`
- setting status: configured, reviewed, intentionally disabled, needs follow-up
- channel and role IDs needed for follow-up
- aggregate counts or screenshots with private member data hidden
- follow-up PRs or private Discord operator tasks

Never record:

- Discord bot tokens
- OAuth client secrets
- webhook URLs
- interaction tokens
- cookies
- raw request headers
- private message content
- moderation case details naming uninvolved members
- screenshots exposing private channels or member personal data

## Checklist

### Community Base

- Community mode is enabled where needed for Community Onboarding and Rules Screening.
- The server has a clear rules channel and moderator-only updates/log channel.
- New-member default channels show useful first steps, not noise.
- The verification/help category includes clear instructions and a human help path.

### Rules Screening

- Rules Screening is configured intentionally.
- New members must agree to rules before normal participation.
- Rules text is short, direct, and aligned with public website onboarding copy.
- Moderators know how Rules Screening interacts with members who already receive roles.

### Community Onboarding

- Default channels are the channels every new member should see first.
- Onboarding questions route members to useful channels or roles without bypassing verification.
- New-member paths do not depend on hidden website-only instructions.
- Onboarding and the website Join checklist point to the same help/rules/verification flow.

### AutoMod

- Mention-spam controls are configured.
- Harmful keyword, invite/link, and suspicious content filters are reviewed for the guild's current risk.
- AutoMod actions send alerts to a moderator-visible channel.
- Exceptions are intentional, documented privately, and reviewed after incidents.

### Raid Protection And Alerts

- Raid Protection is enabled or intentionally reviewed in Safety Setup.
- Activity Alerts have a moderator-visible alert channel.
- CAPTCHA/security actions are understood by moderators before a high-join event or public invite push.
- Moderator response steps are documented outside public channels.

### Roles And Mentions

- `@everyone` and `@here` mention permissions are denied for non-admin/non-moderator roles unless explicitly intended.
- Non-admin roles cannot mention all roles or create broad announcement pings unless explicitly intended.
- Role hierarchy keeps Reaper below owner/admin roles and high enough only for approved bot duties.
- Moderator/admin roles require careful assignment and regular review.
- Moderator accounts use 2FA where Discord requires or the server policy expects it.

### Reaper Backstop

- `docs/reaper-pending-verification-containment.md` remains accurate: containment is a backstop, not primary onboarding.
- `/sync-pending-verification mode:preview confirm:false` is run before apply when containment evidence is needed.
- Reaper responses stay ephemeral and operational logs stay private/redacted.
- Contained users are never publicly shamed or announced.

## Forbidden During This Audit

Do not perform these actions as part of the read-only audit:

- bulk role permission changes
- role hierarchy moves
- channel overwrite rewrites
- slash-command apply operations
- bot token rotation
- webhook creation or deletion
- exporting message history
- posting public moderation callouts

Those actions belong in separate Discord/Reaper release or incident packets.

## Evidence Template

```md
## Discord Native Safety Audit

- Date:
- Operator:
- Guild id: 1078630751077142608
- Community mode: configured/reviewed/needs follow-up
- Rules Screening: configured/reviewed/needs follow-up
- Community Onboarding: configured/reviewed/needs follow-up
- AutoMod: configured/reviewed/needs follow-up
- Raid Protection and Activity Alerts: configured/reviewed/needs follow-up
- Verification/help category: configured/reviewed/needs follow-up
- Mention permissions: configured/reviewed/needs follow-up
- Role hierarchy and moderator 2FA: configured/reviewed/needs follow-up
- Reaper containment posture: backstop confirmed/needs follow-up
- Follow-up PRs/tasks:
- Notes: no secrets, tokens, private message content, or public shaming recorded
```
