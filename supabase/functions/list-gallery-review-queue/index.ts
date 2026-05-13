import "@supabase/functions-js/edge-runtime.d.ts";
import {
  CORS_HEADERS,
  type JsonRecord,
  jsonResponse,
  readOptionalJsonBody,
  requireModeratorAccess,
  safeString,
} from "../_shared/gallery-moderation.ts";

const SIGNED_URL_SECONDS = 10 * 60;
const QUEUE_LIMIT = 50;
const MEMBER_GALLERY_BUCKET = "member-gallery";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed." }, 405);
  }

  const access = await requireModeratorAccess(req);
  if (!access.ok) return access.response;

  const bodyResult = await readOptionalJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;

  if (bodyResult.body.checkOnly === true) {
    return jsonResponse({
      ok: true,
      hasAccess: true,
      data: {
        hasAccess: true,
        moderatorId: access.userId,
      },
      message: "Moderator access verified.",
    });
  }

  const { data: submissionData, error: submissionError } = await access.adminClient
    .from("gallery_submissions")
    .select("id,user_id,storage_bucket,storage_path,original_filename,mime_type,size_bytes,title,caption,category,created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(QUEUE_LIMIT);

  if (submissionError) {
    console.error("list-gallery-review-queue submission lookup failed", {
      code: submissionError.code,
      message: submissionError.message,
    });

    return jsonResponse(
      {
        ok: false,
        error: "submission_lookup_failed",
        message: "Pending gallery submissions could not be loaded.",
      },
      500,
    );
  }

  const submissions = Array.isArray(submissionData) ? submissionData as JsonRecord[] : [];
  const userIds = [
    ...new Set(
      submissions
        .map((submission) => safeString(submission.user_id, 80))
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const profilesById = new Map<string, JsonRecord>();

  if (userIds.length > 0) {
    const { data: profileData, error: profileError } = await access.adminClient
      .from("member_profiles")
      .select("id,display_name,discord_username,discord_global_name,discord_user_id")
      .in("id", userIds);

    if (profileError) {
      console.error("list-gallery-review-queue profile lookup failed", {
        code: profileError.code,
        message: profileError.message,
      });

      return jsonResponse(
        {
          ok: false,
          error: "profile_lookup_failed",
          message: "Uploader profile details could not be loaded.",
        },
        500,
      );
    }

    (Array.isArray(profileData) ? profileData as JsonRecord[] : []).forEach((profile) => {
      const id = safeString(profile.id, 80);
      if (id) profilesById.set(id, profile);
    });
  }

  const queue = [];

  for (const submission of submissions) {
    const bucket = safeString(submission.storage_bucket, 80) || MEMBER_GALLERY_BUCKET;
    const storagePath = safeString(submission.storage_path, 1000);

    if (bucket !== MEMBER_GALLERY_BUCKET || !storagePath) {
      console.warn("list-gallery-review-queue skipped invalid storage reference", {
        submissionId: safeString(submission.id, 80),
        bucket,
        hasStoragePath: Boolean(storagePath),
      });
      continue;
    }

    const { data: signedData, error: signedError } = await access.adminClient.storage
      .from(bucket)
      .createSignedUrl(storagePath, SIGNED_URL_SECONDS);

    if (signedError || !signedData?.signedUrl) {
      console.error("list-gallery-review-queue signed URL creation failed", {
        submissionId: safeString(submission.id, 80),
        message: signedError?.message || "Missing signed URL",
      });

      return jsonResponse(
        {
          ok: false,
          error: "signed_url_failed",
          message: "A pending image preview could not be prepared.",
        },
        500,
      );
    }

    const userId = safeString(submission.user_id, 80) || "";
    const profile = profilesById.get(userId) || {};

    queue.push({
      id: safeString(submission.id, 80),
      uploader: {
        displayName: safeString(profile.display_name, 40) || "Mochirii Member",
        discordUsername: safeString(profile.discord_username, 80),
        discordGlobalName: safeString(profile.discord_global_name, 100),
        discordUserId: safeString(profile.discord_user_id, 40),
      },
      title: safeString(submission.title, 80),
      caption: safeString(submission.caption, 300),
      category: safeString(submission.category, 40),
      originalFilename: safeString(submission.original_filename, 255),
      mimeType: safeString(submission.mime_type, 80),
      sizeBytes: Number(submission.size_bytes || 0),
      createdAt: safeString(submission.created_at, 80),
      signedPreviewUrl: signedData.signedUrl,
    });
  }

  return jsonResponse({
    ok: true,
    data: {
      submissions: queue,
      count: queue.length,
      signedUrlSeconds: SIGNED_URL_SECONDS,
    },
    message: queue.length ? "Pending gallery submissions loaded." : "No pending gallery submissions.",
  });
});
