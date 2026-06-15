import "@supabase/functions-js/edge-runtime.d.ts";
import {
  CORS_HEADERS,
  alphaAccess,
  createAdminClient,
  jsonResponse,
  loadAlphaProgressSnapshot,
  normalizeAlphaProgressSnapshot,
  readJsonBody,
  requireGameServer,
  safeString,
} from "../_shared/mochi-social-alpha.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

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

  const playerId = safeString(bodyResult.body.playerId, 80);
  if (!playerId || !UUID_RE.test(playerId)) {
    return jsonResponse({ ok: false, error: "missing_alpha_player", message: "A verified alpha player identity is required." }, 401);
  }

  const access = await alphaAccess(adminClient, playerId);
  if (!access.ok) return jsonResponse({ ok: false, error: "alpha_access_lookup_failed", message: "Alpha access could not be verified." }, 500);
  if (!access.hasAccess) return jsonResponse({ ok: false, error: "alpha_allowlist_required", message: "This player is not active on the alpha allowlist." }, 403);
  if (!access.termsAccepted) return jsonResponse({ ok: false, error: "alpha_terms_required", message: "Alpha terms must be acknowledged before loading game progress." }, 403);

  const { data, error } = await loadAlphaProgressSnapshot(adminClient, playerId);
  if (error) return jsonResponse({ ok: false, error: "alpha_progress_lookup_failed", message: "Alpha progress snapshot could not be loaded." }, 500);

  return jsonResponse({
    ok: true,
    data: {
      progress: normalizeAlphaProgressSnapshot(data),
      noRealValue: true,
      chainNetwork: "CANARY",
    },
  });
});
