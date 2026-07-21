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

const textExtensions = new Set([".css", ".js", ".json", ".liquid", ".md"]);

function contentForDigest(absolute) {
  const content = readFileSync(absolute);
  if (!textExtensions.has(path.extname(absolute))) return content;
  return content.toString("utf8").replace(/\r\n?/gu, "\n");
}

function entryFor(absolute) {
  return {
    path: path.relative(repoRoot, absolute).split(path.sep).join("/"),
    sha256: createHash("sha256").update(contentForDigest(absolute)).digest("hex"),
  };
}

manifest.files = manifest.includedRoots
  .flatMap((root) => walk(path.join(appRoot, root)))
  .map(entryFor)
  .sort((left, right) => left.path.localeCompare(right.path));

manifest.genericTooling.files = [
  "scripts/lib/shopify-filter-metafield-csv.mjs",
  "scripts/lib/shopify-product-copy-csv.mjs",
  "scripts/shopify-filter-metafield-csv.test.mjs",
  "scripts/shopify-product-copy-csv.test.mjs",
]
  .map((relativePath) => entryFor(path.join(appRoot, relativePath)))
  .sort((left, right) => left.path.localeCompare(right.path));

manifest.approvedPublicCopy.files = ["content/approved-customer-copy.json"]
  .map((relativePath) => entryFor(path.join(appRoot, relativePath)));

manifest.publicLaunchContracts.files = [
  "content/launch-pages.v1.json",
  "content/launch-pages.v1.schema.json",
  "content/mandatory-name-exceptions.v1.json",
  "content/mandatory-name-exceptions.v1.schema.json",
  "content/product-facts.v3.json",
  "content/product-facts.v3.schema.json",
  "content/provider-surfaces.v1.json",
  "content/provider-surfaces.v1.schema.json",
  "content/storefront-search-expectations.v1.json",
  "content/storefront-search-expectations.v1.schema.json",
]
  .map((relativePath) => entryFor(path.join(appRoot, relativePath)))
  .sort((left, right) => left.path.localeCompare(right.path));

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(
  `Updated migration manifest for ${manifest.files.length} runtime files, ${manifest.genericTooling.files.length} generic tooling files, ${manifest.approvedPublicCopy.files.length} approved public-copy file, and ${manifest.publicLaunchContracts.files.length} public launch-contract files.`,
);
