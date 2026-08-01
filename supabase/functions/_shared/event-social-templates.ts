import {
  type EventSocialDestination,
  eventSocialMediaPathIsSafe,
} from "./event-social-schedule.ts";

export type EventSocialTemplateProjection = {
  sourceEventId: string;
  destination: EventSocialDestination;
  messageTemplate: string;
  altTextTemplate: string;
  mediaPath: string;
  mediaSha256: string | null;
};

export type EventSocialTemplatePacket = {
  contentContractVersion: string;
  contentSha256: string;
  templates: readonly EventSocialTemplateProjection[];
};

const EVENT_IDS = [
  "monthly-gathering",
  "monthly-raffle",
  "guild-party",
  "breaking-army",
  "showdown",
  "guild-wars",
  "guild-heros-realm",
  "united-resolve",
] as const;
const PLATFORM_DESTINATIONS = {
  facebook: "facebook_page",
  instagram: "instagram",
  discord: "discord",
} as const satisfies Record<string, EventSocialDestination>;
const URL_LIKE_RE =
  /https?:\/\/|\bwww\.|(?:^|[^\p{L}\p{N}_-])(?:[\p{L}\p{N}-]+\.)+(?:[\p{L}]{2,63}|xn--[a-z0-9-]{2,59})(?=$|[^\p{L}\p{N}_-])/iu;

export const EVENT_SOCIAL_CONTENT_CONTRACT_VERSION = "event-social-content-v2";
export const EVENT_SOCIAL_CONTENT_SHA256 =
  "fc01b6fdfd7f21259aae6764e82bdb550ea61ff31d2a446eb9b6f2b26ef28c4b";

export const EVENT_SOCIAL_MEDIA_SHA256 = Object.freeze(
  {
    "monthly-gathering:facebook":
      "3720a28e06bf434e63b877d97dfbf0af5ac72610d38e3fb030263946b1d2e787",
    "monthly-gathering:instagram":
      "3720a28e06bf434e63b877d97dfbf0af5ac72610d38e3fb030263946b1d2e787",
    "monthly-gathering:discord":
      "b10e9b8de972aa33b4497dfc8900f2e63a4f437eeb16668134f8ecab9af35d76",
    "monthly-raffle:facebook":
      "72dd15868270aa1a8568272d730fcbb5f3d507525780e39b533eeacd0439385f",
    "monthly-raffle:instagram":
      "72dd15868270aa1a8568272d730fcbb5f3d507525780e39b533eeacd0439385f",
    "monthly-raffle:discord":
      "310dbb78add1cbe44a57c88d41fb6a69b5dde10606fe1f54b5029bc19fc753f9",
    "guild-party:facebook":
      "c0f07fb423af74d61e03511a311afb90449e41f8857bdbff5110a2387afc3c9e",
    "guild-party:instagram":
      "c0f07fb423af74d61e03511a311afb90449e41f8857bdbff5110a2387afc3c9e",
    "guild-party:discord":
      "3c973ff0e04fafa629ce4872e192fddc7759bf48541cb5a6e7fa4a2e8d8eebf2",
    "breaking-army:facebook":
      "9d822a38586fdd9954484341062dc8d2b8ae218875a226f3fd9bddaadef3f1a3",
    "breaking-army:instagram":
      "9d822a38586fdd9954484341062dc8d2b8ae218875a226f3fd9bddaadef3f1a3",
    "breaking-army:discord":
      "343202530a793d311ec225b6bdec3ecae422b273478f075caa4b7af7e40b70d9",
    "showdown:facebook":
      "0746d7848d3200ba91b8e10cc4b07a9baed034ff2c1351947beb0d1bff47b61b",
    "showdown:instagram":
      "0746d7848d3200ba91b8e10cc4b07a9baed034ff2c1351947beb0d1bff47b61b",
    "showdown:discord":
      "89655c54f1c8550e3d08c992af3cba6f99d0345fee5b4c0eac4b9a456a0795b7",
    "guild-wars:facebook":
      "d4dee4f1d0a16f54ebf850886f5625040a981400d0d09abb360b151a540de9e9",
    "guild-wars:instagram":
      "d4dee4f1d0a16f54ebf850886f5625040a981400d0d09abb360b151a540de9e9",
    "guild-wars:discord":
      "ad5cc36b0b170ca21adf2cbc07159b2f0a5ee739a0c9037f6315a6a17b8d013c",
    "guild-heros-realm:facebook":
      "50c34cc0a486981d895bcf7806457d2b2113209850bb1c28207b393075c90ed4",
    "guild-heros-realm:instagram":
      "50c34cc0a486981d895bcf7806457d2b2113209850bb1c28207b393075c90ed4",
    "guild-heros-realm:discord":
      "b5636fb84a44b22fac19f735a0eac501faf7db52409c939e3ee60569be249b0e",
    "united-resolve:facebook":
      "ced933fdb65f3667655f17827d4bc4452d1a9bafe8514d2dc42ded3e75ed7376",
    "united-resolve:instagram":
      "ced933fdb65f3667655f17827d4bc4452d1a9bafe8514d2dc42ded3e75ed7376",
    "united-resolve:discord":
      "642fa333e1cabf3fda9f5b14d721b7b2d658eeb7547e14eef62c8bd14f8fcf56",
  } as const satisfies Readonly<Record<string, string | null>>,
);

