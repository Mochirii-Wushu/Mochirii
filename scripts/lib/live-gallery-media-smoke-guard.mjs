export const LIVE_GALLERY_MEDIA_SMOKE_OPT_IN =
  "MOCHIRII_ALLOW_LIVE_GALLERY_MEDIA_SMOKE_ONCE";

const LOCAL_GALLERY_AUDIT_ORIGIN = "http://127.0.0.1:8765";

function canonicalWebsiteHostname(siteOrigin) {
  return new URL(siteOrigin).hostname.toLowerCase().replace(/^www\./, "");
}

export function isProductionWebsiteOrigin(baseUrl, siteOrigin) {
  const targetHostname = new URL(baseUrl).hostname.toLowerCase();
  const productionHostname = canonicalWebsiteHostname(siteOrigin);

  return targetHostname === productionHostname || targetHostname === `www.${productionHostname}`;
}

export function isReviewedWebsiteVercelPreviewOrigin(baseUrl) {
  let target;
  try {
    target = new URL(baseUrl);
  } catch {
    return false;
  }
  return target.protocol === "https:" && !target.port &&
    /^mochirii-[a-z0-9]{9,}-mochirii\.vercel\.app$/.test(
      target.hostname.toLowerCase(),
    );
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

export function resolveGalleryAuditTarget({
  baseUrl,
  siteOrigin,
  environment = process.env,
}) {
  let target;
  try {
    target = new URL(baseUrl);
  } catch {
    throw new Error("Gallery Lighthouse origin must be an absolute URL.");
  }

  if (
    target.pathname !== "/" || target.search || target.hash ||
    target.username || target.password
  ) {
    throw new Error(
      "Gallery Lighthouse origin must contain only a scheme, host, and optional port.",
    );
  }

  const local = target.protocol === "http:" && target.port === "8765" &&
    (target.hostname === "127.0.0.1" || target.hostname === "localhost");
  const preview = isReviewedWebsiteVercelPreviewOrigin(target.origin);
  const production = target.protocol === "https:" && !target.port &&
    isProductionWebsiteOrigin(target.origin, siteOrigin);
  const kind = local
    ? "local"
    : preview
    ? "preview"
    : production
    ? "production"
    : null;

  if (!kind) {
    throw new Error(
      "Gallery Lighthouse audits require the exact local origin, an immutable reviewed Vercel deployment origin, or the canonical production origin.",
    );
  }
  if (
    kind !== "local" &&
    environment[LIVE_GALLERY_MEDIA_SMOKE_OPT_IN] !== "true"
  ) {
    throw new Error(
      `Refusing a live Gallery Lighthouse audit without its exact one-shot approval. Set ${LIVE_GALLERY_MEDIA_SMOKE_OPT_IN}=true only for the approved process.`,
    );
  }

  const normalizedOrigin = kind === "local"
    ? LOCAL_GALLERY_AUDIT_ORIGIN
    : target.origin;
  return {
    kind,
    normalizedOrigin,
    url: new URL("/gallery", normalizedOrigin).href,
  };
}
