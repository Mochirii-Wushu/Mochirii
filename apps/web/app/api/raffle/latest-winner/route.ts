import { NextRequest, NextResponse } from "next/server";
import { readLatestOfficialRaffleWinner } from "@/lib/raffle/latest-winner";
import { resolveLatestOfficialRaffleWinnerRead } from "@/lib/raffle/latest-winner-core";
import { readBearerToken, spinnerRequestIsSameOrigin } from "@/lib/spinner/session-policy";

const PUBLIC_CACHE = "public, max-age=0, s-maxage=15, stale-while-revalidate=15";
const PRIVATE_CACHE = "private, no-store, max-age=0";

export async function GET(request: NextRequest) {
  if (!spinnerRequestIsSameOrigin({
    requestUrl: request.url,
    origin: request.headers.get("origin"),
    secFetchSite: request.headers.get("sec-fetch-site"),
    requireOrigin: false,
  })) {
    return new NextResponse(null, { status: 404 });
  }

  const authorization = request.headers.get("authorization");
  const accessToken = readBearerToken(authorization);
  const primary = await readLatestOfficialRaffleWinner(accessToken);
  const result = accessToken && !primary.ok
    ? resolveLatestOfficialRaffleWinnerRead(
      primary,
      await readLatestOfficialRaffleWinner(null),
    )
    : primary;
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, data: null },
      {
        status: 503,
        headers: responseHeaders(PRIVATE_CACHE),
      },
    );
  }
  return NextResponse.json(
    { ok: true, data: result.data },
    {
      headers: responseHeaders(authorization ? PRIVATE_CACHE : PUBLIC_CACHE),
    },
  );
}

function responseHeaders(cacheControl: string) {
  return {
    "Cache-Control": cacheControl,
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    Vary: "Authorization",
  };
}
