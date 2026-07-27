const SOCIAL_OAUTH_ORIGIN = "https://social.mochirii.com";
const SOCIAL_OAUTH_CALLBACK_PATHS = new Set(["/auth/oidc/callback"]);

export function approvedSocialOAuthRedirect(value: unknown): string {
  if (typeof value !== "string") return "";

  const candidate = value.trim();
  if (!candidate || /[\\\u0000-\u001f\u007f]/u.test(candidate)) return "";

  try {
    const url = new URL(candidate);
    if (
      url.origin !== SOCIAL_OAUTH_ORIGIN ||
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.hash ||
      !SOCIAL_OAUTH_CALLBACK_PATHS.has(url.pathname)
    ) {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}
