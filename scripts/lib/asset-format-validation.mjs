import { readFileSync } from "node:fs";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
const MAX_AUDIO_BYTES = 32 * 1024 * 1024;
const MAX_CHUNKS = 100_000;
const MAX_ICON_IMAGES = 256;
const MAX_METADATA_CHUNK_BYTES = 1024 * 1024;
const MAX_MP3_FRAMES = 100_000;
const MAX_GIF_FRAMES = 1_024;
const MAX_IMAGE_EDGE = 16_384;
const MAX_IMAGE_PIXELS = 100_000_000;
const CANONICAL_PNG_PIXELS_PER_METER = 2_835;
const ALLOWED_PUBLIC_WEBP_CHUNKS = new Set(["VP8X", "ALPH", "VP8 ", "VP8L"]);
const WEBP_PRIVACY_METADATA_CHUNKS = new Set(["ICCP", "EXIF", "XMP "]);
const ALLOWED_PUBLIC_PNG_CHUNKS = new Set(["IHDR", "PLTE", "tRNS", "pHYs", "sRGB", "IDAT", "IEND"]);
const PNG_PRIVACY_METADATA_CHUNKS = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME", "iCCP"]);

export function maximumAssetFormatBytes(extension) {
  if ([".gif", ".jpeg", ".jpg", ".webp", ".png", ".ico"].includes(extension)) return MAX_IMAGE_BYTES;
  if (extension === ".mp3") return MAX_AUDIO_BYTES;
  return null;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
    table[index] = value >>> 0;
  }
  return table;
})();

function invalid(format, message) {
  throw new Error(`${format}: ${message}`);
}

function bounded(buffer, maximum, format) {
  if (!Buffer.isBuffer(buffer)) invalid(format, "validator expected a Buffer");
  if (buffer.length === 0) invalid(format, "file is empty");
  if (buffer.length > maximum) invalid(format, `file exceeds the ${maximum}-byte structural-validation bound`);
}

function readUint24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function validateDimensions(format, width, height) {
  if (width === 0 || height === 0) invalid(format, "image has zero dimensions");
  if (width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE || width * height > MAX_IMAGE_PIXELS) {
    invalid(format, "image dimensions exceed the validation bound");
  }
}

