import { existsSync, realpathSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = realpathSync(process.cwd());
const args = process.argv.slice(2);

function argValue(name) {
  const match = args.find((value) => value.startsWith(`${name}=`));
  return match ? match.split("=").slice(1).join("=") : "";
}

const notePathArg = argValue("--note") || process.env.LIVE_MEMBER_CLEANUP_NOTE;

const requiredHeadings = [
  "## Metadata",
  "## Approval Boundary",
  "## D03 Artifact Identifiers",
  "## Moderation Decision",
  "## Cleanup Action",
  "## Cleanup Verification",
  "## Public Status To Copy Elsewhere",
  "## Stop Or Rollback Notes",
];

const secretValuePatterns = [
  { label: "Supabase secret key", pattern: /\bsb_secret_[A-Za-z0-9_-]{12,}\b/ },
  { label: "JWT-like token", pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/ },
  { label: "database URL", pattern: /\bpostgres(?:ql)?:\/\/[^\s<>)]+/i },
  { label: "Discord token", pattern: /\b[MN][A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{20,}\b/ },
  { label: "Discord webhook URL", pattern: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/[^\s<>)]+/i },
  { label: "signed Storage URL", pattern: /https?:\/\/[^\s<>)]+\/storage\/v1\/object\/sign\/[^\s<>)]+/i },
  { label: "access token assignment", pattern: /\b(?:access|refresh|bearer|service[_-]?role)[_-]?token\s*[:=]\s*\S{8,}/i },
  { label: "client secret assignment", pattern: /\bclient[_-]?secret\s*[:=]\s*\S{8,}/i },
  { label: "API credential assignment", pattern: /\b(?:api[_-]?key|api[_-]?token|cloudflare[_-]?token|vercel[_-]?token|github[_-]?token|pat)\s*[:=]\s*\S{8,}/i },
  { label: "password assignment", pattern: /\bpassword\s*[:=]\s*\S{8,}/i },
  { label: "session cookie assignment", pattern: /\b(?:cookie|session[_-]?cookie)\s*[:=]\s*\S{20,}/i },
];

const truthyPattern = /^(?:yes|y|true|pass|passed|complete|completed|confirmed|captured|ready|present|ok|healthy)$/i;
const cleanupStatusPattern = /^(?:complete|completed|deferred by owner)$/i;

function fail(message) {
  throw new Error(message);
}

function normalizeLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseFields(text) {
  const fields = new Map();

  text.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([^:#`][^:]{1,180}):\s*(.*)$/);
    if (!match) return;

    const label = normalizeLabel(match[1]);
    const value = match[2].trim();
    if (!fields.has(label)) fields.set(label, []);
    fields.get(label).push(value);
  });

  return fields;
}

function fieldValue(fields, label) {
  return (fields.get(normalizeLabel(label)) || []).find((value) => value.trim()) || "";
}

function requireValue(fields, label) {
  const value = fieldValue(fields, label);
  if (!value) fail(`Missing completed field: ${label}.`);
  return value;
}

function requireTruthy(fields, label) {
  const value = requireValue(fields, label);
  if (!truthyPattern.test(value)) {
    fail(`${label} must be an affirmative status such as passed, confirmed, ready, complete, or yes.`);
  }
  return value;
}

function validateNoteLocation(notePath) {
  if (!existsSync(notePath)) fail("Live-member cleanup note path does not exist.");

  const absolute = realpathSync(notePath);
  const relative = path.relative(root, absolute).split(path.sep).join("/");
  const insideRepo = relative && !relative.startsWith("..") && !path.isAbsolute(relative);

  if (!insideRepo) return absolute;

  const tracked = spawnSync("git", ["ls-files", "--error-unmatch", relative], { cwd: root, stdio: "ignore" }).status === 0;
  if (tracked) fail(`Completed live-member cleanup note is tracked in Git: ${relative}`);

  const ignored = spawnSync("git", ["check-ignore", "-q", relative], { cwd: root }).status === 0;
  if (!ignored) fail(`Completed live-member cleanup note inside the repo must be ignored by Git: ${relative}`);

  return absolute;
}

function validateNoSecrets(text) {
  const failures = [];

  text.split(/\r?\n/).forEach((line, index) => {
    for (const { label, pattern } of secretValuePatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) failures.push(`line ${index + 1}: ${label}`);
    }
  });

  if (failures.length) {
    fail(`Live-member cleanup note appears to contain secret values:\n- ${failures.join("\n- ")}`);
  }
}

function validateStructure(text) {
  const missing = requiredHeadings.filter((heading) => !text.includes(heading));
  if (missing.length) fail(`Live-member cleanup note is missing required sections: ${missing.join(", ")}.`);
}

function validateCompletedNote(fields) {
  [
    "Prepared by",
    "Prepared at",
    "Test window",
    "Operator",
    "Communication channel",
    "Runbook section",
    "Submission ID",
    "Storage bucket",
    "Storage object path",
    "Local image marker",
    "Title marker",
    "Caption marker",
    "Upload timestamp",
    "Moderation timestamp",
    "Approved moderation decision",
    "Cleanup owner",
    "Moderator account label",
    "Decision performed",
    "Public result",
    "Cleanup action performed",
    "Storage object removed or retained safely",
    "Database row removed, rejected, or retained safely",
    "Approved-feed visibility after cleanup",
    "D03 public status",
    "Cleanup public status",
    "Safe note for result packet",
  ].forEach((label) => requireValue(fields, label));

  [
    "D02 completed before D03",
    "Explicit D03 mutation approval",
    "QA_ALLOW_LIVE_MUTATION reviewed locally",
    "One disposable upload only",
    "Pending item confirmed not public before moderation",
    "Queue or audit state checked",
    "Public approved feed checked",
    "Post-cleanup Gallery route checked",
    "Post-cleanup approved feed checked",
    "Post-cleanup leader queue checked",
    "No unrelated artifacts changed",
    "No private identifiers copied into public docs",
  ].forEach((label) => requireTruthy(fields, label));

  const cleanupStatus = requireValue(fields, "Cleanup status").toLowerCase();
  if (!cleanupStatusPattern.test(cleanupStatus)) {
    fail("Cleanup status must be complete or deferred by owner.");
  }

  if (cleanupStatus === "deferred by owner") {
    [
      "Cleanup deferral owner",
      "Cleanup deferral reason",
      "Cleanup follow-up date",
    ].forEach((label) => requireValue(fields, label));
  }

  return cleanupStatus;
}

try {
  if (!notePathArg) {
    fail("Provide a private completed cleanup note with --note=/absolute/path or LIVE_MEMBER_CLEANUP_NOTE.");
  }

  const notePath = validateNoteLocation(notePathArg);
  const text = readFileSync(notePath, "utf8");

  validateNoSecrets(text);
  validateStructure(text);
  const fields = parseFields(text);
  const cleanupStatus = validateCompletedNote(fields);

  console.log(`Live-member cleanup note check OK (${cleanupStatus}; values redacted).`);
} catch (error) {
  console.error(`Live-member cleanup note check failed: ${error?.message || error}`);
  console.error("No note values were printed. Keep completed cleanup notes private and untracked.");
  process.exit(1);
}
