# Audio Original Restore Report

## 1. Reason

The original Recruitment audio was restored because the user prefers the higher-quality source over the optimized low-bitrate version.

## 2. File

- `assets/audio/mochiriiiiii.mp3`

## 3. Result

- Restored source: `/home/artaius/Desktop/mochiriiiiii.mp3`
- Restored size: 5,455,239 bytes, about 5.3 MB on disk
- Duration: 00:04:48.96
- Codec: MP3
- Audio stream: 48 kHz stereo, variable bitrate
- Detected bitrate: about 151 kb/s
- Expected warning status: `node scripts/check-assets.mjs` and `npm run check` may warn that this file exceeds the normal large-asset threshold.

## 4. Policy

This asset is intentionally allowed to exceed the normal large-asset warning threshold unless the user later approves a higher-quality optimization target.

## 5. Validation

Initial checks before restore:

| Command | Result | Notes |
| --- | --- | --- |
| `npm run check` | Passed | Asset validation completed with warnings only. |
| `git diff --check` | Passed | No whitespace errors. |
| `npm run check:production` | Passed | Production smoke check OK. |

Audio inspection after restore:

| Command | Result | Notes |
| --- | --- | --- |
| `ls -lh assets/audio/mochiriiiiii.mp3` | Passed | Restored file reports about 5.3 MB. |
| `file assets/audio/mochiriiiiii.mp3` | Passed | Valid MP3, 48 kHz stereo, variable bitrate. |
| `ffprobe assets/audio/mochiriiiiii.mp3` | Passed | Duration remains 00:04:48.96. |
| `sha256sum assets/audio/mochiriiiiii.mp3 /home/artaius/Desktop/mochiriiiiii.mp3` | Passed | Restored repo asset matches the supplied source file. |

Final validation after restore:

| Command | Result | Notes |
| --- | --- | --- |
| `git diff -- data/home.json` | Passed | No Home data changes; `seal.verse` unchanged. |
| `git diff -- data/recruitment.json` | Passed | No Recruitment data changes; protected body and conclusion unchanged. |
| `git diff -- data/twills.json` | Passed | No Twills data changes; protected profile bio unchanged. |
| `curl -I -L http://127.0.0.1:8765/assets/audio/mochiriiiiii.mp3` | Passed | Local source returns 200 with `Content-type: audio/mpeg`. |
| Recruitment browser smoke | Passed | Page renders, native audio controls remain present, source resolves, duration metadata loads, and no console errors were observed. |
| `npm run check` | Passed | Expected large-asset warning returned for `assets/audio/mochiriiiiii.mp3` only. |
| `git diff --check` | Passed | No whitespace errors. |
| `node scripts/check-json.mjs` | Passed | JSON OK. |
| `node scripts/check-js.mjs` | Passed | JavaScript syntax OK. |
| `node scripts/check-refs.mjs` | Passed | Local references OK. |
| `node scripts/check-assets.mjs` | Passed with warning | Expected large-asset warning returned for `assets/audio/mochiriiiiii.mp3` only. |
| `npm run check:production` | Passed | Production smoke check OK. |
| `npm run smoke:gallery` | Passed | Gallery lightbox smoke OK. |
