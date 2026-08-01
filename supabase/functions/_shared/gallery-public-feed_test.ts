import {
  buildGalleryPublicListResponse,
  encodeGalleryCursor,
  GALLERY_PUBLIC_LIST_RESERVED_BYTES,
  GALLERY_PUBLIC_MEDIA_URL_MAX_BYTES,
  GALLERY_PUBLIC_PAGE_SIZE,
  GalleryEvidenceNotCacheableError,
  GalleryIsolateCircuitBreaker,
  GalleryIsolateEvidenceCache,
  galleryPublicListCacheKey,
  galleryPublicListOverflowEvent,
  type GalleryPublicRequest,
  isLegacyGalleryListRequest,
  isUnsignedGalleryPageEvidence,
  parseGalleryDatabasePage,
  parseGalleryDeliveryReservation,
  parseGalleryMediaReservation,
  parseGalleryPublicRequest,
  safeGalleryPublicMediaUrl,
  serializeGalleryPublicListResponse,
  toLegacyGalleryItem,
  toPublicGalleryItem,
} from "./gallery-public-feed.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertNumberEquals(
  actual: number,
  expected: number,
  message: string,
): void {
  assert(actual === expected, message);
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function asciiGalleryUrlAtByteLength(
  byteLength: number,
  finalCharacter = "a",
): string {
  const prefix = "https://gallery.example.test/";
  const remaining = byteLength - utf8ByteLength(prefix);
  assert(remaining >= 1, "requested URL byte length was too small");
  return `${prefix}${"a".repeat(remaining - 1)}${finalCharacter}`;
}

function responseAtByteLength(
  representation: "legacy" | "schema-v2",
  byteLength: number,
): Record<string, unknown> {
  const body = representation === "legacy"
    ? {
      ok: true,
      data: { submissions: [], count: 0, padding: "" },
      message: "No member-submitted images are available yet.",
    }
    : {
      ok: true,
      data: { schemaVersion: 2, items: [], count: 0, padding: "" },
      message: "No member-submitted images are available yet.",
    };
  const baseLength = utf8ByteLength(JSON.stringify(body));
  assert(
    baseLength <= byteLength,
    "requested response byte length was too small",
  );
  body.data.padding = "a".repeat(byteLength - baseLength);
  assert(
    utf8ByteLength(JSON.stringify(body)) === byteLength,
    "response fixture did not reach its exact byte length",
  );
  return body;
}

async function assertRejects(
  operation: () => Promise<unknown>,
  expected: (error: unknown) => boolean,
  message: string,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    assert(expected(error), message);
    return;
  }
  throw new Error(message);
}

function pageEvidence(marker: string): Record<string, unknown> {
  return {
    schemaVersion: 2,
    items: [{ marker, thumbnailStoragePath: `_approved/${marker}.webp` }],
    hasMore: false,
  };
}

const cursorSnapshot = new Date(Date.now() - 60_000);
const cursorValue = {
  v: 2 as const,
  snapshotAt: cursorSnapshot.toISOString(),
  reviewedAt: new Date(cursorSnapshot.getTime() - 60_000).toISOString(),
  createdAt: new Date(cursorSnapshot.getTime() - 120_000).toISOString(),
  id: "11111111-1111-4111-8111-111111111111",
  sort: "oldest" as const,
  category: "portraits",
  query: "Mōchī",
};

Deno.test("normalizes and bounds a Gallery list request", () => {
  const cursor = encodeGalleryCursor(cursorValue);
  assert(cursor, "expected an encoded cursor");
  const result = parseGalleryPublicRequest({
    action: "list",
    pageSize: 999,
    cursor,
    sort: "oldest",
    category: "portraits",
    query: "  Ｍōchī  ",
  });
  assert(
    result.ok && result.request.action === "list",
    "expected a valid list request",
  );
  assert(
    result.request.pageSize === GALLERY_PUBLIC_PAGE_SIZE,
    "page size was not clamped",
  );
  assert(result.request.query === "Mōchī", "query was not Unicode-normalized");
  assert(
    result.request.cursor?.id === cursorValue.id,
    "cursor did not round trip",
  );
});

