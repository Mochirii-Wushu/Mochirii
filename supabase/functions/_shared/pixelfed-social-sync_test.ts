import {
  constantTimeEquals,
  parsePixelfedSocialSyncPayload,
  PIXELFED_SOCIAL_SYNC_MAX_SKEW_MS,
  PIXELFED_SOCIAL_SYNC_SECRET_HEADER,
} from "./pixelfed-social-sync.ts";
import { socialUrl } from "./public-origins.ts";
import {
  SOCIAL_EXPECTED_DISCORD_GUILD_ID,
  SOCIAL_EXPECTED_REQUIRED_ROLE_IDS,
  type SocialDiscordMembershipResult,
} from "./social-discord-membership.ts";
import {
  handleSyncPixelfedSocialAccountRequest,
  type SyncPixelfedSocialAccountDependencies,
} from "../sync-pixelfed-social-account/index.ts";

const now = Date.parse("2026-07-04T10:00:00.000Z");
const userId = "8ccaa7af-909f-44e7-84cb-67cdccb56be6";
const discordUserId = "123456789012345678";
const syncSecret = "test-only-sync-value";
const validPayload = {
  sub: userId,
  provider_user_id: "1",
  username: "faylui_4d9519c2",
  profile_url: socialUrl("faylui_4d9519c2"),
  event: "login",
  timestamp: "2026-07-04T10:00:00.000Z",
};

Deno.test("Pixelfed social sync payload accepts the expected first-login shape", () => {
  const parsed = parsePixelfedSocialSyncPayload(validPayload, now);
  assert(
    parsed.username === "faylui_4d9519c2",
    "username should be normalized and preserved",
  );
  assert(parsed.event === "login", "event should be login");
});

Deno.test("Pixelfed social sync payload accepts a bounded access recheck", () => {
  const parsed = parsePixelfedSocialSyncPayload({
    ...validPayload,
    event: "access_check",
  }, now);
  assert(
    parsed.event === "access_check",
    "event should preserve the access check",
  );
});

Deno.test("Pixelfed social sync payload rejects stale timestamps", () => {
  assertThrowsMessage(
    () =>
      parsePixelfedSocialSyncPayload(
        {
          ...validPayload,
          timestamp: new Date(now - PIXELFED_SOCIAL_SYNC_MAX_SKEW_MS - 1000)
            .toISOString(),
        },
        now,
      ),
    "timestamp",
  );
});

Deno.test("Pixelfed social sync payload rejects off-domain profile URLs", () => {
  assertThrowsMessage(
    () =>
      parsePixelfedSocialSyncPayload(
        {
          ...validPayload,
          profile_url: "https://example.com/faylui_4d9519c2",
        },
        now,
      ),
    "profile_url",
  );
});

Deno.test("constantTimeEquals compares equal and different secrets", () => {
  assert(
    constantTimeEquals("secret", "secret") === true,
    "matching secrets should pass",
  );
  assert(
    constantTimeEquals("secret", "Secret") === false,
    "case-mismatched secrets should fail",
  );
  assert(
    constantTimeEquals("secret", "secret-longer") === false,
    "different-length secrets should fail",
  );
});

Deno.test("Social sync fails closed without writing when current Discord membership is unavailable", async () => {
  const harness = createAdminHarness();
  const { dependencies, membershipInputs } = createDependencies(
    harness,
    { status: "unavailable", reason: "network" },
  );

  const response = await handleSyncPixelfedSocialAccountRequest(
    syncRequest(),
    dependencies,
  );
  assert(response.status === 503, "Discord unavailability should return 503");
  assertJsonEquals(await response.json(), {
    ok: false,
    error: "discord_verification_unavailable",
  });
  assert(
    harness.writes.length === 0,
    "Discord unavailability must not write account state",
  );
  assert(
    membershipInputs.length === 1,
    "current Discord membership should be checked exactly once",
  );
  assertJsonEquals(membershipInputs[0], {
    discordUserId,
    configuredGuildId: SOCIAL_EXPECTED_DISCORD_GUILD_ID,
    configuredRequiredRoleIds: [...SOCIAL_EXPECTED_REQUIRED_ROLE_IDS],
    botToken: "test-only-discord-value",
  });
});

