# Hosted Runtime Readback — 2026-07-24

This record contains only non-sensitive provider state observed through a
read-only Supabase project connection. It contains no credential values,
account identifiers, host addresses, or raw provider output.

## Supabase Cron

| Schedule | UTC cron | Enabled | Latest observed execution |
| --- | --- | --- | --- |
| `mochirii-send-member-spotlight-poll` | `5 16 * * *` | Yes | Succeeded on 2026-07-23 |
| `mochirii-publish-member-spotlight-winner` | `20 16 * * *` | Yes | Succeeded on 2026-07-23 |

The planned vote-reminder schedule was not active. No schedule, function,
secret, or other provider state was changed during this readback.

## Remaining evidence

The Reaper Gateway worker host/supervisor readback and Social encrypted-backup
restore readback remain pending. They must not be marked verified from source
configuration alone.
