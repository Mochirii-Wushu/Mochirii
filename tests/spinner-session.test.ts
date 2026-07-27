import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_SPINNER_BEARER_LENGTH,
  SPINNER_SESSION_TTL_SECONDS,
  decodeSpinnerSessionCookie,
  encodeSpinnerSessionCookie,
  parseJwtExpiryMs,
  readBearerToken,
  resolveSpinnerAccessToken,
  spinnerCookieOptions,
  spinnerRequestIsSameOrigin,
  validateSpinnerAccessTokenForMode,
  validateSpinnerModeratorToken,
  validateSpinnerViewerToken,
  // @ts-expect-error Node's type-stripping runner needs the explicit source extension.
} from "../apps/web/lib/spinner/session-policy.ts";
import {
  consumeLiveDrawHandoffIntent,
  // @ts-expect-error Node's type-stripping runner needs the explicit source extension.
} from "../apps/web/lib/spinner/viewer-handoff.ts";
import {
  authorizeSpinnerViewerHandoff,
  // @ts-expect-error Node's type-stripping runner needs the explicit source extension.
} from "../apps/web/lib/spinner/viewer-handoff-authority.ts";

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function jwt(expiresAtSeconds: number) {
  return `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ sub: "00000000-0000-4000-8000-000000000001", exp: expiresAtSeconds })}.signature`;
}

function authorityResponse(status = 200, body: unknown = {
  ok: true,
  hasAccess: true,
  data: { hasAccess: true },
}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("JWT expiry parsing accepts a bounded well-formed token", () => {
  const token = jwt(2_000_000_000);
  assert.equal(parseJwtExpiryMs(token), 2_000_000_000_000);
  assert.equal(readBearerToken(`Bearer ${token}`), token);
});

test("bearer parsing rejects malformed and oversized values", () => {
  assert.equal(readBearerToken("Basic abc"), null);
  assert.equal(readBearerToken("Bearer not-a-jwt"), null);
  assert.equal(readBearerToken(`Bearer ${"a".repeat(MAX_SPINNER_BEARER_LENGTH + 1)}`), null);
  assert.equal(parseJwtExpiryMs("a.b.c"), null);
});

test("session cookie carries a bounded token and server-resolved mode", () => {
  const token = jwt(2_000_000_000);
  const controller = encodeSpinnerSessionCookie(token, "controller");
  const viewer = encodeSpinnerSessionCookie(token, "viewer");
  assert.deepEqual(decodeSpinnerSessionCookie(controller), { accessToken: token, mode: "controller" });
  assert.deepEqual(decodeSpinnerSessionCookie(viewer), { accessToken: token, mode: "viewer" });
  assert.equal(decodeSpinnerSessionCookie(`x:${token}`), null);
  assert.equal(decodeSpinnerSessionCookie("c:not-a-token"), null);
});

test("same-origin policy requires Origin for mutations and rejects cross-site fetches", () => {
  const requestUrl = "https://mochirii.com/spinner/session";
  assert.equal(spinnerRequestIsSameOrigin({ requestUrl, origin: "https://mochirii.com", secFetchSite: "same-origin", requireOrigin: true }), true);
  assert.equal(spinnerRequestIsSameOrigin({ requestUrl, origin: null, secFetchSite: "same-origin", requireOrigin: true }), false);
  assert.equal(spinnerRequestIsSameOrigin({ requestUrl, origin: "https://example.com", secFetchSite: "cross-site", requireOrigin: true }), false);
  assert.equal(spinnerRequestIsSameOrigin({ requestUrl, origin: null, secFetchSite: null, requireOrigin: false }), true);
  assert.equal(spinnerRequestIsSameOrigin({ requestUrl, origin: null, secFetchSite: "cross-site", requireOrigin: false }), false);
});

test("cookie policy is strict, path-scoped, rolling, and capped by token expiry", () => {
  const now = 1_000_000;
  const full = spinnerCookieOptions(now + 3_600_000, now);
  assert.deepEqual(full, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/spinner",
    maxAge: SPINNER_SESSION_TTL_SECONDS,
    expires: new Date(now + SPINNER_SESSION_TTL_SECONDS * 1000),
  });

  assert.equal(spinnerCookieOptions(now + 42_000, now)?.maxAge, 42);
  assert.equal(spinnerCookieOptions(now, now), null);
});

