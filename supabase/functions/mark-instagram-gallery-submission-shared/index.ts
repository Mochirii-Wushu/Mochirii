import "@supabase/functions-js/edge-runtime.d.ts";
import {
  CORS_HEADERS,
  type JsonRecord,
  jsonResponse,
  readRequiredJsonBody,
  requireModeratorAccess,
  safeString,
} from "../_shared/gallery-moderation.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

function cleanPermalink(value: unknown): string | null {
  const link = safeString(value, 500);
  if (!link) return null;

  try {
    const url = new URL(link);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function cleanNote(value: unknown): string | null {
  return safeString(value, 500);
}

async function recordEvent(adminClient: any, values: JsonRecord) {
  const { error } = await adminClient.from("gallery_instagram_publish_events").insert(values);
  if (error) {
    console.error("mark-instagram-gallery-submission-shared event insert failed", {
      code: error.code,
      message: error.message,
      action: values.action,
      jobId: values.job_id,
    });
  }
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
  const instagramPermalink = cleanPermalink(bodyResult.body.instagram_permalink);
  const moderatorNote = cleanNote(bodyResult.body.moderator_note);
  const confirmManualShare = bodyResult.body.confirmManualShare === true;

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

  if (bodyResult.body.instagram_permalink && !instagramPermalink) {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_instagram_permalink",
        message: "Use a valid Instagram post link or leave the permalink blank.",
      },
      400,
    );
  }

  if (!confirmManualShare) {
    return jsonResponse(
      {
        ok: false,
        error: "manual_share_confirmation_required",
        message: "Confirm manual Instagram sharing before marking the job shared.",
      },
      400,
    );
  }

  const { data: jobData, error: jobLookupError } = await access.adminClient
    .from("gallery_instagram_publish_jobs")
    .select("id,submission_id,status")
    .eq("id", jobId)
    .maybeSingle();

  if (jobLookupError) {
    console.error("mark-instagram-gallery-submission-shared job lookup failed", {
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

  if (currentStatus !== "queued") {
    return jsonResponse(
      {
        ok: false,
        error: "instagram_job_not_shareable",
        message: "Only queued Instagram jobs can be marked shared manually.",
      },
      409,
    );
  }

  const { data: submissionData, error: submissionError } = await access.adminClient
    .from("gallery_submissions")
    .select("id,status,instagram_opt_in")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError) {
    console.error("mark-instagram-gallery-submission-shared submission lookup failed", {
      code: submissionError.code,
      message: submissionError.message,
      submissionId,
    });

    return jsonResponse(
      {
        ok: false,
        error: "instagram_submission_lookup_failed",
        message: "Instagram submission details could not be loaded.",
      },
      500,
    );
  }

  const submission = submissionData as JsonRecord | null;
  if (!submission || safeString(submission.status, 40) !== "approved" || submission.instagram_opt_in !== true) {
    return jsonResponse(
      {
        ok: false,
        error: "instagram_job_not_eligible",
        message: "Only approved, opted-in submissions can be marked shared manually.",
      },
      409,
    );
  }

  const sharedAt = new Date().toISOString();
  const { data: sharedJob, error: updateError } = await access.adminClient
    .from("gallery_instagram_publish_jobs")
    .update({
      status: "shared_manually",
      instagram_permalink: instagramPermalink,
      published_by: access.userId,
      published_at: sharedAt,
      last_error: null,
    })
    .eq("id", jobId)
    .eq("status", "queued")
    .select("id,status,instagram_permalink,published_at")
    .maybeSingle();

  if (updateError) {
    console.error("mark-instagram-gallery-submission-shared update failed", {
      code: updateError.code,
      message: updateError.message,
      jobId,
    });

    return jsonResponse(
      {
        ok: false,
        error: "manual_share_update_failed",
        message: "Instagram publishing job could not be marked shared.",
      },
      500,
    );
  }

  if (!sharedJob) {
    return jsonResponse(
      {
        ok: false,
        error: "instagram_job_already_changed",
        message: "Instagram publishing job changed before it could be marked shared.",
      },
      409,
    );
  }

  await recordEvent(access.adminClient, {
    job_id: jobId,
    submission_id: submissionId,
    actor_id: access.userId,
    action: "shared_manually",
    details: {
      has_permalink: Boolean(instagramPermalink),
      note: moderatorNote,
    },
  });

  return jsonResponse({
    ok: true,
    data: {
      job: sharedJob,
      instagramPermalink,
      sharedAt,
    },
    message: "Instagram job marked as shared manually.",
  });
});
