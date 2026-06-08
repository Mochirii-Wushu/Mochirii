# PostCSS Advisory Resolution

Date: 2026-06-08
Branch: `codex/resolve-postcss-advisory`

## Summary

This pass resolves the known moderate PostCSS advisory without using `npm audit fix --force`. The audit path reported a breaking remediation that would downgrade or otherwise disrupt the Next dependency graph, so the targeted fix is an npm override for the vulnerable transitive PostCSS package.

## Advisory

- Advisory: GHSA-qx2v-qp2m-jg93 / CVE-2026-41305
- Package: `postcss`
- Affected range: `<8.5.10`
- Patched baseline selected: `8.5.15`
- Current stable Next line checked during planning: `next@16.2.7` still declares `postcss@8.4.31`.

## Implementation

- `apps/web/package.json` adds an npm override:
  - `postcss@8.5.15`
- `apps/web/package-lock.json` is regenerated with npm.
- No app code, routes, copy, Supabase, Discord, DNS, Vercel settings, or Cloudflare settings are changed.

## Follow-Up

The override is temporary. Remove it in a later dependency PR after stable Next ships with a patched PostCSS dependency and `npm audit --audit-level=moderate` remains clean without the override.
