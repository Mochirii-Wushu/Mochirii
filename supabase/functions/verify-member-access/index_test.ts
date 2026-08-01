import { updateDiscordProfile } from "./index.ts";

const EXPECTED_GUILD_ID = "1078630751077142608";
const EXPECTED_ROLE_IDS = ["1468659807736299520", "1078630751077142615"];
const NOW = "2026-07-27T12:00:00.000Z";

Deno.test("Discord refresh bounds the request and preserves rate limiting", async () => {
  await withDiscordConfig(async () => {
    let observedSignal: unknown = null;
    const { client, writes } = fakeAdminClient();
    const result = await updateDiscordProfile(
      client,
      "member-id",
      { id: "member-id" },
      activeProfile(),
      "discord-id",
      NOW,
      {
        fetchImpl: ((_input, init) => {
          observedSignal = init?.signal as AbortSignal | null;
          return Promise.resolve(
            new Response("", {
              status: 429,
              headers: { "retry-after": "4" },
            }),
          );
        }) as typeof fetch,
      },
    );

    assert(
      result.ok === false && result.status === 429,
      "rate limits must remain retryable",
    );
    assert(
      result.message?.includes("4 seconds"),
      "retry guidance should be bounded and public-safe",
    );
    assert(
      observedSignal instanceof AbortSignal,
      "Discord requests must carry a timeout signal",
    );
    assert(
      writes.length === 0,
      "rate limits must not overwrite the last verified state",
    );
  });
});

Deno.test("Discord refresh converts timeout and network failures to unavailable", async () => {
  await withDiscordConfig(async () => {
    for (
      const error of [
        new DOMException("timed out", "TimeoutError"),
        new TypeError("network unavailable"),
      ]
    ) {
      const { client, writes } = fakeAdminClient();
      const result = await updateDiscordProfile(
        client,
        "member-id",
        { id: "member-id" },
        activeProfile(),
        "discord-id",
        NOW,
        {
          fetchImpl: (() => Promise.reject(error)) as typeof fetch,
        },
      );

      assert(
        result.ok === false && result.status === 503,
        "transient Discord failure must be unavailable",
      );
      assert(
        writes.length === 0,
        "transient failure must not overwrite verified evidence",
      );
    }
  });
});

Deno.test("exact Discord Unknown Member must clear access or fail closed when the write fails", async () => {
  await withDiscordConfig(async () => {
    const missing = Response.json(
      { code: 10_007, message: "Unknown Member" },
      { status: 404 },
    );

    const successful = fakeAdminClient();
    const result = await updateDiscordProfile(
      successful.client,
      "member-id",
      { id: "member-id" },
      activeProfile(),
      "discord-id",
      NOW,
      { fetchImpl: (() => Promise.resolve(missing.clone())) as typeof fetch },
    );
    assert(
      result.ok === true,
      "the exact Unknown Member response should be recorded as a completed check",
    );
    assert(
      successful.writes.length === 1,
      "Unknown Member must persist the fail-closed member state",
    );
    assert(
      successful.writes[0].has_required_discord_roles === false,
      "Unknown Member must clear role evidence",
    );
    assert(
      successful.writes[0].discord_verified_at === null,
      "Unknown Member must clear verified time",
    );

    const failed = fakeAdminClient({
      code: "write_failed",
      message: "write failed",
    });
    await assertRejects(
      () =>
        updateDiscordProfile(
          failed.client,
          "member-id",
          { id: "member-id" },
          activeProfile(),
          "discord-id",
          NOW,
          {
            fetchImpl: (() => Promise.resolve(missing.clone())) as typeof fetch,
          },
        ),
      "a failed membership-loss write must never fall through to stale authorization",
    );
  });
});

