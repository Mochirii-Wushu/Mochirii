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

const textExtensions = new Set([".css", ".js", ".json", ".liquid", ".md"]);

function contentForDigest(absolute) {
  const content = readFileSync(absolute);
  if (!textExtensions.has(path.extname(absolute))) return content;
  return content.toString("utf8").replace(/\r\n?/gu, "\n");
}

if (manifest.schemaVersion !== 7) {
  failures.push("schemaVersion must be 7");
}
const migrationIdMatch = /^mochirii-shopify-live-runtime-launch-completeness-v3-(\d{4}-\d{2}-\d{2})$/.exec(
  manifest.migrationId ?? "",
);
if (!migrationIdMatch) {
  failures.push("migrationId must be a non-provider operational label");
} else if (manifest.snapshotDate !== migrationIdMatch[1]) {
  failures.push("snapshotDate must match the migrationId date");
}
if (manifest.candidateStatus !== "checkout-disabled-local-source-not-staged-or-published") {
  failures.push("candidateStatus must identify checkout-disabled local source that is not staged or published");
}
if (manifest.sourceState !== "current-runtime-with-launch-completeness-v3-contracts-and-private-record-exclusions") {
  failures.push("sourceState must identify launch-completeness v3 contracts and private-record exclusions");
}
if (manifest.preservation?.status !== "verified-approved-copy-worktree-snapshot-and-git-bundles" ||
    manifest.preservation?.currentSnapshotVerified !== true ||
    manifest.preservation?.sourceQuiescenceVerified !== true ||
    manifest.preservation?.encryptedArchiveRoundTripVerified !== true ||
    manifest.preservation?.gitBundlesVerified !== true ||
    manifest.preservation?.fullDisposableCloneRestorationTest !== "not-claimed" ||
    manifest.preservation?.sourceMayHaveChangedAfterReview !== true) {
  failures.push("preservation must record the verified approved-copy worktree snapshot and bundles without claiming a full disposable-clone restoration");
}
if (manifest.selection?.postSnapshotMainReconciled !== true ||
    manifest.selection?.approvedCustomerCopyReconciled !== true ||
    manifest.selection?.privateDeltaPreservedExternally !== true ||
    manifest.selection?.intentionalSourceParity !== false) {
  failures.push("selection must record post-snapshot reconciliation private preservation and deliberate non-parity");
}
if (manifest.sourceReconciliation?.status !== "current-runtime-reconciled-launch-completeness-v3-source" ||
    manifest.sourceReconciliation?.recordedDate !== manifest.snapshotDate ||
    manifest.sourceReconciliation?.integrationState !== "checkout-disabled-local-source-not-staged-or-published" ||
    manifest.sourceReconciliation?.runtimeWarningPolicy !== "represented-as-label-matched-text-or-approved-omission" ||
    manifest.sourceReconciliation?.structuredFilterHelper !== "represented-as-sanitized-pure-exact-20-contract" ||
    manifest.sourceReconciliation?.approvedCustomerCopy !== "represented-as-content-only-versioned-customer-copy-v2-contract" ||
    manifest.sourceReconciliation?.providerWriteHistory !== "recorded-separately-as-applied-readback-with-consumed-approval" ||
    manifest.sourceReconciliation?.privateContractOrchestration !== "sanitized-public-validators-and-contracts-included-private-records-excluded") {
  failures.push("sourceReconciliation must record the complete sanitized disposition of the post-snapshot integration");
}
if (manifest.signature?.status !== "unsigned") {
  failures.push("signature status must truthfully remain unsigned until an approved identity signs it");
}
if (manifest.publicHistory?.status !== "reviewed-accepted-no-rewrite" ||
    manifest.publicHistory?.reviewedDate !== "2026-07-19" ||
    manifest.publicHistory?.disposition !== "existing public history accepted without rewriting") {
  failures.push("public history must record the reviewed no-rewrite disposition");
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
  "apps/shopify-theme/scripts/lib/shopify-product-copy-csv.mjs",
  "apps/shopify-theme/scripts/shopify-filter-metafield-csv.test.mjs",
  "apps/shopify-theme/scripts/shopify-product-copy-csv.test.mjs",
];
const genericToolingFiles = manifest.genericTooling?.files ?? [];
if (manifest.genericTooling?.status !== "sanitized-pure-functions-only" ||
    JSON.stringify(genericToolingFiles.map((entry) => entry.path).sort()) !== JSON.stringify(expectedGenericTooling)) {
  failures.push("genericTooling must contain exactly the reviewed pure filter-metafield and product-copy helpers and tests");
}

