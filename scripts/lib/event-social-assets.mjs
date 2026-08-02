import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EVENT_SOCIAL_EVENT_IDS,
  EVENT_SOCIAL_PLATFORMS,
  eventSocialContentAddressedAssetPath,
  validateEventSocialContent,
} from "./event-social-content-contract.mjs";
import { validateJpeg, validatePng } from "./asset-format-validation.mjs";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const require = createRequire(path.join(repositoryRoot, "apps", "web", "package.json"));

export const EVENT_SOCIAL_RENDERER_VERSION = "1.1.0";
export const EVENT_SOCIAL_SCHEMA_VERSION = 2;
export const EXPECTED_EVENT_MASTER_COUNT = 8;
export const EXPECTED_MASTER_DIMENSIONS = Object.freeze({ width: 1672, height: 941, format: "webp" });

export const EVENT_SOCIAL_BRAND_ASSETS = Object.freeze({
  seal: "apps/web/public/assets/img/brand/emblem.webp",
  cupcake: "apps/web/public/assets/img/brand/cupcake-mark.svg",
  font: "apps/web/server-assets/spinner-fonts/NotoSerifSC-Variable.ttf",
});

const META_LAYOUT = Object.freeze({
  width: 1080,
  height: 1350,
  format: "jpeg",
  extension: "jpg",
  safeMargin: 88,
  masterFit: "contain",
  backdropFit: "cover",
  art: Object.freeze({ left: 88, top: 88, width: 904, height: 666 }),
  seal: Object.freeze({ left: 108, top: 108, width: 108, height: 108 }),
  cupcake: Object.freeze({ left: 864, top: 108, width: 108, height: 108 }),
});

export const EVENT_SOCIAL_LAYOUTS = Object.freeze({
  facebook: META_LAYOUT,
  instagram: META_LAYOUT,
  discord: Object.freeze({
    width: 1600,
    height: 640,
    format: "png",
    extension: "png",
    safeMargin: 40,
    masterFit: "contain",
    backdropFit: "cover",
    art: Object.freeze({ left: 40, top: 40, width: 790, height: 560 }),
    seal: Object.freeze({ left: 1332, top: 56, width: 96, height: 96 }),
    cupcake: Object.freeze({ left: 1450, top: 56, width: 96, height: 96 }),
  }),
});