Deno.test("recognizes only the exact legacy empty-object request shape", () => {
  assert(
    isLegacyGalleryListRequest({}),
    "legacy empty-object request was rejected",
  );
  for (const value of [null, [], "{}", { action: "list" }, { pageSize: 24 }]) {
    assert(
      !isLegacyGalleryListRequest(value),
      `nonlegacy request was accepted: ${JSON.stringify(value)}`,
    );
  }
});

Deno.test("rejects malformed cursors, categories, searches, and opaque ids", () => {
  for (
    const payload of [
      { cursor: "not-json" },
      { category: "invented-filter" },
      { query: "x".repeat(81) },
      { action: "full", id: "../../private/object" },
    ]
  ) {
    assert(
      !parseGalleryPublicRequest(payload).ok,
      `expected rejection for ${JSON.stringify(payload)}`,
    );
  }
});

Deno.test("accepts opaque-id thumbnail refresh requests", () => {
  const result = parseGalleryPublicRequest({
    action: "thumbnail",
    id: cursorValue.id,
  });
  assert(
    result.ok && result.request.action === "thumbnail",
    "expected a valid thumbnail refresh request",
  );
  assert(
    result.request.id === cursorValue.id,
    "thumbnail refresh changed the opaque id",
  );
});

Deno.test("rejects cursors reused with a different query contract", () => {
  const cursor = encodeGalleryCursor(cursorValue);
  assert(cursor, "expected an encoded cursor");
  const result = parseGalleryPublicRequest({
    action: "list",
    cursor,
    sort: "oldest",
    category: "portraits",
    query: "A different search",
  });
  assert(
    !result.ok && result.error === "cursor_context_mismatch",
    "expected a bound cursor rejection",
  );
});

Deno.test("rejects a cursor snapshot forged into the future", () => {
  assert(
    encodeGalleryCursor({
      ...cursorValue,
      snapshotAt: "2099-07-28T12:30:00.000Z",
    }) === null,
    "expected a future snapshot to be rejected",
  );
});

Deno.test("rejects a cursor snapshot outside the bounded traversal window", () => {
  assert(
    encodeGalleryCursor({
      ...cursorValue,
      snapshotAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    }) === null,
    "expected an expired snapshot to be rejected",
  );
});

function databasePage(): Record<string, unknown> {
  return {
    schemaVersion: 2,
    snapshotAt: cursorValue.snapshotAt,
    snapshotExpiresAt: new Date(cursorSnapshot.getTime() + 10 * 60 * 1000)
      .toISOString(),
    items: [{
      id: cursorValue.id,
      title: "Guild view",
      caption: "A shared horizon",
      category: "scenery",
      categories: ["member-submissions", "scenery"],
      mimeType: "image/webp",
      sizeBytes: 1000,
      createdAt: cursorValue.createdAt,
      reviewedAt: cursorValue.reviewedAt,
      thumbnailSizeBytes: 100,
      thumbnailWidth: 640,
      thumbnailHeight: 400,
    }],
    hasMore: true,
    nextCursor: {
      reviewedAt: cursorValue.reviewedAt,
      createdAt: cursorValue.createdAt,
      id: cursorValue.id,
      snapshotAt: cursorValue.snapshotAt,
    },
    totalEligible: 2,
    sourceApprovedCount: 2,
    publicationReadyCount: 2,
    facets: {
      "member-submissions": 2,
      portraits: 0,
      gatherings: 0,
      action: 0,
      scenery: 2,
      companions: 0,
    },
    unknownCategoryCount: 0,
  };
}

Deno.test("strict database page evidence rejects malformed empty and aggregate envelopes", () => {
  assert(
    parseGalleryDatabasePage(databasePage()),
    "valid database page was rejected",
  );
  assert(
    parseGalleryDatabasePage({ schemaVersion: 2, items: [] }) === null,
    "malformed database evidence masqueraded as an empty Gallery",
  );
  assert(
    parseGalleryDatabasePage({ ...databasePage(), facets: {} }) === null,
    "missing Gallery aggregates were accepted",
  );
  assert(
    parseGalleryDatabasePage({
          ...databasePage(),
          unknownCategoryCount: null,
        }) === null &&
      parseGalleryDatabasePage({ ...databasePage(), totalEligible: "2" }) ===
        null,
    "coerced Gallery aggregate values were accepted",
  );
  assert(
    parseGalleryDatabasePage({ ...databasePage(), hasMore: false }) === null,
    "cursor and pagination mismatch was accepted",
  );
  assert(
    parseGalleryDatabasePage({
      ...databasePage(),
      publicationReadyCount: 1,
    }) === null,
    "an incomplete publication ledger was accepted as a complete public feed",
  );
});

