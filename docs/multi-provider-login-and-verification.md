# Multi-Provider Login And Verification

This feature separates four layers that must stay distinct:

- Authentication: Supabase Auth proves control of an approved sign-in identity.
- Identity linking: signed-in users can link more OAuth identities to one Supabase account.
- Member verification: Discord can be checked automatically against the live guild and required roles; non-Discord identities require moderator review.
- Gallery authorization: Supabase RLS and Storage policies allow upload only for active members with recent Discord verification or approved, unexpired member verification.

## Current Provider State

| State | Providers | Operational rule |
| --- | --- | --- |
| Active | Discord, Google, Twitch | Keep enabled in Supabase Auth production and keep the public website allowlist at `NEXT_PUBLIC_AUTH_PROVIDER_IDS=discord,google,twitch`. |
| Visible placeholder | Apple | Keep disabled in Supabase Auth production and render as setup-pending with `NEXT_PUBLIC_AUTH_PROVIDER_PLACEHOLDER_IDS=apple` until the Apple Developer setup, Services ID, callback, and six-month client-secret rotation calendar are ready. |
| Deferred | Facebook, Kakao, Spotify, Phone | Keep disabled and hidden from public activation until a scoped provider lane is reopened. |

This is an operational activation list, not a destructive schema list. Existing code and database constraints may retain historical/future provider values so linked identity history and future Apple work do not need a migration churn pass.

Deferred Phone readiness was captured in PR #300, <https://github.com/Mochirii-Wushu/Mochirii/pull/300>, at commit `850a13df22853778d8a48ad6b5a319ae029739bc`. Keep it closed/deferred unless the Phone lane is explicitly resumed with SMS provider, CAPTCHA, rate-limit, cost, and abuse controls.

## Provider Setup

- Supabase Site URL: `https://mochirii.com`.
- OAuth callback URL for every social provider: `https://deyvmtncimmcinldjyqe.supabase.co/auth/v1/callback`.
- Redirect allowlist should include production, approved Vercel preview patterns, and localhost development.
- Browser/Vercel public env may contain only provider IDs and public readiness flags:
  - `NEXT_PUBLIC_AUTH_PROVIDER_IDS=discord,google,twitch`
  - `NEXT_PUBLIC_AUTH_PROVIDER_PLACEHOLDER_IDS=apple`
  - `NEXT_PUBLIC_PHONE_AUTH_READY=false`
  - `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=false`
- OAuth client secrets stay only in Supabase Auth provider settings.
- Phone stays disabled unless SMS provider, CAPTCHA, Auth rate limits, country/cost expectations, and abuse handling are configured in a separate lane.

## Provider Notes

- Discord: automatic verification through guild membership, onboarding state, and required roles.
- Apple: visible setup-pending placeholder only; member review required after activation and schedule six-month OAuth secret rotation before enabling.
- Google: use minimal `openid email profile` scopes.
- Twitch: identity evidence only, not membership proof.
- Facebook: deferred; request `email` only if the Facebook lane is reopened.
- Kakao: deferred; keep disabled until the app is approved as a Kakao Biz App for `account_email` or leadership accepts a profile-only manual-review path.
- Spotify: deferred; identity evidence only and no membership proof.
- Phone: deferred; SMS control only and still requires moderator review for gallery access.

## Apple Activation Gate

Apple login uses Supabase Auth's hosted OAuth callback, not a Vercel route or a
custom website callback:

```text
https://deyvmtncimmcinldjyqe.supabase.co/auth/v1/callback
```

Stable Apple Developer identifiers for this website lane:

```text
App ID: com.mochirii.web
App ID description: Mochirii Web
Services ID: com.mochirii.web.login
Services ID description: Mochirii Website Login
Domain: deyvmtncimmcinldjyqe.supabase.co
```

Credential artifacts, Apple key metadata, generated client-secret expiry notes,
and rotation notes belong only under `C:\Users\xtyty\Documents\Creds`. Do not
commit or print Apple private key material, generated client secrets, token
payloads, cookies, raw OAuth responses, or digests of those values.

Apple is identity evidence only. It does not automatically prove Discord guild
membership, role ownership, gallery upload eligibility, moderator access,
Mochirii Social account creation, or any game access. First activation testing
must link Apple to the existing admin account from Account before testing
signed-out Apple login, so the flow does not accidentally create a duplicate
admin identity.

Apple's generated OAuth client secret must be rotated on a six-month cadence.
Record the next rotation date in the local credential notes after enabling the
provider.

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
- End-to-end approve/revoke proof belongs in Supabase Preview only. Use `npm run smoke:member-verification-preview` with `ALLOW_PREVIEW_MEMBER_VERIFICATION_SMOKE=true`; the script refuses the production project `deyvmtncimmcinldjyqe`.

## Activation Checklist

1. Confirm Supabase Auth production has only Discord, Google, and Twitch enabled among the current active set.
2. Confirm Apple, Facebook, Kakao, Spotify, and Phone remain disabled in Supabase Auth production.
3. Set the public provider allowlist to `discord,google,twitch` only.
4. Set the public placeholder list to `apple` only.
5. Deploy `verify-member-access` and `review-member-verification`.
6. Smoke Discord, Google, and Twitch provider flows without recording tokens, cookies, raw headers, or OAuth payloads.
7. Confirm Apple is visible but not clickable until the provider lane is approved.
8. Confirm a non-Discord account remains blocked until moderator approval.
9. In Supabase Preview, confirm an approved active member can upload and an expired/revoked/suspended/archived member cannot.

## Out Of Scope

New website login methods do not grant Mochi Social alpha access, Fly game access, Enjin wallet access, Enjin transactions, Fuel Tanks, cENJ funding, Discord role mutation, or Discord message-content access.