Deno.test("Social sync revokes only the requested account after exact Discord membership loss", async () => {
  const harness = createAdminHarness();
  const { dependencies } = createDependencies(
    harness,
    { status: "denied", reason: "not_member" },
  );

  const response = await handleSyncPixelfedSocialAccountRequest(
    syncRequest(),
    dependencies,
  );
  assert(response.status === 403, "membership loss should return 403");
  assertJsonEquals(await response.json(), {
    ok: false,
    error: "current_member_access_required",
  });
  assert(
    harness.writes.length === 1,
    "membership loss should perform exactly one write",
  );
  assertJsonEquals(harness.writes[0], {
    kind: "update",
    table: "social_accounts",
    values: {
      status: "revoked",
      profile_link_visible: false,
      federation_enabled: false,
      revoked_at: new Date(now).toISOString(),
      last_synced_at: new Date(now).toISOString(),
    },
    filters: [["user_id", userId], ["provider", "pixelfed"]],
  });
});

Deno.test("Social access checks upsert the current verified mapping without changing last login", async () => {
  const harness = createAdminHarness();
  const { dependencies } = createDependencies(harness, { status: "verified" });

  const response = await handleSyncPixelfedSocialAccountRequest(
    syncRequest("access_check"),
    dependencies,
  );
  assert(response.status === 200, "verified membership should return 200");
  assertJsonEquals(await response.json(), {
    ok: true,
    status: "synced",
    profileUrl: validPayload.profile_url,
  });
  assert(
    harness.writes.length === 1,
    "verified membership should perform exactly one write",
  );
  const write = harness.writes[0];
  assert(
    write.kind === "upsert",
    "verified membership should upsert the mapping",
  );
  assert(
    write.table === "social_accounts",
    "verified membership should write only social_accounts",
  );
  assertJsonEquals(write.options, { onConflict: "user_id,provider" });
  assertJsonEquals(write.values, {
    user_id: userId,
    member_profile_id: userId,
    provider: "pixelfed",
    provider_subject: userId,
    provider_user_id: validPayload.provider_user_id,
    username: validPayload.username,
    profile_url: validPayload.profile_url,
    status: "active",
    federation_enabled: false,
    last_synced_at: new Date(now).toISOString(),
    revoked_at: null,
  });
  assert(
    !Object.hasOwn(write.values, "last_login_at"),
    "access checks must not update last_login_at",
  );
});

Deno.test("Social sync write failures return bounded errors without leaking database details", async () => {
  const upsertHarness = createAdminHarness({
    upsertError: { code: "write_failed", message: "internal write detail" },
  });
  const upsertResponse = await handleSyncPixelfedSocialAccountRequest(
    syncRequest(),
    createDependencies(upsertHarness, { status: "verified" }).dependencies,
  );
  const upsertBody = await upsertResponse.text();
  assert(upsertResponse.status === 500, "upsert failure should return 500");
  assertJsonEquals(JSON.parse(upsertBody), {
    ok: false,
    error: "social_account_upsert_failed",
  });
  assert(
    !upsertBody.includes("internal write detail"),
    "upsert response must not leak database details",
  );

  const revokeHarness = createAdminHarness({
    revokeError: { code: "write_failed", message: "internal revoke detail" },
  });
  const revokeResponse = await handleSyncPixelfedSocialAccountRequest(
    syncRequest(),
    createDependencies(revokeHarness, {
      status: "denied",
      reason: "not_member",
    }).dependencies,
  );
  const revokeBody = await revokeResponse.text();
  assert(revokeResponse.status === 500, "revocation failure should return 500");
  assertJsonEquals(JSON.parse(revokeBody), {
    ok: false,
    error: "access_revocation_failed",
  });
  assert(
    !revokeBody.includes("internal revoke detail"),
    "revocation response must not leak database details",
  );
});