Deno.test("delivery reservations distinguish allowed, denied, and malformed evidence", () => {
  assert(
    parseGalleryDeliveryReservation({
      allowed: true,
      retryAfterSeconds: 0,
      dailyReservedBytes: 1024,
      dailyLimitBytes: 4096,
    })?.allowed === true,
    "valid delivery reservation was rejected",
  );
  assert(
    parseGalleryDeliveryReservation({
      allowed: false,
      retryAfterSeconds: 60,
      dailyReservedBytes: 4096,
      dailyLimitBytes: 4096,
    })?.allowed === false,
    "valid quota denial was rejected",
  );
  assert(
    parseGalleryDeliveryReservation({}) === null &&
      parseGalleryDeliveryReservation({
          allowed: false,
          retryAfterSeconds: "60",
          dailyReservedBytes: null,
          dailyLimitBytes: 4096,
        }) === null,
    "malformed reservation evidence was treated as a quota denial",
  );
});

Deno.test("atomic media reservations require exact bounded media evidence", () => {
  const allowed = parseGalleryMediaReservation(
    {
      allowed: true,
      retryAfterSeconds: 0,
      dailyReservedBytes: 1024,
      dailyLimitBytes: 4096,
      id: cursorValue.id,
      storageBucket: "member-gallery",
      storagePath: `_approved/publications/${cursorValue.id}/display.webp`,
      mimeType: "image/webp",
      sizeBytes: 1024,
      width: 1280,
      height: 720,
      sha256: "a".repeat(64),
    },
    cursorValue.id,
    "full",
  );
  assert(
    allowed?.allowed === true && "storagePath" in allowed,
    "valid atomic media evidence was rejected",
  );

  const denied = parseGalleryMediaReservation(
    {
      allowed: false,
      retryAfterSeconds: 60,
      dailyReservedBytes: 4096,
      dailyLimitBytes: 4096,
    },
    cursorValue.id,
    "full",
  );
  assert(
    denied?.allowed === false && !("storagePath" in denied),
    "quota denial did not remain path-free",
  );

  assert(
    parseGalleryMediaReservation(
      {
        allowed: true,
        retryAfterSeconds: 0,
        dailyReservedBytes: 1024,
        dailyLimitBytes: 4096,
        id: cursorValue.id,
        storageBucket: "member-gallery",
        storagePath: "private/source.webp",
        mimeType: "image/webp",
        sizeBytes: 81 * 1024,
        width: 720,
        height: 450,
        sha256: "a".repeat(64),
      },
      cursorValue.id,
      "thumbnail",
    ) === null,
    "oversized thumbnail evidence was accepted",
  );
});

Deno.test("public Gallery items omit service-only references and originals", () => {
  const item = toPublicGalleryItem({
    id: cursorValue.id,
    title: "Guild view",
    caption: "A shared horizon\nSecond line\twith detail\rThird line",
    category: "scenery",
    categories: ["member-submissions", "scenery"],
    mimeType: "image/webp",
    sizeBytes: 1000,
    createdAt: cursorValue.createdAt,
    reviewedAt: cursorValue.reviewedAt,
    uploaderDisplayName: "Mōchī Member",
    thumbnailStoragePath: "_approved/thumbs/private.webp",
    storagePath: "private/original.webp",
    fullSignedUrl: "https://example.invalid/private-original",
    thumbnailSizeBytes: 100,
    thumbnailWidth: 640,
    thumbnailHeight: 400,
  }, "https://example.invalid/bounded-thumbnail");

  assert(item, "expected a valid public item");
  const serialized = JSON.stringify(item);
  assert(!serialized.includes("StoragePath"), "raw Storage path leaked");
  assert(
    !serialized.includes("private-original"),
    "full original leaked into the list response",
  );
  assert(
    serialized.includes("bounded-thumbnail"),
    "bounded thumbnail was not preserved",
  );
  assert(
    item.caption === "A shared horizon\nSecond line\twith detail\rThird line",
    "ordinary multiline caption whitespace was not preserved",
  );
  assert(
    !serialized.includes("Mōchī Member") && !("uploader_display_name" in item),
    "member identity leaked into the anonymous Gallery item",
  );
});