function crc32(buffer, start, end) {
  let value = 0xffffffff;
  for (let offset = start; offset < end; offset += 1) {
    value = CRC32_TABLE[(value ^ buffer[offset]) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

export function validateWebp(buffer) {
  bounded(buffer, MAX_IMAGE_BYTES, "WebP");
  if (buffer.length < 26) invalid("WebP", "container is too short");
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    invalid("WebP", "RIFF/WEBP signature is missing");
  }
  if (buffer.readUInt32LE(4) + 8 !== buffer.length) invalid("WebP", "RIFF length does not match the file length");

  let offset = 12;
  let chunks = 0;
  let imageChunks = 0;
  let extendedHeader = false;
  let extendedFlags = 0;
  let sawAlpha = false;
  let width = 0;
  let height = 0;

  while (offset < buffer.length) {
    if (chunks >= MAX_CHUNKS) invalid("WebP", "chunk count exceeds the validation bound");
    if (offset + 8 > buffer.length) invalid("WebP", "truncated chunk header");
    const type = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const payload = offset + 8;
    const end = payload + size;
    const paddedEnd = end + (size & 1);
    if (end < payload || paddedEnd > buffer.length) invalid("WebP", `${type || "unknown"} chunk exceeds the container`);
    if (!ALLOWED_PUBLIC_WEBP_CHUNKS.has(type)) {
      const category = WEBP_PRIVACY_METADATA_CHUNKS.has(type) ? "privacy-bearing metadata" : "unapproved";
      invalid("WebP", `${category} ${JSON.stringify(type)} chunk is not permitted in public assets`);
    }
    if ((size & 1) !== 0 && buffer[end] !== 0) invalid("WebP", `${type} chunk has a nonzero padding byte`);

    if (type === "VP8X") {
      if (extendedHeader || offset !== 12 || size !== 10) invalid("WebP", "invalid or duplicate VP8X header");
      if (buffer[payload + 1] !== 0 || buffer[payload + 2] !== 0 || buffer[payload + 3] !== 0) {
        invalid("WebP", "VP8X reserved bytes are nonzero");
      }
      extendedFlags = buffer[payload];
      if ((extendedFlags & ~0x10) !== 0) {
        invalid("WebP", "VP8X advertises metadata, animation, or reserved features that are not permitted in public assets");
      }
      extendedHeader = true;
      width = readUint24LE(buffer, payload + 4) + 1;
      height = readUint24LE(buffer, payload + 7) + 1;
      validateDimensions("WebP", width, height);
    } else if (type === "ALPH") {
      if (!extendedHeader || sawAlpha || imageChunks > 0 || (extendedFlags & 0x10) === 0 || size < 1) {
        invalid("WebP", "ALPH is duplicate, out of order, empty, or not declared by VP8X");
      }
      const alphaHeader = buffer[payload];
      const compression = alphaHeader & 0x03;
      const preprocessing = (alphaHeader >>> 4) & 0x03;
      if ((alphaHeader & 0xc0) !== 0 || compression > 1 || preprocessing > 1) {
        invalid("WebP", "ALPH header contains a reserved or unsupported value");
      }
      if (compression === 0 && size !== width * height + 1) {
        invalid("WebP", "uncompressed ALPH payload length does not match the canvas");
      }
      if (compression === 1 && size < 2) invalid("WebP", "compressed ALPH payload is empty");
      sawAlpha = true;
    } else if (type === "VP8 ") {
      if (imageChunks > 0) invalid("WebP", "container has more than one image chunk");
      if (extendedHeader && Boolean(extendedFlags & 0x10) !== sawAlpha) {
        invalid("WebP", "VP8X alpha declaration disagrees with the ALPH chunk");
      }
      if (size < 10 || (buffer[payload] & 1) !== 0) invalid("WebP", "invalid VP8 key frame");
      if (buffer[payload + 3] !== 0x9d || buffer[payload + 4] !== 0x01 || buffer[payload + 5] !== 0x2a) {
        invalid("WebP", "VP8 frame sync code is missing");
      }
      const frameWidth = buffer.readUInt16LE(payload + 6) & 0x3fff;
      const frameHeight = buffer.readUInt16LE(payload + 8) & 0x3fff;
      validateDimensions("WebP", frameWidth, frameHeight);
      if (extendedHeader && (frameWidth !== width || frameHeight !== height)) invalid("WebP", "VP8 frame dimensions disagree with VP8X");
      if (!extendedHeader) [width, height] = [frameWidth, frameHeight];
      imageChunks += 1;
    } else if (type === "VP8L") {
      if (imageChunks > 0 || sawAlpha) invalid("WebP", "VP8L is duplicate or cannot follow a separate ALPH chunk");
      if (size < 5 || buffer[payload] !== 0x2f) invalid("WebP", "invalid VP8L frame header");
      const bits = buffer.readUInt32LE(payload + 1);
      if ((bits >>> 29) !== 0) invalid("WebP", "VP8L version bits are nonzero");
      const frameWidth = (bits & 0x3fff) + 1;
      const frameHeight = ((bits >>> 14) & 0x3fff) + 1;
      const hasAlpha = (bits & 0x10000000) !== 0;
      if (extendedHeader && Boolean(extendedFlags & 0x10) !== hasAlpha) {
        invalid("WebP", "VP8X alpha declaration disagrees with the VP8L frame");
      }
      if (extendedHeader && (frameWidth !== width || frameHeight !== height)) invalid("WebP", "VP8L frame dimensions disagree with VP8X");
      if (!extendedHeader) [width, height] = [frameWidth, frameHeight];
      imageChunks += 1;
    }

    offset = paddedEnd;
    chunks += 1;
  }

  if (offset !== buffer.length) invalid("WebP", "container ends between chunks");
  if (imageChunks !== 1) invalid("WebP", "container must contain exactly one static VP8 or VP8L image");
  validateDimensions("WebP", width, height);
  return { width, height, chunks };
}

const VALID_PNG_DEPTHS = new Map([
  [0, new Set([1, 2, 4, 8, 16])],
  [2, new Set([8, 16])],
  [3, new Set([1, 2, 4, 8])],
  [4, new Set([8, 16])],
  [6, new Set([8, 16])],
]);
const KNOWN_CRITICAL_PNG_CHUNKS = new Set(["IHDR", "PLTE", "IDAT", "IEND"]);

export function validatePng(buffer) {
  bounded(buffer, MAX_IMAGE_BYTES, "PNG");
  if (buffer.length < 45 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) invalid("PNG", "signature is missing");

  let offset = 8;
  let chunks = 0;
  let idatChunks = 0;
  let sawIhdr = false;
  let sawIend = false;
  let sawPlte = false;
  let sawTransparency = false;
  let sawPhysicalDimensions = false;
  let sawSrgb = false;
  let idatEnded = false;
  let width = 0;
  let height = 0;
  let bitDepth = -1;
  let colorType = -1;
  let paletteEntries = 0;

  while (offset < buffer.length) {
    if (chunks >= MAX_CHUNKS) invalid("PNG", "chunk count exceeds the validation bound");
    if (offset + 12 > buffer.length) invalid("PNG", "truncated chunk header");
    const size = buffer.readUInt32BE(offset);
    const typeStart = offset + 4;
    const type = buffer.toString("ascii", typeStart, typeStart + 4);
    const payload = offset + 8;
    const end = payload + size;
    const crcOffset = end;
    if (!/^[A-Za-z]{4}$/.test(type)) invalid("PNG", "chunk type contains invalid bytes");
    if (type[2] !== type[2].toUpperCase()) invalid("PNG", `${type} uses the reserved chunk-type bit`);
    if (type[0] === type[0].toUpperCase() && !KNOWN_CRITICAL_PNG_CHUNKS.has(type)) {
      invalid("PNG", `unknown critical ${type} chunk cannot be decoded safely`);
    }
    if (end < payload || crcOffset + 4 > buffer.length) invalid("PNG", `${type} chunk exceeds the file`);
    if (size > MAX_METADATA_CHUNK_BYTES && type !== "IDAT") invalid("PNG", `${type} metadata exceeds the validation bound`);
    if (buffer.readUInt32BE(crcOffset) !== crc32(buffer, typeStart, end)) invalid("PNG", `${type} chunk CRC is invalid`);
    if (!ALLOWED_PUBLIC_PNG_CHUNKS.has(type)) {
      const category = PNG_PRIVACY_METADATA_CHUNKS.has(type) ? "privacy-bearing metadata" : "unapproved ancillary";
      invalid("PNG", `${category} ${JSON.stringify(type)} chunk is not permitted in public assets`);
    }

    if (chunks === 0 && type !== "IHDR") invalid("PNG", "IHDR is not the first chunk");
    if (type === "IHDR") {
      if (sawIhdr || size !== 13) invalid("PNG", "invalid or duplicate IHDR");
      width = buffer.readUInt32BE(payload);
      height = buffer.readUInt32BE(payload + 4);
      bitDepth = buffer[payload + 8];
      colorType = buffer[payload + 9];
      validateDimensions("PNG", width, height);
      if (!VALID_PNG_DEPTHS.get(colorType)?.has(bitDepth)) invalid("PNG", "invalid color-type/bit-depth combination");
      if (buffer[payload + 10] !== 0 || buffer[payload + 11] !== 0 || buffer[payload + 12] > 1) {
        invalid("PNG", "unsupported compression, filter, or interlace method");
      }
      sawIhdr = true;
    } else if (type === "sRGB") {
      if (sawSrgb || sawPlte || idatChunks > 0 || size !== 1 || buffer[payload] > 3) {
        invalid("PNG", "sRGB is duplicate, malformed, or out of order");
      }
      sawSrgb = true;
    } else if (type === "PLTE") {
      if (
        sawPlte || sawTransparency || idatChunks > 0 ||
        colorType !== 3 ||
        size === 0 || size > 768 || size % 3 !== 0
      ) invalid("PNG", "PLTE is invalid, prohibited for the color type, or out of order");
      sawPlte = true;
      paletteEntries = size / 3;
      if (colorType === 3 && paletteEntries > (1 << bitDepth)) invalid("PNG", "PLTE has more entries than indexed bit depth permits");
    } else if (type === "tRNS") {
      if (sawTransparency || idatChunks > 0 || colorType === 4 || colorType === 6) {
        invalid("PNG", "tRNS is duplicate, prohibited for the color type, or out of order");
      }
      if (
        (colorType === 0 && size !== 2) ||
        (colorType === 2 && size !== 6) ||
        (colorType === 3 && (!sawPlte || size === 0 || size > paletteEntries))
      ) invalid("PNG", "tRNS length or palette relationship is invalid");
      const maximumSample = (2 ** bitDepth) - 1;
      if (colorType === 0 && buffer.readUInt16BE(payload) > maximumSample) {
        invalid("PNG", "grayscale tRNS sample exceeds the declared bit depth");
      }
      if (
        colorType === 2
        && [0, 2, 4].some((sampleOffset) => buffer.readUInt16BE(payload + sampleOffset) > maximumSample)
      ) {
        invalid("PNG", "truecolor tRNS sample exceeds the declared bit depth");
      }
      sawTransparency = true;
    } else if (type === "pHYs") {
      if (
        sawPhysicalDimensions || idatChunks > 0 || size !== 9
        || buffer.readUInt32BE(payload) !== CANONICAL_PNG_PIXELS_PER_METER
        || buffer.readUInt32BE(payload + 4) !== CANONICAL_PNG_PIXELS_PER_METER
        || buffer[payload + 8] !== 1
      ) {
        invalid("PNG", "pHYs is duplicate, noncanonical, malformed, or out of order");
      }
      sawPhysicalDimensions = true;
    } else if (type === "IDAT") {
      if (!sawIhdr || sawIend || idatEnded) invalid("PNG", "IDAT is outside the consecutive image data sequence");
      if (colorType === 3 && !sawPlte) invalid("PNG", "indexed-color image is missing PLTE before IDAT");
      idatChunks += 1;
    } else if (type === "IEND") {
      if (!sawIhdr || sawIend || size !== 0) invalid("PNG", "invalid or duplicate IEND");
      sawIend = true;
      if (crcOffset + 4 !== buffer.length) invalid("PNG", "data follows IEND");
    }

    if (idatChunks > 0 && type !== "IDAT") idatEnded = true;

    offset = crcOffset + 4;
    chunks += 1;
  }

  if (!sawIhdr || !sawIend || idatChunks === 0) invalid("PNG", "required IHDR, IDAT, or IEND chunk is missing");
  if (colorType === 3 && !sawPlte) invalid("PNG", "indexed-color image is missing PLTE");
  return { width, height, chunks };
}

function readGifSubBlocks(buffer, start, label, state) {
  let offset = start;
  let totalBytes = 0;
  const chunks = [];
  while (true) {
    if (offset >= buffer.length) invalid("GIF", `${label} sub-block sequence is truncated`);
    if (state.subBlocks >= MAX_CHUNKS) invalid("GIF", "sub-block count exceeds the validation bound");
    const size = buffer[offset];
    offset += 1;
    state.subBlocks += 1;
    if (size === 0) break;
    const end = offset + size;
    if (end > buffer.length) invalid("GIF", `${label} sub-block exceeds the file`);
    chunks.push(buffer.subarray(offset, end));
    totalBytes += size;
    offset = end;
  }
  return { data: Buffer.concat(chunks, totalBytes), offset };
}

function validateGifLzw(data, minimumCodeSize, expectedPixels, paletteEntries, frameNumber) {
  const label = `frame ${frameNumber} LZW stream`;
  if (minimumCodeSize < 2 || minimumCodeSize > 8) invalid("GIF", `${label} has an invalid minimum code size`);
  if (data.length === 0) invalid("GIF", `${label} is empty`);

  const clearCode = 1 << minimumCodeSize;
  const endCode = clearCode + 1;
  const prefixes = new Uint16Array(4_096);
  const suffixes = new Uint8Array(4_096);
  const stack = new Uint8Array(4_097);
  for (let index = 0; index < clearCode; index += 1) suffixes[index] = index;

  let bitOffset = 0;
  let codeSize = minimumCodeSize + 1;
  let available = endCode + 1;
  let previousCode = -1;
  let firstByte = 0;
  let pixels = 0;
  let sawInitialClear = false;
  let sawEnd = false;

  const readCode = () => {
    if (bitOffset + codeSize > data.length * 8) invalid("GIF", `${label} ends between codes`);
    let code = 0;
    for (let bit = 0; bit < codeSize; bit += 1) {
      code |= ((data[(bitOffset + bit) >>> 3] >>> ((bitOffset + bit) & 7)) & 1) << bit;
    }
    bitOffset += codeSize;
    return code;
  };
  const emit = (paletteIndex) => {
    if (paletteIndex >= paletteEntries) invalid("GIF", `frame ${frameNumber} references a missing palette entry`);
    pixels += 1;
    if (pixels > expectedPixels) invalid("GIF", `${label} expands beyond the frame dimensions`);
  };

  while (!sawEnd) {
    const code = readCode();
    if (!sawInitialClear) {
      if (code !== clearCode) invalid("GIF", `${label} does not begin with a clear code`);
      sawInitialClear = true;
      continue;
    }
    if (code === clearCode) {
      codeSize = minimumCodeSize + 1;
      available = endCode + 1;
      previousCode = -1;
      continue;
    }
    if (code === endCode) {
      sawEnd = true;
      break;
    }

    if (previousCode === -1) {
      if (code >= clearCode) invalid("GIF", `${label} begins with an invalid literal code`);
      emit(code);
      firstByte = code;
      previousCode = code;
      continue;
    }

    const incomingCode = code;
    let currentCode = code;
    let stackLength = 0;
    if (currentCode === available) {
      stack[stackLength] = firstByte;
      stackLength += 1;
      currentCode = previousCode;
    } else if (currentCode > available) {
      invalid("GIF", `${label} references an unavailable dictionary entry`);
    }

    while (currentCode >= clearCode) {
      if (currentCode >= available || stackLength >= 4_096) {
        invalid("GIF", `${label} contains an invalid dictionary chain`);
      }
      stack[stackLength] = suffixes[currentCode];
      stackLength += 1;
      currentCode = prefixes[currentCode];
    }
    firstByte = currentCode;
    stack[stackLength] = firstByte;
    stackLength += 1;
    while (stackLength > 0) {
      stackLength -= 1;
      emit(stack[stackLength]);
    }

    if (available < 4_096) {
      prefixes[available] = previousCode;
      suffixes[available] = firstByte;
      available += 1;
      if (available === (1 << codeSize) && codeSize < 12) codeSize += 1;
    }
    previousCode = incomingCode;
  }

  if (!sawEnd) invalid("GIF", `${label} is missing an end code`);
  if (pixels !== expectedPixels) invalid("GIF", `${label} pixel count does not match the frame dimensions`);
  if (Math.ceil(bitOffset / 8) !== data.length) invalid("GIF", `${label} has bytes after its end code`);
  for (let bit = bitOffset; bit < data.length * 8; bit += 1) {
    if (((data[bit >>> 3] >>> (bit & 7)) & 1) !== 0) invalid("GIF", `${label} has nonzero padding bits`);
  }
}

export function validateGif(buffer) {
  bounded(buffer, MAX_IMAGE_BYTES, "GIF");
  if (buffer.length < 20) invalid("GIF", "container is too short");
  const version = buffer.toString("ascii", 0, 6);
  if (version !== "GIF87a" && version !== "GIF89a") invalid("GIF", "signature or version is invalid");

  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  validateDimensions("GIF", width, height);
  const logicalPacked = buffer[10];
  const hasGlobalPalette = (logicalPacked & 0x80) !== 0;
  const colorResolution = (logicalPacked >>> 4) & 0x07;
  const globalSort = (logicalPacked & 0x08) !== 0;
  const globalSizeCode = logicalPacked & 0x07;
  const globalPaletteEntries = hasGlobalPalette ? (1 << (globalSizeCode + 1)) : 0;
  if (globalSort) invalid("GIF", "sorted global color tables are not permitted in canonical public assets");
  if (hasGlobalPalette && colorResolution !== globalSizeCode) {
    invalid("GIF", "global color resolution disagrees with the palette size");
  }
  if (!hasGlobalPalette && (colorResolution !== 0 || globalSizeCode !== 0 || buffer[11] !== 0)) {
    invalid("GIF", "logical-screen palette fields are noncanonical without a global palette");
  }
  if (hasGlobalPalette && buffer[11] >= globalPaletteEntries) invalid("GIF", "background color index exceeds the global palette");
  if (buffer[12] !== 0) invalid("GIF", "nonzero pixel aspect metadata is not permitted in public assets");

  let offset = 13 + globalPaletteEntries * 3;
  if (offset > buffer.length) invalid("GIF", "global color table is truncated");
  let frames = 0;
  let totalFramePixels = 0;
  let sawLoopExtension = false;
  let pendingGraphicControl = null;
  let sawTrailer = false;
  const subBlockState = { subBlocks: 0 };
  const canonicalLoopExtension = Buffer.concat([
    Buffer.from([0x0b]),
    Buffer.from("NETSCAPE2.0", "ascii"),
    Buffer.from([0x03, 0x01, 0x00, 0x00, 0x00]),
  ]);

  while (offset < buffer.length) {
    const introducer = buffer[offset];
    offset += 1;
    if (introducer === 0x3b) {
      sawTrailer = true;
      if (offset !== buffer.length) invalid("GIF", "data follows the trailer");
      break;
    }

    if (introducer === 0x21) {
      if (version !== "GIF89a" || offset >= buffer.length) invalid("GIF", "extension is truncated or incompatible with GIF87a");
      const label = buffer[offset];
      offset += 1;
      if (label === 0xff) {
        const end = offset + canonicalLoopExtension.length;
        if (
          sawLoopExtension || frames > 0 || pendingGraphicControl !== null || end > buffer.length
          || !buffer.subarray(offset, end).equals(canonicalLoopExtension)
        ) {
          invalid("GIF", "application extension is duplicate, noncanonical, or out of order");
        }
        sawLoopExtension = true;
        offset = end;
      } else if (label === 0xf9) {
        if (pendingGraphicControl !== null || offset + 6 > buffer.length || buffer[offset] !== 4 || buffer[offset + 5] !== 0) {
          invalid("GIF", "graphic-control extension is duplicate or malformed");
        }
        const packed = buffer[offset + 1];
        const disposal = (packed >>> 2) & 0x07;
        if ((packed & 0xe2) !== 0 || disposal > 3) {
          invalid("GIF", "graphic-control extension contains reserved or unsupported flags");
        }
        pendingGraphicControl = {
          transparent: (packed & 1) !== 0,
          transparentIndex: buffer[offset + 4],
        };
        offset += 6;
      } else {
        invalid("GIF", `unapproved extension label 0x${label.toString(16).padStart(2, "0")} is not permitted in public assets`);
      }
      continue;
    }

    if (introducer !== 0x2c) invalid("GIF", `unexpected block introducer 0x${introducer.toString(16).padStart(2, "0")}`);
    if (frames >= MAX_GIF_FRAMES) invalid("GIF", "frame count exceeds the validation bound");
    if (offset + 9 > buffer.length) invalid("GIF", "image descriptor is truncated");
    const left = buffer.readUInt16LE(offset);
    const top = buffer.readUInt16LE(offset + 2);
    const frameWidth = buffer.readUInt16LE(offset + 4);
    const frameHeight = buffer.readUInt16LE(offset + 6);
    const imagePacked = buffer[offset + 8];
    offset += 9;
    validateDimensions("GIF", frameWidth, frameHeight);
    if (left + frameWidth > width || top + frameHeight > height) invalid("GIF", "frame lies outside the logical screen");
    if ((imagePacked & 0x38) !== 0) invalid("GIF", "frame color-table sort or reserved flags are nonzero");
    const hasLocalPalette = (imagePacked & 0x80) !== 0;
    const localPaletteEntries = hasLocalPalette ? (1 << ((imagePacked & 0x07) + 1)) : 0;
    const paletteEntries = hasLocalPalette ? localPaletteEntries : globalPaletteEntries;
    if (paletteEntries === 0) invalid("GIF", "frame has no active color table");
    const paletteEnd = offset + localPaletteEntries * 3;
    if (paletteEnd > buffer.length) invalid("GIF", "local color table is truncated");
    offset = paletteEnd;
    if (pendingGraphicControl?.transparent && pendingGraphicControl.transparentIndex >= paletteEntries) {
      invalid("GIF", "transparent color index exceeds the active palette");
    }
    if (offset >= buffer.length) invalid("GIF", "frame image data is missing");
    const minimumCodeSize = buffer[offset];
    offset += 1;
    const expectedMinimumCodeSize = Math.max(2, Math.log2(paletteEntries));
    if (minimumCodeSize !== expectedMinimumCodeSize) {
      invalid("GIF", "frame LZW minimum code size disagrees with the active palette");
    }
    const compressed = readGifSubBlocks(buffer, offset, `frame ${frames + 1} image data`, subBlockState);
    offset = compressed.offset;
    const framePixels = frameWidth * frameHeight;
    totalFramePixels += framePixels;
    if (totalFramePixels > MAX_IMAGE_PIXELS) invalid("GIF", "aggregate decoded frame pixels exceed the validation bound");
    validateGifLzw(compressed.data, minimumCodeSize, framePixels, paletteEntries, frames + 1);
    frames += 1;
    pendingGraphicControl = null;
  }

  if (!sawTrailer) invalid("GIF", "trailer is missing");
  if (pendingGraphicControl !== null) invalid("GIF", "graphic-control extension is not followed by a frame");
  if (frames === 0) invalid("GIF", "container has no frames");
  if ((frames > 1) !== sawLoopExtension) invalid("GIF", "canonical loop extension must be present exactly for animated assets");
  return { width, height, frames };
}

const CANONICAL_JFIF_APP0 = Buffer.from([
  0x4a, 0x46, 0x49, 0x46, 0x00,
  0x01, 0x01, 0x00,
  0x00, 0x01, 0x00, 0x01,
  0x00, 0x00,
]);

function jpegMarkerLabel(marker) {
  return `0xFF${marker.toString(16).padStart(2, "0").toUpperCase()}`;
}

function validateJpegDqt(buffer, start, end, quantizationTables) {
  let offset = start;
  let tables = 0;
  while (offset < end) {
    const selector = buffer[offset];
    offset += 1;
    const precision = selector >>> 4;
    const tableId = selector & 0x0f;
    if (precision !== 0 || tableId > 3 || quantizationTables.has(tableId)) {
      invalid("JPEG", "DQT has a noncanonical precision, table identifier, or duplicate table");
    }
    if (offset + 64 > end) invalid("JPEG", "DQT table is truncated");
    if (buffer.subarray(offset, offset + 64).some((value) => value === 0)) invalid("JPEG", "DQT contains a zero quantizer");
    offset += 64;
    quantizationTables.add(tableId);
    tables += 1;
  }
  if (tables === 0 || offset !== end) invalid("JPEG", "DQT payload is empty or misaligned");
}

function validateJpegDht(buffer, start, end, huffmanTables) {
  let offset = start;
  let tables = 0;
  while (offset < end) {
    if (offset + 17 > end) invalid("JPEG", "DHT table header is truncated");
    const selector = buffer[offset];
    offset += 1;
    const tableClass = selector >>> 4;
    const tableId = selector & 0x0f;
    if (tableClass > 1 || tableId > 3) invalid("JPEG", "DHT class or table identifier is invalid");
    let symbols = 0;
    let slots = 1;
    for (let length = 1; length <= 16; length += 1) {
      const count = buffer[offset];
      offset += 1;
      symbols += count;
      slots = slots * 2 - count;
      if (slots < 0) invalid("JPEG", "DHT code tree is oversubscribed");
    }
    if (symbols === 0 || symbols > 256 || slots === 0 || offset + symbols > end) {
      invalid("JPEG", "DHT symbol list is empty, truncated, or uses the all-ones code");
    }
    const seenSymbols = new Set();
    for (let index = 0; index < symbols; index += 1) {
      const symbol = buffer[offset + index];
      if (seenSymbols.has(symbol)) invalid("JPEG", "DHT repeats a symbol within one table");
      seenSymbols.add(symbol);
      if (tableClass === 0 && symbol > 11) invalid("JPEG", "DC Huffman symbol exceeds the 8-bit sample category bound");
      if (tableClass === 1) {
        const size = symbol & 0x0f;
        if (size > 10) invalid("JPEG", "AC Huffman symbol exceeds the 8-bit sample category bound");
      }
    }
    offset += symbols;
    huffmanTables[tableClass].add(tableId);
    tables += 1;
  }
  if (tables === 0 || offset !== end) invalid("JPEG", "DHT payload is empty or misaligned");
}

function scanJpegEntropy(buffer, start, restartInterval) {
  let offset = start;
  let entropyBytes = 0;
  let restarts = 0;
  let expectedRestart = 0;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      entropyBytes += 1;
      offset += 1;
      continue;
    }
    const markerStart = offset;
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) invalid("JPEG", "entropy data ends in a marker prefix");
    const marker = buffer[offset];
    if (marker === 0x00) {
      if (offset !== markerStart + 1) invalid("JPEG", "stuffed entropy byte has an extra marker-fill byte");
      entropyBytes += 1;
      offset += 1;
      continue;
    }
    if (marker >= 0xd0 && marker <= 0xd7) {
      if (restartInterval === 0) invalid("JPEG", "restart marker appears without an active DRI");
      if (marker !== 0xd0 + expectedRestart) invalid("JPEG", "restart markers are out of sequence");
      expectedRestart = (expectedRestart + 1) & 7;
      restarts += 1;
      offset += 1;
      continue;
    }
    if (entropyBytes === 0) invalid("JPEG", "scan entropy payload is empty");
    return { offset: markerStart, restarts };
  }
  invalid("JPEG", "scan entropy reaches EOF without a terminating marker");
}

