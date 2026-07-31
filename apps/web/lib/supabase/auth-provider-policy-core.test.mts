import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeProviderPolicyIds,
  resolveProviderPolicyIds,
} from "./auth-provider-policy-core.ts";

const supported = ["apple", "facebook", "google", "discord", "twitch", "spotify"] as const;

test("sign-in and identity-link provider policies resolve independently", () => {
  const signIn = resolveProviderPolicyIds(
    "apple,facebook,google,discord,twitch,spotify",
    supported,
  );
  const identityLink = resolveProviderPolicyIds(
    "discord,google,twitch,apple",
    supported,
  );

  assert.deepEqual(signIn, ["apple", "facebook", "google", "discord", "twitch", "spotify"]);
  assert.deepEqual(identityLink, ["discord", "google", "twitch", "apple"]);
  assert.equal(identityLink.includes("facebook"), false);
  assert.equal(identityLink.includes("spotify"), false);
});

test("an explicitly empty identity-link policy stays empty", () => {
  assert.deepEqual(resolveProviderPolicyIds("", supported), []);
});

test("provider policies normalize case and whitespace and remove duplicates", () => {
  assert.deepEqual(
    resolveProviderPolicyIds(" Discord, google,DISCORD, twitch ", supported),
    ["discord", "google", "twitch"],
  );
  assert.deepEqual(normalizeProviderPolicyIds(" Apple, GOOGLE "), ["apple", "google"]);
});

test("provider policies reject unsupported identifiers", () => {
  assert.deepEqual(resolveProviderPolicyIds("google,unknown,phone", supported), ["google"]);
});

test("identity linking can be staged independently from public sign-in", () => {
  const signIn = resolveProviderPolicyIds("discord", supported);
  const identityLink = resolveProviderPolicyIds("discord,apple", supported);

  assert.equal(signIn.includes("apple"), false);
  assert.equal(identityLink.includes("apple"), true);
});
