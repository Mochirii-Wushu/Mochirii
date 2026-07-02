# Browser Accessibility and Performance Evidence

Generated: 2026-07-02

This report is intentionally no-secret. It summarizes clean-context Playwright route evidence and production Lighthouse artifacts without cookies, request headers, raw response headers, screenshots, tokens, or private form values.

## Result

- Browser route matrix: pass.
- Accessibility route matrix: pass.
- Lighthouse artifacts: generated under ignored `reports/lighthouse/`.
- Blocking browser/accessibility failures: none found.

## Playwright Route Matrix

- Command: `npm run check:browser-route-matrix -- --base-url https://mochirii.com --write`
- Browser: WSL Playwright Chromium.
- Viewports: desktop `1440x1100`, mobile `390x900`.
- Routes: `/`, `/join`, `/gallery`, `/auth`, `/account`, `/members`, `/leader-dashboard`, `/games/mochi-social`.
- Checks: `16/16` route/viewport checks passed.
- Status: all routes returned `200`.
- Layout: no horizontal overflow in any checked viewport.
- Keyboard: visible focus reached in every route/viewport check; no likely keyboard trap detected.
- Reduced motion: media query matched in every route/viewport check.
- Iframes: all observed iframes had titles.

Documented non-blocking warnings:

- `/auth` still reported two sampled animated or transitioning elements under reduced motion in both checked viewports; keep this on the visual-polish backlog.
- Signed-out default browser state for `/account`, `/leader-dashboard`, and `/games/mochi-social` did not expose alert regions, while static coverage still records route error states. Recheck during authenticated workflow QA.

## Static Accessibility Matrix

- Command: `npm run check:accessibility-route-matrix -- --write`
- Routes covered: `20`.
- Protected/noindex routes: `7`.
- Shell foundations: pass for `lang`, skip link, mobile menu controls, mobile focus trap, Escape close, focus return, `.sr-only`, `:focus-visible`, reduced motion, and footer navigation label.
- Route semantics: expected forms, labels, live regions, alerts, iframe titles, and noindex metadata passed.

Static-only warnings remain for public reference pages without route-specific live regions: `/ranks`, `/leaders`, `/codex`, `/recruitment`, `/raffles`, `/spotify`, `/spotlight`, and `/twills`.

## Lighthouse Production Evidence

Command pattern:

```sh
CHROME_PATH=<WSL Playwright Chromium> lighthouse <url> --quiet --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" --output=json --output=html --output-path=reports/lighthouse/<name> --only-categories=performance,accessibility,best-practices,seo
```

| Route | Performance | Accessibility | Best Practices | SEO | LCP | INP / fallback | CLS | Artifact prefix |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `/` | 68 | 100 | 100 | 100 | 5.5 s | 200 ms | 0 | `reports/lighthouse/home.report.*` |
| `/recruitment` | 73 | 100 | 100 | 100 | 6.0 s | 160 ms | 0 | `reports/lighthouse/recruitment.report.*` |
| `/gallery` | 72 | 100 | 100 | 100 | 6.3 s | 160 ms | 0.029 | `reports/lighthouse/gallery.report.*` |

## Highest-Priority Follow-Ups

1. Improve production LCP on Home, Recruitment, and Gallery. The current Lighthouse performance scores are acceptable for readiness evidence but not polished; LCP is the clear next performance target.
2. Re-test `/account`, `/leader-dashboard`, and `/games/mochi-social` with authenticated or form-error states to prove live alert behavior in the real workflow state.
3. Reduce or disable the remaining sampled `/auth` transitions under reduced motion if they are visible, rather than merely computed CSS transitions.