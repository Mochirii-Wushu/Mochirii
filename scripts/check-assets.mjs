import { closeSync, fstatSync, openSync, readSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  assertAssetValidatorCanaries,
  maximumAssetFormatBytes,
} from "./lib/asset-format-validation.mjs";
import {
  REVIEWED_VENDOR_ASSET_PATHS,
  validatePublicAssetWithReviewedVendorPolicy,
} from "./lib/reviewed-vendor-assets.mjs";

const root = process.cwd();
const assetRoots = [
  path.join(root, "apps", "web", "public"),
  path.join(root, "services", "social", "public"),
  path.join(root, "apps", "shopify-theme", "assets"),
];
const largeThreshold = Number(process.env.ASSET_LARGE_BYTES || 1_000_000);
const strict = process.env.STRICT_ASSETS === "1";

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Asset tree contains a symbolic link: ${rel(full)}`);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
    else throw new Error(`Asset tree contains a non-regular entry: ${rel(full)}`);
  }
  return out;
}

function rel(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function readBoundedRegularFile(file, maximumBytes) {
  const handle = openSync(file, "r");
  try {
    const before = fstatSync(handle);
    if (!before.isFile()) throw new Error("asset is not a regular file");
    if (before.size > maximumBytes) throw new Error(`file exceeds the ${maximumBytes}-byte pre-read bound`);
    const buffer = Buffer.allocUnsafe(before.size);
    let offset = 0;
    while (offset < buffer.length) {
      const count = readSync(handle, buffer, offset, buffer.length - offset, offset);
      if (count === 0) throw new Error("file ended during bounded read");
      offset += count;
    }
    const after = fstatSync(handle);
    if (after.size !== before.size || after.mtimeMs !== before.mtimeMs) throw new Error("file changed during validation");
    return buffer;
  } finally {
    closeSync(handle);
  }
}

const files = assetRoots.flatMap((assetRoot) => walk(assetRoot));
const malformedFiles = [];
const largeFiles = [];
const reviewedVendorAssetsSeen = new Set();

assertAssetValidatorCanaries();

for (const file of files) {
  const info = statSync(file);
  if (info.size > largeThreshold) largeFiles.push([info.size, rel(file)]);

  const extension = path.extname(file).toLowerCase();
  const maximumBytes = maximumAssetFormatBytes(extension);
  if (maximumBytes !== null) {
    try {
      const bytes = readBoundedRegularFile(file, maximumBytes);
      const relativePath = rel(file);
      const { reviewedVendor } = validatePublicAssetWithReviewedVendorPolicy(relativePath, extension, bytes);
      if (reviewedVendor) reviewedVendorAssetsSeen.add(relativePath);
    } catch (error) {
      malformedFiles.push([rel(file), error instanceof Error ? error.message : String(error)]);
    }
  }
}

for (const relativePath of REVIEWED_VENDOR_ASSET_PATHS) {
  if (!reviewedVendorAssetsSeen.has(relativePath)) {
    malformedFiles.push([relativePath, "reviewed vendor asset is missing from the owned public asset trees"]);
  }
}

largeFiles.sort((a, b) => b[0] - a[0]);

console.log(`Checked ${files.length} public asset files across ${assetRoots.length} owned surfaces.`);
console.log(`Large asset threshold: ${(largeThreshold / 1024 / 1024).toFixed(2)} MB.`);

if (malformedFiles.length) {
  console.error(`Malformed asset structure or metadata detected: ${malformedFiles.length}`);
  for (const [file, reason] of malformedFiles.slice(0, 40)) console.error(`  ${file}: ${reason}`);
  if (malformedFiles.length > 40) console.error(`  ...and ${malformedFiles.length - 40} more`);
}

if (largeFiles.length) {
  console.warn(`WARN files over threshold: ${largeFiles.length}`);
  for (const [size, file] of largeFiles.slice(0, 20)) {
    console.warn(`  ${(size / 1024 / 1024).toFixed(2)} MB  ${file}`);
  }
  if (largeFiles.length > 20) console.warn(`  ...and ${largeFiles.length - 20} more`);
}

if (malformedFiles.length || (strict && largeFiles.length)) {
  console.error("Asset validation failed.");
  process.exit(1);
}

console.log(largeFiles.length ? "Asset validation completed with accepted size warnings." : "Asset validation OK.");
