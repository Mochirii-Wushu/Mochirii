# Mochi Social Tester Password Local Smoke

Generated: 2026-06-14T05:42:39.975Z

This file is intentionally no-secret. It proves the localhost tester-password gate without recording the tester password, cookies, tokens, or hosted-provider evidence.

## Result

- OK: yes
- Access mode: tester-password
- Spawned local server: yes
- Password material stored: no

## Steps

| Step | Result | HTTP | Detail |
| --- | --- | --- | --- |
| server-ready | pass | 200 | Local site route responded. |
| locked-page | pass | 200 | Tester password gate renders without iframe. |
| invalid-password | pass | 303 | Invalid password redirects without session cookie. |
| valid-password | pass | 303 | Valid password sets scoped HttpOnly tester cookie. |
| unlocked-page | pass | 200 | Unlocked page renders iframe shell and no-real-value Canary copy. |
| logout | pass | 303 | Logout clears the scoped tester cookie. |

## Failures

- None