export function validateJpeg(buffer) {
  bounded(buffer, MAX_IMAGE_BYTES, "JPEG");
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) invalid("JPEG", "SOI signature is missing");

  let offset = 2;
  let markers = 0;
  let scans = 0;
  let restarts = 0;
  let sawJfif = false;
  let sawDri = false;
  let restartInterval = 0;
  let frame = null;
  const quantizationTables = new Set();
  const huffmanTables = [new Set(), new Set()];

  while (offset < buffer.length) {
    if (markers >= MAX_CHUNKS) invalid("JPEG", "marker count exceeds the validation bound");
    const markerStart = offset;
    if (buffer[offset] !== 0xff) invalid("JPEG", `marker prefix is missing at byte ${offset}`);
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) invalid("JPEG", "file ends in a marker prefix");
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0x00) invalid("JPEG", "stuffed zero appears outside scan entropy");
    markers += 1;

    if (marker === 0xd9) {
      if (!sawJfif || frame === null || scans === 0) invalid("JPEG", "EOI appears before required JPEG structure");
      if (offset !== buffer.length) invalid("JPEG", "data follows EOI");
      for (const component of frame.components) {
        if (component.coefficients.some((state) => state !== 0)) {
          invalid("JPEG", "progressive coefficient scans are incomplete or not refined to full precision");
        }
      }
      return { width: frame.width, height: frame.height, scans, restarts, markers };
    }

    if (
      marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)
      || marker === 0xdc || marker === 0xcc || marker === 0xde || marker === 0xdf
    ) {
      invalid("JPEG", `${jpegMarkerLabel(marker)} is not permitted in the reviewed progressive profile`);
    }
    if (marker === 0xfe || (marker >= 0xe1 && marker <= 0xef)) {
      invalid("JPEG", `privacy-bearing ${jpegMarkerLabel(marker)} metadata is not permitted in public assets`);
    }
    if (![0xe0, 0xdb, 0xc2, 0xc4, 0xdd, 0xda].includes(marker)) {
      invalid("JPEG", `unapproved ${jpegMarkerLabel(marker)} marker is not permitted in public assets`);
    }
    if (offset + 2 > buffer.length) invalid("JPEG", `${jpegMarkerLabel(marker)} length field is truncated`);
    const length = buffer.readUInt16BE(offset);
    if (length < 2) invalid("JPEG", `${jpegMarkerLabel(marker)} has an invalid segment length`);
    const payload = offset + 2;
    const segmentEnd = offset + length;
    if (segmentEnd > buffer.length) invalid("JPEG", `${jpegMarkerLabel(marker)} segment exceeds the file`);

    if (marker === 0xe0) {
      if (
        sawJfif || markerStart !== 2 || length !== 16
        || !buffer.subarray(payload, segmentEnd).equals(CANONICAL_JFIF_APP0)
      ) {
        invalid("JPEG", "APP0 must be the single minimal JFIF 1.01 segment immediately after SOI");
      }
      sawJfif = true;
    } else if (!sawJfif) {
      invalid("JPEG", "minimal JFIF APP0 is not the first marker after SOI");
    } else if (marker === 0xdb) {
      if (frame !== null) invalid("JPEG", "DQT appears after SOF2");
      validateJpegDqt(buffer, payload, segmentEnd, quantizationTables);
    } else if (marker === 0xc2) {
      if (frame !== null) invalid("JPEG", "SOF2 is duplicated");
      if (length < 11) invalid("JPEG", "SOF2 is too short");
      const precision = buffer[payload];
      const height = buffer.readUInt16BE(payload + 1);
      const width = buffer.readUInt16BE(payload + 3);
      const componentCount = buffer[payload + 5];
      if (precision !== 8 || ![1, 3].includes(componentCount) || length !== 8 + componentCount * 3) {
        invalid("JPEG", "SOF2 precision, component count, or length is outside the reviewed JFIF profile");
      }
      validateDimensions("JPEG", width, height);
      const components = [];
      const componentIds = new Set();
      let samplingBlocks = 0;
      for (let index = 0; index < componentCount; index += 1) {
        const componentOffset = payload + 6 + index * 3;
        const id = buffer[componentOffset];
        const sampling = buffer[componentOffset + 1];
        const horizontalSampling = sampling >>> 4;
        const verticalSampling = sampling & 0x0f;
        const quantizationTable = buffer[componentOffset + 2];
        if (
          componentIds.has(id) || horizontalSampling < 1 || horizontalSampling > 4
          || verticalSampling < 1 || verticalSampling > 4 || quantizationTable > 3
          || !quantizationTables.has(quantizationTable)
        ) {
          invalid("JPEG", "SOF2 component metadata is inconsistent or references a missing DQT");
        }
        componentIds.add(id);
        samplingBlocks += horizontalSampling * verticalSampling;
        const coefficients = new Int8Array(64);
        coefficients.fill(-1);
        components.push({ id, horizontalSampling, verticalSampling, coefficients });
      }
      if (samplingBlocks > 10) invalid("JPEG", "SOF2 sampling factors exceed the MCU block bound");
      frame = { width, height, components };
    } else if (marker === 0xc4) {
      validateJpegDht(buffer, payload, segmentEnd, huffmanTables);
    } else if (marker === 0xdd) {
      if (sawDri || scans > 0 || length !== 4) invalid("JPEG", "DRI is duplicate, malformed, or out of order");
      restartInterval = buffer.readUInt16BE(payload);
      if (restartInterval === 0) invalid("JPEG", "DRI restart interval is zero");
      sawDri = true;
    } else if (marker === 0xda) {
      if (frame === null) invalid("JPEG", "SOS appears before SOF2");
      const scanComponentCount = buffer[payload];
      if (scanComponentCount < 1 || scanComponentCount > frame.components.length || length !== 6 + scanComponentCount * 2) {
        invalid("JPEG", "SOS component count or length is invalid");
      }
      const selectedComponents = [];
      const selectedIds = new Set();
      let previousFrameIndex = -1;
      for (let index = 0; index < scanComponentCount; index += 1) {
        const scanOffset = payload + 1 + index * 2;
        const id = buffer[scanOffset];
        const tableSelectors = buffer[scanOffset + 1];
        const dcTable = tableSelectors >>> 4;
        const acTable = tableSelectors & 0x0f;
        const frameIndex = frame.components.findIndex((component) => component.id === id);
        if (frameIndex < 0 || selectedIds.has(id) || frameIndex <= previousFrameIndex || dcTable > 3 || acTable > 3) {
          invalid("JPEG", "SOS component order, identity, or table selector is invalid");
        }
        selectedIds.add(id);
        previousFrameIndex = frameIndex;
        selectedComponents.push({ component: frame.components[frameIndex], dcTable, acTable });
      }
      const spectralOffset = payload + 1 + scanComponentCount * 2;
      const spectralStart = buffer[spectralOffset];
      const spectralEnd = buffer[spectralOffset + 1];
      const approximation = buffer[spectralOffset + 2];
      const successiveHigh = approximation >>> 4;
      const successiveLow = approximation & 0x0f;
      if (
        spectralStart > spectralEnd || spectralEnd > 63 || (spectralStart === 0 && spectralEnd !== 0)
        || (spectralStart > 0 && scanComponentCount !== 1) || successiveHigh > 13 || successiveLow > 13
        || (successiveHigh > 0 && successiveHigh !== successiveLow + 1)
      ) {
        invalid("JPEG", "SOS progressive spectral or successive-approximation fields are invalid");
      }
      let scanSamplingBlocks = 0;
      for (const selected of selectedComponents) {
        scanSamplingBlocks += selected.component.horizontalSampling * selected.component.verticalSampling;
        if (spectralStart === 0) {
          if (selected.acTable !== 0 || !huffmanTables[0].has(selected.dcTable)) {
            invalid("JPEG", "DC scan table selectors are noncanonical or reference a missing DHT");
          }
        } else if (selected.dcTable !== 0 || !huffmanTables[1].has(selected.acTable)) {
          invalid("JPEG", "AC scan table selectors are noncanonical or reference a missing DHT");
        }
        for (let coefficient = spectralStart; coefficient <= spectralEnd; coefficient += 1) {
          const previousState = selected.component.coefficients[coefficient];
          if (
            (successiveHigh === 0 && previousState !== -1)
            || (successiveHigh > 0 && previousState !== successiveHigh)
          ) {
            invalid("JPEG", "SOS coefficient band is duplicated or refined out of sequence");
          }
          selected.component.coefficients[coefficient] = successiveLow;
        }
      }
      if (scanSamplingBlocks > 10) invalid("JPEG", "SOS sampling factors exceed the MCU block bound");
      scans += 1;
      offset = segmentEnd;
      const entropy = scanJpegEntropy(buffer, offset, restartInterval);
      offset = entropy.offset;
      restarts += entropy.restarts;
      continue;
    }

    offset = segmentEnd;
  }

  invalid("JPEG", "EOI marker is missing");
}

