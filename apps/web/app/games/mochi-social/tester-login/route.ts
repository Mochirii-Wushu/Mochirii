import { NextRequest, NextResponse } from "next/server";
import {
  createMochiSocialTesterSessionValue,
  isMochiSocialTesterPasswordConfigured,
  MOCHI_SOCIAL_TESTER_COOKIE,
  MOCHI_SOCIAL_TESTER_COOKIE_MAX_AGE,
  verifyMochiSocialTesterPassword,
} from "@/lib/mochi-social/tester-password";

function redirectToGame(request: NextRequest, error?: string) {
  const url = new URL("/games/mochi-social", request.url);
  if (error) url.searchParams.set("tester_error", error);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = String(form.get("testerPassword") || "");

  if (!isMochiSocialTesterPasswordConfigured()) {
    return redirectToGame(request, "missing-config");
  }

  if (!verifyMochiSocialTesterPassword(password)) {
    return redirectToGame(request, "invalid");
  }

  const response = redirectToGame(request);
  response.cookies.set({
    name: MOCHI_SOCIAL_TESTER_COOKIE,
    value: createMochiSocialTesterSessionValue(),
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/games/mochi-social",
    maxAge: MOCHI_SOCIAL_TESTER_COOKIE_MAX_AGE,
  });

  return response;
}
