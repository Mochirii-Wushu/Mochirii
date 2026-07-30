# Audio Original Restore Report

## 1. Reason

The original Recruitment audio was restored because the user prefers the higher-quality source over the optimized low-bitrate version.

## 2. File

- `assets/audio/mochiriiiiii.mp3`

## 3. Result

- Restored source: operator-supplied private source file outside the repository
- Restored source size: 5,455,239 bytes, about 5.3 MB on disk
- Current public size after metadata-only hardening: 5,455,248 bytes
- Duration: 00:04:48.96
- Codec: MP3
- Audio stream: 48 kHz stereo, variable bitrate
- Detected bitrate: about 151 kb/s
- Public user metadata: no ID3v1, ID3v2, APE, or Lyrics tag
- Expected warning status: `node scripts/check-assets.mjs` and `npm run check` may warn that this file exceeds the normal large-asset threshold.

## 4. Policy

This asset is intentionally allowed to exceed the normal large-asset warning threshold unless the user later approves a higher-quality optimization target.

The public copy was metadata-stripped on 2026-07-29 with an FFmpeg stream copy. No audio was re-encoded. The 12,041 demuxed audio packets and decoded-audio SHA-256 remained identical before and after the rewrite; FFmpeg regenerated only the non-audio Xing timing header. That technical header contains muxer-identification bytes and is not user-supplied profile metadata.

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
| Independent SHA-256 comparison of the repo asset and private source file | Passed | Restored repo asset matches the supplied source file. |

Metadata-only hardening evidence:

| Evidence | Before | After | Result |
| --- | --- | --- | --- |
| File size | 5,455,239 bytes | 5,455,248 bytes | Xing header grew by 288 bytes while the 279-byte ID3v2 block was removed. |
| File SHA-256 | `9BEF7D693D953424FEB4C7A932F381FAA994C3A6FBBC297978619CF49FBAAF89` | `FF8AE6A57FE71CFCC87AC3B1AD8561E1504F96980D31B8625F9B89ED74DFAADC` | Expected container-level change. |
| Demuxed audio packets | 12,041 | 12,041 | Byte-identical packet-hash sequence, SHA-256 `8E799CE0AD203FDD571FA32C6BA73CBDA856D211451316EABD193185D1D335DA`. |
| Decoded audio SHA-256 | `3fec892c33f3c7a68a5908f50c69641f14f3ec96499c919e77c9e1c546ba9a80` | `3fec892c33f3c7a68a5908f50c69641f14f3ec96499c919e77c9e1c546ba9a80` | Audio content is unchanged. |
| Duration / stream | 288.984 seconds; MP3; 48 kHz stereo | 288.984 seconds; MP3; 48 kHz stereo | Technical playback facts are preserved. |
| Public user metadata | ID3v2 present | No ID3v1, ID3v2, APE, or Lyrics tag | User-metadata removal passed. |

The before-state is Git blob `fff87d1ea4fcb12a881d0e0c5c891aeed4f29ba7` at parent commit `2d437ea5abee2d38aff0193a7d54f174f8721a03`. Packet evidence is reproducible with `ffprobe -select_streams a:0 -show_packets -show_data_hash sha256 -show_entries packet=data_hash,size -of csv=p=0`. Decoded-audio evidence uses `ffmpeg -i INPUT -map 0:a:0 -c:a pcm_s16le -f hash -hash sha256 -`, which hashes signed 16-bit little-endian stereo PCM at the preserved 48 kHz sample rate.

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