test("moderator authority success forwards only the access token and check-only body", async () => {
  const now = 1_700_000_000_000;
  const token = jwt(Math.floor(now / 1000) + 3_600);
  let calls = 0;
  const result = await validateSpinnerModeratorToken({
    accessToken: token,
    supabaseUrl: "https://project.supabase.co",
    publishableKey: "public-key",
    nowMs: now,
    fetchImpl: async (input, init) => {
      calls += 1;
      assert.equal(String(input), "https://project.supabase.co/functions/v1/list-gallery-review-queue");
      assert.equal(init?.method, "POST");
      assert.equal((init?.headers as Record<string, string>).Authorization, `Bearer ${token}`);
      assert.equal((init?.headers as Record<string, string>).apikey, "public-key");
      assert.equal(init?.body, JSON.stringify({ checkOnly: true }));
      assert.equal(init?.cache, "no-store");
      return authorityResponse();
    },
  });

  assert.equal(calls, 1);
  assert.deepEqual(result, { ok: true, expiresAtMs: now + 3_600_000 });
});

test("expired tokens fail before the moderator authority is invoked", async () => {
  const now = 1_700_000_000_000;
  let calls = 0;
  const result = await validateSpinnerModeratorToken({
    accessToken: jwt(Math.floor(now / 1000)),
    supabaseUrl: "https://project.supabase.co",
    publishableKey: "public-key",
    nowMs: now,
    fetchImpl: async () => {
      calls += 1;
      return authorityResponse();
    },
  });
  assert.equal(calls, 0);
  assert.deepEqual(result, { ok: false, reason: "invalid-token" });
});

test("denial, rate limiting, upstream errors, and malformed approvals fail closed", async () => {
  const now = 1_700_000_000_000;
  const token = jwt(Math.floor(now / 1000) + 3_600);
  const cases = [
    { response: authorityResponse(403, { ok: false }), reason: "denied" },
    { response: authorityResponse(429, { ok: false }), reason: "rate-limited" },
    { response: authorityResponse(502, { ok: false }), reason: "upstream" },
    { response: authorityResponse(200, { ok: true, data: { hasAccess: true } }), reason: "denied" },
    { response: authorityResponse(200, { ok: true, hasAccess: true, data: {} }), reason: "denied" },
  ] as const;

  for (const item of cases) {
    const result = await validateSpinnerModeratorToken({
      accessToken: token,
      supabaseUrl: "https://project.supabase.co",
      publishableKey: "public-key",
      nowMs: now,
      fetchImpl: async () => item.response,
    });
    assert.deepEqual(result, { ok: false, reason: item.reason });
  }
});

test("network failure and missing configuration fail closed", async () => {
  const now = 1_700_000_000_000;
  const token = jwt(Math.floor(now / 1000) + 3_600);
  const networkFailure = await validateSpinnerModeratorToken({
    accessToken: token,
    supabaseUrl: "https://project.supabase.co",
    publishableKey: "public-key",
    nowMs: now,
    fetchImpl: async () => { throw new Error("offline"); },
  });
  assert.deepEqual(networkFailure, { ok: false, reason: "upstream" });

  const missingConfig = await validateSpinnerModeratorToken({
    accessToken: token,
    supabaseUrl: "",
    publishableKey: "",
    nowMs: now,
  });
  assert.deepEqual(missingConfig, { ok: false, reason: "missing-config" });
});

test("viewer authority requires both active member state and current verification", async () => {
  const now = 1_700_000_000_000;
  const token = jwt(Math.floor(now / 1000) + 3_600);
  let calls = 0;
  const result = await validateSpinnerViewerToken({
    accessToken: token,
    supabaseUrl: "https://project.supabase.co",
    publishableKey: "public-key",
    nowMs: now,
    fetchImpl: async (input, init) => {
      calls += 1;
      assert.equal(String(input), "https://project.supabase.co/functions/v1/verify-member-access");
      assert.equal(init?.body, JSON.stringify({ refreshDiscord: false }));
      assert.equal((init?.headers as Record<string, string>).Authorization, `Bearer ${token}`);
      return authorityResponse(200, {
        ok: true,
        data: { galleryEligible: true, memberStatus: "active" },
      });
    },
  });
  assert.equal(calls, 1);
  assert.deepEqual(result, { ok: true, expiresAtMs: now + 3_600_000 });

  for (const data of [
    { galleryEligible: false, memberStatus: "active" },
    { galleryEligible: true, memberStatus: "suspended" },
    { galleryEligible: true },
  ]) {
    const denied = await validateSpinnerViewerToken({
      accessToken: token,
      supabaseUrl: "https://project.supabase.co",
      publishableKey: "public-key",
      nowMs: now,
      fetchImpl: async () => authorityResponse(200, { ok: true, data }),
    });
    assert.deepEqual(denied, { ok: false, reason: "denied" });
  }
});