Deno.test("public Gallery text rejects unsafe controls without dropping ordinary multiline captions", () => {
  const item = toPublicGalleryItem({
    id: cursorValue.id,
    title: "Unsafe\u0000title",
    caption: "First line\nSecond line\twith detail\rThird line",
    category: "scenery",
    categories: ["member-submissions", "scenery"],
    mimeType: "image/webp",
    sizeBytes: 1000,
    createdAt: cursorValue.createdAt,
    reviewedAt: cursorValue.reviewedAt,
    thumbnailSizeBytes: 100,
    thumbnailWidth: 640,
    thumbnailHeight: 400,
  }, "https://example.invalid/bounded-thumbnail");

  assert(item, "expected a valid public item");
  assert(item.title === null, "unsafe title controls were retained");
  assert(
    item.caption === "First line\nSecond line\twith detail\rThird line",
    "ordinary multiline caption whitespace was dropped",
  );
});

Deno.test("legacy and schema-v2 response envelopes share the exact 64 KiB boundary", () => {
  for (const representation of ["legacy", "schema-v2"] as const) {
    const exact = responseAtByteLength(
      representation,
      GALLERY_PUBLIC_LIST_RESERVED_BYTES,
    );
    const oversized = responseAtByteLength(
      representation,
      GALLERY_PUBLIC_LIST_RESERVED_BYTES + 1,
    );
    assert(
      serializeGalleryPublicListResponse(exact) !== null,
      `${representation} response at the reservation boundary was rejected`,
    );
    assert(
      serializeGalleryPublicListResponse(oversized) === null,
      `${representation} response above the reservation boundary was accepted`,
    );
  }
});

Deno.test("bounded list responses fail closed without leaking page content or log fields", async () => {
  const exact = responseAtByteLength(
    "schema-v2",
    GALLERY_PUBLIC_LIST_RESERVED_BYTES,
  );
  const accepted = buildGalleryPublicListResponse(exact, {
    "Access-Control-Allow-Origin": "*",
  });
  assert(!accepted.overflowed, "exact-boundary response overflowed");
  assertNumberEquals(
    accepted.response.status,
    200,
    "exact response status drifted",
  );
  assert(
    accepted.response.headers.get("cache-control") === "no-store",
    "exact response lost no-store",
  );

  const sentinel = "private-caption-and-media-url-must-not-leak";
  const oversized = responseAtByteLength(
    "legacy",
    GALLERY_PUBLIC_LIST_RESERVED_BYTES + 1,
  );
  (oversized.data as Record<string, unknown>).submissions = [{
    caption: sentinel,
    thumbnail_url: `https://gallery.example.test/${sentinel}`,
  }];
  const rejected = buildGalleryPublicListResponse(oversized, {
    "Access-Control-Allow-Origin": "*",
  });
  assert(rejected.overflowed, "oversized response did not overflow");
  assertNumberEquals(rejected.response.status, 503, "overflow status drifted");
  assert(
    rejected.response.headers.get("cache-control") === "no-store",
    "overflow response lost no-store",
  );
  assert(
    rejected.response.headers.get("content-type") === "application/json",
    "overflow response content type drifted",
  );
  const overflowBody = await rejected.response.text();
  assert(
    !overflowBody.includes(sentinel),
    "overflow response leaked page content",
  );
  assert(
    overflowBody === JSON.stringify({
      ok: false,
      error: "approved_submission_page_unavailable",
      message: "Member-submitted images are temporarily unavailable.",
    }),
    "overflow response body drifted",
  );

  const event = galleryPublicListOverflowEvent("legacy", 24);
  assert(
    JSON.stringify(Object.keys(event)) ===
      JSON.stringify(["code", "representation", "itemCount"]),
    "overflow log fields expanded",
  );
  assert(
    !JSON.stringify(event).includes(sentinel),
    "overflow log leaked page content",
  );
});

