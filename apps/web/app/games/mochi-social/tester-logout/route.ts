import { NextRequest, NextResponse } from "next/server";
import { MOCHI_SOCIAL_TESTER_COOKIE } from "@/lib/mochi-social/tester-password";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/games/mochi-social", request.url), { status: 303 });
  response.cookies.set({
    name: MOCHI_SOCIAL_TESTER_COOKIE,
    value: "",
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/games/mochi-social",
    maxAge: 0,
  });
  return response;
}
