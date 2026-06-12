import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export type JsonRecord = Record<string, unknown>;

export const ALPHA_TERMS_VERSION = "alpha-rc-2026-06-10";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mochi-social-server-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export type AccessFailure = { ok: false; response: Response };
export type UserAccess = { ok: true; adminClient: SupabaseClient; user: User; userId: string };

export function jsonResponse(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

export function safeString(value: unknown, maxLength: number): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

export function getServiceRoleKey(): string {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (direct) return direct;

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!secretKeys) return "";

  try {
    const parsed = JSON.parse(secretKeys);
    return String(parsed.default || parsed.service_role || "");
  } catch {
    return "";
  }
}

export function createAdminClient(): SupabaseClient | null {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = getServiceRoleKey();
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function readJsonBody(req: Request): Promise<{ ok: true; body: JsonRecord } | AccessFailure> {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) return { ok: true, body: {} };

  try {
    return { ok: true, body: asRecord(await req.json()) };
  } catch {
    return {
      ok: false,
      response: jsonResponse({ ok: false, error: "invalid_json", message: "Request body must be valid JSON." }, 400),
    };
  }
}

export async function requireUser(req: Request): Promise<UserAccess | AccessFailure> {
  const adminClient = createAdminClient();
  if (!adminClient) {
    return {
      ok: false,
      response: jsonResponse({ ok: false, error: "mochi_social_not_configured", message: "Mochi Social alpha is not configured yet." }, 500),
    };
  }

  const accessToken = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) {
    return {
      ok: false,
      response: jsonResponse({ ok: false, error: "missing_auth", message: "Sign in before entering Mochi Social alpha." }, 401),
    };
  }

  const { data, error } = await adminClient.auth.getUser(accessToken);
  const user = data?.user;
  if (error || !user?.id) {
    return {
      ok: false,
      response: jsonResponse(
        { ok: false, error: "invalid_auth", message: "Your sign-in session could not be verified. Please sign in again." },
        401,
      ),
    };
  }

  return { ok: true, adminClient, user, userId: String(user.id) };
}

export function requireGameServer(req: Request): { ok: true } | AccessFailure {
  const expected = Deno.env.get("MOCHI_SOCIAL_GAME_SERVER_TOKEN") || "";
  const provided = req.headers.get("x-mochi-social-server-token") || "";
  if (expected && provided && expected === provided) return { ok: true };

  return {
    ok: false,
    response: jsonResponse(
      { ok: false, error: "invalid_game_server_token", message: "Mochi Social game server token is missing or invalid." },
      401,
    ),
  };
}

export async function alphaAccess(adminClient: SupabaseClient, userId: string) {
  const termsVersion = Deno.env.get("MOCHI_SOCIAL_ALPHA_TERMS_VERSION") || ALPHA_TERMS_VERSION;
  const [{ data: tester, error: testerError }, { data: terms, error: termsError }] = await Promise.all([
    adminClient.from("mochi_social_alpha_testers").select("user_id,status,notes,created_at,updated_at").eq("user_id", userId).maybeSingle(),
    adminClient
      .from("mochi_social_terms_acknowledgements")
      .select("user_id,terms_version,acknowledged_at")
      .eq("user_id", userId)
      .eq("terms_version", termsVersion)
      .maybeSingle(),
  ]);

  if (testerError || termsError) {
    return {
      ok: false,
      error: testerError?.message || termsError?.message || "Alpha access lookup failed.",
      hasAccess: false,
      termsAccepted: false,
      termsVersion,
    };
  }

  return {
    ok: true,
    tester,
    hasAccess: Boolean(tester && tester.status === "active"),
    termsAccepted: Boolean(terms),
    termsVersion,
  };
}

export async function ensureAlphaProfile(adminClient: SupabaseClient, user: User) {
  const displayName = safeString(user.user_metadata?.full_name || user.user_metadata?.name || user.email, 80);
  const { error } = await adminClient
    .from("mochi_social_profiles")
    .upsert(
      {
        id: user.id,
        display_name: displayName,
        managed_wallet_external_id: `mochi-social-alpha:${user.id}`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  return error;
}

export async function recordLedgerEvent(
  adminClient: SupabaseClient,
  event: { requestId?: string | null; actorId?: string | null; eventType: string; entityType?: string | null; entityId?: string | null; delta?: JsonRecord },
) {
  const { error } = await adminClient.from("mochi_social_ledger_events").insert({
    request_id: event.requestId || null,
    actor_id: event.actorId || null,
    event_type: event.eventType,
    entity_type: event.entityType || null,
    entity_id: event.entityId || null,
    delta: event.delta || {},
  });

  return error;
}
