import {
  decodeSpinnerSessionCookie,
  parseJwtExpiryMs,
  type SpinnerAccessMode,
  type SpinnerAccessValidation,
} from "./session-policy.ts";

export type SpinnerViewerHandoffAuthorization =
  | {
      ok: true;
      accessToken: string;
      expiresAtMs: number;
      mode: SpinnerAccessMode;
    }
  | { ok: false; clearCookie: boolean };

export async function authorizeSpinnerViewerHandoff({
  encodedSession,
  viewerAccessToken,
  nowMs = Date.now(),
  validateAccess,
}: {
  encodedSession: string | null | undefined;
  viewerAccessToken: string;
  nowMs?: number;
  validateAccess: (
    accessToken: string,
    mode: SpinnerAccessMode,
  ) => Promise<SpinnerAccessValidation>;
}): Promise<SpinnerViewerHandoffAuthorization> {
  const current = decodeSpinnerSessionCookie(encodedSession);
  const currentExpiryMs = current ? parseJwtExpiryMs(current.accessToken) : null;
  if (current && currentExpiryMs != null && currentExpiryMs > nowMs) {
    try {
      const preserved = await validateAccess(current.accessToken, current.mode);
      if (preserved.ok && preserved.mode === current.mode) {
        return { ...preserved, accessToken: current.accessToken };
      }
      return {
        ok: false,
        clearCookie: preserved.ok || preserved.reason === "denied" || preserved.reason === "invalid-token",
      };
    } catch {
      return { ok: false, clearCookie: false };
    }
  }

  try {
    const opened = await validateAccess(viewerAccessToken, "viewer");
    return opened.ok && opened.mode === "viewer"
      ? { ...opened, accessToken: viewerAccessToken }
      : { ok: false, clearCookie: true };
  } catch {
    return { ok: false, clearCookie: true };
  }
}
