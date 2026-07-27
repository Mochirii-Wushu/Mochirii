import { NextRequest, NextResponse } from "next/server";
import { MOCHI_PETS_TESTER_COOKIE } from "@/lib/mochi-pets/tester-session";

export const runtime = "nodejs";

function requestProtocol(request: NextRequest) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const protocol = forwardedProtocol || request.nextUrl.protocol.replace(":", "").toLowerCase();
  return protocol === "http" || protocol === "https" ? protocol : null;
}

function isSameOriginPost(request: NextRequest) {
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

export async function POST(request: NextRequest) {
  const response = new NextResponse(null, {
    status: 303,
    headers: {
      "Cache-Control": "private, no-store",
      Location: "/games/mochi-pets",
    },
  });

  if (!isSameOriginPost(request)) return response;

  response.cookies.set({
    name: MOCHI_PETS_TESTER_COOKIE,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/games/mochi-pets",
    maxAge: 0,
  });
  return response;
}
