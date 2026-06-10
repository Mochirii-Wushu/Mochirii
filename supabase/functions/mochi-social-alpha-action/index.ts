import "@supabase/functions-js/edge-runtime.d.ts";
import {
  CORS_HEADERS,
  asRecord,
  createAdminClient,
  jsonResponse,
  readJsonBody,
  recordLedgerEvent,
  requireGameServer,
  safeString,
} from "../_shared/mochi-social-alpha.ts";

const VALID_ACTIONS = new Set([
  "chat.send",
  "emote.send",
  "pet.befriend",
  "pet.care",
  "market.fixed_list",
  "trade.direct_offer",
  "chain.withdraw_request",
  "chain.deposit_request",
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

  if (type === "chat.send") {
    const message = safeString(payload.message, 500);
    if (message) {
      const { error } = await adminClient.from("mochi_social_chat_messages").insert({
        user_id: playerId || null,
        room: safeString(payload.room, 80) || "town",
        message,
      });

      if (error) return jsonResponse({ ok: false, error: "chat_insert_failed", message: "Chat could not be recorded." }, 500);
    }
  }

  if (type.startsWith("chain.")) {
    const { error } = await adminClient.from("mochi_social_chain_operations").upsert(
      {
        request_id: requestId,
        user_id: playerId || null,
        operation_type: type,
        network: "CANARY",
        status: "pending",
        payload,
      },
      { onConflict: "request_id" },
    );

    if (error) return jsonResponse({ ok: false, error: "chain_operation_failed", message: "Chain operation could not be recorded." }, 500);
  }

  const ledgerError = await recordLedgerEvent(adminClient, {
    requestId,
    actorId: playerId,
    eventType: type,
    entityType: safeString(payload.entityType, 80),
    entityId: safeString(payload.entityId, 120),
    delta: { ...payload, noRealValue: true, chainNetwork: "CANARY" },
  });

  if (ledgerError) return jsonResponse({ ok: false, error: "ledger_insert_failed", message: "Alpha ledger event could not be recorded." }, 500);

  return jsonResponse({
    ok: true,
    data: { requestId, type, noRealValue: true, chainNetwork: "CANARY" },
  });
});