Deno.test("public media URLs enforce one UTF-8-aware 512-byte HTTPS contract", () => {
  const exact = asciiGalleryUrlAtByteLength(
    GALLERY_PUBLIC_MEDIA_URL_MAX_BYTES,
  );
  const oversized = asciiGalleryUrlAtByteLength(
    GALLERY_PUBLIC_MEDIA_URL_MAX_BYTES + 1,
  );
  assert(
    safeGalleryPublicMediaUrl(exact) === exact,
    "exact-boundary Gallery media URL was rejected",
  );
  assert(
    safeGalleryPublicMediaUrl(oversized) === null,
    "oversized ASCII Gallery media URL was accepted",
  );

  const prefix = "https://gallery.example.test/";
  const multibyteOverflow = `${prefix}${
    "é".repeat(
      Math.floor(
        (GALLERY_PUBLIC_MEDIA_URL_MAX_BYTES - utf8ByteLength(prefix)) / 2,
      ) +
        1,
    )
  }`;
  assert(
    multibyteOverflow.length < GALLERY_PUBLIC_MEDIA_URL_MAX_BYTES &&
      utf8ByteLength(multibyteOverflow) > GALLERY_PUBLIC_MEDIA_URL_MAX_BYTES,
    "multibyte overflow fixture did not exercise byte-aware validation",
  );
  assert(
    safeGalleryPublicMediaUrl(multibyteOverflow) === null,
    "oversized multibyte Gallery media URL was accepted",
  );

  for (
    const unsafe of [
      "not-a-url",
      "http://gallery.example.test/image.webp",
      "https://user:password@gallery.example.test/image.webp",
      "https://gallery.example.test/image.webp#private",
      "https://gallery.example.test/unsafe\u0000control",
      "https://gallery.example.test/unsafe\ud800surrogate",
    ]
  ) {
    assert(
      safeGalleryPublicMediaUrl(unsafe) === null,
      `unsafe Gallery media URL was accepted: ${JSON.stringify(unsafe)}`,
    );
  }
});

Deno.test("maximum legal schema-v2 and legacy list responses fit the shared reservation", () => {
  const maximumText = "\u0800";
  const title = maximumText.repeat(80);
  const caption = maximumText.repeat(300);
  const maximumDate = `${new Date(Date.now() - 60_000).toUTCString()} (${
    "a".repeat(48)
  })`;
  assert(
    maximumDate.length === 80,
    "maximum legal date did not reach its field bound",
  );
  const items = Array.from({ length: GALLERY_PUBLIC_PAGE_SIZE }, (_, index) => {
    const id = `11111111-1111-4111-8111-${String(index + 1).padStart(12, "0")}`;
    const thumbnailUrl = asciiGalleryUrlAtByteLength(
      GALLERY_PUBLIC_MEDIA_URL_MAX_BYTES,
      String(index % 10),
    );
    const item = toPublicGalleryItem({
      id,
      title,
      caption,
      category: "gatherings",
      categories: [
        "member-submissions",
        "portraits",
        "gatherings",
        "action",
        "scenery",
        "companions",
      ],
      mimeType: "image/webp",
      sizeBytes: 2 * 1024 * 1024,
      createdAt: maximumDate,
      reviewedAt: maximumDate,
      thumbnailSizeBytes: 80 * 1024,
      thumbnailWidth: 720,
      thumbnailHeight: 720,
    }, thumbnailUrl);
    assert(item, "maximum legal Gallery item was rejected");
    return item;
  });
  const nextCursor = encodeGalleryCursor({
    snapshotAt: maximumDate,
    reviewedAt: maximumDate,
    createdAt: maximumDate,
    id: items.at(-1)?.id,
    sort: "newest",
    category: "gatherings",
    query: maximumText.repeat(80),
  });
  assert(nextCursor, "maximum legal Gallery cursor was rejected");

  const schemaV2Body = {
    ok: true,
    data: {
      schemaVersion: 2,
      items,
      count: GALLERY_PUBLIC_PAGE_SIZE,
      totalEligible: Number.MAX_SAFE_INTEGER,
      facets: {
        "member-submissions": Number.MAX_SAFE_INTEGER,
        portraits: Number.MAX_SAFE_INTEGER,
        gatherings: Number.MAX_SAFE_INTEGER,
        action: Number.MAX_SAFE_INTEGER,
        scenery: Number.MAX_SAFE_INTEGER,
        companions: Number.MAX_SAFE_INTEGER,
      },
      hasMore: true,
      nextCursor,
      partial: false,
      complete: false,
      deliveryFailures: 0,
      delivery: "bounded-edge-media",
      cacheSeconds: 15,
    },
    message: "Member-submitted images loaded.",
  };
  assert(
    serializeGalleryPublicListResponse(schemaV2Body),
    "maximum legal schema-v2 Gallery response exceeded its reservation",
  );

  const submissions = items.map((item, index) => {
    const fullUrl = asciiGalleryUrlAtByteLength(
      GALLERY_PUBLIC_MEDIA_URL_MAX_BYTES,
      String((index + 1) % 10),
    );
    const legacyItem = toLegacyGalleryItem(item, fullUrl);
    assert(legacyItem, "maximum legal legacy Gallery item was rejected");
    return legacyItem;
  });
  assert(
    serializeGalleryPublicListResponse({
      ok: true,
      data: { submissions, count: submissions.length },
      message: "Member-submitted images loaded.",
    }),
    "maximum legal legacy Gallery response exceeded its reservation",
  );
});

