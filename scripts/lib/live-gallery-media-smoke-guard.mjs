export const LIVE_GALLERY_MEDIA_SMOKE_OPT_IN =
  "MOCHIRII_ALLOW_LIVE_GALLERY_MEDIA_SMOKE_ONCE";

function canonicalWebsiteHostname(siteOrigin) {
  return new URL(siteOrigin).hostname.toLowerCase().replace(/^www\./, "");
}

export function isProductionWebsiteOrigin(baseUrl, siteOrigin) {
  const targetHostname = new URL(baseUrl).hostname.toLowerCase();
  const productionHostname = canonicalWebsiteHostname(siteOrigin);

  return targetHostname === productionHostname || targetHostname === `www.${productionHostname}`;
}

export function enforceProductionGalleryMatrixGuard({
  baseUrl,
  siteOrigin,
  environment = process.env,
}) {
  if (!isProductionWebsiteOrigin(baseUrl, siteOrigin)) return;
  if (environment[LIVE_GALLERY_MEDIA_SMOKE_OPT_IN] === "true") return;

  throw new Error(
    `Refusing a broad gallery/browser matrix against the production Website origin. `
      + `Use a local or reviewed Preview origin for fixture-based coverage. `
      + `For one explicitly approved, bounded production run only, set `
      + `${LIVE_GALLERY_MEDIA_SMOKE_OPT_IN}=true for that process.`,
  );
}
