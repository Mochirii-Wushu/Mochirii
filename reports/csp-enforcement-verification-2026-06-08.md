# CSP Enforcement Verification - 2026-06-08

## Summary

This report records the browser pass used to promote the Mōchirīī production app from `Content-Security-Policy-Report-Only` to enforced `Content-Security-Policy`.

The policy source list is unchanged in this packet. The only app-code change is the response header key in `apps/web/next.config.ts`.

## Browser Evidence

Chrome production checks found no CSP report-only console violations on these routes after hydration:

- `https://mochirii.com/`
- `https://mochirii.com/join`
- `https://mochirii.com/gallery`
- `https://mochirii.com/auth`
- `https://mochirii.com/account`
- `https://mochirii.com/gallery-submit`
- `https://mochirii.com/leader-dashboard`
- `https://mochirii.com/spotify`
- `https://mochirii.com/members`
- `https://mochirii.com/members/twills`
- `https://mochirii.com/members/meenarii`

The same browser pass confirmed hydrated Vercel observability scripts on the checked production routes:

- `@vercel/analytics/next`
- `@vercel/speed-insights/next`

## Guardrails

- No DNS, Cloudflare proxy, Vercel dashboard, Supabase, Discord, secret, route, copy, or asset settings changed in this CSP packet.
- Discord and Spotify embeds, Supabase signed URLs, Vercel observability, auth pages, gallery pages, and dashboard pages must stay within the existing allowlist.
- Future third-party embeds or script providers must be added intentionally and verified in Chrome before they are allowed by CSP.

## Release Verification Required

After merge and Vercel production deployment, recheck:

- `Content-Security-Policy` is present.
- `Content-Security-Policy-Report-Only` is absent.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, and `X-Frame-Options` remain present.
- Home, Gallery, Auth, Account, Gallery Submit, Leader Dashboard, Spotify, Members, and one member profile route load without console CSP errors.