test("access resolution grants controllers first and otherwise degrades to verified viewer", async () => {
  const now = 1_700_000_000_000;
  const token = jwt(Math.floor(now / 1000) + 3_600);
  const calls: string[] = [];
  const controller = await resolveSpinnerAccessToken({
    accessToken: token,
    supabaseUrl: "https://project.supabase.co",
    publishableKey: "public-key",
    nowMs: now,
    fetchImpl: async (input) => {
      calls.push(String(input));
      return authorityResponse();
    },
  });
  assert.deepEqual(controller, { ok: true, expiresAtMs: now + 3_600_000, mode: "controller" });
  assert.deepEqual(calls, ["https://project.supabase.co/functions/v1/list-gallery-review-queue"]);

  const viewerCalls: string[] = [];
  const viewer = await resolveSpinnerAccessToken({
    accessToken: token,
    supabaseUrl: "https://project.supabase.co",
    publishableKey: "public-key",
    nowMs: now,
    fetchImpl: async (input) => {
      const endpoint = String(input);
      viewerCalls.push(endpoint);
      return endpoint.endsWith("/list-gallery-review-queue")
        ? authorityResponse(403, { ok: false })
        : authorityResponse(200, {
          ok: true,
          data: { galleryEligible: true, memberStatus: "active" },
        });
    },
  });
  assert.deepEqual(viewer, { ok: true, expiresAtMs: now + 3_600_000, mode: "viewer" });
  assert.equal(viewerCalls.length, 2);
});

test("entry intent validates the exact requested mode without privilege promotion", async () => {
  const now = 1_700_000_000_000;
  const token = jwt(Math.floor(now / 1000) + 3_600);
  const calls: string[] = [];
  const viewer = await validateSpinnerAccessTokenForMode({
    mode: "viewer",
    accessToken: token,
    supabaseUrl: "https://project.supabase.co",
    publishableKey: "public-key",
    nowMs: now,
    fetchImpl: async (input) => {
      calls.push(String(input));
      return authorityResponse(200, {
        ok: true,
        data: { galleryEligible: true, memberStatus: "active" },
      });
    },
  });
  assert.deepEqual(viewer, { ok: true, expiresAtMs: now + 3_600_000, mode: "viewer" });
  assert.deepEqual(calls, ["https://project.supabase.co/functions/v1/verify-member-access"]);

  const controller = await validateSpinnerAccessTokenForMode({
    mode: "controller",
    accessToken: token,
    supabaseUrl: "https://project.supabase.co",
    publishableKey: "public-key",
    nowMs: now,
    fetchImpl: async () => authorityResponse(403, { ok: false }),
  });
  assert.deepEqual(controller, { ok: false, reason: "denied" });
});

test("access resolution fails closed after viewer verification is revoked", async () => {
  const now = 1_700_000_000_000;
  const token = jwt(Math.floor(now / 1000) + 3_600);
  const result = await resolveSpinnerAccessToken({
    accessToken: token,
    supabaseUrl: "https://project.supabase.co",
    publishableKey: "public-key",
    nowMs: now,
    fetchImpl: async (input) => String(input).endsWith("/list-gallery-review-queue")
      ? authorityResponse(403, { ok: false })
      : authorityResponse(200, {
        ok: true,
        data: { galleryEligible: false, memberStatus: "active" },
      }),
  });
  assert.deepEqual(result, { ok: false, reason: "denied" });
});

test("a later role denial is not hidden by a prior successful heartbeat", async () => {
  const now = 1_700_000_000_000;
  const token = jwt(Math.floor(now / 1000) + 3_600);
  let authorized = true;
  const validate = () => validateSpinnerModeratorToken({
    accessToken: token,
    supabaseUrl: "https://project.supabase.co",
    publishableKey: "public-key",
    nowMs: now,
    fetchImpl: async () => authorized
      ? authorityResponse()
      : authorityResponse(403, { ok: false, hasAccess: false }),
  });

  assert.equal((await validate()).ok, true);
  authorized = false;
  assert.deepEqual(await validate(), { ok: false, reason: "denied" });
});

