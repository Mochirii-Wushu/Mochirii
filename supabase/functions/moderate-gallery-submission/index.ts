import { withProtectedCors } from "../_shared/cors.ts";
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
const VALID_ACTIONS = new Set(["approved", "rejected"]);
const INSTAGRAM_SUPPORTED_MIME_TYPES = new Set(["image/jpeg"]);

function buildInstagramCaption(submission: JsonRecord): string {
  const title = safeString(submission.title, 80);
  const caption = safeString(submission.caption, 300);
  const parts = [title, caption, "Shared from the Mōchirīī guild gallery."].filter(Boolean);
  return parts.join("\n\n").slice(0, 2200);
}

function buildInstagramAltText(submission: JsonRecord): string {
  const title = safeString(submission.title, 80) || "Member gallery image";
  return `Mōchirīī guild gallery submission: ${title}`.slice(0, 1000);
}

Deno.serve((req: Request) => withProtectedCors(req, handleRequest(req)));

async function handleRequest(req: Request): Promise<Response> {
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

  const submissionId = safeString(bodyResult.body.submission_id, 80);
  const action = safeString(bodyResult.body.action, 20);
  const rawReason = safeString(bodyResult.body.reason, 500);

  if (!submissionId || !UUID_RE.test(submissionId)) {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_submission_id",
        message: "A valid submission id is required.",
      },
      400,
    );
  }

  if (!action || !VALID_ACTIONS.has(action)) {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_action",
        message: "Moderation action must be approved or rejected.",
      },
      400,
    );
  }

  const rejectionReason = action === "rejected" ? rawReason || "Rejected by moderator." : null;
  const reviewedAt = new Date().toISOString();

  const { data: updatedSubmission, error: updateError } = await access.adminClient
    .from("gallery_submissions")
    .update({
      status: action,
      reviewed_by: access.userId,
      reviewed_at: reviewedAt,
      rejection_reason: rejectionReason,
    })
    .eq("id", submissionId)
    .eq("status", "pending")
    .select("id,status,reviewed_by,reviewed_at,rejection_reason,title,caption,mime_type,instagram_opt_in")
    .maybeSingle();

  if (updateError) {
    console.error("moderate-gallery-submission update failed", {
      code: updateError.code,
      message: updateError.message,
    });

    return jsonResponse(
      {
        ok: false,
        error: "submission_update_failed",
        message: "The gallery submission could not be moderated.",
      },
      500,
    );
  }

  if (!updatedSubmission) {
    return jsonResponse(
      {
        ok: false,
        error: "submission_not_pending",
        message: "This gallery submission is no longer pending or could not be found.",
      },
      409,
    );
  }

  const { error: eventError } = await access.adminClient
    .from("gallery_moderation_events")
    .insert({
      submission_id: submissionId,
      moderator_id: access.userId,
      action,
      reason: rejectionReason,
    });

  if (eventError) {
    console.error("moderate-gallery-submission event insert failed", {
      code: eventError.code,
      message: eventError.message,
      submissionId,
    });

    return jsonResponse(
      {
        ok: false,
        error: "moderation_event_failed",
        message: "The submission was updated, but the moderation audit event could not be recorded.",
      },
      500,
    );
  }

  let instagramJob: JsonRecord | null = null;
  if (action === "approved" && updatedSubmission.instagram_opt_in === true) {
    const mimeType = safeString(updatedSubmission.mime_type, 80);
    const isEligible = Boolean(mimeType && INSTAGRAM_SUPPORTED_MIME_TYPES.has(mimeType));
    const instagramStatus = isEligible ? "queued" : "ineligible";
    const eligibilityReason = isEligible ? null : "Instagram v1 publishing supports JPEG images only.";

    const { data: jobData, error: jobError } = await access.adminClient
      .from("gallery_instagram_publish_jobs")
      .insert({
        submission_id: submissionId,
        status: instagramStatus,
        eligibility_reason: eligibilityReason,
        caption: buildInstagramCaption(updatedSubmission as JsonRecord),
        alt_text: buildInstagramAltText(updatedSubmission as JsonRecord),
        queued_by: access.userId,
      })
      .select("id,status,eligibility_reason,created_at")
      .maybeSingle();

    if (jobError || !jobData) {
      console.error("moderate-gallery-submission instagram job insert failed", {
        code: jobError?.code,
        message: jobError?.message || "Missing inserted Instagram job",
        submissionId,
      });

      return jsonResponse(
        {
          ok: false,
          error: "instagram_job_failed",
          message: "The submission was approved, but the Instagram publishing job could not be queued.",
        },
        500,
      );
    }

    instagramJob = jobData as JsonRecord;

    const { error: instagramEventError } = await access.adminClient
      .from("gallery_instagram_publish_events")
      .insert({
        job_id: safeString(instagramJob.id, 80),
        submission_id: submissionId,
        actor_id: access.userId,
        action: instagramStatus,
        details: {
          reason: eligibilityReason,
          mime_type: mimeType,
        },
      });

    if (instagramEventError) {
      console.error("moderate-gallery-submission instagram event insert failed", {
        code: instagramEventError.code,
        message: instagramEventError.message,
        submissionId,
      });

      return jsonResponse(
        {
          ok: false,
          error: "instagram_event_failed",
          message: "The submission was approved, but the Instagram publishing audit event could not be recorded.",
        },
        500,
      );
    }
  }

  return jsonResponse({
    ok: true,
    data: {
      submission: updatedSubmission,
      action,
      reviewedAt,
      instagramJob,
    },
    message: action === "approved" ? "Submission approved for a future publishing step." : "Submission declined.",
  });
}
