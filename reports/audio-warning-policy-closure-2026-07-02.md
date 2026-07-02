# Audio Warning Policy Closure - 2026-07-02

## Scope

Close the integration-plan audio step without changing the approved Recruitment
audio asset. The active source asset is `assets/audio/mochiriiiiii.mp3`, and the
Next public mirror is `apps/web/public/assets/audio/mochiriiiiii.mp3`.

## Decision

The MP3 remains unchanged by default. The repo already documents this file as an
intentional large-asset warning because original Recruitment audio quality was
restored at the owner's request. Existing project guidance also says not to
compress, re-encode, replace, delete, externalize, or otherwise optimize the MP3
without explicit approval.

The current warning is accepted for normal development and release validation.
This does not block website work while the file continues to pass the asset and
Recruitment audio contract checks.

## Evidence

| Check | Result |
| --- | --- |
| Source asset present | `assets/audio/mochiriiiiii.mp3` exists. |
| Next public mirror present | `apps/web/public/assets/audio/mochiriiiiii.mp3` exists. |
| File size parity | Both files are `5,455,239` bytes. |
| Media type | Local file inspection reports MPEG layer III, `64 kbps`, `48 kHz`, stereo. |
| Project policy | `docs/content-guide.md`, `docs/gallery-guide.md`, and `docs/integration-operations-runbook.md` preserve the explicit-approval rule. |
| Asset validation | `npm run check:assets` passed with the known warning. |
| Recruitment audio validation | `npm run check:recruitment-audio-player` passed. |
| Production playback smoke | `https://mochirii.com/assets/audio/mochiriiiiii.mp3` returned `200`, `audio/mpeg`, and byte-range content. |

## Future Optimization Path

If the owner later approves optimization, create a candidate file beside the
original, keep the original intact until review is complete, and require browser
playback plus human quality review before replacing any production-facing audio
path.
