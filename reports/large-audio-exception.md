# Large Audio Exception

Date: 2026-05-14
Branch: `chore/document-large-audio-exception`
PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/129>
Goal: G11
Mode: Documentation-only

## 1. Scope

This report records the durable validation exception for:

- `assets/audio/mochiriiiiii.mp3`

No audio assets, validation scripts, workflows, data files, CSS, JavaScript, or Supabase files were changed.

## 2. Exception

`assets/audio/mochiriiiiii.mp3` is intentionally allowed to exceed the normal large-asset warning threshold because original Recruitment audio quality was restored at the user's request.

Expected warning:

- `node scripts/check-assets.mjs` may report `assets/audio/mochiriiiiii.mp3` over the threshold.
- `npm run check` may report the same warning through `check:assets`.

This warning is accepted unless the user explicitly reopens audio optimization.

## 3. Source Of Truth

Primary historical report:

- `reports/audio-original-restore.md`

Durable contributor guidance:

- `docs/content-guide.md`

## 4. Operator Guidance

Do not re-encode, downsample, replace, remove, or optimize `assets/audio/mochiriiiiii.mp3` in unrelated branches.

If the warning becomes confusing during validation, cite this report and `docs/content-guide.md`.

If the user later asks to revisit audio size, create a separate scoped branch and compare quality targets before changing the file.

## 5. Validation Summary

Final command validation is recorded in the roadmap and PR after this report is committed.

Final command validation:

| Command | Result |
| --- | --- |
| `npm run check` | Passed, with the expected intentional MP3 size warning. |
| `git diff --check` | Passed. |
| `node scripts/check-json.mjs` | Passed. |
| `node scripts/check-js.mjs` | Passed. |
| `node scripts/check-refs.mjs` | Passed. |
| `node scripts/check-assets.mjs` | Passed, with the expected intentional MP3 size warning. |
| `npm run check:production` | Passed. |
| `npm run smoke:gallery` | Passed. |
| `git diff -- data/ --stat` | Empty. |
| `git diff -- assets/ --stat` | Empty. |

## 6. Safety Confirmation

- No data files changed.
- Protected content was not changed.
- No audio asset was changed.
- No validation script was changed.
- No secrets were committed.
- No `supabase db push` was run.
- No Edge Functions were deployed.

## 7. Next Recommended Item

G12 - `qa/seo-social-preview-member-pages-review`
