import "@supabase/functions-js/edge-runtime.d.ts";
import { CORS_HEADERS, alphaAccess, jsonResponse, readJsonBody, requireUser, safeString } from "../_shared/mochi-social-alpha.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ ok: false, message: "Method not allowed." }, 405);

  const access = await requireUser(req);
  if (!access.ok) return access.response;

  const alpha = await alphaAccess(access.adminClient, access.userId);
  if (!alpha.ok || !alpha.hasAccess) {
    return jsonResponse(
      { ok: false, error: "alpha_access_required", message: "Mochi Social feedback is available to allowlisted alpha testers." },
      403,
    );
  }

  const bodyResult = await readJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;

  const message = safeString(bodyResult.body.message, 2000);
  const category = safeString(bodyResult.body.category, 40) || "general";
  const sessionId = safeString(bodyResult.body.session_id, 120);

  if (!message) return jsonResponse({ ok: false, error: "missing_feedback", message: "Feedback message is required." }, 400);

  const { data, error } = await access.adminClient
    .from("mochi_social_feedback")
    .insert({ user_id: access.userId, category, message, session_id: sessionId })
    .select("id,created_at")
    .maybeSingle();

  if (error || !data) return jsonResponse({ ok: false, error: "feedback_insert_failed", message: "Feedback could not be saved." }, 500);

  return jsonResponse({ ok: true, data, message: "Mochi Social feedback saved." });
});
