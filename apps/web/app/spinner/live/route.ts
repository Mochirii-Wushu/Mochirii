import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import {
  SPINNER_PRIVATE_RESPONSE_HEADERS,
  SPINNER_SESSION_COOKIE,
  decodeSpinnerSessionCookie,
  parseJwtExpiryMs,
  spinnerRequestIsSameOrigin,
} from "@/lib/spinner/session-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_COMMAND_BYTES = 64 * 1024;
const MAX_RESPONSE_BYTES = 256 * 1024;
const UPSTREAM_TIMEOUT_MS = 12_000;

function opaqueDenied() {
  return new NextResponse(null, {
    status: 404,
    headers: SPINNER_PRIVATE_RESPONSE_HEADERS,
  });
}

function privateJson(body: unknown, status: number, headers: HeadersInit = {}) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...SPINNER_PRIVATE_RESPONSE_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      ...Object.fromEntries(new Headers(headers)),
    },
  });
}

function requestIsSameOrigin(request: NextRequest, requireOrigin: boolean) {
  return spinnerRequestIsSameOrigin({
    requestUrl: request.nextUrl.href,
    origin: request.headers.get("origin"),
    secFetchSite: request.headers.get("sec-fetch-site"),
    requireOrigin,
  });
}

function readSession(request: NextRequest) {
  const session = decodeSpinnerSessionCookie(
    request.cookies.get(SPINNER_SESSION_COOKIE)?.value || "",
  );
  if (!session) return null;
  const expiresAtMs = parseJwtExpiryMs(session.accessToken);
  return expiresAtMs && expiresAtMs > Date.now() ? session : null;
}

async function forwardLiveRequest({
  method,
  accessToken,
  mode,
  body,
  ifNoneMatch,
}: {
  method: "GET" | "POST";
  accessToken: string;
  mode: "controller" | "viewer";
  body?: string;
  ifNoneMatch?: string | null;
}) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return privateJson({ ok: false, message: "The live draw is unavailable." }, 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/spinner-live-session`, {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
        "X-Mochirii-Spinner-Mode": mode,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(ifNoneMatch ? { "If-None-Match": ifNoneMatch } : {}),
      },
      body,
      signal: controller.signal,
    });

    if ([401, 403, 404].includes(response.status)) return opaqueDenied();
    const etag = response.headers.get("etag");
    if (response.status === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ...SPINNER_PRIVATE_RESPONSE_HEADERS,
          ...(etag ? { ETag: etag } : {}),
        },
      });
    }

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_RESPONSE_BYTES) {
      return privateJson({ ok: false, message: "The live draw is unavailable." }, 503);
    }
    const responseText = await response.text();
    if (new TextEncoder().encode(responseText).byteLength > MAX_RESPONSE_BYTES) {
      return privateJson({ ok: false, message: "The live draw is unavailable." }, 503);
    }

    let payload: unknown = null;
    try {
      payload = JSON.parse(responseText) as unknown;
    } catch {
      return privateJson({ ok: false, message: "The live draw is unavailable." }, 503);
    }
    const safeStatus = [200, 400, 409, 429, 503].includes(response.status) ? response.status : 503;
    return privateJson(payload, safeStatus, etag ? { ETag: etag } : {});
  } catch {
    return privateJson({ ok: false, message: "The live draw is unavailable." }, 503);
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  if (!requestIsSameOrigin(request, false)) return opaqueDenied();
  const session = readSession(request);
  if (!session) return opaqueDenied();
  return forwardLiveRequest({
    method: "GET",
    accessToken: session.accessToken,
    mode: session.mode,
    ifNoneMatch: request.headers.get("if-none-match"),
  });
}

export async function POST(request: NextRequest) {
  if (!requestIsSameOrigin(request, true)) return opaqueDenied();
  const session = readSession(request);
  if (!session || session.mode !== "controller") return opaqueDenied();

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(declaredLength) || declaredLength < 0 || declaredLength > MAX_COMMAND_BYTES) {
    return privateJson({ ok: false, message: "The command is invalid." }, 400);
  }
  const body = await request.text();
  if (!body || new TextEncoder().encode(body).byteLength > MAX_COMMAND_BYTES) {
    return privateJson({ ok: false, message: "The command is invalid." }, 400);
  }

  return forwardLiveRequest({
    method: "POST",
    accessToken: session.accessToken,
    mode: session.mode,
    body,
  });
}

export async function HEAD() {
  return opaqueDenied();
}

export async function OPTIONS() {
  return opaqueDenied();
}

export async function DELETE() {
  return opaqueDenied();
}

export async function PUT() {
  return opaqueDenied();
}

export async function PATCH() {
  return opaqueDenied();
}
