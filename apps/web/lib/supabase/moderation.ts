import { invokeEdgeFunction } from "./client";
import {
  failedResult,
  type GalleryReviewQueue,
  type InstagramApiStatus,
  type InstagramPublishQueue,
  type InstagramPublishJob,
  type MemberVerificationReviewResponse,
  type ModerationStatus,
} from "./types";

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

export async function reviewMemberVerification({
  userId,
  action,
  method = "manual_review",
  reason = "",
  expiresAt = "",
}: {
  userId: string;
  action: "approve" | "reject" | "revoke";
  method?: string;
  reason?: string;
  expiresAt?: string;
}) {
  const cleanUserId = String(userId || "").trim();
  const cleanAction = String(action || "").trim().toLowerCase();
  if (!cleanUserId) return failedResult("Choose a member before reviewing verification.");
  if (!["approve", "reject", "revoke"].includes(cleanAction)) {
    return failedResult("Review action must be approve, reject, or revoke.");
  }

  return invokeEdgeFunction<MemberVerificationReviewResponse>("review-member-verification", {
    user_id: cleanUserId,
    action: cleanAction,
    method: String(method || "manual_review").trim().toLowerCase(),
    reason: String(reason || "").trim().slice(0, 500),
    expires_at: String(expiresAt || "").trim(),
  });
}

export async function listInstagramPublishQueue(options: { status?: string } = {}) {
  const status = String(options.status || "queued").trim().toLowerCase() || "queued";
  return invokeEdgeFunction<InstagramPublishQueue>("list-instagram-publish-queue", { status });
}

export async function checkInstagramApiStatus() {
  return invokeEdgeFunction<InstagramApiStatus>("check-instagram-api-status", {});
}

export async function publishInstagramGallerySubmission({
  jobId,
  caption,
  altText,
  confirmPublish,
}: {
  jobId: string;
  caption: string;
  altText?: string;
  confirmPublish: boolean;
}) {
  const cleanJobId = String(jobId || "").trim();
  if (!cleanJobId) return failedResult("Choose an Instagram publishing job before publishing.");
  if (!confirmPublish) return failedResult("Confirm Instagram publishing before posting.");

  return invokeEdgeFunction<{ job?: InstagramPublishJob; instagramMediaId?: string; instagramPermalink?: string; publishedAt?: string }>(
    "publish-instagram-gallery-submission",
    {
      job_id: cleanJobId,
      caption: String(caption || "").trim().slice(0, 2200),
      alt_text: String(altText || "").trim().slice(0, 1000),
      confirmPublish,
    },
  );
}

export async function markInstagramGallerySubmissionShared({
  jobId,
  instagramPermalink = "",
  moderatorNote = "",
  confirmManualShare,
}: {
  jobId: string;
  instagramPermalink?: string;
  moderatorNote?: string;
  confirmManualShare: boolean;
}) {
  const cleanJobId = String(jobId || "").trim();
  if (!cleanJobId) return failedResult("Choose an Instagram publishing job before marking it shared.");
  if (!confirmManualShare) return failedResult("Confirm manual Instagram sharing before marking the job shared.");

  return invokeEdgeFunction<{ job?: InstagramPublishJob; instagramPermalink?: string | null; sharedAt?: string }>(
    "mark-instagram-gallery-submission-shared",
    {
      job_id: cleanJobId,
      instagram_permalink: String(instagramPermalink || "").trim().slice(0, 500),
      moderator_note: String(moderatorNote || "").trim().slice(0, 500),
      confirmManualShare,
    },
  );
}
