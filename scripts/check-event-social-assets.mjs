import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  EVENT_SOCIAL_BRAND_ASSETS,
  EVENT_SOCIAL_LAYOUTS,
  EVENT_SOCIAL_RENDERER_VERSION,
  EVENT_SOCIAL_SCHEMA_VERSION,
  EXPECTED_EVENT_MASTER_COUNT,
  EXPECTED_MASTER_DIMENSIONS,
  getRepositoryRoot,
  loadEventSocialJson,
  validateEventSocialManifest,
} from "./lib/event-social-assets.mjs";
import {
  eventSocialContentAddressedAssetPath,
} from "./lib/event-social-content-contract.mjs";

const root = getRepositoryRoot();
const require = createRequire(path.join(root, "apps", "web", "package.json"));
const sharp = require("sharp");
const publicRoot = path.join(root, "apps", "web", "public");
const manifest = loadEventSocialJson(path.join(publicRoot, "data", "event-social-content.json"));
const schedule = loadEventSocialJson(path.join(publicRoot, "data", "guild-schedule.json"));
const sidecar = loadEventSocialJson(path.join(publicRoot, "data", "event-social-assets.json"), "Event social asset sidecar");
const failures = [];
const fail = (message) => failures.push(message);
const digest = (buffer) => createHash("sha256").update(buffer).digest("hex");

