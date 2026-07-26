import { NextRequest, NextResponse } from "next/server";
import { verifyCurrentMochiPetsMember } from "@/lib/mochi-pets/member-verification";
import { evaluateMochiPetsTesterAccess } from "@/lib/mochi-pets/tester-access-policy-core";
import {
  createMochiPetsTesterMemberBinding,
  isMochiPetsTesterAccessConfigured,
  MOCHI_PETS_TESTER_COOKIE,
  verifyMochiPetsTesterCookieValue,
} from "@/lib/mochi-pets/tester-session";

export const runtime = "nodejs";

const COOKIE_PATH = "/games/mochi-pets";
const MAX_BODY_BYTES = 32;

function requestProtocol(request: NextRequest) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const protocol = forwardedProtocol || request.nextUrl.protocol.replace(":", "").toLowerCase();
  return protocol === "http" || protocol === "https" ? protocol : null;
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  const protocol = requestProtocol(request);
  if (!origin || !host || !protocol) return false;

  try {
    return new URL(origin).origin === new URL(`${protocol}://${host}`).origin;
  } catch {
    return false;
  }
}

function response(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" },
  });
}

function expireTesterCookie(result: NextResponse) {
  result.cookies.set({
    name: MOCHI_PETS_TESTER_COOKIE,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: 0,
  });
  return result;
}

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer ([A-Za-z0-9._~-]{1,8192})$/);
  return match?.[1] || "";
}

async function hasEmptyJsonBody(request: NextRequest) {
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (!contentType.startsWith("application/json")) return false;
  if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > MAX_BODY_BYTES) return false;

  const reader = request.body?.getReader();
  if (!reader) return false;
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_BODY_BYTES) {
        await reader.cancel();
        return false;
      }
      chunks.push(value);
    }
  } catch {
    return false;
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(body);
    const parsed = text ? JSON.parse(text) as unknown : {};
    return Boolean(parsed && typeof parsed === "object" && !Array.isArray(parsed) && Object.keys(parsed).length === 0);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return response({ memberAccess: false, testerAccess: false }, 400);
  if (!(await hasEmptyJsonBody(request))) {
    return expireTesterCookie(response({ memberAccess: false, testerAccess: false }, 400));
  }
  const token = bearerToken(request);
  if (!token) return expireTesterCookie(response({ memberAccess: false, testerAccess: false }, 401));
  if (!isMochiPetsTesterAccessConfigured()) {
    return expireTesterCookie(response({ memberAccess: false, testerAccess: false }, 503));
  }

  const verification = await verifyCurrentMochiPetsMember(token);
  const testerToken = request.cookies.get(MOCHI_PETS_TESTER_COOKIE)?.value || "";
  if (!verification.ok) {
    return expireTesterCookie(response({ memberAccess: false, testerAccess: false }, verification.status));
  }
  const access = evaluateMochiPetsTesterAccess({
    verification,
    testerToken,
    createMemberBinding: createMochiPetsTesterMemberBinding,
    verifyTesterSession: verifyMochiPetsTesterCookieValue,
  });
  if (!access.ok) {
    return expireTesterCookie(response({ memberAccess: false, testerAccess: false }, access.status));
  }

  const result = response({ memberAccess: true, testerAccess: access.testerAccess });
  return access.clearTesterCookie ? expireTesterCookie(result) : result;
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) return response({ memberAccess: false, testerAccess: false }, 400);
  return expireTesterCookie(response({ memberAccess: false, testerAccess: false }));
}
