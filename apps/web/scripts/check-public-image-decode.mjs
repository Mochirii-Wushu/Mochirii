import { closeSync, fstatSync, openSync, readdirSync, readSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ImageDecoder } from "@napi-rs/webcodecs";
import {
  maximumAssetFormatBytes,
  validateAssetFormat,
} from "../../../scripts/lib/asset-format-validation.mjs";

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
const maximumEdge = 16_384;
const maximumPixels = 100_000_000;

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Public image tree contains a symbolic link: ${displayPath(absolute)}`);
    if (entry.isDirectory()) files.push(...walk(absolute));
    else if (entry.isFile()) files.push(absolute);
    else throw new Error(`Public image tree contains a non-regular entry: ${displayPath(absolute)}`);
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
    if (!before.isFile()) throw new Error("image is not a regular file");
    if (before.size === 0 || before.size > maximumBytes) {
      throw new Error(`file length ${before.size} is outside the ${maximumBytes}-byte pre-read bound`);
    }
    const buffer = Buffer.allocUnsafe(before.size);
    let offset = 0;
    while (offset < buffer.length) {
      const count = readSync(handle, buffer, offset, buffer.length - offset, offset);
      if (count === 0) throw new Error("image ended during bounded read");
      offset += count;
    }
    const after = fstatSync(handle);
    if (after.size !== before.size || after.mtimeMs !== before.mtimeMs) throw new Error("image changed during validation");
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
}

await assertDecoderCanaries();

const files = publicRoots
  .flatMap((publicRoot) => walk(publicRoot))
  .filter((file) => mimeTypes.has(extname(file).toLowerCase()));
const failures = [];

for (const file of files) {
  const extension = extname(file).toLowerCase();
  try {
    const maximumBytes = maximumAssetFormatBytes(extension);
    if (maximumBytes === null) throw new Error(`no structural size policy exists for ${extension}`);
    const data = readBoundedRegularFile(file, maximumBytes);
    const structural = validateAssetFormat(extension, data);
    if (structural === null || !("width" in structural) || !("height" in structural)) {
      throw new Error(`no dimension-bearing structural validator exists for ${extension}`);
    }
    const decoded = await decodeImage(data, mimeTypes.get(extension));
    if (decoded.width !== structural.width || decoded.height !== structural.height) {
      throw new Error(`decoded dimensions ${decoded.width}x${decoded.height} disagree with container ${structural.width}x${structural.height}`);
    }
  } catch (error) {
    failures.push(`${displayPath(file)}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length) {
  console.error(`Public image decode failed for ${failures.length}/${files.length} files.`);
  for (const failure of failures.slice(0, 40)) console.error(`- ${failure}`);
  if (failures.length > 40) console.error(`- ...and ${failures.length - 40} more`);
  process.exit(1);
}

console.log(`Public image decode OK for ${files.length} files across ${publicRoots.length} owned surfaces.`);
