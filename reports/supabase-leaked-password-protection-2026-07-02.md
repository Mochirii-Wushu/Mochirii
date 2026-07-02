# Supabase Leaked-Password Protection Packet - 2026-07-02

## Scope

This packet covers the Supabase Auth leaked-password protection hardening step for project `deyvmtncimmcinldjyqe`. It is intentionally no-secret: no access tokens, private settings, token digests, SMTP secrets, or provider private values are recorded.

## Source Basis

- Supabase Auth exposes leaked-password protection through the Auth config field `password_hibp_enabled`.
- Supabase Management API exposes read/update operations at `/v1/projects/{ref}/config/auth`.
- Supabase security advisors include `auth_leaked_password_protection` as a security finding category.

## Current Safe Auth State

- `password_hibp_enabled`: `false` after the attempted change.
- `password_min_length`: `6`.
- `password_required_characters`: empty policy string.
- `security_update_password_require_reauthentication`: `true`.

## Attempted Provider Change

Approved scope for this step was limited to setting `password_hibp_enabled` to `true`. The PATCH was rejected by Supabase before changing the config:

```text
Configuring leaked password protection via HaveIBeenPwned.org is available on Pro Plans and up.
```

A follow-up safe-field read confirmed `password_hibp_enabled` remained `false`.

## User Impact

Enabling this setting would reject passwords found in known breach corpuses during password setup/change flows. Because the project plan currently blocks the setting, there is no current user-facing behavior change from this step.

## Rollback Path

If the project is upgraded later and this setting is enabled, rollback is limited to disabling leaked-password protection in Supabase Auth settings or PATCHing `password_hibp_enabled: false` through the Management API. That rollback would restore the current password-breach-check behavior.

## Status

Blocked by Supabase plan entitlement. No remote Auth config mutation was applied.
