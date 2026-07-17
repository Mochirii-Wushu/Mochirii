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

if (manifest.schemaVersion !== 4) {
  failures.push("schemaVersion must be 4");
}
const migrationIdMatch = /^mochirii-shopify-theme-(?:import|reconciliation)-(\d{4}-\d{2}-\d{2})$/.exec(
  manifest.migrationId ?? "",
);
if (!migrationIdMatch) {
  failures.push("migrationId must be a non-provider operational label");
} else if (manifest.snapshotDate !== migrationIdMatch[1]) {
  failures.push("snapshotDate must match the migrationId date");
}
if (manifest.candidateStatus !== "sanitized-review-candidate-not-published") {
  failures.push("candidateStatus must remain fail-closed");
}
if (manifest.sourceState !== "sanitized-post-snapshot-main-reconciliation-with-deliberate-exclusions") {
  failures.push("sourceState must identify the post-snapshot source reconciliation and deliberate exclusions");
}
if (manifest.preservation?.status !== "verified-current-post-merge-snapshot-and-git-bundles" ||
    manifest.preservation?.currentSnapshotVerified !== true ||
    manifest.preservation?.sourceQuiescenceVerified !== true ||
    manifest.preservation?.encryptedArchiveRoundTripVerified !== true ||
    manifest.preservation?.gitBundlesVerified !== true ||
    manifest.preservation?.fullDisposableCloneRestorationTest !== "not-claimed" ||
    manifest.preservation?.sourceMayHaveChangedAfterReview !== true) {
  failures.push("preservation must record the verified post-merge snapshot and bundles without claiming a full disposable-clone restoration");
}
if (manifest.selection?.postSnapshotMainReconciled !== true ||
    manifest.selection?.privateDeltaPreservedExternally !== true ||
    manifest.selection?.intentionalSourceParity !== false) {
  failures.push("selection must record post-snapshot reconciliation private preservation and deliberate non-parity");
}
if (manifest.sourceReconciliation?.status !== "reviewed-through-post-snapshot-filter-hardening" ||
    manifest.sourceReconciliation?.recordedDate !== manifest.snapshotDate ||
    manifest.sourceReconciliation?.integrationState !== "clean-main-aligned-with-canonical-remote" ||
    manifest.sourceReconciliation?.runtimeWarningFallback !== "represented-with-stricter-fail-closed-copy" ||
    manifest.sourceReconciliation?.structuredFilterHelper !== "represented-as-sanitized-pure-exact-20-contract" ||
    manifest.sourceReconciliation?.privateContractOrchestration !== "excluded-and-replaced-by-public-release-safety-guards") {
  failures.push("sourceReconciliation must record the complete sanitized disposition of the post-snapshot integration");
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

const expectedRoots = [
  "assets",
  "blocks",
  "config",
  "layout",
  "locales",
  "sections",
  "snippets",
  "templates",
];
if (JSON.stringify(manifest.includedRoots) !== JSON.stringify(expectedRoots)) {
  failures.push("includedRoots must contain the complete reviewed runtime boundary in canonical order");
}

const actualFiles = expectedRoots
  .flatMap((root) => walk(path.join(appRoot, root)))
  .map(normalize)
  .sort();
const manifestFiles = manifest.files.map((entry) => entry.path).sort();

if (new Set(manifestFiles).size !== manifestFiles.length) {
  failures.push("manifest contains duplicate file paths");
}

const expectedGenericTooling = [
  "apps/shopify-theme/scripts/lib/shopify-filter-metafield-csv.mjs",
  "apps/shopify-theme/scripts/shopify-filter-metafield-csv.test.mjs",
];
const genericToolingFiles = manifest.genericTooling?.files ?? [];
if (manifest.genericTooling?.status !== "sanitized-pure-functions-only" ||
    JSON.stringify(genericToolingFiles.map((entry) => entry.path).sort()) !== JSON.stringify(expectedGenericTooling)) {
  failures.push("genericTooling must contain exactly the reviewed pure filter-metafield helper and its test");
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

for (const entry of genericToolingFiles) {
  if (!expectedGenericTooling.includes(entry.path) || !/^[0-9a-f]{64}$/.test(entry.sha256 ?? "")) {
    failures.push(`${entry.path}: invalid generic-tooling manifest entry`);
    continue;
  }
  const absolute = path.join(repoRoot, entry.path);
  const digest = createHash("sha256").update(readFileSync(absolute)).digest("hex");
  if (digest !== entry.sha256) {
    failures.push(`${entry.path}: generic-tooling SHA-256 mismatch`);
  }
}

if (failures.length) {
  console.error("Migration manifest check failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Migration manifest OK (${manifest.files.length} runtime files).`);
