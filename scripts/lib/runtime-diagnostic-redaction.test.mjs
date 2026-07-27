import assert from "node:assert/strict";
import test from "node:test";
import { redactRuntimeDiagnosticText } from "./runtime-diagnostic-redaction.mjs";

test("redacts callback query and fragment credentials", () => {
  assert.equal(
    redactRuntimeDiagnosticText("GET /auth/oidc/callback?code=secret&state=secret"),
    "GET /auth/oidc/callback?[redacted]",
  );
  assert.equal(
    redactRuntimeDiagnosticText("GET /auth/oidc/callback#access_token=secret"),
    "GET /auth/oidc/callback?[redacted]",
  );
});

test("redacts authorization and cookie headers", () => {
  const redacted = redactRuntimeDiagnosticText(
    "Authorization: Bearer token-value\r\nCookie: session=secret\r\nSet-Cookie: session=secret; Secure",
  );
  assert.equal(redacted.includes("token-value"), false);
  assert.equal(redacted.includes("session=secret"), false);
});

test("redacts structured and form credential fields", () => {
  const redacted = redactRuntimeDiagnosticText(
    '{"access_token":"token-value","client_secret":"client-value"} refresh_token=form-value&safe=ok',
  );
  assert.equal(redacted.includes("token-value"), false);
  assert.equal(redacted.includes("client-value"), false);
  assert.equal(redacted.includes("form-value"), false);
  assert.equal(redacted.includes("safe=ok"), true);
});
