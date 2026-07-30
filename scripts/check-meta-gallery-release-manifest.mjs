import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, posix, relative, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const manifestPath = join(
  repositoryRoot,
  "docs",
  "operations",
  "META-GALLERY-PUBLISHING-RELEASE-MANIFEST-2026-07-29.json",
);
const migrationsDirectory = join(repositoryRoot, "supabase", "migrations");
const sha256Pattern = /^[a-f0-9]{64}$/u;
const expectedReleasePaths = [
  "supabase/migrations/20260728130000_add_gallery_public_feed_v2.sql",
  "supabase/migrations/20260728132000_add_gallery_publication_revisions.sql",
  "supabase/migrations/20260729042835_add_facebook_page_gallery_publishing.sql",
  "supabase/migrations/20260729054645_harden_instagram_gallery_publishing.sql",
  "supabase/migrations/20260729062000_add_sanitized_social_derivatives.sql",
  "supabase/migrations/20260729064000_enforce_social_publish_claim_consent.sql",
  "supabase/migrations/20260729064500_reassert_facebook_publish_claim_scope.sql",
  "supabase/migrations/20260729065000_enforce_instagram_consent_contract_handshake.sql",
  "supabase/migrations/20260729070000_bind_social_derivatives_to_consent_source.sql",
  "supabase/migrations/20260729071000_allow_audited_instagram_legacy_reconciliation.sql",
  "supabase/migrations/20260729071146_enforce_facebook_consent_contract_and_permalink_integrity.sql",
  "supabase/migrations/20260729072000_randomize_social_derivative_paths_and_reduce_facebook_privileges.sql",
  "supabase/migrations/20260729224212_add_gallery_social_consent_withdrawal.sql",
];

function fail(message) {
  console.error(`Meta Gallery release manifest check failed: ${message}`);
  process.exit(1);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

if (!existsSync(manifestPath)) {
  fail("the immutable release manifest is missing");
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (error) {
  fail(`the release manifest is not valid JSON: ${error.message}`);
}

if (manifest.schemaVersion !== 1) {
  fail("schemaVersion must be 1");
}

if (!Array.isArray(manifest.migrations) || manifest.migrations.length !== 13) {
  fail("the focused release must contain exactly 13 migrations");
}

const declaredPaths = manifest.migrations.map((entry) => entry.path);

if (JSON.stringify(declaredPaths) !== JSON.stringify(expectedReleasePaths)) {
  fail("the declared migration allowlist does not match the reviewed ordered release set");
}

const baseMigrationPath = join(migrationsDirectory, manifest.baseMigration ?? "");
if (
  typeof manifest.baseMigration !== "string" ||
  !/^\d{14}_.+\.sql$/u.test(manifest.baseMigration) ||
  !existsSync(baseMigrationPath)
) {
  fail("the declared base migration is missing or invalid");
}

const finalReleaseMigration = posix.basename(expectedReleasePaths.at(-1));
if (
  manifest.releaseMigrationCeiling !== finalReleaseMigration ||
  manifest.generatedMigration !== finalReleaseMigration
) {
  fail("the CLI-generated final migration is not the release ceiling");
}

const seen = new Set();
const canonicalLines = [];

for (const entry of manifest.migrations) {
  if (
    typeof entry?.path !== "string" ||
    !entry.path.startsWith("supabase/migrations/") ||
    entry.path !== posix.normalize(entry.path) ||
    seen.has(entry.path)
  ) {
    fail(`invalid or duplicate migration path: ${String(entry?.path)}`);
  }
  seen.add(entry.path);

  if (typeof entry.sha256 !== "string" || !sha256Pattern.test(entry.sha256)) {
    fail(`invalid SHA-256 for ${entry.path}`);
  }

  const absolutePath = resolve(repositoryRoot, ...entry.path.split("/"));
  const relativePath = relative(repositoryRoot, absolutePath).replaceAll("\\", "/");
  if (relativePath !== entry.path || !existsSync(absolutePath)) {
    fail(`migration path escapes the repository or is missing: ${entry.path}`);
  }

  const actualHash = sha256(readFileSync(absolutePath));
  if (actualHash !== entry.sha256) {
    fail(`migration hash mismatch: ${entry.path}`);
  }

  canonicalLines.push(`${entry.path}\t${entry.sha256}`);
}

const manifestHash = sha256(canonicalLines.join("\n"));
if (!sha256Pattern.test(manifest.manifestSha256 ?? "")) {
  fail("manifestSha256 is missing or invalid");
}
if (manifestHash !== manifest.manifestSha256) {
  fail("manifestSha256 does not match the canonical migration allowlist");
}

console.log(
  `Meta Gallery release manifest OK: ${manifest.migrations.length} migrations, SHA-256 ${manifestHash}`,
);
