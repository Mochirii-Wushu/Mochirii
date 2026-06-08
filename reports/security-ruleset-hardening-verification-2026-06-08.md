# Security Ruleset Hardening Verification

Date: 2026-06-08
Branch: `codex/security-ruleset-verification`

## Summary

This report records the GitHub ruleset hardening pass for the Mōchirīī production repository. The active default-branch ruleset now requires the stable checks used by the current Vercel/Next, Supabase Preview, and CodeQL release path.

No app code, public copy, assets, DNS, Vercel project settings, Supabase settings, Discord settings, Cloudflare settings, or secrets changed in this report-only branch.

## Ruleset State

- Repository: `Mochirii-Wushu/Mochirii`
- Ruleset: `Primary Rules`
- Enforcement: `active`
- Target: default branch
- Protected branch behavior retained:
  - deletion blocked
  - non-fast-forward pushes blocked
  - pull requests required
- Required status checks:
  - `validate`
  - `validate-next`
  - `CodeQL`
  - `Vercel`
  - `Supabase Preview`

## Verification Intent

This branch exists to prove the expanded required-check list behaves correctly on a normal pull request before further provider-dashboard hardening work continues.

Expected PR behavior:

- `validate` and `validate-next` must pass.
- Aggregate `CodeQL` must pass; individual CodeQL matrix job names are not required.
- Canonical `Vercel` must pass.
- `Supabase Preview` must pass or complete as an intentional skipped-success state when no Supabase files changed.

## Remaining Security Follow-Ups

- Verify Vercel Firewall and DDoS visibility in the Vercel dashboard.
- Verify Cloudflare keeps Vercel web records DNS-only.
- Verify Supabase Auth redirect URLs, Storage privacy, Edge Function deployed settings, and secret names.
- Rotate the exposed Discord bot token and update only Supabase secrets.
- Run the CSP report-only browser pass before any enforcement PR.
