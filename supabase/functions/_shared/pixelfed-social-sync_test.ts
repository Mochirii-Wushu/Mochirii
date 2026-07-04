import {
  constantTimeEquals,
  parsePixelfedSocialSyncPayload,
  PIXELFED_SOCIAL_SYNC_MAX_SKEW_MS,
} from "./pixelfed-social-sync.ts";

const now = Date.parse("2026-07-04T10:00:00.000Z");
const validPayload = {
  sub: "8ccaa7af-909f-44e7-84cb-67cdccb56be6",
  provider_user_id: "1",
  username: "faylui_4d9519c2",
  profile_url: "https://social.mochirii.com/faylui_4d9519c2",
  event: "login",
  timestamp: "2026-07-04T10:00:00.000Z",
};

Deno.test("Pixelfed social sync payload accepts the expected first-login shape", () => {
  const parsed = parsePixelfedSocialSyncPayload(validPayload, now);
  assert(parsed.username === "faylui_4d9519c2", "username should be normalized and preserved");
  assert(parsed.event === "login", "event should be login");
});

Deno.test("Pixelfed social sync payload rejects stale timestamps", () => {
  assertThrowsMessage(
    () =>
      parsePixelfedSocialSyncPayload(
        {
          ...validPayload,
          timestamp: new Date(now - PIXELFED_SOCIAL_SYNC_MAX_SKEW_MS - 1000).toISOString(),
        },
        now,
      ),
    "timestamp",
  );
});

Deno.test("Pixelfed social sync payload rejects off-domain profile URLs", () => {
  assertThrowsMessage(
    () =>
      parsePixelfedSocialSyncPayload(
        {
          ...validPayload,
          profile_url: "https://example.com/faylui_4d9519c2",
        },
        now,
      ),
    "profile_url",
  );
});

Deno.test("constantTimeEquals compares equal and different secrets", () => {
  assert(constantTimeEquals("secret", "secret") === true, "matching secrets should pass");
  assert(constantTimeEquals("secret", "Secret") === false, "case-mismatched secrets should fail");
  assert(constantTimeEquals("secret", "secret-longer") === false, "different-length secrets should fail");
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertThrowsMessage(callback: () => unknown, expectedMessagePart: string): void {
  try {
    callback();
  } catch (error) {
    assert(error instanceof Error, "expected thrown value to be an Error");
    assert(error.message.includes(expectedMessagePart), `expected error message to include ${expectedMessagePart}`);
    return;
  }

  throw new Error("expected callback to throw");
}
