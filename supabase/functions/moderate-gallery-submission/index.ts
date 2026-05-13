import "@supabase/functions-js/edge-runtime.d.ts";
import {
  CORS_HEADERS,
  jsonResponse,
  readRequiredJsonBody,
  requireModeratorAccess,
  safeString,
} from "../_shared/gallery-moderation.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_ACTIONS = new Set(["approved", "rejected"]);

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
    .select("id,status,reviewed_by,reviewed_at,rejection_reason")
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

  return jsonResponse({
    ok: true,
    data: {
      submission: updatedSubmission,
      action,
      reviewedAt,
    },
    message: action === "approved" ? "Submission approved for a future publishing step." : "Submission declined.",
  });
});
