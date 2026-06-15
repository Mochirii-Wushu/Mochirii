# Multi-Provider Login And Verification

This feature separates four layers that must stay distinct:

- Authentication: Supabase Auth proves control of a Discord, Phone, Apple, Facebook, Google, Kakao, Twitch, or Spotify identity.
- Identity linking: signed-in users can link more OAuth identities to one Supabase account.
- Member verification: Discord can be checked automatically against the live guild and required roles; non-Discord identities require moderator review.
- Gallery authorization: Supabase RLS and Storage policies allow upload only for active members with recent Discord verification or approved, unexpired member verification.

## Provider Setup

- Supabase Site URL: `https://mochirii.com`.
- OAuth callback URL for every social provider: `https://deyvmtncimmcinldjyqe.supabase.co/auth/v1/callback`.
- Redirect allowlist should include production, approved Vercel preview patterns, and localhost development.
- Browser/Vercel public env may contain only provider IDs and public readiness flags:
  - `NEXT_PUBLIC_AUTH_PROVIDER_IDS=discord,google,...`
  - `NEXT_PUBLIC_PHONE_AUTH_READY=true`
  - `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=true`
- OAuth client secrets stay only in Supabase Auth provider settings.
- Phone stays disabled unless SMS provider, CAPTCHA, Auth rate limits, country/cost expectations, and abuse handling are configured.

## Provider Notes

- Discord: automatic verification through guild membership, onboarding state, and required roles.
- Apple: member review required; schedule six-month OAuth secret rotation.
- Facebook: request `email`; missing email requires manual review.
- Google: use minimal `openid email profile` scopes.
- Kakao: use `profile_nickname profile_image` unless the app is approved as a Kakao Biz App for `account_email`; missing email requires manual review.
- Twitch and Spotify: identity evidence only, not membership proof.
- Phone: SMS control only; moderator review is still required for gallery access.

## Tables And Policies

- `member_auth_identities` stores redacted identity evidence only: provider, provider subject, verified email/phone flags, display label, and timestamps.
- `member_verifications` stores current gallery access status, method, reviewer, timestamps, expiry, and redacted reason.
- Neither table grants direct `anon` or `authenticated` access.
- `private.member_has_gallery_upload_access(uuid)` is the RLS helper used by gallery submission and Storage policies.

## Edge Functions

- `verify-member-access`: syncs linked identities, refreshes Discord verification when requested, and returns redacted gallery eligibility.
- `review-member-verification`: moderator-only approve/reject/revoke endpoint for non-Discord member verification. Approval activates a pending profile; suspended or archived profiles must be restored separately.
- `verify-discord-member`: retained as the Discord-specific compatibility endpoint during rollout.

## Moderator Review

- Leader Dashboard includes a moderator-only Member Verification panel for approving, rejecting, or revoking non-Discord gallery access by Supabase user id.
- Moderators must use redacted notes only. Do not paste private messages, provider payloads, tokens, cookies, raw headers, or OAuth response bodies.
- Activation evidence belongs in the private ignored `.local/multi-provider-login-activation-ledger.md` ledger, with status/counts only.

## Activation Checklist

1. Configure providers privately in Supabase Auth.
2. Set public provider allowlist only after each provider is dashboard-ready.
3. Keep Phone disabled until CAPTCHA/rate-limit/cost checks are complete.
4. Deploy `verify-member-access` and `review-member-verification`.
5. Smoke each enabled provider flow without recording tokens, cookies, raw headers, or OAuth payloads.
6. Confirm a non-Discord account remains blocked until moderator approval.
7. Confirm an approved, active member can upload and an expired/revoked/suspended/archived member cannot.

## Out Of Scope

New website login methods do not grant Mochi Social alpha access, Fly game access, Enjin wallet access, Enjin transactions, Fuel Tanks, cENJ funding, Discord role mutation, or Discord message-content access.
