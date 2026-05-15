# JSON Schema and Style Guardrails

Date: 2026-05-15
Branch: `qa/json-schema-style-guardrails`
Mode: validation automation

No data content, protected content, public copy, CSS, Gallery images, Supabase configuration, migrations, Edge Functions, workflows, or production data were changed.

## 1. Purpose

This branch adds objective JSON/content guardrails for drift that plain JSON parsing cannot catch. The checks are intentionally structural and non-subjective.

Subjective voice, warmth, rhythm, and taste remain review-only.

## 2. Script Added

Added:

- `scripts/check-content-guardrails.mjs`

Updated:

- `package.json` adds `check:content`
- `scripts/check-all.mjs` runs `check:content` inside `npm run check`

## 3. Hard-Failure Checks

The script fails on:

- unsupported or missing top-level keys in known `data/*.json` files;
- missing expected data files;
- broken schema-aware local asset refs;
- empty required Gallery alt/caption fields;
- unsupported Gallery categories;
- duplicate Gallery ids;
- duplicate Gallery full-image paths;
- Gallery thumbnails not using `/thumbs/`;
- Gallery full paths using `/thumbs/`;
- Gallery tags not lowercase kebab-case;
- duplicate tags inside one Gallery item;
- Gallery timestamps not using ISO UTC with milliseconds;
- Home fallback Gallery not containing exactly 4 items;
- Home fallback Gallery image/full/alt drift;
- invalid relative internal hrefs;
- href entries without nearby label, linkLabel, or title text;
- invalid `YYYY-MM-DD` date fields;
- invalid `updated` fields outside `YYYY-MM-DD` or `YYYY-MM`;
- unsupported Spotify item types;
- invalid Spotify embed URLs;
- placeholder copy such as TODO, TBD, Lorem ipsum, or Coming soon;
- leading/trailing whitespace in non-protected data strings;
- repeated spaces in non-protected data strings;
- inline HTML in JSON text fields;
- visible body-copy `Where Winds Meet` outside title/metadata contexts.

Protected fields are intentionally owned by `scripts/check-protected-content.mjs`, not by this script.

## 4. Warning-Only Checks

No warning-only checks were enforced in this first automation branch.

The report-first guardrails review recommended warnings for subjective or softer concerns such as overlong copy, stale docs facts, repeated vocabulary, and all-caps badge-like text. Those are intentionally deferred so this branch stays stable and objective.

## 5. Files Covered

The top-level manifest covers the current 13 data files:

- `data/announcements.json`
- `data/codex.json`
- `data/events.json`
- `data/gallery.json`
- `data/home.json`
- `data/join.json`
- `data/leaders.json`
- `data/raffles.json`
- `data/ranks.json`
- `data/recruitment.json`
- `data/spotify.json`
- `data/spotlight.json`
- `data/twills.json`

## 6. Known Intentional Exceptions

- `home.hero.atmosphereImage` and related atmosphere fields may be empty.
- Gallery `src` and `full` can point to the same full image path by current renderer design.
- Protected fields are not linted for style here because their exact content is guarded by hash.
- Browser smoke scripts still require a local static server and are not wired into `npm run check`.

## 7. Deferred Checks

Intentionally deferred:

- subjective house-style scoring;
- semantic accuracy of alt/caption text;
- live credentialed member workflow checks;
- Supabase RLS/storage policy validation;
- stale guide count warnings;
- automated copy-length thresholds for mobile layout;
- docs/content-guide prose enforcement.

## 8. Validation

Validation passed on this branch:

- `npm run check:content`
- `npm run check:protected-content`
- `npm run check`
- `git diff --check`
- `node scripts/check-json.mjs`
- `node scripts/check-js.mjs`
- `node scripts/check-refs.mjs`
- `node scripts/check-assets.mjs`
- `npm run check:production`
- `npm run smoke:gallery`
- `npm run smoke:gallery-approved-feed`

Known expected warning:

- `assets/audio/mochiriiiiii.mp3` remains over the normal large-asset threshold.

## 9. Safety Result

The script passed the current data without rewriting content. No protected text is printed, duplicated, or changed.
