# Content Schema and Style Guardrails

Date: 2026-05-15
Branch: `qa/content-schema-and-style-guardrails`
Mode: QA/report-first

No JSON content, protected copy, page behavior, CSS, JavaScript, assets, Supabase configuration, migrations, Edge Functions, workflows, or validation scripts were changed for this review.

## 1. Purpose

This report defines safe schema and style guardrails for non-protected JSON content where current syntax validation passes but structure, house style, readability, accessibility metadata, or supported-field boundaries can drift.

The goal is not to rewrite copy in this branch. It is to identify what future checks should catch automatically, what should remain human-review-only, and how to protect the current Mōchirīī content model without adding frameworks or broad refactors.

## 2. Files Inspected

Primary files:

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
- `scripts/check-json.mjs`
- `scripts/check-all.mjs`
- `docs/content-guide.md`
- `reports/full-site-improvement-review.md`
- `reports/next-improvement-goal-progress.md`

Supporting source inspected:

- `scripts/check-gallery-timestamps.mjs`
- `scripts/check-refs.mjs`
- `docs/home-shell-guide.md`
- `docs/gallery-guide.md`
- `docs/recruitment-guide.md`
- `docs/twills-guide.md`

## 3. Current JSON Validation Coverage

Current required coverage:

- `scripts/check-json.mjs` parses JSON files in `data/` and `assets/lottie/`.
- `scripts/check-all.mjs` runs:
  - `check-js`
  - `check-json`
  - `check-gallery-timestamps`
  - `check-refs`
  - `check-assets`
- `scripts/check-gallery-timestamps.mjs` validates `galleryAddedAt` on Gallery items as ISO UTC timestamps.
- `scripts/check-refs.mjs` scans `.html`, `.css`, `.js`, and `.json` for local `assets/`, `data/`, `.html`, `.xml`, and `.txt` references and confirms the target exists.
- `scripts/check-assets.mjs` detects missing/oversized asset concerns and keeps the intentional MP3 warning as a warning only.

What is not currently validated:

- JSON allowed keys by file.
- Required/optional fields by renderer.
- Value types beyond JSON syntax.
- Unsupported fields that page scripts ignore.
- Protected field hashes.
- Body-copy game-name leakage outside allowed contexts.
- Empty or generic alt/caption fields.
- Gallery category/tag vocabularies beyond timestamp checks.
- Date-only formats outside Gallery timestamps.
- Content length/readability thresholds.
- House-style rules from `docs/content-guide.md`.
- Stale guide facts compared with current data.

## 4. Repository Evidence

Current `data/` files: 13 JSON files.

Top-level data shapes:

| File | Top-level shape |
| --- | --- |
| `announcements.json` | `meta`, `items[]` |
| `codex.json` | `hero`, `intro`, `tenets`, `etiquette`, `rhythm`, `recognition` |
| `events.json` | `meta`, `featured`, `upcoming[]`, `recurring`, `participation[]` |
| `gallery.json` | `meta`, `categories[]`, `albums[]` |
| `home.json` | `copy`, `hero`, `seal`, `bulletins[]`, `tiles[]`, `spotlight`, `gallery[]` |
| `join.json` | `hero`, `steps`, `quickStart`, `checklist`, `culture`, `notes` |
| `leaders.json` | `hero`, `panel`, `council`, `leaders[]`, `responsibilities` |
| `raffles.json` | `meta`, `how[]`, `rules[]`, `thisMonth`, `links[]`, `note[]` |
| `ranks.json` | `hero`, `progression`, `tiers` |
| `recruitment.json` | `hero`, `meta`, `audio`, `content` |
| `spotify.json` | `intro`, `items[]` |
| `spotlight.json` | `hero`, `spotlight` |
| `twills.json` | `hero`, `profile` |

Additional scan results:

