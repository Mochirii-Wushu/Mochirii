# Post-Guardrails Regression Review

Date: 2026-05-15
Branch: `qa/post-guardrails-regression-review`
Mode: QA/report-first

No implementation files, data files, protected content, CSS, Gallery data, Gallery images, Supabase configuration, migrations, Edge Functions, workflows, or production data were changed for this review.

## 1. Scope

Reviewed the guardrails added by:

- `reports/gallery-approved-feed-smoke-automation.md`
- `reports/protected-content-hash-checks.md`
- `reports/json-schema-style-guardrails.md`

Reviewed current validation files:

- `package.json`
- `scripts/check-all.mjs`
- `scripts/check-protected-content.mjs`
- `scripts/protected-content-baseline.json`
- `scripts/check-content-guardrails.mjs`
- `scripts/smoke-gallery-approved-feed.mjs`

## 2. npm Run Check Wiring

Result: passed.

`npm run check` now runs:

- `check:js`
- `check:json`
- `check:protected-content`
- `check:content`
- `check:gallery-timestamps`
- `check:refs`
- `check:assets`

The order is reasonable:

- syntax and JSON parse checks run before deeper content checks;
- protected content hashes run before broader content guardrails;
- Gallery timestamp, ref, and asset checks keep their existing positions.

The browser smoke scripts remain separate from `npm run check`, which is appropriate because they require a local static server at `http://127.0.0.1:8765` unless `SMOKE_BASE_URL` is set.

## 3. Protected-Content Hash Check

Result: passed.

`npm run check:protected-content` reported:

- `Protected content OK (4 fields).`

Review notes:

- The baseline covers all four protected fields requested by repo policy.
- The baseline stores field paths and SHA-256 hashes, not protected prose.
- Failure messages identify field ID, data file, path, expected hash, and actual hash.
- Intentional protected-copy changes require a dedicated approved branch and explicit baseline update.

No brittleness found.

## 4. Content Guardrails

Result: passed.

`npm run check:content` reported:

- `Content guardrails OK (13 data files).`

Review notes:

- Checks are objective: top-level file shapes, Gallery structure, local asset paths, hrefs, dates, Spotify embed shape, and basic unsafe string patterns.
- The script does not rewrite data.
- The script does not enforce subjective voice, tone, warmth, rhythm, or semantic alt/caption quality.
- Protected text style is not checked here; protected exactness is owned by `check:protected-content`.
- The script passed current data without requiring content changes.

Residual risk:

- New data files or newly supported renderer fields must update the guardrail manifest in the same branch as the renderer/data change.
- Future warning-only style checks should remain opt-in until they prove low-noise.

## 5. Gallery Approved-Feed Smoke

Result: passed.

`npm run smoke:gallery-approved-feed` reported:

- `Gallery approved feed smoke OK.`

Review notes:

- The smoke is local-safe and does not require Supabase credentials.
- The smoke stubs the Supabase browser client instead of calling the live project.
- It covers static Gallery behavior, mocked approved-feed success, mocked approved-feed failure fallback, member-submissions category behavior, signed URL usage, pending/rejected non-representation in the mock response, Home Gallery Spotlight stability, and static/full lightbox behavior.
- It remains outside `npm run check`, which keeps local dev and CI reasonable.

Residual risk:

- Live signed URL expiry, RLS/storage policy proof, and real pending/rejected leak proof remain credentialed/manual or future CI/manual parity work.

## 6. Failure Actionability

Result: passed.

The new checks produce actionable failures:

- Protected-content failures name the protected field ID and hash mismatch without printing protected text.
- Content guardrail failures include file and JSON path context.
- Gallery approved-feed smoke failures include scenario-specific labels such as static Gallery, approved feed success, approved feed failure fallback, and Home Gallery Spotlight.

No current failure output prints secrets, tokens, signed URLs from production, protected prose, or private Storage records.

## 7. Local Dev Experience

Result: passed.

`npm run check` remains a fast Node-only validation path. It adds two lightweight dependency-free scripts and keeps the known MP3 threshold warning as warning-only.

Browser checks remain explicit:

- `npm run smoke:gallery`
- `npm run smoke:gallery-approved-feed`

Both browser checks require the local server and are therefore intentionally not hidden inside `npm run check`.

## 8. Public Site Regression

Result: passed.

The standard public validation stack passed:

- `npm run check`
- `git diff --check`
- `node scripts/check-json.mjs`
- `node scripts/check-js.mjs`
- `node scripts/check-refs.mjs`
- `node scripts/check-assets.mjs`
- `npm run check:production`
- `npm run smoke:gallery`

Additional guardrail checks passed:

- `npm run check:protected-content`
- `npm run check:content`
- `npm run smoke:gallery-approved-feed`

Known expected warning:

- `assets/audio/mochiriiiiii.mp3` remains over the normal large-asset threshold.

## 9. Protected Content and Data

Result: passed.

- No data files changed in this review branch.
- Protected content remains unchanged.
- `data/home.json` `seal.verse` remains unchanged.
- `data/recruitment.json` `content.paragraphs` remains unchanged.
- `data/recruitment.json` `content.conclusion` remains unchanged.
- `data/twills.json` `profile.bio` remains unchanged.

## 10. Conclusion

The new guardrails are stable enough for the repo's current validation ladder. They add meaningful coverage for approved Gallery feed behavior, protected-copy exactness, and objective JSON/content drift without adding live credentials, production mutations, subjective style gates, or workflow changes.
