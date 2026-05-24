import { existsSync, realpathSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = realpathSync(process.cwd());
const args = process.argv.slice(2);

function argValue(name) {
  const match = args.find((value) => value.startsWith(`${name}=`));
  return match ? match.split("=").slice(1).join("=") : "";
}

const packetPathArg = argValue("--packet") || process.env.DNS_CUTOVER_APPROVAL_PACKET;

const requiredHeadings = [
  "## Packet Metadata",
  "## Required Same-Window Commands",
  "## Public State Evidence",
  "## Vercel Dashboard Evidence",
  "## Cloudflare Dashboard Evidence",
  "## Supabase Evidence",
  "## Discord Evidence",
  "## GitHub Pages Rollback Evidence",
  "## Go / No-Go Decision",
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

const truthyPattern = /^(?:yes|y|true|pass|passed|complete|confirmed|captured|ready|present|ok|healthy|go)$/i;
const passPattern = /^(?:pass|passed|yes|ok|confirmed|complete)$/i;
const decisionPattern = /^(?:GO|NO-GO)$/i;

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
    fail(`${label} must be an affirmative status such as passed, confirmed, captured, ready, or yes.`);
  }
  return value;
}

function validatePacketLocation(packetPath) {
  if (!existsSync(packetPath)) fail("Approval packet path does not exist.");

  const absolute = realpathSync(packetPath);
  const relative = path.relative(root, absolute).split(path.sep).join("/");
  const insideRepo = relative && !relative.startsWith("..") && !path.isAbsolute(relative);

  if (!insideRepo) return absolute;

  const tracked = spawnSync("git", ["ls-files", "--error-unmatch", relative], { cwd: root, stdio: "ignore" }).status === 0;
  if (tracked) fail(`Completed approval packet is tracked in Git: ${relative}`);

  const ignored = spawnSync("git", ["check-ignore", "-q", relative], { cwd: root }).status === 0;
  if (!ignored) fail(`Completed approval packet inside the repo must be ignored by Git: ${relative}`);

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
    fail(`Private packet appears to contain private or secret values:\n- ${failures.join("\n- ")}`);
  }
}

function validateStructure(text) {
  const missing = requiredHeadings.filter((heading) => !text.includes(heading));
  if (missing.length) fail(`Approval packet is missing required sections: ${missing.join(", ")}.`);
}

function validateDecision(fields) {
  const decision = requireValue(fields, "Decision").toUpperCase();
  if (!decisionPattern.test(decision)) fail("Decision must be GO or NO-GO.");

  if (decision === "NO-GO") {
    requireValue(fields, "No-go reason");
    requireValue(fields, "Next owner");
    requireValue(fields, "Current public surface remains");
    return decision;
  }

  const requiredGoFields = [
    "Packet prepared by",
    "Prepared at",
    "Approval meeting/window",
    "Cutover operator",
    "Rollback owner",
    "Communication channel",
  ];

  requiredGoFields.forEach((label) => requireValue(fields, label));

  [
    "Current custom domain still pre-cutover",
    "Vercel production review URL healthy",
    "Legacy .html redirects healthy",
    "GitHub Pages rollback files present",
    "Cloudflare nameservers still authoritative",
    "ProtonMail records preserved",
    "Known accepted warning only",
    "Production env names present",
    "Preview env names present",
    "Exact apex DNS instruction captured privately",
    "Exact www DNS instruction captured privately",
    "Mail records untouched",
    "Verification TXT records untouched",
    "Unrelated subdomains reviewed",
    "Rollback DNS records captured privately",
    "Redirect URLs include Vercel production/review URL",
    "Redirect URLs include exact custom-domain production paths",
    "Discord provider still enabled",
    "Edge Function secret names/freshness checked",
    "No raw secret values copied",
    "OAuth callback remains Supabase Auth callback",
    "No callback changed to Vercel/custom domain",
    "Bot/guild role assumptions still match the live-member QA runbook",
    "Tracked CNAME still present",
    "Root static files still present",
    "Rollback owner can restore DNS",
    "Same-window rehearsal and validation passed",
    "Vercel dashboard project and DNS instructions confirmed",
    "Cloudflare pre-change and rollback records captured",
    "Supabase Auth redirect plan confirmed",
    "Discord callback confirmed",
    "D02 passed",
    "D03 passed or explicitly deferred with rollback owner",
    "Live-member result packet validated",
    "Rollback owner and communication path confirmed",
    "No secrets, tokens, private Storage paths, signed URLs, or private account identifiers exposed",
  ].forEach((label) => requireTruthy(fields, label));

  const d02 = requireValue(fields, "D02 live OAuth/account smoke");
  if (!passPattern.test(d02)) fail("D02 live OAuth/account smoke must be passed for GO.");

  const d03 = requireValue(fields, "D03 live upload/moderation smoke").toLowerCase();
  if (!["passed", "pass", "deferred"].includes(d03)) {
    fail("D03 live upload/moderation smoke must be passed or deferred.");
  }

  if (d03 === "deferred") {
    requireValue(fields, "If deferred, rollback owner");
  }

  return decision;
}

try {
  if (!packetPathArg) {
    fail("Provide a private completed packet with --packet=/absolute/path or DNS_CUTOVER_APPROVAL_PACKET.");
  }

  const packetPath = validatePacketLocation(packetPathArg);
  const text = readFileSync(packetPath, "utf8");

  validateNoPrivateValues(text);
  validateStructure(text);
  const fields = parseFields(text);
  const decision = validateDecision(fields);

  console.log(`DNS cutover approval packet check OK (${decision}; values redacted).`);
} catch (error) {
  console.error(`DNS cutover approval packet check failed: ${error?.message || error}`);
  console.error("No packet values were printed. Keep completed packets private and untracked.");
  process.exit(1);
}
