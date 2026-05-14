# Member Account Polish Analysis

Date: 2026-05-14
Branch: `feature/member-account-polish`

## 1. Current Account Page Behavior

`account.html` renders a signed-out prompt and a signed-in account panel. The signed-in panel currently has one main Discord verification card and one editable profile form. `account.js` requires a Discord/Supabase session, loads the current `member_profiles` row, renders verification status, toggles the Submit Image link when upload requirements are met, checks Moderator access for the Leader Dashboard link, and supports sign out.

## 2. Current Profile Edit Behavior

The editable fields are `display_name`, `game_uid`, `discord_handle`, `region`, `timezone`, `avatar_url`, and `bio`. `account.js` reads these from the form and calls `S.updateCurrentProfile(payload)`. `supabase.js` validates the safe editable fields before updating `member_profiles`. The profile save bug fix is present: the form payload is read before `setBusy(true)` disables form controls.

## 3. Current Discord Verification Behavior

The Account page calls `S.verifyDiscordMembership()` when the user clicks Check Discord verification. That helper invokes the server-side `verify-discord-member` Edge Function. Browser code does not perform role enforcement; it only renders UX state from `member_profiles`. Upload eligibility still depends on `member_status = active`, `has_required_discord_roles = true`, and recent `discord_verified_at`.

## 4. Current Upload Access Behavior

`account.js` uses the same client-side active/verified calculation used by the upload flow: member status must be active, required Discord roles must be verified, and the verification timestamp must be recent. The Submit Image link is hidden unless that calculated state is true. The upload page and Supabase RLS/Storage RLS remain the real enforcement boundary.

## 5. Current Submission History Behavior

`gallery-submit.html` already includes a My Submissions list for users with upload access. The Account page currently does not show submission history. `supabase.js` already exposes `listMyGallerySubmissions()`, which selects only the signed-in user's own `gallery_submissions` rows through authenticated RLS and returns text metadata, statuses, review fields, and dates without private Storage URLs or signed previews.

## 6. Current Moderator Dashboard Link Behavior

`account.js` calls `S.checkLeaderGalleryModerationAccess()`, which invokes the moderator-only `list-gallery-review-queue` Edge Function with `checkOnly: true`. If the function returns ok, the Leader Dashboard link is shown. Public navigation is not cluttered with the moderator dashboard link.

## 7. Existing Helpers Available In `supabase.js`

Useful existing helpers:

- `getConfig()`
- `requireAuth()`
- `getCurrentProfile()`
- `updateCurrentProfile(payload)`
- `verifyDiscordMembership()`
- `checkLeaderGalleryModerationAccess()`
- `listMyGallerySubmissions()`
- `renderAuthNavState()`

No new privileged helper is required for this branch.

## 8. Backend Changes Needed

No backend changes are needed. Existing profile fields, submission fields, RLS policies, and Edge Functions support the requested Account polish. Profile completeness can be calculated client-side from the current profile row. Submission summaries can be calculated client-side from the current user's own submission list.

## 9. Files Expected To Change

- `account.html`
- `account.js`
- `styles.css`
- `supabase/README.md`
- `reports/member-account-polish-analysis.md`

`supabase.js` is expected to remain unchanged unless implementation exposes a helper gap.

## 10. Files That Must Not Change

- `data/gallery.json`
- protected public copy in `data/home.json`
- protected public copy in `data/recruitment.json`
- protected Ranks, Leaders, Codex, Join, Events, Announcements, Raffles, Spotlight, and Gallery captions
- Supabase migrations
- Supabase Edge Functions
- public Gallery sorting and publishing code
- upload permission and Discord verification logic

## 11. Validation Plan

Run:

- `npm run check`
- `npm run check:production`
- `git diff --check`
- `node --check account.js`
- `node --check supabase.js` if edited
- `node --check site.js` if edited
- `npm run smoke:gallery` with a local static server
- focused mocked browser smoke for signed-out Account, signed-in overview, profile completeness, profile save payload ordering, submission summaries, and moderator link visibility
- `git diff -- data/`
- the standard secret scan

## 12. Deployment Needs

No migration, database push, or Edge Function deployment should be needed. This is expected to be a static frontend/docs polish branch only.
