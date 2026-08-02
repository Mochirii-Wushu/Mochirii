import {
  confirmedNotPublishedEvidenceIsSafe,
  type EventSocialReconciliationProviderConfig,
  eventSocialReconciliationPublicDto,
  type EventSocialReconciliationSnapshot,
  parseEventSocialReconciliationEvidence,
  parseEventSocialReconciliationSnapshot,
  verifyEventSocialProviderPublication,
} from "./event-social-reconciliation.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${
        JSON.stringify(actual)
      }`,
    );
  }
}

const JOB_ID = "11111111-1111-4111-8111-111111111111";
const UPDATED_AT = "2026-07-31T12:00:00.000Z";
const EMPTY_HASH =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const GUILD_PARTY_META_ASSET =
  "/assets/img/event-social/guild-party/facebook.c0f07fb423af74d61e03511a311afb90449e41f8857bdbff5110a2387afc3c9e.jpg";
const GUILD_PARTY_INSTAGRAM_ASSET =
  "/assets/img/event-social/guild-party/instagram.c0f07fb423af74d61e03511a311afb90449e41f8857bdbff5110a2387afc3c9e.jpg";
const GUILD_PARTY_DISCORD_ASSET =
  "/assets/img/event-social/guild-party/discord.3c973ff0e04fafa629ce4872e192fddc7759bf48541cb5a6e7fa4a2e8d8eebf2.png";
const GUILD_PARTY_DISCORD_FILENAME =
  "discord.3c973ff0e04fafa629ce4872e192fddc7759bf48541cb5a6e7fa4a2e8d8eebf2.png";

function snapshotRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    destination_enabled: false,
    job: {
      id: JOB_ID,
      destination: "facebook_page",
      status: "reconcile_required",
      message: "Guild Party begins in one hour.",
      alt_text: "Mōchirīī Guild Party event artwork.",
      media_path: GUILD_PARTY_META_ASSET,
      media_sha256: EMPTY_HASH,
      provider_primary_id: null,
      provider_secondary_id: null,
      provider_permalink: null,
      updated_at: UPDATED_AT,
      ...overrides,
    },
  };
}

function parsedSnapshot(
  overrides: Record<string, unknown> = {},
): EventSocialReconciliationSnapshot {
  const value = parseEventSocialReconciliationSnapshot(
    snapshotRow(overrides),
    JOB_ID,
  );
  assert(value, "test snapshot did not parse");
  return value;
}

function config(
  overrides: Partial<EventSocialReconciliationProviderConfig> = {},
): EventSocialReconciliationProviderConfig {
  return {
    facebook: {
      ready: true,
      appSecret: "test-app-secret",
      pageId: "987654321",
      accessToken: "test-facebook-token",
    },
    instagram: {
      ready: true,
      appSecret: "test-app-secret",
      accountId: "17841400000000000",
      accessToken: "test-instagram-token",
    },
    discord: {
      ready: true,
      guildId: "1078630751077142608",
      channelId: "123456789012345678",
      botToken: "test-discord-token",
    },
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes));
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

Deno.test("snapshot parsing derives a disabled destination and rejects unsafe state", () => {
  const snapshot = parsedSnapshot();
  assertEquals(
    {
      id: snapshot.id,
      destination: snapshot.destination,
      status: snapshot.status,
      destinationEnabled: snapshot.destinationEnabled,
    },
    {
      id: JOB_ID,
      destination: "facebook_page",
      status: "reconcile_required",
      destinationEnabled: false,
    },
    "safe snapshot identity drifted",
  );
  const enabled = snapshotRow();
  enabled.destination_enabled = true;
  assert(
    parseEventSocialReconciliationSnapshot(enabled, JOB_ID) === null,
    "enabled destination passed the reconciliation boundary",
  );
  assert(
    parseEventSocialReconciliationSnapshot(
      snapshotRow({ status: "published" }),
      JOB_ID,
    ) === null,
    "non-reconcilable status passed the snapshot boundary",
  );
});

Deno.test("confirmed-not-published requires a note and no identifiers", () => {
  const snapshot = parsedSnapshot();
  const emptyEvidence = parseEventSocialReconciliationEvidence({});
  assert(emptyEvidence, "empty evidence did not parse");
  assert(
    confirmedNotPublishedEvidenceIsSafe(
      snapshot,
      emptyEvidence,
      "Inspected the pinned destination and found no publication.",
    ),
    "safe no-publication evidence was rejected",
  );
  const withId = parseEventSocialReconciliationEvidence({
    provider_primary_id: "123456",
  });
  assert(withId, "identifier evidence did not parse");
  assert(
    !confirmedNotPublishedEvidenceIsSafe(snapshot, withId, "Inspected."),
    "no-publication resolution accepted a provider id",
  );
  assert(
    !confirmedNotPublishedEvidenceIsSafe(snapshot, emptyEvidence, "   "),
    "no-publication resolution accepted an empty note",
  );
});

Deno.test("Facebook readback verifies exact Page ownership and canonical permalink", async () => {
  const postPermalink = "https://www.facebook.com/987654321/posts/987654320";
  const snapshot = parsedSnapshot({
    provider_primary_id: "123456789",
    provider_secondary_id: "987654320",
    provider_permalink: postPermalink,
  });
  const evidence = parseEventSocialReconciliationEvidence({
    provider_primary_id: "123456789",
    provider_secondary_id: "987654320",
    provider_permalink: postPermalink,
  });
  assert(evidence, "Facebook evidence did not parse");
  const calls: string[] = [];
  const fetchImpl: typeof fetch = (input, init) => {
    const url = String(input);
    calls.push(url);
    assert(
      new Headers(init?.headers).get("authorization") ===
        "Bearer test-facebook-token",
      "Facebook token was not sent in Authorization",
    );
    assert(!url.includes("access_token"), "Facebook token leaked into the URL");
    const objectId = new URL(url).pathname.split("/").at(-1);
    return Promise.resolve(jsonResponse({
      id: objectId,
      from: { id: "987654321" },
      link: objectId === "987654320"
        ? postPermalink
        : "https://www.facebook.com/photo.php?fbid=123456789",
    }));
  };
  const result = await verifyEventSocialProviderPublication(
    snapshot,
    evidence,
    config(),
    { fetchImpl },
  );
  assert(result.ok, "Facebook Page readback failed");
  assertEquals(
    result.evidence,
    {
      providerPrimaryId: "123456789",
      providerSecondaryId: "987654320",
      providerPermalink: postPermalink,
    },
    "Facebook verified evidence drifted",
  );
  assert(calls.length === 2, "Facebook did not read back both objects");
});

Deno.test("Facebook readback fails closed on a Page ownership mismatch without reflecting provider text", async () => {
  const snapshot = parsedSnapshot({
    provider_primary_id: "123456789",
    provider_secondary_id: "987654320",
  });
  const evidence = parseEventSocialReconciliationEvidence({
    provider_primary_id: "123456789",
    provider_secondary_id: "987654320",
  });
  assert(evidence, "Facebook evidence did not parse");
  const result = await verifyEventSocialProviderPublication(
    snapshot,
    evidence,
    config(),
    {
      fetchImpl: (input) => {
        const objectId = new URL(String(input)).pathname.split("/").at(-1);
        const isPost = objectId === "987654320";
        return Promise.resolve(jsonResponse({
          id: objectId,
          from: { id: isPost ? "111111111" : "987654321" },
          link: isPost
            ? "https://www.facebook.com/111111111/posts/987654320"
            : "https://www.facebook.com/photo.php?fbid=123456789",
          error: isPost
            ? { message: "private raw provider detail" }
            : undefined,
        }));
      },
    },
  );
  assert(!result.ok, "Facebook ownership mismatch passed readback");
  assert(
    !JSON.stringify(result).includes("private raw provider detail"),
    "raw Facebook response escaped the readback boundary",
  );
});

Deno.test("Instagram readback pins the account, username, image type, and permalink", async () => {
  const snapshot = parsedSnapshot({
    destination: "instagram",
    media_path: GUILD_PARTY_INSTAGRAM_ASSET,
    provider_secondary_id: "17900000000000000",
  });
  const evidence = parseEventSocialReconciliationEvidence({
    provider_primary_id: "18000000000000000",
    provider_secondary_id: "17900000000000000",
    provider_permalink: "https://instagram.com/p/TestCode123/",
  });
  assert(evidence, "Instagram evidence did not parse");
  const result = await verifyEventSocialProviderPublication(
    snapshot,
    evidence,
    config(),
    {
      fetchImpl: (input, init) => {
        const url = String(input);
        assert(
          new Headers(init?.headers).get("authorization") ===
            "Bearer test-instagram-token",
          "Instagram token was not sent in Authorization",
        );
        assert(
          !url.includes("access_token"),
          "Instagram token leaked into URL",
        );
        return Promise.resolve(jsonResponse({
          id: "18000000000000000",
          owner: { id: "17841400000000000" },
          username: "mochirii_guild",
          media_type: "IMAGE",
          permalink: "https://www.instagram.com/p/TestCode123/",
        }));
      },
    },
  );
  assert(result.ok, "Instagram readback failed");
  assertEquals(
    result.evidence,
    {
      providerPrimaryId: "18000000000000000",
      providerSecondaryId: "17900000000000000",
      providerPermalink: "https://www.instagram.com/p/TestCode123/",
    },
    "Instagram verified evidence drifted",
  );
});

Deno.test("Instagram readback rejects username or media-type drift", async () => {
  const snapshot = parsedSnapshot({
    destination: "instagram",
    media_path: GUILD_PARTY_INSTAGRAM_ASSET,
    provider_secondary_id: "17900000000000000",
  });
  const evidence = parseEventSocialReconciliationEvidence({
    provider_primary_id: "18000000000000000",
  });
  assert(evidence, "Instagram evidence did not parse");
  const result = await verifyEventSocialProviderPublication(
    snapshot,
    evidence,
    config(),
    {
      fetchImpl: () =>
        Promise.resolve(jsonResponse({
          id: "18000000000000000",
          owner: { id: "17841400000000000" },
          username: "different_account",
          media_type: "VIDEO",
          permalink: "https://www.instagram.com/p/TestCode123/",
        })),
    },
  );
  assert(!result.ok, "Instagram identity drift passed readback");
});

Deno.test("Instagram reconciliation rejects a client-only container identity", async () => {
  const snapshot = parsedSnapshot({
    destination: "instagram",
    media_path: GUILD_PARTY_INSTAGRAM_ASSET,
  });
  const evidence = parseEventSocialReconciliationEvidence({
    provider_primary_id: "18000000000000000",
    provider_secondary_id: "17900000000000000",
  });
  assert(evidence, "Instagram evidence did not parse");
  let providerCalls = 0;
  const result = await verifyEventSocialProviderPublication(
    snapshot,
    evidence,
    config(),
    {
      fetchImpl: () => {
        providerCalls += 1;
        return Promise.resolve(jsonResponse({}));
      },
    },
  );
  assert(!result.ok, "client-only Instagram container identity was adopted");
  assert(
    providerCalls === 0,
    "provider readback ran with an unpinned container",
  );
});

Deno.test("Discord readback verifies bot, channel, message, content, attachment, and hash", async () => {
  const media = new Uint8Array([1, 2, 3, 4, 5, 6]);
  const mediaSha256 = await sha256Hex(media);
  const snapshot = parsedSnapshot({
    destination: "discord",
    media_path: GUILD_PARTY_DISCORD_ASSET,
    media_sha256: mediaSha256,
  });
  const evidence = parseEventSocialReconciliationEvidence({
    provider_primary_id: "345678901234567890",
  });
  assert(evidence, "Discord evidence did not parse");
  const apiCalls: string[] = [];
  const fetchImpl: typeof fetch = (input, init) => {
    const url = String(input);
    if (url.startsWith("https://discord.com/api/v10/")) {
      apiCalls.push(url);
      assert(
        new Headers(init?.headers).get("authorization") ===
          "Bot test-discord-token",
        "Discord bot token was not sent in Authorization",
      );
    }
    if (url.endsWith("/users/@me")) {
      return Promise.resolve(jsonResponse({
        id: "234567890123456789",
        bot: true,
      }));
    }
    if (url.endsWith("/channels/123456789012345678")) {
      return Promise.resolve(jsonResponse({
        id: "123456789012345678",
        guild_id: "1078630751077142608",
        type: 0,
      }));
    }
    if (
      url.endsWith(
        "/channels/123456789012345678/messages/345678901234567890",
      )
    ) {
      return Promise.resolve(jsonResponse({
        id: "345678901234567890",
        channel_id: "123456789012345678",
        author: { id: "234567890123456789", bot: true },
        content: snapshot.message,
        attachments: [{
          id: "456789012345678901",
          filename: GUILD_PARTY_DISCORD_FILENAME,
          description: snapshot.altText,
          content_type: "image/png",
          size: media.length,
          url:
            `https://cdn.discordapp.com/attachments/123456789012345678/456789012345678901/${GUILD_PARTY_DISCORD_FILENAME}?ex=1&is=2&hm=3`,
        }],
      }));
    }
    if (url.startsWith("https://cdn.discordapp.com/attachments/")) {
      assert(
        !new Headers(init?.headers).has("authorization"),
        "Discord token leaked to the attachment CDN",
      );
      return Promise.resolve(
        new Response(media, {
          headers: {
            "Content-Type": "image/png",
            "Content-Length": String(media.length),
          },
        }),
      );
    }
    throw new Error(`Unexpected test URL: ${url}`);
  };
  const result = await verifyEventSocialProviderPublication(
    snapshot,
    evidence,
    config(),
    { fetchImpl },
  );
  assert(result.ok, "Discord readback failed");
  assertEquals(
    result.evidence,
    {
      providerPrimaryId: "345678901234567890",
      providerSecondaryId: null,
      providerPermalink: null,
    },
    "Discord verified evidence drifted",
  );
  assert(
    apiCalls.length === 3,
    "Discord readback did not make three API reads",
  );
});

