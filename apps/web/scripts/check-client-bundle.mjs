import { readFileSync } from "node:fs";
import path from "node:path";
import { brotliCompressSync, constants as zlibConstants } from "node:zlib";

const buildRoot = path.resolve(".next");
const manifestPath = path.join(buildRoot, "server", "app", "page_client-reference-manifest.js");
const layoutLimit = 63 * 1024;
const homeIncrementalLimit = 5 * 1024;
const forbiddenRuntimeMarkers = ["GoTrueClient", "PostgrestError", "RealtimeClient"];
const failures = [];

function parseHomeManifest() {
  const source = readFileSync(manifestPath, "utf8");
  const marker = 'globalThis.__RSC_MANIFEST["/page"] = ';
  const start = source.indexOf(marker);
  const end = source.lastIndexOf(";");
  if (start < 0 || end < start) throw new Error("Home client-reference manifest assignment was not found.");
  return JSON.parse(source.slice(start + marker.length, end));
}

function entryFiles(entries, suffix) {
  const key = Object.keys(entries).find((candidate) => candidate.endsWith(suffix));
  if (!key) throw new Error(`Client bundle entry ${suffix} was not found.`);
  return entries[key];
}

function readChunk(relativePath) {
  return readFileSync(path.join(buildRoot, relativePath));
}

function brotliBytes(buffer) {
  return brotliCompressSync(buffer, {
    params: {
      [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
      [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
    },
  }).length;
}

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

let manifest;
try {
  manifest = parseHomeManifest();
} catch (error) {
  console.error(`Client bundle guard could not read the production build: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const entries = manifest.entryJSFiles || {};
let layoutFiles;
let homeFiles;
try {
  layoutFiles = entryFiles(entries, "/app/layout");
  homeFiles = entryFiles(entries, "/app/page");
} catch (error) {
  console.error(`Client bundle guard could not resolve route entries: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const layoutSet = new Set(layoutFiles);
const homeIncrementalFiles = homeFiles.filter((file) => !layoutSet.has(file));
const layoutChunks = layoutFiles.map((file) => ({ file, buffer: readChunk(file) }));
const homeIncrementalChunks = homeIncrementalFiles.map((file) => ({ file, buffer: readChunk(file) }));
const layoutBrotli = layoutChunks.reduce((total, chunk) => total + brotliBytes(chunk.buffer), 0);
const homeIncrementalBrotli = homeIncrementalChunks.reduce((total, chunk) => total + brotliBytes(chunk.buffer), 0);

for (const marker of forbiddenRuntimeMarkers) {
  const offenders = layoutChunks.filter((chunk) => chunk.buffer.includes(Buffer.from(marker))).map((chunk) => chunk.file);
  if (offenders.length) failures.push(`initial layout contains deferred Supabase marker ${marker}: ${offenders.join(", ")}`);
}

if (layoutBrotli > layoutLimit) {
  failures.push(`initial layout JavaScript is ${formatKiB(layoutBrotli)}; limit is ${formatKiB(layoutLimit)}`);
}
if (homeIncrementalBrotli > homeIncrementalLimit) {
  failures.push(`Home incremental JavaScript is ${formatKiB(homeIncrementalBrotli)}; limit is ${formatKiB(homeIncrementalLimit)}`);
}

if (failures.length) {
  console.error("Client bundle guard failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Client bundle guard passed.");
console.log(`- Initial layout: ${formatKiB(layoutBrotli)} across ${layoutFiles.length} chunk(s).`);
console.log(`- Home incremental: ${formatKiB(homeIncrementalBrotli)} across ${homeIncrementalFiles.length} chunk(s).`);
console.log("- Supabase Auth, PostgREST, and Realtime markers are absent from the initial layout.");
