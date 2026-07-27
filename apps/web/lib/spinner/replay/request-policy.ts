export const SPINNER_MEDIA_CAPABILITY_HEADER = "x-mochirii-spinner-media-capability";
export const SPINNER_MEDIA_MAX_CAPABILITY_LENGTH = 1_024;

const CAPABILITY_PATTERN = /^[A-Za-z0-9._-]+$/u;

export function mediaCapabilityFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  if (url.search || url.hash) return null;
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return null;
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return null;
  const declaredBody = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(declaredBody) || declaredBody !== 0 || request.headers.has("content-type")) return null;
  const capability = request.headers.get(SPINNER_MEDIA_CAPABILITY_HEADER)?.trim() || "";
  if (
    capability.length < 32 || capability.length > SPINNER_MEDIA_MAX_CAPABILITY_LENGTH ||
    !CAPABILITY_PATTERN.test(capability)
  ) return null;
  return capability;
}
