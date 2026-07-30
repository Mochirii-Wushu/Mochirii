import { classifyGalleryWithdrawalFailure } from "./failure.ts";

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)}`);
  }
}

Deno.test("withdrawal failures expose only the reviewed public statuses", () => {
  assertEquals(
    classifyGalleryWithdrawalFailure("submission_not_found", null),
    {
      reason: "submission_not_found",
      status: 404,
      message: "The Gallery submission was not found.",
    },
    "missing submissions must remain a 404",
  );
  assertEquals(
    classifyGalleryWithdrawalFailure(null, {
      code: "42501",
      message: "Submission owner required.",
    }),
    {
      reason: "submission_not_owned",
      status: 403,
      message: "Only the submitting member may withdraw this consent.",
    },
    "the exact owner exception must remain a 403",
  );
  assertEquals(
    classifyGalleryWithdrawalFailure("destination_not_selected", null),
    {
      reason: "destination_not_selected",
      status: 409,
      message: "That destination does not have active publication consent.",
    },
    "an unselected destination must remain a 409",
  );
});

Deno.test("unknown and privileged withdrawal failures remain redacted", () => {
  for (
    const failure of [
      { code: "42501", message: "Service role required." },
      { code: "XX000", message: "private database detail" },
      null,
    ]
  ) {
    const result = classifyGalleryWithdrawalFailure(
      "unexpected_reason",
      failure,
    );
    assertEquals(
      result,
      {
        reason: "gallery_withdrawal_failed",
        status: 500,
        message: "Publication consent could not be withdrawn.",
      },
      "unreviewed failures must not expose database details",
    );
    if (JSON.stringify(result).includes("private database detail")) {
      throw new Error("the public failure response exposed a database detail");
    }
  }
});
