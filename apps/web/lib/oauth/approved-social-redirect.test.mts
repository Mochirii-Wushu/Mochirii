import assert from "node:assert/strict";
import test from "node:test";
import { approvedSocialOAuthRedirect } from "./approved-social-redirect.ts";

test("accepts only the exact Mochirii Social OIDC callback", () => {
  assert.equal(
    approvedSocialOAuthRedirect("https://social.mochirii.com/auth/oidc/callback?code=opaque&state=opaque"),
    "https://social.mochirii.com/auth/oidc/callback?code=opaque&state=opaque",
  );
});

test("rejects origin and path confusion", () => {
  for (const candidate of [
    "http://social.mochirii.com/auth/oidc/callback?code=opaque",
    "https://social.mochirii.com.evil.example/auth/oidc/callback?code=opaque",
    "https://evil.example/auth/oidc/callback?next=https://social.mochirii.com",
    "https://social.mochirii.com@evil.example/auth/oidc/callback?code=opaque",
    "https://evil.example@social.mochirii.com/auth/oidc/callback?code=opaque",
    "https://social.mochirii.com/auth/oidc/callback/extra?code=opaque",
    "https://social.mochirii.com//auth/oidc/callback?code=opaque",
    "https://social.mochirii.com/%2fauth/oidc/callback?code=opaque",
    "https://social.mochirii.com/auth/oidc/callback#token=opaque",
    "https://social.mochirii.com/auth/oidc/callback\\@evil.example",
    "javascript:alert(1)",
    "//social.mochirii.com/auth/oidc/callback",
    "/auth/oidc/callback",
    "",
  ]) {
    assert.equal(approvedSocialOAuthRedirect(candidate), "", candidate);
  }
});
