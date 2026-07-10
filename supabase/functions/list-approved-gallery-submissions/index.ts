import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { getServiceRoleKey } from "../_shared/supabase-service-role.ts";

type JsonRecord = Record<string, unknown>;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Cache-Control": "no-store",
};
const SIGNED_URL_SECONDS = 60 * 60;
const APPROVED_LIMIT = 80;
const MEMBER_GALLERY_BUCKET = "member-gallery";

function jsonResponse(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function safeString(value: unknown, maxLength: number): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = getServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("list-approved-gallery-submissions missing server configuration", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
    });

    return jsonResponse(
      {
        ok: false,
        error: "approved_gallery_not_configured",
        message: "Approved gallery feed is not configured yet.",
      },
      500,
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: submissionData, error: submissionError } = await adminClient
    .from("gallery_submissions")
    .select("id,user_id,storage_bucket,storage_path,original_filename,mime_type,size_bytes,title,caption,category,created_at,reviewed_at")
    .eq("status", "approved")
    .order("reviewed_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(APPROVED_LIMIT);

  if (submissionError) {
    console.error("list-approved-gallery-submissions lookup failed", {
      code: submissionError.code,
      message: submissionError.message,
    });

    return jsonResponse(
      {
        ok: false,
        error: "approved_submission_lookup_failed",
        message: "Approved gallery submissions could not be loaded.",
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
    const { data: profileData, error: profileError } = await adminClient
      .from("member_profiles")
      .select("id,display_name,discord_username,discord_global_name")
      .in("id", userIds);

    if (profileError) {
      console.error("list-approved-gallery-submissions profile lookup failed", {
        code: profileError.code,
        message: profileError.message,
      });
    } else {
      (Array.isArray(profileData) ? profileData as JsonRecord[] : []).forEach((profile) => {
        const id = safeString(profile.id, 80);
        if (id) profilesById.set(id, profile);
      });
    }
  }

  const approved = [];

  for (const submission of submissions) {
    const bucket = safeString(submission.storage_bucket, 80) || MEMBER_GALLERY_BUCKET;
    const storagePath = safeString(submission.storage_path, 1000);
    const id = safeString(submission.id, 80);

    if (bucket !== MEMBER_GALLERY_BUCKET || !storagePath) {
      console.warn("list-approved-gallery-submissions skipped invalid storage reference", {
        submissionId: id,
        bucket,
        hasStoragePath: Boolean(storagePath),
      });
      continue;
    }

    const { data: signedData, error: signedError } = await adminClient.storage
      .from(bucket)
      .createSignedUrl(storagePath, SIGNED_URL_SECONDS);

    const userId = safeString(submission.user_id, 80) || "";
    const profile = profilesById.get(userId) || {};
    const discordGlobalName = safeString(profile.discord_global_name, 100);
    const discordUsername = safeString(profile.discord_username, 80);
    const profileDisplayName = safeString(profile.display_name, 40);
    const uploaderDisplayName =
      discordGlobalName ||
      profileDisplayName ||
      discordUsername ||
      "Mochirii Member";
    const uploaderDiscordName =
      discordGlobalName ||
      discordUsername ||
      profileDisplayName ||
      "Mochirii Member";

    const item: JsonRecord = {
      id,
      title: safeString(submission.title, 80),
      caption: safeString(submission.caption, 300),
      category: safeString(submission.category, 40),
      mime_type: safeString(submission.mime_type, 80),
      size_bytes: Number(submission.size_bytes || 0),
      created_at: safeString(submission.created_at, 80),
      reviewed_at: safeString(submission.reviewed_at, 80),
      uploader_display_name: uploaderDisplayName,
      uploader_discord_name: uploaderDiscordName,
      signed_url: signedData?.signedUrl || null,
    };

    if (signedError || !signedData?.signedUrl) {
      console.warn("list-approved-gallery-submissions signed URL unavailable", {
        submissionId: id,
        message: signedError?.message || "Missing signed URL",
      });
      item.preview_error = "preview_unavailable";
    }

    approved.push(item);
  }

  return jsonResponse({
    ok: true,
    data: {
      submissions: approved,
      count: approved.length,
      signedUrlSeconds: SIGNED_URL_SECONDS,
    },
    message: approved.length ? "Approved gallery submissions loaded." : "No approved gallery submissions.",
  });
});
