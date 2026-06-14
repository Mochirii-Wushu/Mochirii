import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const root = process.cwd();
const privateDenylistPath = resolve(root, process.env.MOCHI_SOCIAL_SITE_CLEAN_ROOM_DENYLIST_PATH || ".local/mochi-social-clean-room-denylist.txt");
const privateTerms = unique([
  ...splitTerms(process.env.MOCHI_SOCIAL_SITE_CLEAN_ROOM_DENYLIST || ""),
  ...(existsSync(privateDenylistPath) ? splitTerms(readFileSync(privateDenylistPath, "utf8")) : [])
]);

const builtInFingerprints = [
  { id: "built-in-001", tokenCount: 1, hash: "85b52674ac07aa121ea4be22d1df2162ee243856164d4e9e45784d5f987b2d1a" },
  { id: "built-in-002", tokenCount: 1, hash: "3100486406b39efc3f3d3565bc97cc3b9e2d7b6e3427b194f4442ef4beb05b41" },
  { id: "built-in-003", tokenCount: 1, hash: "cfe1ad9ec0024032ab6debc6a6e5d20b65893273e9731dc00033fdd02bca93b1" },
  { id: "built-in-004", tokenCount: 1, hash: "a4c745facd3a921565e2c12d2db6a4021d4764f633a18400634d68df575ffb35" },
  { id: "built-in-005", tokenCount: 2, hash: "5333301f3bff77fcb44b3ff51774dfd5b91eb8e9debd2bb31324b2cf4a756b15" },
  { id: "built-in-006", tokenCount: 2, hash: "9d75e9f3c105291242d7ba17fb773791ed112057ffbf68a960b3de37bdff4d35" },
  { id: "built-in-007", tokenCount: 2, hash: "179eb733ffba30ec704b5da48625f80d723b681333192d59f129ef7e72eb32e1" },
  { id: "built-in-008", tokenCount: 2, hash: "c6d1665178883aad5322b48cb11c05f4cb190949ac5842aa59521d3e7fc3f516" },
  { id: "built-in-009", tokenCount: 2, hash: "529f4ca28d278bc42bab6d0e56c07ea4a323d5848cf22d31f920913693b69022" },
  { id: "built-in-010", tokenCount: 2, hash: "a7387e2573cf5571f784d5560e187d51102253d1404d07ea42d6b033c28af62c" },
  { id: "built-in-011", tokenCount: 2, hash: "9e7cb753be0b237a5a93048af258c6b6d7566bae99f23864a08d0cc2804e0b6d" },
  { id: "built-in-012", tokenCount: 3, hash: "99b5a72e57abaf28e5242346a15c5f6bab393f868367e51c2d4282ad94ba1bc0" },
  { id: "built-in-013", tokenCount: 1, hash: "0d8752a61b20fa2c6fbd818ef8e016c58a248edb9e715ce99b5d3523d419d824" },
  { id: "built-in-014", tokenCount: 2, hash: "03075094f9c64fb17f783e192c3267479ae75c2a9d837f11ea76754a0776f3fa" },
  { id: "built-in-015", tokenCount: 2, hash: "3334cf2a579fd02a8d341ada48f8ae77fe6730fcd039da33cf50c8e7e0d8a8ca" },
  { id: "built-in-016", tokenCount: 2, hash: "6401601aa08eb2bd4867ac531c5d6fb0767cda9b7f17eec3269dc0e62feb30a0" },
  { id: "built-in-017", tokenCount: 3, hash: "16d4258ee0d298171c47a6b6d0216475d7041f8d649c357635a55236a0b3eba9" },
  { id: "built-in-018", tokenCount: 2, hash: "6a6418ade7b13322819e3daa62cc67aab2e03c72f9643bf7b17c976896fe4cd6" },
  { id: "built-in-019", tokenCount: 2, hash: "42e0f38cdc948ccf652e7eac78a4ed3b0e330f3ca14d8b2ff5a66e23750dbe77" },
  { id: "built-in-020", tokenCount: 3, hash: "29e1f5a83d3865675c00dcc9eff32b7e6679339717756e79f8bdc9af9f80e841" }
];

const ignoredDirectories = new Set([".git", ".local", ".next", ".vercel", "coverage", "dist", "node_modules", "out", "reports"]);
const textExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".sql", ".toml", ".ts", ".tsx", ".txt", ".yaml", ".yml"]);
const failures = [];
const scanned = [];

if (privateTerms.length === 0) {
  console.log(`Mochi Social site clean-room scan using built-in fingerprints only. Optional private denylist not found at ${pathForReport(privateDenylistPath)}.`);
}

scanDirectory(root);

if (failures.length) {
  console.error("Mochi Social site clean-room scan failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Mochi Social site clean-room scan passed (${scanned.length} text file(s) checked).`);

function scanDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) scanDirectory(fullPath);
      continue;
    }
    if (entry.isFile() && shouldScan(fullPath)) scanFile(fullPath);
  }
}

function scanFile(file) {
  const text = readFileSync(file, "utf8");
  scanned.push(file);

  const lower = text.toLowerCase();
  for (const term of privateTerms) {
    if (term && lower.includes(term.toLowerCase())) {
      failures.push(`${pathForReport(file)} matches a private clean-room denylist literal.`);
    }
  }

  const tokens = tokenize(text);
  for (const [tokenCount, entries] of groupFingerprintsByCount()) {
    if (tokens.length < tokenCount) continue;
    for (let index = 0; index <= tokens.length - tokenCount; index += 1) {
      const hash = sha256(tokens.slice(index, index + tokenCount).join(" "));
      const match = entries.find((entry) => entry.hash === hash);
      if (match) failures.push(`${pathForReport(file)} matches clean-room fingerprint ${match.id}.`);
    }
  }
}

function groupFingerprintsByCount() {
  const groups = new Map();
  for (const entry of builtInFingerprints) {
    const entries = groups.get(entry.tokenCount) || [];
    entries.push(entry);
    groups.set(entry.tokenCount, entries);
  }
  return groups;
}

function shouldScan(file) {
  const rel = pathForReport(file);
  if (rel === "package-lock.json") return false;
  if (statSync(file).size > 2_000_000) return false;
  return textExtensions.has(extname(file));
}

function tokenize(value) {
  return String(value || "").toLowerCase().match(/[a-z0-9_]+/g) || [];
}

function splitTerms(value) {
  return String(value || "")
    .split(/\r?\n|,/)
    .map((term) => term.trim())
    .filter((term) => term && !term.startsWith("#"));
}

function unique(values) {
  return Array.from(new Set(values));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function pathForReport(file) {
  return relative(root, file).replace(/\\/g, "/");
}
