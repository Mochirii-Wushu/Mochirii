import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export const EVENT_SOCIAL_EVENT_IDS = Object.freeze([
  "monthly-gathering",
  "monthly-raffle",
  "guild-party",
  "breaking-army",
  "showdown",
  "guild-wars",
  "guild-heros-realm",
  "united-resolve",
]);

export const EVENT_SOCIAL_PLATFORMS = Object.freeze(["facebook", "instagram", "discord"]);
export const EVENT_SOCIAL_TOKENS = Object.freeze(["{{EVENT_DATE}}", "{{EVENT_TIME_RANGE}}"]);

const TOP_LEVEL_KEYS = [
  "schemaVersion",
  "publication",
  "scheduleContract",
  "brand",
  "policy",
  "layouts",
  "events",
];
const PUBLICATION_KEYS = ["enabledByDefault", "platforms"];
const SCHEDULE_CONTRACT_KEYS = [
  "source",
  "timezone",
  "reminderOffsetMinutes",
  "lateDispatchPolicy",
  "requiredTokens",
];
const BRAND_KEYS = [
  "guildSealAsset",
  "cupcakeMarkAsset",
  "marksRequiredOnEveryCreative",
  "lockupPlacement",
  "equalVisualWeight",
  "captionAccentBounds",
];
const POLICY_KEYS = [
  "forbiddenPublicWords",
  "forbiddenPublicPhrases",
  "rejectLinks",
  "rejectDomains",
  "rejectHashtags",
  "exactGameNameInCaptions",
];
const EVENT_KEYS = ["id", "scheduleId", "title", "creative", "platforms"];
const CREATIVE_KEYS = [
  "artMasterAsset",
  "platformAssets",
  "badgeText",
  "titleText",
  "noticeText",
  "altText",
];
const PLATFORM_COPY_KEYS = ["publicationEnabled", "captionTemplate"];
const LAYOUT_KEYS = [
  "width",
  "height",
  "aspectRatio",
  "mimeType",
  "colorSpace",
  "safeInsetPercent",
  "minimumTextContrastRatio",
  "captionMaxCharacters",
  "altTextMaxCharacters",
  "maxOverlayTextLines",
];
const EXPECTED_LAYOUTS = Object.freeze({
  facebook: {
    width: 1080,
    height: 1350,
    aspectRatio: "4:5",
    mimeType: "image/jpeg",
    colorSpace: "sRGB",
    safeInsetPercent: 8,
    minimumTextContrastRatio: 4.5,
    captionMaxCharacters: 500,
    altTextMaxCharacters: 500,
    maxOverlayTextLines: 8,
  },
  instagram: {
    width: 1080,
    height: 1350,
    aspectRatio: "4:5",
    mimeType: "image/jpeg",
    colorSpace: "sRGB",
    safeInsetPercent: 8,
    minimumTextContrastRatio: 4.5,
    captionMaxCharacters: 500,
    altTextMaxCharacters: 500,
    maxOverlayTextLines: 8,
  },
  discord: {
    width: 1600,
    height: 640,
    aspectRatio: "5:2",
    mimeType: "image/png",
    colorSpace: "sRGB",
    safeInsetPercent: 5,
    minimumTextContrastRatio: 4.5,
    captionMaxCharacters: 500,
    altTextMaxCharacters: 500,
    maxOverlayTextLines: 6,
  },
});
const REQUIRED_FORBIDDEN_WORDS = Object.freeze([
  "warm",
  "warmth",
  "calm",
  "quiet",
  "cozy",
  "serene",
  "peaceful",
  "gentle",
  "soft",
  "shared",
]);
const REQUIRED_FORBIDDEN_PHRASES = Object.freeze([
  "shared run",
  "shared runs",
  "shared-run",
  "shared-runs",
  "link in bio",
  "link-in-bio",
  "qr code",
]);
const ACCENT_PATTERNS = Object.freeze({
  "Mōchirīī": /Mōchirīī/gu,
  "Mōchī": /Mōchī/gu,
  "Wushu land": /Wushu land/giu,
  pretty: /\bpretty\b/giu,
  cupcake: /\bcupcakes?\b/giu,
  wonderful: /\bwonderful\b/giu,
  "Where Winds Meet": /\bWhere Winds Meet\b/gu,
  wuxia: /\bwuxia\b/giu,
  xianxia: /\bxianxia\b/giu,
  Jianghu: /\bJianghu\b/giu,
});
const THEME_ACCENT_PATTERNS = Object.freeze({
  wuxia: /\bwuxia\b/iu,
  xianxia: /\bxianxia\b/iu,
  Jianghu: /\bJianghu\b/iu,
});
const UNKNOWN_TOKEN_PATTERN = /\{\{[A-Z0-9_]+\}\}/gu;
const HARD_CODED_CLOCK_PATTERN = /\b(?:[01]?\d|2[0-3])(?::[0-5]\d)?\s?(?:AM|PM)\b/iu;
const CALENDAR_OCCURRENCE_PATTERN = /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December)\b|\b\d{4}-\d{2}-\d{2}\b/iu;
const LINK_OR_DOMAIN_PATTERN = /https?:\/\/|\bwww\.|(?:^|[\s(])(?:[a-z0-9-]+\.)+(?:com|net|org|dev|app|gg|io)\b/iu;
const HASHTAG_PATTERN = /(^|\s)#[\p{L}\p{N}_]+/u;
const QR_PATTERN = /\bqr(?:\s+code)?\b/iu;
const LINK_IN_BIO_PATTERN = /\blink[\s-]+in[\s-]+bio\b/iu;
const GENERIC_SHARED_PATTERN = /\bshared[\s-]+(?:runs?|activities?|events?|sessions?)\b/iu;
const SHA256_RE = /^[0-9a-f]{64}$/u;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizedKeys(value) {
  return isPlainObject(value) ? Object.keys(value).sort() : [];
}

function normalizePunctuation(value) {
  return String(value || "")
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, '"');
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function countMatches(value, pattern) {
  return [...String(value || "").matchAll(pattern)].length;
}

function scheduleEvents(schedule) {
  const monthly = Object.values(schedule?.monthly || {});
  const weekly = Array.isArray(schedule?.weekly) ? schedule.weekly : [];
  return new Map([...monthly, ...weekly].map((event) => [event?.id, event]));
}

function publicStrings(event) {
  return [
    ["creative.badgeText", event?.creative?.badgeText],
    ["creative.titleText", event?.creative?.titleText],
    ["creative.noticeText", event?.creative?.noticeText],
    ["creative.altText", event?.creative?.altText],
    ...EVENT_SOCIAL_PLATFORMS.map((platform) => [
      `platforms.${platform}.captionTemplate`,
      event?.platforms?.[platform]?.captionTemplate,
    ]),
  ];
}

function assetFile(root, assetPath) {
  const normalized = String(assetPath || "").replace(/^\.\//u, "");
  return path.join(root, "apps", "web", "public", normalized);
}

export function eventSocialContentAddressedAssetPath(eventId, platform, sha256) {
  if (!EVENT_SOCIAL_EVENT_IDS.includes(eventId)) {
    throw new TypeError("A known event-social event ID is required.");
  }
  if (!EVENT_SOCIAL_PLATFORMS.includes(platform)) {
    throw new TypeError("A known event-social platform is required.");
  }
  if (typeof sha256 !== "string" || !SHA256_RE.test(sha256)) {
    throw new TypeError("A full lowercase SHA-256 is required.");
  }
  const extension = platform === "discord" ? "png" : "jpg";
  return `./assets/img/event-social/${eventId}/${platform}.${sha256}.${extension}`;
}

export function validateEventSocialContent({ manifest, schedule, root = process.cwd(), requireAssets = true }) {
  const failures = [];
  const fail = (message) => failures.push(message);

  function expectObject(label, value) {
    if (!isPlainObject(value)) {
      fail(`${label}: expected an object.`);
      return false;
    }
    return true;
  }

  function expectExactKeys(label, value, expectedKeys) {
    if (!expectObject(label, value)) return;
    const actual = normalizedKeys(value);
    const expected = [...expectedKeys].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      fail(`${label}: expected keys ${expected.join(", ")}; received ${actual.join(", ") || "none"}.`);
    }
  }

  function expectEqual(label, actual, expected) {
    if (actual !== expected) fail(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`);
  }

  function expectString(label, value, { allowEmpty = false } = {}) {
    if (typeof value !== "string" || (!allowEmpty && !value.trim())) {
      fail(`${label}: expected ${allowEmpty ? "a string" : "a non-empty string"}.`);
      return false;
    }
    if (value !== value.trim()) fail(`${label}: must not have leading or trailing whitespace.`);
    return true;
  }

  function validateTokenSet(label, value, requiredTokens = []) {
    if (typeof value !== "string") return;
    const discovered = [...new Set(value.match(UNKNOWN_TOKEN_PATTERN) || [])].sort();
    const unknown = discovered.filter((token) => !EVENT_SOCIAL_TOKENS.includes(token));
    if (unknown.length) fail(`${label}: unsupported tokens ${unknown.join(", ")}.`);
    requiredTokens.forEach((token) => {
      if (!value.includes(token)) fail(`${label}: missing required token ${token}.`);
    });
  }

  function validatePublicText(label, value) {
    if (!expectString(label, value)) return;
    const forbiddenWords = Array.isArray(manifest?.policy?.forbiddenPublicWords)
      ? manifest.policy.forbiddenPublicWords
      : [];
    const forbiddenPhrases = Array.isArray(manifest?.policy?.forbiddenPublicPhrases)
      ? manifest.policy.forbiddenPublicPhrases
      : [];

    forbiddenWords.forEach((word) => {
      const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "iu");
      if (pattern.test(value)) fail(`${label}: contains forbidden public word ${JSON.stringify(word)}.`);
    });
    forbiddenPhrases.forEach((phrase) => {
      const flexiblePhrase = escapeRegex(phrase).replace(/\s+/gu, "[\\s-]+");
      const pattern = new RegExp(`\\b${flexiblePhrase}\\b`, "iu");
      if (pattern.test(value)) fail(`${label}: contains forbidden public phrase ${JSON.stringify(phrase)}.`);
    });
    if (GENERIC_SHARED_PATTERN.test(value)) fail(`${label}: contains a generic shared-event variant.`);
    if (LINK_OR_DOMAIN_PATTERN.test(value)) fail(`${label}: links and domains are not allowed.`);
    if (LINK_IN_BIO_PATTERN.test(value)) fail(`${label}: link-in-bio language is not allowed.`);
    if (QR_PATTERN.test(value)) fail(`${label}: QR language is not allowed.`);
    if (HASHTAG_PATTERN.test(value)) fail(`${label}: hashtags are not allowed.`);
    if (/\bWhere Winds Meet\b/iu.test(value) && manifest?.policy?.exactGameNameInCaptions !== true) {
      fail(`${label}: exact game-name use is disabled by policy.`);
    }
  }

  expectExactKeys("manifest", manifest, TOP_LEVEL_KEYS);
  expectEqual("manifest.schemaVersion", manifest?.schemaVersion, 1);

  expectExactKeys("manifest.publication", manifest?.publication, PUBLICATION_KEYS);
  expectEqual("manifest.publication.enabledByDefault", manifest?.publication?.enabledByDefault, false);
  expectExactKeys("manifest.publication.platforms", manifest?.publication?.platforms, EVENT_SOCIAL_PLATFORMS);
  EVENT_SOCIAL_PLATFORMS.forEach((platform) => {
    expectEqual(`manifest.publication.platforms.${platform}`, manifest?.publication?.platforms?.[platform], false);
  });

  expectExactKeys("manifest.scheduleContract", manifest?.scheduleContract, SCHEDULE_CONTRACT_KEYS);
  expectEqual("manifest.scheduleContract.source", manifest?.scheduleContract?.source, "./guild-schedule.json");
  expectEqual("manifest.scheduleContract.timezone", manifest?.scheduleContract?.timezone, "UTC+8");
  expectEqual("manifest.scheduleContract.reminderOffsetMinutes", manifest?.scheduleContract?.reminderOffsetMinutes, 60);
  expectEqual("manifest.scheduleContract.lateDispatchPolicy", manifest?.scheduleContract?.lateDispatchPolicy, "suppress");
  if (JSON.stringify(manifest?.scheduleContract?.requiredTokens) !== JSON.stringify(EVENT_SOCIAL_TOKENS)) {
    fail(`manifest.scheduleContract.requiredTokens: expected exactly ${EVENT_SOCIAL_TOKENS.join(", ")}.`);
  }
  expectEqual("schedule.timezone.label", schedule?.timezone?.label, "UTC+8");
  expectEqual("schedule.timezone.displayLabel", schedule?.timezone?.displayLabel, "UTC+8");
  expectEqual("schedule.timezone.offsetMinutes", schedule?.timezone?.offsetMinutes, 480);

  expectExactKeys("manifest.brand", manifest?.brand, BRAND_KEYS);
  expectEqual("manifest.brand.guildSealAsset", manifest?.brand?.guildSealAsset, "./assets/img/brand/emblem.webp");
  expectEqual("manifest.brand.cupcakeMarkAsset", manifest?.brand?.cupcakeMarkAsset, "./assets/img/brand/cupcake-mark.svg");
  expectEqual("manifest.brand.marksRequiredOnEveryCreative", manifest?.brand?.marksRequiredOnEveryCreative, true);
  expectEqual("manifest.brand.lockupPlacement", manifest?.brand?.lockupPlacement, "top-paired");
  expectEqual("manifest.brand.equalVisualWeight", manifest?.brand?.equalVisualWeight, true);
  expectExactKeys("manifest.brand.captionAccentBounds", manifest?.brand?.captionAccentBounds, Object.keys(ACCENT_PATTERNS));
  expectEqual("manifest.brand.captionAccentBounds.Where Winds Meet.minimum", manifest?.brand?.captionAccentBounds?.["Where Winds Meet"]?.minimum, 1);
  expectEqual("manifest.brand.captionAccentBounds.Where Winds Meet.maximum", manifest?.brand?.captionAccentBounds?.["Where Winds Meet"]?.maximum, 2);
  Object.keys(THEME_ACCENT_PATTERNS).forEach((accent) => {
    expectEqual(`manifest.brand.captionAccentBounds.${accent}.minimum`, manifest?.brand?.captionAccentBounds?.[accent]?.minimum, 1);
    expectEqual(`manifest.brand.captionAccentBounds.${accent}.maximum`, manifest?.brand?.captionAccentBounds?.[accent]?.maximum, 1);
  });

  if (requireAssets) {
    [
      ["guild seal", manifest?.brand?.guildSealAsset],
      ["cupcake mark", manifest?.brand?.cupcakeMarkAsset],
    ].forEach(([label, assetPath]) => {
      if (!String(assetPath || "").startsWith("./assets/")) {
        fail(`manifest.brand ${label}: expected a local ./assets/ path.`);
        return;
      }
      const absolute = assetFile(root, assetPath);
      if (!existsSync(absolute)) fail(`manifest.brand ${label}: missing ${assetPath}.`);
      else if (!statSync(absolute).isFile() || statSync(absolute).size < 1) fail(`manifest.brand ${label}: asset must be a non-empty file.`);
    });
  }

  expectExactKeys("manifest.policy", manifest?.policy, POLICY_KEYS);
  REQUIRED_FORBIDDEN_WORDS.forEach((word) => {
    if (!manifest?.policy?.forbiddenPublicWords?.includes(word)) {
      fail(`manifest.policy.forbiddenPublicWords: missing ${JSON.stringify(word)}.`);
    }
  });
  REQUIRED_FORBIDDEN_PHRASES.forEach((phrase) => {
    if (!manifest?.policy?.forbiddenPublicPhrases?.includes(phrase)) {
      fail(`manifest.policy.forbiddenPublicPhrases: missing ${JSON.stringify(phrase)}.`);
    }
  });
  expectEqual("manifest.policy.rejectLinks", manifest?.policy?.rejectLinks, true);
  expectEqual("manifest.policy.rejectDomains", manifest?.policy?.rejectDomains, true);
  expectEqual("manifest.policy.rejectHashtags", manifest?.policy?.rejectHashtags, true);
  expectEqual("manifest.policy.exactGameNameInCaptions", manifest?.policy?.exactGameNameInCaptions, true);

  expectExactKeys("manifest.layouts", manifest?.layouts, EVENT_SOCIAL_PLATFORMS);
  EVENT_SOCIAL_PLATFORMS.forEach((platform) => {
    const layout = manifest?.layouts?.[platform];
    expectExactKeys(`manifest.layouts.${platform}`, layout, LAYOUT_KEYS);
    Object.entries(EXPECTED_LAYOUTS[platform]).forEach(([key, expected]) => {
      expectEqual(`manifest.layouts.${platform}.${key}`, layout?.[key], expected);
    });
  });

  if (!Array.isArray(manifest?.events)) fail("manifest.events: expected an array.");
  const events = Array.isArray(manifest?.events) ? manifest.events : [];
  expectEqual("manifest.events.length", events.length, EVENT_SOCIAL_EVENT_IDS.length);
  const actualIds = events.map((event) => event?.id);
  if (JSON.stringify(actualIds) !== JSON.stringify(EVENT_SOCIAL_EVENT_IDS)) {
    fail(`manifest.events: expected ordered IDs ${EVENT_SOCIAL_EVENT_IDS.join(", ")}; received ${actualIds.join(", ")}.`);
  }

  const scheduleById = scheduleEvents(schedule);
  const captionEntries = [];
  events.forEach((event, eventIndex) => {
    const base = `manifest.events[${eventIndex}]`;
    expectExactKeys(base, event, EVENT_KEYS);
    expectString(`${base}.id`, event?.id);
    expectEqual(`${base}.scheduleId`, event?.scheduleId, event?.id);
    const scheduled = scheduleById.get(event?.scheduleId);
    if (!scheduled) fail(`${base}.scheduleId: no matching event exists in guild-schedule.json.`);
    else expectEqual(`${base}.title`, event?.title, scheduled.title);

    expectExactKeys(`${base}.creative`, event?.creative, CREATIVE_KEYS);
    const expectedMasterAsset = `./assets/img/event-social/masters/${event?.id}.webp`;
    expectEqual(`${base}.creative.artMasterAsset`, event?.creative?.artMasterAsset, expectedMasterAsset);
    expectExactKeys(`${base}.creative.platformAssets`, event?.creative?.platformAssets, EVENT_SOCIAL_PLATFORMS);
    EVENT_SOCIAL_PLATFORMS.forEach((platform) => {
      const extension = platform === "discord" ? "png" : "jpg";
      const assetPath = event?.creative?.platformAssets?.[platform];
      const pattern = new RegExp(
        `^\\./assets/img/event-social/${escapeRegex(event?.id)}/${platform}\\.([0-9a-f]{64})\\.${extension}$`,
        "u",
      );
      const match = typeof assetPath === "string" ? pattern.exec(assetPath) : null;
      if (!match) {
        fail(`${base}.creative.platformAssets.${platform}: expected a full-SHA-256 content-addressed ${platform} path.`);
        return;
      }
      expectEqual(
        `${base}.creative.platformAssets.${platform}`,
        assetPath,
        eventSocialContentAddressedAssetPath(event.id, platform, match[1]),
      );
      if (requireAssets) {
        const absolute = assetFile(root, assetPath);
        if (!existsSync(absolute)) {
          fail(`${base}.creative.platformAssets.${platform}: missing ${assetPath}.`);
        } else if (!statSync(absolute).isFile() || statSync(absolute).size < 1) {
          fail(`${base}.creative.platformAssets.${platform}: asset must be a non-empty file.`);
        } else {
          const actualSha256 = createHash("sha256").update(readFileSync(absolute)).digest("hex");
          if (actualSha256 !== match[1]) {
            fail(`${base}.creative.platformAssets.${platform}: filename SHA-256 does not match the exact asset bytes.`);
          }
        }
      }
    });
    if (requireAssets && typeof event?.creative?.artMasterAsset === "string") {
      const absolute = assetFile(root, event.creative.artMasterAsset);
      if (!existsSync(absolute)) fail(`${base}.creative.artMasterAsset: missing ${event.creative.artMasterAsset}.`);
      else if (!statSync(absolute).isFile() || statSync(absolute).size < 1) fail(`${base}.creative.artMasterAsset: master must be a non-empty file.`);
    }
    expectEqual(`${base}.creative.badgeText`, event?.creative?.badgeText, "Starts in one hour");
    expectString(`${base}.creative.titleText`, event?.creative?.titleText);
    expectString(`${base}.creative.noticeText`, event?.creative?.noticeText);
    expectString(`${base}.creative.altText`, event?.creative?.altText);
    [
      ["badgeText", event?.creative?.badgeText],
      ["titleText", event?.creative?.titleText],
      ["noticeText", event?.creative?.noticeText],
      ["altText", event?.creative?.altText],
    ].forEach(([field, value]) => {
      if (typeof value !== "string") return;
      const tokens = value.match(UNKNOWN_TOKEN_PATTERN) || [];
      if (tokens.length) fail(`${base}.creative.${field}: static reusable image text must not contain tokens.`);
      if (value.includes("UTC+8") || HARD_CODED_CLOCK_PATTERN.test(value) || CALENDAR_OCCURRENCE_PATTERN.test(value)) {
        fail(`${base}.creative.${field}: static reusable image text must not contain occurrence date/time wording.`);
      }
      if (/\bWhere Winds Meet\b/iu.test(value)) {
        fail(`${base}.creative.${field}: the exact game name is limited to captions, not reusable image text.`);
      }
    });
    if (!/one hour/iu.test(event?.creative?.altText || "")) fail(`${base}.creative.altText: must describe the one-hour reminder badge.`);
    if (!/guild seal/iu.test(event?.creative?.altText || "")) fail(`${base}.creative.altText: must describe the guild seal.`);
    if (!/cupcake mark/iu.test(event?.creative?.altText || "")) fail(`${base}.creative.altText: must describe the cupcake mark.`);
    if (!normalizePunctuation(event?.creative?.altText).includes(normalizePunctuation(event?.creative?.titleText))) {
      fail(`${base}.creative.altText: must name ${event?.creative?.titleText}.`);
    }

    expectExactKeys(`${base}.platforms`, event?.platforms, EVENT_SOCIAL_PLATFORMS);
    const platformCaptions = [];
    EVENT_SOCIAL_PLATFORMS.forEach((platform) => {
      const platformCopy = event?.platforms?.[platform];
      const copyBase = `${base}.platforms.${platform}`;
      expectExactKeys(copyBase, platformCopy, PLATFORM_COPY_KEYS);
      expectEqual(`${copyBase}.publicationEnabled`, platformCopy?.publicationEnabled, false);
      const caption = platformCopy?.captionTemplate;
      if (!expectString(`${copyBase}.captionTemplate`, caption)) return;
      validateTokenSet(`${copyBase}.captionTemplate`, caption, EVENT_SOCIAL_TOKENS);
      if (!/one hour/iu.test(caption)) fail(`${copyBase}.captionTemplate: must state that the event starts in one hour.`);
      if (!caption.includes("UTC+8")) fail(`${copyBase}.captionTemplate: must display UTC+8 exactly.`);
      if (HARD_CODED_CLOCK_PATTERN.test(caption)) fail(`${copyBase}.captionTemplate: hard-coded clock text is not allowed; use the time-range token.`);
      if (caption.length > (manifest?.layouts?.[platform]?.captionMaxCharacters || 0)) {
        fail(`${copyBase}.captionTemplate: exceeds the ${platform} caption limit in the layout contract.`);
      }
      const normalizedCaption = normalizePunctuation(caption);
      const normalizedTitle = normalizePunctuation(event?.creative?.titleText);
      if (!normalizedCaption.includes(normalizedTitle)) fail(`${copyBase}.captionTemplate: must name ${event?.creative?.titleText}.`);
      if (/\bWhere Winds Meet\b/iu.test(caption) && event?.id !== "guild-party") {
        fail(`${copyBase}.captionTemplate: exact game-name use is limited to Guild Party captions.`);
      }
      const themeAccents = Object.entries(THEME_ACCENT_PATTERNS)
        .filter(([, pattern]) => pattern.test(caption))
        .map(([accent]) => accent);
      if (themeAccents.length > 1) {
        fail(`${copyBase}.captionTemplate: theme accents must remain separate; found ${themeAccents.join(", ")}.`);
      }
      captionEntries.push({ eventId: event?.id, platform, caption });
      platformCaptions.push(caption);
    });

    if (new Set(platformCaptions).size !== EVENT_SOCIAL_PLATFORMS.length) {
      fail(`${base}.platforms: Facebook, Instagram, and Discord captions must be platform-specific.`);
    }
    if ((event?.creative?.altText || "").length > Math.min(...EVENT_SOCIAL_PLATFORMS.map((platform) => manifest?.layouts?.[platform]?.altTextMaxCharacters || 0))) {
      fail(`${base}.creative.altText: exceeds an alt-text limit in the layout contract.`);
    }

    publicStrings(event).forEach(([location, value]) => validatePublicText(`${base}.${location}`, value));
  });

  const gathering = events.find((event) => event?.id === "monthly-gathering");
  const raffle = events.find((event) => event?.id === "monthly-raffle");
  const gatheringReplacement = "This gathering replaces the Guild Party scheduled for {{EVENT_DATE}}.";
  const raffleReplacement = "This raffle replaces the Guild Party scheduled for {{EVENT_DATE}}.";
  const staticGatheringReplacement = "This gathering replaces that day's Guild Party.";
  const staticRaffleReplacement = "This raffle replaces that day's Guild Party.";
  const rewardStatement = "Attendance still qualifies for the in-game Guild Party attendance reward.";
  [
    ["monthly-gathering", gathering, gatheringReplacement, staticGatheringReplacement],
    ["monthly-raffle", raffle, raffleReplacement, staticRaffleReplacement],
  ].forEach(([id, event, replacement, staticReplacement]) => {
    if (!event?.creative?.noticeText?.includes(staticReplacement)) fail(`${id}: reusable creative notice must include the static Guild Party replacement statement.`);
    if (!event?.creative?.noticeText?.includes(rewardStatement)) fail(`${id}: reusable creative notice must include the exact attendance-reward statement.`);
    if (!event?.creative?.altText?.includes(staticReplacement.replace(/^This /u, "the ").replace(/\.$/u, ""))) {
      fail(`${id}: alt text must describe the static Guild Party replacement notice.`);
    }
    if (!event?.creative?.altText?.includes(rewardStatement.replace(/^Attendance/u, "attendance"))) {
      fail(`${id}: alt text must describe the attendance-reward notice.`);
    }
    EVENT_SOCIAL_PLATFORMS.forEach((platform) => {
      const caption = event?.platforms?.[platform]?.captionTemplate || "";
      if (!caption.includes(replacement)) fail(`${id}.${platform}: caption must include the exact Guild Party replacement statement.`);
      if (!caption.includes(rewardStatement)) fail(`${id}.${platform}: caption must include the exact attendance-reward statement.`);
    });
  });

  const breakingArmyCopy = publicStrings(events.find((event) => event?.id === "breaking-army") || {})
    .map(([, value]) => value)
    .join("\n");
  if (/\b(?:Monday|Wednesday|Friday)s?\b|\b(?:move|moved|reschedul(?:e|ed|ing))\b/iu.test(breakingArmyCopy)) {
    fail("breaking-army: reusable copy must not claim the manual one-off as an automated schedule move.");
  }

  const captionCorpus = captionEntries.map(({ caption }) => caption).join("\n");
  Object.entries(ACCENT_PATTERNS).forEach(([accent, pattern]) => {
    const bounds = manifest?.brand?.captionAccentBounds?.[accent];
    expectExactKeys(`manifest.brand.captionAccentBounds.${accent}`, bounds, ["minimum", "maximum"]);
    const minimum = bounds?.minimum;
    const maximum = bounds?.maximum;
    if (!Number.isInteger(minimum) || !Number.isInteger(maximum) || minimum < 0 || maximum < minimum) {
      fail(`manifest.brand.captionAccentBounds.${accent}: invalid integer bounds.`);
      return;
    }
    const count = countMatches(captionCorpus, pattern);
    if (count < minimum || count > maximum) {
      fail(`caption accent ${JSON.stringify(accent)} must appear ${minimum}-${maximum} times; found ${count}.`);
    }
  });

  return failures;
}
