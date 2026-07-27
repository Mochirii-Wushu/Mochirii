import { approvedSocialOAuthRedirect } from "./approved-social-redirect.ts";

export type OAuthAuthorizationDetails = {
  authorization_id?: string;
  redirect_url?: string;
};

export function priorConsentRedirect(
  details: OAuthAuthorizationDetails,
  currentMemberAccess: boolean,
): string {
  if (!currentMemberAccess || "authorization_id" in details) return "";
  return approvedSocialOAuthRedirect(details.redirect_url);
}
