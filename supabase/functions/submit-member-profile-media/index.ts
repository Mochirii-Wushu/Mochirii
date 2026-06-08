import "@supabase/functions-js/edge-runtime.d.ts";
import {
  jsonResponse,
  normalizedMime,
  PROFILE_MEDIA_BUCKET,
  PROFILE_MEDIA_LIMITS,
  profileImageKind,
  readJsonBody,
  requireActiveMember,
  safeString,
} from "../_shared/member-profiles.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: jsonResponse({}).headers });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);

  const access = await requireActiveMember(req);
  if (!access.ok) return access.response;

  const bodyResult = await readJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;

  const kind = profileImageKind(bodyResult.body.kind);
  const storageBucket = safeString(bodyResult.body.storageBucket, 80);
  const storagePath = safeString(bodyResult.body.storagePath, 500);
  const mimeType = normalizedMime(bodyResult.body.mimeType);
  const sizeBytes = Number(bodyResult.body.sizeBytes);
  const originalFilename = safeString(bodyResult.body.originalFilename, 255);

  if (!kind) return jsonResponse({ ok: false, error: "invalid_kind", message: "Choose avatar or banner." }, 400);
  if (storageBucket !== PROFILE_MEDIA_BUCKET || !storagePath?.startsWith(`${access.userId}/`)) {
    return jsonResponse({ ok: false, error: "invalid_storage_path", message: "Profile media must be uploaded to your own private profile folder." }, 400);
  }
  if (!mimeType || !Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > PROFILE_MEDIA_LIMITS[kind]) {
    return jsonResponse({ ok: false, error: "invalid_media", message: "Upload a JPEG, PNG, or WebP image within the profile media size limit." }, 400);
  }

  const { data, error } = await access.adminClient
    .from("member_profile_media")
    .insert({
      user_id: access.userId,
      storage_bucket: storageBucket,
      storage_path: storagePath,
      original_filename: originalFilename,
      media_kind: kind,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      status: "pending",
    })
    .select("*")
    .maybeSingle();

  if (error || !data) {
    console.error("submit-member-profile-media insert failed", { code: error?.code, message: error?.message });
    return jsonResponse({ ok: false, error: "media_insert_failed", message: "Profile media could not be queued." }, 500);
  }

  await access.adminClient.from("member_profile_media_events").insert({
    media_id: data.id,
    actor_id: access.userId,
    action: "submitted",
  });

  return jsonResponse({ ok: true, message: "Profile image sent for moderator review.", data: { media: data } });
});
