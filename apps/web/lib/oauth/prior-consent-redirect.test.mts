import assert from "node:assert/strict";
import test from "node:test";
import { priorConsentRedirect } from "./prior-consent-redirect.ts";

test("a prior consent redirects only after current member access passes", () => {
  const details = {
    redirect_url: "https://social.mochirii.com/auth/oidc/callback?code=opaque",
  };

  assert.equal(priorConsentRedirect(details, false), "");
  assert.equal(priorConsentRedirect(details, true), details.redirect_url);
});

test("a pending authorization never uses the prior-consent redirect path", () => {
  assert.equal(
    priorConsentRedirect({
      authorization_id: "authorization-id",
      redirect_url: "https://social.mochirii.com/",
    }, true),
    "",
  );
});
