import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import {
  SPINNER_SESSION_COOKIE,
  decodeSpinnerSessionCookie,
  resolveSpinnerAccessToken,
  validateSpinnerAccessTokenForMode,
  type SpinnerAccessMode,
  type SpinnerAccessValidation,
} from "./session-policy";

export function validateSpinnerAccessToken(
  accessToken: string,
  mode?: SpinnerAccessMode,
): Promise<SpinnerAccessValidation> {
  const options = {
    accessToken,
    supabaseUrl: SUPABASE_URL,
    publishableKey: SUPABASE_PUBLISHABLE_KEY,
  };
  return mode
    ? validateSpinnerAccessTokenForMode({ ...options, mode })
    : resolveSpinnerAccessToken(options);
}

export type SpinnerServerSessionValidation =
  | { ok: true; expiresAtMs: number; mode: SpinnerAccessMode; accessToken: string }
  | Extract<SpinnerAccessValidation, { ok: false }>;

export const getSpinnerRequestSession = cache(async (): Promise<SpinnerServerSessionValidation> => {
  const cookieStore = await cookies();
  const encoded = cookieStore.get(SPINNER_SESSION_COOKIE)?.value || "";
  const session = decodeSpinnerSessionCookie(encoded);
  if (!session) return { ok: false, reason: "invalid-token" };

  const access = await validateSpinnerAccessToken(session.accessToken, session.mode);
  if (!access.ok) return access;
  return { ...access, accessToken: session.accessToken };
});

export const getSpinnerRequestAccess = cache(async (): Promise<SpinnerAccessValidation> => {
  const session = await getSpinnerRequestSession();
  if (!session.ok) return session;
  return {
    ok: true,
    expiresAtMs: session.expiresAtMs,
    mode: session.mode,
  };
});