export function validateIco(buffer) {
  bounded(buffer, MAX_IMAGE_BYTES, "ICO");
  if (buffer.length < 22 || buffer.readUInt16LE(0) !== 0 || buffer.readUInt16LE(2) !== 1) {
    invalid("ICO", "icon-directory signature is missing");
  }
  const count = buffer.readUInt16LE(4);
  if (count === 0 || count > MAX_ICON_IMAGES) invalid("ICO", "image count is outside the validation bound");
  const directoryEnd = 6 + count * 16;
  if (directoryEnd > buffer.length) invalid("ICO", "directory is truncated");

  const ranges = [];
  for (let index = 0; index < count; index += 1) {
    const entry = 6 + index * 16;
    const width = buffer[entry] || 256;
    const height = buffer[entry + 1] || 256;
    const directoryColorCount = buffer[entry + 2];
    if (buffer[entry + 3] !== 0) invalid("ICO", `image ${index + 1} has a nonzero reserved byte`);
    const directoryPlanes = buffer.readUInt16LE(entry + 4);
    const directoryBitDepth = buffer.readUInt16LE(entry + 6);
    const size = buffer.readUInt32LE(entry + 8);
    const imageOffset = buffer.readUInt32LE(entry + 12);
    const imageEnd = imageOffset + size;
    if (size === 0 || imageOffset < directoryEnd || imageEnd < imageOffset || imageEnd > buffer.length) {
      invalid("ICO", `image ${index + 1} range is invalid`);
    }
    for (const [start, end] of ranges) {
      if (imageOffset < end && imageEnd > start) invalid("ICO", `image ${index + 1} overlaps another image`);
    }
    ranges.push([imageOffset, imageEnd]);

    const image = buffer.subarray(imageOffset, imageEnd);
    if (image.length >= 8 && image.subarray(0, 8).equals(PNG_SIGNATURE)) {
      if (
        directoryColorCount !== 0
        || ![0, 1].includes(directoryPlanes)
        || ![0, 32].includes(directoryBitDepth)
      ) {
        invalid("ICO", `image ${index + 1} PNG directory metadata is not in the reviewed minimal form`);
      }
      const png = validatePng(image);
      if (png.width !== width || png.height !== height) invalid("ICO", `image ${index + 1} dimensions disagree with its PNG`);
      continue;
    }

    if (image.length < 40 || image.readUInt32LE(0) !== 40) {
      invalid("ICO", `image ${index + 1} has an invalid DIB header`);
    }
    const headerSize = image.readUInt32LE(0);
    const dibWidth = image.readInt32LE(4);
    const dibHeight = image.readInt32LE(8);
    const planes = image.readUInt16LE(12);
    const bitDepth = image.readUInt16LE(14);
    const compression = image.readUInt32LE(16);
    const declaredImageSize = image.readUInt32LE(20);
    const xPixelsPerMeter = image.readInt32LE(24);
    const yPixelsPerMeter = image.readInt32LE(28);
    const colorsUsed = image.readUInt32LE(32);
    const colorsImportant = image.readUInt32LE(36);
    const maximumPaletteEntries = bitDepth >= 1 && bitDepth <= 8 ? 2 ** bitDepth : 0;
    const paletteEntries = bitDepth <= 8 ? (colorsUsed || maximumPaletteEntries) : 0;
    const expectedDirectoryColorCount = paletteEntries >= 256 ? 0 : paletteEntries;
    if (
      dibWidth !== width ||
      dibHeight !== height * 2 ||
      planes !== 1 ||
      compression !== 0 ||
      ![1, 4, 8, 16, 24, 32].includes(bitDepth) ||
      paletteEntries > maximumPaletteEntries
      || directoryColorCount !== expectedDirectoryColorCount
      || directoryPlanes !== planes
      || directoryBitDepth !== bitDepth
    ) {
      invalid("ICO", `image ${index + 1} DIB metadata is inconsistent`);
    }
    const pixelOffset = headerSize + paletteEntries * 4;
    const colorStride = Math.floor((width * bitDepth + 31) / 32) * 4;
    const maskStride = Math.floor((width + 31) / 32) * 4;
    const colorPayloadBytes = Math.ceil((width * bitDepth) / 8);
    const maskPayloadBytes = Math.ceil(width / 8);
    const colorBytes = colorStride * height;
    const maskOffset = pixelOffset + colorBytes;
    const requiredSize = pixelOffset + colorStride * height + maskStride * height;
    if (
      ![0, colorBytes].includes(declaredImageSize)
      || xPixelsPerMeter !== 0
      || yPixelsPerMeter !== 0
      || colorsImportant !== 0
      || (bitDepth > 8 && colorsUsed !== 0)
    ) {
      invalid("ICO", `image ${index + 1} DIB auxiliary fields are not in the reviewed minimal form`);
    }
    if (requiredSize !== image.length) {
      invalid("ICO", `image ${index + 1} DIB pixel data length is not exact`);
    }
    for (let paletteIndex = 0; paletteIndex < paletteEntries; paletteIndex += 1) {
      if (image[headerSize + paletteIndex * 4 + 3] !== 0) {
        invalid("ICO", `image ${index + 1} DIB palette reserved byte is nonzero`);
      }
    }
    for (let row = 0; row < height; row += 1) {
      const colorRow = pixelOffset + row * colorStride;
      const colorUnusedBits = colorPayloadBytes * 8 - width * bitDepth;
      if (
        colorUnusedBits > 0
        && (image[colorRow + colorPayloadBytes - 1] & ((1 << colorUnusedBits) - 1)) !== 0
      ) {
        invalid("ICO", `image ${index + 1} DIB color-row unused bits are nonzero`);
      }
      if (image.subarray(colorRow + colorPayloadBytes, colorRow + colorStride).some((byte) => byte !== 0)) {
        invalid("ICO", `image ${index + 1} DIB color-row padding is nonzero`);
      }
      if (bitDepth === 16) {
        for (let column = 0; column < width; column += 1) {
          if ((image.readUInt16LE(colorRow + column * 2) & 0x8000) !== 0) {
            invalid("ICO", `image ${index + 1} DIB RGB555 reserved bit is nonzero`);
          }
        }
      }
      if (bitDepth <= 8) {
        for (let column = 0; column < width; column += 1) {
          const packedByte = image[colorRow + Math.floor((column * bitDepth) / 8)];
          const paletteIndex = bitDepth === 8
            ? packedByte
            : bitDepth === 4
              ? (packedByte >>> (column % 2 === 0 ? 4 : 0)) & 0x0f
              : (packedByte >>> (7 - (column % 8))) & 0x01;
          if (paletteIndex >= paletteEntries) {
            invalid("ICO", `image ${index + 1} DIB pixel references a missing palette entry`);
          }
        }
      }

      const maskRow = maskOffset + row * maskStride;
      const maskUnusedBits = maskPayloadBytes * 8 - width;
      if (
        maskUnusedBits > 0
        && (image[maskRow + maskPayloadBytes - 1] & ((1 << maskUnusedBits) - 1)) !== 0
      ) {
        invalid("ICO", `image ${index + 1} DIB mask-row unused bits are nonzero`);
      }
      if (image.subarray(maskRow + maskPayloadBytes, maskRow + maskStride).some((byte) => byte !== 0)) {
        invalid("ICO", `image ${index + 1} DIB mask-row padding is nonzero`);
      }
    }
  }

  ranges.sort((left, right) => left[0] - right[0]);
  let coveredThrough = directoryEnd;
  for (const [start, end] of ranges) {
    if (start !== coveredThrough) invalid("ICO", "image ranges contain an unparsed gap");
    coveredThrough = end;
  }
  if (coveredThrough !== buffer.length) invalid("ICO", "unparsed data follows the final image");

  return { images: count };
}

