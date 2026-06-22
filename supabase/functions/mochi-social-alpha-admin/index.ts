import "@supabase/functions-js/edge-runtime.d.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CORS_HEADERS, jsonResponse, readRequiredJsonBody, requireModeratorAccess, safeString } from "../_shared/gallery-moderation.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ ok: false, message: "Method not allowed." }, 405);

  const access = await requireModeratorAccess(req);
  if (!access.ok) return access.response;

  const bodyResult = await readRequiredJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;

  const action = safeString(bodyResult.body.action, 40) || "list";
  const userId = safeString(bodyResult.body.user_id, 80);
  const notes = safeString(bodyResult.body.notes, 500);

  if (action === "grant" || action === "revoke") {
    if (!userId || !UUID_RE.test(userId)) {
      return jsonResponse({ ok: false, error: "invalid_user_id", message: "A valid user_id is required." }, 400);
    }

    const { error } = await access.adminClient.from("mochi_social_alpha_testers").upsert(
      {
        user_id: userId,
        status: action === "grant" ? "active" : "revoked",
        notes,
        invited_by: access.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) return jsonResponse({ ok: false, error: "alpha_tester_update_failed", message: "Alpha tester access could not be updated." }, 500);
  }

  const { data, error } = await access.adminClient
    .from("mochi_social_alpha_testers")
    .select("user_id,status,notes,invited_by,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return jsonResponse({ ok: false, error: "alpha_tester_list_failed", message: "Alpha tester list could not be loaded." }, 500);

  const audit = await loadAlphaAudit(access.adminClient);

  return jsonResponse({
    ok: true,
    data: { testers: data || [], audit },
    message: action === "grant" ? "Alpha access granted." : action === "revoke" ? "Alpha access revoked." : "Alpha access loaded.",
  });
});

async function safeCount(adminClient: SupabaseClient, table: string, column?: string, value?: string) {
  let query = adminClient.from(table).select("*", { count: "exact", head: true });
  if (column && value) query = query.eq(column, value);
  const { count, error } = await query;
  return error ? null : Number(count || 0);
}

async function loadAlphaAudit(adminClient: SupabaseClient) {
  const [
    activeTesters,
    revokedTesters,
    ledgerEvents,
    feedbackCount,
    chatMessages,
    unityPlayers,
    sharedPetSnapshots,
    recentLedger,
    recentSharedPets,
    recentFeedback,
  ] = await Promise.all([
    safeCount(adminClient, "mochi_social_alpha_testers", "status", "active"),
    safeCount(adminClient, "mochi_social_alpha_testers", "status", "revoked"),
    safeCount(adminClient, "mochi_social_ledger_events"),
    safeCount(adminClient, "mochi_social_feedback"),
    safeCount(adminClient, "mochi_social_chat_messages"),
    safeCount(adminClient, "mochi_social_unity_players"),
    safeCount(adminClient, "mochi_social_shared_pet_snapshots"),
    adminClient
      .from("mochi_social_ledger_events")
      .select("id,request_id,actor_id,event_type,entity_type,entity_id,created_at")
      .order("created_at", { ascending: false })
      .limit(12),
    adminClient
      .from("mochi_social_shared_pet_snapshots")
      .select("pet_key,room_key,revision,source_request_id,last_actor_id,updated_at")
      .order("updated_at", { ascending: false })
      .limit(4),
    adminClient
      .from("mochi_social_feedback")
      .select("id,user_id,category,message,session_id,created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return {
    summary: {
      activeTesters,
      revokedTesters,
      ledgerEvents,
      feedbackCount,
      chatMessages,
      unityPlayers,
      sharedPetSnapshots,
    },
    recentLedger: recentLedger.error ? [] : recentLedger.data || [],
    recentSharedPets: recentSharedPets.error ? [] : recentSharedPets.data || [],
    recentFeedback: recentFeedback.error ? [] : recentFeedback.data || [],
  };
}
