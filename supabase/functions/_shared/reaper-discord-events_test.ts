import {
  DISCORD_EVENT_ENTITY_EXTERNAL,
  DISCORD_EVENT_PRIVACY_GUILD_ONLY,
  desiredEventsFromSchedule,
  eventCoverImageData,
  eventLocation,
  managedEventLine,
  recurrenceRule,
  scheduledEventBody,
} from "./reaper-discord-events.ts";
import { siteUrl } from "./public-origins.ts";

Deno.test("desiredEventsFromSchedule shapes monthly and weekly website schedule events", () => {
  const events = desiredEventsFromSchedule(
    {
      timezone: { offsetMinutes: 0 },
      discordCoverVersion: "v2",
      monthly: {
        raffle: {
          id: "monthly-raffle",
          title: "Monthly Raffle",
          description: "Guild monthly raffle",
          location: siteUrl("events#raffle"),
          discordLocation: "Mochirii Hall",
          startTime: "20:00",
          endTime: "21:00",
          discordCoverImage: "assets/images/reaper.webp",
          discordEventId: "123456789012345678",
          discordDuplicateEventIds: ["223456789012345678", "bad"],
          discordRecurrenceRule: {
            frequency: 1,
            interval: 1,
            by_n_weekday: [{ n: 1, day: 6 }],
          },
        },
      },
      weekly: [
        {
          id: "training",
          discord: true,
          title: "Training",
          description: "Weekly training",
          location: siteUrl("events#training"),
          discordLocation: "Training Grounds",
          startTime: "22:00",
          endTime: "23:00",
          days: [5],
        },
      ],
    },
    new Date("2026-07-02T12:00:00.000Z"),
  );

  assertEquals(events.length, 2);

  const monthly = events.find((event) => event.key === "monthly-raffle");
  assert(monthly, "monthly event should exist");
  assertEquals(monthly.startIso, "2026-07-04T20:00:00.000Z");
  assertEquals(monthly.endIso, "2026-07-04T21:00:00.000Z");
  assertEquals(monthly.location, "Mochirii Hall");
  assertEquals(monthly.canonicalEventId, "123456789012345678");
  assertEquals(monthly.duplicateEventIds, ["223456789012345678"]);
  assert(monthly.coverImageUrl?.startsWith(siteUrl("assets/images/reaper.webp?v=v2")));
  assertEquals(monthly.recurrenceRule?.start, monthly.startIso);

  const weekly = events.find((event) => event.key === "training-5");
  assert(weekly, "weekly event should exist");
  assertEquals(weekly.startIso, "2026-07-03T22:00:00.000Z");
  assertEquals(weekly.endIso, "2026-07-03T23:00:00.000Z");
});

Deno.test("scheduledEventBody preserves Discord event contract and limits text fields", async () => {
  const body = await scheduledEventBody(
    {
      key: "long",
      title: "T".repeat(120),
      description: "D".repeat(1_200),
      location: "L".repeat(140),
      websiteLocation: siteUrl("events"),
      startIso: "2026-07-04T20:00:00.000Z",
      endIso: "2026-07-04T21:00:00.000Z",
      coverImageUrl: null,
      canonicalEventId: null,
      duplicateEventIds: [],
      recurrenceRule: recurrenceRule({ frequency: 1, interval: 1 }, "2026-07-04T20:00:00.000Z"),
    },
    false,
  );

  assertEquals(body.channel_id, null);
  assertEquals(String(body.name).length, 100);
  assertEquals(String(body.description).length, 1_000);
  assertEquals(body.privacy_level, DISCORD_EVENT_PRIVACY_GUILD_ONLY);
  assertEquals(body.entity_type, DISCORD_EVENT_ENTITY_EXTERNAL);
  assertEquals(String(asRecord(body.entity_metadata).location).length, 100);
  assertEquals(asRecord(body.recurrence_rule).start, "2026-07-04T20:00:00.000Z");
});

Deno.test("eventCoverImageData sends Discord-safe headers and rejects unsupported images", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; accept: string; userAgent: string }> = [];
  try {
    globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
      calls.push({
        url: String(input),
        accept: String(new Headers(init?.headers).get("Accept") || ""),
        userAgent: String(new Headers(init?.headers).get("User-Agent") || ""),
      });
      return Promise.resolve(
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { "Content-Type": "image/jpeg" },
        }),
      );
    }) as typeof fetch;

    const data = await eventCoverImageData(siteUrl("assets/test-cover.jpg?case=valid"), "Mochirii-Test/1.0");
    assert(data.startsWith("data:image/jpeg;base64,"));
    assertEquals(calls[0], {
      url: siteUrl("assets/test-cover.jpg?case=valid"),
      accept: "image/png,image/jpeg,image/webp",
      userAgent: "Mochirii-Test/1.0",
    });

    globalThis.fetch = (() =>
      Promise.resolve(
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { "Content-Type": "text/html" },
        }),
      )) as typeof fetch;

    await assertRejects(
      () => eventCoverImageData(siteUrl("assets/test-cover.html?case=invalid"), "Mochirii-Test/1.0"),
      "unsupported content type should reject",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("eventLocation and managedEventLine preserve Reaper summary formatting", () => {
  assertEquals(eventLocation({ entity_metadata: { location: "Training Grounds" } }), "Training Grounds");
  assertEquals(managedEventLine("Updated", eventStub("Training"), "event 123"), "Updated: Training (event 123)");
  assertEquals(managedEventLine("Created", eventStub("Training")), "Created: Training");
});

function eventStub(title: string) {
  return {
    key: "event",
    title,
    description: title,
    location: "Training Grounds",
    websiteLocation: siteUrl("events"),
    startIso: "2026-07-04T20:00:00.000Z",
    endIso: "2026-07-04T21:00:00.000Z",
    coverImageUrl: null,
    canonicalEventId: null,
    duplicateEventIds: [],
    recurrenceRule: null,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) throw new Error(message || "Expected assertion to pass.");
}

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`);
  }
}

async function assertRejects(fn: () => Promise<unknown>, message: string): Promise<void> {
  try {
    await fn();
  } catch {
    return;
  }
  throw new Error(message);
}