const MPEG1_BITRATES = {
  1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
};
const MPEG2_BITRATES = {
  1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const SAMPLE_RATES = {
  0: [11_025, 12_000, 8_000],
  2: [22_050, 24_000, 16_000],
  3: [44_100, 48_000, 32_000],
};

export function validateMp3(buffer) {
  bounded(buffer, MAX_AUDIO_BYTES, "MP3");
  if (buffer.length >= 3 && buffer.toString("ascii", 0, 3) === "ID3") invalid("MP3", "ID3v2 metadata must be stripped");
  if (buffer.length >= 128 && buffer.toString("ascii", buffer.length - 128, buffer.length - 125) === "TAG") {
    invalid("MP3", "ID3v1 metadata must be stripped");
  }
  if (buffer.includes(Buffer.from("APETAGEX")) || buffer.includes(Buffer.from("LYRICSBEGIN"))) {
    invalid("MP3", "APE or Lyrics metadata must be stripped");
  }

  let offset = 0;
  let frames = 0;
  let sampleRate = 0;
  let channels = 0;
  while (offset < buffer.length) {
    if (frames >= MAX_MP3_FRAMES) invalid("MP3", "frame count exceeds the validation bound");
    if (offset + 4 > buffer.length) invalid("MP3", "truncated frame header");
    const header = buffer.readUInt32BE(offset);
    if ((header >>> 21) !== 0x7ff) invalid("MP3", `frame sync is missing at byte ${offset}`);
    const version = (header >>> 19) & 0x3;
    const layerBits = (header >>> 17) & 0x3;
    const bitrateIndex = (header >>> 12) & 0xf;
    const sampleRateIndex = (header >>> 10) & 0x3;
    const padding = (header >>> 9) & 0x1;
    const channelMode = (header >>> 6) & 0x3;
    const emphasis = header & 0x3;
    if (version === 1 || layerBits === 0 || bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3 || emphasis === 2) {
      invalid("MP3", `invalid frame header at byte ${offset}`);
    }
    const layer = 4 - layerBits;
    if (layer !== 3) invalid("MP3", `non-Layer-III frame at byte ${offset}`);
    const rate = SAMPLE_RATES[version][sampleRateIndex];
    const bitrate = (version === 3 ? MPEG1_BITRATES : MPEG2_BITRATES)[layer][bitrateIndex] * 1000;
    let frameLength;
    if (layer === 1) frameLength = Math.floor((12 * bitrate) / rate + padding) * 4;
    else if (layer === 3 && version !== 3) frameLength = Math.floor((72 * bitrate) / rate) + padding;
    else frameLength = Math.floor((144 * bitrate) / rate) + padding;
    if (frameLength < 4 || offset + frameLength > buffer.length) invalid("MP3", `truncated frame at byte ${offset}`);
    if (frames === 0) {
      sampleRate = rate;
      channels = channelMode === 3 ? 1 : 2;
    } else if (rate !== sampleRate || (channelMode === 3 ? 1 : 2) !== channels) {
      invalid("MP3", `stream format changes at byte ${offset}`);
    }
    offset += frameLength;
    frames += 1;
  }
  if (frames < 2) invalid("MP3", "stream must contain at least two complete frames");
  return { frames, sampleRate, channels };
}

export function validateAssetFormat(extension, buffer) {
  if (extension === ".gif") return validateGif(buffer);
  if (extension === ".jpeg" || extension === ".jpg") return validateJpeg(buffer);
  if (extension === ".webp") return validateWebp(buffer);
  if (extension === ".png") return validatePng(buffer);
  if (extension === ".ico") return validateIco(buffer);
  if (extension === ".mp3") return validateMp3(buffer);
  return null;
}

function expectReject(label, validator, buffer) {
  try {
    validator(buffer);
  } catch {
    return;
  }
  throw new Error(`Asset validator canary failed closed: ${label} was accepted.`);
}

function createWebpChunk(type, payload = Buffer.alloc(0)) {
  const chunk = Buffer.alloc(8 + payload.length + (payload.length & 1));
  chunk.write(type, 0, 4, "ascii");
  chunk.writeUInt32LE(payload.length, 4);
  payload.copy(chunk, 8);
  return chunk;
}

function insertWebpChunk(webp, type, payload) {
  const result = Buffer.concat([webp.subarray(0, 12), createWebpChunk(type, payload), webp.subarray(12)]);
  result.writeUInt32LE(result.length - 8, 4);
  return result;
}

function createPngChunk(type, payload = Buffer.alloc(0)) {
  const chunk = Buffer.alloc(12 + payload.length);
  chunk.writeUInt32BE(payload.length, 0);
  chunk.write(type, 4, 4, "ascii");
  payload.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk, 4, 8 + payload.length), 8 + payload.length);
  return chunk;
}

