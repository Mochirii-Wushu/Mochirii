import { readFileSync } from "node:fs";

const file = "data/gallery.json";
const data = JSON.parse(readFileSync(file, "utf8"));
const albums = Array.isArray(data.albums) ? data.albums : [];
const isoUtcPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const failures = [];
let checked = 0;

for (const album of albums) {
  const items = Array.isArray(album.items) ? album.items : [];
  for (const item of items) {
    checked += 1;
    const id = String(item.id || "<missing-id>");
    const path = String(item.full || item.src || "<missing-path>");
    const value = item.galleryAddedAt;

    if (typeof value !== "string" || !value.trim()) {
      failures.push(`${id} (${path}): missing galleryAddedAt`);
      continue;
    }

    if (!isoUtcPattern.test(value)) {
      failures.push(`${id} (${path}): galleryAddedAt is not an ISO UTC timestamp: ${value}`);
      continue;
    }

    if (!Number.isFinite(Date.parse(value))) {
      failures.push(`${id} (${path}): galleryAddedAt could not be parsed: ${value}`);
    }
  }
}

if (failures.length) {
  console.error("Gallery timestamp validation failed.");
  failures.forEach((failure) => console.error(`  ${failure}`));
  process.exit(1);
}

console.log(`Gallery timestamps OK (${checked} items).`);

