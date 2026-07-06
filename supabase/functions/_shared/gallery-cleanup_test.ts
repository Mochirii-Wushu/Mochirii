import {
  isSafeMemberGalleryObject,
  MEMBER_GALLERY_BUCKET,
  normalizeRejectedGalleryCleanupRequest,
} from "./gallery-cleanup.ts";

function assertEquals(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

Deno.test("normalizeRejectedGalleryCleanupRequest requires a valid id and explicit confirmation", () => {
  const validId = "0c87159c-e0b4-468d-99a8-7af5116e49aa";

  assertEquals(normalizeRejectedGalleryCleanupRequest({ submission_id: validId, confirm_cleanup: true }), {
    ok: true,
    submissionId: validId,
  });

  assertEquals(normalizeRejectedGalleryCleanupRequest({ submission_id: validId, confirm_cleanup: false }), {
    ok: false,
    status: 400,
    error: "cleanup_not_confirmed",
    message: "Confirm cleanup before deleting a rejected submission.",
  });

  assertEquals(normalizeRejectedGalleryCleanupRequest({ submission_id: "not-a-uuid", confirm_cleanup: true }), {
    ok: false,
    status: 400,
    error: "invalid_submission_id",
    message: "A valid rejected submission id is required.",
  });
});

Deno.test("isSafeMemberGalleryObject accepts only owned member-gallery objects", () => {
  const userId = "0c87159c-e0b4-468d-99a8-7af5116e49aa";

  assertEquals(isSafeMemberGalleryObject(MEMBER_GALLERY_BUCKET, `${userId}/discord/test.png`, userId), true);
  assertEquals(isSafeMemberGalleryObject("other-bucket", `${userId}/discord/test.png`, userId), false);
  assertEquals(isSafeMemberGalleryObject(MEMBER_GALLERY_BUCKET, "other-user/discord/test.png", userId), false);
  assertEquals(isSafeMemberGalleryObject(MEMBER_GALLERY_BUCKET, `${userId}/../test.png`, userId), false);
  assertEquals(isSafeMemberGalleryObject(MEMBER_GALLERY_BUCKET, `/${userId}/discord/test.png`, userId), false);
});
