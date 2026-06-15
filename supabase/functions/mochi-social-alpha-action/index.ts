import "@supabase/functions-js/edge-runtime.d.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CORS_HEADERS,
  asRecord,
  alphaAccess,
  createAdminClient,
  jsonResponse,
  loadAlphaProgressSnapshot,
  normalizeAlphaProgressSnapshot,
  readJsonBody,
  recordLedgerEvent,
  requireGameServer,
  safeString,
  upsertAlphaProgressSnapshot,
} from "../_shared/mochi-social-alpha.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const VALID_SPIRITS = new Set(["lirabao", "jintari", "aozhen"]);
const CERTIFICATE_ELIGIBLE_SPIRITS = new Set(["lirabao"]);
const SPIRIT_DISPLAY_NAMES: Record<string, string> = {
  lirabao: "Lirabao",
  jintari: "Jintari",
  aozhen: "Aozhen",
};
const VALID_CHAIN_STATUSES = new Set(["pending", "broadcast", "finalized", "failed", "abandoned", "timeout"]);

const VALID_ACTIONS = new Set([
  "chat.send",
  "emote.send",
  "spirit.capture",
  "spirit.route_invite",
  "world.route_mastery",
  "spirit.habitat_bond",
  "spirit.research",
  "spirit.attune",
  "spirit.journal",
  "world.expedition",
  "spirit.technique",
  "battle.tactic_scroll",
  "guild.rank_trial",
  "spirit.growth_rite",
  "battle.affinity_trial",
  "party.set",
  "party.harmony_form",
  "battle.harmony_trial",
  "battle.team_spar_match",
  "battle.spar_ladder",
  "spirit.bond",
  "spirit.care",
  "spirit.train",
  "spirit.raise",
  "quest.accept",
  "quest.progress",
  "market.fixed_list",
  "trade.direct_offer",
  "chain.withdraw_request",
  "chain.deposit_request",
  "chain.operation_update",
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
    const { data } = await loadAlphaProgressSnapshot(adminClient, playerId);
    return jsonResponse({
      ok: true,
      data: { requestId, type, duplicate: true, noRealValue: true, chainNetwork: "CANARY", progress: normalizeAlphaProgressSnapshot(data) },
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

  if (recordsSpiritSnapshot(type)) {
    const result = await recordSpiritAction(adminClient, playerId, type, payload);
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

  if (type === "chain.operation_update") {
    const result = await recordChainOperationUpdate(adminClient, playerId, payload);
    if (!result.ok) return result.response;
  } else if (type.startsWith("chain.")) {
    const result = await recordChainOperationRequest(adminClient, requestId, playerId, type, payload);
    if (!result.ok) return result.response;
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

  const { data: progressData, error: progressError } = await upsertAlphaProgressSnapshot(adminClient, playerId, { requestId, type, payload });
  if (progressError) return jsonResponse({ ok: false, error: "alpha_progress_snapshot_failed", message: "Alpha progress snapshot could not be saved." }, 500);

  return jsonResponse({
    ok: true,
    data: { requestId, type, noRealValue: true, chainNetwork: "CANARY", progress: normalizeAlphaProgressSnapshot(progressData) },
  });
});

function recordsSpiritSnapshot(type: string) {
  return (
    type.startsWith("spirit.") ||
    type.startsWith("world.") ||
    type.startsWith("battle.") ||
    type.startsWith("guild.") ||
    type.startsWith("party.") ||
    type.startsWith("quest.")
  );
}

function spiritFromPayload(payload: Record<string, unknown>) {
  const state = asRecord(payload.state);
  const candidates = [
    safeString(payload.spiritId, 24),
    safeString(payload.activeSpiritId, 24),
    safeString(state.spiritId, 24),
    safeString(state.activeSpiritId, 24),
    safeString(state.lastInspectedSpiritId, 24),
  ].filter((candidate): candidate is string => Boolean(candidate));
  const spiritId = candidates.find((candidate) => VALID_SPIRITS.has(candidate));
  return spiritId || "lirabao";
}

function growthStageFromBond(bond: number) {
  if (bond >= 5) return "glow";
  if (bond >= 3) return "sprout";
  return "seed";
}

function growthStageFromPayload(payload: Record<string, unknown>, bond: number) {
  const state = asRecord(payload.state);
  const growth = safeString(payload.growth, 24) || safeString(state.growth, 24) || safeString(state.growthStage, 24) || "";
  return ["seed", "sprout", "glow"].includes(growth) ? growth : growthStageFromBond(bond);
}

async function recordSpiritAction(adminClient: SupabaseClient, playerId: string, type: string, payload: Record<string, unknown>) {
  if (!adminClient) return { ok: false as const, response: jsonResponse({ ok: false, error: "mochi_social_not_configured" }, 500) };

  const spiritId = spiritFromPayload(payload);
  const state = asRecord(payload.state);
  const incomingBond = Number(payload.bond || state.bond || 0) || 0;
  const { data: existingSpirit, error: existingError } = await adminClient
    .from("mochi_social_spirits")
    .select("id,bond")
    .eq("owner_id", playerId)
    .eq("spirit_id", spiritId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) return { ok: false as const, response: jsonResponse({ ok: false, error: "spirit_lookup_failed", message: "Mochi Spirit state could not be loaded." }, 500) };

  const existingBond = Number(existingSpirit?.bond || 0) || 0;
  const nextBond = Math.max(1, Math.min(5, Math.max(existingBond, incomingBond || existingBond + 1)));
  const row = {
    owner_id: playerId,
    spirit_id: spiritId,
    nickname: SPIRIT_DISPLAY_NAMES[spiritId],
    bond: nextBond,
    growth_stage: growthStageFromPayload(payload, nextBond),
    journal: {
      actionType: type,
      journalDiscoveredCount: Number(payload.journalDiscoveredCount || state.journalDiscoveredCount || 0) || 0,
      routeMasteryProof: Boolean(payload.routeMasteryProof || state.routeMasteryProof),
      habitatBondProof: Boolean(payload.habitatBondProof || state.habitatBondProof),
      researchProof: Boolean(payload.researchProof || state.researchProof),
      questChainProof: Boolean(payload.questChainProof || state.questChainProof),
      noRealValue: true,
    },
    care: {
      trainingXp: Number(payload.trainingXp || state.trainingXp || 0) || 0,
      raisingProof: Boolean(payload.raisingProof || state.raisingProof),
      growthRiteProof: Boolean(payload.growthRiteProof || state.growthRiteProof),
      updatedBy: type,
      noRealValue: true,
    },
    certificate_eligible: CERTIFICATE_ELIGIBLE_SPIRITS.has(spiritId),
    tradeable: CERTIFICATE_ELIGIBLE_SPIRITS.has(spiritId),
    updated_at: new Date().toISOString(),
  };

  const query = existingSpirit?.id
    ? adminClient.from("mochi_social_spirits").update(row).eq("id", existingSpirit.id)
    : adminClient.from("mochi_social_spirits").insert(row);

  const { error } = await query;
  if (error) return { ok: false as const, response: jsonResponse({ ok: false, error: "spirit_write_failed", message: "Mochi Spirit state could not be saved." }, 500) };
  return { ok: true as const };
}

async function recordFixedMarketListing(adminClient: SupabaseClient, playerId: string, payload: Record<string, unknown>) {
  if (!adminClient) return { ok: false as const, response: jsonResponse({ ok: false, error: "mochi_social_not_configured" }, 500) };

  const itemId = safeString(payload.itemId, 80) || "jade-thread-charm";
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

async function recordDirectTrade(adminClient: SupabaseClient, playerId: string, payload: Record<string, unknown>) {
  if (!adminClient) return { ok: false as const, response: jsonResponse({ ok: false, error: "mochi_social_not_configured" }, 500) };

  const recipientId = safeString(payload.recipientId, 80);
  const offered = Array.isArray(payload.offered) ? payload.offered : [{ item_id: "jade-thread-charm", quantity: 1, no_real_value: true }];
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

function normalizeChainStatus(value: unknown) {
  const status = String(value || "").trim().toLowerCase();
  return VALID_CHAIN_STATUSES.has(status) ? status : null;
}

async function recordChainOperationRequest(
  adminClient: SupabaseClient,
  requestId: string,
  playerId: string,
  type: string,
  payload: Record<string, unknown>,
) {
  const status = normalizeChainStatus(payload.status) || "pending";
  const { error } = await adminClient.from("mochi_social_chain_operations").upsert(
    {
      request_id: requestId,
      user_id: playerId,
      operation_type: type,
      network: "CANARY",
      status,
      enjin_transaction_uuid: safeString(payload.enjinTransactionUuid, 120),
      enjin_listing_id: safeString(payload.enjinListingId, 120),
      payload: {
        ...payload,
        noRealValue: true,
        chainNetwork: "CANARY",
        finalityRequired: true,
      },
    },
    { onConflict: "request_id" },
  );

  if (error) return { ok: false as const, response: jsonResponse({ ok: false, error: "chain_operation_failed", message: "Chain operation could not be recorded." }, 500) };
  return { ok: true as const };
}

async function recordChainOperationUpdate(adminClient: SupabaseClient, playerId: string, payload: Record<string, unknown>) {
  const chainRequestId = safeString(payload.chainRequestId, 120);
  const nextStatus = normalizeChainStatus(payload.transactionState) || normalizeChainStatus(payload.status);
  if (!chainRequestId || !nextStatus) {
    return {
      ok: false as const,
      response: jsonResponse({ ok: false, error: "invalid_chain_update", message: "A chainRequestId and valid transactionState are required." }, 400),
    };
  }

  const { data: existing, error: lookupError } = await adminClient
    .from("mochi_social_chain_operations")
    .select("request_id,user_id,operation_type,status,payload")
    .eq("request_id", chainRequestId)
    .maybeSingle();

  if (lookupError) return { ok: false as const, response: jsonResponse({ ok: false, error: "chain_lookup_failed", message: "Chain operation could not be loaded." }, 500) };
  if (!existing) return { ok: false as const, response: jsonResponse({ ok: false, error: "chain_request_missing", message: "A matching chain request is required before finality updates." }, 404) };
  if (existing.user_id && existing.user_id !== playerId) {
    return { ok: false as const, response: jsonResponse({ ok: false, error: "chain_request_owner_mismatch", message: "Chain operation updates must match the original alpha tester." }, 403) };
  }

  const existingPayload = asRecord(existing.payload);
  const wasFinalized = String(existing.status || "").toLowerCase() === "finalized";
  const updatePayload = {
    ...existingPayload,
    lastUpdate: {
      status: nextStatus,
      enjinTransactionUuid: safeString(payload.enjinTransactionUuid, 120),
      enjinListingId: safeString(payload.enjinListingId, 120),
      extrinsicHash: safeString(payload.extrinsicHash, 160),
      updatedAt: new Date().toISOString(),
    },
    noRealValue: true,
    chainNetwork: "CANARY",
    finalityRequired: true,
  };

  const updateRow: Record<string, unknown> = {
    status: nextStatus,
    enjin_transaction_uuid: safeString(payload.enjinTransactionUuid, 120),
    enjin_listing_id: safeString(payload.enjinListingId, 120),
    payload: updatePayload,
  };
  if (nextStatus === "finalized") updateRow.finalized_at = new Date().toISOString();

  const { error: updateError } = await adminClient
    .from("mochi_social_chain_operations")
    .update(updateRow)
    .eq("request_id", chainRequestId);

  if (updateError) return { ok: false as const, response: jsonResponse({ ok: false, error: "chain_update_failed", message: "Chain operation status could not be updated." }, 500) };

  if (nextStatus === "finalized" && !wasFinalized) {
    const result = await applyFinalizedChainInventory(adminClient, playerId, String(existing.operation_type || ""), existingPayload, payload);
    if (!result.ok) return { ok: false as const, response: result.response };
  }

  return { ok: true as const };
}

async function applyFinalizedChainInventory(
  adminClient: SupabaseClient,
  playerId: string,
  operationType: string,
  existingPayload: Record<string, unknown>,
  updatePayload: Record<string, unknown>,
) {
  const itemId = safeString(updatePayload.itemId, 80) || safeString(existingPayload.itemId, 80) || "lirabao-canary-certificate";
  const quantity = Math.max(1, Math.min(9999, Number(updatePayload.amount || existingPayload.amount || 1) || 1));
  const inventoryId = safeString(updatePayload.inventoryId, 80) || safeString(existingPayload.inventoryId, 80);

  if (operationType === "chain.deposit_request") {
    const { error } = await adminClient.from("mochi_social_inventory").insert({
      owner_id: playerId,
      item_id: itemId,
      quantity,
      location: "hot",
      tradeable: true,
    });
    if (error) return { ok: false as const, response: jsonResponse({ ok: false, error: "hot_credit_failed", message: "Finalized cold-to-hot inventory credit could not be saved." }, 500) };
  }

  if (operationType === "chain.withdraw_request") {
    if (inventoryId) {
      const { error } = await adminClient
        .from("mochi_social_inventory")
        .update({ location: "cold", updated_at: new Date().toISOString() })
        .eq("id", inventoryId)
        .eq("owner_id", playerId);
      if (error) return { ok: false as const, response: jsonResponse({ ok: false, error: "cold_inventory_update_failed", message: "Finalized hot-to-cold inventory update could not be saved." }, 500) };
    } else {
      const { error } = await adminClient.from("mochi_social_inventory").insert({
        owner_id: playerId,
        item_id: itemId,
        quantity,
        location: "cold",
        tradeable: true,
      });
      if (error) return { ok: false as const, response: jsonResponse({ ok: false, error: "cold_inventory_insert_failed", message: "Finalized hot-to-cold inventory proof could not be saved." }, 500) };
    }
  }

  return { ok: true as const };
}
