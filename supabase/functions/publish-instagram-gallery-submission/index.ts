import "@supabase/functions-js/edge-runtime.d.ts";
import {
  CORS_HEADERS,
  type JsonRecord,
  jsonResponse,
  readRequiredJsonBody,
  requireModeratorAccess,
  safeString,
} from "../_shared/gallery-moderation.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MEMBER_GALLERY_BUCKET = "member-gallery";
const SIGNED_URL_SECONDS = 60 * 60;
const PUBLISHABLE_STATUSES = new Set(["queued", "failed"]);

function cleanCaption(value: unknown): string {
  return (safeString(value, 2200) || "Shared from the Mōchirīī guild gallery.").slice(0, 2200);
}

function cleanAltText(value: unknown): string | null {
  return safeString(value, 1000);
}

function metaBaseUrl(): string {
  return (Deno.env.get("INSTAGRAM_API_BASE_URL") || "https://graph.instagram.com").replace(/\/+$/, "");
}

function metaUrl(path: string): string {
  const version = Deno.env.get("INSTAGRAM_API_VERSION") || "";
  if (!version) return "";
  return `${metaBaseUrl()}/${version.replace(/^\/+|\/+$/g, "")}/${path.replace(/^\/+/, "")}`;
}

function configuredInstagram() {
  const accountId = Deno.env.get("INSTAGRAM_ACCOUNT_ID") || "";
  const accessToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN") || "";
  const apiVersion = Deno.env.get("INSTAGRAM_API_VERSION") || "";
  const configured = Boolean(accountId && accessToken && apiVersion);
  return { accountId, accessToken, apiVersion, configured };
}

async function readMetaJson(response: Response): Promise<JsonRecord> {
  try {
    const parsed = await response.json();
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : {};
  } catch {
    return {};
  }
}

function metaErrorMessage(body: JsonRecord, fallback: string): string {
  const error = body.error && typeof body.error === "object" && !Array.isArray(body.error)
    ? body.error as JsonRecord
    : {};
  return (
    safeString(error.message, 300) ||
    safeString(body.message, 300) ||
    fallback
  );
}

async function recordEvent(
  adminClient: any,
  values: JsonRecord,
) {
  const { error } = await adminClient.from("gallery_instagram_publish_events").insert(values);
  if (error) {
    console.error("publish-instagram-gallery-submission event insert failed", {
      code: error.code,
      message: error.message,
      action: values.action,
      jobId: values.job_id,
    });
  }
}

