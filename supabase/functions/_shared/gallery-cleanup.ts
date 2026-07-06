export const MEMBER_GALLERY_BUCKET = "member-gallery";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CleanupRequestInput = Record<string, unknown>;

export type RejectedGalleryCleanupRequest =
  | { ok: true; submissionId: string }
  | { ok: false; status: number; error: string; message: string };

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function normalizeRejectedGalleryCleanupRequest(body: CleanupRequestInput): RejectedGalleryCleanupRequest {
  const submissionId = cleanText(body.submission_id, 80);
  const confirmed = body.confirm_cleanup === true;

  if (!submissionId || !UUID_RE.test(submissionId)) {
    return {
      ok: false,
      status: 400,
      error: "invalid_submission_id",
      message: "A valid rejected submission id is required.",
    };
  }

  if (!confirmed) {
    return {
      ok: false,
      status: 400,
      error: "cleanup_not_confirmed",
      message: "Confirm cleanup before deleting a rejected submission.",
    };
  }

  return { ok: true, submissionId };
}

export function isSafeMemberGalleryObject(bucket: unknown, storagePath: unknown, userId: unknown): boolean {
  const cleanBucket = cleanText(bucket, 80);
  const cleanPath = cleanText(storagePath, 1000);
  const cleanUserId = cleanText(userId, 80);

  if (cleanBucket !== MEMBER_GALLERY_BUCKET || !cleanPath || !cleanUserId) return false;
  if (!UUID_RE.test(cleanUserId)) return false;
  if (cleanPath.startsWith("/") || cleanPath.endsWith("/") || cleanPath.includes("..") || cleanPath.includes("//")) {
    return false;
  }

  return cleanPath.startsWith(`${cleanUserId}/`);
}
