const DEFAULT_SITE_ORIGIN = "https://mochirii.com";

const DEFAULT_ALLOWED_ORIGINS = new Set([
  DEFAULT_SITE_ORIGIN,
  "https://mochirii.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

export type CorsOptions = {
  allowedHeaders?: string;
  allowedMethods?: string;
};

export const DEFAULT_ALLOWED_HEADERS = "authorization, x-client-info, apikey, content-type";
export const DEFAULT_ALLOWED_METHODS = "POST, OPTIONS";

export function protectedCorsHeaders(req: Request, options: CorsOptions = {}): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(req.headers.get("origin")),
    "Access-Control-Allow-Headers": options.allowedHeaders || DEFAULT_ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": options.allowedMethods || DEFAULT_ALLOWED_METHODS,
    "Vary": "Origin",
  };
}

export function protectedOptionsResponse(req: Request, options: CorsOptions = {}): Response {
  return new Response("ok", {
    headers: protectedCorsHeaders(req, options),
  });
}

export async function withProtectedCors(
  req: Request,
  responseOrPromise: Response | Promise<Response>,
  options: CorsOptions = {},
): Promise<Response> {
  const response = await responseOrPromise;
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(protectedCorsHeaders(req, options))) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function allowedOrigin(origin: string | null): string {
  if (!origin) return DEFAULT_SITE_ORIGIN;
  if (DEFAULT_ALLOWED_ORIGINS.has(origin)) return origin;

  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    const isHttps = url.protocol === "https:";
    const isVercelPreview =
      host.endsWith(".vercel.app") &&
      (host === "mochirii.vercel.app" ||
        host.startsWith("mochirii-") ||
        host.startsWith("mochirii-wushu-") ||
        host.includes("-mochirii-"));

    if (isHttps && isVercelPreview) return origin;
  } catch {
    // Fall through to the canonical origin.
  }

  return DEFAULT_SITE_ORIGIN;
}
