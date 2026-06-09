import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const schedule = JSON.parse(readFileSync(path.join(root, "data/guild-schedule.json"), "utf8"));
const failures = [];

const expectedCovers = [
  "assets/img/discord-events/monthly-gathering.png",
  "assets/img/discord-events/monthly-raffle.png",
  "assets/img/discord-events/guild-party.png",
  "assets/img/discord-events/breaking-army.png",
  "assets/img/discord-events/showdown.png",
  "assets/img/discord-events/guild-wars.png",
  "assets/img/discord-events/guild-heros-realm.png",
  "assets/img/discord-events/united-resolve.png",
];

function fail(message) {
  failures.push(message);
}

function normalizeCover(value) {
  return String(value || "").replace(/^\.?\//, "");
}

function coverValues() {
  const monthly = Object.values(schedule.monthly || {}).map((item) => normalizeCover(item.discordCoverImage));
  const weekly = (schedule.weekly || [])
    .filter((item) => item.discord === true)
    .map((item) => normalizeCover(item.discordCoverImage));
  return [...new Set([...monthly, ...weekly].filter(Boolean))].sort();
}

function pngDimensions(file) {
  const bytes = readFileSync(file);
  const signature = bytes.subarray(0, 8);
  const expectedSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!signature.equals(expectedSignature)) return null;
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

const configured = coverValues();
const expectedSorted = [...expectedCovers].sort();

if (configured.length !== expectedSorted.length) {
  fail(`expected ${expectedSorted.length} configured Discord event covers, received ${configured.length}.`);
}

for (const cover of expectedSorted) {
  if (!configured.includes(cover)) fail(`missing configured Discord event cover: ${cover}`);
}

for (const cover of configured) {
  if (!expectedSorted.includes(cover)) fail(`unexpected configured Discord event cover: ${cover}`);

  for (const base of ["", "apps/web/public/"]) {
    const file = path.join(root, base, cover);
    const label = `${base || "root"}${cover}`;
    if (!existsSync(file)) {
      fail(`${label}: missing Discord event cover asset.`);
      continue;
    }

    const dimensions = pngDimensions(file);
    if (!dimensions) {
      fail(`${label}: expected a PNG image.`);
      continue;
    }

    if (dimensions.width < 800 || dimensions.height < 320) {
      fail(`${label}: expected at least 800x320, received ${dimensions.width}x${dimensions.height}.`);
    }

    if (dimensions.width !== 1600 || dimensions.height !== 640) {
      fail(`${label}: expected 1600x640 release cover, received ${dimensions.width}x${dimensions.height}.`);
    }
  }
}

if (failures.length) {
  console.error("Discord event cover validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Discord event cover validation OK.");
