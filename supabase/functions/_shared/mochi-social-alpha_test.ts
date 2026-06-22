import {
  ALPHA_TERMS_VERSION,
  UNITY_ROOM_KEY,
  UNITY_SHARED_PET_KEY,
  alphaAccess,
  requireGameServer,
  requireUser,
  unityCustomId,
  upsertSharedPetSnapshot,
  upsertUnityPlayerLink,
} from "./mochi-social-alpha.ts";

type QueryResponse = { data: unknown; error: { message: string } | null };

class MockSupabaseClient {
  testers = new Map<string, Record<string, unknown>>();
  terms = new Set<string>();
  existingSharedPet: Record<string, unknown> | null = null;
  upserts: Array<{ table: string; row: Record<string, unknown>; options?: Record<string, unknown> }> = [];

  from(table: string) {
    return new MockQuery(this, table);
  }
}

class MockQuery {
  private filters = new Map<string, unknown>();
  private pendingUpsert: Record<string, unknown> | null = null;
  private pendingOptions?: Record<string, unknown>;

  constructor(private readonly client: MockSupabaseClient, private readonly table: string) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.set(column, value);
    return this;
  }

  upsert(row: Record<string, unknown>, options?: Record<string, unknown>) {
    this.pendingUpsert = row;
    this.pendingOptions = options;
    this.client.upserts.push({ table: this.table, row, options });
    return this;
  }

  maybeSingle(): Promise<QueryResponse> {
    if (this.table === "mochi_social_alpha_testers") {
      return Promise.resolve({ data: this.client.testers.get(String(this.filters.get("user_id"))) || null, error: null });
    }

    if (this.table === "mochi_social_terms_acknowledgements") {
      const key = `${this.filters.get("user_id")}:${this.filters.get("terms_version")}`;
      return Promise.resolve({
        data: this.client.terms.has(key)
          ? {
            user_id: this.filters.get("user_id"),
            terms_version: this.filters.get("terms_version"),
            acknowledged_at: "2026-06-22T00:00:00.000Z",
          }
          : null,
        error: null,
      });
    }

    if (this.table === "mochi_social_shared_pet_snapshots") {
      return Promise.resolve({ data: this.client.existingSharedPet, error: null });
    }

    return Promise.resolve({ data: null, error: null });
  }

  single(): Promise<QueryResponse> {
    if (!this.pendingUpsert) return Promise.resolve({ data: null, error: { message: "missing upsert" } });

    if (this.table === "mochi_social_unity_players") {
      return Promise.resolve({
        data: {
          ...this.pendingUpsert,
          created_at: "2026-06-22T00:00:00.000Z",
          updated_at: this.pendingUpsert.updated_at,
        },
        error: null,
      });
    }

    if (this.table === "mochi_social_shared_pet_snapshots") {
      this.client.existingSharedPet = {
        ...this.pendingUpsert,
        updated_at: this.pendingUpsert.updated_at,
      };
      return Promise.resolve({ data: this.client.existingSharedPet, error: null });
    }

    return Promise.resolve({ data: null, error: null });
  }

  get options() {
    return this.pendingOptions;
  }
}

Deno.test("Mochi Social alpha access requires active tester and terms", async () => {
  const userId = "00000000-0000-4000-8000-000000000001";
  const client = new MockSupabaseClient();

  let access = await alphaAccess(client as never, userId);
  assert(access.ok === true, "lookup should succeed");
  assert(access.hasAccess === false, "missing tester row must not have access");
  assert(access.termsAccepted === false, "missing terms row must not count as accepted");

  client.testers.set(userId, { user_id: userId, status: "paused" });
  client.terms.add(`${userId}:${ALPHA_TERMS_VERSION}`);
  access = await alphaAccess(client as never, userId);
  assert(access.hasAccess === false, "paused tester must not have access");
  assert(access.termsAccepted === true, "terms row should count as accepted");

  client.testers.set(userId, { user_id: userId, status: "active" });
  access = await alphaAccess(client as never, userId);
  assert(access.hasAccess === true, "active tester should have access");
  assert(access.termsAccepted === true, "active tester with terms should be accepted");
});