function insertPngChunkAfterIhdr(png, type, payload) {
  return Buffer.concat([png.subarray(0, 33), createPngChunk(type, payload), png.subarray(33)]);
}

function createJpegSegment(marker, payload = Buffer.alloc(0)) {
  const segment = Buffer.alloc(4 + payload.length);
  segment[0] = 0xff;
  segment[1] = marker;
  segment.writeUInt16BE(payload.length + 2, 2);
  payload.copy(segment, 4);
  return segment;
}

function createStructuralProgressiveJpeg() {
  const quantizationTable = Buffer.concat([Buffer.from([0x00]), Buffer.alloc(64, 1)]);
  const frame = Buffer.from([
    0x08, 0x00, 0x01, 0x00, 0x01, 0x01,
    0x01, 0x11, 0x00,
  ]);
  const huffmanCounts = Buffer.alloc(16);
  huffmanCounts[0] = 1;
  const huffmanTables = Buffer.concat([
    Buffer.from([0x00]), huffmanCounts, Buffer.from([0x00]),
    Buffer.from([0x10]), huffmanCounts, Buffer.from([0x00]),
  ]);
  const dcScan = Buffer.from([0x01, 0x01, 0x00, 0x00, 0x00, 0x00]);
  const acScan = Buffer.from([0x01, 0x01, 0x00, 0x01, 0x3f, 0x00]);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    createJpegSegment(0xe0, CANONICAL_JFIF_APP0),
    createJpegSegment(0xdb, quantizationTable),
    createJpegSegment(0xc2, frame),
    createJpegSegment(0xc4, huffmanTables),
    createJpegSegment(0xda, dcScan),
    Buffer.from([0x00, 0xff, 0x00]),
    createJpegSegment(0xda, acScan),
    Buffer.from([0x00]),
    Buffer.from([0xff, 0xd9]),
  ]);
}

