import assert from "node:assert/strict";
import test from "node:test";

import {
  isApprovedSocialAuthorization,
  runSocialAuthorizationDecision,
} from "./authorization-decision-core.ts";

const approvedAuthorization = {
  authorization_id: "authorization-id",
  redirect_uri: "https://social.mochirii.com/auth/oidc/callback",
  client: { id: "social-client-id" },
};

test("accepts only the exact authorization id, client, and Social callback", () => {
  assert.equal(isApprovedSocialAuthorization(approvedAuthorization, "authorization-id", "social-client-id"), true);
  assert.equal(isApprovedSocialAuthorization({ ...approvedAuthorization, authorization_id: "other" }, "authorization-id", "social-client-id"), false);
  assert.equal(isApprovedSocialAuthorization({ ...approvedAuthorization, redirect_uri: "https://example.com/callback" }, "authorization-id", "social-client-id"), false);
  assert.equal(isApprovedSocialAuthorization({ ...approvedAuthorization, client: {} }, "authorization-id", "social-client-id"), false);
  assert.equal(isApprovedSocialAuthorization(approvedAuthorization, "authorization-id", ""), false);
  assert.equal(isApprovedSocialAuthorization(approvedAuthorization, "authorization-id", "other-client"), false);
});

test("unapproved authorization never reaches membership or consent", async () => {
  const calls: string[] = [];
  const result = await runSocialAuthorizationDecision({
    authorizationId: "authorization-id",
    expectedClientId: "social-client-id",
    decision: "approve",
    loadAuthorization: async () => {
      calls.push("details");
      return { ...approvedAuthorization, redirect_uri: "https://example.com/callback" };
    },
    verifyMembership: async () => {
      calls.push("membership");
      return "active";
    },
    submitDecision: async () => {
      calls.push("consent");
      return "submitted";
    },
  });

  assert.deepEqual(result, { status: "authorization-rejected" });
  assert.deepEqual(calls, ["details"]);
});

test("approved authorization validates membership before consent", async () => {
  const calls: string[] = [];
  const result = await runSocialAuthorizationDecision({
    authorizationId: "authorization-id",
    expectedClientId: "social-client-id",
    decision: "approve",
    loadAuthorization: async () => {
      calls.push("details");
      return approvedAuthorization;
    },
    verifyMembership: async () => {
      calls.push("membership");
      return "active";
    },
    submitDecision: async () => {
      calls.push("consent");
      return "submitted";
    },
  });

  assert.deepEqual(result, { status: "submitted", submission: "submitted" });
  assert.deepEqual(calls, ["details", "membership", "consent"]);
});

test("denial still validates authorization but does not require membership", async () => {
  const calls: string[] = [];
  const result = await runSocialAuthorizationDecision({
    authorizationId: "authorization-id",
    expectedClientId: "social-client-id",
    decision: "deny",
    loadAuthorization: async () => {
      calls.push("details");
      return approvedAuthorization;
    },
    verifyMembership: async () => {
      calls.push("membership");
      return "inactive";
    },
    submitDecision: async () => {
      calls.push("consent");
      return "submitted";
    },
  });

  assert.equal(result.status, "submitted");
  assert.deepEqual(calls, ["details", "consent"]);
});

test("missing or wrong trusted client id never reaches membership or consent", async () => {
  for (const expectedClientId of ["", "other-client"]) {
    const calls: string[] = [];
    const result = await runSocialAuthorizationDecision({
      authorizationId: "authorization-id",
      expectedClientId,
      decision: "approve",
      loadAuthorization: async () => {
        calls.push("details");
        return approvedAuthorization;
      },
      verifyMembership: async () => {
        calls.push("membership");
        return "active";
      },
      submitDecision: async () => {
        calls.push("consent");
        return "submitted";
      },
    });

    assert.deepEqual(result, { status: "authorization-rejected" });
    assert.deepEqual(calls, ["details"]);
  }
});
