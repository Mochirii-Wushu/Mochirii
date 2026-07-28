import assert from "node:assert/strict";
import test from "node:test";
import { isRecentPastTimestamp } from "./profile-verification-time.ts";

const RECENT_VERIFICATION_MS = 7 * 24 * 60 * 60 * 1000;

test("recent verification rejects timestamps in the future", () => {
  assert.equal(
    isRecentPastTimestamp(
      new Date(Date.now() + 60_000).toISOString(),
      RECENT_VERIFICATION_MS,
    ),
    false,
  );
});

test("recent verification accepts a valid timestamp inside the bounded window", () => {
  assert.equal(
    isRecentPastTimestamp(
      new Date(Date.now() - 60_000).toISOString(),
      RECENT_VERIFICATION_MS,
    ),
    true,
  );
});
