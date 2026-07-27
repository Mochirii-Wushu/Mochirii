import {
  GALLERY_THUMBNAIL_MAX_BYTES,
  galleryThumbnailStoragePath,
  parseGalleryThumbnailPayload,
} from "./gallery-thumbnail.ts";
import {
  galleryWebpDecoderVersion,
  isDecodableGalleryWebp,
} from "./gallery-webp-decoder.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }
  return btoa(binary);
}

function incompleteVp8x(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(30);
  bytes.set(new TextEncoder().encode("RIFF"), 0);
  new DataView(bytes.buffer).setUint32(4, 22, true);
  bytes.set(new TextEncoder().encode("WEBPVP8X"), 8);
  new DataView(bytes.buffer).setUint32(16, 10, true);
  const widthMinusOne = width - 1;
  const heightMinusOne = height - 1;
  bytes[24] = widthMinusOne & 0xff;
  bytes[25] = (widthMinusOne >> 8) & 0xff;
  bytes[26] = (widthMinusOne >> 16) & 0xff;
  bytes[27] = heightMinusOne & 0xff;
  bytes[28] = (heightMinusOne >> 8) & 0xff;
  bytes[29] = (heightMinusOne >> 16) & 0xff;
  return bytes;
}

const boundedStaticWebp =
  "UklGRhYCAABXRUJQVlA4WAoAAAAgAAAAAQAAAQAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZWUDggKAAAAJABAJ0BKgIAAgABQCYliAJ0ugADmAD++ajv7U2Kqed36FGyiXzAAAA=";

Deno.test("accepts a bounded static WebP thumbnail", () => {
  const bytes = Uint8Array.from(
    atob(boundedStaticWebp),
    (character) => character.charCodeAt(0),
  );
  const result = parseGalleryThumbnailPayload({
    base64: base64(bytes),
    mime_type: "image/webp",
    size_bytes: bytes.length,
    width: 2,
    height: 2,
  });

  assert(result.ok, "expected bounded WebP payload to pass");
  assert(result.thumbnail.sizeBytes === bytes.length, "size was not preserved");
});

Deno.test("uses the pinned libwebp decoder and fully decodes valid pixels", async () => {
  const bytes = Uint8Array.from(
    atob(boundedStaticWebp),
    (character) => character.charCodeAt(0),
  );

  assert(
    await galleryWebpDecoderVersion() === 0x010600,
    "expected the vendored libwebp 1.6.0 decoder",
  );
  assert(
    await isDecodableGalleryWebp(bytes, 2, 2),
    "expected a complete static WebP to decode",
  );
  assert(
    !await isDecodableGalleryWebp(bytes, 1, 2),
    "expected decoded dimensions to match the structural parser",
  );
});

Deno.test("rejects corrupt VP8 and VP8L payloads after structural parsing", async () => {
  const corruptSamples = [
    "UklGRhYAAABXRUJQVlA4IAoAAAAAAACdASoCAAIA",
    "UklGRhoAAABXRUJQVlA4TAUAAAAvAUAAAABKVU5LAAAAAA==",
  ];

  for (const encoded of corruptSamples) {
    const bytes = Uint8Array.from(
      atob(encoded),
      (character) => character.charCodeAt(0),
    );
    const parsed = parseGalleryThumbnailPayload({
      base64: encoded,
      mime_type: "image/webp",
      size_bytes: bytes.length,
      width: 2,
      height: 2,
    });

    assert(parsed.ok, "corrupt regression fixture must reach the trusted decoder");
    assert(
      !await isDecodableGalleryWebp(bytes, 2, 2),
      "corrupt WebP payload must fail full decode",
    );
  }
});

Deno.test("rejects oversized, animated, mismatched, and non-WebP payloads", () => {
  const oversizedDimensions = incompleteVp8x(721, 405);
  assert(
    !parseGalleryThumbnailPayload({
      base64: base64(oversizedDimensions),
      mime_type: "image/webp",
      size_bytes: oversizedDimensions.length,
      width: 721,
      height: 405,
    }).ok,
    "oversized dimensions should fail",
  );

  const animated = incompleteVp8x(320, 180);
  animated[20] = 0x02;
  assert(
    !parseGalleryThumbnailPayload({
      base64: base64(animated),
      mime_type: "image/webp",
      size_bytes: animated.length,
      width: 320,
      height: 180,
    }).ok,
    "animated WebP should fail",
  );

  const valid = Uint8Array.from(
    atob(boundedStaticWebp),
    (character) => character.charCodeAt(0),
  );
  assert(
    !parseGalleryThumbnailPayload({
      base64: base64(valid),
      mime_type: "image/webp",
      size_bytes: valid.length + 1,
      width: 2,
      height: 2,
    }).ok,
    "size mismatch should fail",
  );
  assert(
    !parseGalleryThumbnailPayload({
      base64: base64(valid),
      mime_type: "image/png",
      size_bytes: valid.length,
      width: 2,
      height: 2,
    }).ok,
    "non-WebP payload should fail",
  );

  const trailingBytes = new Uint8Array(valid.length + 2);
  trailingBytes.set(valid);
  assert(
    !parseGalleryThumbnailPayload({
      base64: base64(trailingBytes),
      mime_type: "image/webp",
      size_bytes: trailingBytes.length,
      width: 2,
      height: 2,
    }).ok,
    "trailing bytes outside the RIFF envelope should fail",
  );

  const tooLarge = new Uint8Array(GALLERY_THUMBNAIL_MAX_BYTES + 1);
  assert(
    !parseGalleryThumbnailPayload({
      base64: base64(tooLarge),
      mime_type: "image/webp",
      size_bytes: tooLarge.length,
      width: 2,
      height: 2,
    }).ok,
    "oversized bytes should fail",
  );

  const incomplete = incompleteVp8x(320, 180);
  assert(
    !parseGalleryThumbnailPayload({
      base64: base64(incomplete),
      mime_type: "image/webp",
      size_bytes: incomplete.length,
      width: 320,
      height: 180,
    }).ok,
    "a WebP container without an image chunk should fail",
  );
});

Deno.test("derives an immutable service-only thumbnail revision path", () => {
  assert(
    galleryThumbnailStoragePath(
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
    ) ===
      "_approved/thumbs/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.webp",
    "thumbnail path was not deterministic",
  );
});
