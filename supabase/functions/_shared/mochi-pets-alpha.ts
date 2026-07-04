import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export type JsonRecord = Record<string, unknown>;

export const ALPHA_TERMS_VERSION = "alpha-rc-2026-06-10";
export const UNITY_ROOM_KEY = "jade-lantern-room-alpha";
export const UNITY_SHARED_PET_KEY = "lirabao";
export const UNITY_SHARED_PET_DISPLAY_NAME = "Lirabao";
export const UNITY_CUSTOM_ID_PREFIX = "mochirii:";
const MEMBER_USER_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNITY_SHARED_PET_STATES = new Set(["idle", "approach", "happy", "care_received", "stale_revision_reload", "unavailable"]);
const UNITY_SHARED_PET_MOODS = new Set(["curious", "resting", "reloading", "comforted", "playful"]);

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mochi-pets-server-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export type AccessFailure = { ok: false; response: Response };
export type UserAccess = { ok: true; adminClient: SupabaseClient; user: User; userId: string };
export type AlphaProgressSnapshot = {
  user_id: string;
  revision: number;
  state: JsonRecord;
  source_request_id?: string | null;
  last_action_type?: string | null;
  updated_at: string;
};
export type UnityPlayerLink = {
  user_id: string;
  unity_player_id: string;
  custom_id: string;
  room_key: string;
  created_at?: string;
  updated_at?: string;
};
export type SharedPetSnapshot = {
  pet_key: string;
  room_key: string;
  revision: number;
  state: JsonRecord;
  source_request_id?: string | null;
  last_actor_id?: string | null;
  updated_at: string;
};

