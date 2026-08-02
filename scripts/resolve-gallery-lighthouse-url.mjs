import { resolveGalleryAuditTarget } from "./lib/live-gallery-media-smoke-guard.mjs";
import { SITE_ORIGIN } from "./lib/public-urls.mjs";

const baseUrl = process.argv[2];
if (!baseUrl) {
  throw new Error(
    "Usage: node scripts/resolve-gallery-lighthouse-url.mjs <origin>",
  );
}

process.stdout.write(JSON.stringify(resolveGalleryAuditTarget({
  baseUrl,
  siteOrigin: SITE_ORIGIN,
})));
