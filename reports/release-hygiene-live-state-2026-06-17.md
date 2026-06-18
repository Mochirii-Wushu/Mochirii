# Release Hygiene Live State - 2026-06-17

## Summary

This report records Packet 1 of the six-packet Mochirii full-stack polish, security, and performance roadmap. It is evidence-only: no app behavior, public copy, route, image, schedule, Supabase schema, Discord setting, Vercel setting, Cloudflare DNS record, or secret changed in this packet.

## Working Branch

- Worktree: `C:\Users\xtyty\Documents\Mochirii-release-hygiene`
- Branch: `codex/release-hygiene-live-state`
- Base: `origin/main` at `5103ba4fb11709240ffe38d560e0b322f20b2320`
- Commit message on base: `Resolve web audit advisories`

The primary checkout at `C:\Users\xtyty\Documents\Mochirii` is intentionally untouched because it contains unrelated Reaper and Mochi Social work.

## Production Evidence

- Canonical site: `https://mochirii.com`
- Live root header check returned `200 OK` with `Server: Vercel`.
- Production headers include enforced `Content-Security-Policy`, `Access-Control-Allow-Origin: https://mochirii.com`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, and `X-Frame-Options: DENY`.
- Live route smoke returned `200` for `/`, `/join`, `/events`, `/gallery`, `/ranks`, `/leaders`, `/codex`, `/announcements`, `/raffles`, `/spotify`, `/spotlight`, `/twills`, `/auth`, `/account`, `/members`, `/gallery-submit`, and `/leader-dashboard`.

## GitHub Rulesets

Active rulesets verified through the GitHub API:

- `Primary Rules`
  - prevents branch deletion
  - prevents non-fast-forward updates
  - requires `validate`
  - requires `validate-next`
  - requires `CodeQL`
  - requires `Vercel`
  - requires `Supabase Preview`
- `Pull Request Review Gate`
  - requires one approving review
  - requires review thread resolution
  - allows merge, squash, and rebase merge methods

## Open PR Queue

Open PRs were inventoried but not closed in this packet. The queue contains useful but stale work packets, active Mochi Social work, and Dependabot branches. Treat every item below as a separate decision before merging, rebasing, or closing.

### Active Or Recently Requested Work

- `#306` draft, behind: `codex/instagram-manual-share-meta-diagnostic` - Instagram manual share and Meta diagnostic.
- `#305` draft, behind: `codex/mochi-social-live-copy` - Mochi Social alpha progress Edge contract.
- `#301` ready, behind: `codex/auth-provider-state-cleanup` - auth provider cleanup state.
- `#292` ready, behind: `codex/mochi-social-alpha-rc` - Mochi Social tester password local smoke.

### Audit, Polish, And Process Drafts

- `#291` draft, behind: visual hierarchy text-fit audit.
- `#290` draft, dirty: Discord native safety audit.
- `#288` draft, behind: events community board polish.
- `#287` draft, behind: gallery discovery search polish.
- `#286` draft, behind: refinement merge queue snapshot.
- `#285` draft, behind: route information architecture guard.
- `#284` draft, behind: parallel agent merge coordination guard.
- `#283` draft, dirty: Mochi Social tester journey clarity.
- `#282` draft, behind: visual screenshot evidence matrix.
- `#281` draft, behind: social preview QA matrix.
- `#280` draft, behind: Mochi Social Fly evidence guard.
- `#279` draft, behind: Supabase advisor lint cadence.
- `#278` draft, behind: community health signal matrix.
- `#277` draft, behind: Join onboarding funnel.
- `#276` draft, behind: operator index audit.
- `#275` draft, behind: Lighthouse route matrix.
- `#274` draft, behind: Supabase security definer audit.
- `#273` draft, behind: rollback surface drift audit.
- `#272` ready, behind: accessibility smoke and font CSP fix.
- `#271` ready, behind: CI release ladder.
- `#270` ready, behind: production review gate evidence.

### Dependabot

- `#297` blocked: Next `16.2.9`.
- `#296` blocked: ESLint `10.5.0`.
- `#295` blocked: `@types/node` `25.9.3`.
- `#294` blocked: TypeScript `6.0.3`.
- `#293` blocked: `eslint-config-next` `16.2.9`.

Handle safe patch or minor dependency work in targeted dependency-maintenance PRs. Keep incompatible majors or preview/tooling moves separate.

## Worktree And Branch Hygiene

Current worktrees include the primary checkout, the release-hygiene checkout, active Mochi Social/auth/Instagram worktrees, and old release worktrees. No worktree or branch was removed in this packet because several local branches have gone remotes but still need an explicit unique-work review before deletion.

Known cleanup candidates after review:

- `C:\Users\xtyty\Documents\Mochirii-csp-cors-polish`
- `C:\Users\xtyty\Documents\Mochirii-twills-avatar`
- `C:\Users\xtyty\Documents\Mochirii-web-audit-advisories`

Do not delete active Mochi Social or Reaper worktrees as part of general site cleanup.

## Supabase Evidence

- Supabase CLI version: `2.105.0`.
- Newer CLI observed: `2.107.0`.
- `supabase functions list --project-ref deyvmtncimmcinldjyqe` succeeded.
- Expected website, Reaper, Instagram, vote reminder, spotlight poll, profile, member verification, and Mochi Social alpha Edge Functions are active.
- Secret values were not read or recorded.

Future Supabase hardening packet should address:

- enabling Auth leaked-password protection in the dashboard;
- documenting intentional service-role-only RLS/no-policy tables;
- adding high-value foreign-key indexes where advisors flagged real workflow paths;
- narrowing protected Edge Function CORS where safe;
- deferring Mochi Social-specific RLS performance warnings unless that feature packet is active.

## Cloudflare And DNS

- Cloudflare remains DNS-only for Vercel web records.
- Live root response shows Vercel is serving production.
- No DNS mutation was performed.

## Next Roadmap Packet

Packet 2 should start from a new clean branch and target first-viewport visual hierarchy and design-system polish only. It should avoid copy, timestamp, schedule, image-source, Supabase, Discord, Vercel, and Cloudflare mutations.
