import { closeSync, existsSync, fstatSync, lstatSync, openSync, readdirSync, readSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadImage } from "@napi-rs/canvas";
import { AudioDecoder, EncodedAudioChunk, ImageDecoder } from "@napi-rs/webcodecs";
import {
  maximumAssetFormatBytes,
  validateAssetFormat,
} from "../../../scripts/lib/asset-format-validation.mjs";
import {
  assertReviewedVendorDecodedDimensions,
  REVIEWED_VENDOR_ASSET_PATHS,
  validatePublicAssetWithReviewedVendorPolicy,
} from "../../../scripts/lib/reviewed-vendor-assets.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDirectory, "..");
const repositoryRoot = resolve(webRoot, "../..");
const publicRoots = [
  resolve(webRoot, "public"),
  resolve(repositoryRoot, "services/social/public"),
  resolve(repositoryRoot, "apps/shopify-theme/assets"),
];
const mimeTypes = new Map([
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);
const decodedExtensions = new Set([...mimeTypes.keys(), ".ico", ".mp3"]);
const maximumEdge = 16_384;
const maximumPixels = 100_000_000;
const maximumTreeEntries = 100_000;
const maximumTreeDepth = 64;
const maximumMediaFiles = 10_000;

function walk(directory, state = { entries: 0 }, depth = 0) {
  if (depth > maximumTreeDepth) throw new Error(`Public media tree exceeds the ${maximumTreeDepth}-level depth bound: ${displayPath(directory)}`);
  if (!existsSync(directory)) throw new Error(`Public media tree does not exist: ${displayPath(directory)}`);
  if (lstatSync(directory).isSymbolicLink()) {
    throw new Error(`Public media tree contains a symbolic-link root: ${displayPath(directory)}`);
  }
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    state.entries += 1;
    if (state.entries > maximumTreeEntries) {
      throw new Error(`Public media trees exceed the ${maximumTreeEntries}-entry traversal bound`);
    }
    const absolute = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Public media tree contains a symbolic link: ${displayPath(absolute)}`);
    if (entry.isDirectory()) files.push(...walk(absolute, state, depth + 1));
    else if (entry.isFile()) files.push(absolute);
    else throw new Error(`Public media tree contains a non-regular entry: ${displayPath(absolute)}`);
  }
  return files;
}

function displayPath(file) {
  return relative(repositoryRoot, file).split("\\").join("/");
}

function readBoundedRegularFile(file, maximumBytes) {
  const handle = openSync(file, "r");
  try {
    const before = fstatSync(handle);
    if (!before.isFile()) throw new Error("media asset is not a regular file");
    if (before.size === 0 || before.size > maximumBytes) {
      throw new Error(`file length ${before.size} is outside the ${maximumBytes}-byte pre-read bound`);
    }
    const buffer = Buffer.allocUnsafe(before.size);
    let offset = 0;
    while (offset < buffer.length) {
      const count = readSync(handle, buffer, offset, buffer.length - offset, offset);
      if (count === 0) throw new Error("media asset ended during bounded read");
      offset += count;
    }
    const after = fstatSync(handle);
    if (after.size !== before.size || after.mtimeMs !== before.mtimeMs) throw new Error("media asset changed during validation");
    return buffer;
  } finally {
    closeSync(handle);
  }
}

async function decodeImage(data, type) {
  const decoder = new ImageDecoder({ data, type, preferAnimation: false });
  try {
    const result = await decoder.decode({ frameIndex: 0 });
    const width = result.image.codedWidth;
    const height = result.image.codedHeight;
    result.image.close();
    if (width < 1 || height < 1 || width > maximumEdge || height > maximumEdge || width * height > maximumPixels) {
      throw new Error(`decoded dimensions ${width}x${height} exceed the public-image bound`);
    }
    return { width, height };
  } finally {
    decoder.close();
  }
}

async function expectDecodeRejection(label, data, type) {
  try {
    await decodeImage(data, type);
  } catch {
    return;
  }
  throw new Error(`Image decoder canary failed closed: ${label} decoded successfully.`);
}

async function decodeIco(data) {
  const count = data.readUInt16LE(4);
  for (let index = 0; index < count; index += 1) {
    const entry = 6 + index * 16;
    const expectedWidth = data[entry] || 256;
    const expectedHeight = data[entry + 1] || 256;
    const size = data.readUInt32LE(entry + 8);
    const offset = data.readUInt32LE(entry + 12);
    const singleImageIcon = Buffer.allocUnsafe(22 + size);
    data.copy(singleImageIcon, 0, 0, 6);
    data.copy(singleImageIcon, 6, entry, entry + 16);
    singleImageIcon.writeUInt16LE(1, 4);
    singleImageIcon.writeUInt32LE(22, 18);
    data.copy(singleImageIcon, 22, offset, offset + size);

    const image = await loadImage(singleImageIcon);
    const width = image.width;
    const height = image.height;
    if (width < 1 || height < 1 || width > maximumEdge || height > maximumEdge || width * height > maximumPixels) {
      throw new Error(`decoded ICO image ${index + 1} dimensions ${width}x${height} exceed the public-image bound`);
    }
    if (width !== expectedWidth || height !== expectedHeight) {
      throw new Error(
        `decoded ICO image ${index + 1} dimensions ${width}x${height} disagree with `
        + `${expectedWidth}x${expectedHeight} in the icon directory`,
      );
    }
  }
  return { images: count };
}

async function decodeMp3(data, structural) {
  const config = {
    codec: "mp3",
    sampleRate: structural.sampleRate,
    numberOfChannels: structural.channels,
  };
  const support = await AudioDecoder.isConfigSupported(config);
  if (!support.supported) throw new Error("the pinned independent decoder does not support MP3");

  let callbackError;
  let outputs = 0;
  let decodedFrames = 0;
  const decoder = new AudioDecoder({
    output(audio) {
      try {
        if (audio.numberOfFrames < 1) throw new Error("decoder emitted an empty audio frame");
        if (audio.sampleRate !== structural.sampleRate || audio.numberOfChannels !== structural.channels) {
          throw new Error(
            `decoded format ${audio.sampleRate} Hz/${audio.numberOfChannels} channels disagrees with `
            + `${structural.sampleRate} Hz/${structural.channels} channels`,
          );
        }
        outputs += 1;
        decodedFrames += audio.numberOfFrames;
      } catch (error) {
        callbackError = error;
      } finally {
        audio.close();
      }
    },
    error(error) {
      callbackError = error;
    },
  });

  try {
    decoder.configure(config);
    decoder.decode(new EncodedAudioChunk({ type: "key", timestamp: 0, data }));
    await decoder.flush();
    if (callbackError) throw callbackError;
    if (outputs !== structural.frames || decodedFrames < outputs) {
      throw new Error(
        `decoder emitted ${outputs} packets/${decodedFrames} audio frames for ${structural.frames} validated MP3 frames`,
      );
    }
    return { outputs, decodedFrames };
  } finally {
    if (decoder.state !== "closed") decoder.close();
  }
}

async function expectAudioDecodeRejection(label, data, structural) {
  try {
    await decodeMp3(data, structural);
  } catch {
    return;
  }
  throw new Error(`Audio decoder canary failed closed: ${label} decoded successfully.`);
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(buffer, start, end) {
  let value = 0xffffffff;
  for (let offset = start; offset < end; offset += 1) {
    value = crcTable[(value ^ buffer[offset]) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function pngChunk(type, payload = Buffer.alloc(0)) {
  const chunk = Buffer.alloc(payload.length + 12);
  chunk.writeUInt32BE(payload.length, 0);
  chunk.write(type, 4, 4, "ascii");
  payload.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk, 4, 8 + payload.length), 8 + payload.length);
  return chunk;
}

async function assertDecoderCanaries() {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const malformedPng = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT"),
    pngChunk("IEND"),
  ]);
  validateAssetFormat(".png", malformedPng);
  await expectDecodeRejection("CRC-correct PNG with an empty IDAT payload", malformedPng, "image/png");

  const malformedWebp = Buffer.alloc(26);
  malformedWebp.write("RIFF", 0, 4, "ascii");
  malformedWebp.writeUInt32LE(18, 4);
  malformedWebp.write("WEBP", 8, 4, "ascii");
  malformedWebp.write("VP8L", 12, 4, "ascii");
  malformedWebp.writeUInt32LE(5, 16);
  malformedWebp[20] = 0x2f;
  validateAssetFormat(".webp", malformedWebp);
  await expectDecodeRejection("header-only WebP lossless payload", malformedWebp, "image/webp");

  await expectAudioDecodeRejection(
    "empty MP3 packet",
    Buffer.alloc(1),
    { frames: 1, sampleRate: 44_100, channels: 2 },
  );
}

await assertDecoderCanaries();

const traversalState = { entries: 0 };
const files = publicRoots
  .flatMap((publicRoot) => walk(publicRoot, traversalState))
  .filter((file) => decodedExtensions.has(extname(file).toLowerCase()));
if (files.length > maximumMediaFiles) throw new Error(`Public media trees exceed the ${maximumMediaFiles}-file decode bound`);
const failures = [];
const reviewedVendorAssetsSeen = new Set();

for (const file of files) {
  const extension = extname(file).toLowerCase();
  try {
    const maximumBytes = maximumAssetFormatBytes(extension);
    if (maximumBytes === null) throw new Error(`no structural size policy exists for ${extension}`);
    const data = readBoundedRegularFile(file, maximumBytes);
    const relativePath = displayPath(file);
    const { reviewedVendor, structural } = validatePublicAssetWithReviewedVendorPolicy(relativePath, extension, data);
    if (reviewedVendor) reviewedVendorAssetsSeen.add(relativePath);
    if (structural === null) throw new Error(`no structural validator exists for ${extension}`);

    if (extension === ".mp3") {
      await decodeMp3(data, structural);
    } else if (extension === ".ico") {
      const decoded = await decodeIco(data);
      if (decoded.images !== structural.images) throw new Error("decoded ICO image count disagrees with the validated directory");
    } else {
      if (!("width" in structural) || !("height" in structural)) {
        throw new Error(`no dimension-bearing structural validator exists for ${extension}`);
      }
      const decoded = await decodeImage(data, mimeTypes.get(extension));
      if (reviewedVendor) {
        assertReviewedVendorDecodedDimensions(relativePath, decoded);
      } else if (decoded.width !== structural.width || decoded.height !== structural.height) {
        throw new Error(`decoded dimensions ${decoded.width}x${decoded.height} disagree with container ${structural.width}x${structural.height}`);
      }
    }
  } catch (error) {
    failures.push(`${displayPath(file)}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

for (const relativePath of REVIEWED_VENDOR_ASSET_PATHS) {
  if (!reviewedVendorAssetsSeen.has(relativePath)) {
    failures.push(`${relativePath}: reviewed vendor asset is missing from the public media decode inventory`);
  }
}

if (failures.length) {
  console.error(`Public media decode failed for ${failures.length}/${files.length} files.`);
  for (const failure of failures.slice(0, 40)) console.error(`- ${failure}`);
  if (failures.length > 40) console.error(`- ...and ${failures.length - 40} more`);
  process.exit(1);
}

console.log(`Public media decode OK for ${files.length} image, icon, and audio files across ${publicRoots.length} owned surfaces.`);
