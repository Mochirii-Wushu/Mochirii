export function oauthConsentPath(authorizationId: string) {
  return `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
}

export function oauthConsentLoginHref(authorizationId: string) {
  return `/auth?redirect=${encodeURIComponent(oauthConsentPath(authorizationId))}`;
}
