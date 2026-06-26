import "@supabase/functions-js/edge-runtime.d.ts";
import {
  CORS_HEADERS,
  UNITY_ROOM_KEY,
  UNITY_SHARED_PET_KEY,
  alphaAccess,
  ensureAlphaProfile,
  jsonResponse,
  loadAlphaProgressSnapshot,
  normalizeAlphaProgressSnapshot,
  readJsonBody,
  requireUser,
  safeString,
} from "../_shared/mochi-social-alpha.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ ok: false, message: "Method not allowed." }, 405);

  const access = await requireUser(req);
  if (!access.ok) return access.response;

  const bodyResult = await readJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;

  const state = await alphaAccess(access.adminClient, access.userId);
  if (!state.ok) {
    return jsonResponse(
      { ok: false, error: "alpha_access_lookup_failed", message: "Mochi Social alpha access could not be checked." },
      500,
    );
  }

  if (bodyResult.body.acknowledgeTerms === true && state.hasAccess) {
    const { error } = await access.adminClient.from("mochi_social_terms_acknowledgements").upsert(
      {
        user_id: access.userId,
        terms_version: state.termsVersion,
        user_agent: safeString(req.headers.get("user-agent"), 500),
      },
      { onConflict: "user_id,terms_version" },
    );

    if (error) {
      return jsonResponse(
        { ok: false, error: "terms_acknowledgement_failed", message: "The alpha acknowledgement could not be saved." },
        500,
      );
    }
  }

  const refreshed = await alphaAccess(access.adminClient, access.userId);
  if (refreshed.ok && refreshed.hasAccess) {
    const profileError = await ensureAlphaProfile(access.adminClient, access.user);
    if (profileError) {
      return jsonResponse({ ok: false, error: "alpha_profile_failed", message: "Your Mochi Social alpha profile could not be prepared." }, 500);
    }
  }

  const progressResult = refreshed.ok && refreshed.hasAccess && refreshed.termsAccepted
    ? await loadAlphaProgressSnapshot(access.adminClient, access.userId)
    : null;
  const progress = progressResult && !progressResult.error ? normalizeAlphaProgressSnapshot(progressResult.data) : null;

  return jsonResponse({
    ok: true,
    data: {
      userId: access.userId,
      hasAccess: refreshed.ok ? refreshed.hasAccess : false,
      termsAccepted: refreshed.ok ? refreshed.termsAccepted : false,
      termsVersion: refreshed.ok ? refreshed.termsVersion : state.termsVersion,
      progress: progress
        ? {
          authority: progress.authority,
          userId: progress.userId,
          revision: progress.revision,
          sourceRequestId: progress.sourceRequestId,
          lastActionType: progress.lastActionType,
          updatedAt: progress.updatedAt,
        }
        : null,
      alpha: {
        noRealValue: true,
        allowlistRequired: true,
        termsRequired: true,
        ugc: "curated",
      },
      unity: {
        engine: "unity-webgl",
        roomKey: UNITY_ROOM_KEY,
        roomMode: "single-shared-room",
        roomCapacity: 25,
        sharedPetKey: UNITY_SHARED_PET_KEY,
        realtimeAuthority: "ugs-distributed-authority",
        stateAuthority: "ugs-cloud-save",
      },
    },
  });
});
