import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const manifestPath = path.join(appRoot, "MIGRATION-MANIFEST.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function entryFor(absolute) {
  return {
    path: path.relative(repoRoot, absolute).split(path.sep).join("/"),
    sha256: createHash("sha256").update(readFileSync(absolute)).digest("hex"),
  };
}

manifest.files = manifest.includedRoots
  .flatMap((root) => walk(path.join(appRoot, root)))
  .map(entryFor)
  .sort((left, right) => left.path.localeCompare(right.path));

manifest.genericTooling.files = [
  "scripts/lib/shopify-filter-metafield-csv.mjs",
  "scripts/shopify-filter-metafield-csv.test.mjs",
]
  .map((relativePath) => entryFor(path.join(appRoot, relativePath)))
  .sort((left, right) => left.path.localeCompare(right.path));

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(
  `Updated migration manifest for ${manifest.files.length} runtime files and ${manifest.genericTooling.files.length} generic tooling files.`,
);