const expectedApprovedPublicCopy = [
  "apps/shopify-theme/content/approved-customer-copy.json",
];
const approvedPublicCopyFiles = manifest.approvedPublicCopy?.files ?? [];
if (manifest.approvedPublicCopy?.status !== "customer-copy-v2-content-locked-provider-write-applied" ||
    manifest.approvedPublicCopy?.sourceReview !== "https://github.com/Mochirii-Wushu/Mochirii/pull/459" ||
    manifest.approvedPublicCopy?.providerWriteHistory?.record !== "apps/shopify-theme/content/customer-facing-copy-approval-packet.md" ||
    manifest.approvedPublicCopy?.providerWriteHistory?.status !== "applied-readback-verified" ||
    manifest.approvedPublicCopy?.providerWriteHistory?.appliedDate !== "2026-07-18" ||
    manifest.approvedPublicCopy?.providerWriteHistory?.approvalReusable !== false ||
    manifest.approvedPublicCopy?.publicationAuthorized !== false ||
    manifest.approvedPublicCopy?.providerMutationAuthorized !== false ||
    manifest.approvedPublicCopy?.commerceAuthorized !== false ||
    JSON.stringify(approvedPublicCopyFiles.map((entry) => entry.path).sort()) !== JSON.stringify(expectedApprovedPublicCopy)) {
  failures.push("approvedPublicCopy must separate immutable content from consumed provider-write history and keep new mutation publication and commerce authority disabled");
}

const expectedPublicLaunchContracts = [
  "apps/shopify-theme/content/launch-pages.v1.json",
  "apps/shopify-theme/content/launch-pages.v1.schema.json",
  "apps/shopify-theme/content/mandatory-name-exceptions.v1.json",
  "apps/shopify-theme/content/mandatory-name-exceptions.v1.schema.json",
  "apps/shopify-theme/content/product-facts.v3.json",
  "apps/shopify-theme/content/product-facts.v3.schema.json",
  "apps/shopify-theme/content/provider-surfaces.v1.json",
  "apps/shopify-theme/content/provider-surfaces.v1.schema.json",
  "apps/shopify-theme/content/storefront-search-expectations.v1.json",
  "apps/shopify-theme/content/storefront-search-expectations.v1.schema.json",
];
const publicLaunchContractFiles = manifest.publicLaunchContracts?.files ?? [];
if (manifest.publicLaunchContracts?.status !== "sanitized-public-contracts-only-private-evidence-excluded" ||
    manifest.publicLaunchContracts?.prepaymentComplete !== false ||
    manifest.publicLaunchContracts?.providerMutationAuthorized !== false ||
    manifest.publicLaunchContracts?.paymentSetupAuthorized !== false ||
    manifest.publicLaunchContracts?.publicationAuthorized !== false ||
    JSON.stringify(publicLaunchContractFiles.map((entry) => entry.path).sort()) !== JSON.stringify(expectedPublicLaunchContracts)) {
  failures.push("publicLaunchContracts must contain only the reviewed sanitized public contracts and must not claim readiness or provider authority");
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
  const digest = createHash("sha256").update(contentForDigest(absolute)).digest("hex");
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
  const digest = createHash("sha256").update(contentForDigest(absolute)).digest("hex");
  if (digest !== entry.sha256) {
    failures.push(`${entry.path}: generic-tooling SHA-256 mismatch`);
  }
}

for (const entry of approvedPublicCopyFiles) {
  if (!expectedApprovedPublicCopy.includes(entry.path) || !/^[0-9a-f]{64}$/.test(entry.sha256 ?? "")) {
    failures.push(`${entry.path}: invalid approved-public-copy manifest entry`);
    continue;
  }
  const absolute = path.join(repoRoot, entry.path);
  const digest = createHash("sha256").update(contentForDigest(absolute)).digest("hex");
  if (digest !== entry.sha256) {
    failures.push(`${entry.path}: approved-public-copy SHA-256 mismatch`);
  }
}

for (const entry of publicLaunchContractFiles) {
  if (!expectedPublicLaunchContracts.includes(entry.path) || !/^[0-9a-f]{64}$/.test(entry.sha256 ?? "")) {
    failures.push(`${entry.path}: invalid public-launch-contract manifest entry`);
    continue;
  }
  const absolute = path.join(repoRoot, entry.path);
  const digest = createHash("sha256").update(contentForDigest(absolute)).digest("hex");
  if (digest !== entry.sha256) {
    failures.push(`${entry.path}: public-launch-contract SHA-256 mismatch`);
  }
}

if (failures.length) {
  console.error("Migration manifest check failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Migration manifest OK (${manifest.files.length} runtime files, ${genericToolingFiles.length} generic tooling files, ${approvedPublicCopyFiles.length} approved public-copy file, ${publicLaunchContractFiles.length} public launch-contract files).`);