const BUNDLED_EVENT_SOCIAL_COPY = [
  {
    id: "monthly-gathering",
    altTextTemplate:
      "Mōchirīī Monthly Guild Gathering reminder artwork with the guild seal and cupcake mark. Text reads: ‘Starts in one hour. Monthly Guild Gathering.’ A notice says the gathering replaces that day's Guild Party and attendance still qualifies for the in-game Guild Party attendance reward.",
    captions: {
      facebook:
        "Mōchirīī’s Monthly Guild Gathering begins in one hour. {{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8. Bring your questions, comments, concerns, and suggestions. This gathering replaces the Guild Party scheduled for {{EVENT_DATE}}. Attendance still qualifies for the in-game Guild Party attendance reward. What should we add to the agenda?",
      instagram:
        "Starts in one hour.\nMonthly Guild Gathering\n{{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8\nBring one xianxia-themed guild idea with your questions, comments, concerns, and suggestions. This gathering replaces the Guild Party scheduled for {{EVENT_DATE}}. Attendance still qualifies for the in-game Guild Party attendance reward.\nWhat should we add to the agenda?",
      discord:
        "**Monthly Guild Gathering starts in one hour.**\n{{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8\nBring your questions, comments, concerns, and suggestions.\nThis gathering replaces the Guild Party scheduled for {{EVENT_DATE}}. Attendance still qualifies for the in-game Guild Party attendance reward.\nReply with an agenda item.",
    },
  },
  {
    id: "monthly-raffle",
    altTextTemplate:
      "Mōchirīī Monthly Guild Raffle reminder artwork with the guild seal and cupcake mark. Text reads: ‘Starts in one hour. Monthly Guild Raffle.’ A notice says the raffle replaces that day's Guild Party and attendance still qualifies for the in-game Guild Party attendance reward.",
    captions: {
      facebook:
        "The Monthly Guild Raffle begins in one hour. {{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8. Meet at Guild Base Pool for the drawing. This raffle replaces the Guild Party scheduled for {{EVENT_DATE}}. Attendance still qualifies for the in-game Guild Party attendance reward. Who’s joining the draw?",
      instagram:
        "Starts in one hour.\nMonthly Guild Raffle\n{{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8\nMeet at Guild Base Pool for the drawing. This raffle replaces the Guild Party scheduled for {{EVENT_DATE}}. Attendance still qualifies for the in-game Guild Party attendance reward.\nCupcake luck—who’s joining?",
      discord:
        "**Monthly Guild Raffle starts in one hour.**\n{{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8\nMeet at Guild Base Pool for the drawing.\nThis raffle replaces the Guild Party scheduled for {{EVENT_DATE}}. Attendance still qualifies for the in-game Guild Party attendance reward.\nReply if you’re joining.",
    },
  },
  {
    id: "guild-party",
    altTextTemplate:
      "Mōchirīī Guild Party reminder artwork with the guild seal and cupcake mark. Text reads: ‘Starts in one hour. Guild Party.’",
    captions: {
      facebook:
        "Guild Party begins in one hour. {{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8. Join Mōchirīī in Where Winds Meet for today’s Guild Party. Who’s checking in?",
      instagram:
        "Starts in one hour.\nGuild Party\n{{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8\nJoin the guild in game for today’s Guild Party.\nWushu land roll call: are you joining?",
      discord:
        "**Guild Party starts in one hour.**\n{{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8\nMōchī roll call: reply if you’re joining in game.",
    },
  },
  {
    id: "breaking-army",
    altTextTemplate:
      "Mōchirīī Breaking Army reminder artwork with the guild seal and cupcake mark. Text reads: ‘Starts in one hour. Breaking Army.’",
    captions: {
      facebook:
        "Breaking Army begins in one hour. {{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8. Check your build, confirm your role, and be ready to coordinate at the start. What role are you bringing?",
      instagram:
        "Starts in one hour.\nBreaking Army\n{{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8\nCheck your build and confirm your role before the start.\nWhat role are you bringing?",
      discord:
        "**Breaking Army starts in one hour.**\n{{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8\nWuxia fighters, check your build and confirm your role. Reply with the role you’re bringing.",
    },
  },
  {
    id: "showdown",
    altTextTemplate:
      "Mōchirīī Showdown reminder artwork with the guild seal and cupcake mark. Text reads: ‘Starts in one hour. Showdown.’",
    captions: {
      facebook:
        "Showdown begins in one hour. {{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8. Review your build and party plan before the start. Which setup are you bringing?",
      instagram:
        "Starts in one hour.\nShowdown\n{{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8\nReview your build and party plan before the start.\nWhich setup are you bringing?",
      discord:
        "**Showdown starts in one hour.**\n{{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8\nReview your build and party plan. Reply with the setup you’re bringing.",
    },
  },
  {
    id: "guild-wars",
    altTextTemplate:
      "Mōchirīī Guild Wars reminder artwork with the guild seal and cupcake mark. Text reads: ‘Starts in one hour. Guild Wars.’",
    captions: {
      facebook:
        "Guild Wars begins in one hour. {{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8. Be online before the start so parties and roles can be set. Who’s joining?",
      instagram:
        "Starts in one hour.\nGuild Wars\n{{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8\nBring a pretty look and a battle-ready build.\nWho’s joining?",
      discord:
        "**Guild Wars starts in one hour.**\n{{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8\nBe online before the start so parties and roles can be set. Reply if you’re joining.",
    },
  },
  {
    id: "guild-heros-realm",
    altTextTemplate:
      "Mōchirīī Guild Hero's Realm reminder artwork with the guild seal and cupcake mark. Text reads: ‘Starts in one hour. Guild Hero's Realm.’",
    captions: {
      facebook:
        "Guild Hero’s Realm begins in one hour. {{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8. Bring your questions and preferred role; Mōchirīī will organize parties before entry. What help do you need?",
      instagram:
        "Starts in one hour.\nGuild Hero’s Realm\n{{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8\nBring your questions and preferred role. Parties will be organized before entry.\nWhat help do you need?",
      discord:
        "**Guild Hero’s Realm starts in one hour.**\n{{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8\nBring your questions and preferred role. Reply with the help you need before parties are organized.",
    },
  },
  {
    id: "united-resolve",
    altTextTemplate:
      "Mōchirīī United Resolve reminder artwork with the guild seal and cupcake mark. Text reads: ‘Starts in one hour. United Resolve.’",
    captions: {
      facebook:
        "United Resolve begins in one hour. {{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8. Continue with Mōchirīī after Hero’s Realm and be ready at the start. Who still needs a party?",
      instagram:
        "Starts in one hour.\nUnited Resolve\n{{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8\nContinue after Hero’s Realm and be ready at the start.\nJianghu roll call: who still needs a party?",
      discord:
        "**United Resolve starts in one hour.**\n{{EVENT_DATE}} · {{EVENT_TIME_RANGE}} UTC+8\nMake this a wonderful finish to the event window. Reply if you still need a party.",
    },
  },
] as const;

