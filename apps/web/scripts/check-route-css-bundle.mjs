import { readFileSync } from "node:fs";
import path from "node:path";
import { brotliCompressSync, constants as zlibConstants } from "node:zlib";

const buildRoot = path.resolve(".next");
const rootLayoutPath = path.resolve("app", "layout.tsx");
const petsLayoutPath = path.resolve("app", "games", "mochi-pets", "layout.tsx");
const homeManifestPath = path.join(buildRoot, "server", "app", "page_client-reference-manifest.js");
const petsManifestPath = path.join(buildRoot, "server", "app", "games", "mochi-pets", "page_client-reference-manifest.js");
const petsMarker = ".mochi-game-page";
const failures = [];

function parseManifest(manifestPath) {
  const source = readFileSync(manifestPath, "utf8");
  const start = source.indexOf("] = ");
  const end = source.lastIndexOf(";");
  if (start < 0 || end < start) throw new Error(`Client-reference assignment was not found in ${manifestPath}.`);
  return JSON.parse(source.slice(start + 4, end));
}

function cssFiles(manifest) {
  return [...new Set(
    Object.values(manifest.entryCSSFiles || {})
      .flat()
      .map((entry) => entry.path),
  )];
}

function readCssBundle(manifestPath) {
  const files = cssFiles(parseManifest(manifestPath));
  const buffers = files.map((file) => readFileSync(path.join(buildRoot, file)));
  return {
    files,
    buffers,
    rawBytes: buffers.reduce((total, buffer) => total + buffer.length, 0),
    brotliBytes: buffers.reduce((total, buffer) => total + brotliCompressSync(buffer, {
      params: {
        [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
        [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
      },
    }).length, 0),
  };
}

function hasMarker(bundle, marker) {
  return bundle.buffers.some((buffer) => buffer.includes(Buffer.from(marker)));
}

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

const rootLayout = readFileSync(rootLayoutPath, "utf8");
const petsLayout = readFileSync(petsLayoutPath, "utf8");
if (rootLayout.includes("mochi-pets.css")) failures.push("root layout must not import Mochi Pets CSS");
if (!petsLayout.includes('import "../../styles/mochi-pets.css"')) failures.push("Mochi Pets route layout must import its stylesheet");

let homeBundle;
let petsBundle;
try {
  homeBundle = readCssBundle(homeManifestPath);
  petsBundle = readCssBundle(petsManifestPath);
} catch (error) {
  console.error(`Route CSS bundle guard could not read the production build: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

if (hasMarker(homeBundle, petsMarker)) failures.push(`Home CSS contains route-only selector ${petsMarker}`);
if (!hasMarker(petsBundle, petsMarker)) failures.push(`Mochi Pets CSS is missing route selector ${petsMarker}`);

if (failures.length) {
  console.error("Route CSS bundle guard failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Route CSS bundle guard passed.");
console.log(`- Home CSS: ${formatKiB(homeBundle.brotliBytes)} Brotli across ${homeBundle.files.length} chunk(s).`);
console.log(`- Mochi Pets CSS: ${formatKiB(petsBundle.brotliBytes)} Brotli across ${petsBundle.files.length} chunk(s).`);
console.log(`- ${petsMarker} is absent from Home and present on the Mochi Pets route.`);
