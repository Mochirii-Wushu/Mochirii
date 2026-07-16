import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const manifestPath = path.join(appRoot, "MIGRATION-MANIFEST.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const failures = [];

function normalize(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

if (manifest.schemaVersion !== 2) {
  failures.push("schemaVersion must be 2");
}
if (!/^mochirii-shopify-theme-import-\d{4}-\d{2}-\d{2}$/.test(manifest.migrationId ?? "")) {
  failures.push("migrationId must be a non-provider operational label");
}
if (manifest.candidateStatus !== "sanitized-review-candidate-not-published") {
  failures.push("candidateStatus must remain fail-closed");
}
if (manifest.preservation?.status !== "verified-point-in-time-not-current" ||
    manifest.preservation?.sourceMayHaveChangedAfterSeal !== true) {
  failures.push("preservation must be described as point-in-time and not current");
}
if (manifest.signature?.status !== "unsigned") {
  failures.push("signature status must truthfully remain unsigned until an approved identity signs it");
}
if (manifest.publicHistory?.status !== "not-rewritten-review-required") {
  failures.push("public history must remain an explicit unresolved review gate");
}

const serializedManifest = JSON.stringify(manifest);
for (const forbiddenKey of ["sourceCheckpoint", "receivingRepositoryBase"]) {
  if (Object.hasOwn(manifest, forbiddenKey) || serializedManifest.includes(`\"${forbiddenKey}\"`)) {
    failures.push(`${forbiddenKey} must not expose a private or receiving source reference`);
  }
}
if (/\b[0-9a-f]{40}\b/i.test(serializedManifest)) {
  failures.push("manifest must not contain raw Git object IDs");
}

const actualFiles = manifest.includedRoots
  .flatMap((root) => walk(path.join(appRoot, root)))
  .map(normalize)
  .sort();
const manifestFiles = manifest.files.map((entry) => entry.path).sort();

if (new Set(manifestFiles).size !== manifestFiles.length) {
  failures.push("manifest contains duplicate file paths");
}
if (JSON.stringify(actualFiles) !== JSON.stringify(manifestFiles)) {
  failures.push("manifest file set does not match the imported runtime roots");
}

for (const entry of manifest.files) {
  if (path.isAbsolute(entry.path) || entry.path.split("/").includes("..") || !entry.path.startsWith("apps/shopify-theme/")) {
    failures.push(`${entry.path}: unsafe manifest path`);
    continue;
  }
  const absolute = path.join(repoRoot, entry.path);
  if (!/^[0-9a-f]{64}$/.test(entry.sha256 ?? "")) {
    failures.push(`${entry.path}: sha256 must be a lowercase 64-character digest`);
    continue;
  }
  const digest = createHash("sha256").update(readFileSync(absolute)).digest("hex");
  if (digest !== entry.sha256) {
    failures.push(`${entry.path}: SHA-256 mismatch`);
  }
}

if (failures.length) {
  console.error("Migration manifest check failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Migration manifest OK (${manifest.files.length} runtime files).`);