Deno.test("legacy Gallery items use metered Edge URLs without identity or paths", () => {
  const thumbnailUrl =
    `https://media.example.test/functions/v1/list-approved-gallery-submissions?asset=thumbnail&id=${cursorValue.id}`;
  const fullUrl =
    `https://media.example.test/functions/v1/list-approved-gallery-submissions?asset=full&id=${cursorValue.id}`;
  const publicItem = toPublicGalleryItem({
    id: cursorValue.id,
    title: "Guild view",
    caption: "A shared horizon",
    category: "scenery",
    categories: ["member-submissions", "scenery"],
    mimeType: "image/webp",
    sizeBytes: 1000,
    createdAt: cursorValue.createdAt,
    reviewedAt: cursorValue.reviewedAt,
    thumbnailSizeBytes: 100,
    thumbnailWidth: 640,
    thumbnailHeight: 400,
  }, thumbnailUrl);
  assert(publicItem, "expected a valid public item");
  const legacyItem = toLegacyGalleryItem(publicItem, fullUrl);
  assert(legacyItem, "expected a valid legacy item");
  assert(
    legacyItem.full_signed_url === fullUrl &&
      legacyItem.thumbnail_signed_url === thumbnailUrl,
    "legacy media fields did not retain the metered Edge URLs",
  );
  assert(
    legacyItem.uploader_display_name === null &&
      legacyItem.uploader_discord_name === null,
    "legacy compatibility exposed member identity",
  );
  const serialized = JSON.stringify(legacyItem);
  assert(
    !serialized.includes("storage_path") &&
      !serialized.includes("storage_bucket") &&
      !serialized.includes("private/original"),
    "legacy compatibility exposed a private Storage reference",
  );
  assert(
    toLegacyGalleryItem(publicItem, thumbnailUrl) === null,
    "legacy compatibility accepted identical thumbnail and full URLs",
  );
  const exactThumbnailUrl = asciiGalleryUrlAtByteLength(
    GALLERY_PUBLIC_MEDIA_URL_MAX_BYTES,
    "1",
  );
  const exactFullUrl = asciiGalleryUrlAtByteLength(
    GALLERY_PUBLIC_MEDIA_URL_MAX_BYTES,
    "2",
  );
  const exactPublicItem = {
    ...publicItem,
    thumbnail_url: exactThumbnailUrl,
  };
  assert(
    toLegacyGalleryItem(exactPublicItem, exactFullUrl),
    "legacy compatibility rejected exact-boundary media URLs",
  );
  assert(
    toLegacyGalleryItem(
      { ...publicItem, thumbnail_url: `${exactThumbnailUrl}a` },
      exactFullUrl,
    ) === null,
    "legacy compatibility accepted an oversized thumbnail URL",
  );
  assert(
    toLegacyGalleryItem(exactPublicItem, `${exactFullUrl}a`) === null,
    "legacy compatibility accepted an oversized full URL",
  );
});

