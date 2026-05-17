import { invokeEdgeFunction } from "./client";
import { failedResult, type GalleryReviewQueue, type ModerationStatus } from "./types";

export async function checkLeaderGalleryModerationAccess() {
  return invokeEdgeFunction<{ hasAccess?: boolean; moderatorId?: string }>("list-gallery-review-queue", {
    checkOnly: true,
  });
}

export async function listGalleryReviewQueue(options: { status?: ModerationStatus | string } = {}) {
  const status = String(options.status || "pending").trim().toLowerCase() || "pending";
  return invokeEdgeFunction<GalleryReviewQueue>("list-gallery-review-queue", { status });
}

export async function moderateGallerySubmission(submissionId: string, action: string, reason = "") {
  const cleanSubmissionId = String(submissionId || "").trim();
  const cleanAction = String(action || "").trim().toLowerCase();
  if (!["approved", "rejected"].includes(cleanAction)) {
    return failedResult("Moderation action must be approved or rejected.");
  }
  if (!cleanSubmissionId) {
    return failedResult("Choose a gallery submission before moderating.");
  }

  return invokeEdgeFunction("moderate-gallery-submission", {
    submission_id: cleanSubmissionId,
    action: cleanAction,
    reason: String(reason || "").trim().slice(0, 500),
  });
}
