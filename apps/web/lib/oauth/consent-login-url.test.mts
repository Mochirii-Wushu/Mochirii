import assert from "node:assert/strict";
import test from "node:test";
import { oauthConsentLoginHref, oauthConsentPath } from "./consent-login-url.ts";

test("the browser sign-in round trip preserves the exact OAuth authorization id", () => {
  const authorizationId = "oauth-request_01HZYQ6R6D6M4M3Z9V5W8W3K7R";
  const loginHref = oauthConsentLoginHref(authorizationId);
  const loginUrl = new URL(loginHref, "https://mochirii.com");
  const redirect = loginUrl.searchParams.get("redirect");

  assert.equal(redirect, oauthConsentPath(authorizationId));

  const consentUrl = new URL(String(redirect), "https://mochirii.com");
  assert.equal(consentUrl.pathname, "/oauth/consent");
  assert.equal(consentUrl.searchParams.get("authorization_id"), authorizationId);
});

test("authorization ids cannot inject another redirect parameter", () => {
  const authorizationId = "request&redirect=https://example.invalid";
  const loginUrl = new URL(oauthConsentLoginHref(authorizationId), "https://mochirii.com");
  const consentUrl = new URL(String(loginUrl.searchParams.get("redirect")), "https://mochirii.com");

  assert.equal(consentUrl.pathname, "/oauth/consent");
  assert.equal(consentUrl.searchParams.get("authorization_id"), authorizationId);
  assert.equal(consentUrl.searchParams.get("redirect"), null);
});
