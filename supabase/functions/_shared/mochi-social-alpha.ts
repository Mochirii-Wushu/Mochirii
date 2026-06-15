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

export function normalizeAlphaProgressSnapshot(data: unknown) {
  const row = asRecord(data);
  if (!Object.keys(row).length) return null;
  const revision = Math.max(0, Math.floor(Number(row.revision || 0)));
  const state = asRecord(row.state);
  const updatedAt = safeString(row.updated_at || row.updatedAt, 80) || new Date(0).toISOString();
  return {
    authority: safeString(row.authority, 80) || "mochirii-edge",
    revision,
    state,
    updatedAt,
  };
}

export async function loadAlphaProgressSnapshot(adminClient: SupabaseClient, userId: string) {
  return await adminClient
    .from("mochi_social_progress_snapshots")
    .select("user_id,authority,revision,state,updated_at")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function upsertAlphaProgressSnapshot(
  adminClient: SupabaseClient,
  userId: string,
  action: { requestId?: string | null; type: string; payload: JsonRecord },
) {
  const { data: existing, error: loadError } = await loadAlphaProgressSnapshot(adminClient, userId);
  if (loadError) return { data: null, error: loadError };

  const existingSnapshot = normalizeAlphaProgressSnapshot(existing);
  const existingState = asRecord(existingSnapshot?.state);
  const incomingState = asRecord(action.payload.state);
  const revision = Math.max(0, Number(existingSnapshot?.revision || 0)) + 1;
  const state = {
    ...existingState,
    ...incomingState,
    lastSyncedAction: action.type,
    lastSyncedRequestId: action.requestId || null,
    noRealValue: true,
    chainNetwork: "CANARY",
  };

  return await adminClient
    .from("mochi_social_progress_snapshots")
    .upsert(
      {
        user_id: userId,
        authority: "mochirii-edge",
        revision,
        state,
        last_request_id: action.requestId || null,
        last_action_type: action.type,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("user_id,authority,revision,state,updated_at")
    .single();
}
