# Reaper ModMail Audit

This runbook keeps Mochirii's native ModMail setup verifiable without replacing ModMail or reading ticket message content. ModMail bot `575252669443211264` should let members DM staff, ping Moderator role `1078630751165222984`, and write ticket logs to channel `1165567735871311914`.

Primary sources:

- ModMail commands: https://modmail.xyz/commands
- ModMail FAQ: https://modmail.xyz/faq
- ModMail overview: https://modmail.xyz/
- Discord ModMail safety guide: https://discord.com/safety/using-modmail-bots
- Discord permissions: https://docs.discord.com/developers/topics/permissions
- Discord channel resource: https://docs.discord.com/developers/resources/channel
- Discord privileged intents: https://support-dev.discord.com/hc/en-us/articles/6207308062871-What-are-Privileged-Intents

## Reaper Audit Command

Production Reaper supports a moderator-only read-only command:

```text
/audit-modmail
```

The command:

- requires guild `1078630751077142608`
- requires caller role `1078630751165222984`
- responds ephemerally
- checks only Discord metadata, IDs, roles, channels, and permission bits
- does not read, mirror, email, store, or summarize ModMail ticket message content
- does not send native ModMail commands on behalf of staff

Register it with a dry run first:

```sh
npm run register:reaper-modmail-audit-command
```

Approved live registration:

```sh
npm run register:reaper-modmail-audit-command -- --apply
```

## Native ModMail Setup

Reaper cannot read third-party ModMail internal config through Discord's public API. `=viewconfig` is the source of truth for ModMail settings.

Run these in Discord as an administrator or authorized ModMail operator:

```text
=viewconfig
=accessrole <@&1078630751165222984>
=pingrole <@&1078630751165222984>
=logging <#1165567735871311914>
=commandonly
```

Use `=commandonly` only if `=viewconfig` shows command-only replies are currently disabled. This protects staff discussion from accidentally being relayed to members.

Do not enable `=loggingplus` unless separately approved, because it can include sent/received message content or AI summaries. The approved posture for this audit is metadata-only.

## What `/audit-modmail` Verifies

- ModMail bot `575252669443211264` is present in the guild.
- Moderator role `1078630751165222984` exists and has at least one member.
- Log channel `1165567735871311914` exists and is a normal text channel.
- `@everyone` cannot view the log channel.
- Moderator role can view the log channel and read message history.
- ModMail bot can view, send messages, embed links, and read message history in the log channel.
- Moderator role is not globally mentionable.
- ModMail bot has scoped mention permission in the audited channel so staff pings do not require making the role globally mentionable.

## Live Acceptance

1. Run `=viewconfig` and confirm access role, ping role, logging channel, and command-only mode.
2. Run `/audit-modmail` and resolve any failures.
3. Use a non-staff test member to DM ModMail.
4. Confirm ModMail creates a private staff ticket.
5. Confirm Moderator role receives the new-ticket ping.
6. Confirm channel `1165567735871311914` receives the expected metadata/log entry.
7. Confirm staff can reply through ModMail and the member receives the reply.
8. Record no-secret evidence only: command used, pass/fail status, IDs, and timestamps. Do not record ticket text, transcripts, raw user data, bot tokens, cookies, or private DMs.

## Troubleshooting

- If `=viewconfig` is wrong, fix native ModMail config first with `=accessrole`, `=pingrole`, and `=logging`.
- If `/audit-modmail` says the log channel is public, deny View Channel to `@everyone` on the log channel or parent category.
- If Moderator cannot read logs, allow View Channel and Read Message History for role `1078630751165222984`.
- If ModMail cannot write logs, allow View Channel, Send Messages, Embed Links, and Read Message History for bot `575252669443211264`.
- If Moderator pings fail during the live ticket test, grant ModMail scoped Mention Everyone permission in the ModMail ticket/log area. Do not make the Moderator role globally mentionable.
