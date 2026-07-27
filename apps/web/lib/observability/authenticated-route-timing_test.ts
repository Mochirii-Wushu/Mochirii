import assert from "node:assert/strict";
import test from "node:test";
import {
  authenticatedRouteTimingBucket,
  measureAuthenticatedRouteTask,
} from "./authenticated-route-timing.ts";

test("authenticated route timing uses bounded duration buckets", () => {
  assert.equal(authenticatedRouteTimingBucket(0), "under-250ms");
  assert.equal(authenticatedRouteTimingBucket(249), "under-250ms");
  assert.equal(authenticatedRouteTimingBucket(250), "250-749ms");
  assert.equal(authenticatedRouteTimingBucket(750), "750-1499ms");
  assert.equal(authenticatedRouteTimingBucket(1500), "1500-2999ms");
  assert.equal(authenticatedRouteTimingBucket(3000), "3000ms-plus");
});

test("authenticated route timing preserves resolved values", async () => {
  const value = await measureAuthenticatedRouteTask("account", async () => "ready");
  assert.equal(value, "ready");
});

test("authenticated route timing preserves task failures", async () => {
  await assert.rejects(
    () => measureAuthenticatedRouteTask("leader-dashboard", async () => {
      throw new Error("unavailable");
    }),
    /unavailable/,
  );
});
