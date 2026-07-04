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
} from "./mochi-pets-alpha.ts";

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
    if (this.table === "mochi_pets_alpha_testers") {
      return Promise.resolve({ data: this.client.testers.get(String(this.filters.get("user_id"))) || null, error: null });
    }

    if (this.table === "mochi_pets_terms_acknowledgements") {
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

    if (this.table === "mochi_pets_shared_pet_snapshots") {
      return Promise.resolve({ data: this.client.existingSharedPet, error: null });
    }

    return Promise.resolve({ data: null, error: null });
  }

  single(): Promise<QueryResponse> {
    if (!this.pendingUpsert) return Promise.resolve({ data: null, error: { message: "missing upsert" } });

    if (this.table === "mochi_pets_unity_players") {
      return Promise.resolve({
        data: {
          ...this.pendingUpsert,
          created_at: "2026-06-22T00:00:00.000Z",
          updated_at: this.pendingUpsert.updated_at,
        },
        error: null,
      });
    }

    if (this.table === "mochi_pets_shared_pet_snapshots") {
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

Deno.test("Mochi Pets alpha access requires active tester and terms", async () => {
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

Deno.test("Mochi Pets signed-out and game-token gates fail closed", async () => {
  await withEnv({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "local-test-service-role-key",
  }, async () => {
    const result = await requireUser(new Request("https://example.test/mochi-pets-unity-auth", { method: "POST" }));
    assert(result.ok === false, "signed-out request must be rejected");
    assert(result.response.status === 401, `expected signed-out 401, got ${result.response.status}`);
    const body = await result.response.json();
    assert(body.error === "missing_auth", `expected missing_auth, got ${body.error}`);
  });

  await withEnv({ MOCHI_PETS_GAME_SERVER_TOKEN: "expected-token" }, () => {
    const missing = requireGameServer(new Request("https://example.test/mochi-pets-alpha-action", { method: "POST" }));
    assert(missing.ok === false, "missing game token must be rejected");
    assert(missing.response.status === 401, `expected token 401, got ${missing.response.status}`);

    const valid = requireGameServer(new Request("https://example.test/mochi-pets-alpha-action", {
      method: "POST",
      headers: { "x-mochi-pets-server-token": "expected-token" },
    }));
    assert(valid.ok === true, "matching game token should be accepted");
  });
});

Deno.test("Mochi Pets Unity player links use Mochirii Custom ID", async () => {
  const userId = "00000000-0000-4000-8000-000000000002";
  const client = new MockSupabaseClient();
  const customId = unityCustomId(userId);

  const wrongCustomId = await upsertUnityPlayerLink(client as never, {
    userId,
    unityPlayerId: "unity-player-1",
    customId: `guest:${userId}`,
    roomKey: UNITY_ROOM_KEY,
  });
  assert(wrongCustomId.ok === false, "non-Mochirii Custom ID should be rejected");
  assert(wrongCustomId.error === "invalid_unity_custom_id", `unexpected error ${wrongCustomId.error}`);
  assert(client.upserts.length === 0, "invalid Unity Custom ID must not write a player link");

  const wrongRoom = await upsertUnityPlayerLink(client as never, {
    userId,
    unityPlayerId: "unity-player-1",
    customId,
    roomKey: "other-room",
  });
  assert(wrongRoom.ok === false, "wrong Unity room should be rejected");
  assert(wrongRoom.error === "invalid_unity_room", `unexpected error ${wrongRoom.error}`);
  assert(client.upserts.length === 0, "invalid Unity room must not write a player link");

  const result = await upsertUnityPlayerLink(client as never, {
    userId,
    unityPlayerId: "unity-player-1",
    customId,
    roomKey: UNITY_ROOM_KEY,
  });

  assert(result.ok === true, result.ok ? "" : result.error);
  assert(result.link.custom_id === `mochirii:${userId}`, "custom ID should be stable and scoped");
  assert(result.link.room_key === UNITY_ROOM_KEY, "Unity player link should stay in Jade Lantern room");
  assert(client.upserts[0].table === "mochi_pets_unity_players", "expected unity player upsert");
  assert(client.upserts[0].options?.onConflict === "user_id", "Unity player link must be idempotent by user");
});

Deno.test("Mochi Pets shared pet mirror accepts only shared Lirabao state", async () => {
  const client = new MockSupabaseClient();
  const actorId = "00000000-0000-4000-8000-000000000004";
  const validState = {
    version: 1,
    petId: UNITY_SHARED_PET_KEY,
    displayName: "Lirabao",
    mood: "comforted",
    state: "care_received",
    careMeter: 66,
    bondTier: 3,
    lastInteractionUnixSeconds: 1790000000,
    lastInteractionBy: actorId,
    revision: 4,
    writeLock: "4:1790000000",
  };

  const wrongPet = await upsertSharedPetSnapshot(client as never, {
    petKey: "jintari",
    roomKey: UNITY_ROOM_KEY,
    state: validState,
  });
  assert(wrongPet.ok === false, "non-Lirabao pet mirror should be rejected");
  assert(wrongPet.error === "invalid_unity_room_pet", `unexpected error ${wrongPet.error}`);

  const wrongRoom = await upsertSharedPetSnapshot(client as never, {
    petKey: UNITY_SHARED_PET_KEY,
    roomKey: "other-room",
    state: validState,
  });
  assert(wrongRoom.ok === false, "wrong room mirror should be rejected");
  assert(wrongRoom.error === "invalid_unity_room_pet", `unexpected error ${wrongRoom.error}`);

  const invalidState = await upsertSharedPetSnapshot(client as never, {
    petKey: UNITY_SHARED_PET_KEY,
    roomKey: UNITY_ROOM_KEY,
    state: { ...validState, state: "custom_pet_upload" },
  });
  assert(invalidState.ok === false, "invalid pet state should be rejected");
  assert(invalidState.error === "invalid_shared_pet_state", `unexpected error ${invalidState.error}`);

  const renamedPet = await upsertSharedPetSnapshot(client as never, {
    petKey: UNITY_SHARED_PET_KEY,
    roomKey: UNITY_ROOM_KEY,
    state: { ...validState, displayName: "Other pet" },
  });
  assert(renamedPet.ok === false, "impostor shared pet display names should be rejected");
  assert(renamedPet.error === "invalid_shared_pet_state", `unexpected error ${renamedPet.error}`);

  const invalidMood = await upsertSharedPetSnapshot(client as never, {
    petKey: UNITY_SHARED_PET_KEY,
    roomKey: UNITY_ROOM_KEY,
    state: { ...validState, mood: "market-ready" },
  });
  assert(invalidMood.ok === false, "non-curated shared pet moods should be rejected");
  assert(invalidMood.error === "invalid_shared_pet_state", `unexpected error ${invalidMood.error}`);

  const missingMetadata = await upsertSharedPetSnapshot(client as never, {
    petKey: UNITY_SHARED_PET_KEY,
    roomKey: UNITY_ROOM_KEY,
    state: { ...validState, writeLock: "" },
    lastActorId: actorId,
  });
  assert(missingMetadata.ok === false, "shared pet mirror must require write-lock metadata");
  assert(missingMetadata.error === "invalid_shared_pet_state", `unexpected error ${missingMetadata.error}`);

  const actorMismatch = await upsertSharedPetSnapshot(client as never, {
    petKey: UNITY_SHARED_PET_KEY,
    roomKey: UNITY_ROOM_KEY,
    state: { ...validState, lastInteractionBy: "00000000-0000-4000-8000-000000000099" },
    lastActorId: actorId,
  });
  assert(actorMismatch.ok === false, "shared pet state actor must match the verified player id");
  assert(actorMismatch.error === "invalid_shared_pet_actor", `unexpected error ${actorMismatch.error}`);

  const missingActor = await upsertSharedPetSnapshot(client as never, {
    petKey: UNITY_SHARED_PET_KEY,
    roomKey: UNITY_ROOM_KEY,
    state: validState,
  });
  assert(missingActor.ok === false, "shared pet mirror must require a verified member actor");
  assert(missingActor.error === "invalid_shared_pet_actor", `unexpected error ${missingActor.error}`);

  const saved = await upsertSharedPetSnapshot(client as never, {
    petKey: UNITY_SHARED_PET_KEY,
    roomKey: UNITY_ROOM_KEY,
    state: validState,
    sourceRequestId: "request-1",
    lastActorId: actorId.toUpperCase(),
  });
  assert(saved.ok === true, saved.ok ? "" : saved.error);
  assert(saved.snapshot !== null, "saved shared pet snapshot should be present");
  assert(saved.snapshot.revision === 1, `expected first mirror revision 1, got ${saved.snapshot.revision}`);
  assert(saved.snapshot.petKey === UNITY_SHARED_PET_KEY, "snapshot should use Lirabao key");
  assert(saved.snapshot.roomKey === UNITY_ROOM_KEY, "snapshot should use Jade Lantern room");
  assert(saved.snapshot.lastActorId === actorId, "snapshot should preserve normalized last actor");
  const petUpsert = client.upserts.find((entry) => entry.table === "mochi_pets_shared_pet_snapshots");
  assert(petUpsert !== undefined, "expected shared pet mirror upsert");
  assert(petUpsert.row.pet_key === UNITY_SHARED_PET_KEY, "shared pet mirror must use Lirabao key");
  assert(petUpsert.row.room_key === UNITY_ROOM_KEY, "shared pet mirror must use Jade Lantern room");
  assert(petUpsert.row.source_request_id === "request-1", "shared pet mirror should preserve source request");
  assert(petUpsert.row.last_actor_id === actorId, "shared pet mirror should preserve normalized last actor row");
  assert(petUpsert.options?.onConflict === "pet_key", "shared pet mirror must be idempotent by pet");

  client.existingSharedPet = {
    pet_key: UNITY_SHARED_PET_KEY,
    room_key: UNITY_ROOM_KEY,
    revision: 8,
    state: validState,
    updated_at: "2026-06-22T00:00:00.000Z",
  };
  const updated = await upsertSharedPetSnapshot(client as never, {
    state: { ...validState, state: "happy", mood: "playful", revision: 5 },
    lastActorId: actorId,
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