async function failJob(
  adminClient: any,
  {
    jobId,
    submissionId,
    actorId,
    message,
  }: {
    jobId: string;
    submissionId: string;
    actorId: string;
    message: string;
  },
) {
  const cleanMessage = safeString(message, 500) || "Instagram publishing failed.";
  const { error } = await adminClient
    .from("gallery_instagram_publish_jobs")
    .update({
      status: "failed",
      last_error: cleanMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    console.error("publish-instagram-gallery-submission job failure update failed", {
      code: error.code,
      message: error.message,
      jobId,
    });
  }

  await recordEvent(adminClient, {
    job_id: jobId,
    submission_id: submissionId,
    actor_id: actorId,
    action: "failed",
    details: { message: cleanMessage },
  });

  return jsonResponse(
    {
      ok: false,
      error: "instagram_publish_failed",
      message: cleanMessage,
    },
    502,
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed." }, 405);
  }

  const access = await requireModeratorAccess(req);
  if (!access.ok) return access.response;

  const bodyResult = await readRequiredJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;

  const jobId = safeString(bodyResult.body.job_id, 80);
  const caption = cleanCaption(bodyResult.body.caption);
  const altText = cleanAltText(bodyResult.body.alt_text);
  const confirmPublish = bodyResult.body.confirmPublish === true;

  if (!jobId || !UUID_RE.test(jobId)) {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_job_id",
        message: "A valid Instagram publishing job id is required.",
      },
      400,
    );
  }

  if (!confirmPublish) {
    return jsonResponse(
      {
        ok: false,
        error: "publish_confirmation_required",
        message: "Confirm Instagram publishing before posting.",
      },
      400,
    );
  }

  const instagram = configuredInstagram();
  if (!instagram.configured) {
    console.error("publish-instagram-gallery-submission missing Instagram configuration", {
      hasAccountId: Boolean(instagram.accountId),
      hasAccessToken: Boolean(instagram.accessToken),
      hasApiVersion: Boolean(instagram.apiVersion),
    });

    return jsonResponse(
      {
        ok: false,
        error: "instagram_not_configured",
        message: "Instagram publishing is not configured yet.",
      },
      500,
    );
  }

  const { data: jobData, error: jobLookupError } = await access.adminClient
    .from("gallery_instagram_publish_jobs")
    .select("id,submission_id,status,attempt_count")
    .eq("id", jobId)
    .maybeSingle();

  if (jobLookupError) {
    console.error("publish-instagram-gallery-submission job lookup failed", {
      code: jobLookupError.code,
      message: jobLookupError.message,
      jobId,
    });

    return jsonResponse(
      {
        ok: false,
        error: "instagram_job_lookup_failed",
        message: "Instagram publishing job could not be loaded.",
      },
      500,
    );
  }

  const job = jobData as JsonRecord | null;
  const submissionId = safeString(job?.submission_id, 80) || "";
  const currentStatus = safeString(job?.status, 40) || "";

  if (!job || !submissionId) {
    return jsonResponse(
      {
        ok: false,
        error: "instagram_job_not_found",
        message: "Instagram publishing job was not found.",
      },
      404,
    );
  }

  if (!PUBLISHABLE_STATUSES.has(currentStatus)) {
    return jsonResponse(
      {
        ok: false,
        error: "instagram_job_not_publishable",
        message: "Only queued or failed Instagram jobs can be published.",
      },
      409,
    );
  }

  const attemptCount = Number(job.attempt_count || 0) + 1;
  const { data: lockedJob, error: lockError } = await access.adminClient
    .from("gallery_instagram_publish_jobs")
    .update({
      status: "publishing",
      caption,
      alt_text: altText,
      last_error: null,
      attempt_count: attemptCount,
    })
    .eq("id", jobId)
    .eq("status", currentStatus)
    .select("id,status,submission_id")
    .maybeSingle();

  if (lockError) {
    console.error("publish-instagram-gallery-submission lock failed", {
      code: lockError.code,
      message: lockError.message,
      jobId,
    });

    return jsonResponse(
      {
        ok: false,
        error: "instagram_job_lock_failed",
        message: "Instagram publishing job could not be locked.",
      },
      500,
    );
  }

  if (!lockedJob) {
    return jsonResponse(
      {
        ok: false,
        error: "instagram_job_already_changed",
        message: "Instagram publishing job changed before it could be published.",
      },
      409,
    );
  }

  await recordEvent(access.adminClient, {
    job_id: jobId,
    submission_id: submissionId,
    actor_id: access.userId,
    action: currentStatus === "failed" ? "retry" : "publishing",
    details: { attempt_count: attemptCount },
  });

  const { data: submissionData, error: submissionError } = await access.adminClient
    .from("gallery_submissions")
    .select("id,status,storage_bucket,storage_path,mime_type,instagram_opt_in")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError) {
    console.error("publish-instagram-gallery-submission submission lookup failed", {
      code: submissionError.code,
      message: submissionError.message,
      submissionId,
    });

    return failJob(access.adminClient, {
      jobId,
      submissionId,
      actorId: access.userId,
      message: "Instagram submission could not be loaded.",
    });
  }

  const submission = submissionData as JsonRecord | null;
  const bucket = safeString(submission?.storage_bucket, 80) || MEMBER_GALLERY_BUCKET;
  const storagePath = safeString(submission?.storage_path, 1000);

  if (
    !submission ||
    safeString(submission.status, 40) !== "approved" ||
    submission.instagram_opt_in !== true ||
    safeString(submission.mime_type, 80) !== "image/jpeg" ||
    bucket !== MEMBER_GALLERY_BUCKET ||
    !storagePath
  ) {
    return failJob(access.adminClient, {
      jobId,
      submissionId,
      actorId: access.userId,
      message: "This image is not eligible for Instagram publishing.",
    });
  }

  const { data: signedData, error: signedError } = await access.adminClient.storage
    .from(bucket)
    .createSignedUrl(storagePath, SIGNED_URL_SECONDS);

  if (signedError || !signedData?.signedUrl) {
    console.error("publish-instagram-gallery-submission signed URL failed", {
      message: signedError?.message || "Missing signed URL",
      submissionId,
    });

    return failJob(access.adminClient, {
      jobId,
      submissionId,
      actorId: access.userId,
      message: "A temporary Instagram image URL could not be created.",
    });
  }

  const mediaUrl = metaUrl(`${encodeURIComponent(instagram.accountId)}/media`);
  const publishUrl = metaUrl(`${encodeURIComponent(instagram.accountId)}/media_publish`);
  if (!mediaUrl || !publishUrl) {
    return failJob(access.adminClient, {
      jobId,
      submissionId,
      actorId: access.userId,
      message: "Instagram API version is not configured.",
    });
  }

  const mediaParams = new URLSearchParams({
    image_url: signedData.signedUrl,
    caption,
    access_token: instagram.accessToken,
  });
  if (altText) mediaParams.set("alt_text", altText);

  const mediaResponse = await fetch(mediaUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: mediaParams,
  });
  const mediaBody = await readMetaJson(mediaResponse);
  const containerId = safeString(mediaBody.id, 120);

  if (!mediaResponse.ok || !containerId) {
    return failJob(access.adminClient, {
      jobId,
      submissionId,
      actorId: access.userId,
      message: metaErrorMessage(mediaBody, "Instagram media container could not be created."),
    });
  }

  await access.adminClient
    .from("gallery_instagram_publish_jobs")
    .update({ instagram_container_id: containerId })
    .eq("id", jobId);

  const statusUrl = metaUrl(`${encodeURIComponent(containerId)}?fields=status_code,status&access_token=${encodeURIComponent(instagram.accessToken)}`);
  if (statusUrl) {
    const statusResponse = await fetch(statusUrl);
    const statusBody = await readMetaJson(statusResponse);
    const statusCode = safeString(statusBody.status_code, 80);

    if (statusResponse.ok && statusCode && statusCode !== "FINISHED") {
      return failJob(access.adminClient, {
        jobId,
        submissionId,
        actorId: access.userId,
        message: `Instagram media container is not ready yet: ${statusCode}.`,
      });
    }
  }

  const publishParams = new URLSearchParams({
    creation_id: containerId,
    access_token: instagram.accessToken,
  });
  const publishResponse = await fetch(publishUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: publishParams,
  });
  const publishBody = await readMetaJson(publishResponse);
  const mediaId = safeString(publishBody.id, 120);

  if (!publishResponse.ok || !mediaId) {
    return failJob(access.adminClient, {
      jobId,
      submissionId,
      actorId: access.userId,
      message: metaErrorMessage(publishBody, "Instagram media could not be published."),
    });
  }

  let permalink: string | null = null;
  const permalinkUrl = metaUrl(`${encodeURIComponent(mediaId)}?fields=permalink&access_token=${encodeURIComponent(instagram.accessToken)}`);
  if (permalinkUrl) {
    const permalinkResponse = await fetch(permalinkUrl);
    const permalinkBody = await readMetaJson(permalinkResponse);
    if (permalinkResponse.ok) permalink = safeString(permalinkBody.permalink, 500);
  }

  const publishedAt = new Date().toISOString();
  const { data: publishedJob, error: publishedError } = await access.adminClient
    .from("gallery_instagram_publish_jobs")
    .update({
      status: "published",
      instagram_media_id: mediaId,
      instagram_permalink: permalink,
      published_by: access.userId,
      published_at: publishedAt,
      last_error: null,
    })
    .eq("id", jobId)
    .select("id,status,instagram_media_id,instagram_permalink,published_at")
    .maybeSingle();

  if (publishedError || !publishedJob) {
    console.error("publish-instagram-gallery-submission publish update failed", {
      code: publishedError?.code,
      message: publishedError?.message || "Missing updated job",
      jobId,
    });

    return jsonResponse(
      {
        ok: false,
        error: "instagram_publish_audit_failed",
        message: "Instagram published, but the local publishing record could not be updated.",
      },
      500,
    );
  }

  await recordEvent(access.adminClient, {
    job_id: jobId,
    submission_id: submissionId,
    actor_id: access.userId,
    action: "published",
    details: {
      instagram_media_id: mediaId,
      has_permalink: Boolean(permalink),
    },
  });

  return jsonResponse({
    ok: true,
    data: {
      job: publishedJob,
      instagramMediaId: mediaId,
      instagramPermalink: permalink,
      publishedAt,
    },
    message: "Image published to Instagram.",
  });
});
