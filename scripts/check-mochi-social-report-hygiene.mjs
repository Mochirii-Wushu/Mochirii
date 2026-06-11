import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const root = process.cwd();
const credsDir = resolve(process.env.MOCHI_SOCIAL_CREDS_DIR || defaultCredsDir());
const reportPath = resolve(root, process.env.MOCHI_SOCIAL_SITE_REPORT_HYGIENE_JSON || "reports/mochi-social-report-hygiene.json");
const markdownPath = resolve(root, process.env.MOCHI_SOCIAL_SITE_REPORT_HYGIENE_MD || "reports/mochi-social-report-hygiene.md");
const checkedAt = new Date().toISOString();

const targets = [
  { label: "preview-ready-json", path: resolve(root, "reports/mochi-social-preview-ready.json"), required: false },
  { label: "preview-ready-md", path: resolve(root, "reports/mochi-social-preview-ready.md"), required: false },
  { label: "browser-gates-json", path: resolve(root, "reports/mochi-social-browser-gates.json"), required: false },
  { label: "browser-gates-md", path: resolve(root, "reports/mochi-social-browser-gates.md"), required: false },
  { label: "operator-handoff", path: resolve(credsDir, "mochirii-mochi-social-alpha-operator-next-steps.md"), required: false },
  { label: "preview-ready-handoff", path: resolve(credsDir, "mochirii-mochi-social-preview-ready.md"), required: false },
  { label: "browser-gates-handoff", path: resolve(credsDir, "mochirii-mochi-social-browser-gates.md"), required: false },
];

const forbiddenPatterns = [
  { label: "GitHub token", pattern: /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/ },
  { label: "Supabase secret key", pattern: /\bsb_secret_[A-Za-z0-9_-]{12,}\b/ },
  { label: "JWT-like token", pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/ },
  { label: "Discord bot token", pattern: /\b[A-Za-z0-9_-]{23,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{27,}\b/ },
  { label: "Discord webhook URL", pattern: /https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/ },
  { label: "Private key block", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/ },
  { label: "Supabase service-role assignment", pattern: /\bSUPABASE_SERVICE_ROLE_KEY\s*=\s*["']?(?!<|REDACTED|redacted|placeholder)[^\s"']+/i },
  { label: "Mochi Social game token assignment", pattern: /\bMOCHI_SOCIAL_GAME_SERVER_TOKEN\s*=\s*["']?(?!<|REDACTED|redacted|placeholder)[^\s"']+/i },
  { label: "Discord client secret assignment", pattern: /\bDISCORD_CLIENT_SECRET\s*=\s*["']?(?!<|REDACTED|redacted|placeholder)[^\s"']+/i },
  { label: "Discord bot token assignment", pattern: /\bDISCORD_BOT_TOKEN\s*=\s*["']?(?!<|REDACTED|redacted|placeholder)[^\s"']+/i },
  { label: "Enjin platform token assignment", pattern: /\bENJIN_PLATFORM_TOKEN\s*=\s*["']?(?!<|REDACTED|redacted|placeholder)[^\s"']+/i },
  { label: "Wallet daemon passphrase assignment", pattern: /\bKEY_PASS\s*=\s*["']?(?!<|REDACTED|redacted|placeholder)[^\s"']+/i },
  { label: "Wallet seed file reference", pattern: /\bwallet\.seed\b/i },
  { label: "Account email", pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/ },
];

const scanned = [];
const failures = [];
const missing = [];

for (const target of targets) {
  if (!existsSync(target.path)) {
    if (target.required) failures.push(`${target.label}: missing required no-secret artifact.`);
    else missing.push(target.label);
    continue;
  }
  const text = readFileSync(target.path, "utf8");
  const hits = scanText(text);
  scanned.push({ label: target.label, path: pathForReport(target.path), bytes: Buffer.byteLength(text), hits });
  for (const hit of hits) {
    failures.push(`${target.label}: ${hit}`);
  }
}

const report = {
  ok: failures.length === 0,
  checkedAt,
  scope: "Mochirii Mochi Social no-secret report hygiene. This scans ignored local reports and Desktop Creds handoff files for obvious secret material without printing values.",
  scanned: scanned.map((entry) => ({
    label: entry.label,
    path: entry.path,
    bytes: entry.bytes,
    hits: entry.hits.length,
  })),
  missingOptional: missing,
  failures,
};

const markdown = renderMarkdown(report);
await mkdir(dirname(reportPath), { recursive: true });
await mkdir(dirname(markdownPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(markdownPath, markdown, "utf8");

if (!report.ok) {
  console.error("Mochi Social report hygiene failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("No secret values were printed. Rotate any real exposed secret before continuing.");
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log(`Mochi Social report hygiene OK (${scanned.length} no-secret artifact(s) scanned).`);
console.log(`Report: ${reportPath}`);

function scanText(text) {
  const hits = [];
  const lines = String(text || "").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const { label, pattern } of forbiddenPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) hits.push(`line ${index + 1}: ${label}`);
    }
  });
  return hits;
}

function renderMarkdown(reportData) {
  const scannedRows = reportData.scanned
    .map((entry) => `| ${entry.label} | ${entry.path} | ${entry.hits} |`)
    .join("\n") || "| none | none | 0 |";
  const missingLines = reportData.missingOptional.length
    ? reportData.missingOptional.map((label) => `- ${label}`).join("\n")
    : "- None";
  const failureLines = reportData.failures.length
    ? reportData.failures.map((failure) => `- ${failure}`).join("\n")
    : "- None";
  return `# Mochi Social Report Hygiene

Generated: ${reportData.checkedAt}

This file is intentionally no-secret. It records only hygiene status for Mochi Social local reports and Desktop Creds handoff files.

## Result

- OK: ${reportData.ok ? "yes" : "no"}
- Scanned artifacts: ${reportData.scanned.length}

## Scanned

| Artifact | Path | Secret hits |
| --- | --- | --- |
${scannedRows}

## Missing Optional Artifacts

${missingLines}

## Failures

${failureLines}
`;
}

function pathForReport(file) {
  const normalized = file.replace(/\\/g, "/");
  const normalizedRoot = root.replace(/\\/g, "/");
  const normalizedCreds = credsDir.replace(/\\/g, "/");
  if (normalized.startsWith(`${normalizedRoot}/`)) return normalized.slice(normalizedRoot.length + 1);
  if (normalized.startsWith(`${normalizedCreds}/`)) return normalized.slice(normalizedCreds.length + 1);
  return normalized;
}

function defaultCredsDir() {
  if (process.env.USERPROFILE) return join(process.env.USERPROFILE, "Desktop", "Creds");
  if (process.env.HOME) return join(process.env.HOME, "Desktop", "Creds");
  return join(root, ".local", "creds");
}
