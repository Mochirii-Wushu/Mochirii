export const SPINNER_SESSION_COOKIE = "mochirii_spinner_access_v1";
export const SPINNER_SESSION_TTL_SECONDS = 10 * 60;
export const SPINNER_SESSION_HEARTBEAT_MS = 5 * 60 * 1000;
// Keep the complete Set-Cookie line comfortably below common 4 KiB limits.
export const MAX_SPINNER_ACCESS_TOKEN_LENGTH = 3_400;

export type SpinnerAccessMode = "controller" | "viewer";

export const SPINNER_PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Cookie",
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
  "Referrer-Policy": "no-referrer",
} as const;

export type SpinnerAccessFailureReason =
  | "invalid-token"
  | "missing-config"
  | "denied"
  | "rate-limited"
  | "upstream";

export type SpinnerAccessValidation =
  | { ok: true; expiresAtMs: number; mode: SpinnerAccessMode }
  | { ok: false; reason: SpinnerAccessFailureReason };

export type SpinnerAuthorityValidation =
  | { ok: true; expiresAtMs: number }
  | { ok: false; reason: SpinnerAccessFailureReason };

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function decodeJwtPart(value: string): Record<string, unknown> | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="), "base64").toString("utf8");
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export function parseJwtExpiryMs(token: string): number | null {
  if (!token || token.length > MAX_SPINNER_ACCESS_TOKEN_LENGTH) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
  if (!decodeJwtPart(parts[0])) return null;
  const payload = decodeJwtPart(parts[1]);
  const expiresAtSeconds = payload?.exp;
  if (typeof expiresAtSeconds !== "number" || !Number.isSafeInteger(expiresAtSeconds)) return null;
  return expiresAtSeconds * 1000;
}

export function readBearerToken(value: string | null | undefined): string | null {
  const header = String(value || "");
  if (header.length > MAX_SPINNER_ACCESS_TOKEN_LENGTH + 16) return null;
  const match = header.match(/^Bearer\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i);
  if (!match || match[1].length > MAX_SPINNER_ACCESS_TOKEN_LENGTH) return null;
  return parseJwtExpiryMs(match[1]) ? match[1] : null;
}

export function encodeSpinnerSessionCookie(accessToken: string, mode: SpinnerAccessMode): string | null {
  if (!parseJwtExpiryMs(accessToken)) return null;
  return `${mode === "controller" ? "c" : "v"}:${accessToken}`;
}

export function decodeSpinnerSessionCookie(value: string | null | undefined): {
  accessToken: string;
  mode: SpinnerAccessMode;
} | null {
  const raw = String(value || "");
  if (raw.length > MAX_SPINNER_ACCESS_TOKEN_LENGTH + 2) return null;
  const prefix = raw.slice(0, 2);
  const accessToken = raw.slice(2);
  if ((prefix !== "c:" && prefix !== "v:") || !parseJwtExpiryMs(accessToken)) return null;
  return {
    accessToken,
    mode: prefix === "c:" ? "controller" : "viewer",
  };
}

export function spinnerRequestIsSameOrigin({
  requestUrl,
  origin,
  secFetchSite,
  requireOrigin,
}: {
  requestUrl: string;
  origin?: string | null;
  secFetchSite?: string | null;
  requireOrigin: boolean;
}) {
  if (secFetchSite && secFetchSite !== "same-origin") return false;
  if (!origin) return !requireOrigin;

  try {
    return new URL(origin).origin === new URL(requestUrl).origin;
  } catch {
    return false;
  }
}

export function spinnerCookieOptions(expiresAtMs: number, nowMs = Date.now()) {
  const remainingSeconds = Math.floor((expiresAtMs - nowMs) / 1000);
  const maxAge = Math.min(SPINNER_SESSION_TTL_SECONDS, remainingSeconds);
  if (!Number.isSafeInteger(maxAge) || maxAge <= 0) return null;

  return {
    httpOnly: true,
    secure: true,
    sameSite: "strict" as const,
    path: "/spinner",
    maxAge,
    expires: new Date(nowMs + maxAge * 1000),
  };
}

