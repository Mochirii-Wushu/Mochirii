import {
  asRecord,
  asStringArray,
  defaultDisplayName,
  discordAvatarUrl,
  providerSubject,
  resolveDiscordIdentity,
  safeString,
} from "./member-verification-identity.ts";

Deno.test("identity value helpers preserve the existing normalization contract", () => {
  assertEquals(asRecord({ role: "member" }), { role: "member" });
  assertEquals(asRecord(["member"]), {});
  assertEquals(asRecord(null), {});
  assertEquals(asStringArray(["first", 2, ""]), ["first", "2"]);
  assertEquals(asStringArray("first"), []);
  assertEquals(safeString("  Mochirii  ", 5), "Mochi");
  assertEquals(safeString("   ", 20), null);
});

Deno.test("display names follow metadata then email fallback order", () => {
  assertEquals(
    defaultDisplayName({
      email: "email-name@example.com",
      user_metadata: { global_name: "Guild Name", full_name: "Full Name" },
    }),
    "Guild Name",
  );
  assertEquals(
    defaultDisplayName({ email: "email-name@example.com" }),
    "email-name",
  );
  assertEquals(
    defaultDisplayName({ user_metadata: { name: "x" } }),
    "Mochirii Member",
  );
  assertEquals(defaultDisplayName({}), "Mochirii Member");
});

Deno.test("provider subjects keep provider field precedence and phone fallback", () => {
  assertEquals(
    providerSubject(
      "discord",
      { provider_id: "identity-provider" },
      { provider_id: "data-provider", sub: "data-sub" },
      {},
    ),
    "identity-provider",
  );
  assertEquals(
    providerSubject("discord", {}, {
      provider_id: "data-provider",
      sub: "data-sub",
    }, {}),
    "data-provider",
  );
  assertEquals(
    providerSubject("discord", {}, { sub: "data-sub" }, {}),
    "data-sub",
  );
  assertEquals(
    providerSubject("phone", {}, {}, { phone: "+15555550100" }),
    "+15555550100",
  );
  assertEquals(providerSubject("discord", {}, {}, {}), null);
});

Deno.test("Discord identity resolution uses synced, auth, profile, then metadata precedence", () => {
  const user = {
    identities: [
      { provider: "google", provider_id: "google-subject" },
      { provider: "discord", identity_data: { sub: "222222222222222222" } },
    ],
    user_metadata: { provider_id: "444444444444444444" },
  };
  const profile = { discord_user_id: "333333333333333333" };

  assertEquals(
    resolveDiscordIdentity(user, profile, [
      { provider: "discord", provider_subject: "111111111111111111" },
    ]),
    "111111111111111111",
  );
  assertEquals(resolveDiscordIdentity(user, profile), "222222222222222222");
  assertEquals(
    resolveDiscordIdentity({ identities: [] }, profile),
    "333333333333333333",
  );
  assertEquals(
    resolveDiscordIdentity({
      identities: [],
      user_metadata: user.user_metadata,
    }, null),
    "444444444444444444",
  );
  assertEquals(resolveDiscordIdentity({ identities: [] }, null), null);
});

Deno.test("Discord identity resolution applies one shared identifier length boundary", () => {
  const longIdentity = "1".repeat(50);
  assertEquals(
    resolveDiscordIdentity({
      identities: [{ provider: "discord", provider_id: longIdentity }],
    }, null),
    "1".repeat(40),
  );
  assertEquals(
    resolveDiscordIdentity({}, null, [{
      provider: "discord",
      provider_subject: longIdentity,
    }]),
    "1".repeat(40),
  );
});

Deno.test("Discord avatar URLs select static and animated CDN formats", () => {
  assertEquals(
    discordAvatarUrl({ id: "111111111111111111", avatar: "static_hash" }),
    "https://cdn.discordapp.com/avatars/111111111111111111/static_hash.png",
  );
  assertEquals(
    discordAvatarUrl({ id: "111111111111111111", avatar: "a_animated_hash" }),
    "https://cdn.discordapp.com/avatars/111111111111111111/a_animated_hash.gif",
  );
  assertEquals(
    discordAvatarUrl({ id: "111111111111111111", avatar: null }),
    null,
  );
  assertEquals(discordAvatarUrl({ avatar: "static_hash" }), null);
});

function assertEquals(actual: unknown, expected: unknown): void {
  const normalized = (value: unknown) => JSON.stringify(value);
  if (normalized(actual) !== normalized(expected)) {
    throw new Error(
      `Expected ${normalized(expected)}, received ${normalized(actual)}`,
    );
  }
}