type DatabaseError = { code: string; message: string };
type WriteOperation = {
  kind: "update" | "upsert";
  table: string;
  values: Record<string, unknown>;
  filters?: [string, unknown][];
  options?: Record<string, unknown>;
};

function createAdminHarness({
  revokeError = null,
  upsertError = null,
}: {
  revokeError?: DatabaseError | null;
  upsertError?: DatabaseError | null;
} = {}) {
  const writes: WriteOperation[] = [];
  const client = {
    auth: {
      admin: {
        getUserById: () =>
          Promise.resolve({
            data: {
              user: {
                id: userId,
                identities: [{
                  provider: "discord",
                  identity_data: { sub: discordUserId },
                }],
              },
            },
            error: null,
          }),
      },
    },
    from(table: string) {
      if (table === "member_profiles") {
        const profileQuery = {
          select: () => profileQuery,
          eq: () => profileQuery,
          maybeSingle: () =>
            Promise.resolve({
              data: {
                id: userId,
                member_status: "active",
                discord_user_id: discordUserId,
              },
              error: null,
            }),
        };
        return profileQuery;
      }

      if (table !== "social_accounts") {
        throw new Error(`Unexpected table in test harness: ${table}`);
      }

      return {
        update(values: Record<string, unknown>) {
          const operation: WriteOperation = {
            kind: "update",
            table,
            values,
            filters: [],
          };
          writes.push(operation);
          const result = Promise.resolve({ data: null, error: revokeError });
          const builder = {
            eq(column: string, value: unknown) {
              operation.filters?.push([column, value]);
              return builder;
            },
            then: result.then.bind(result),
          };
          return builder;
        },
        upsert(
          values: Record<string, unknown>,
          options: Record<string, unknown>,
        ) {
          writes.push({ kind: "upsert", table, values, options });
          return Promise.resolve({ data: null, error: upsertError });
        },
      };
    },
  };

  return { client, writes };
}

function createDependencies(
  harness: ReturnType<typeof createAdminHarness>,
  membershipResult: SocialDiscordMembershipResult,
): {
  dependencies: SyncPixelfedSocialAccountDependencies;
  membershipInputs: Parameters<
    NonNullable<SyncPixelfedSocialAccountDependencies["checkDiscordMembership"]>
  >[0][];
} {
  const environment: Record<string, string> = {
    PIXELFED_SOCIAL_SYNC_SECRET: syncSecret,
    SUPABASE_URL: "https://project.invalid",
    DISCORD_GUILD_ID: SOCIAL_EXPECTED_DISCORD_GUILD_ID,
    DISCORD_REQUIRED_ROLE_IDS: SOCIAL_EXPECTED_REQUIRED_ROLE_IDS.join(","),
    DISCORD_BOT_TOKEN: "test-only-discord-value",
  };
  const membershipInputs: Parameters<
    NonNullable<SyncPixelfedSocialAccountDependencies["checkDiscordMembership"]>
  >[0][] = [];
  return {
    dependencies: {
      readEnv: (name) => environment[name] || "",
      readServiceRoleKey: () => "test-only-service-role-value",
      createAdminClient: () => harness.client as never,
      checkDiscordMembership: async (input) => {
        membershipInputs.push(input);
        return membershipResult;
      },
      now: () => now,
    },
    membershipInputs,
  };
}

function syncRequest(event = validPayload.event): Request {
  return new Request(
    "https://project.invalid/functions/v1/sync-pixelfed-social-account",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [PIXELFED_SOCIAL_SYNC_SECRET_HEADER]: syncSecret,
      },
      body: JSON.stringify({ ...validPayload, event }),
    },
  );
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertThrowsMessage(
  callback: () => unknown,
  expectedMessagePart: string,
): void {
  try {
    callback();
  } catch (error) {
    assert(error instanceof Error, "expected thrown value to be an Error");
    assert(
      error.message.includes(expectedMessagePart),
      `expected error message to include ${expectedMessagePart}`,
    );
    return;
  }

  throw new Error("expected callback to throw");
}

function assertJsonEquals(actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  assert(
    actualJson === expectedJson,
    `expected ${expectedJson}, received ${actualJson}`,
  );
}