Deno.test("Discord readback rejects content and attachment-hash mismatches", async () => {
  const approvedMedia = new Uint8Array([1, 2, 3]);
  const fetchedMedia = new Uint8Array([9, 8, 7]);
  const snapshot = parsedSnapshot({
    destination: "discord",
    media_path: GUILD_PARTY_DISCORD_ASSET,
    media_sha256: await sha256Hex(approvedMedia),
  });
  const evidence = parseEventSocialReconciliationEvidence({
    provider_primary_id: "345678901234567890",
  });
  assert(evidence, "Discord evidence did not parse");
  const fetchImpl: typeof fetch = (input) => {
    const url = String(input);
    if (url.endsWith("/users/@me")) {
      return Promise.resolve(jsonResponse({
        id: "234567890123456789",
        bot: true,
      }));
    }
    if (url.endsWith("/channels/123456789012345678")) {
      return Promise.resolve(jsonResponse({
        id: "123456789012345678",
        guild_id: "1078630751077142608",
        type: 0,
      }));
    }
    if (url.includes("/messages/345678901234567890")) {
      return Promise.resolve(jsonResponse({
        id: "345678901234567890",
        channel_id: "123456789012345678",
        author: { id: "234567890123456789", bot: true },
        content: snapshot.message,
        attachments: [{
          id: "456789012345678901",
          filename: GUILD_PARTY_DISCORD_FILENAME,
          description: snapshot.altText,
          content_type: "image/png",
          size: fetchedMedia.length,
          url:
            `https://cdn.discordapp.com/attachments/123456789012345678/456789012345678901/${GUILD_PARTY_DISCORD_FILENAME}?ex=1&is=2&hm=3`,
        }],
      }));
    }
    return Promise.resolve(
      new Response(fetchedMedia, {
        headers: { "Content-Type": "image/png" },
      }),
    );
  };
  const result = await verifyEventSocialProviderPublication(
    snapshot,
    evidence,
    config(),
    { fetchImpl },
  );
  assert(!result.ok, "Discord attachment hash mismatch passed readback");
  assert(
    result.error === "discord_reconciliation_attachment_mismatch",
    "Discord mismatch returned an unstable public category",
  );
});

Deno.test("public reconciliation DTO excludes provider evidence and private job content", () => {
  const snapshot = parsedSnapshot();
  const dto = eventSocialReconciliationPublicDto(
    {
      committed: true,
      destination_enabled: false,
      job: {
        id: JOB_ID,
        destination: "facebook_page",
        status: "published",
        updated_at: "2026-07-31T12:01:00.000Z",
        provider_primary_id: "123456789",
        provider_permalink: "https://www.facebook.com/photo.php?fbid=123456789",
        message: "private copy",
        media_sha256: EMPTY_HASH,
      },
    },
    snapshot,
    "confirmed_published",
  );
  assert(dto, "safe reconciliation DTO did not parse");
  const serialized = JSON.stringify(dto);
  for (
    const forbidden of [
      "provider",
      "permalink",
      "private copy",
      EMPTY_HASH,
      "media",
    ]
  ) {
    assert(
      !serialized.toLowerCase().includes(forbidden.toLowerCase()),
      `public DTO leaked ${forbidden}`,
    );
  }
});