const MAX_MASTER_BYTES = 24 * 1024 * 1024;
const MAX_MASTER_PIXELS = 64 * 1024 * 1024;
const MAX_FONT_BYTES = 32 * 1024 * 1024;
const MIN_MASTER_EDGE = 512;
const MAX_MASTER_EDGE = 8192;
const OUTPUT_BACKGROUND = { r: 7, g: 23, b: 21, alpha: 1 };
const PROHIBITED_PUBLIC_TEXT = /(?:https?:\/\/|www\.|(?:\b[a-z0-9-]+\.)+(?:com|net|org|gg|io|dev|app)\b|#[\p{L}\p{N}_]|(?:^|\s)@[a-z0-9_.-]+)/iu;
const CANONICAL_JFIF_SEGMENT = Buffer.from([
  0xff, 0xe0, 0x00, 0x10,
  0x4a, 0x46, 0x49, 0x46, 0x00,
  0x01, 0x01, 0x00,
  0x00, 0x01, 0x00, 0x01,
  0x00, 0x00,
]);

let sharpInstance;

function sharp() {
  if (sharpInstance) return sharpInstance;
  try {
    sharpInstance = require("sharp");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Sharp is unavailable. Run npm ci in apps/web first. (${message})`);
  }
  return sharpInstance;
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function assertPublicText(value, label, maximumLength) {
  invariant(typeof value === "string", `${label} must be a string.`);
  invariant(value === value.trim(), `${label} must not have leading or trailing whitespace.`);
  invariant(value.length > 0 && value.length <= maximumLength, `${label} must contain 1-${maximumLength} characters.`);
  invariant(!/[\r\n\t]/u.test(value), `${label} must be a single line.`);
  invariant(!PROHIBITED_PUBLIC_TEXT.test(value), `${label} must not contain a link, handle, or hashtag.`);
  invariant(!/[®™©]/u.test(value), `${label} must not contain trademark or copyright symbols.`);
  invariant(!/\{\{[A-Z0-9_]+\}\}/u.test(value), `${label} contains an unresolved token.`);
  return value;
}

function readBoundedRegularFile(file, maximumBytes, label) {
  const initial = lstatSync(file);
  invariant(initial.isFile() && !initial.isSymbolicLink(), `${label} must be a regular, non-symlink file.`);
  invariant(initial.size > 0 && initial.size <= maximumBytes, `${label} must contain 1-${maximumBytes} bytes.`);
  const handle = openSync(file, "r");
  try {
    const before = fstatSync(handle);
    invariant(before.isFile() && before.size === initial.size, `${label} changed before it could be read.`);
    const buffer = Buffer.allocUnsafe(before.size);
    let offset = 0;
    while (offset < buffer.length) {
      const count = readSync(handle, buffer, offset, buffer.length - offset, offset);
      invariant(count > 0, `${label} ended before its declared size.`);
      offset += count;
    }
    const after = fstatSync(handle);
    invariant(after.size === before.size && after.mtimeMs === before.mtimeMs, `${label} changed while it was being read.`);
    return buffer;
  } finally {
    closeSync(handle);
  }
}

function resolveContainedFile(root, relativeFile, label) {
  const resolvedRoot = realpathSync(root);
  const candidate = realpathSync(path.resolve(resolvedRoot, ...relativeFile.split("/")));
  invariant(candidate.startsWith(`${resolvedRoot}${path.sep}`), `${label} resolves outside the configured directory.`);
  return candidate;
}

export function validateEventSocialManifest(
  manifest,
  schedule,
  root = repositoryRoot,
  { requireAssets = true } = {},
) {
  const failures = validateEventSocialContent({ manifest, schedule, root, requireAssets });
  invariant(failures.length === 0, `Event social content contract is invalid:\n- ${failures.join("\n- ")}`);
  invariant(manifest.events.length === EXPECTED_EVENT_MASTER_COUNT, `Event social manifest must contain exactly ${EXPECTED_EVENT_MASTER_COUNT} events.`);
  return manifest;
}

function resolveRenderEvents(manifest, eventIds) {
  invariant(Array.isArray(eventIds) && eventIds.length > 0, "eventIds must select at least one event.");
  const unknown = eventIds.filter((id) => !EVENT_SOCIAL_EVENT_IDS.includes(id));
  invariant(unknown.length === 0, `eventIds contains unknown event IDs: ${unknown.join(", ")}.`);
  invariant(new Set(eventIds).size === eventIds.length, "eventIds must not contain duplicates.");
  const requested = new Set(eventIds);
  return manifest.events.filter((event) => requested.has(event.id)).map((event) => Object.freeze({
    id: event.id,
    eyebrow: assertPublicText(event.creative.badgeText, `${event.id}.badgeText`, 32),
    title: assertPublicText(event.creative.titleText, `${event.id}.titleText`, 54),
    noticeText: assertPublicText(event.creative.noticeText, `${event.id}.noticeText`, 220),
    altText: assertPublicText(event.creative.altText, `${event.id}.altText`, 500),
    artMasterAsset: event.creative.artMasterAsset,
    platformAssets: event.creative.platformAssets,
  }));
}

async function validateMasterBuffer(buffer, label) {
  const metadata = await sharp()(buffer, {
    failOn: "warning",
    limitInputPixels: MAX_MASTER_PIXELS,
    sequentialRead: true,
  }).metadata();
  invariant(["avif", "jpeg", "png", "webp"].includes(metadata.format), `${label} uses an unsupported decoded format.`);
  invariant(metadata.pages === undefined || metadata.pages === 1, `${label} must be a single-frame image.`);
  invariant(Number.isInteger(metadata.width) && Number.isInteger(metadata.height), `${label} has no decoded dimensions.`);
  invariant(metadata.width >= MIN_MASTER_EDGE && metadata.height >= MIN_MASTER_EDGE, `${label} must be at least ${MIN_MASTER_EDGE}px on each edge.`);
  invariant(metadata.width <= MAX_MASTER_EDGE && metadata.height <= MAX_MASTER_EDGE, `${label} exceeds the ${MAX_MASTER_EDGE}px edge bound.`);
  return Object.freeze({
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    space: metadata.space,
    hasAlpha: metadata.hasAlpha === true,
  });
}

function escapeMarkup(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(value, maximumCharacters, maximumLines) {
  const words = value.split(/\s+/u);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maximumCharacters || line === "") {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  invariant(lines.length <= maximumLines, `Text ${JSON.stringify(value)} does not fit the ${maximumLines}-line layout bound.`);
  return lines;
}

function textInput(text, { fontPath, fontSize, width, color, weight = 400, spacing = 0 }) {
  return {
    text: {
      text: `<span foreground="${color}" weight="${weight}">${escapeMarkup(text)}</span>`,
      font: `Noto Serif SC ${fontSize}`,
      fontfile: fontPath,
      width,
      align: "left",
      rgba: true,
      dpi: 72,
      spacing,
      wrap: "word-char",
    },
  };
}

function metaContentLayers(event, fontPath) {
  const titleLines = wrapText(event.title, 30, 2);
  const noticeLines = wrapText(event.noticeText, 58, 3);
  const geometry = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#061714" stop-opacity="0"/><stop offset=".45" stop-color="#061714" stop-opacity=".76"/><stop offset="1" stop-color="#061714" stop-opacity=".97"/></linearGradient></defs><rect width="1080" height="1350" fill="url(#shade)"/><rect x="88" y="786" width="904" height="476" rx="34" fill="#071b19" fill-opacity=".88" stroke="#e8bd61" stroke-opacity=".52" stroke-width="2"/><path d="M110 984h850" stroke="#e8bd61" stroke-width="2" stroke-opacity=".48"/></svg>`,
  );
  return {
    geometry,
    text: [
      { input: textInput(event.eyebrow, { fontPath, fontSize: 25, width: 850, color: "#e8bd61", weight: 600 }), left: 110, top: 818, blend: "over" },
      { input: textInput(titleLines.join("\n"), { fontPath, fontSize: 58, width: 850, color: "#fff7e9", weight: 600, spacing: 8 }), left: 110, top: 872, blend: "over" },
      { input: textInput(noticeLines.join("\n"), { fontPath, fontSize: 27, width: 846, color: "#e8ddd0", spacing: 8 }), left: 112, top: 1024, blend: "over" },
    ],
    overlayLineCount: 1 + titleLines.length + noticeLines.length,
  };
}

function discordContentLayers(event, fontPath) {
  const titleLines = wrapText(event.title, 30, 1);
  const noticeLines = wrapText(event.noticeText, 55, 3);
  const geometry = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="640" viewBox="0 0 1600 640"><defs><linearGradient id="veil" x1="0" y1="0" x2="1" y2="0"><stop offset=".45" stop-color="#061714" stop-opacity=".05"/><stop offset=".57" stop-color="#061714" stop-opacity=".8"/><stop offset="1" stop-color="#061714" stop-opacity=".97"/></linearGradient></defs><rect width="1600" height="640" fill="url(#veil)"/><rect x="854" y="40" width="706" height="560" rx="30" fill="#071b19" fill-opacity=".8" stroke="#e8bd61" stroke-opacity=".5" stroke-width="2"/><path d="M896 276h622" stroke="#e8bd61" stroke-width="2" stroke-opacity=".48"/></svg>`,
  );
  return {
    geometry,
    text: [
      { input: textInput(event.eyebrow, { fontPath, fontSize: 20, width: 420, color: "#e8bd61", weight: 600 }), left: 896, top: 82, blend: "over" },
      { input: textInput(titleLines.join("\n"), { fontPath, fontSize: 46, width: 622, color: "#fff7e9", weight: 600 }), left: 896, top: 166, blend: "over" },
      { input: textInput(noticeLines.join("\n"), { fontPath, fontSize: 22, width: 620, color: "#e8ddd0", spacing: 7 }), left: 898, top: 318, blend: "over" },
    ],
    overlayLineCount: 1 + titleLines.length + noticeLines.length,
  };
}

function decorativeOverlay(layout) {
  const { width, height, art } = layout;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#071b19" fill-opacity=".12"/><rect x="${art.left}" y="${art.top}" width="${art.width}" height="${art.height}" rx="28" fill="none" stroke="#f2ce79" stroke-opacity=".74" stroke-width="4"/><path d="M${layout.safeMargin} ${layout.safeMargin + 14}h132M${width - layout.safeMargin - 132} ${height - layout.safeMargin - 14}h132" stroke="#f2ce79" stroke-width="3" stroke-linecap="round" opacity=".72"/></svg>`,
  );
}

