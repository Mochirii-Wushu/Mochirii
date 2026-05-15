# Protected Content Hash Checks

Date: 2026-05-15
Branch: `qa/protected-content-hash-checks`
Mode: validation automation

No protected content, data files, CSS, public copy, Gallery data, Gallery images, Supabase configuration, migrations, Edge Functions, workflows, or production data were changed.

## 1. Purpose

The repo already documents protected content boundaries, but accidental edits were only caught by manual diff review. This branch adds a durable local validation guard so protected-copy drift fails automatically.

## 2. Protected Fields Covered

The validator covers:

- `data/home.json` `seal.verse`
- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`
- `data/twills.json` `profile.bio`

## 3. Hash Method

The script uses:

- SHA-256 hashes;
- stable JSON serialization;
- exact array order and exact string contents;
- no protected text in normal output or failure output.

The script reports the field ID, data file, protected path, expected hash, and actual hash if a mismatch occurs.

## 4. Files Added

Added:

- `scripts/check-protected-content.mjs`
- `scripts/protected-content-baseline.json`

Updated:

- `package.json` adds `check:protected-content`
- `scripts/check-all.mjs` runs the protected-content check inside `npm run check`

## 5. Future Intentional Changes

Future intentional protected-copy changes should happen in a dedicated approved branch. That branch must:

- make the explicit protected-copy change requested by the user;
- run `npm run check:protected-content` and show the expected mismatch;
- update `scripts/protected-content-baseline.json` with the new SHA-256 hash;
- document the approved reason in the branch report or PR body.

Baseline updates should not be bundled with unrelated content, CSS, Gallery, Supabase, or workflow changes.

## 6. Validation

Validation passed on this branch:

- `npm run check:protected-content`
- `npm run check`
- `git diff --check`
- `node scripts/check-json.mjs`
- `node scripts/check-js.mjs`
- `node scripts/check-refs.mjs`
- `node scripts/check-assets.mjs`
- `npm run check:production`
- `npm run smoke:gallery`

Known expected warning:

- `assets/audio/mochiriiiiii.mp3` remains over the normal large-asset threshold.

## 7. Safety Result

The baseline file stores hashes and field paths only. It does not duplicate protected prose, poem text, Recruitment body copy, Recruitment conclusion copy, or Twills biography text.
