import { NextRequest, NextResponse } from "next/server";
import { validateSpinnerAccessToken } from "@/lib/spinner/access";
import {
  SPINNER_PRIVATE_RESPONSE_HEADERS,
  SPINNER_SESSION_COOKIE,
  decodeSpinnerSessionCookie,
  encodeSpinnerSessionCookie,
  readBearerToken,
  spinnerCookieOptions,
  spinnerRequestIsSameOrigin,
  type SpinnerAccessMode,
} from "@/lib/spinner/session-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function requestIsSameOrigin(request: NextRequest, requireOrigin: boolean) {
  return spinnerRequestIsSameOrigin({
    requestUrl: request.nextUrl.href,
    origin: request.headers.get("origin"),
    secFetchSite: request.headers.get("sec-fetch-site"),
    requireOrigin,
  });
}

function clearSpinnerCookie(response: NextResponse) {
  response.cookies.set({
    name: SPINNER_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/spinner",
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}

function opaqueDenied(clearCookie = false) {
  const response = new NextResponse(null, {
    status: 404,
    headers: SPINNER_PRIVATE_RESPONSE_HEADERS,
  });
  return clearCookie ? clearSpinnerCookie(response) : response;
}

function emptySuccess(mode?: SpinnerAccessMode) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...SPINNER_PRIVATE_RESPONSE_HEADERS,
      ...(mode ? { "X-Spinner-Mode": mode } : {}),
    },
  });
}

async function authorizeAndSetCookie(accessToken: string, requestedMode: SpinnerAccessMode) {
  const access = await validateSpinnerAccessToken(accessToken, requestedMode);
  if (!access.ok) return opaqueDenied(true);

  const options = spinnerCookieOptions(access.expiresAtMs);
  if (!options) return opaqueDenied(true);
  const cookieValue = encodeSpinnerSessionCookie(accessToken, access.mode);
  if (!cookieValue) return opaqueDenied(true);

  const response = emptySuccess(access.mode);
  response.cookies.set({
    name: SPINNER_SESSION_COOKIE,
    value: cookieValue,
    ...options,
  });
  return response;
}

export async function POST(request: NextRequest) {
  if (!requestIsSameOrigin(request, true)) return opaqueDenied(false);
  const accessToken = readBearerToken(request.headers.get("authorization"));
  const requestedMode = request.headers.get("X-Spinner-Mode");
  if (!accessToken || (requestedMode !== "controller" && requestedMode !== "viewer")) return opaqueDenied(true);
  return authorizeAndSetCookie(accessToken, requestedMode);
}

export async function GET(request: NextRequest) {
  if (!requestIsSameOrigin(request, false)) return opaqueDenied(false);
  const encoded = request.cookies.get(SPINNER_SESSION_COOKIE)?.value || "";
  const session = decodeSpinnerSessionCookie(encoded);
  if (!session) return opaqueDenied(true);
  return authorizeAndSetCookie(session.accessToken, session.mode);
}

export async function DELETE(request: NextRequest) {
  if (!requestIsSameOrigin(request, true)) return opaqueDenied(false);
  return clearSpinnerCookie(emptySuccess());
}

export async function HEAD() {
  return opaqueDenied(false);
}

export async function OPTIONS() {
  return opaqueDenied(false);
}

export async function PUT() {
  return opaqueDenied(false);
}

export async function PATCH() {
  return opaqueDenied(false);
}
