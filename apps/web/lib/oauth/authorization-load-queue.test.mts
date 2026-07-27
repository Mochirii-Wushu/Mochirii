import assert from "node:assert/strict";
import test from "node:test";
import { classifyAuthorizationDetailsFailure } from "./authorization-details-error.ts";
import { createAuthorizationLoadQueue } from "./authorization-load-queue.ts";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("coalesces duplicate initial-session requests", async () => {
  let calls = 0;
  const queue = createAuthorizationLoadQueue(async () => {
    calls += 1;
  });

  const first = queue.request();
  const duplicate = queue.request();
  await Promise.all([first, duplicate]);

  assert.equal(calls, 1);
});

test("serializes one follow-up when auth changes during a request", async () => {
  const firstGate = deferred();
  let calls = 0;
  let active = 0;
  let maximumActive = 0;
  const queue = createAuthorizationLoadQueue(async () => {
    calls += 1;
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    if (calls === 1) await firstGate.promise;
    active -= 1;
  });

  const first = queue.request();
  await Promise.resolve();
  const followUp = queue.request();
  const duplicateFollowUp = queue.request();
  firstGate.resolve();
  await Promise.all([first, followUp, duplicateFollowUp]);

  assert.equal(calls, 2);
  assert.equal(maximumActive, 1);
});

test("stopping the queue prevents a pending consent read", async () => {
  let calls = 0;
  const queue = createAuthorizationLoadQueue(async () => {
    calls += 1;
  });

  queue.stop();
  await queue.request();

  assert.equal(calls, 0);
});

test("a rejected load is contained and a later retry still runs", async () => {
  let calls = 0;
  const queue = createAuthorizationLoadQueue(async () => {
    calls += 1;
    if (calls === 1) throw new Error("temporary failure");
  });

  await queue.request();
  await queue.request();

  assert.equal(calls, 2);
});

test("only a provider not-found response is treated as an expired request", () => {
  assert.deepEqual(
    classifyAuthorizationDetailsFailure({
      status: 404,
      code: "oauth_authorization_not_found",
      message: "authorization not found",
    }),
    {
      kind: "expired",
      message: "This sign-in request is no longer available. Return to Mochirii Social and start again.",
    },
  );

  assert.equal(classifyAuthorizationDetailsFailure({ status: 503 }).kind, "temporary");
  assert.equal(classifyAuthorizationDetailsFailure({ status: 404 }).kind, "temporary");
  assert.equal(classifyAuthorizationDetailsFailure(new TypeError("network unavailable")).kind, "temporary");
  assert.equal(classifyAuthorizationDetailsFailure({ status: 401, code: "bad_jwt" }).kind, "session");
});
