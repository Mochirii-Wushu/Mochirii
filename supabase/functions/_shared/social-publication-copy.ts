const FORMAT_OR_ZERO_WIDTH_RE =
  /[\p{Cf}\u034f\u115f\u1160\u17b4\u17b5\u180b-\u180d\u3164\ufe00-\ufe0f\uffa0]/gu;
const DOT_ESCAPE_RE =
  /%(?:25){0,2}2e|\\u\{?0*2e\}?|&(?:period|dot);|&#0*46;?|&#x0*2e;?/giu;
const DOT_WRAPPER_RE =
  /[\[({<]\s*(?:\.|d[\s._-]*o[\s._-]*t)\s*[\])}>]/giu;
const DOT_WORD_RE = /\bd[\s._-]*o[\s._-]*t\b/giu;
const DOT_LIKE_RE = /[\u2024\u3002\ufe52\uff0e\uff61]/gu;
const SITE_DOMAIN_RE =
  /(?:^|[^\p{L}\p{N}_-])(?:[\p{L}\p{N}-]+\.)*mochirii\.com(?=$|[^\p{L}\p{N}_-])/u;

export const SOCIAL_PUBLICATION_COPY_ERROR =
  "Website links and references are not allowed in social publication copy.";
export const SOCIAL_PUBLICATION_COPY_ERROR_CODE =
  "social_publication_site_reference_forbidden";

export type SocialPublicationCopyValidation =
  | { ok: true; error: null; message: null }
  | {
    ok: false;
    error: typeof SOCIAL_PUBLICATION_COPY_ERROR_CODE;
    message: typeof SOCIAL_PUBLICATION_COPY_ERROR;
  };

export function normalizeSocialPublicationCopyForInspection(
  value: unknown,
): string {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(FORMAT_OR_ZERO_WIDTH_RE, "")
    .replace(DOT_ESCAPE_RE, ".")
    .replace(DOT_WRAPPER_RE, ".")
    .replace(DOT_WORD_RE, ".")
    .replace(DOT_LIKE_RE, ".")
    .replace(/m\s*o\s*c\s*h\s*i\s*r\s*i\s*i/giu, "mochirii")
    .replace(/c\s*o\s*m/giu, "com")
    .replace(/\s*\.\s*/gu, ".")
    .replace(/\s+/gu, " ")
    .toLowerCase();
}

export function socialPublicationCopyContainsSiteReference(
  value: unknown,
): boolean {
  return SITE_DOMAIN_RE.test(normalizeSocialPublicationCopyForInspection(value));
}

export function validateSocialPublicationCopy(
  values: readonly unknown[],
): SocialPublicationCopyValidation {
  if (values.some(socialPublicationCopyContainsSiteReference)) {
    return {
      ok: false,
      error: SOCIAL_PUBLICATION_COPY_ERROR_CODE,
      message: SOCIAL_PUBLICATION_COPY_ERROR,
    };
  }
  return { ok: true, error: null, message: null };
}
