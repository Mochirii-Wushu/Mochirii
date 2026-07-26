import { NextRequest, NextResponse } from "next/server";
import {
  createMochiPetsTesterSessionValue,
  isMochiPetsTesterAccessConfigured,
  MOCHI_PETS_TESTER_COOKIE,
  MOCHI_PETS_TESTER_COOKIE_MAX_AGE,
  verifyMochiPetsTesterPassword,
} from "@/lib/mochi-pets/tester-session";

const MAX_FORM_BYTES = 4_096;

export const runtime = "nodejs";

function requestProtocol(request: NextRequest) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const protocol = forwardedProtocol || request.nextUrl.protocol.replace(":", "").toLowerCase();
  return protocol === "http" || protocol === "https" ? protocol : null;
}

function redirectToDoorway(error?: "invalid" | "unavailable") {
  const location = error
    ? `/games/mochi-pets?tester_error=${encodeURIComponent(error)}`
    : "/games/mochi-pets";
  return new NextResponse(null, {
    status: 303,
    headers: {
      "Cache-Control": "private, no-store",
      Location: location,
    },
  });
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
    if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > MAX_FORM_BYTES) {
      return false;
    }
  }
  if (!contentType.startsWith("application/x-www-form-urlencoded")) return false;

  try {
    return new URL(origin).origin === new URL(`${protocol}://${host}`).origin;
  } catch {
    return false;
  }
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
  if (!isSameOriginFormPost(request)) return redirectToDoorway("invalid");
  if (!isMochiPetsTesterAccessConfigured()) return redirectToDoorway("unavailable");

  const password = await readBoundedPassword(request);
  if (password === null) return redirectToDoorway("invalid");
  if (!(await verifyMochiPetsTesterPassword(password))) return redirectToDoorway("invalid");

  const session = await createMochiPetsTesterSessionValue();
  if (!session) return redirectToDoorway("unavailable");

  const response = redirectToDoorway();
  response.cookies.set({
    name: MOCHI_PETS_TESTER_COOKIE,
    value: session,
    httpOnly: true,
    secure: requestProtocol(request) === "https",
    sameSite: "lax",
    path: "/games/mochi-pets",
    maxAge: MOCHI_PETS_TESTER_COOKIE_MAX_AGE,
  });
  return response;
}
