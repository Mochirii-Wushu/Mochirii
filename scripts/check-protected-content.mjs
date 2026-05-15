import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const baselinePath = path.join(root, "scripts/protected-content-baseline.json");

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashValue(value) {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function resolvePath(data, fieldPath) {
  return fieldPath.reduce((current, key) => {
    if (current && Object.prototype.hasOwnProperty.call(current, key)) return current[key];
    return undefined;
  }, data);
}

const baseline = readJson(path.relative(root, baselinePath));
const fields = Array.isArray(baseline?.fields) ? baseline.fields : [];

if (baseline?.algorithm !== "sha256" || baseline?.serialization !== "stable-json-v1") {
  console.error("Protected content baseline must use sha256 and stable-json-v1.");
  process.exit(1);
}

if (!fields.length) {
  console.error("Protected content baseline has no fields.");
  process.exit(1);
}

const failures = [];

for (const field of fields) {
  const id = String(field?.id || "");
  const file = String(field?.file || "");
  const fieldPath = Array.isArray(field?.path) ? field.path : [];
  const expected = String(field?.sha256 || "");

  if (!id || !file || !fieldPath.length || !expected) {
    failures.push(`${id || "(missing id)"}: baseline entry is incomplete.`);
    continue;
  }

  let data;
  try {
    data = readJson(file);
  } catch (error) {
    failures.push(`${id}: unable to read ${file}: ${error.message}`);
    continue;
  }

  const value = resolvePath(data, fieldPath);
  if (typeof value === "undefined") {
    failures.push(`${id}: protected field path is missing: ${file} ${fieldPath.join(".")}`);
    continue;
  }

  const actual = hashValue(value);
  if (actual !== expected) {
    failures.push(`${id}: protected content hash mismatch for ${file} ${fieldPath.join(".")} (expected ${expected}, got ${actual})`);
  }
}

if (failures.length) {
  console.error("Protected content validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error("If this was an intentional protected-copy change, update the baseline in a dedicated approved branch.");
  process.exit(1);
}

console.log(`Protected content OK (${fields.length} fields).`);