export function jsonResponse(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

export function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function safeString(value: unknown, maxLength: number): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

export function unityCustomId(userId: string): string {
  return `${UNITY_CUSTOM_ID_PREFIX}${userId}`;
}

export function normalizeMemberUserId(userId: unknown): string | null {
  const text = safeString(userId, 80)?.toLowerCase() || "";
  return MEMBER_USER_ID_RE.test(text) ? text : null;
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
      response: jsonResponse({ ok: false, error: "mochi_pets_not_configured", message: "Mochi Pets alpha is not configured yet." }, 500),
    };
  }

  const accessToken = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) {
    return {
      ok: false,
      response: jsonResponse({ ok: false, error: "missing_auth", message: "Sign in before entering Mochi Pets alpha." }, 401),
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
  const expected = Deno.env.get("MOCHI_PETS_GAME_SERVER_TOKEN") || "";
  const provided = req.headers.get("x-mochi-pets-server-token") || "";
  if (expected && provided && expected === provided) return { ok: true };

  return {
    ok: false,
    response: jsonResponse(
      { ok: false, error: "invalid_game_server_token", message: "Mochi Pets game server token is missing or invalid." },
      401,
    ),
  };
}

export async function alphaAccess(adminClient: SupabaseClient, userId: string) {
  const termsVersion = Deno.env.get("MOCHI_PETS_ALPHA_TERMS_VERSION") || ALPHA_TERMS_VERSION;
  const [{ data: tester, error: testerError }, { data: terms, error: termsError }] = await Promise.all([
    adminClient.from("mochi_pets_alpha_testers").select("user_id,status,notes,created_at,updated_at").eq("user_id", userId).maybeSingle(),
    adminClient
      .from("mochi_pets_terms_acknowledgements")
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
    .from("mochi_pets_profiles")
    .upsert(
      {
        id: user.id,
        display_name: displayName,
        managed_wallet_external_id: `mochi-pets-alpha:${user.id}`,
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
  const { error } = await adminClient.from("mochi_pets_ledger_events").insert({
    request_id: event.requestId || null,
    actor_id: event.actorId || null,
    event_type: event.eventType,
    entity_type: event.entityType || null,
    entity_id: event.entityId || null,
    delta: event.delta || {},
  });

  return error;
}

export async function loadAlphaProgressSnapshot(adminClient: SupabaseClient, userId: string) {
  return await adminClient
    .from("mochi_pets_progress_snapshots")
    .select("user_id,revision,state,source_request_id,last_action_type,updated_at")
    .eq("user_id", userId)
    .maybeSingle();
}

export function normalizeAlphaProgressSnapshot(row: AlphaProgressSnapshot | null | undefined) {
  if (!row) return null;
  return {
    authority: "mochirii-edge",
    userId: row.user_id,
    revision: Number(row.revision || 0),
    state: isJsonRecord(row.state) ? row.state : {},
    sourceRequestId: row.source_request_id || null,
    lastActionType: row.last_action_type || null,
    updatedAt: row.updated_at,
  };
}

export async function upsertAlphaProgressSnapshot(
  adminClient: SupabaseClient,
  input: { userId: string; state: unknown; sourceRequestId?: string | null; actionType?: string | null },
) {
  if (!isJsonRecord(input.state)) {
    return { ok: false as const, error: "invalid_progress_state", message: "Progress state must be a JSON object." };
  }

  if (JSON.stringify(input.state).length > 220_000) {
    return { ok: false as const, error: "progress_state_too_large", message: "Progress state is too large for alpha account sync." };
  }

  const { data: existing, error: existingError } = await loadAlphaProgressSnapshot(adminClient, input.userId);
  if (existingError) {
    return { ok: false as const, error: "progress_lookup_failed", message: "Account progress could not be loaded." };
  }

  const nextRevision = Number((existing as AlphaProgressSnapshot | null)?.revision || 0) + 1;
  const { data, error } = await adminClient
    .from("mochi_pets_progress_snapshots")
    .upsert(
      {
        user_id: input.userId,
        revision: nextRevision,
        state: input.state,
        source_request_id: input.sourceRequestId || null,
        last_action_type: input.actionType || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("user_id,revision,state,source_request_id,last_action_type,updated_at")
    .single();

  if (error) {
    return { ok: false as const, error: "progress_snapshot_failed", message: "Account progress snapshot could not be saved." };
  }

  return { ok: true as const, snapshot: normalizeAlphaProgressSnapshot(data as AlphaProgressSnapshot) };
}

export async function upsertUnityPlayerLink(
  adminClient: SupabaseClient,
  input: { userId: string; unityPlayerId: string; customId: string; roomKey?: string | null },
) {
  const customId = input.customId;
  const roomKey = input.roomKey || UNITY_ROOM_KEY;
  if (customId !== unityCustomId(input.userId)) {
    return {
      ok: false as const,
      error: "invalid_unity_custom_id",
      message: "Unity Custom ID must match the signed-in Mochirii member.",
    };
  }

  if (roomKey !== UNITY_ROOM_KEY) {
    return { ok: false as const, error: "invalid_unity_room", message: "Unity player mapping must stay in the Jade Lantern room." };
  }

  const { data, error } = await adminClient
    .from("mochi_pets_unity_players")
    .upsert(
      {
        user_id: input.userId,
        unity_player_id: input.unityPlayerId,
        custom_id: customId,
        room_key: roomKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("user_id,unity_player_id,custom_id,room_key,created_at,updated_at")
    .single();

  if (error) {
    return { ok: false as const, error: "unity_player_link_failed", message: "Unity player mapping could not be saved." };
  }

  return { ok: true as const, link: data as UnityPlayerLink };
}

export async function loadSharedPetSnapshot(adminClient: SupabaseClient, petKey = UNITY_SHARED_PET_KEY) {
  return await adminClient
    .from("mochi_pets_shared_pet_snapshots")
    .select("pet_key,room_key,revision,state,source_request_id,last_actor_id,updated_at")
    .eq("pet_key", petKey)
    .maybeSingle();
}

export function normalizeSharedPetSnapshot(row: SharedPetSnapshot | null | undefined) {
  if (!row) return null;
  return {
    authority: "ugs-cloud-save-audit-mirror",
    petKey: row.pet_key,
    roomKey: row.room_key,
    revision: Number(row.revision || 0),
    state: isJsonRecord(row.state) ? row.state : {},
    sourceRequestId: row.source_request_id || null,
    lastActorId: row.last_actor_id || null,
    updatedAt: row.updated_at,
  };
}

export async function upsertSharedPetSnapshot(
  adminClient: SupabaseClient,
  input: { petKey?: string | null; roomKey?: string | null; state: unknown; sourceRequestId?: string | null; lastActorId?: string | null },
) {
  const petKey = input.petKey || UNITY_SHARED_PET_KEY;
  const roomKey = input.roomKey || UNITY_ROOM_KEY;
  if (petKey !== UNITY_SHARED_PET_KEY || roomKey !== UNITY_ROOM_KEY) {
    return { ok: false as const, error: "invalid_unity_room_pet", message: "Only shared Lirabao in the Jade Lantern room may be mirrored." };
  }

  if (!isJsonRecord(input.state)) {
    return { ok: false as const, error: "invalid_shared_pet_state", message: "Shared pet state must be a JSON object." };
  }
  if (!isValidSharedPetState(input.state)) {
    return { ok: false as const, error: "invalid_shared_pet_state", message: "Shared Lirabao state is not valid for this room." };
  }

  const lastActorId = normalizeMemberUserId(input.lastActorId);
  const stateActorId = normalizeMemberUserId(input.state.lastInteractionBy);
  if (!lastActorId || !stateActorId || lastActorId !== stateActorId) {
    return { ok: false as const, error: "invalid_shared_pet_actor", message: "Shared Lirabao state must match the verified member actor." };
  }

  if (JSON.stringify(input.state).length > 64_000) {
    return { ok: false as const, error: "shared_pet_state_too_large", message: "Shared pet state is too large for the audit mirror." };
  }

  const { data: existing, error: existingError } = await loadSharedPetSnapshot(adminClient, petKey);
  if (existingError) {
    return { ok: false as const, error: "shared_pet_lookup_failed", message: "Shared pet audit mirror could not be loaded." };
  }

  const nextRevision = Number((existing as SharedPetSnapshot | null)?.revision || 0) + 1;
  const { data, error } = await adminClient
    .from("mochi_pets_shared_pet_snapshots")
    .upsert(
      {
        pet_key: petKey,
        room_key: roomKey,
        revision: nextRevision,
        state: input.state,
        source_request_id: input.sourceRequestId || null,
        last_actor_id: lastActorId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "pet_key" },
    )
    .select("pet_key,room_key,revision,state,source_request_id,last_actor_id,updated_at")
    .single();

  if (error) {
    return { ok: false as const, error: "shared_pet_snapshot_failed", message: "Shared pet audit mirror could not be saved." };
  }

  return { ok: true as const, snapshot: normalizeSharedPetSnapshot(data as SharedPetSnapshot) };
}

function isValidSharedPetState(state: JsonRecord): boolean {
  return state.version === 1 &&
    state.petId === UNITY_SHARED_PET_KEY &&
    state.displayName === UNITY_SHARED_PET_DISPLAY_NAME &&
    UNITY_SHARED_PET_MOODS.has(String(state.mood || "")) &&
    UNITY_SHARED_PET_STATES.has(String(state.state || "")) &&
    Number.isInteger(state.careMeter) &&
    Number(state.careMeter) >= 0 &&
    Number(state.careMeter) <= 100 &&
    Number.isInteger(state.bondTier) &&
    Number(state.bondTier) >= 1 &&
    Number(state.bondTier) <= 5 &&
    Number.isInteger(state.lastInteractionUnixSeconds) &&
    Number(state.lastInteractionUnixSeconds) >= 0 &&
    typeof state.writeLock === "string" &&
    state.writeLock.length > 0 &&
    state.writeLock.length <= 120 &&
    Number.isInteger(state.revision) &&
    Number(state.revision) >= 0;
}