Deno.test("invalid thumbnail geometry fails closed", () => {
  const item = toPublicGalleryItem({
    id: cursorValue.id,
    thumbnailSizeBytes: 100,
    thumbnailWidth: 721,
    thumbnailHeight: 400,
  }, "https://example.invalid/bounded-thumbnail");
  assert(item === null, "oversized geometry should be rejected");
});

Deno.test("invalid display metadata fails closed", () => {
  const baseItem = {
    id: cursorValue.id,
    category: "scenery",
    categories: ["member-submissions", "scenery"],
    mimeType: "image/webp",
    sizeBytes: 1000,
    createdAt: cursorValue.createdAt,
    reviewedAt: cursorValue.reviewedAt,
    thumbnailSizeBytes: 100,
    thumbnailWidth: 640,
    thumbnailHeight: 400,
  };
  for (
    const item of [
      { ...baseItem, mimeType: "image/jpeg" },
      { ...baseItem, sizeBytes: 2 * 1024 * 1024 + 1 },
      { ...baseItem, category: "uncategorized" },
      { ...baseItem, reviewedAt: "not-a-date" },
    ]
  ) {
    assert(
      toPublicGalleryItem(item, "https://example.invalid/bounded-thumbnail") ===
        null,
      "invalid display metadata should be rejected",
    );
  }
});

Deno.test("list cache keys bind the complete normalized traversal context", () => {
  const base: GalleryPublicRequest = {
    action: "list",
    pageSize: 24,
    cursor: cursorValue,
    sort: "oldest",
    category: "portraits",
    query: "Mōchī",
  };
  const key = galleryPublicListCacheKey(base);
  assert(key === galleryPublicListCacheKey({ ...base }), "key was unstable");
  assert(
    galleryPublicListCacheKey({ ...base, pageSize: 12 }) !== key,
    "page size was not bound",
  );
  assert(
    galleryPublicListCacheKey({ ...base, query: "another" }) !== key,
    "query was not bound",
  );
  assert(
    galleryPublicListCacheKey({ ...base, sort: "newest" }) !== key,
    "sort was not bound",
  );
  assert(
    galleryPublicListCacheKey({ ...base, category: "scenery" }) !== key,
    "category was not bound",
  );
  assert(
    galleryPublicListCacheKey({
      ...base,
      cursor: {
        ...cursorValue,
        snapshotAt: new Date(
          Date.parse(cursorValue.snapshotAt) - 1_000,
        ).toISOString(),
      },
    }) !== key,
    "snapshot was not bound",
  );
  assert(
    galleryPublicListCacheKey({
      ...base,
      cursor: { ...cursorValue, id: "22222222-2222-4222-8222-222222222222" },
    }) !== key,
    "cursor tuple was not bound",
  );
  assert(
    galleryPublicListCacheKey({ action: "full", id: cursorValue.id }) === null,
    "asset requests must bypass the list cache",
  );
});

Deno.test("evidence cache coalesces identical loads and expires deterministically", async () => {
  let now = 1_000;
  let loads = 0;
  let resolveLoad: ((value: unknown) => void) | undefined;
  const cache = new GalleryIsolateEvidenceCache({
    maxEntries: 2,
    ttlMs: 100,
    now: () => now,
  });
  const loader = () => {
    loads += 1;
    return new Promise<unknown>((resolve) => {
      resolveLoad = resolve;
    });
  };

  const first = cache.getOrLoad("same", loader);
  const second = cache.getOrLoad("same", loader);
  await Promise.resolve();
  assertNumberEquals(loads, 1, "identical in-flight loads were not coalesced");
  resolveLoad?.(pageEvidence("same"));
  assert(await first === await second, "coalesced callers diverged");

  await cache.getOrLoad("same", () =>
    Promise.resolve().then(() => {
      loads += 1;
      return pageEvidence("unexpected");
    }));
  assertNumberEquals(loads, 1, "unexpired evidence missed the cache");

  now += 101;
  await cache.getOrLoad("same", () =>
    Promise.resolve().then(() => {
      loads += 1;
      return pageEvidence("refreshed");
    }));
  assertNumberEquals(loads, 2, "expired evidence was retained");
});

