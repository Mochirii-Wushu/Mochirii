# Core Web Vitals LCP Pass - 2026-07-02

## Scope

This pass targets the current Home, Recruitment, and Gallery Lighthouse evidence where the shared hero image is the LCP element. It preserves the existing wuxia/glass visual identity, copy, routes, and image assets.

## Baseline Evidence

- Production Lighthouse artifacts showed Home performance 68, Recruitment 73, and Gallery 72.
- LCP elements were the hero images: `#heroImage`, `#recruitmentHeroImage`, and `#galleryHeroImage`.
- Lighthouse LCP discovery reported `fetchpriority=high should be applied` for the hero images.
- Image delivery findings showed the header brand emblem was served as the original 1024x1024 WebP into 56px and 44px slots.

## Changes

- `StaticImage` now maps existing `priority` hero calls to `loading="eager"` plus `fetchPriority="high"`.
- Header, mobile-header, and footer brand emblems now use Next Image with fixed rendered `sizes` hints.
- The visible header emblem is explicitly low fetch priority so it does not compete with the hero LCP request.
- Home guild seal `sizes` now matches the CSS-rendered seal dimensions more closely.
- Mochi Social tester gate artwork now uses `loading="eager"` plus `fetchPriority="high"` instead of the deprecated priority prop.

## Local Browser Evidence

- Built Next app served locally on `http://127.0.0.1:3010`.
- Playwright checked Home, Recruitment, and Gallery at `390x900` and `1440x1100`.
- Every checked hero image rendered with `fetchpriority="high"` and `loading="eager"`.
- Header, mobile-header, and footer brand emblems resolved through `/_next/image`; visible header emblem used a `w=64` optimized candidate.
- No horizontal overflow was detected on the checked routes/viewports.
- `node scripts/check-browser-route-matrix.mjs --base-url http://127.0.0.1:3010` passed against the local built app.

## Follow-Up Evidence

After this PR is deployed to Vercel Preview or production, refresh Lighthouse for Home, Recruitment, and Gallery to confirm live LCP and performance scores. The current expected improvement is reduced image contention and a fixed LCP discovery warning, not a full redesign-level LCP guarantee.
