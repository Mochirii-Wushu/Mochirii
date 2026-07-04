import { NextRequest, NextResponse } from "next/server";
import {
  createMochiPetsTesterSessionValue,
  isMochiPetsTesterPasswordConfigured,
  MOCHI_PETS_TESTER_COOKIE,
  MOCHI_PETS_TESTER_COOKIE_MAX_AGE,
  verifyMochiPetsTesterPassword,
} from "@/lib/mochi-pets/tester-password";

function redirectToGame(request: NextRequest, error?: string) {
  const url = new URL("/games/mochi-pets", request.url);
  if (error) url.searchParams.set("tester_error", error);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = String(form.get("testerPassword") || "");

  if (!isMochiPetsTesterPasswordConfigured()) {
    return redirectToGame(request, "missing-config");
  }

  if (!verifyMochiPetsTesterPassword(password)) {
    return redirectToGame(request, "invalid");
  }

  const response = redirectToGame(request);
  response.cookies.set({
    name: MOCHI_PETS_TESTER_COOKIE,
    value: createMochiPetsTesterSessionValue(),
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/games/mochi-pets",
    maxAge: MOCHI_PETS_TESTER_COOKIE_MAX_AGE,
  });

  return response;
}
