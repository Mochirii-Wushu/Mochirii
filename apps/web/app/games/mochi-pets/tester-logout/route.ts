import { NextRequest, NextResponse } from "next/server";
import { MOCHI_PETS_TESTER_COOKIE } from "@/lib/mochi-pets/tester-password";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/games/mochi-pets", request.url), { status: 303 });
  response.cookies.set({
    name: MOCHI_PETS_TESTER_COOKIE,
    value: "",
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/games/mochi-pets",
    maxAge: 0,
  });
  return response;
}