Deno.test("ambiguous Discord 404 responses never overwrite verified evidence", async () => {
  await withDiscordConfig(async () => {
    for (
      const response of [
        Response.json({ code: 10_004, message: "Unknown Guild" }, { status: 404 }),
        Response.json({ message: "Unknown Member" }, { status: 404 }),
      ]
    ) {
      const { client, writes } = fakeAdminClient();
      const result = await updateDiscordProfile(
        client,
        "member-id",
        { id: "member-id" },
        activeProfile(),
        "discord-id",
        NOW,
        { fetchImpl: (() => Promise.resolve(response.clone())) as typeof fetch },
      );
      assert(result.ok === false, "ambiguous 404 must be unavailable");
      assert(writes.length === 0, "ambiguous 404 must preserve verified evidence");
    }
  });
});

Deno.test("Discord role success stores fresh eligible evidence", async () => {
  await withDiscordConfig(async () => {
    const { client, writes } = fakeAdminClient();
    const result = await updateDiscordProfile(
      client,
      "member-id",
      { id: "member-id" },
      activeProfile(),
      "discord-id",
      NOW,
      {
        fetchImpl: (() =>
          Promise.resolve(Response.json({
            pending: false,
            roles: EXPECTED_ROLE_IDS,
            user: { id: "discord-id", username: "member" },
          }))) as typeof fetch,
      },
    );

    assert(result.ok === true, "required roles should verify the member");
    assert(writes.length === 1, "successful verification must persist once");
    assert(
      writes[0].has_required_discord_roles === true,
      "required roles must be recorded",
    );
    assert(
      writes[0].discord_verified_at === NOW,
      "verification time must match the server time",
    );
  });
});

Deno.test("Discord refresh rejects malformed member role payloads without writes", async () => {
  await withDiscordConfig(async () => {
    for (
      const payload of [
        { roles: EXPECTED_ROLE_IDS[0] },
        { roles: [1234567890123456], pending: false },
        { roles: EXPECTED_ROLE_IDS, pending: "false" },
        {
          roles: EXPECTED_ROLE_IDS,
          pending: false,
          user: { id: "other-discord-id" },
        },
      ]
    ) {
      const { client, writes } = fakeAdminClient();
      const result = await updateDiscordProfile(
        client,
        "member-id",
        { id: "member-id" },
        activeProfile(),
        "discord-id",
        NOW,
        {
          fetchImpl: (() =>
            Promise.resolve(Response.json(payload))) as typeof fetch,
        },
      );

      assert(
        result.ok === false && result.status === 502,
        "malformed Discord role state must fail closed",
      );
      assert(
        writes.length === 0,
        "malformed Discord role state must not overwrite verified evidence",
      );
    }
  });
});

function activeProfile() {
  return {
    member_status: "active",
    display_name: "Guild Member",
    has_required_discord_roles: true,
    discord_checked_at: NOW,
    discord_verified_at: NOW,
  };
}

function fakeAdminClient(
  upsertError: { code: string; message: string } | null = null,
) {
  const writes: Record<string, unknown>[] = [];
  const client = {
    from(table: string) {
      assert(
        table === "member_profiles",
        "Discord refresh may write only member_profiles",
      );
      return {
        async upsert(payload: Record<string, unknown>) {
          writes.push(payload);
          return { error: upsertError };
        },
      };
    },
  } as unknown as Parameters<typeof updateDiscordProfile>[0];

  return { client, writes };
}

async function withDiscordConfig(run: () => Promise<void>) {
  const names = [
    "DISCORD_GUILD_ID",
    "DISCORD_REQUIRED_ROLE_IDS",
    "DISCORD_BOT_TOKEN",
  ];
  const previous = new Map(names.map((name) => [name, Deno.env.get(name)]));
  Deno.env.set("DISCORD_GUILD_ID", EXPECTED_GUILD_ID);
  Deno.env.set("DISCORD_REQUIRED_ROLE_IDS", EXPECTED_ROLE_IDS.join(","));
  Deno.env.set("DISCORD_BOT_TOKEN", "test-only-token");

  try {
    await run();
  } finally {
    for (const name of names) {
      const value = previous.get(name);
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

async function assertRejects(run: () => Promise<unknown>, message: string) {
  try {
    await run();
  } catch {
    return;
  }
  throw new Error(message);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
