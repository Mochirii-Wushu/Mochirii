import "@supabase/functions-js/edge-runtime.d.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CORS_HEADERS,
  UNITY_ROOM_KEY,
  UNITY_SHARED_PET_KEY,
  asRecord,
  alphaAccess,
  createAdminClient,
  jsonResponse,
  loadSharedPetSnapshot,
  loadAlphaProgressSnapshot,
  normalizeSharedPetSnapshot,
  normalizeAlphaProgressSnapshot,
  readJsonBody,
  recordLedgerEvent,
  requireGameServer,
  safeString,
  upsertSharedPetSnapshot,
  upsertAlphaProgressSnapshot,
} from "../_shared/mochi-social-alpha.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

const VALID_ACTIONS = new Set([
  "chat.send",
  "emote.send",
  "unity.character.created",
  "unity.character.updated",
  "unity.pet.interaction",
  "unity.pet.state_saved",
  "unity.room.joined",
  "unity.room.left",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ ok: false, message: "Method not allowed." }, 405);

  const serverAccess = requireGameServer(req);
  if (!serverAccess.ok) return serverAccess.response;

  const adminClient = createAdminClient();
  if (!adminClient) {
    return jsonResponse({ ok: false, error: "mochi_social_not_configured", message: "Mochi Social alpha database access is not configured." }, 500);
  }

  const bodyResult = await readJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;

  const requestId = safeString(bodyResult.body.requestId, 120);
  const type = safeString(bodyResult.body.type, 80);
  const playerId = safeString(bodyResult.body.playerId, 80);
  const payload = asRecord(bodyResult.body.payload);

  if (!requestId || !type || !VALID_ACTIONS.has(type)) {
    return jsonResponse({ ok: false, error: "invalid_alpha_action", message: "A valid requestId and alpha action type are required." }, 400);
  }

  if (!playerId || !UUID_RE.test(playerId)) {
    return jsonResponse({ ok: false, error: "missing_alpha_player", message: "A verified alpha player identity is required." }, 401);
  }

  const access = await alphaAccess(adminClient, playerId);
  if (!access.ok) return jsonResponse({ ok: false, error: "alpha_access_lookup_failed", message: "Alpha access could not be verified." }, 500);
  if (!access.hasAccess) return jsonResponse({ ok: false, error: "alpha_allowlist_required", message: "This player is not active on the alpha allowlist." }, 403);
  if (!access.termsAccepted) return jsonResponse({ ok: false, error: "alpha_terms_required", message: "Alpha terms must be acknowledged before recording game actions." }, 403);

  const { data: existingLedger, error: existingLedgerError } = await adminClient
    .from("mochi_social_ledger_events")
    .select("id")
    .eq("request_id", requestId)
    .maybeSingle();

  if (existingLedgerError) {
    return jsonResponse({ ok: false, error: "ledger_lookup_failed", message: "Alpha ledger idempotency could not be checked." }, 500);
  }

  if (existingLedger) {
    const { data: snapshot } = await loadAlphaProgressSnapshot(adminClient, playerId);
    const { data: sharedPet } = await loadSharedPetSnapshot(adminClient);
    return jsonResponse({
      ok: true,
      data: { requestId, type, duplicate: true, noRealValue: true },
      progress: normalizeAlphaProgressSnapshot(snapshot),
      sharedPet: normalizeSharedPetSnapshot(sharedPet),
      message: "Alpha action already recorded.",
    });
  }

  if (type === "chat.send") {
    const message = safeString(payload.message, 500);
    if (message) {
      const { error } = await adminClient.from("mochi_social_chat_messages").insert({
        user_id: playerId || null,
        room: safeString(payload.room, 80) || UNITY_ROOM_KEY,
        message,
      });

      if (error) return jsonResponse({ ok: false, error: "chat_insert_failed", message: "Chat could not be recorded." }, 500);
    }
  }

  const sharedPetResult = type === "unity.pet.state_saved"
    ? await recordSharedPetState(adminClient, requestId, playerId, payload)
    : null;
  if (sharedPetResult && !sharedPetResult.ok) return sharedPetResult.response;

  const ledgerError = await recordLedgerEvent(adminClient, {
    requestId,
    actorId: playerId,
    eventType: type,
    entityType: safeString(payload.entityType, 80),
    entityId: safeString(payload.entityId, 120),
    delta: { ...payload, noRealValue: true },
  });

  if (ledgerError) return jsonResponse({ ok: false, error: "ledger_insert_failed", message: "Alpha ledger event could not be recorded." }, 500);

  const state = asRecord(payload.state);
  const progressResult = Object.keys(state).length > 0
    ? await upsertAlphaProgressSnapshot(adminClient, { userId: playerId, state, sourceRequestId: requestId, actionType: type })
    : null;

  if (progressResult && !progressResult.ok) {
    const status = progressResult.error === "invalid_progress_state" || progressResult.error === "progress_state_too_large" ? 400 : 500;
    return jsonResponse({ ok: false, error: progressResult.error, message: progressResult.message }, status);
  }

  return jsonResponse({
    ok: true,
    data: { requestId, type, noRealValue: true },
    progress: progressResult?.snapshot ?? null,
    sharedPet: sharedPetResult?.snapshot ?? null,
  });
});

async function recordSharedPetState(adminClient: SupabaseClient, requestId: string, playerId: string, payload: Record<string, unknown>) {
  const state = asRecord(payload.state);
  const petKey = safeString(payload.petKey, 40) || UNITY_SHARED_PET_KEY;
  const roomKey = safeString(payload.roomKey, 80) || UNITY_ROOM_KEY;
  if (!Object.keys(state).length) {
    return {
      ok: false as const,
      response: jsonResponse({ ok: false, error: "invalid_shared_pet_state", message: "Shared Lirabao state is required." }, 400),
    };
  }

  const result = await upsertSharedPetSnapshot(adminClient, {
    petKey,
    roomKey,
    state,
    sourceRequestId: requestId,
    lastActorId: playerId,
  });

  if (!result.ok) {
    const status = result.error === "invalid_unity_room_pet" || result.error === "invalid_shared_pet_state" || result.error === "shared_pet_state_too_large"
      ? 400
      : 500;
    return { ok: false as const, response: jsonResponse({ ok: false, error: result.error, message: result.message }, status) };
  }

  return { ok: true as const, snapshot: result.snapshot };
}
