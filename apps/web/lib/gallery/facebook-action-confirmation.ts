import { sha256Hex } from "./social-publication-confirmation.ts";
import {
  buildFacebookPagePublicationRequest,
  type FacebookPagePublicationRequest,
} from "./social-publication-request.ts";

type FacebookActionJob = {
  id?: unknown;
  status?: unknown;
  attemptCount?: unknown;
  updatedAt?: unknown;
};

export type FacebookReconciliationDraft = {
  resolution: "confirmed_published" | "confirmed_not_published" | "";
  note: string;
  facebookPhotoId: string;
  facebookPostId: string;
  facebookPermalink: string;
};

function clean(value: unknown, maximumLength: number): string {
  return String(value ?? "").normalize("NFC").trim().slice(0, maximumLength);
}

function jobState(job: FacebookActionJob) {
  const attemptCount = Number(job.attemptCount);
  return [
    clean(job.id, 80).toLowerCase(),
    clean(job.status, 40).toLowerCase(),
    Number.isSafeInteger(attemptCount) && attemptCount >= 0 ? attemptCount : -1,
    clean(job.updatedAt, 80),
  ] as const;
}

export async function facebookPagePublishConfirmation(
  job: FacebookActionJob,
  moderatorUserId: string,
  message: string,
): Promise<FacebookPagePublicationRequest> {
  return buildFacebookPagePublicationRequest({
    job,
    moderatorUserId,
    primaryCopy: message,
  });
}

export async function facebookPageReconciliationFingerprint(
  job: FacebookActionJob,
  draft: FacebookReconciliationDraft,
): Promise<string> {
  return sha256Hex(JSON.stringify([
    "facebook-page-reconciliation-ui-v1",
    ...jobState(job),
    draft.resolution,
    clean(draft.note, 500),
    draft.resolution === "confirmed_published"
      ? clean(draft.facebookPhotoId, 255)
      : "",
    draft.resolution === "confirmed_published"
      ? clean(draft.facebookPostId, 255)
      : "",
    draft.resolution === "confirmed_published"
      ? clean(draft.facebookPermalink, 1000)
      : "",
  ]));
}