export function assertAssetValidatorCanaries() {
  if (
    [".gif", ".jpeg", ".jpg", ".webp", ".png", ".ico"].some(
      (extension) => maximumAssetFormatBytes(extension) !== MAX_IMAGE_BYTES,
    )
    || maximumAssetFormatBytes(".mp3") !== MAX_AUDIO_BYTES
    || maximumAssetFormatBytes(".txt") !== null
  ) {
    throw new Error("Asset validator canary failed: pre-read size policy is not deterministic.");
  }
  const webp = readFileSync(new URL("../fixtures/asset-validation/valid-1x1.webp", import.meta.url));
  validateWebp(webp);
  const badWebp = Buffer.from(webp);
  badWebp.writeUInt32LE(17, 4);
  expectReject("mismatched WebP length", validateWebp, badWebp);
  for (const [type, payload] of [
    ["ICCP", Buffer.from("profile\0private", "ascii")],
    ["EXIF", Buffer.from("II*\0private", "binary")],
    ["XMP ", Buffer.from("<x:xmpmeta>private</x:xmpmeta>", "utf8")],
    ["JUNK", Buffer.from("unapproved", "ascii")],
  ]) {
    expectReject(`WebP ${type} public metadata`, validateWebp, insertWebpChunk(webp, type, payload));
  }

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  validatePng(png);
  const badPng = Buffer.from(png);
  badPng[29] ^= 1;
  expectReject("invalid PNG CRC", validatePng, badPng);
  for (const [type, payload] of [
    ["eXIf", Buffer.from("II*\0private", "binary")],
    ["tEXt", Buffer.from("Author\0private", "binary")],
    ["zTXt", Buffer.from("Author\0\0private", "binary")],
    ["iTXt", Buffer.from("Author\0\0\0\0\0private", "binary")],
    ["tIME", Buffer.from([0x07, 0xe9, 1, 1, 0, 0, 0])],
    ["iCCP", Buffer.from("profile\0\0private", "binary")],
    ["vpAg", Buffer.from("unapproved", "ascii")],
  ]) {
    expectReject(`PNG ${type} public metadata`, validatePng, insertPngChunkAfterIhdr(png, type, payload));
  }
  const physicalDimensions = Buffer.alloc(9);
  physicalDimensions.writeUInt32BE(2835, 0);
  physicalDimensions.writeUInt32BE(2835, 4);
  physicalDimensions[8] = 1;
  validatePng(insertPngChunkAfterIhdr(png, "pHYs", physicalDimensions));
  const standardSrgb = Buffer.from([0]);
  validatePng(insertPngChunkAfterIhdr(png, "sRGB", standardSrgb));
  expectReject(
    "duplicate PNG sRGB",
    validatePng,
    insertPngChunkAfterIhdr(insertPngChunkAfterIhdr(png, "sRGB", standardSrgb), "sRGB", standardSrgb),
  );
  expectReject("malformed PNG sRGB", validatePng, insertPngChunkAfterIhdr(png, "sRGB", Buffer.from([0, 0])));
  expectReject("invalid PNG sRGB intent", validatePng, insertPngChunkAfterIhdr(png, "sRGB", Buffer.from([4])));
  expectReject(
    "out-of-order PNG sRGB",
    validatePng,
    Buffer.concat([png.subarray(0, png.length - 12), createPngChunk("sRGB", standardSrgb), png.subarray(png.length - 12)]),
  );
  const noncanonicalPhysicalDimensions = Buffer.from(physicalDimensions);
  noncanonicalPhysicalDimensions.writeUInt32BE(0x50524956, 0);
  noncanonicalPhysicalDimensions.writeUInt32BE(0x41544521, 4);
  expectReject(
    "PNG noncanonical pHYs values",
    validatePng,
    insertPngChunkAfterIhdr(png, "pHYs", noncanonicalPhysicalDimensions),
  );
  const unitlessPhysicalDimensions = Buffer.from(physicalDimensions);
  unitlessPhysicalDimensions[8] = 0;
  expectReject(
    "PNG unitless pHYs metadata",
    validatePng,
    insertPngChunkAfterIhdr(png, "pHYs", unitlessPhysicalDimensions),
  );
  expectReject(
    "out-of-order PNG pHYs",
    validatePng,
    Buffer.concat([png.subarray(0, png.length - 12), createPngChunk("pHYs", physicalDimensions), png.subarray(png.length - 12)]),
  );
  const grayscalePng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQAAAAA3bvkkAAAACklEQVR4nGNgAAAAAgABSK+kcQAAAABJRU5ErkJggg==", "base64");
  const grayscaleTransparency = Buffer.alloc(2);
  grayscaleTransparency.writeUInt16BE(1);
  validatePng(insertPngChunkAfterIhdr(grayscalePng, "tRNS", grayscaleTransparency));
  grayscaleTransparency.writeUInt16BE(2);
  expectReject(
    "PNG grayscale tRNS sample outside bit depth",
    validatePng,
    insertPngChunkAfterIhdr(grayscalePng, "tRNS", grayscaleTransparency),
  );
  const truecolorPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC", "base64");
  const truecolorTransparency = Buffer.alloc(6);
  truecolorTransparency.writeUInt16BE(255, 0);
  truecolorTransparency.writeUInt16BE(255, 2);
  truecolorTransparency.writeUInt16BE(255, 4);
  validatePng(insertPngChunkAfterIhdr(truecolorPng, "tRNS", truecolorTransparency));
  truecolorTransparency.writeUInt16BE(256, 4);
  expectReject(
    "PNG truecolor tRNS sample outside bit depth",
    validatePng,
    insertPngChunkAfterIhdr(truecolorPng, "tRNS", truecolorTransparency),
  );
  const rgbaPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==", "base64");
  const privatePalette = Buffer.from("PRIVATE-METADATA!!", "ascii");
  expectReject("PNG truecolor PLTE", validatePng, insertPngChunkAfterIhdr(truecolorPng, "PLTE", privatePalette));
  expectReject("PNG RGBA PLTE", validatePng, insertPngChunkAfterIhdr(rgbaPng, "PLTE", privatePalette));

  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==", "base64");
  const gifResult = validateGif(gif);
  if (gifResult.width !== 1 || gifResult.height !== 1 || gifResult.frames !== 1) {
    throw new Error("Asset validator canary failed: valid GIF dimensions or frame count changed.");
  }
  expectReject("GIF trailing private metadata", validateGif, Buffer.concat([gif, Buffer.from("PRIVATE", "ascii")]));
  const gifComment = Buffer.concat([
    gif.subarray(0, -1),
    Buffer.from([0x21, 0xfe, 0x07]),
    Buffer.from("PRIVATE", "ascii"),
    Buffer.from([0x00, 0x3b]),
  ]);
  expectReject("GIF comment metadata", validateGif, gifComment);
  const invalidPaletteGif = Buffer.from(gif);
  const gifImageData = invalidPaletteGif.indexOf(Buffer.from([0x02, 0x02, 0x44, 0x01, 0x00]));
  invalidPaletteGif[gifImageData + 2] = 0x54;
  expectReject("GIF missing palette entry reference", validateGif, invalidPaletteGif);
  const invalidTransparencyGif = Buffer.from(gif);
  const graphicControl = invalidTransparencyGif.indexOf(Buffer.from([0x21, 0xf9, 0x04]));
  invalidTransparencyGif[graphicControl + 6] = 2;
  expectReject("GIF transparent palette index", validateGif, invalidTransparencyGif);
  const loopExtension = Buffer.concat([
    Buffer.from([0x21, 0xff, 0x0b]),
    Buffer.from("NETSCAPE2.0", "ascii"),
    Buffer.from([0x03, 0x01, 0x00, 0x00, 0x00]),
  ]);
  const gifFrame = gif.subarray(19, -1);
  const animatedGif = Buffer.concat([
    gif.subarray(0, 19), loopExtension, gifFrame, gifFrame, Buffer.from([0x3b]),
  ]);
  if (validateGif(animatedGif).frames !== 2) throw new Error("Asset validator canary failed: valid animated GIF frame count changed.");
  const corruptSecondFrameGif = Buffer.from(animatedGif);
  const secondImageData = corruptSecondFrameGif.lastIndexOf(Buffer.from([0x02, 0x02, 0x44, 0x01, 0x00]));
  corruptSecondFrameGif[secondImageData + 2] = 0xff;
  expectReject("GIF corrupt second-frame LZW stream", validateGif, corruptSecondFrameGif);

  const jpeg = createStructuralProgressiveJpeg();
  const jpegResult = validateJpeg(jpeg);
  if (jpegResult.width !== 1 || jpegResult.height !== 1 || jpegResult.scans !== 2) {
    throw new Error("Asset validator canary failed: valid JPEG dimensions or scan count changed.");
  }
  const jpegAfterApp0 = 2 + 2 + 2 + CANONICAL_JFIF_APP0.length;
  for (const [marker, label, payload] of [
    [0xe1, "APP1 XMP", Buffer.from("http://ns.adobe.com/xap/1.0/\0PRIVATE", "ascii")],
    [0xec, "APP12 Ducky", Buffer.from("Ducky\0PRIVATE", "ascii")],
    [0xfe, "COM", Buffer.from("PRIVATE", "ascii")],
  ]) {
    expectReject(
      `JPEG ${label} metadata`,
      validateJpeg,
      Buffer.concat([jpeg.subarray(0, jpegAfterApp0), createJpegSegment(marker, payload), jpeg.subarray(jpegAfterApp0)]),
    );
  }
  expectReject("JPEG trailing private metadata", validateJpeg, Buffer.concat([jpeg, Buffer.from("PRIVATE", "ascii")]));
  const noncanonicalJfif = Buffer.from(jpeg);
  noncanonicalJfif[15] = 2;
  expectReject("JPEG noncanonical JFIF density", validateJpeg, noncanonicalJfif);
  const baselineJpeg = Buffer.from(jpeg);
  const sofMarker = baselineJpeg.indexOf(Buffer.from([0xff, 0xc2]));
  baselineJpeg[sofMarker + 1] = 0xc0;
  expectReject("JPEG unreviewed SOF0 profile", validateJpeg, baselineJpeg);
  expectReject("JPEG missing EOI", validateJpeg, jpeg.subarray(0, -2));

  const ico = Buffer.alloc(22 + png.length);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(1, 4);
  ico[6] = 1;
  ico[7] = 1;
  ico.writeUInt16LE(1, 10);
  ico.writeUInt16LE(32, 12);
  ico.writeUInt32LE(png.length, 14);
  ico.writeUInt32LE(22, 18);
  png.copy(ico, 22);
  validateIco(ico);
  const badIco = Buffer.from(ico);
  badIco.writeUInt32LE(ico.length, 18);
  expectReject("out-of-range ICO image", validateIco, badIco);
  const mismatchedIco = Buffer.from(ico);
  mismatchedIco[6] = 2;
  expectReject("inconsistent ICO dimensions", validateIco, mismatchedIco);
  expectReject(
    "ICO trailing private metadata",
    validateIco,
    Buffer.concat([ico, Buffer.from("PRIVATE-METADATA", "ascii")]),
  );
  const gappedIco = Buffer.alloc(ico.length + 1);
  ico.subarray(0, 22).copy(gappedIco, 0);
  gappedIco.writeUInt32LE(23, 18);
  ico.subarray(22).copy(gappedIco, 23);
  expectReject("ICO unparsed image gap", validateIco, gappedIco);
  const emptyDibIco = Buffer.alloc(62);
  emptyDibIco.writeUInt16LE(1, 2);
  emptyDibIco.writeUInt16LE(1, 4);
  emptyDibIco[6] = 1;
  emptyDibIco[7] = 1;
  emptyDibIco.writeUInt16LE(1, 10);
  emptyDibIco.writeUInt16LE(32, 12);
  emptyDibIco.writeUInt32LE(40, 14);
  emptyDibIco.writeUInt32LE(22, 18);
  emptyDibIco.writeUInt32LE(40, 22);
  emptyDibIco.writeInt32LE(1, 26);
  emptyDibIco.writeInt32LE(2, 30);
  emptyDibIco.writeUInt16LE(1, 34);
  emptyDibIco.writeUInt16LE(32, 36);
  expectReject("pixel-less ICO DIB", validateIco, emptyDibIco);
  const validDibIco = Buffer.alloc(70);
  validDibIco.writeUInt16LE(1, 2);
  validDibIco.writeUInt16LE(1, 4);
  validDibIco[6] = 1;
  validDibIco[7] = 1;
  validDibIco.writeUInt16LE(1, 10);
  validDibIco.writeUInt16LE(32, 12);
  validDibIco.writeUInt32LE(48, 14);
  validDibIco.writeUInt32LE(22, 18);
  validDibIco.writeUInt32LE(40, 22);
  validDibIco.writeInt32LE(1, 26);
  validDibIco.writeInt32LE(2, 30);
  validDibIco.writeUInt16LE(1, 34);
  validDibIco.writeUInt16LE(32, 36);
  validDibIco.writeUInt32LE(4, 42);
  validateIco(validDibIco);
  const metadataDibIco = Buffer.from(validDibIco);
  Buffer.from("PRIVATE-METADATA-1234", "ascii").copy(metadataDibIco, 42);
  expectReject("ICO DIB auxiliary private metadata", validateIco, metadataDibIco);
  for (const [label, offset, value] of [
    ["declared image size", 42, 3],
    ["horizontal resolution", 46, 1],
    ["vertical resolution", 50, 1],
    ["colors used", 54, 1],
    ["important colors", 58, 1],
  ]) {
    const auxiliaryFieldDibIco = Buffer.from(validDibIco);
    auxiliaryFieldDibIco.writeUInt32LE(value, offset);
    expectReject(`ICO DIB ${label}`, validateIco, auxiliaryFieldDibIco);
  }
  for (const [label, offset, value, width] of [
    ["directory color count", 8, 1, 1],
    ["directory planes", 10, 2, 2],
    ["directory bit depth", 12, 24, 2],
  ]) {
    const directoryFieldDibIco = Buffer.from(validDibIco);
    if (width === 1) directoryFieldDibIco[offset] = value;
    else directoryFieldDibIco.writeUInt16LE(value, offset);
    expectReject(`ICO DIB ${label}`, validateIco, directoryFieldDibIco);
  }
  const validRgb555DibIco = Buffer.from(validDibIco);
  validRgb555DibIco.writeUInt16LE(16, 12);
  validRgb555DibIco.writeUInt16LE(16, 36);
  validateIco(validRgb555DibIco);
  const reservedRgb555DibIco = Buffer.from(validRgb555DibIco);
  reservedRgb555DibIco.writeUInt16LE(0x8000, 62);
  expectReject("ICO DIB RGB555 reserved bit", validateIco, reservedRgb555DibIco);
  const validIndexedDibIco = Buffer.alloc(78);
  validIndexedDibIco.writeUInt16LE(1, 2);
  validIndexedDibIco.writeUInt16LE(1, 4);
  validIndexedDibIco[6] = 1;
  validIndexedDibIco[7] = 1;
  validIndexedDibIco[8] = 2;
  validIndexedDibIco.writeUInt16LE(1, 10);
  validIndexedDibIco.writeUInt16LE(1, 12);
  validIndexedDibIco.writeUInt32LE(56, 14);
  validIndexedDibIco.writeUInt32LE(22, 18);
  validIndexedDibIco.writeUInt32LE(40, 22);
  validIndexedDibIco.writeInt32LE(1, 26);
  validIndexedDibIco.writeInt32LE(2, 30);
  validIndexedDibIco.writeUInt16LE(1, 34);
  validIndexedDibIco.writeUInt16LE(1, 36);
  validateIco(validIndexedDibIco);
  const excessivePaletteDibIco = Buffer.alloc(82);
  validIndexedDibIco.subarray(0, 62).copy(excessivePaletteDibIco);
  excessivePaletteDibIco[8] = 3;
  excessivePaletteDibIco.writeUInt32LE(60, 14);
  excessivePaletteDibIco.writeUInt32LE(3, 54);
  expectReject("ICO DIB palette exceeds bit depth", validateIco, excessivePaletteDibIco);
  const reducedPaletteDibIco = Buffer.alloc(74);
  validIndexedDibIco.subarray(0, 62).copy(reducedPaletteDibIco);
  reducedPaletteDibIco[8] = 1;
  reducedPaletteDibIco.writeUInt32LE(52, 14);
  reducedPaletteDibIco.writeUInt32LE(1, 54);
  reducedPaletteDibIco[66] = 0x80;
  expectReject("ICO DIB missing palette entry reference", validateIco, reducedPaletteDibIco);
  const paletteReservedDibIco = Buffer.from(validIndexedDibIco);
  paletteReservedDibIco[65] = 1;
  expectReject("ICO DIB palette reserved byte", validateIco, paletteReservedDibIco);
  const colorUnusedBitsDibIco = Buffer.from(validIndexedDibIco);
  colorUnusedBitsDibIco[70] = 1;
  expectReject("ICO DIB color-row unused bits", validateIco, colorUnusedBitsDibIco);
  const colorPaddingDibIco = Buffer.from(validIndexedDibIco);
  colorPaddingDibIco[71] = 1;
  expectReject("ICO DIB color-row padding", validateIco, colorPaddingDibIco);
  const maskUnusedBitsDibIco = Buffer.from(validIndexedDibIco);
  maskUnusedBitsDibIco[74] = 1;
  expectReject("ICO DIB mask-row unused bits", validateIco, maskUnusedBitsDibIco);
  const maskPaddingDibIco = Buffer.from(validIndexedDibIco);
  maskPaddingDibIco[75] = 1;
  expectReject("ICO DIB mask-row padding", validateIco, maskPaddingDibIco);
  const extendedDibIco = Buffer.alloc(22 + 132);
  extendedDibIco.writeUInt16LE(1, 2);
  extendedDibIco.writeUInt16LE(1, 4);
  extendedDibIco[6] = 1;
  extendedDibIco[7] = 1;
  extendedDibIco.writeUInt16LE(1, 10);
  extendedDibIco.writeUInt16LE(32, 12);
  extendedDibIco.writeUInt32LE(132, 14);
  extendedDibIco.writeUInt32LE(22, 18);
  extendedDibIco.writeUInt32LE(124, 22);
  extendedDibIco.writeInt32LE(1, 26);
  extendedDibIco.writeInt32LE(2, 30);
  extendedDibIco.writeUInt16LE(1, 34);
  extendedDibIco.writeUInt16LE(32, 36);
  Buffer.from("PRIVATE-METADATA", "ascii").copy(extendedDibIco, 62);
  expectReject("unparsed extended ICO DIB header", validateIco, extendedDibIco);

  const mp3 = readFileSync(new URL("../fixtures/asset-validation/valid-silent.mp3", import.meta.url));
  validateMp3(mp3);
  expectReject("truncated MP3 frame", validateMp3, mp3.subarray(0, mp3.length - 1));
  expectReject("MP3 ID3 metadata", validateMp3, Buffer.concat([Buffer.from("ID3\x04\0\0\0\0\0\0", "binary"), mp3]));
  const layerTwoFrame = Buffer.alloc(417);
  layerTwoFrame.set([0xff, 0xfd, 0x80, 0x64]);
  expectReject("non-Layer-III MPEG audio", validateMp3, Buffer.concat([layerTwoFrame, layerTwoFrame]));
}
