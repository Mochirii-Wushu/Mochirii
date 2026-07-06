export const SITE_ORIGIN = "https://mochirii.com";
export const SOCIAL_ORIGIN = "https://social.mochirii.com";

export function siteUrl(path = ""): string {
  const normalized = String(path || "").replace(/^\/+/, "");
  return normalized ? `${SITE_ORIGIN}/${normalized}` : SITE_ORIGIN;
}

export function socialUrl(path = ""): string {
  const normalized = String(path || "").replace(/^\/+/, "");
  return normalized ? `${SOCIAL_ORIGIN}/${normalized}` : SOCIAL_ORIGIN;
}