export async function validateSpinnerModeratorToken({
  accessToken,
  supabaseUrl,
  publishableKey,
  fetchImpl = fetch,
  nowMs = Date.now(),
  timeoutMs = 8_000,
}: {
  accessToken: string;
  supabaseUrl: string;
  publishableKey: string;
  fetchImpl?: FetchLike;
  nowMs?: number;
  timeoutMs?: number;
}): Promise<SpinnerAuthorityValidation> {
  const expiresAtMs = parseJwtExpiryMs(accessToken);
  if (!expiresAtMs || expiresAtMs <= nowMs) return { ok: false, reason: "invalid-token" };

  let endpoint: URL;
  try {
    endpoint = new URL("/functions/v1/list-gallery-review-queue", `${supabaseUrl.replace(/\/+$/, "")}/`);
  } catch {
    return { ok: false, reason: "missing-config" };
  }

  if (!publishableKey || (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost" && endpoint.hostname !== "127.0.0.1")) {
    return { ok: false, reason: "missing-config" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: publishableKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ checkOnly: true }),
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return { ok: false, reason: "denied" };
      if (response.status === 429) return { ok: false, reason: "rate-limited" };
      return { ok: false, reason: "upstream" };
    }

    const responseText = await response.text();
    if (!responseText || responseText.length > 4_096) return { ok: false, reason: "upstream" };

    let payload: Record<string, unknown>;
    try {
      const parsed = JSON.parse(responseText) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, reason: "upstream" };
      payload = parsed as Record<string, unknown>;
    } catch {
      return { ok: false, reason: "upstream" };
    }

    const data = payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? payload.data as Record<string, unknown>
      : null;
    if (payload.ok !== true || payload.hasAccess !== true || data?.hasAccess !== true) {
      return { ok: false, reason: "denied" };
    }

    return { ok: true, expiresAtMs };
  } catch {
    return { ok: false, reason: "upstream" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function validateSpinnerViewerToken({
  accessToken,
  supabaseUrl,
  publishableKey,
  fetchImpl = fetch,
  nowMs = Date.now(),
  timeoutMs = 8_000,
}: {
  accessToken: string;
  supabaseUrl: string;
  publishableKey: string;
  fetchImpl?: FetchLike;
  nowMs?: number;
  timeoutMs?: number;
}): Promise<SpinnerAuthorityValidation> {
  const expiresAtMs = parseJwtExpiryMs(accessToken);
  if (!expiresAtMs || expiresAtMs <= nowMs) return { ok: false, reason: "invalid-token" };

  let endpoint: URL;
  try {
    endpoint = new URL("/functions/v1/verify-member-access", `${supabaseUrl.replace(/\/+$/, "")}/`);
  } catch {
    return { ok: false, reason: "missing-config" };
  }

  if (!publishableKey || (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost" && endpoint.hostname !== "127.0.0.1")) {
    return { ok: false, reason: "missing-config" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: publishableKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshDiscord: false }),
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return { ok: false, reason: "denied" };
      if (response.status === 429) return { ok: false, reason: "rate-limited" };
      return { ok: false, reason: "upstream" };
    }

    const responseText = await response.text();
    if (!responseText || responseText.length > 65_536) return { ok: false, reason: "upstream" };

    let payload: Record<string, unknown>;
    try {
      const parsed = JSON.parse(responseText) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, reason: "upstream" };
      payload = parsed as Record<string, unknown>;
    } catch {
      return { ok: false, reason: "upstream" };
    }

    const data = payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? payload.data as Record<string, unknown>
      : null;
    if (
      payload.ok !== true ||
      data?.galleryEligible !== true ||
      data?.memberStatus !== "active"
    ) {
      return { ok: false, reason: "denied" };
    }

    return { ok: true, expiresAtMs };
  } catch {
    return { ok: false, reason: "upstream" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveSpinnerAccessToken({
  accessToken,
  supabaseUrl,
  publishableKey,
  fetchImpl = fetch,
  nowMs = Date.now(),
  timeoutMs = 8_000,
}: {
  accessToken: string;
  supabaseUrl: string;
  publishableKey: string;
  fetchImpl?: FetchLike;
  nowMs?: number;
  timeoutMs?: number;
}): Promise<SpinnerAccessValidation> {
  const moderator = await validateSpinnerModeratorToken({
    accessToken,
    supabaseUrl,
    publishableKey,
    fetchImpl,
    nowMs,
    timeoutMs,
  });
  if (moderator.ok) return { ...moderator, mode: "controller" };
  if (moderator.reason === "invalid-token" || moderator.reason === "missing-config") return moderator;

  const viewer = await validateSpinnerViewerToken({
    accessToken,
    supabaseUrl,
    publishableKey,
    fetchImpl,
    nowMs,
    timeoutMs,
  });
  if (viewer.ok) return { ...viewer, mode: "viewer" };
  return viewer;
}

export async function validateSpinnerAccessTokenForMode({
  mode,
  ...options
}: {
  mode: SpinnerAccessMode;
  accessToken: string;
  supabaseUrl: string;
  publishableKey: string;
  fetchImpl?: FetchLike;
  nowMs?: number;
  timeoutMs?: number;
}): Promise<SpinnerAccessValidation> {
  const authority = mode === "controller"
    ? await validateSpinnerModeratorToken(options)
    : await validateSpinnerViewerToken(options);
  return authority.ok ? { ...authority, mode } : authority;
}