function brandBadge(width, height) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><ellipse cx="${width / 2}" cy="${height / 2 + 4}" rx="${width / 2 - 3}" ry="${height / 2 - 7}" fill="#04120f" fill-opacity=".76" stroke="#f2ce79" stroke-opacity=".72" stroke-width="3"/></svg>`,
  );
}

async function normalizeMaster(masterBuffer) {
  return sharp()(masterBuffer, { failOn: "warning", limitInputPixels: MAX_MASTER_PIXELS, sequentialRead: true })
    .rotate()
    .toColourspace("srgb")
    .flatten({ background: OUTPUT_BACKGROUND })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
}

export async function renderContainedMaster(masterBuffer, { width, height }) {
  invariant(Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0, "Contained-master dimensions must be positive integers.");
  const normalized = await normalizeMaster(masterBuffer);
  return sharp()(normalized)
    .resize(width, height, { fit: "contain", position: "centre", background: OUTPUT_BACKGROUND })
    .toColourspace("srgb")
    .flatten({ background: OUTPUT_BACKGROUND })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
}

async function prepareBrandAsset(buffer, width, height) {
  return sharp()(buffer, { failOn: "warning", limitInputPixels: MAX_MASTER_PIXELS })
    .resize(width, height, { fit: "contain", position: "centre", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toColourspace("srgb")
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
}

async function renderLayout({ event, masterBuffer, platform, layout, brand, maximumOverlayLines }) {
  const normalized = await normalizeMaster(masterBuffer);
  const backdrop = await sharp()(normalized)
    .resize(layout.width, layout.height, { fit: layout.backdropFit, position: "centre" })
    .blur(platform === "discord" ? 28 : 34)
    .modulate({ brightness: 0.43, saturation: 0.78 })
    .toColourspace("srgb")
    .flatten({ background: OUTPUT_BACKGROUND })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
  const art = await renderContainedMaster(normalized, layout.art);
  const seal = await prepareBrandAsset(brand.seal, layout.seal.width, layout.seal.height);
  const cupcake = await prepareBrandAsset(brand.cupcake, layout.cupcake.width, layout.cupcake.height);
  const content = platform === "discord"
    ? discordContentLayers(event, brand.fontPath)
    : metaContentLayers(event, brand.fontPath);
  invariant(content.overlayLineCount <= maximumOverlayLines, `${event.id} exceeds the ${platform} overlay-line limit.`);

  const composed = sharp()(backdrop).composite([
    { input: art, left: layout.art.left, top: layout.art.top, blend: "over" },
    { input: decorativeOverlay(layout), left: 0, top: 0, blend: "over" },
    { input: content.geometry, left: 0, top: 0, blend: "over" },
    ...content.text,
    { input: brandBadge(layout.seal.width + 14, layout.seal.height + 14), left: layout.seal.left - 7, top: layout.seal.top - 7, blend: "over" },
    { input: seal, left: layout.seal.left, top: layout.seal.top, blend: "over" },
    { input: brandBadge(layout.cupcake.width + 14, layout.cupcake.height + 14), left: layout.cupcake.left - 7, top: layout.cupcake.top - 7, blend: "over" },
    { input: cupcake, left: layout.cupcake.left, top: layout.cupcake.top, blend: "over" },
  ]).toColourspace("srgb").flatten({ background: OUTPUT_BACKGROUND }).removeAlpha();

  if (layout.format === "jpeg") {
    const encoded = await composed.jpeg({
      quality: 92,
      chromaSubsampling: "4:4:4",
      mozjpeg: false,
      trellisQuantisation: false,
      overshootDeringing: false,
      optimizeScans: true,
      progressive: true,
    }).toBuffer();
    invariant(encoded[0] === 0xff && encoded[1] === 0xd8, "Sharp returned a malformed JPEG.");
    const canonical = Buffer.concat([encoded.subarray(0, 2), CANONICAL_JFIF_SEGMENT, encoded.subarray(2)]);
    validateJpeg(canonical);
    return canonical;
  }
  const encoded = await composed.png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
  const chunks = [encoded.subarray(0, 8)];
  let offset = 8;
  while (offset < encoded.length) {
    const size = encoded.readUInt32BE(offset);
    const end = offset + 12 + size;
    invariant(end <= encoded.length, "Sharp returned a malformed PNG.");
    if (encoded.toString("ascii", offset + 4, offset + 8) !== "pHYs") chunks.push(encoded.subarray(offset, end));
    offset = end;
  }
  const canonical = Buffer.concat(chunks);
  validatePng(canonical);
  return canonical;
}

function writeStableFile(file, buffer, { confirmedReplacement = false } = {}) {
  if (existsSync(file)) {
    const info = lstatSync(file);
    invariant(info.isFile() && !info.isSymbolicLink(), `Refusing to replace a non-regular output at ${file}.`);
    if (readFileSync(file).equals(buffer)) return;
    invariant(confirmedReplacement, `Refusing to overwrite changed output at ${file}.`);
  }
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  try {
    writeFileSync(temporary, buffer, { flag: "wx" });
    renameSync(temporary, file);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

function assertOutputRoot(outputPublicRoot, confirmCanonicalPublicWrite) {
  mkdirSync(outputPublicRoot, { recursive: true });
  const resolved = realpathSync(outputPublicRoot);
  const canonical = realpathSync(path.join(repositoryRoot, "apps", "web", "public"));
  if (resolved === canonical) {
    invariant(confirmCanonicalPublicWrite, "Canonical public rendering requires confirmCanonicalPublicWrite=true.");
  }
  return { resolved, canonical: resolved === canonical };
}

function publicAssetRelative(assetPath, label) {
  invariant(typeof assetPath === "string" && assetPath.startsWith("./assets/"), `${label} must use a local ./assets/ path.`);
  invariant(!assetPath.includes("\\") && !assetPath.split("/").includes(".."), `${label} must not traverse outside the public asset tree.`);
  return assetPath.slice(2);
}

function resolveOutputFile(outputPublicRoot, assetPath, label) {
  const relative = publicAssetRelative(assetPath, label);
  const candidate = path.resolve(outputPublicRoot, ...relative.split("/"));
  invariant(candidate.startsWith(`${outputPublicRoot}${path.sep}`), `${label} resolves outside the output root.`);
  mkdirSync(path.dirname(candidate), { recursive: true });
  const resolvedParent = realpathSync(path.dirname(candidate));
  invariant(resolvedParent === outputPublicRoot || resolvedParent.startsWith(`${outputPublicRoot}${path.sep}`), `${label} parent resolves outside the output root.`);
  const resolved = path.join(resolvedParent, path.basename(candidate));
  if (existsSync(resolved)) {
    const info = lstatSync(resolved);
    invariant(info.isFile() && !info.isSymbolicLink(), `${label} must be a regular, non-symlink file.`);
  }
  return resolved;
}

function renderVersion(renderInputs, label) {
  invariant(/^[a-z0-9][a-z0-9-]{0,31}$/u.test(label), "versionLabel must be a lowercase slug of at most 32 characters.");
  const digest = sha256(Buffer.from(JSON.stringify(renderInputs)));
  return `${label}-v${EVENT_SOCIAL_SCHEMA_VERSION}-${digest.slice(0, 16)}`;
}

export async function renderEventSocialAssets({
  manifest,
  schedule,
  eventIds = EVENT_SOCIAL_EVENT_IDS,
  outputPublicRoot = path.join(repositoryRoot, "apps", "web", "public"),
  confirmTextFreeMasters = false,
  confirmCanonicalPublicWrite = false,
  allowPlatformSpecificTemporaryOutputs = false,
  versionLabel = "event-social",
}) {
  validateEventSocialManifest(manifest, schedule, repositoryRoot, {
    requireAssets: false,
  });
  const events = resolveRenderEvents(manifest, eventIds);
  invariant(confirmTextFreeMasters, "Rendering requires confirmTextFreeMasters=true after visual review for text, links, QR codes, and third-party marks.");
  const output = assertOutputRoot(outputPublicRoot, confirmCanonicalPublicWrite);
  invariant(
    !allowPlatformSpecificTemporaryOutputs || !output.canonical,
    "Platform-specific temporary outputs cannot target the canonical public root.",
  );
  if (output.canonical) {
    invariant(events.length === EXPECTED_EVENT_MASTER_COUNT, "Canonical public rendering must include all eight event types.");
  }

  const globallyEnabled = manifest.publication.enabledByDefault === true
    || Object.values(manifest.publication.platforms).some(Boolean)
    || manifest.events.some((event) => Object.values(event.platforms).some((platform) => platform.publicationEnabled === true));
  invariant(!globallyEnabled, "Offline rendering requires every publication flag to remain false.");

  const brandPaths = Object.fromEntries(
    Object.entries(EVENT_SOCIAL_BRAND_ASSETS).map(([key, relative]) => [key, path.join(repositoryRoot, ...relative.split("/"))]),
  );
  for (const [name, file] of Object.entries(brandPaths)) invariant(existsSync(file), `Required ${name} brand asset is missing.`);
  const brand = {
    seal: readBoundedRegularFile(brandPaths.seal, MAX_MASTER_BYTES, "Canonical guild seal"),
    cupcake: readBoundedRegularFile(brandPaths.cupcake, 128 * 1024, "Cupcake mark"),
    fontPath: brandPaths.font,
  };
  const fontBuffer = readBoundedRegularFile(brandPaths.font, MAX_FONT_BYTES, "Bundled guild font");

  const canonicalPublicRoot = path.join(repositoryRoot, "apps", "web", "public");
  const masters = [];
  for (const event of events) {
    const masterRelative = publicAssetRelative(event.artMasterAsset, `${event.id}.artMasterAsset`);
    const masterPath = resolveContainedFile(canonicalPublicRoot, masterRelative, `${event.id} master`);
    const buffer = readBoundedRegularFile(masterPath, MAX_MASTER_BYTES, `${event.id} master`);
    const metadata = await validateMasterBuffer(buffer, `${event.id} reviewed master`);
    invariant(metadata.width === EXPECTED_MASTER_DIMENSIONS.width && metadata.height === EXPECTED_MASTER_DIMENSIONS.height, `${event.id} master must be ${EXPECTED_MASTER_DIMENSIONS.width}x${EXPECTED_MASTER_DIMENSIONS.height}.`);
    invariant(metadata.format === EXPECTED_MASTER_DIMENSIONS.format, `${event.id} master must decode as ${EXPECTED_MASTER_DIMENSIONS.format}.`);
    invariant(metadata.space === "srgb" && metadata.hasAlpha === false, `${event.id} master must be opaque sRGB.`);
    masters.push(Object.freeze({ event, buffer, metadata, sha256: sha256(buffer) }));
  }

  const brandHashes = {
    seal: sha256(brand.seal),
    cupcake: sha256(brand.cupcake),
    font: sha256(fontBuffer),
  };
  const version = renderVersion({
    rendererVersion: EVENT_SOCIAL_RENDERER_VERSION,
    events: masters.map(({ event, sha256: masterSha256 }) => ({ ...event, masterSha256 })),
    brandHashes,
    layouts: EVENT_SOCIAL_LAYOUTS,
  }, versionLabel);
  const outputs = [];

  for (const master of masters) {
    for (const platform of EVENT_SOCIAL_PLATFORMS) {
      const layout = EVENT_SOCIAL_LAYOUTS[platform];
      const buffer = await renderLayout({
        event: master.event,
        masterBuffer: master.buffer,
        platform,
        layout,
        brand,
        maximumOverlayLines: manifest.layouts[platform].maxOverlayTextLines,
      });
      const outputSha256 = sha256(buffer);
      const assetPath = eventSocialContentAddressedAssetPath(
        master.event.id,
        platform,
        outputSha256,
      );
      if (!allowPlatformSpecificTemporaryOutputs) {
        invariant(
          master.event.platformAssets[platform] === assetPath,
          `${master.event.id}.${platform} manifest path does not contain the full rendered SHA-256.`,
        );
      }
      const file = resolveOutputFile(output.resolved, assetPath, `${master.event.id}.${platform} output`);
      writeStableFile(file, buffer);
      outputs.push(Object.freeze({
        eventId: master.event.id,
        platform,
        assetPath,
        relativeFile: path.relative(output.resolved, file).split(path.sep).join("/"),
        width: layout.width,
        height: layout.height,
        format: layout.format,
        sha256: outputSha256,
        artMasterAsset: master.event.artMasterAsset,
        masterSha256: master.sha256,
        masterMode: "reviewed-master",
        masterWidth: master.metadata.width,
        masterHeight: master.metadata.height,
        altText: master.event.altText,
      }));
    }
  }

  const report = {
    schemaVersion: EVENT_SOCIAL_SCHEMA_VERSION,
    rendererVersion: EVENT_SOCIAL_RENDERER_VERSION,
    renderVersion: version,
    contentAddressedPlatformAssets: true,
    reusableOccurrenceIndependentCreative: true,
    overlayContainsDateOrTime: false,
    publicationEnabled: false,
    providerMutationPerformed: false,
    brandAssets: {
      seal: { relativeFile: EVENT_SOCIAL_BRAND_ASSETS.seal, sha256: brandHashes.seal },
      cupcake: { relativeFile: EVENT_SOCIAL_BRAND_ASSETS.cupcake, sha256: brandHashes.cupcake },
      font: { relativeFile: EVENT_SOCIAL_BRAND_ASSETS.font, sha256: brandHashes.font },
    },
    outputs: outputs.slice().sort((left, right) => left.relativeFile.localeCompare(right.relativeFile)),
  };
  const sidecar = path.join(output.resolved, "data", "event-social-assets.json");
  writeStableFile(
    sidecar,
    Buffer.from(`${JSON.stringify(report, null, 2)}\n`),
    { confirmedReplacement: output.canonical && confirmCanonicalPublicWrite },
  );
  return Object.freeze({ ...report, outputRoot: output.resolved, sidecar });
}

export async function renderEventSocialContactSheet(
  report,
  { confirmReviewArtifactWrite = false } = {},
) {
  invariant(confirmReviewArtifactWrite, "Review contact-sheet rendering requires confirmReviewArtifactWrite=true.");
  const canonicalPublicRoot = realpathSync(
    path.join(repositoryRoot, "apps", "web", "public"),
  );
  invariant(
    realpathSync(report?.outputRoot || "") === canonicalPublicRoot,
    "The review contact sheet requires a canonical public render report.",
  );
  const facebookOutputs = EVENT_SOCIAL_EVENT_IDS.map((eventId) =>
    report.outputs.find((output) =>
      output.eventId === eventId && output.platform === "facebook"
    )
  );
  invariant(
    facebookOutputs.every(Boolean),
    "The review contact sheet requires all eight Facebook derivatives.",
  );

  const cell = Object.freeze({ width: 324, height: 405 });
  const gap = Object.freeze({ x: 24, y: 24 });
  const margin = Object.freeze({ x: 12, y: 12 });
  const width = margin.x * 2 + cell.width * 4 + gap.x * 3;
  const height = margin.y * 2 + cell.height * 2 + gap.y;
  const layers = [];
  for (let index = 0; index < facebookOutputs.length; index += 1) {
    const output = facebookOutputs[index];
    const expectedAssetPath = eventSocialContentAddressedAssetPath(
      output.eventId,
      output.platform,
      output.sha256,
    );
    invariant(
      output.assetPath === expectedAssetPath &&
        output.relativeFile === expectedAssetPath.slice(2),
      `${output.eventId} review derivative is not content-addressed.`,
    );
    const source = resolveContainedFile(
      canonicalPublicRoot,
      output.relativeFile,
      `${output.eventId} review derivative`,
    );
    const bytes = readBoundedRegularFile(
      source,
      8 * 1024 * 1024,
      `${output.eventId} review derivative`,
    );
    invariant(
      sha256(bytes) === output.sha256,
      `${output.eventId} review derivative changed after rendering.`,
    );
    const thumbnail = await sharp()(bytes, {
      failOn: "warning",
      limitInputPixels: MAX_MASTER_PIXELS,
    })
      .resize(cell.width, cell.height, { fit: "fill" })
      .toColourspace("srgb")
      .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
      .toBuffer();
    layers.push({
      input: thumbnail,
      left: margin.x + (index % 4) * (cell.width + gap.x),
      top: margin.y + Math.floor(index / 4) * (cell.height + gap.y),
    });
  }

  const contactSheet = await sharp()({
    create: {
      width,
      height,
      channels: 3,
      background: OUTPUT_BACKGROUND,
    },
  })
    .composite(layers)
    .toColourspace("srgb")
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toBuffer();
  const outputFile = path.join(
    repositoryRoot,
    ".artifacts",
    "operations",
    "event-social",
    "event-social-contact-sheet.jpg",
  );
  writeStableFile(outputFile, contactSheet, { confirmedReplacement: true });
  return Object.freeze({
    file: outputFile,
    width,
    height,
    sha256: sha256(contactSheet),
  });
}

export function removeSupersededEventSocialPlatformAssets(
  report,
  { confirmSupersededAssetRemoval = false } = {},
) {
  invariant(
    confirmSupersededAssetRemoval,
    "Superseded event-social asset removal requires confirmSupersededAssetRemoval=true.",
  );
  const canonicalPublicRoot = realpathSync(
    path.join(repositoryRoot, "apps", "web", "public"),
  );
  invariant(
    realpathSync(report?.outputRoot || "") === canonicalPublicRoot,
    "Superseded event-social asset removal requires a canonical public render report.",
  );
  invariant(
    report?.outputs?.length ===
      EVENT_SOCIAL_EVENT_IDS.length * EVENT_SOCIAL_PLATFORMS.length,
    "Superseded event-social asset removal requires all canonical derivatives.",
  );

  const candidates = [];
  for (const eventId of EVENT_SOCIAL_EVENT_IDS) {
    const eventDirectory = realpathSync(
      path.join(
        canonicalPublicRoot,
        "assets",
        "img",
        "event-social",
        eventId,
      ),
    );
    const expectedDirectory = path.join(
      canonicalPublicRoot,
      "assets",
      "img",
      "event-social",
      eventId,
    );
    invariant(
      eventDirectory === expectedDirectory,
      `${eventId} output directory must not traverse or resolve through a link.`,
    );

    for (const platform of EVENT_SOCIAL_PLATFORMS) {
      const output = report.outputs.find((entry) =>
        entry.eventId === eventId && entry.platform === platform
      );
      invariant(output, `${eventId}.${platform} canonical output is missing.`);
      const expectedAssetPath = eventSocialContentAddressedAssetPath(
        eventId,
        platform,
        output.sha256,
      );
      invariant(
        output.assetPath === expectedAssetPath &&
          output.relativeFile === expectedAssetPath.slice(2),
        `${eventId}.${platform} canonical output is not content-addressed.`,
      );
      const canonicalFile = resolveContainedFile(
        canonicalPublicRoot,
        output.relativeFile,
        `${eventId}.${platform} canonical output`,
      );
      const canonicalBytes = readBoundedRegularFile(
        canonicalFile,
        8 * 1024 * 1024,
        `${eventId}.${platform} canonical output`,
      );
      invariant(
        sha256(canonicalBytes) === output.sha256,
        `${eventId}.${platform} canonical output changed before cleanup.`,
      );

      const legacyExtension = platform === "discord" ? "png" : "jpg";
      const legacyFile = path.join(
        eventDirectory,
        `${platform}.${legacyExtension}`,
      );
      invariant(
        path.dirname(legacyFile) === eventDirectory,
        `${eventId}.${platform} legacy output escaped its event directory.`,
      );
      if (!existsSync(legacyFile)) continue;
      const legacyBytes = readBoundedRegularFile(
        legacyFile,
        8 * 1024 * 1024,
        `${eventId}.${platform} superseded output`,
      );
      invariant(
        legacyBytes.equals(canonicalBytes),
        `${eventId}.${platform} superseded output differs from its content-addressed successor.`,
      );
      candidates.push(Object.freeze({
        eventId,
        platform,
        legacyFile,
        canonicalBytes,
      }));
    }
  }
  const removed = [];
  for (const candidate of candidates) {
    const currentBytes = readBoundedRegularFile(
      candidate.legacyFile,
      8 * 1024 * 1024,
      `${candidate.eventId}.${candidate.platform} superseded output`,
    );
    invariant(
      currentBytes.equals(candidate.canonicalBytes),
      `${candidate.eventId}.${candidate.platform} superseded output changed before removal.`,
    );
    unlinkSync(candidate.legacyFile);
    removed.push(
      path.relative(canonicalPublicRoot, candidate.legacyFile).split(path.sep)
        .join("/"),
    );
  }
  return Object.freeze({ removed: Object.freeze(removed) });
}

export function loadEventSocialJson(file, label = "Event social JSON") {
  const buffer = readBoundedRegularFile(file, 512 * 1024, label);
  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${label} is not valid JSON. (${message})`);
  }
}

export function getRepositoryRoot() {
  return repositoryRoot;
}
