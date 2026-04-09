# Codebase Review: Proposed Fix Tasks

## 1) Typo fix task
**Title:** Correct misspelling in recurring events copy

- **Issue:** The recurring events title uses `activites` instead of `activities`.
- **Location:** `data/events.json`.
- **Proposed task:** Replace `activites` with `activities` and run a quick content spellcheck over `data/*.json` to catch similar copy errors.
- **Acceptance criteria:**
  - The string reads `Sect dailies, guild activities, trials, hero realms, etc.`.
  - No additional obvious spelling mistakes are introduced in nearby content.

## 2) Bug fix task
**Title:** Fix nav active-state resolution for the Twills page

- **Issue:** `twills.html` exists, but `pageKeyFromFile` in `site.js` has no `twills` mapping, so it falls back to `home` and highlights the wrong nav state.
- **Locations:** `twills.html`, `site.js`.
- **Proposed task:** Add a `twills` case in `pageKeyFromFile` and map it to the intended active nav key (likely `leaders` or a new explicit nav item, depending on UX intent).
- **Acceptance criteria:**
  - Opening `twills.html` no longer sets the `Home` nav item as active by default.
  - The selected active item is consistent with the information architecture decision.

## 3) Comment/documentation discrepancy task
**Title:** Resolve README claim about hardcoded copy vs current implementation

- **Issue:** README says JavaScript files never contain hardcoded copy, but `home.js` includes multiple hardcoded fallback strings.
- **Locations:** `README.md`, `home.js`.
- **Proposed task:** Choose one of:
  1. Remove hardcoded fallback copy from page JS and keep all copy solely in JSON, **or**
  2. Update README to document the fallback-copy pattern as an intentional resilience strategy.
- **Acceptance criteria:**
  - The documented rule and implementation are aligned.
  - Future contributors can infer the intended content-loading behavior without ambiguity.

## 4) Test improvement task
**Title:** Add regression test for page-to-nav key mapping and fallback behavior

- **Issue:** There is no automated guard that page filenames map to correct nav keys; this allowed the `twills` mismatch to slip in.
- **Proposed task:** Add a lightweight test (unit test or Playwright smoke test) that validates nav active-state behavior for representative pages, including `index.html`, `leaders.html`, and `twills.html`.
- **Acceptance criteria:**
  - Test fails when an unmapped page incorrectly defaults to `home`.
  - Test passes once `twills` mapping is fixed.
  - Test is documented in the README (or contributor docs) with a run command.