- Data scan found no `Where Winds Meet` string in `data/*.json`.
- Data scan found no empty critical `alt`, `imageAlt`, `caption`, `title`, `summary`, `description`, `intro`, `lede`, `label`, or `href` fields outside known optional empty atmosphere-image fields.
- Current Gallery categories in data are `action`, `companions`, `gatherings`, `portraits`, and `scenery`.
- Current Gallery data has 73 items with category counts: Action 7, Companions 15, Gatherings 22, Portraits 23, Scenery 6.
- `docs/gallery-guide.md` still describes the older 39-image state and older expected counts. That is a documentation drift finding, not a data defect.

Protected content hashes were checked for evidence without quoting the protected text:

| Protected field | SHA-256 evidence hash |
| --- | --- |
| `data/home.json` `seal.verse` | `6f662fd00cfefd4727cd4d21431d11cc36f942360647d1c781affb83e2ee58e1` |
| `data/recruitment.json` `content.paragraphs` | `95be33bd983815eea0f44e74a38ab7a115f23c23ae6fa40039e8cbb02c26fb3e` |
| `data/recruitment.json` `content.conclusion` | `2085d44fb151369cfe75e8f5c83bde5470da2cbfb9f3ada147901aa889b42fee` |
| `data/twills.json` `profile.bio` | `15933d24e9b325948fc74de7e05e4c8f84b1b8c06e2d7a657bf416fc9bf28503` |

## 5. Protected Fields

These fields must stay exact unless the user explicitly requests and approves a scoped protected-copy change:

