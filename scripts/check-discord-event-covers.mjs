import { createHash } from "node:crypto";
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

const expectedHashes = {
  "assets/img/discord-events/breaking-army.png": "81318e370e5fb5ff50e59d2e3fc8a4370db050a16d4adbbb24bc8b5555c2a0aa",
  "assets/img/discord-events/guild-heros-realm.png": "0d66dbb2b4a52909aa718b09dd756f9b910e2359ded52a9e63628be2750bdf52",
  "assets/img/discord-events/guild-party.png": "01eef38a5eedfe29ee0f4eea47bc708042f1664dd738b935f300c72922ff2178",
  "assets/img/discord-events/guild-wars.png": "678ba46c68fbe9d5d182916ffac3cb3388e2336539de55e50115c958d116f617",
  "assets/img/discord-events/monthly-gathering.png": "7ed90ff1e25e7f95e2b88cce72ceb3a2355af36ea6af47fb0a3742cda5ce9846",
  "assets/img/discord-events/monthly-raffle.png": "21c4e9d4d00a435b726126e6d59b089ceb2a4bc733e0ee040d25c5c4c012af0e",
  "assets/img/discord-events/showdown.png": "ca37fb4fe3505d42835458e4b846ca320fd166cd2099a7bb06de9e6ab70f8fe9",
  "assets/img/discord-events/united-resolve.png": "76488a120fb120e3d36a116f4416b75a8825316951f3a6e7c0b2a2195b48e234",
};

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

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
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
  const hashes = [];

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

    const hash = sha256(file);
    hashes.push(hash);
    if (hash !== expectedHashes[cover]) {
      fail(`${label}: expected approved panel export hash ${expectedHashes[cover]}, received ${hash}.`);
    }
  }

  if (hashes.length === 2 && hashes[0] !== hashes[1]) {
    fail(`${cover}: root and Next public mirror hashes do not match.`);
  }
}

if (failures.length) {
  console.error("Discord event cover validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Discord event cover validation OK.");