function bundledMediaPath(
  eventId: typeof EVENT_IDS[number],
  platform: keyof typeof PLATFORM_DESTINATIONS,
): string {
  const mediaSha256 = (
    EVENT_SOCIAL_MEDIA_SHA256 as Readonly<Record<string, string | null>>
  )[`${eventId}:${platform}`];
  if (!mediaSha256 || !/^[0-9a-f]{64}$/.test(mediaSha256)) {
    throw new TypeError("The event-social media inventory is incomplete.");
  }
  return `/assets/img/event-social/${eventId}/${platform}.${mediaSha256}.${
    platform === "discord" ? "png" : "jpg"
  }`;
}

export const EVENT_SOCIAL_TEMPLATE_PROJECTION = Object.freeze(
  BUNDLED_EVENT_SOCIAL_COPY.flatMap((event) =>
    Object.entries(PLATFORM_DESTINATIONS).map(
      ([platform, destination]) =>
        Object.freeze({
          sourceEventId: event.id,
          destination,
          messageTemplate:
            event.captions[platform as keyof typeof event.captions],
          altTextTemplate: event.altTextTemplate,
          mediaPath: bundledMediaPath(
            event.id,
            platform as keyof typeof PLATFORM_DESTINATIONS,
          ),
          mediaSha256: (
            EVENT_SOCIAL_MEDIA_SHA256 as Readonly<Record<string, string | null>>
          )[`${event.id}:${platform}`],
        }),
    )
  ),
) satisfies readonly EventSocialTemplateProjection[];

