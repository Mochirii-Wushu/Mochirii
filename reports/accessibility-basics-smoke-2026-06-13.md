# Accessibility Basics Smoke - 2026-06-13

## Summary

This packet adds a reusable browser accessibility smoke for the Vercel/Next app. It turns the earlier one-off accessibility heuristic into a maintained command without making Playwright a required CI dependency.

## Source Basis

- W3C WCAG 2.2: <https://www.w3.org/TR/WCAG22/>
- W3C WCAG 2.2 Quick Reference: <https://www.w3.org/WAI/WCAG22/quickref/>
- WAI-ARIA modal dialog pattern: <https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/>

## Command

```sh
npm run smoke:accessibility-basics -- --base-url=https://mochirii.com
```

The command defaults to `https://mochirii.com` and can target localhost or a Vercel Preview URL with `--base-url=...`.

## Coverage

The smoke is a heuristic regression check, not a WCAG conformance claim. It checks:

- one visible `h1` per covered route
- skip link to `#main`
- visible focusable controls have accessible names
- visible fields have labels or equivalent names
- visible controls meet a 24 CSS pixel target-size heuristic, with inline text-link exceptions
- visible iframes have titles
- expected live/status and alert regions exist
- signed-out member/admin gates render safe public states
- mobile menu opens, traps focus, closes with Escape, and returns focus
- Gallery lightbox exposes a modal dialog, moves focus to the close button, and closes with Escape

## CSP Finding

The first production run of this smoke found a real console error: the app stylesheet imports Google Fonts, but production CSP did not allow `https://fonts.googleapis.com` in `style-src`. This packet fixes that by allowing the existing Google Fonts stylesheet origin and the paired `https://fonts.gstatic.com` font origin.

## Validation Evidence

Local production build and smoke passed with installed Chrome:

```sh
cd apps/web && npm run build
PLAYWRIGHT_PACKAGE_PATH=<local-playwright-package> PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=<local-chrome> npm run smoke:accessibility-basics -- --base-url=http://127.0.0.1:3023
```

Result:

```text
Accessibility basics smoke OK (2 viewports, 9 routes).
```

## Safety Boundary

This smoke is read-only. It does not sign in, upload media, submit forms, approve/reject content, mutate Supabase data, register Discord commands, deploy providers, run Fly deploys, or touch Enjin funded-chain state.

Live signed-in, verified-member, moderator, and positive upload/moderation states remain a separate test-account lane.
