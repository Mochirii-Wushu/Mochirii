import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has("--write") || process.env.MOCHI_SOCIAL_FLY_EVIDENCE_WRITE === "true";
const docPath = resolve(root, "docs/mochi-social-fly-release-evidence.md");
const reportJsonPath = resolve(root, "reports/mochi-social-fly-release-evidence.json");
const reportMdPath = resolve(root, "reports/mochi-social-fly-release-evidence.md");
const checkedAt = new Date().toISOString();
const failures = [];
const warnings = [];

const requiredFiles = [
  "docs/mochi-social-fly-release-evidence.md",
  "docs/mochi-social-alpha.md",
  "docs/mochi-social-alpha-codex-ops.md",
  "docs/mochi-social-visual-polish.md",
  "scripts/check-mochi-social-game-contract.mjs",
  "scripts/check-mochi-social-preview-ready.mjs",
];

const requiredSources = [
  "fly.io/docs/flyctl/deploy",
  "fly.io/docs/launch/deploy",
  "fly.io/docs/reference/configuration",
  "fly.io/docs/reference/health-checks",
  "fly.io/docs/apps/app-availability",
  "vercel.com/docs/deployments",
  "vercel.com/docs/deployments/sharing-deployments",
  "docs.enjin.io/guides/platform/managing-users/using-fuel-tanks",
  "docs.enjin.io/getting-started/using-wallet-daemon",
];

const requiredTerms = [
  "no-secret evidence",
  "fly.toml",
  "/healthz",
  "MOCHI_SOCIAL_GAME_CONTRACT_URL",
  "MOCHI_SOCIAL_SITE_ORIGIN",
  "NEXT_PUBLIC_MOCHI_SOCIAL_URL",
  "configured-preview-stub",
  "no-real-value",
  "Enjin Canary",
  "Fuel Tank",
  "Wallet Daemon",
  "cENJ",
  "no funded-chain rollback",
  "no provider mutation",
  "rollback owner",
  "health check",
  "access-token-only",
  "no cashout",
  "no auctions",
  "curated UGC",
];

const requiredGameCommands = [
  "npm ci",
  "npm run secret-scan",
  "npm run alpha:local-suite",
  "npm run alpha:local-evidence",
  "npm run alpha:operator-checklist",
  "npm run alpha:report-hygiene",
  "npm run typecheck",
  "npm run lint",
  "npm test",
  "npm run build",
  "git diff --check",
];

const requiredWebsiteCommands = [
  "npm run check:mochi-social-alpha",
  "npm run check:mochi-social-bridge-state",
  "npm run check:mochi-social-auth-bridge",
  "npm run check:mochi-social-edge-authority",
  "npm run check:mochi-social-preview-key-loader",
  "npm run check:mochi-social-discord-oauth",
  "npm run check:mochi-social-game-contract",
  "npm run check:mochi-social-report-hygiene",
];

const doc = readRequired("docs/mochi-social-fly-release-evidence.md");
const packageJson = readJson("package.json");
const checkAll = readRequired("scripts/check-all.mjs");
const gameContract = readRequired("scripts/check-mochi-social-game-contract.mjs");

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) failures.push(`missing required context file: ${file}`);
}

for (const source of requiredSources) assertIncludes("Fly evidence runbook", doc, source);
for (const term of requiredTerms) assertIncludes("Fly evidence runbook", doc, term);
for (const command of requiredGameCommands) assertIncludes("Fly evidence runbook", doc, command);
for (const command of requiredWebsiteCommands) assertIncludes("Fly evidence runbook", doc, command);

[
  "/healthz",
  "/integration/game-manifest.json",
  "/integration/alpha/status",
  "/embed",
  "access-token-only",
  "configured-preview-stub",
  "no-real-value",
  "CANARY",
  "cashout",
  "auctions",
].forEach((snippet) => assertIncludes("game contract checker", gameContract, snippet));

if (!packageJson?.scripts?.["check:mochi-social-fly-evidence"]) {
  failures.push("package.json missing check:mochi-social-fly-evidence script.");
}

if (!checkAll.includes('["check:mochi-social-fly-evidence", ["node", "scripts/check-mochi-social-fly-evidence.mjs"]]')) {
  failures.push("scripts/check-all.mjs does not run check:mochi-social-fly-evidence.");
}

const flyDeployLines = doc
  .split(/\r?\n/)
  .map((line, index) => ({ line, number: index + 1 }))
  .filter(({ line }) => line.trim() === "fly deploy");
const approvedHeadingLine = doc
  .split(/\r?\n/)
  .findIndex((line) => line.trim() === "## Approved Hosted Actions") + 1;
for (const { line, number } of flyDeployLines) {
  if (!approvedHeadingLine || number < approvedHeadingLine) {
    failures.push(`line ${number}: fly deploy must appear only after the approval-gated hosted actions section.`);
  }
}

const forbiddenReportPatterns = [
  { label: "provider mutation performed yes", pattern: /Provider mutation performed:\s*yes/i },
  { label: "secret capture allowed", pattern: /record .*secret value/i },
  { label: "funded-chain green by default", pattern: /funded-chain gates (?:are|stay) green/i },
];
for (const { label, pattern } of forbiddenReportPatterns) {
  pattern.lastIndex = 0;
  if (pattern.test(doc)) failures.push(`Fly evidence runbook contains forbidden posture: ${label}`);
}

