import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const assetRoot = path.join(root, "apps", "web", "public", "assets");
const largeThreshold = Number(process.env.ASSET_LARGE_BYTES || 1_000_000);
const strict = process.env.STRICT_ASSETS === "1";
const webpMagic = Buffer.from("RIFF");

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

const files = walk(assetRoot);
const fakeWebp = [];
const largeFiles = [];

for (const file of files) {
  const info = statSync(file);
  if (info.size > largeThreshold) largeFiles.push([info.size, rel(file)]);

  if (file.toLowerCase().endsWith(".webp")) {
    const head = readFileSync(file).subarray(0, 4);
    if (!head.equals(webpMagic)) fakeWebp.push(rel(file));
  }
}

largeFiles.sort((a, b) => b[0] - a[0]);

console.log(`Checked ${files.length} asset files.`);
console.log(`Large asset threshold: ${(largeThreshold / 1024 / 1024).toFixed(2)} MB.`);

if (fakeWebp.length) {
  console.warn(`WARN fake .webp files detected: ${fakeWebp.length}`);
  for (const file of fakeWebp.slice(0, 40)) console.warn(`  ${file}`);
  if (fakeWebp.length > 40) console.warn(`  ...and ${fakeWebp.length - 40} more`);
}

if (largeFiles.length) {
  console.warn(`WARN files over threshold: ${largeFiles.length}`);
  for (const [size, file] of largeFiles.slice(0, 20)) {
    console.warn(`  ${(size / 1024 / 1024).toFixed(2)} MB  ${file}`);
  }
  if (largeFiles.length > 20) console.warn(`  ...and ${largeFiles.length - 20} more`);
}

if (strict && (fakeWebp.length || largeFiles.length)) {
  console.error("Strict asset validation failed.");
  process.exit(1);
}

console.log("Asset validation completed with warnings only.");