try {
  validateEventSocialManifest(manifest, schedule);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

const cupcakeFile = path.join(root, ...EVENT_SOCIAL_BRAND_ASSETS.cupcake.split("/"));
const cupcakeSvg = readFileSync(cupcakeFile, "utf8");
[
  [/<text\b/iu, "must not contain rendered text"],
  [/<(?:script|foreignObject|iframe|animate)\b/iu, "must not contain active or embedded content"],
  [/\bon[a-z]+\s*=/iu, "must not contain event handlers"],
  [/(?:xlink:href|href)\s*=/iu, "must not reference another resource"],
  [/url\((?!#[a-z][\w.-]*\))/iu, "must not use an external URL"],
  [/[®™]/u, "must not use a registration or trademark symbol"],
].forEach(([pattern, message]) => {
  if (pattern.test(cupcakeSvg)) fail(`Cupcake mark ${message}.`);
});
if (!/viewBox="0 0 512 512"/u.test(cupcakeSvg)) fail("Cupcake mark must retain its 512-unit scalable viewBox.");
if (!/aria-label="Mōchirīī cupcake mark"/u.test(cupcakeSvg)) fail("Cupcake mark must use the canonical accessible name.");
if ((cupcakeSvg.match(/<path\b/gu) || []).length < 10) fail("Cupcake mark lost its original vector path detail.");

for (const [platform, layout] of Object.entries(EVENT_SOCIAL_LAYOUTS)) {
  const contract = manifest.layouts[platform];
  if (layout.width !== contract.width || layout.height !== contract.height) fail(`${platform} renderer dimensions drifted from the manifest.`);
  const requiredInset = Math.ceil(Math.min(layout.width, layout.height) * contract.safeInsetPercent / 100);
  if (layout.safeMargin < requiredInset) fail(`${platform} safe margin is below the ${contract.safeInsetPercent}% contract.`);
  if (layout.masterFit !== "contain" || layout.backdropFit !== "cover") fail(`${platform} must preserve the full subject over a cover-fit backdrop.`);
  if (layout.seal.width !== layout.cupcake.width || layout.seal.height !== layout.cupcake.height) fail(`${platform} paired marks lost equal visual weight.`);
  for (const [name, box] of [["seal", layout.seal], ["cupcake", layout.cupcake]]) {
    if (box.left < layout.safeMargin || box.top < layout.safeMargin || box.left + box.width > layout.width - layout.safeMargin || box.top + box.height > layout.height - layout.safeMargin) {
      fail(`${platform} ${name} mark escapes the safe area.`);
    }
  }
}

const masterDirectory = path.join(publicRoot, "assets", "img", "event-social", "masters");
const masterNames = readdirSync(masterDirectory).sort();
const expectedMasterNames = manifest.events.map((event) => `${event.id}.webp`).sort();
if (JSON.stringify(masterNames) !== JSON.stringify(expectedMasterNames)) fail("Master directory must contain exactly the eight declared WebP files.");
if (masterNames.length !== EXPECTED_EVENT_MASTER_COUNT) fail(`Expected ${EXPECTED_EVENT_MASTER_COUNT} masters, received ${masterNames.length}.`);

for (const event of manifest.events) {
  const masterPath = path.join(publicRoot, event.creative.artMasterAsset.slice(2));
  const metadata = await sharp(masterPath).metadata();
  if (metadata.width !== EXPECTED_MASTER_DIMENSIONS.width || metadata.height !== EXPECTED_MASTER_DIMENSIONS.height || metadata.format !== "webp" || metadata.space !== "srgb" || metadata.hasAlpha) {
    fail(`${event.id} master is not an opaque sRGB ${EXPECTED_MASTER_DIMENSIONS.width}x${EXPECTED_MASTER_DIMENSIONS.height} WebP.`);
  }
  for (const platform of ["facebook", "instagram", "discord"]) {
    const assetPath = event.creative.platformAssets[platform];
    const file = path.join(publicRoot, assetPath.slice(2));
    const buffer = readFileSync(file);
    const outputSha256 = digest(buffer);
    const expectedAssetPath = eventSocialContentAddressedAssetPath(
      event.id,
      platform,
      outputSha256,
    );
    if (assetPath !== expectedAssetPath) {
      fail(`${event.id} ${platform} path does not contain the full exact output SHA-256.`);
    }
    const metadataOutput = await sharp(buffer).metadata();
    const layout = EVENT_SOCIAL_LAYOUTS[platform];
    if (metadataOutput.width !== layout.width || metadataOutput.height !== layout.height || metadataOutput.format !== layout.format || metadataOutput.space !== "srgb" || metadataOutput.hasAlpha) {
      fail(`${event.id} ${platform} output does not match the opaque sRGB layout contract.`);
    }
    const attested = sidecar.outputs.find((output) => output.eventId === event.id && output.platform === platform);
    if (!attested) fail(`${event.id} ${platform} is missing from the sidecar.`);
    else if (
      attested.assetPath !== assetPath ||
      attested.relativeFile !== assetPath.slice(2) ||
      attested.sha256 !== outputSha256
    ) fail(`${event.id} ${platform} sidecar path or hash does not match.`);
  }
  const eventDirectory = path.join(publicRoot, "assets", "img", "event-social", event.id);
  const expectedOutputNames = Object.values(event.creative.platformAssets)
    .map((assetPath) => path.basename(assetPath))
    .sort();
  const actualOutputNames = readdirSync(eventDirectory).sort();
  if (JSON.stringify(actualOutputNames) !== JSON.stringify(expectedOutputNames)) {
    fail(`${event.id} output directory must contain only its three exact content-addressed derivatives.`);
  }
}

if (sidecar.outputs?.length !== EXPECTED_EVENT_MASTER_COUNT * 3) fail("Asset sidecar must attest exactly 24 derivatives.");
if (sidecar.schemaVersion !== EVENT_SOCIAL_SCHEMA_VERSION || sidecar.rendererVersion !== EVENT_SOCIAL_RENDERER_VERSION) fail("Asset sidecar schema or renderer version is stale.");
if (sidecar.contentAddressedPlatformAssets !== true) fail("Asset sidecar must attest full-SHA-256 content-addressed platform assets.");
if (sidecar.publicationEnabled !== false || sidecar.providerMutationPerformed !== false) fail("Asset sidecar must preserve the disabled, offline publication boundary.");
if (sidecar.reusableOccurrenceIndependentCreative !== true || sidecar.overlayContainsDateOrTime !== false) fail("Asset sidecar must attest reusable occurrence-independent creative.");
if (sidecar.brandAssets?.seal?.relativeFile !== EVENT_SOCIAL_BRAND_ASSETS.seal || sidecar.brandAssets?.cupcake?.relativeFile !== EVENT_SOCIAL_BRAND_ASSETS.cupcake) fail("Asset sidecar must attest both canonical marks.");

if (failures.length) {
  console.error(`Event social asset validation failed (${failures.length} issues).`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Event social asset validation OK.");
console.log("- 8 reviewed WebP masters and 24 opaque sRGB platform derivatives verified.");
console.log("- Safe areas, full-subject containment, equal paired marks, local font boundary, and full-SHA-256 paths verified.");
console.log("- Canonical creative is occurrence-independent and every publication flag remains false.");