const report = {
  ok: failures.length === 0,
  checkedAt,
  scope:
    "Mochirii website-side Fly release evidence guard for Mochi Social. This report is no-secret and static; it does not contact Fly, Vercel, Supabase, Discord, or Enjin.",
  docs: {
    runbook: pathForReport(docPath),
    requiredFiles: requiredFiles.map((file) => ({
      file,
      present: existsSync(resolve(root, file)),
    })),
  },
  sourceCount: requiredSources.length,
  gamePreDeployCommands: requiredGameCommands,
  websiteAcceptanceCommands: requiredWebsiteCommands,
  warnings,
  failures,
};

const markdown = renderMarkdown(report);
scanRenderedArtifact("json", JSON.stringify(report));
scanRenderedArtifact("markdown", markdown);
report.ok = failures.length === 0;

if (writeReport) {
  mkdirSync(dirname(reportJsonPath), { recursive: true });
  writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(reportMdPath, renderMarkdown(report), "utf8");
}

if (!report.ok) {
  console.error("Mochi Social Fly evidence validation failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Mochi Social Fly evidence validation OK.");
console.log(`- Official sources: ${requiredSources.length}`);
console.log(`- Game pre-deploy commands: ${requiredGameCommands.length}`);
console.log(`- Website acceptance commands: ${requiredWebsiteCommands.length}`);
if (writeReport) {
  console.log(`- JSON report: ${pathForReport(reportJsonPath)}`);
  console.log(`- Markdown report: ${pathForReport(reportMdPath)}`);
}

function readRequired(file) {
  const full = resolve(root, file);
  if (!existsSync(full)) {
    failures.push(`missing required file: ${file}`);
    return "";
  }
  return readFileSync(full, "utf8");
}

function readJson(file) {
  const text = readRequired(file);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    failures.push(`${file} is not valid JSON: ${error?.message || error}`);
    return null;
  }
}

function assertIncludes(label, text, snippet) {
  if (!String(text || "").includes(snippet)) failures.push(`${label}: expected snippet not found: ${snippet}`);
}

function renderMarkdown(data) {
  const fileRows = data.docs.requiredFiles
    .map((entry) => `| ${entry.file} | ${entry.present ? "present" : "missing"} |`)
    .join("\n");
  const gameRows = data.gamePreDeployCommands.map((command) => `| \`${command}\` | game repo pre-deploy |`).join("\n");
  const websiteRows = data.websiteAcceptanceCommands.map((command) => `| \`${command}\` | website-side acceptance |`).join("\n");
  const warningsText = data.warnings.length ? data.warnings.map((warning) => `- ${warning}`).join("\n") : "- None";
  const failuresText = data.failures.length ? data.failures.map((failure) => `- ${failure}`).join("\n") : "- None";

  return `# Mochi Social Fly Release Evidence Report

Generated: ${data.checkedAt}

This file is intentionally no-secret. It validates the website-side Fly release evidence runbook for Mochi Social without contacting hosted providers.

## Result

- OK: ${data.ok ? "yes" : "no"}
- Runbook: ${data.docs.runbook}
- Official source links: ${data.sourceCount}
- Game pre-deploy commands: ${data.gamePreDeployCommands.length}
- Website acceptance commands: ${data.websiteAcceptanceCommands.length}

## Required Context Files

| File | State |
| --- | --- |
${fileRows}

## Game Repo Evidence Commands

| Command | Purpose |
| --- | --- |
${gameRows}

## Website Acceptance Commands

| Command | Purpose |
| --- | --- |
${websiteRows}

## Warnings

${warningsText}

## Failures

${failuresText}
`;
}

function scanRenderedArtifact(label, text) {
  for (const hit of scanText(text)) {
    failures.push(`rendered ${label} report contains forbidden secret-like material: ${hit}`);
  }
}

function scanText(text) {
  const forbiddenPatterns = [
    { label: "GitHub token", pattern: /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/ },
    { label: "Supabase secret key", pattern: /\bsb_secret_[A-Za-z0-9_-]{12,}\b/ },
    { label: "JWT-like token", pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/ },
    { label: "Discord bot token", pattern: /\b[A-Za-z0-9_-]{23,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{27,}\b/ },
    {
      label: "Discord webhook URL",
      pattern: /https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/,
    },
    { label: "Private key block", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/ },
    {
      label: "service-role assignment",
      pattern: /\b(?:SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY)\s*[:=]\s*["']?(?!<|REDACTED|redacted|not read|placeholder)[^\s"',]+/i,
    },
    {
      label: "Fly token assignment",
      pattern: /\b(?:FLY_API_TOKEN|FLY_ACCESS_TOKEN)\s*[:=]\s*["']?(?!<|REDACTED|redacted|placeholder)[^\s"',]+/i,
    },
    {
      label: "Enjin token assignment",
      pattern: /\bENJIN_PLATFORM_TOKEN\s*[:=]\s*["']?(?!<|REDACTED|redacted|placeholder)[^\s"',]+/i,
    },
    { label: "raw cookie header", pattern: /\bCookie:\s*[^;\s]+=/i },
  ];
  const hits = [];
  String(text || "")
    .split(/\r?\n/)
    .forEach((line, index) => {
      for (const { label: patternLabel, pattern } of forbiddenPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) hits.push(`line ${index + 1}: ${patternLabel}`);
      }
    });
  return hits;
}

function pathForReport(file) {
  return relative(root, resolve(root, file)).replace(/\\/g, "/");
}
