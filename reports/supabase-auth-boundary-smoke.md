# Supabase Auth Boundary Smoke

Date: 2026-05-15
Branch: `qa/supabase-auth-boundary-smoke`
Mode: QA automation

No data files, protected content, public copy, CSS, Supabase schema, migrations, Storage policies, Edge Functions, workflows, secrets, or production data were changed.

## 1. Current Gap

Previous reviews proved signed-out member pages manually, but that proof was not durable. This branch adds a local browser smoke that runs real page code with a mocked signed-out Supabase client so auth-boundary regressions can be caught without live credentials.

Source reports:

- `reports/member-workflow-test-account-matrix.md`
- `reports/production-member-workflow-smoke.md`
- `reports/supabase-ci-and-parity-review.md`

## 2. Script Added

Added:

- `scripts/smoke-supabase-auth-boundary.mjs`
- package script `smoke:supabase-auth-boundary`

The script is not wired into `npm run check` because it is a Playwright browser smoke that requires a local static server at `http://127.0.0.1:8765` unless `SMOKE_BASE_URL` is set.

## 3. Mock Strategy

The script intercepts the Supabase CDN browser client and returns a signed-out mock:

- `auth.getSession()` returns no session.
- `auth.getUser()` returns no user.
- `auth.onAuthStateChange()` emits an initial signed-out state.
- `auth.signInWithOAuth()` records the Discord login attempt without navigating to real OAuth.
- protected data, function, and Storage methods record calls so the smoke can fail if signed-out pages try to read/write protected surfaces.

No real Supabase request, OAuth login, Storage upload, database update, moderation action, or credentialed flow is performed.

## 4. Pages Checked

- `auth.html`
- `account.html`
- `gallery-submit.html`
- `leader-dashboard.html`
- `gallery.html`

## 5. Signed-Out Results

The smoke verifies:

- `auth.html` renders signed-out state, visible Discord login, hidden account/sign-out controls, and no error panel.
- `account.html` renders the signed-out login panel and keeps account/member controls hidden.
- `gallery-submit.html` renders the login-required gate and keeps upload controls hidden.
- `leader-dashboard.html` renders the signed-out login panel and keeps review/moderation UI hidden.
- `gallery.html` still renders the public static Gallery.
- shared header/footer render.
- signed-out header Login links remain visible.
- signed-in Account and verified Submit Image links remain hidden.
- no console-breaking errors occur.
- signed-out pages do not make protected data, function, or Storage calls.

## 6. Credential-Gated Limitations

This smoke does not test:

- real Discord OAuth callback behavior
- verified member profile state
- active upload eligibility
- live member upload
- moderator queue positive path
- approval/rejection
- cleanup/deletion

Those remain live credentialed QA or manual parity runbook items.

## 7. Validation Result

`npm run smoke:supabase-auth-boundary` passed on this branch.

Standard branch validation also passed, with the known intentional `assets/audio/mochiriiiiii.mp3` large-asset warning only.

## 8. Safety Confirmation

- No data files changed.
- Protected content was not changed.
- No secrets were committed.
- No Supabase data was mutated.
- No files were uploaded.
- No approvals, rejections, cleanup, or Storage deletions were performed.
- No `supabase db push` was run.
- No Edge Functions were deployed.
- No migrations, schemas, RLS policies, or Storage policies were changed.
