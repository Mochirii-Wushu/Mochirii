import {
  deriveEventSocialOccurrences,
  EVENT_SOCIAL_SCHEDULE,
  eventSocialDestinationEnabled,
  eventSocialMediaPathIsSafe,
  eventSocialPublishWindowState,
} from "./event-social-schedule.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("event publication occurs exactly one hour before the committed schedule", () => {
  const occurrences = deriveEventSocialOccurrences(
    EVENT_SOCIAL_SCHEDULE,
    new Date("2026-08-05T00:00:00.000Z"),
    new Date("2026-08-05T23:59:59.000Z"),
  );
  const gathering = occurrences.find((item) =>
    item.sourceEventId === "monthly-gathering"
  );
  assert(gathering, "first-Wednesday Gathering was not derived");
  assert(
    gathering.startsAt === "2026-08-05T13:30:00.000Z",
    "Gathering start drifted",
  );
  assert(
    gathering.publishAt === "2026-08-05T12:30:00.000Z",
    "one-hour lead drifted",
  );
});

Deno.test("the exact one-hour publication window is under two minutes", () => {
  const publishAt = "2026-08-05T12:30:00.000Z";
  assert(
    eventSocialPublishWindowState(
      publishAt,
      new Date("2026-08-05T12:29:59.999Z"),
    ) === "early",
    "a just-before request was not held",
  );
  assert(
    eventSocialPublishWindowState(
      publishAt,
      new Date("2026-08-05T12:30:00.000Z"),
    ) === "due",
    "the exact target was not due",
  );
  assert(
    eventSocialPublishWindowState(
      publishAt,
      new Date("2026-08-05T12:31:59.999Z"),
    ) === "due",
    "a request inside the two-minute tolerance was rejected",
  );
  assert(
    eventSocialPublishWindowState(
      publishAt,
      new Date("2026-08-05T12:32:00.000Z"),
    ) === "missed",
    "the two-minute boundary was not suppressed",
  );
});

Deno.test("monthly Gathering and Raffle supersede only their same-time Guild Party", () => {
  const occurrences = deriveEventSocialOccurrences(
    EVENT_SOCIAL_SCHEDULE,
    new Date("2026-08-01T00:00:00.000Z"),
    new Date("2026-08-06T00:00:00.000Z"),
  );
  for (const date of ["2026-08-01", "2026-08-05"]) {
    const party = occurrences.find((item) =>
      item.sourceKey === `guild-party:${date}`
    );
    assert(
      party?.state === "superseded",
      `Guild Party was not superseded on ${date}`,
    );
    assert(
      party.supersededBySourceKey?.startsWith("monthly-"),
      "monthly owner was not recorded",
    );
  }
  const nextParty = occurrences.find((item) =>
    item.sourceKey === "guild-party:2026-08-02"
  );
  assert(
    nextParty?.state === "scheduled",
    "unrelated Guild Party was superseded",
  );
});

Deno.test("the manual August Breaking Army one-off creates no automated Friday reminder", () => {
  const occurrences = deriveEventSocialOccurrences(
    EVENT_SOCIAL_SCHEDULE,
    new Date("2026-08-05T00:00:00.000Z"),
    new Date("2026-08-13T00:00:00.000Z"),
  );
  assert(
    occurrences.some((item) =>
      item.sourceKey === "breaking-army:2026-08-05" &&
      item.state === "suppressed"
    ),
    "the August 5 Wednesday reminder was not explicitly suppressed",
  );
  assert(
    !occurrences.some((item) => item.sourceKey === "breaking-army:2026-08-07"),
    "the manual August 7 one-off was incorrectly added to automation",
  );
  assert(
    occurrences.some((item) =>
      item.sourceKey === "breaking-army:2026-08-12" &&
      item.state === "scheduled"
    ),
    "the normal following-Wednesday reminder did not resume",
  );
});

Deno.test("overnight event endings and destination media policy stay bounded", () => {
  const occurrences = deriveEventSocialOccurrences(
    EVENT_SOCIAL_SCHEDULE,
    new Date("2026-08-03T00:00:00.000Z"),
    new Date("2026-08-03T23:59:59.000Z"),
  );
  const breakingArmy = occurrences.find((item) =>
    item.sourceEventId === "breaking-army"
  );
  assert(
    breakingArmy?.startsAt === "2026-08-03T14:00:00.000Z",
    "start conversion drifted",
  );
  assert(
    breakingArmy.endsAt === "2026-08-03T16:00:00.000Z",
    "overnight end drifted",
  );
  assert(
    eventSocialMediaPathIsSafe("/assets/img/events/post.jpg", "instagram"),
    "JPEG rejected",
  );
  assert(
    !eventSocialMediaPathIsSafe("/assets/img/events/post.png", "instagram"),
    "Instagram PNG passed",
  );
  assert(
    eventSocialMediaPathIsSafe("/assets/img/events/post.png", "discord"),
    "Discord PNG rejected",
  );
  assert(
    !eventSocialMediaPathIsSafe(
      "https://example.com/post.jpg",
      "facebook_page",
    ),
    "external URL passed",
  );
  assert(eventSocialDestinationEnabled("true"), "exact true flag rejected");
  assert(!eventSocialDestinationEnabled("TRUE"), "non-exact flag passed");
});
