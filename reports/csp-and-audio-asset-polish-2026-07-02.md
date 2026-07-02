# CSP and Audio Asset Polish

Generated: 2026-07-02

This report is intentionally no-secret. It records the CSP live-header refresh, inline-hardening decision, Recruitment audio asset posture, and playback smoke result without credentials, cookies, tokens, private URLs, or secret digests.

## Result

- CSP inventory: pass with live production headers refreshed.
- CSP report artifacts updated: `reports/csp-inline-hardening-inventory.json` and `reports/csp-inline-hardening-inventory.md`.
- `unsafe-inline`: intentionally retained for `script-src` and `style-src` in this pass.
- Audio optimization: not performed. `apps/web/README.md` explicitly says `assets/audio/mochiriiiiii.mp3` must be preserved exactly unless the user explicitly approves compression, replacement, deletion, externalization, or other optimization.
- Audio playback smoke: pass on production Recruitment route with Playwright Chromium.

## CSP Evidence

`npm run check:csp-inline-hardening -- --live --write` passed against `https://mochirii.com`.

Current blockers to removing `unsafe-inline` safely:

- The live CSP still includes `script-src 'self' 'unsafe-inline'` and `style-src 'self' 'unsafe-inline'`.
- Source inventory still finds one React inline style prop in `apps/web/components/public-pages/SpotifyBrowser.tsx`.
- The production route matrix includes Supabase, Spotify, Vercel Analytics/Speed Insights, and Mochi Social iframe/postMessage surfaces that need a dedicated browser-proven nonce or SRI migration before tightening.
- The inventory notes a non-runtime Instagram URL in app source that is not currently allowed by CSP. It is not a failure, but it should be rechecked before any future CSP tightening.

Decision: keep `unsafe-inline` for now and treat strict CSP removal as a separate compatibility PR.

## Audio Evidence

Current file state:

- `assets/audio/mochiriiiiii.mp3`: `5.20 MB`, MP3, 64 kbps, 48 kHz, stereo.
- `apps/web/public/assets/audio/mochiriiiiii.mp3`: mirrored file with the same media profile.
- Existing local media tools: no `ffmpeg`/`ffprobe` on WSL PATH during this pass.

Validation:

- `npm run check:assets`: pass with the known large-audio warning only.
- `npm run check:recruitment-audio-player`: pass.
- Production Playwright click-to-play smoke: pass on `https://mochirii.com/recruitment`; status `200`, audio source resolved to `/assets/audio/mochiriiiiii.mp3`, playback advanced after user click, duration reported about `288.96` seconds, readyState `4`.

Accepted warning: the large MP3 warning remains intentional and documented.

## Follow-Ups

1. If the owner later approves audio optimization, install a proper media toolchain, create a new optimized candidate beside the original, compare playback quality, update both mirrored asset paths only after acceptance, and rerun the Recruitment audio/browser checks.
2. For CSP hardening, first remove or refactor inline style usage, then test a Next-compatible nonce/SRI strategy on Vercel Preview before touching production CSP.
