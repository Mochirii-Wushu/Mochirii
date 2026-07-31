import {
  buildDiscordApiUrl,
  discordFetch,
  discordMemberRoleState,
  discordRetryAfterSeconds,
} from "./discord-api.ts";
import { OutboundHttpError } from "./outbound-http.ts";

Deno.test("Discord API URLs stay on the fixed v10 HTTPS origin", () => {
  assert(
    buildDiscordApiUrl("/guilds/123") ===
      "https://discord.com/api/v10/guilds/123",
    "relative Discord URL drifted",
  );
  assertThrows(() => buildDiscordApiUrl("https://evil.test/api"));
  assertThrows(() => buildDiscordApiUrl("//evil.test/api"));
  assertThrows(() => buildDiscordApiUrl("\\\\evil.test/api"));
  assertThrows(() => buildDiscordApiUrl("../users/@me"));
  assertThrows(() => buildDiscordApiUrl("ftp://evil.test/api"));
  assertThrows(() => buildDiscordApiUrl("/guilds/123#fragment"));
});

Deno.test("discordFetch applies fixed-origin transport and bounded JSON", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const result = await discordFetch("/guilds/123", {
    token: "test-token",
    fetcher: ((input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return Promise.resolve(Response.json({ roles: ["1234567890123456"] }));
    }) as typeof fetch,
  });

  assert(result.ok, "valid Discord response rejected");
  assert(
    capturedUrl === "https://discord.com/api/v10/guilds/123",
    "Discord origin drifted",
  );
  assert(
    capturedInit?.redirect === "error",
    "Discord redirects were not disabled",
  );
  assert(
    capturedInit?.signal instanceof AbortSignal,
    "Discord timeout signal missing",
  );
  assert(
    new Headers(capturedInit?.headers).get("Authorization") ===
      "Bot test-token",
    "Discord authorization header missing",
  );
});

Deno.test("discordFetch rejects non-JSON and oversized provider bodies", async () => {
  await assertRejectsOutbound(() =>
    discordFetch("/guilds/123", {
      token: "test-token",
      fetcher: (() =>
        Promise.resolve(
          new Response("upstream html", {
            headers: { "content-type": "text/html" },
          }),
        )) as typeof fetch,
    })
  );

  await assertRejectsOutbound(() =>
    discordFetch("/guilds/123", {
      token: "test-token",
      maximumResponseBytes: 8,
      fetcher: (() =>
        Promise.resolve(
          new Response(JSON.stringify({ tooLarge: true }), {
            headers: { "content-type": "application/json" },
          }),
        )) as typeof fetch,
    })
  );
});

Deno.test("Discord member role state rejects malformed role payloads", () => {
  const valid = discordMemberRoleState({
    roles: ["1234567890123456"],
    pending: false,
  });
  assert(
    valid?.roles.length === 1 && valid.pending === false,
    "valid role state rejected",
  );
  assert(
    discordMemberRoleState({ roles: ["not-a-snowflake"] }) === null,
    "invalid role accepted",
  );
  assert(
    discordMemberRoleState({ roles: "1234567890123456" }) === null,
    "non-array roles accepted",
  );
  assert(
    discordMemberRoleState({ roles: [1234567890123456] }) === null,
    "numeric role accepted",
  );
  assert(
    discordMemberRoleState({
      roles: Array.from({ length: 251 }, () => "1234567890123456"),
    }) === null,
    "unbounded role array accepted",
  );
  assert(
    discordMemberRoleState({
      roles: ["1234567890123456"],
      user: { id: "2234567890123456" },
    }, "1234567890123456") === null,
    "mismatched Discord member identity accepted",
  );
  assert(
    discordMemberRoleState({ roles: [], pending: "false" }) === null,
    "invalid pending flag accepted",
  );
});

Deno.test("Discord retry guidance accepts only bounded integer seconds", () => {
  assert(
    discordRetryAfterSeconds(new Headers({ "retry-after": "4" })) === 4,
    "valid retry guidance rejected",
  );
  for (const value of ["0", "4.5", "3601", "not-a-number", "9".repeat(80)]) {
    assert(
      discordRetryAfterSeconds(new Headers({ "retry-after": value })) ===
        null,
      `unsafe retry guidance accepted: ${value.slice(0, 16)}`,
    );
  }
});

async function assertRejectsOutbound(
  fn: () => Promise<unknown>,
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    assert(error instanceof OutboundHttpError, "wrong outbound error type");
    return;
  }
  throw new Error("Expected outbound response rejection.");
}

function assertThrows(fn: () => unknown): void {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error("Expected function to throw.");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
