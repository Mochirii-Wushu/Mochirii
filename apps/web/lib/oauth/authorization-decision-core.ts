import { isApprovedSocialOAuthReturnDestination } from "./approved-social-redirect.ts";

type AuthorizationDecision = "approve" | "deny";
type MembershipResult = "active" | "inactive" | "unavailable";

export type SocialAuthorizationDecisionResult<T> =
  | { status: "authorization-rejected" }
  | { status: "membership-required" }
  | { status: "membership-unavailable" }
  | { status: "submitted"; submission: T };

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function isDiscordVerifiedSocialMember(value: unknown): boolean {
  const access = object(value);
  const profile = object(access?.profile);

  return Boolean(
    profile?.member_status === "active" && access?.discordVerified === true,
  );
}

export function isApprovedSocialAuthorization(
  value: unknown,
  expectedAuthorizationId: string,
  expectedClientId: string,
): boolean {
  const details = object(value);
  const client = object(details?.client);
  const trustedClientId = expectedClientId.trim();

  return Boolean(
    trustedClientId.length > 0 &&
    details?.authorization_id === expectedAuthorizationId &&
      isApprovedSocialOAuthReturnDestination(details?.redirect_uri) &&
      typeof client?.id === "string" &&
      client.id === trustedClientId,
  );
}

export async function runSocialAuthorizationDecision<T>({
  authorizationId,
  expectedClientId,
  decision,
  loadAuthorization,
  verifyMembership,
  submitDecision,
}: {
  authorizationId: string;
  expectedClientId: string;
  decision: AuthorizationDecision;
  loadAuthorization: () => Promise<unknown>;
  verifyMembership: () => Promise<MembershipResult>;
  submitDecision: () => Promise<T>;
}): Promise<SocialAuthorizationDecisionResult<T>> {
  let details: unknown;
  try {
    details = await loadAuthorization();
  } catch {
    return { status: "authorization-rejected" };
  }

  if (!isApprovedSocialAuthorization(details, authorizationId, expectedClientId)) {
    return { status: "authorization-rejected" };
  }

  if (decision === "approve") {
    const membership = await verifyMembership().catch(() => "unavailable" as const);
    if (membership === "unavailable") return { status: "membership-unavailable" };
    if (membership !== "active") return { status: "membership-required" };
  }

  return {
    status: "submitted",
    submission: await submitDecision(),
  };
}
