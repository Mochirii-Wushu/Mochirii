import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  eventSocialContentAddressedAssetPath,
  validateEventSocialContent,
} from "./event-social-content-contract.mjs";

const root = path.resolve(import.meta.dirname, "..", "..");
const manifest = JSON.parse(readFileSync(path.join(root, "apps/web/public/data/event-social-content.json"), "utf8"));
const schedule = JSON.parse(readFileSync(path.join(root, "apps/web/public/data/guild-schedule.json"), "utf8"));

function validate(candidate, options = {}) {
  return validateEventSocialContent({
    manifest: candidate,
    schedule,
    root,
    requireAssets: options.requireAssets ?? true,
  });
}

function includesFailure(failures, fragment) {
  assert(failures.some((failure) => failure.includes(fragment)), `Expected a failure containing ${JSON.stringify(fragment)}; received:\n${failures.join("\n")}`);
}

test("the committed event-social manifest satisfies the complete contract", () => {
  assert.deepEqual(validate(structuredClone(manifest)), []);
});

test("publication must remain disabled globally and per platform", () => {
  const candidate = structuredClone(manifest);
  candidate.publication.platforms.facebook = true;
  candidate.events[0].platforms.instagram.publicationEnabled = true;
  const failures = validate(candidate);
  includesFailure(failures, "publication.platforms.facebook");
  includesFailure(failures, "platforms.instagram.publicationEnabled");
});

test("forbidden mood wording and generic shared-event wording fail closed", () => {
  const candidate = structuredClone(manifest);
  candidate.events[2].platforms.facebook.captionTemplate += " A calm shared run follows.";
  const failures = validate(candidate);
  includesFailure(failures, 'forbidden public word "calm"');
  includesFailure(failures, 'forbidden public word "shared"');
  includesFailure(failures, "generic shared-event variant");
});

test("links, domains, QR language, link-in-bio prompts, and hashtags fail closed", () => {
  const candidate = structuredClone(manifest);
  candidate.events[3].platforms.instagram.captionTemplate += " Visit https://example.com, scan the QR code, use link in bio, and post #ready.";
  const failures = validate(candidate);
  includesFailure(failures, "links and domains are not allowed");
  includesFailure(failures, "QR language is not allowed");
  includesFailure(failures, "link-in-bio language is not allowed");
  includesFailure(failures, "hashtags are not allowed");
});

test("the exact one-hour offset and dynamic date/time tokens are mandatory", () => {
  const candidate = structuredClone(manifest);
  candidate.scheduleContract.reminderOffsetMinutes = 30;
  candidate.events[4].platforms.facebook.captionTemplate = candidate.events[4].platforms.facebook.captionTemplate.replace("{{EVENT_TIME_RANGE}}", "10 PM");
  const failures = validate(candidate);
  includesFailure(failures, "reminderOffsetMinutes");
  includesFailure(failures, "missing required token {{EVENT_TIME_RANGE}}");
  includesFailure(failures, "hard-coded clock text is not allowed");
});

test("monthly gathering and raffle copy must preserve replacement and reward statements", () => {
  const candidate = structuredClone(manifest);
  candidate.events[0].platforms.discord.captionTemplate = candidate.events[0].platforms.discord.captionTemplate.replace(
    "Attendance still qualifies for the in-game Guild Party attendance reward.",
    "Attendance is recorded.",
  );
  candidate.events[1].creative.noticeText = "Raffle notice.";
  const failures = validate(candidate);
  includesFailure(failures, "monthly-gathering.discord: caption must include the exact attendance-reward statement");
  includesFailure(failures, "monthly-raffle: reusable creative notice must include the static Guild Party replacement statement");
});

test("Breaking Army reusable copy cannot automate the manual one-off", () => {
  const candidate = structuredClone(manifest);
  candidate.events[3].creative.noticeText = "Moved from Wednesday to Friday.";
  const failures = validate(candidate);
  includesFailure(failures, "reusable copy must not claim the manual one-off as an automated schedule move");
});

test("reusable creative text cannot embed an occurrence date, time, or rendering token", () => {
  const candidate = structuredClone(manifest);
  candidate.events[4].creative.altText += " {{EVENT_DATE}} at 9:30 PM UTC+8.";
  const failures = validate(candidate);
  includesFailure(failures, "static reusable image text must not contain tokens");
  includesFailure(failures, "static reusable image text must not contain occurrence date/time wording");
});

test("art master and full-SHA-256 platform output paths are exact and event-scoped", () => {
  const candidate = structuredClone(manifest);
  candidate.events[5].creative.artMasterAsset = "./assets/img/event-social/masters/other.webp";
  candidate.events[5].creative.platformAssets.instagram = candidate.events[5].creative.platformAssets.facebook;
  const failures = validate(candidate, { requireAssets: false });
  includesFailure(failures, "manifest.events[5].creative.artMasterAsset");
  includesFailure(failures, "full-SHA-256 content-addressed instagram path");
  assert.equal(
    eventSocialContentAddressedAssetPath(
      "guild-wars",
      "instagram",
      "d4dee4f1d0a16f54ebf850886f5625040a981400d0d09abb360b151a540de9e9",
    ),
    manifest.events[5].creative.platformAssets.instagram,
  );
  assert.throws(
    () => eventSocialContentAddressedAssetPath("guild-wars", "instagram", "short"),
    /full lowercase SHA-256/u,
  );
});

test("the exact game name is bounded and limited to Guild Party captions", () => {
  const missing = structuredClone(manifest);
  missing.events[2].platforms.facebook.captionTemplate = missing.events[2].platforms.facebook.captionTemplate.replace(
    " in Where Winds Meet",
    "",
  );
  includesFailure(validate(missing), 'caption accent "Where Winds Meet" must appear 1-2 times; found 0');

  const misplaced = structuredClone(manifest);
  misplaced.events[4].platforms.discord.captionTemplate += " Where Winds Meet.";
  includesFailure(validate(misplaced), "exact game-name use is limited to Guild Party captions");
});

test("wuxia, xianxia, and Jianghu accents appear once each and never stack", () => {
  const candidate = structuredClone(manifest);
  candidate.events[3].platforms.discord.captionTemplate += " Jianghu.";
  const failures = validate(candidate);
  includesFailure(failures, "theme accents must remain separate; found wuxia, Jianghu");
  includesFailure(failures, 'caption accent "Jianghu" must appear 1-1 times; found 2');
});

test("the event inventory is an exact ordered set of eight schedule-backed IDs", () => {
  const candidate = structuredClone(manifest);
  candidate.events.push(structuredClone(candidate.events[7]));
  const failures = validate(candidate);
  includesFailure(failures, "manifest.events.length");
  includesFailure(failures, "expected ordered IDs");
});

test("unexpected schema keys, schedule-title drift, and layout drift fail closed", () => {
  const candidate = structuredClone(manifest);
  candidate.events[0].unexpected = true;
  candidate.events[2].title = "Renamed Party";
  candidate.layouts.instagram.width = 1200;
  const failures = validate(candidate);
  includesFailure(failures, "unexpected");
  includesFailure(failures, "Renamed Party");
  includesFailure(failures, "manifest.layouts.instagram.width");
});
