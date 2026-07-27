import assert from "node:assert/strict";
import test from "node:test";
import {
  isPublicProfileHostname,
  normalizeMemberSocialLinkInput,
  normalizeMemberSocialLinkLabel,
  normalizeMemberSocialLinkUrl,
} from "./profile-links-core.ts";

const validProfiles = [
  ["instagram", "https://www.instagram.com/mochirii.guild/", "https://instagram.com/mochirii.guild"],
  ["facebook", "https://facebook.com/mochirii.guild", "https://facebook.com/mochirii.guild"],
  ["tiktok", "https://www.tiktok.com/@mochirii", "https://tiktok.com/@mochirii"],
  ["twitch", "https://twitch.tv/mochirii", "https://twitch.tv/mochirii"],
  ["youtube", "https://youtube.com/@Mochirii", "https://youtube.com/@Mochirii"],
  ["x", "https://twitter.com/mochirii", "https://x.com/mochirii"],
  ["bluesky", "https://bsky.app/profile/mochirii.bsky.social", "https://bsky.app/profile/mochirii.bsky.social"],
  ["mastodon", "https://guild.social/@mochirii", "https://guild.social/@mochirii"],
  ["spotify", "https://open.spotify.com/user/abc123", "https://open.spotify.com/user/abc123"],
  ["linkedin", "https://www.linkedin.com/in/mochirii", "https://linkedin.com/in/mochirii"],
  ["custom", "https://mochirii.com/twills", "https://mochirii.com/twills"],
] as const;

test("normalizes each supported direct profile URL", () => {
  for (const [provider, input, expected] of validProfiles) {
    assert.equal(normalizeMemberSocialLinkUrl(provider, input), expected);
  }
});

test("rejects provider-host confusion and non-profile destinations", () => {
  const invalid = [
    ["instagram", "https://instagram.com.evil.example/mochirii"],
    ["facebook", "https://facebook.com@evil.example/mochirii"],
    ["tiktok", "https://tiktok.com/video/123"],
    ["youtube", "https://youtu.be/video"],
    ["x", "https://x.com/i/flow/login"],
    ["bluesky", "https://bsky.app/profile"],
    ["spotify", "https://open.spotify.com/track/123"],
    ["linkedin", "https://linkedin.com/feed"],
  ] as const;

  for (const [provider, input] of invalid) {
    assert.throws(() => normalizeMemberSocialLinkUrl(provider, input));
  }
});

test("rejects local, private, credentialed, and ambiguous custom URLs", () => {
  for (const input of [
    "http://example.com/profile",
    "https://localhost/profile",
    "https://127.0.0.1/profile",
    "https://[::1]/profile",
    "https://router.local/profile",
    "https://example.com:8443/profile",
    "https://name:secret@example.com/profile",
    "https://example.com/profile?tracking=1",
    "https://example.com/profile#section",
    "https://example.com\\@evil.example/profile",
  ]) {
    assert.throws(() => normalizeMemberSocialLinkUrl("custom", input));
  }
});

test("accepts public domains including normalized international domains", () => {
  assert.equal(isPublicProfileHostname("example.org"), true);
  assert.equal(isPublicProfileHostname("xn--bcher-kva.example.org"), true);
  assert.equal(isPublicProfileHostname("example.onion"), false);
  assert.equal(isPublicProfileHostname("10.0.0.1"), false);
});

test("keeps custom labels plain and rejects stored-XSS payloads", () => {
  assert.equal(normalizeMemberSocialLinkLabel("custom", "  Artist portfolio  "), "Artist portfolio");
  assert.throws(() => normalizeMemberSocialLinkLabel("custom", "<img src=x onerror=alert(1)>"));
  assert.throws(() => normalizeMemberSocialLinkLabel("custom", "javascript:alert(1)"));
});

test("known providers use their controlled label", () => {
  assert.deepEqual(
    normalizeMemberSocialLinkInput({
      provider: "instagram",
      profileUrl: "https://instagram.com/mochirii",
      displayLabel: "<script>alert(1)</script>",
    }),
    {
      provider: "instagram",
      displayLabel: "Instagram",
      profileUrl: "https://instagram.com/mochirii",
    },
  );
});
