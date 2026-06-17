import "@supabase/functions-js/edge-runtime.d.ts";
import {
  CORS_HEADERS,
  type JsonRecord,
  jsonResponse,
  requireModeratorAccess,
} from "../_shared/gallery-moderation.ts";

const REQUIRED_SECRET_NAMES = [
  "INSTAGRAM_ACCOUNT_ID",
  "INSTAGRAM_ACCESS_TOKEN",
  "INSTAGRAM_API_VERSION",
];

function metaBaseUrl(): string {
  return (Deno.env.get("INSTAGRAM_API_BASE_URL") || "https://graph.instagram.com").replace(/\/+$/, "");
}

function metaUrl(path: string): string {
  const version = Deno.env.get("INSTAGRAM_API_VERSION") || "";
  if (!version) return "";
  return `${metaBaseUrl()}/${version.replace(/^\/+|\/+$/g, "")}/${path.replace(/^\/+/, "")}`;
}

function instagramConfig() {
  const accountId = Deno.env.get("INSTAGRAM_ACCOUNT_ID") || "";
  const accessToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN") || "";
  const apiVersion = Deno.env.get("INSTAGRAM_API_VERSION") || "";
  const missingSecrets = REQUIRED_SECRET_NAMES.filter((name) => !Deno.env.get(name));

  return {
    accountId,
    accessToken,
    apiVersion,
    configured: missingSecrets.length === 0,
    missingSecrets,
  };
}

function diagnosticPayload(values: JsonRecord): JsonRecord {
  return {
    configured: false,
    accountReachable: false,
    publishEnabled: false,
    provider: "instagram_graph",
    apiVersion: null,
    checkedAt: new Date().toISOString(),
    ...values,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed." }, 405);
  }

  const access = await requireModeratorAccess(req);
  if (!access.ok) return access.response;

  const config = instagramConfig();
  if (!config.configured) {
    return jsonResponse({
      ok: true,
      data: diagnosticPayload({
        configured: false,
        accountReachable: false,
        publishEnabled: false,
        apiVersion: config.apiVersion || null,
        missingSecrets: config.missingSecrets,
        message: "Meta API publishing is not configured in Supabase secrets yet.",
      }),
      message: "Meta API publishing is not configured yet.",
    });
  }

  const statusUrl = metaUrl(
    `${encodeURIComponent(config.accountId)}?fields=id,username,account_type&access_token=${encodeURIComponent(config.accessToken)}`,
  );
  if (!statusUrl) {
    return jsonResponse({
      ok: true,
      data: diagnosticPayload({
        configured: true,
        apiVersion: config.apiVersion || null,
        message: "Instagram API version is not configured.",
      }),
      message: "Instagram API version is not configured.",
    });
  }

  try {
    const response = await fetch(statusUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.warn("check-instagram-api-status account diagnostic failed", {
        status: response.status,
        statusText: response.statusText,
      });

      return jsonResponse({
        ok: true,
        data: diagnosticPayload({
          configured: true,
          accountReachable: false,
          publishEnabled: false,
          apiVersion: config.apiVersion,
          statusCode: response.status,
          message: "Meta API credentials are present, but the account diagnostic failed. Confirm the account id, token, permissions, and provider path.",
        }),
        message: "Meta API account diagnostic failed.",
      });
    }

    return jsonResponse({
      ok: true,
      data: diagnosticPayload({
        configured: true,
        accountReachable: true,
        publishEnabled: true,
        apiVersion: config.apiVersion,
        message: "Meta API account diagnostic passed.",
      }),
      message: "Meta API account diagnostic passed.",
    });
  } catch (error) {
    console.warn("check-instagram-api-status account diagnostic request failed", {
      message: error instanceof Error ? error.message : "Unknown fetch error",
    });

    return jsonResponse({
      ok: true,
      data: diagnosticPayload({
        configured: true,
        accountReachable: false,
        publishEnabled: false,
        apiVersion: config.apiVersion,
        message: "Meta API credentials are present, but the diagnostic request could not reach Meta.",
      }),
      message: "Meta API account diagnostic could not complete.",
    });
  }
});
