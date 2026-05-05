# Audio Asset Optimization Report

## 1. Current Audio State

- File: `assets/audio/mochiriiiiii.mp3`
- Original size: 3,468,141 bytes, about 3.31 MiB.
- Original codec: MP3, MPEG layer III.
- Original stream: 48 kHz stereo at 96 kb/s.
- Original duration: 00:04:48.96.
- Current references:
  - `data/recruitment.json` uses `./assets/audio/mochiriiiiii.mp3` with `type: audio/mpeg`.
  - `recruitment.html` renders a native `<audio id="recruitmentAudio">` element with controls and accessible labels/descriptions.
  - `recruitment.js` loads the data-driven source list into the native audio element.

## 2. Optimization

The source was tested with several MP3 encodes in `/tmp` before replacing the repository file.

| Candidate | Result size | Result metadata | Decision |
| --- | ---: | --- | --- |
| 64 kb/s stereo, 48 kHz | about 2.3 MiB | MP3, stereo, 64 kb/s | Valid, but still over the asset warning threshold. |
| 48 kb/s stereo, 48 kHz | about 1.7 MiB | MP3, stereo, 48 kb/s | Valid, but still over the asset warning threshold. |
| 32 kb/s mono, 44.1 kHz | about 1.2 MiB | MP3, mono, 32 kb/s | Valid, but still over the asset warning threshold. |
| 24 kb/s mono, 24 kHz | 867,261 bytes | MP3, mono, 24 kb/s | Selected. Clears the asset warning threshold while preserving MP3/browser compatibility. |

Final command shape:

```sh
ffmpeg -y -i assets/audio/mochiriiiiii.mp3 \
  -ac 1 -ar 24000 -codec:a libmp3lame -b:a 24k \
  /tmp/mochiriiiiii.24k-mono-24000.mp3
```

The optimized file replaced the original at the same path, so no Recruitment data or reference changes were needed.

## 3. Optimized Audio State

- Optimized size: 867,261 bytes, about 847 KiB.
- Size reduction: about 75%.
- Optimized codec: MP3, MPEG layer III.
- Optimized stream: 24 kHz mono at 24 kb/s.
- Optimized duration: 00:04:48.96.
- Warning removed: yes. `node scripts/check-assets.mjs` no longer reports any file over the large-asset threshold.

## 4. Playback / Reference Verification

| Check | Result | Notes |
| --- | --- | --- |
| Decode integrity | Pass | `ffmpeg -v error -i /tmp/mochiriiiiii.24k-mono-24000.mp3 -f null -` completed without errors before replacement. |
| Local asset response | Pass | `curl -I -L http://localhost:8765/assets/audio/mochiriiiiii.mp3` returned `200` and `Content-type: audio/mpeg`. |
| Browser metadata load | Pass | Playwright loaded `recruitment.html`, found the data-driven source, and reported duration `288.958667`. |
| Native controls | Pass | The native audio element retained `controls: true`. |
| Console/page errors | Pass | No browser console or page errors were observed during the Recruitment audio smoke. |
| Volume sanity | Pass | `ffmpeg` `volumedetect` reported decoded samples with max volume below clipping. |

No manual listening check was performed in this environment; validation was based on successful full-file decode, preserved duration, browser metadata loading, native-control presence, source resolution, and absence of runtime errors.

## 5. Protected Content

Protected content remained untouched:

- `data/home.json` `seal.verse`
- `data/recruitment.json` `content.paragraphs`
- `data/recruitment.json` `content.conclusion`
- `data/twills.json` `profile.bio`

## 6. Validation

| Command | Result | Notes |
| --- | --- | --- |
| `node scripts/check-refs.mjs` | Pass | `Local references OK (414 refs checked).` |
| `node scripts/check-assets.mjs` | Pass | No large-asset warnings after optimization. |
| Recruitment browser audio smoke | Pass | Page rendered; source resolved; metadata loaded; controls remained enabled. |
| `npm run check` | Pass | All checks completed; no large-asset warning was reported. |
| `git diff --check` | Pass | No whitespace errors. |
| `node scripts/check-json.mjs` | Pass | `JSON OK (16 files).` |
| `node scripts/check-js.mjs` | Pass | `JavaScript syntax OK (23 files).` |
| `npm run check:production` | Pass | `Production smoke check OK.` |
| `npm run smoke:gallery` | Pass | `Gallery lightbox smoke OK.` |
