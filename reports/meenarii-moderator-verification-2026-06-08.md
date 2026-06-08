# Meenarii Moderator Verification - 2026-06-08

## Summary

`meenarii` has a linked Discord website account and Discord now shows the required website roles plus the Moderator role. Supabase has not refreshed the member profile yet because the active Chrome website session is signed in as `faylui`, not `meenarii`.

No Supabase profile fields were manually edited. Discord remains the source of truth for moderator privileges.

## Sanitized Evidence

- Website profile: `meenarii`
- Discord user ID suffix: `4426`
- Supabase profile state before and after Discord role verification:
  - `member_status`: `pending`
  - `has_required_discord_roles`: `false`
  - `discord_member_pending`: `null`
  - `discord_verified_at`: `null`
  - `discord_checked_at`: `null`
  - stored `discord_roles`: empty
- Discord API membership check:
  - onboarding pending: `false`
  - `Mochirii - WWM` role present
  - `Verified` role present
  - `Moderator` role present

## Completion Step

`meenarii` must sign into `https://mochirii.com/auth` with Discord, open Account, and refresh Discord verification. That will let `verify-discord-member` update Supabase from live Discord state.

Expected Supabase profile state after refresh:

- `member_status`: `active`
- `has_required_discord_roles`: `true`
- `discord_member_pending`: `false`
- `discord_verified_at`: populated
- `discord_roles`: includes the required website role IDs

## Safety Notes

- No Discord token, Supabase secret, email, or full Discord user ID was recorded.
- No gallery approval, rejection, Instagram publish, or manual-share action was performed.
- Chrome was not signed out or switched away from the current `faylui` website session.
