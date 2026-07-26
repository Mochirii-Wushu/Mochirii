import { readFileSync } from "node:fs";
import path from "node:path";
import { brotliCompressSync, constants as zlibConstants } from "node:zlib";

const buildRoot = path.resolve(".next");
const rootLayoutPath = path.resolve("app", "layout.tsx");
const petsLayoutPath = path.resolve("app", "games", "mochi-pets", "layout.tsx");
const spinnerPagePath = path.resolve("app", "spinner", "page.tsx");
const spinnerAuthorizedPath = path.resolve("app", "spinner", "authorized.tsx");
const spinnerStylesheetPath = path.resolve("public", "assets", "css", "member-spinner.css");
const homeManifestPath = path.join(buildRoot, "server", "app", "page_client-reference-manifest.js");
const petsManifestPath = path.join(buildRoot, "server", "app", "games", "mochi-pets", "page_client-reference-manifest.js");
const spinnerManifestPath = path.join(buildRoot, "server", "app", "spinner", "page_client-reference-manifest.js");
const petsMarker = ".mochi-game-page";
const spinnerMarker = ".spinner-page";
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
const spinnerPage = readFileSync(spinnerPagePath, "utf8");
const spinnerAuthorized = readFileSync(spinnerAuthorizedPath, "utf8");
const spinnerStylesheet = readFileSync(spinnerStylesheetPath);
if (rootLayout.includes("mochi-pets.css")) failures.push("root layout must not import Mochi Pets CSS");
if (rootLayout.includes("member-spinner.css")) failures.push("root layout must not import private spinner CSS");
if (!petsLayout.includes('import "../../styles/mochi-pets.css"')) failures.push("Mochi Pets route layout must import its stylesheet");
if (spinnerPage.includes("member-spinner.css")) failures.push("Private spinner page shell must not preload authorized-only CSS");
if (!spinnerAuthorized.includes('preinit("/assets/css/member-spinner.css", { as: "style", precedence: "spinner" })')) failures.push("Authorized spinner stage must initialize its stylesheet after authorization");

let homeBundle;
let petsBundle;
let spinnerBundle;
try {
  homeBundle = readCssBundle(homeManifestPath);
  petsBundle = readCssBundle(petsManifestPath);
  spinnerBundle = readCssBundle(spinnerManifestPath);
} catch (error) {
  console.error(`Route CSS bundle guard could not read the production build: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

if (hasMarker(homeBundle, petsMarker)) failures.push(`Home CSS contains route-only selector ${petsMarker}`);
if (!hasMarker(petsBundle, petsMarker)) failures.push(`Mochi Pets CSS is missing route selector ${petsMarker}`);
if (hasMarker(homeBundle, spinnerMarker)) failures.push(`Home CSS contains route-only selector ${spinnerMarker}`);
if (hasMarker(petsBundle, spinnerMarker)) failures.push(`Mochi Pets CSS contains route-only selector ${spinnerMarker}`);
if (hasMarker(spinnerBundle, spinnerMarker)) failures.push(`Private spinner route bundle eagerly contains authorized selector ${spinnerMarker}`);
if (!spinnerStylesheet.includes(Buffer.from(spinnerMarker))) failures.push(`Private spinner stylesheet is missing route selector ${spinnerMarker}`);

if (failures.length) {
  console.error("Route CSS bundle guard failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Route CSS bundle guard passed.");
console.log(`- Home CSS: ${formatKiB(homeBundle.brotliBytes)} Brotli across ${homeBundle.files.length} chunk(s).`);
console.log(`- Mochi Pets CSS: ${formatKiB(petsBundle.brotliBytes)} Brotli across ${petsBundle.files.length} chunk(s).`);
console.log(`- Private spinner route CSS: ${formatKiB(spinnerBundle.brotliBytes)} Brotli across ${spinnerBundle.files.length} generic chunk(s).`);
console.log(`- Authorized spinner stylesheet: ${formatKiB(brotliCompressSync(spinnerStylesheet, {
  params: {
    [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
    [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
  },
}).length)} Brotli, linked only by the authorized stage.`);
console.log(`- ${petsMarker} is absent from Home and present on the Mochi Pets route.`);
console.log(`- ${spinnerMarker} is absent from route bundles and present in the authorized-only stylesheet.`);
