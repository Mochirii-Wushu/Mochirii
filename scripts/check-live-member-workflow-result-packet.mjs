import { existsSync, realpathSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = realpathSync(process.cwd());
const args = process.argv.slice(2);

function argValue(name) {
  const match = args.find((value) => value.startsWith(`${name}=`));
  return match ? match.split("=").slice(1).join("=") : "";
}

const packetPathArg = argValue("--packet") || process.env.LIVE_MEMBER_WORKFLOW_RESULT_PACKET;

const requiredHeadings = [
  "## Packet Metadata",
  "## D02 Evidence",
  "## D03 Evidence",
  "## Cleanup Evidence",
  "## Final Validation",
  "## Public Result Summary",
];

const privateValuePatterns = [
  { label: "email-like identifier", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { label: "UUID-like private identifier", pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i },
  { label: "Supabase secret key", pattern: /\bsb_secret_[A-Za-z0-9_-]{12,}\b/ },
  { label: "JWT-like token", pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/ },
  { label: "database URL", pattern: /\bpostgres(?:ql)?:\/\/[^\s<>)]+/i },
  { label: "Discord token", pattern: /\b[MN][A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{20,}\b/ },
  { label: "Discord webhook URL", pattern: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/[^\s<>)]+/i },
  { label: "signed Storage URL", pattern: /https?:\/\/[^\s<>)]+\/storage\/v1\/object\/sign\/[^\s<>)]+/i },
  { label: "private Storage object path", pattern: /\bmember-gallery\/[^\s<>)]+/i },
  { label: "access token assignment", pattern: /\b(?:access|refresh|bearer|service[_-]?role)[_-]?token\s*[:=]\s*\S{8,}/i },
  { label: "client secret assignment", pattern: /\bclient[_-]?secret\s*[:=]\s*\S{8,}/i },
  { label: "API credential assignment", pattern: /\b(?:api[_-]?key|api[_-]?token|cloudflare[_-]?token|vercel[_-]?token|github[_-]?token|pat)\s*[:=]\s*\S{8,}/i },
  { label: "password assignment", pattern: /\bpassword\s*[:=]\s*\S{8,}/i },
  { label: "session cookie assignment", pattern: /\b(?:cookie|session[_-]?cookie)\s*[:=]\s*\S{20,}/i },
];

const truthyPattern = /^(?:yes|y|true|pass|passed|complete|completed|confirmed|captured|ready|present|ok|healthy)$/i;
const passPattern = /^(?:pass|passed|yes|ok|confirmed|complete|completed)$/i;
const resultPattern = /^(?:READY|NO-GO)$/i;

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

function validatePacketLocation(packetPath) {
  if (!existsSync(packetPath)) fail("Live-member result packet path does not exist.");

  const absolute = realpathSync(packetPath);
  const relative = path.relative(root, absolute).split(path.sep).join("/");
  const insideRepo = relative && !relative.startsWith("..") && !path.isAbsolute(relative);

  if (!insideRepo) return absolute;

  const tracked = spawnSync("git", ["ls-files", "--error-unmatch", relative], { cwd: root, stdio: "ignore" }).status === 0;
  if (tracked) fail(`Completed live-member result packet is tracked in Git: ${relative}`);

  const ignored = spawnSync("git", ["check-ignore", "-q", relative], { cwd: root }).status === 0;
  if (!ignored) fail(`Completed live-member result packet inside the repo must be ignored by Git: ${relative}`);

  return absolute;
}

function validateNoPrivateValues(text) {
  const failures = [];

  text.split(/\r?\n/).forEach((line, index) => {
    for (const { label, pattern } of privateValuePatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) failures.push(`line ${index + 1}: ${label}`);
    }
  });

  if (failures.length) {
    fail(`Live-member result packet appears to contain private or secret values:\n- ${failures.join("\n- ")}`);
  }
}

function validateStructure(text) {
  const missing = requiredHeadings.filter((heading) => !text.includes(heading));
  if (missing.length) fail(`Live-member result packet is missing required sections: ${missing.join(", ")}.`);
}

function validateResult(fields) {
  const result = requireValue(fields, "Result").toUpperCase();
  if (!resultPattern.test(result)) fail("Result must be READY or NO-GO.");

  if (result === "NO-GO") {
    requireValue(fields, "No-go reason");
    requireValue(fields, "Next owner");
    requireValue(fields, "Current public surface remains");
    return result;
  }

  [
    "Packet prepared by",
    "Prepared at",
    "Test window",
    "Operator",
    "Communication channel",
  ].forEach((label) => requireValue(fields, label));

  [
    "D02 strict preflight passed",
    "Vercel production review URL healthy",
    "Supabase redirect plan confirmed",
    "Discord callback confirmed",
    "Unverified account checked",
    "Verified active member checked",
    "Moderator account checked",
    "No D02 mutation performed",
    "No credentials exposed",
    "Post-QA validation passed",
    "No private identifiers exposed",
    "Artifact identifiers kept in private operator note",
    "Ready for approval packet",
  ].forEach((label) => requireTruthy(fields, label));

  const d02 = requireValue(fields, "D02 live OAuth/account smoke");
  if (!passPattern.test(d02)) fail("D02 live OAuth/account smoke must be passed for READY.");

  const d03 = requireValue(fields, "D03 live upload/moderation smoke").toLowerCase();
  if (!["passed", "pass", "deferred"].includes(d03)) {
    fail("D03 live upload/moderation smoke must be passed or deferred for READY.");
  }

  if (d03 === "deferred") {
    requireValue(fields, "D03 deferral reason");
    requireValue(fields, "If deferred, rollback owner");
    requireTruthy(fields, "D03 deferral explicitly approved");
  } else {
    [
      "D03 mutation approval preflight passed",
      "One disposable upload only",
      "Pending item not public before moderation",
      "Moderator action completed",
      "Audit or moderation history checked",
      "Public gallery result verified",
    ].forEach((label) => requireTruthy(fields, label));

    const cleanup = requireValue(fields, "Cleanup status").toLowerCase();
    if (!["complete", "completed", "deferred by owner"].includes(cleanup)) {
      fail("Cleanup status must be complete or deferred by owner.");
    }

    if (cleanup === "deferred by owner") {
      requireValue(fields, "Cleanup owner");
    }
  }

  return result;
}

try {
  if (!packetPathArg) {
    fail("Provide a private completed live-member result packet with --packet=/absolute/path or LIVE_MEMBER_WORKFLOW_RESULT_PACKET.");
  }

  const packetPath = validatePacketLocation(packetPathArg);
  const text = readFileSync(packetPath, "utf8");

  validateNoPrivateValues(text);
  validateStructure(text);
  const fields = parseFields(text);
  const result = validateResult(fields);

  console.log(`Live-member workflow result packet check OK (${result}; values redacted).`);
} catch (error) {
  console.error(`Live-member workflow result packet check failed: ${error?.message || error}`);
  console.error("No packet values were printed. Keep completed result packets private and untracked.");
  process.exit(1);
}
