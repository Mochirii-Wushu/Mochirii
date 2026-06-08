import "@supabase/functions-js/edge-runtime.d.ts";
import { requireModeratorAccess, readOptionalJsonBody, jsonResponse, asRecord, asStringArray } from "../_shared/gallery-moderation.ts";
import { PROFILE_MEDIA_BUCKET, PROFILE_MEDIA_SIGNED_URL_SECONDS, safeString } from "../_shared/member-profiles.ts";

function statusFilter(value: unknown): string {
  const status = safeString(value, 20)?.toLowerCase() || "pending";
  return ["pending", "approved", "rejected", "archived", "all"].includes(status) ? status : "pending";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: jsonResponse({}).headers });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);

  const access = await requireModeratorAccess(req);
  if (!access.ok) return access.response;

  const bodyResult = await readOptionalJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;
  const status = statusFilter(bodyResult.body.status);

  let query = access.adminClient
    .from("member_profile_media")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    console.error("list-member-profile-media-queue lookup failed", { code: error.code, message: error.message });
    return jsonResponse({ ok: false, error: "media_queue_lookup_failed", message: "Profile media queue could not be loaded." }, 500);
  }

  const rows = Array.isArray(data) ? data.map(asRecord) : [];
  const { data: summaryData } = await access.adminClient
    .from("member_profile_media")
    .select("status")
    .limit(1000);
  const userIds = [...new Set(rows.map((row) => safeString(row.user_id, 80)).filter(Boolean))] as string[];
  const { data: profileData } = userIds.length
    ? await access.adminClient
      .from("member_profiles")
      .select("id,display_name,discord_username,discord_global_name,profile_slug")
      .in("id", userIds)
    : { data: [] };
  const profiles = new Map((Array.isArray(profileData) ? profileData : []).map((profile) => {
    const record = asRecord(profile);
    return [String(record.id || ""), record];
  }));

  const media = await Promise.all(rows.map(async (row) => {
    const storagePath = safeString(row.storage_path, 500);
    let signedPreviewUrl: string | null = null;
    if (storagePath) {
      const { data: signed, error: signedError } = await access.adminClient.storage
        .from(PROFILE_MEDIA_BUCKET)
        .createSignedUrl(storagePath, PROFILE_MEDIA_SIGNED_URL_SECONDS);
      if (!signedError) signedPreviewUrl = signed?.signedUrl || null;
    }
    const userId = safeString(row.user_id, 80) || "";
    const profile = profiles.get(userId) || {};
    return {
      id: row.id,
      status: row.status,
      kind: row.media_kind,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      originalFilename: row.original_filename,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
      rejectionReason: row.rejection_reason,
      storagePath,
      signedPreviewUrl,
      uploader: {
        displayName: profile.display_name,
        discordUsername: profile.discord_username,
        discordGlobalName: profile.discord_global_name,
        profileSlug: profile.profile_slug,
      },
    };
  }));

  const summaryRows = Array.isArray(summaryData) ? summaryData.map(asRecord) : rows;
  const summary = summaryRows.reduce((memo: Record<string, number>, row) => {
    const key = String(row.status || "pending");
    memo[key] = (memo[key] || 0) + 1;
    memo.total = (memo.total || 0) + 1;
    return memo;
  }, { total: 0 });

  return jsonResponse({
    ok: true,
    data: {
      media,
      count: media.length,
      status,
      summary,
      signedUrlSeconds: PROFILE_MEDIA_SIGNED_URL_SECONDS,
      moderatorRoles: asStringArray(access.roleIds),
    },
  });
});
