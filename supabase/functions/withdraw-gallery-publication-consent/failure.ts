export type GalleryWithdrawalFailure = {
  reason:
    | "submission_not_found"
    | "submission_not_owned"
    | "destination_not_selected"
    | "gallery_withdrawal_failed";
  status: 403 | 404 | 409 | 500;
  message: string;
};

function errorRecord(error: unknown): Record<string, unknown> {
  return error && typeof error === "object"
    ? error as Record<string, unknown>
    : {};
}

export function classifyGalleryWithdrawalFailure(
  reasonValue: unknown,
  errorValue: unknown,
): GalleryWithdrawalFailure {
  const reason = typeof reasonValue === "string"
    ? reasonValue.trim().slice(0, 80)
    : "";
  if (reason === "submission_not_found") {
    return {
      reason,
      status: 404,
      message: "The Gallery submission was not found.",
    };
  }
  if (reason === "destination_not_selected") {
    return {
      reason,
      status: 409,
      message: "That destination does not have active publication consent.",
    };
  }

  const error = errorRecord(errorValue);
  if (
    error.code === "42501" &&
    error.message === "Submission owner required."
  ) {
    return {
      reason: "submission_not_owned",
      status: 403,
      message: "Only the submitting member may withdraw this consent.",
    };
  }

  return {
    reason: "gallery_withdrawal_failed",
    status: 500,
    message: "Publication consent could not be withdrawn.",
  };
}
