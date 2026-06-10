# Gallery Image Performance Verification - 2026-06-10

## Summary
- Packet: `codex/gallery-image-performance`.
- Scope: `/gallery` rendering performance and guardrails only.
- Result: gallery thumbnails now render in a 24-image window with a `Show more images` control, preserving current gallery content, sort behavior, approved Supabase feed support, and lightbox full-image behavior.
- No copy, route, image source, Supabase schema, provider setting, Discord, Cloudflare, or Vercel dashboard changes were made.

## Implementation
- Added a 24-item render window in `apps/web/components/public-pages/GalleryBrowser.tsx`.
- Kept the full static and approved-submission item set available for filtering, sorting, counts, and lightbox lookup.
- Added a styled `Show more images` control in `apps/web/app/mochirii.css`.
- Extended gallery guardrails in `scripts/check-gallery-approved-feed.mjs` and `scripts/smoke-gallery-approved-feed.mjs`.

## Validation
- `npm run check:gallery-approved-feed`: passed.
- `git diff --check`: passed with existing CRLF normalization warnings only.
- `npm run check`: passed with the known preserved `assets/audio/mochiriiiiii.mp3` size warning only.
- `npm run check:production`: passed.
- `npm run smoke:supabase-edge-functions`: passed.
- `cd apps/web && npm run lint`: passed.
- `cd apps/web && npm run build`: passed.
- `cd apps/web && npm audit --audit-level=moderate`: passed with `0 vulnerabilities`.
- `npm run smoke:gallery-approved-feed`: not runnable locally because Playwright is not installed in this workstation runtime; browser verification below covered the same behavior.

## Browser QA
Local production server: `http://127.0.0.1:3021/gallery`.

- Initial gallery render: `24` thumbnails, `Show more images` present.
- Load more: increases rendered thumbnails to `48` while keeping the full gallery set available.
- `Newest first`: surfaces the approved Supabase member upload from the signed approved feed.
- `Oldest first`: surfaces `/assets/img/gallery/shot-01.webp`.
- Lightbox: opens `/assets/img/gallery/shot-01.webp`, not the thumbnail path.
- Console: no errors or warnings during gallery interaction.
- Responsive widths checked: `360`, `390`, `768`, `1024`, `1440`.
- Responsive result: no horizontal overflow; the render window stayed capped at `24` before load more.

## Remaining Notes
- Supabase approved gallery media remains private and reaches the browser only through signed URLs returned by the approved-feed Edge Function.
- The preserved audio asset warning remains non-blocking and unchanged.
- Next planned packet: `codex/member-workflow-qa-and-status`.
