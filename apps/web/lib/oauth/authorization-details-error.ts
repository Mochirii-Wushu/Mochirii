export type AuthorizationDetailsFailureKind = "expired" | "session" | "temporary";

export type AuthorizationDetailsFailure = {
  kind: AuthorizationDetailsFailureKind;
  message: string;
};

function errorField(error: unknown, key: "code" | "message" | "status") {
  if (!error || typeof error !== "object") return undefined;
  return (error as Record<string, unknown>)[key];
}

/**
 * Converts provider errors into stable Mochirii copy without exposing raw
 * implementation details. Only the provider's explicit not-found response is
 * treated as an expired authorization; transient failures remain retryable.
 */
export function classifyAuthorizationDetailsFailure(error: unknown): AuthorizationDetailsFailure {
  const code = String(errorField(error, "code") || "").trim().toLowerCase();
  const message = String(errorField(error, "message") || "").trim().toLowerCase();
  const rawStatus = errorField(error, "status");
  const status = typeof rawStatus === "number" ? rawStatus : Number(rawStatus || 0);

  if (
    code === "oauth_authorization_not_found"
    || message === "authorization not found"
  ) {
    return {
      kind: "expired",
      message: "This sign-in request is no longer available. Return to Mōchirīī Social and start again.",
    };
  }

  if (status === 401 || status === 403 || code === "bad_jwt") {
    return {
      kind: "session",
      message: "Your website session needs to be refreshed before continuing.",
    };
  }

  return {
    kind: "temporary",
    message: "We couldn’t check this sign-in request. Please try again.",
  };
}
