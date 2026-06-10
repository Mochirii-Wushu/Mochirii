import "@supabase/functions-js/edge-runtime.d.ts";
import {
  CORS_HEADERS,
  asRecord,
  alphaAccess,
  createAdminClient,
  jsonResponse,
  readJsonBody,
  recordLedgerEvent,
  requireGameServer,
  safeString,
} from "../_shared/mochi-social-alpha.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const VALID_SPECIES = new Set(["momo", "yuzu", "sora"]);

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
    return jsonResponse({
      ok: true,
      data: { requestId, type, duplicate: true, noRealValue: true, chainNetwork: "CANARY" },
      message: "Alpha action already recorded.",
    });
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

  if (type === "pet.befriend" || type === "pet.care") {
    const result = await recordPetAction(adminClient, playerId, payload);
    if (!result.ok) return result.response;
  }

  if (type === "market.fixed_list") {
    const result = await recordFixedMarketListing(adminClient, playerId, payload);
    if (!result.ok) return result.response;
  }

  if (type === "trade.direct_offer") {
    const result = await recordDirectTrade(adminClient, playerId, payload);
    if (!result.ok) return result.response;
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

function speciesFromPayload(payload: Record<string, unknown>) {
  const state = asRecord(payload.state);
  const rawSpecies = safeString(payload.species, 24) || safeString(state.petId, 24) || "momo";
  return VALID_SPECIES.has(rawSpecies) ? rawSpecies : "momo";
}

function growthStageFromBond(bond: number) {
  if (bond >= 5) return "glow";
  if (bond >= 3) return "sprout";
  return "seed";
}

async function recordPetAction(adminClient: ReturnType<typeof createAdminClient>, playerId: string, payload: Record<string, unknown>) {
  if (!adminClient) return { ok: false as const, response: jsonResponse({ ok: false, error: "mochi_social_not_configured" }, 500) };

  const species = speciesFromPayload(payload);
  const { data: existingPet, error: existingError } = await adminClient
    .from("mochi_social_pets")
    .select("id,bond")
    .eq("owner_id", playerId)
    .eq("species", species)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) return { ok: false as const, response: jsonResponse({ ok: false, error: "pet_lookup_failed", message: "Pet state could not be loaded." }, 500) };

  const nextBond = Math.min(5, Number(existingPet?.bond || 0) + 1);
  const row = {
    owner_id: playerId,
    species,
    nickname: species === "momo" ? "Momo Puff" : species === "yuzu" ? "Yuzu Flicker" : "Sora Drop",
    bond: nextBond,
    growth_stage: growthStageFromBond(nextBond),
    certificate_eligible: species === "sora",
    tradeable: species === "sora",
    updated_at: new Date().toISOString(),
  };

  const query = existingPet?.id
    ? adminClient.from("mochi_social_pets").update(row).eq("id", existingPet.id)
    : adminClient.from("mochi_social_pets").insert(row);

  const { error } = await query;
  if (error) return { ok: false as const, response: jsonResponse({ ok: false, error: "pet_write_failed", message: "Pet state could not be saved." }, 500) };
  return { ok: true as const };
}

async function recordFixedMarketListing(adminClient: ReturnType<typeof createAdminClient>, playerId: string, payload: Record<string, unknown>) {
  if (!adminClient) return { ok: false as const, response: jsonResponse({ ok: false, error: "mochi_social_not_configured" }, 500) };

  const itemId = safeString(payload.itemId, 80) || "lantern-charm";
  const priceSoft = Math.max(1, Math.min(9999, Number(payload.priceSoft || 25) || 25));
  const { data: inventory, error: inventoryError } = await adminClient
    .from("mochi_social_inventory")
    .insert({
      owner_id: playerId,
      item_id: itemId,
      quantity: 1,
      location: "hot",
      tradeable: true,
    })
    .select("id")
    .single();

  if (inventoryError || !inventory?.id) {
    return { ok: false as const, response: jsonResponse({ ok: false, error: "inventory_write_failed", message: "Market inventory could not be prepared." }, 500) };
  }

  const { error } = await adminClient.from("mochi_social_market_listings").insert({
    seller_id: playerId,
    inventory_id: inventory.id,
    item_id: itemId,
    price_soft: priceSoft,
    status: "active",
  });

  if (error) return { ok: false as const, response: jsonResponse({ ok: false, error: "market_listing_failed", message: "Fixed-price listing could not be saved." }, 500) };
  return { ok: true as const };
}

async function recordDirectTrade(adminClient: ReturnType<typeof createAdminClient>, playerId: string, payload: Record<string, unknown>) {
  if (!adminClient) return { ok: false as const, response: jsonResponse({ ok: false, error: "mochi_social_not_configured" }, 500) };

  const recipientId = safeString(payload.recipientId, 80);
  const offered = Array.isArray(payload.offered) ? payload.offered : [{ item_id: "lantern-charm", quantity: 1, no_real_value: true }];
  const requested = Array.isArray(payload.requested) ? payload.requested : [{ soft_currency: 10, no_real_value: true }];

  if (recipientId && !UUID_RE.test(recipientId)) {
    return { ok: false as const, response: jsonResponse({ ok: false, error: "invalid_trade_recipient", message: "Trade recipient must be a valid alpha user id." }, 400) };
  }

  const { error } = await adminClient.from("mochi_social_trades").insert({
    requester_id: playerId,
    recipient_id: recipientId || null,
    offered,
    requested,
    status: "offered",
  });

  if (error) return { ok: false as const, response: jsonResponse({ ok: false, error: "trade_write_failed", message: "Direct trade proof could not be saved." }, 500) };
  return { ok: true as const };
}