Deno.test("Mochi Social signed-out and game-token gates fail closed", async () => {
  await withEnv({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "local-test-service-role-key",
  }, async () => {
    const result = await requireUser(new Request("https://example.test/mochi-social-unity-auth", { method: "POST" }));
    assert(result.ok === false, "signed-out request must be rejected");
    assert(result.response.status === 401, `expected signed-out 401, got ${result.response.status}`);
    const body = await result.response.json();
    assert(body.error === "missing_auth", `expected missing_auth, got ${body.error}`);
  });

  await withEnv({ MOCHI_SOCIAL_GAME_SERVER_TOKEN: "expected-token" }, () => {
    const missing = requireGameServer(new Request("https://example.test/mochi-social-alpha-action", { method: "POST" }));
    assert(missing.ok === false, "missing game token must be rejected");
    assert(missing.response.status === 401, `expected token 401, got ${missing.response.status}`);

    const valid = requireGameServer(new Request("https://example.test/mochi-social-alpha-action", {
      method: "POST",
      headers: { "x-mochi-social-server-token": "expected-token" },
    }));
    assert(valid.ok === true, "matching game token should be accepted");
  });
});

Deno.test("Mochi Social Unity player links use Mochirii Custom ID", async () => {
  const userId = "00000000-0000-4000-8000-000000000002";
  const client = new MockSupabaseClient();
  const customId = unityCustomId(userId);

  const result = await upsertUnityPlayerLink(client as never, {
    userId,
    unityPlayerId: "unity-player-1",
    customId,
    roomKey: UNITY_ROOM_KEY,
  });

  assert(result.ok === true, result.ok ? "" : result.error);
  assert(result.link.custom_id === `mochirii:${userId}`, "custom ID should be stable and scoped");
  assert(result.link.room_key === UNITY_ROOM_KEY, "Unity player link should stay in Jade Lantern room");
  assert(client.upserts[0].table === "mochi_social_unity_players", "expected unity player upsert");
  assert(client.upserts[0].options?.onConflict === "user_id", "Unity player link must be idempotent by user");
});

Deno.test("Mochi Social shared pet mirror accepts only shared Lirabao state", async () => {
  const client = new MockSupabaseClient();
  const validState = {
    version: 1,
    petId: UNITY_SHARED_PET_KEY,
    displayName: "Lirabao",
    mood: "comforted",
    state: "care_received",
    careMeter: 66,
    bondTier: 3,
    revision: 4,
  };

  const wrongPet = await upsertSharedPetSnapshot(client as never, {
    petKey: "jintari",
    roomKey: UNITY_ROOM_KEY,
    state: validState,
  });
  assert(wrongPet.ok === false, "non-Lirabao pet mirror should be rejected");
  assert(wrongPet.error === "invalid_unity_room_pet", `unexpected error ${wrongPet.error}`);

  const invalidState = await upsertSharedPetSnapshot(client as never, {
    petKey: UNITY_SHARED_PET_KEY,
    roomKey: UNITY_ROOM_KEY,
    state: { ...validState, state: "custom_pet_upload" },
  });
  assert(invalidState.ok === false, "invalid pet state should be rejected");
  assert(invalidState.error === "invalid_shared_pet_state", `unexpected error ${invalidState.error}`);

  const saved = await upsertSharedPetSnapshot(client as never, {
    petKey: UNITY_SHARED_PET_KEY,
    roomKey: UNITY_ROOM_KEY,
    state: validState,
    sourceRequestId: "request-1",
    lastActorId: "tester-a",
  });
  assert(saved.ok === true, saved.ok ? "" : saved.error);
  assert(saved.snapshot !== null, "saved shared pet snapshot should be present");
  assert(saved.snapshot.revision === 1, `expected first mirror revision 1, got ${saved.snapshot.revision}`);
  assert(saved.snapshot.petKey === UNITY_SHARED_PET_KEY, "snapshot should use Lirabao key");
  assert(saved.snapshot.roomKey === UNITY_ROOM_KEY, "snapshot should use Jade Lantern room");
  assert(saved.snapshot.lastActorId === "tester-a", "snapshot should preserve last actor");

  client.existingSharedPet = {
    pet_key: UNITY_SHARED_PET_KEY,
    room_key: UNITY_ROOM_KEY,
    revision: 8,
    state: validState,
    updated_at: "2026-06-22T00:00:00.000Z",
  };
  const updated = await upsertSharedPetSnapshot(client as never, {
    state: { ...validState, state: "happy", mood: "playful", revision: 5 },
  });
  assert(updated.ok === true, updated.ok ? "" : updated.error);
  assert(updated.snapshot !== null, "updated shared pet snapshot should be present");
  assert(updated.snapshot.revision === 9, `expected mirror revision 9, got ${updated.snapshot.revision}`);
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function withEnv<T>(values: Record<string, string>, callback: () => T | Promise<T>): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const [name, value] of Object.entries(values)) {
    previous.set(name, Deno.env.get(name));
    Deno.env.set(name, value);
  }

  try {
    return await callback();
  } finally {
    for (const [name, value] of previous.entries()) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}
