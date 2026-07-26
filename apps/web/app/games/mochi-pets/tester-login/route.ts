import { NextRequest, NextResponse } from "next/server";
import { verifyCurrentMochiPetsMember } from "@/lib/mochi-pets/member-verification";
import { authorizeMochiPetsTesterEntry } from "@/lib/mochi-pets/tester-access-policy-core";
import {
  checkMochiPetsTesterRateLimit,
  clearMochiPetsTesterFailures,
  recordMochiPetsTesterFailure,
} from "@/lib/mochi-pets/tester-rate-limit";
import {
  createMochiPetsTesterMemberBinding,
  createMochiPetsTesterSessionValue,
  isMochiPetsTesterAccessConfigured,
  MOCHI_PETS_TESTER_COOKIE,
  MOCHI_PETS_TESTER_COOKIE_MAX_AGE,
  verifyMochiPetsTesterPassword,
} from "@/lib/mochi-pets/tester-session";

const COOKIE_PATH = "/games/mochi-pets";
const MAX_FORM_BYTES = 8_192;

export const runtime = "nodejs";

function requestProtocol(request: NextRequest) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const protocol = forwardedProtocol || request.nextUrl.protocol.replace(":", "").toLowerCase();
  return protocol === "http" || protocol === "https" ? protocol : null;
}

function response(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" },
  });
}

function expireCookie(result: NextResponse, name: string) {
  result.cookies.set({
    name,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: 0,
  });
}

function clearPrivateAccess(result: NextResponse) {
  expireCookie(result, MOCHI_PETS_TESTER_COOKIE);
  return result;
}

function isSameOriginFormPost(request: NextRequest) {
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  const protocol = requestProtocol(request);
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const contentLengthHeader = request.headers.get("content-length");

  if (!origin || !host || !protocol) return false;
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > MAX_FORM_BYTES) return false;
  }
  if (!contentType.startsWith("application/x-www-form-urlencoded")) return false;

  try {
    return new URL(origin).origin === new URL(`${protocol}://${host}`).origin;
  } catch {
    return false;
  }
}

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer ([A-Za-z0-9._~-]{1,8192})$/);
  return match?.[1] || "";
}

async function readBoundedPassword(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_FORM_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }

  if (byteLength === 0) return null;
  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const form = new URLSearchParams(new TextDecoder("utf-8", { fatal: true }).decode(body));
    return form.get("testerPassword") ?? "";
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginFormPost(request)) return response({ ok: false, error: "invalid_request" }, 400);
  const token = bearerToken(request);
  if (!token) {
    return clearPrivateAccess(response({ ok: false, error: "member_required" }, 401));
  }
  if (!isMochiPetsTesterAccessConfigured()) {
    return clearPrivateAccess(response({ ok: false, error: "unavailable" }, 503));
  }

  const verification = await verifyCurrentMochiPetsMember(token);
  if (!verification.ok) {
    return clearPrivateAccess(response({ ok: false, error: "member_required" }, verification.status));
  }
  const memberBinding = createMochiPetsTesterMemberBinding(verification.memberId);
  if (!memberBinding) return clearPrivateAccess(response({ ok: false, error: "unavailable" }, 503));
  const rateLimit = checkMochiPetsTesterRateLimit(memberBinding);
  if (!rateLimit.allowed) {
    const result = clearPrivateAccess(response({ ok: false, error: "rate_limited" }, 429));
    result.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return result;
  }

  const password = await readBoundedPassword(request);
  if (password === null) return clearPrivateAccess(response({ ok: false, error: "invalid_request" }, 400));
  const authorization = await authorizeMochiPetsTesterEntry({
    verification,
    password,
    createMemberBinding: () => memberBinding,
    verifyPassword: verifyMochiPetsTesterPassword,
    createTesterSession: createMochiPetsTesterSessionValue,
  });
  if (!authorization.ok) {
    if (authorization.error === "invalid") recordMochiPetsTesterFailure(memberBinding);
    return clearPrivateAccess(response({ ok: false, error: authorization.error }, authorization.status));
  }
  clearMochiPetsTesterFailures(memberBinding);

  const result = response({ ok: true });
  result.cookies.set({
    name: MOCHI_PETS_TESTER_COOKIE,
    value: authorization.testerSession,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: MOCHI_PETS_TESTER_COOKIE_MAX_AGE,
  });
  return result;
}
