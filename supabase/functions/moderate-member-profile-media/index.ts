import "@supabase/functions-js/edge-runtime.d.ts";
import { requireModeratorAccess, readRequiredJsonBody, jsonResponse, asRecord } from "../_shared/gallery-moderation.ts";
import { profileImageKind, safeString } from "../_shared/member-profiles.ts";

function actionValue(value: unknown): "approved" | "rejected" | null {
  const action = safeString(value, 20)?.toLowerCase();
  return action === "approved" || action === "rejected" ? action : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: jsonResponse({}).headers });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);

  const access = await requireModeratorAccess(req);
  if (!access.ok) return access.response;

  const bodyResult = await readRequiredJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;

  const mediaId = safeString(bodyResult.body.media_id, 80);
  const action = actionValue(bodyResult.body.action);
  const reason = safeString(bodyResult.body.reason, 500);

  if (!mediaId || !action) return jsonResponse({ ok: false, error: "invalid_request", message: "Choose pending profile media and an approve or reject action." }, 400);
  if (action === "rejected" && !reason) return jsonResponse({ ok: false, error: "reason_required", message: "Add a decline reason before rejecting profile media." }, 400);

  const { data: mediaData, error: mediaError } = await access.adminClient
    .from("member_profile_media")
    .select("*")
    .eq("id", mediaId)
    .eq("status", "pending")
    .maybeSingle();

  if (mediaError) {
    console.error("moderate-member-profile-media lookup failed", { code: mediaError.code, message: mediaError.message });
    return jsonResponse({ ok: false, error: "media_lookup_failed", message: "Profile media could not be loaded." }, 500);
  }

  const media = asRecord(mediaData);
  const kind = profileImageKind(media.media_kind);
  const userId = safeString(media.user_id, 80);
  if (!mediaData || !kind || !userId) return jsonResponse({ ok: false, error: "media_not_pending", message: "That profile media is no longer pending." }, 409);

  const { data: updatedMedia, error: updateError } = await access.adminClient
    .from("member_profile_media")
    .update({
      status: action,
      rejection_reason: action === "rejected" ? reason : null,
      reviewed_by: access.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", mediaId)
    .select("*")
    .maybeSingle();

  if (updateError || !updatedMedia) {
    console.error("moderate-member-profile-media update failed", { code: updateError?.code, message: updateError?.message });
    return jsonResponse({ ok: false, error: "media_update_failed", message: "Profile media could not be moderated." }, 500);
  }

  if (action === "approved") {
    await access.adminClient
      .from("member_profile_media")
      .update({ status: "archived" })
      .eq("user_id", userId)
      .eq("media_kind", kind)
      .eq("status", "approved")
      .neq("id", mediaId);

    await access.adminClient
      .from("member_profiles")
      .update(kind === "avatar" ? { approved_avatar_media_id: mediaId } : { approved_banner_media_id: mediaId })
      .eq("id", userId);
  }

  await access.adminClient.from("member_profile_media_events").insert({
    media_id: mediaId,
    actor_id: access.userId,
    action,
    reason: action === "rejected" ? reason : null,
  });

  return jsonResponse({
    ok: true,
    message: action === "approved" ? "Profile image approved." : "Profile image declined.",
    data: { media: updatedMedia },
  });
});