export const EVENT_SOCIAL_TEMPLATE_PACKET = Object.freeze({
  contentContractVersion: EVENT_SOCIAL_CONTENT_CONTRACT_VERSION,
  contentSha256: EVENT_SOCIAL_CONTENT_SHA256,
  templates: EVENT_SOCIAL_TEMPLATE_PROJECTION,
}) satisfies EventSocialTemplatePacket;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  return JSON.stringify(Object.keys(value).sort()) ===
    JSON.stringify([...expected].sort());
}

function stringValue(value: unknown, maximum: number): string | null {
  const text = typeof value === "string" ? value : "";
  return text && text === text.trim() && text.length <= maximum ? text : null;
}

function hasExactTokens(value: string): boolean {
  const matches: string[] = value.match(/\{\{[A-Z0-9_]+\}\}/g) ?? [];
  return matches.includes("{{EVENT_DATE}}") &&
    matches.includes("{{EVENT_TIME_RANGE}}") &&
    matches.every((token) =>
      token === "{{EVENT_DATE}}" || token === "{{EVENT_TIME_RANGE}}"
    );
}

export function projectEventSocialTemplates(
  value: unknown,
  mediaHashes: Readonly<Record<string, string | null>> =
    EVENT_SOCIAL_MEDIA_SHA256,
): EventSocialTemplateProjection[] | null {
  const manifest = record(value);
  const publication = record(manifest.publication);
  const publicationPlatforms = record(publication.platforms);
  const events = Array.isArray(manifest.events) ? manifest.events : [];
  if (
    manifest.schemaVersion !== 1 ||
    publication.enabledByDefault !== false ||
    !exactKeys(publicationPlatforms, Object.keys(PLATFORM_DESTINATIONS)) ||
    Object.values(publicationPlatforms).some((enabled) => enabled !== false) ||
    events.length !== EVENT_IDS.length
  ) return null;

  const templates: EventSocialTemplateProjection[] = [];
  for (let index = 0; index < EVENT_IDS.length; index += 1) {
    const event = record(events[index]);
    const eventId = EVENT_IDS[index];
    const creative = record(event.creative);
    const platformAssets = record(creative.platformAssets);
    const platforms = record(event.platforms);
    const altTextTemplate = stringValue(creative.altText, 500);
    if (
      event.id !== eventId || event.scheduleId !== eventId ||
      !altTextTemplate || /\{\{/.test(altTextTemplate) ||
      !exactKeys(platformAssets, Object.keys(PLATFORM_DESTINATIONS)) ||
      !exactKeys(platforms, Object.keys(PLATFORM_DESTINATIONS))
    ) return null;

    for (
      const [platform, selectedDestination] of Object.entries(
        PLATFORM_DESTINATIONS,
      )
    ) {
      const platformCopy = record(platforms[platform]);
      const messageTemplate = stringValue(platformCopy.captionTemplate, 500);
      const rawMediaPath = stringValue(platformAssets[platform], 300);
      const mediaPath = rawMediaPath?.startsWith("./")
        ? rawMediaPath.slice(1)
        : "";
      const mediaSha256 = mediaHashes[`${eventId}:${platform}`] ?? null;
      const expectedMediaPath = mediaSha256
        ? `/assets/img/event-social/${eventId}/${platform}.${mediaSha256}.${
          platform === "discord" ? "png" : "jpg"
        }`
        : "";
      if (
        platformCopy.publicationEnabled !== false || !messageTemplate ||
        !hasExactTokens(messageTemplate) ||
        URL_LIKE_RE.test(messageTemplate) ||
        URL_LIKE_RE.test(altTextTemplate) ||
        !eventSocialMediaPathIsSafe(mediaPath, selectedDestination) ||
        !/^[0-9a-f]{64}$/.test(mediaSha256 ?? "") ||
        mediaPath !== expectedMediaPath
      ) return null;
      templates.push({
        sourceEventId: eventId,
        destination: selectedDestination,
        messageTemplate,
        altTextTemplate,
        mediaPath,
        mediaSha256,
      });
    }
  }
  return templates;
}
