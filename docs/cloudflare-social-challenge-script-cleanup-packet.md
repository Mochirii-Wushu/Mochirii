# Cloudflare Social Challenge Script Cleanup Packet

Last refreshed: 2026-07-06

Host: `https://social.mochirii.com`

This is an approval packet only. Do not change Cloudflare, DNS, TLS, WAF, cache, or bot settings from this document without a separate explicit approval naming the exact setting and rollback path.

## Current Evidence

Read-only extraction of `https://social.mochirii.com` still finds:

```text
/cdn-cgi/challenge-platform/scripts/jsd/main.js
```

Cloudflare documents this path as JavaScript Detections injection. The feature can be useful for bot scoring, but it adds public page-source residue that is not Mochirii-owned branding and may complicate CSP or source-integrity review.

## Source Basis

- Cloudflare JavaScript Detections: https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/
- Cloudflare Configuration Rules: https://developers.cloudflare.com/rules/configuration-rules/
- Repo provider approval rules: `docs/integration-operations-runbook.md`

## Recommended Change

Use the narrowest available Cloudflare control for `social.mochirii.com` only:

- Match hostname exactly: `http.host eq "social.mochirii.com"`.
- Prefer a hostname-scoped Configuration Rule or Bot/JavaScript Detections setting if the current Cloudflare plan exposes it.
- Disable only the script-injection feature that emits `/cdn-cgi/challenge-platform/scripts/jsd/main.js`.
- Do not weaken TLS mode, DNS proxying, WAF managed rules, rate limits, cache behavior, or other host protections in the same change.

If the dashboard shows Bot Fight Mode forces JavaScript Detections and cannot disable it narrowly, stop and record that as an accepted public-source limitation instead of weakening broader Cloudflare security.

## Approval Prompt

```text
Approve disabling Cloudflare JavaScript Detections script injection for hostname social.mochirii.com only, using the narrowest available hostname-scoped Cloudflare rule/setting. Do not change DNS, TLS, WAF managed rules, cache rules, or bot protections outside the injected challenge script behavior. Rollback: remove the hostname rule or restore JavaScript Detections for social.mochirii.com.
```

## Verification

After approval and change:

1. Fetch `https://social.mochirii.com` and confirm `/cdn-cgi/challenge-platform/scripts/jsd/main.js` is absent.
2. Verify `https://social.mochirii.com`, `/login`, `/settings/avatar`, compose, profile, and admin pages still load.
3. Confirm Cloudflare proxy/TLS still works for `social.mochirii.com`.
4. Confirm no new provider-brand residue appears in public/member source.
5. Revert the Cloudflare rule if login, upload, or admin flows regress.
