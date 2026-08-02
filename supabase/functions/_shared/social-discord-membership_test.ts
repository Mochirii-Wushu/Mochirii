import { assertEquals } from "jsr:@std/assert@1.0.19";
import {
  currentSocialDiscordMembership,
  SOCIAL_EXPECTED_DISCORD_GUILD_ID,
  SOCIAL_EXPECTED_REQUIRED_ROLE_IDS,
} from "./social-discord-membership.ts";

const discordUserId = "123456789012345678";

function response(status: number, body: unknown): typeof fetch {
  return (() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    )) as typeof fetch;
}

function verify(
  fetcher: typeof fetch,
  overrides: Partial<Parameters<typeof currentSocialDiscordMembership>[0]> = {},
) {
  return currentSocialDiscordMembership({
    discordUserId,
    configuredGuildId: SOCIAL_EXPECTED_DISCORD_GUILD_ID,
    configuredRequiredRoleIds: [...SOCIAL_EXPECTED_REQUIRED_ROLE_IDS],
    botToken: "test-only-token",
    fetcher,
    ...overrides,
  });
}

Deno.test("Social requires the exact Discord configuration", async () => {
  assertEquals(
    (await verify(response(200, {}), {
      configuredGuildId: "123456789012345679",
    })).status,
    "unavailable",
  );
  assertEquals(
    (await verify(response(200, {}), { configuredRequiredRoleIds: [] })).status,
    "unavailable",
  );
  assertEquals(
    (await verify(response(200, {}), { botToken: "" })).status,
    "unavailable",
  );
});

Deno.test("Social accepts only a current non-pending member with every required role", async () => {
  const result = await verify(response(200, {
    user: { id: discordUserId },
    roles: [...SOCIAL_EXPECTED_REQUIRED_ROLE_IDS],
    pending: false,
  }));
  assertEquals(result, { status: "verified" });
});

Deno.test("Social denies former, pending, and missing-role members", async () => {
  assertEquals(
    await verify(response(404, { code: 10_007, message: "Unknown Member" })),
    {
      status: "denied",
      reason: "not_member",
    },
  );
  assertEquals(
    await verify(response(200, {
      user: { id: discordUserId },
      roles: [...SOCIAL_EXPECTED_REQUIRED_ROLE_IDS],
      pending: true,
    })),
    { status: "denied", reason: "pending" },
  );
  assertEquals(
    await verify(response(200, {
      user: { id: discordUserId },
      roles: [SOCIAL_EXPECTED_REQUIRED_ROLE_IDS[0]],
      pending: false,
    })),
    { status: "denied", reason: "missing_roles" },
  );
});

Deno.test("Social fails closed when Discord is unavailable or returns an invalid member", async () => {
  const unavailable =
    (() =>
      Promise.reject(new TypeError("network unavailable"))) as typeof fetch;
  assertEquals(await verify(unavailable), {
    status: "unavailable",
    reason: "network",
  });
  assertEquals(await verify(response(429, { retry_after: 1 })), {
    status: "unavailable",
    reason: "rate_limited",
  });
  assertEquals(
    await verify(response(404, { code: 10_004, message: "Unknown Guild" })),
    {
      status: "unavailable",
      reason: "provider_response",
    },
  );
  assertEquals(await verify(response(404, { message: "Unknown Member" })), {
    status: "unavailable",
    reason: "provider_response",
  });
  assertEquals(
    await verify(
      response(200, { user: { id: "999999999999999999" }, roles: [] }),
    ),
    {
      status: "unavailable",
      reason: "provider_response",
    },
  );
});
