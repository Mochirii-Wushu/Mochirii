import test from "node:test";
import assert from "node:assert/strict";
import { validateEventSocialPgTapTarget } from "../run-event-social-pgtap.mjs";

const base = {
  EVENT_SOCIAL_ISOLATED_PROJECT_ID: "mochirii-event-social-20260731-a",
  EVENT_SOCIAL_PGTAP_DB_URL:
    "postgresql://postgres@127.0.0.1:57522/postgres",
  EVENT_SOCIAL_PGTAP_DB_PASSWORD: "local-only",
};

test("event-social pgTAP guard accepts an explicit isolated loopback target", () => {
  assert.deepEqual(validateEventSocialPgTapTarget(base), {
    projectId: base.EVENT_SOCIAL_ISOLATED_PROJECT_ID,
    rawUrl: base.EVENT_SOCIAL_PGTAP_DB_URL,
    port: 57522,
    password: "local-only",
  });
});

test("event-social pgTAP guard rejects shared Supabase ports", () => {
  assert.throws(
    () =>
      validateEventSocialPgTapTarget({
        ...base,
        EVENT_SOCIAL_PGTAP_DB_URL:
          "postgresql://postgres@127.0.0.1:54322/postgres",
      }),
    /outside 54321-54327/,
  );
});

test("event-social pgTAP guard rejects remote, unnamed, and implicit targets", () => {
  assert.throws(
    () =>
      validateEventSocialPgTapTarget({
        ...base,
        EVENT_SOCIAL_PGTAP_DB_URL:
          "postgresql://postgres@db.example.com:57522/postgres",
      }),
    /loopback/,
  );
  assert.throws(
    () => validateEventSocialPgTapTarget({ ...base, EVENT_SOCIAL_ISOLATED_PROJECT_ID: "default" }),
    /unique mochirii-event-social/,
  );
  assert.throws(
    () => validateEventSocialPgTapTarget({ ...base, EVENT_SOCIAL_PGTAP_DB_URL: "" }),
    /required/,
  );
});