test("live draw handoff consumes only the exact one-shot intent", () => {
  assert.deepEqual(
    consumeLiveDrawHandoffIntent("https://mochirii.com/account?open=live-draw"),
    {
      requested: true,
      hadParameter: true,
      cleanedLocation: "/account",
    },
  );
  assert.deepEqual(
    consumeLiveDrawHandoffIntent("https://mochirii.com/account?return=account&open=live-draw#member"),
    {
      requested: true,
      hadParameter: true,
      cleanedLocation: "/account?return=account#member",
    },
  );

  for (const input of [
    "https://mochirii.com/account?open=Live-Draw",
    "https://mochirii.com/account?open=live-draw&open=live-draw",
    "https://mochirii.com/account?open=/spinner",
  ]) {
    const intent = consumeLiveDrawHandoffIntent(input);
    assert.equal(intent.requested, false);
    assert.equal(intent.hadParameter, true);
    assert.equal(intent.cleanedLocation, "/account");
  }
});

test("live draw handoff atomically preserves existing controller and viewer sessions", async () => {
  const now = 1_700_000_000_000;
  for (const mode of ["controller", "viewer"] as const) {
    const currentToken = jwt(Math.floor(now / 1000) + 1_800);
    const viewerToken = jwt(Math.floor(now / 1000) + 3_600);
    const calls: Array<{ accessToken: string; mode: string }> = [];
    const result = await authorizeSpinnerViewerHandoff({
      encodedSession: encodeSpinnerSessionCookie(currentToken, mode),
      viewerAccessToken: viewerToken,
      nowMs: now,
      validateAccess: async (accessToken, requestedMode) => {
        calls.push({ accessToken, mode: requestedMode });
        return { ok: true, expiresAtMs: now + 600_000, mode: requestedMode };
      },
    });

    assert.deepEqual(result, {
      ok: true,
      accessToken: currentToken,
      expiresAtMs: now + 600_000,
      mode,
    });
    assert.deepEqual(calls, [{ accessToken: currentToken, mode }]);
  }
});

test("live draw handoff opens viewer access only for an absent, malformed, or expired cookie", async () => {
  const now = 1_700_000_000_000;
  const viewerToken = jwt(Math.floor(now / 1000) + 3_600);
  const expiredToken = jwt(Math.floor(now / 1000) - 1);
  for (const encodedSession of [null, "broken", encodeSpinnerSessionCookie(expiredToken, "controller")]) {
    const calls: Array<{ accessToken: string; mode: string }> = [];
    const result = await authorizeSpinnerViewerHandoff({
      encodedSession,
      viewerAccessToken: viewerToken,
      nowMs: now,
      validateAccess: async (accessToken, mode) => {
        calls.push({ accessToken, mode });
        return { ok: true, expiresAtMs: now + 600_000, mode };
      },
    });
    assert.deepEqual(result, {
      ok: true,
      accessToken: viewerToken,
      expiresAtMs: now + 600_000,
      mode: "viewer",
    });
    assert.deepEqual(calls, [{ accessToken: viewerToken, mode: "viewer" }]);
  }
});

test("live draw handoff fails closed without downgrading on current-session or viewer denial", async () => {
  const now = 1_700_000_000_000;
  const currentToken = jwt(Math.floor(now / 1000) + 1_800);
  const viewerToken = jwt(Math.floor(now / 1000) + 3_600);
  const calls: Array<{ accessToken: string; mode: string }> = [];
  const renewalFailure = await authorizeSpinnerViewerHandoff({
    encodedSession: encodeSpinnerSessionCookie(currentToken, "controller"),
    viewerAccessToken: viewerToken,
    nowMs: now,
    validateAccess: async (accessToken, mode) => {
      calls.push({ accessToken, mode });
      return { ok: false, reason: "upstream" };
    },
  });
  assert.deepEqual(renewalFailure, { ok: false, clearCookie: false });
  assert.deepEqual(calls, [{ accessToken: currentToken, mode: "controller" }]);

  const revoked = await authorizeSpinnerViewerHandoff({
    encodedSession: encodeSpinnerSessionCookie(currentToken, "controller"),
    viewerAccessToken: viewerToken,
    nowMs: now,
    validateAccess: async () => ({ ok: false, reason: "denied" }),
  });
  assert.deepEqual(revoked, { ok: false, clearCookie: true });

  const denied = await authorizeSpinnerViewerHandoff({
    encodedSession: null,
    viewerAccessToken: viewerToken,
    nowMs: now,
    validateAccess: async () => ({ ok: false, reason: "denied" }),
  });
  assert.deepEqual(denied, { ok: false, clearCookie: true });
});