- `data/home.json` `seal.verse`
- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`
- `data/twills.json` `profile.bio`

Future automation should protect these fields with hashes or exact serialized baselines, not fuzzy text comparisons. Hashes avoid reprinting protected copy in logs while still proving it did not move.

The validator should fail on:

- Changed text.
- Changed punctuation.
- Changed capitalization.
- Changed diacritics.
- Changed paragraph/line order.
- Changed array length.
- Changed whitespace inside protected strings if serialization is intentionally exact.

## 6. Non-Protected Fields That Can Drift

Home:

- `copy.*`, `hero.descriptor[]`, `hero.badges[]`, `bulletins[]`, `tiles[]`, `spotlight.*`, and `gallery[]` can drift in tone, supported keys, image refs, dates, alt text, and card-length fit.
- `hero.atmosphereImage` may intentionally be empty.
- `seal.title`, `seal.image`, and `seal.imageAlt` are not protected copy, but changes affect identity/accessibility and should be reviewed.

Recruitment:

- Non-body fields such as `hero.*`, `meta.*`, `audio.*`, and `content.title` can drift.
- `content.paragraphs` and `content.conclusion` are protected.
- Unsupported fields such as `links`, `cards`, or `cta` would be ignored by the current renderer unless `recruitment.js` changes.

Twills:

- `hero.kicker`, `hero.image`, and non-bio profile fields can drift.
- `profile.bio` is protected.
- Contact-like badge strings should remain intentional because they are public.

Gallery:

- Categories, tags, captions, alt text, image paths, `full` paths, and timestamps can drift while JSON syntax still passes.
- Current docs are stale against the 73-item Gallery data.

Events/Announcements/Raffles/Spotlight/Spotify:

- Date formats, tags, embeds/links, labels, and concise tone can drift.
- Existing renderers support specific shapes; unsupported fields may silently do nothing.

Join/Codex/Ranks/Leaders:

- Arrays of pills, steps, responsibilities, and card copy can drift toward long, repetitive, or unsupported structures.
- These pages have their own guide files; future checks should enforce structure but leave voice decisions to review.

## 7. Proposed Schema Checks

Recommended script: `scripts/check-content-schema.mjs`

Scope:

- Parse all `data/*.json`.
- Validate each file against a repo-owned, dependency-free manifest of allowed keys, required keys, allowed optional keys, and primitive/container types.
- Fail on unsupported fields unless the page renderer is changed in the same branch.
- Validate arrays that render as repeated UI:
  - max/min counts where the renderer caps or expects a fixed number.
  - required item keys.
  - optional item keys.
- Validate date fields:
  - `YYYY-MM-DD` for date-only fields.
  - ISO UTC for Gallery `galleryAddedAt`.
- Validate URL/path fields:
  - local image/audio paths must start with `./assets/` or known allowed external URL prefixes.
  - internal links should be relative `.html` links unless the guide explicitly allows another target.
- Validate image metadata:
  - meaningful image fields need non-empty corresponding alt/imageAlt/caption where supported.
  - intentionally decorative/hidden atmosphere images can remain empty or empty-alt by allowlist.
- Validate Gallery rules:
  - category values must appear in `data/gallery.json` `categories[]`.
  - `src` thumbnail paths should use `assets/img/gallery/thumbs/`.
  - `full` paths must not use `/thumbs/`.
  - tags should be lowercase/kebab-case, 1-4 per image when present.
- Validate protected content hashes without printing protected content.

Initial manifest should be small and explicit. Avoid a generic JSON Schema dependency unless the user explicitly approves adding tooling.

## 8. Proposed Style and Readability Checks

Recommended script: `scripts/check-content-style.mjs`

Good automation candidates:

- Flag `Where Winds Meet` in visible body-copy fields outside allowed contexts.
- Flag double spaces inside strings.
- Flag leading/trailing whitespace.
- Flag newline characters in fields that render as single-line UI.
- Flag overlong card labels/titles/summaries by field-specific thresholds.
- Flag repeated punctuation such as `!!`, `???`, or excessive ellipses.
- Flag generic placeholder phrases such as `TBD`, `TODO`, `Coming soon`, `Lorem`, or `Loading` in committed JSON.
- Flag unsupported inline HTML/Markdown characters in text fields if the renderer uses `textContent`.
- Flag all-caps body copy outside known short badges/acronyms.
- Flag missing terminal punctuation in long prose fields where neighboring entries consistently use it.
- Flag duplicate tags inside a single Gallery item.
- Flag stale guide facts where docs hardcode Gallery counts that no longer match `data/gallery.json`.

Review-only checks:

- Whether xianxia tone feels warm, clear, and non-forced.
- Whether Cupcake warmth is charming or overused.
- Whether a caption is accurate to an image.
- Whether alt text describes the actual visible content.
- Whether copy sounds generic or AI-like.
- Whether a line is too poetic for functional guidance.
- Whether Recruitment supporting copy competes with protected body copy.
- Whether Twills non-protected profile fields preserve the intended public voice.
- Whether public contact details are still intentional.

## 9. Forbidden Patterns

These should be blocked or explicitly reviewed in future content work:

| Pattern | Future handling |
| --- | --- |
| Accidental protected text edits | Automated hard fail with protected hash check. |
| Body-copy `Where Winds Meet` leakage outside allowed areas | Automated fail for visible data fields with allowlist for titles/metadata/docs/internal contexts. |
| Broken image, audio, data, HTML, XML, or txt refs | Already partially covered by `check-refs`; extend with schema-aware path keys. |
| Empty captions/alt text for meaningful images | Automated fail where the renderer supports the field; allow decorative/hidden images explicitly. |
| Inconsistent Gallery categories | Automated fail against `data/gallery.json` `categories[]`. |
| Inconsistent or vague tags | Automated warning/fail for format and duplicates; human review for usefulness. |
| Unsupported fields | Automated fail unless paired with renderer support in the same branch. |
| Stale hardcoded guide counts | Automated warning for docs that claim current data counts when data disagrees. |
| Inline HTML/Markdown in JSON text fields | Automated fail unless the renderer explicitly supports it. |
| Placeholder copy | Automated fail for `TODO`, `TBD`, `Lorem`, and committed `Loading` placeholders in data. |

## 10. Automate vs Review-Only

Automate soon:

- Protected content hash guard.
- File-specific allowed-key/type checks.
- Required field checks.
- Schema-aware path checks.
- Date and timestamp format checks.
- Gallery category/tag format checks.
- Visible body-copy game-name allowlist.
- Empty critical alt/caption/title/href checks.
- Basic spacing and placeholder checks.

Keep review-only:

- Voice, warmth, rhythm, and taste.
- Whether alt text is semantically accurate.
- Whether a caption invents scene details.
- Whether copy is too long for the rendered card at mobile widths.
- Whether non-protected Recruitment/Twills changes remain respectful of protected text.
- Whether docs should intentionally mention older historical counts.

Use warnings first:

- Stale docs facts.
- Overlong strings.
- Repeated vocabulary.
- All-caps badge-like text.
- Generic adjectives or repeated house imagery.

## 11. Recommended Future Branches

| Priority | Branch | Type | Goal | Likely files | Gate |
| --- | --- | --- | --- | --- | --- |
| P1 | `chore/protected-content-hash-check` | chore | Add a dependency-free script that fails if protected fields change. | `scripts/check-protected-content.mjs`, `package.json`, optional `scripts/check-all.mjs` | Protected-field fixtures/hashes, standard validation. |
| P1 | `chore/json-content-schema-validator` | chore | Add file-specific allowed-key/type validation for `data/*.json`. | `scripts/check-content-schema.mjs`, `package.json`, optional docs | Script passes current data; no data rewrites. |
| P1 | `qa/content-style-lint-prototype` | qa | Prototype safe text checks for visible body-copy game-name leakage, placeholders, whitespace, and length warnings. | `scripts/check-content-style.mjs`, `reports/` | Warning/fail policy documented before CI enforcement. |
| P2 | `docs/update-gallery-guide-current-counts` | docs | Update Gallery guide facts to current 73-item data and dynamic count expectations. | `docs/gallery-guide.md` | No data/code changes; standard validation. |
| P2 | `chore/gallery-category-tag-guardrails` | chore | Enforce Gallery category membership, tag format, thumbnail/full path rules, and timestamp checks in one clearer validator. | `scripts/check-gallery-content.mjs`, `scripts/check-gallery-timestamps.mjs`, `package.json` | Gallery smoke and existing checks pass. |
| P2 | `docs/json-data-shape-manifest` | docs | Document current renderer-supported fields by data file. | `docs/` or `reports/` | Report/docs only; no implementation changes. |

## 12. Suggested Validation Gate for Future Content PRs

Minimum gate for content-only JSON PRs:

```sh
npm run check
git diff --check
node scripts/check-json.mjs
node scripts/check-refs.mjs
node scripts/check-assets.mjs
```

When Gallery fields change:

```sh
node scripts/check-gallery-timestamps.mjs
npm run smoke:gallery
```

When public production copy or metadata matters:

```sh
npm run check:production
```

When protected-adjacent fields change:

```sh
git diff -- data/home.json data/recruitment.json data/twills.json
```

Future stronger gate after approved scripts exist:

```sh
node scripts/check-protected-content.mjs
node scripts/check-content-schema.mjs
node scripts/check-content-style.mjs
```

## 13. Definition of Done for Guardrail Implementation

A future implementation branch is done when:

- Current `data/*.json` passes without content rewrites.
- Protected fields are guarded without printing protected copy.
- Unsupported fields fail clearly with file/path context.
- Field type errors show actionable messages.
- Body-copy game-name leakage is checked with a clear allowlist.
- Image refs and meaningful alt/caption fields are checked.
- Gallery categories and tags are checked against the current canonical list.
- Documentation explains which checks are hard failures, warnings, and review-only notes.
- Standard validation and production/Gallery smoke checks pass.

## 14. Conclusion

The current JSON syntax and reference checks are reliable, but they are intentionally shallow. The weakest point is that the repo does not yet know the difference between valid JSON and supported, protected, house-style-safe content. The safest next implementation step is `chore/protected-content-hash-check`, followed by `chore/json-content-schema-validator`. Those two branches would protect the highest-risk content boundaries before any subjective style linting is enforced.