Deno.test("evidence cache is bounded and evicts the least-recent settled page", async () => {
  let loads = 0;
  const cache = new GalleryIsolateEvidenceCache({
    maxEntries: 2,
    ttlMs: 1_000,
  });
  const load = (marker: string) =>
    Promise.resolve().then(() => {
      loads += 1;
      return pageEvidence(marker);
    });

  await cache.getOrLoad("a", () => load("a"));
  await cache.getOrLoad("b", () => load("b"));
  await cache.getOrLoad("a", () => load("unexpected"));
  await cache.getOrLoad("c", () => load("c"));
  assert(cache.size === 2, "cache exceeded its entry bound");
  await cache.getOrLoad("b", () => load("b-refreshed"));
  assertNumberEquals(loads, 4, "least-recent page was not evicted");
});

Deno.test("failures and signed capabilities never enter the evidence cache", async () => {
  const cache = new GalleryIsolateEvidenceCache();
  await assertRejects(
    () => cache.getOrLoad("failure", () => Promise.reject(new Error("boom"))),
    (error) => error instanceof Error,
    "loader failure was not propagated",
  );
  assert(cache.size === 0, "loader failure was cached");

  await assertRejects(
    () =>
      cache.getOrLoad("signed", () =>
        Promise.resolve({
          schemaVersion: 2,
          items: [],
          signedUrl:
            "https://example.invalid/storage/v1/object/sign/private/a?token=secret",
        })),
    (error) => error instanceof GalleryEvidenceNotCacheableError,
    "signed capability was accepted",
  );
  assert(cache.size === 0, "signed capability was cached");
  assert(
    !isUnsignedGalleryPageEvidence({
      schemaVersion: 2,
      items: [],
      next: "/storage/v1/object/sign/private/a?token=secret",
    }),
    "capability-shaped value passed validation",
  );
});

Deno.test("isolate circuit breaker enforces burst and deterministic refill", () => {
  let now = 1_000;
  const breaker = new GalleryIsolateCircuitBreaker({
    burst: 2,
    refillPerSecond: 1,
    maxConcurrent: 10,
    now: () => now,
  });
  const first = breaker.tryAcquire();
  const second = breaker.tryAcquire();
  assert(first.ok && second.ok, "initial burst was rejected");
  first.release();
  second.release();
  const exhausted = breaker.tryAcquire();
  assert(
    !exhausted.ok && exhausted.retryAfterSeconds === 1,
    "exhausted burst returned an invalid retry",
  );

  now += 1_000;
  const refilled = breaker.tryAcquire();
  assert(refilled.ok, "token did not refill");
  refilled.release();
});

Deno.test("isolate circuit breaker caps concurrency and release is idempotent", () => {
  const breaker = new GalleryIsolateCircuitBreaker({
    burst: 10,
    refillPerSecond: 1,
    maxConcurrent: 2,
    now: () => 1_000,
  });
  const first = breaker.tryAcquire();
  const second = breaker.tryAcquire();
  assert(first.ok && second.ok, "concurrency permits were rejected");
  const busy = breaker.tryAcquire();
  assert(!busy.ok, "concurrency cap did not reject work");
  first.release();
  first.release();
  const replacement = breaker.tryAcquire();
  assert(replacement.ok, "released permit did not restore one slot");
  const stillBusy = breaker.tryAcquire();
  assert(!stillBusy.ok, "duplicate release restored more than one slot");
  second.release();
  replacement.release();
});

Deno.test("isolate circuit breaker does not mint tokens when the clock moves backward", () => {
  let now = 1_000;
  const breaker = new GalleryIsolateCircuitBreaker({
    burst: 1,
    refillPerSecond: 1,
    maxConcurrent: 2,
    now: () => now,
  });
  const permit = breaker.tryAcquire();
  assert(permit.ok, "initial permit was rejected");
  permit.release();

  now = 500;
  assert(!breaker.tryAcquire().ok, "backward clock minted a token");
  now = 2_000;
  const recovered = breaker.tryAcquire();
  assert(recovered.ok, "forward time did not refill from the trusted clock");
  recovered.release();
});
