import {
  EVENT_SOCIAL_CONTENT_SHA256,
  EVENT_SOCIAL_MEDIA_SHA256,
  EVENT_SOCIAL_TEMPLATE_PACKET,
  EVENT_SOCIAL_TEMPLATE_PROJECTION,
  projectEventSocialTemplates,
} from "./event-social-templates.ts";

const EVENT_IDS = [
  "monthly-gathering",
  "monthly-raffle",
  "guild-party",
  "breaking-army",
  "showdown",
  "guild-wars",
  "guild-heros-realm",
  "united-resolve",
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function manifest() {
  return {
    schemaVersion: 1,
    publication: {
      enabledByDefault: false,
      platforms: { facebook: false, instagram: false, discord: false },
    },
    events: EVENT_IDS.map((eventId) => ({
      id: eventId,
      scheduleId: eventId,
      creative: {
        altText: `${eventId} reminder artwork`,
        platformAssets: Object.fromEntries(
          ["facebook", "instagram", "discord"].map((platform) => {
            const sha256 = (
              EVENT_SOCIAL_MEDIA_SHA256 as Readonly<
                Record<string, string | null>
              >
            )[`${eventId}:${platform}`];
            return [
              platform,
              `./assets/img/event-social/${eventId}/${platform}.${sha256}.${
                platform === "discord" ? "png" : "jpg"
              }`,
            ];
          }),
        ),
      },
      platforms: Object.fromEntries(
        ["facebook", "instagram", "discord"].map((platform) => [
          platform,
          {
            publicationEnabled: false,
            captionTemplate:
              `${eventId} {{EVENT_DATE}} {{EVENT_TIME_RANGE}} starts in one hour`,
          },
        ]),
      ),
    })),
  };
}

Deno.test("event template projection is exact, bounded, and pins every final asset", () => {
  const projected = projectEventSocialTemplates(manifest());
  assert(
    projected?.length === 24,
    "expected eight three-destination templates",
  );
  assert(
    projected.every((template) =>
      /^[0-9a-f]{64}$/.test(template.mediaSha256 || "")
    ),
    "a final asset hash was not pinned",
  );
  assert(
    projected.some((template) => template.destination === "facebook_page") &&
      projected.some((template) => template.destination === "instagram") &&
      projected.some((template) => template.destination === "discord"),
    "an independent destination was omitted",
  );
});

Deno.test("event template projection rejects manifest or enablement drift", () => {
  const enabled = manifest();
  enabled.publication.platforms.instagram = true;
  assert(
    projectEventSocialTemplates(enabled) === null,
    "an enabled public manifest passed the source-only boundary",
  );
  const reordered = manifest();
  [reordered.events[0], reordered.events[1]] = [
    reordered.events[1],
    reordered.events[0],
  ];
  assert(
    projectEventSocialTemplates(reordered) === null,
    "event inventory drift passed",
  );
  const mismatchedPath = manifest();
  mismatchedPath.events[0].creative.platformAssets.facebook =
    `./assets/img/event-social/monthly-gathering/facebook.${
      "0".repeat(64)
    }.jpg`;
  assert(
    projectEventSocialTemplates(mismatchedPath) === null,
    "a filename hash that differs from the pinned bytes passed",
  );
});

Deno.test("worker packet bundles the immutable reviewed projection", () => {
  assert(
    EVENT_SOCIAL_TEMPLATE_PROJECTION.length === 24,
    "bundled projection is incomplete",
  );
  assert(
    EVENT_SOCIAL_TEMPLATE_PACKET.templates === EVENT_SOCIAL_TEMPLATE_PROJECTION,
    "worker packet does not use the bundled projection",
  );
  assert(
    EVENT_SOCIAL_TEMPLATE_PACKET.contentSha256 ===
      EVENT_SOCIAL_CONTENT_SHA256,
    "worker packet content hash drifted",
  );
});
