import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has("--write") || process.env.COMMUNITY_HEALTH_SIGNALS_WRITE === "true";
const docPath = resolve(root, "docs/community-health-signals.md");
const reportJsonPath = resolve(root, "reports/community-health-signals.json");
const reportMdPath = resolve(root, "reports/community-health-signals.md");
const checkedAt = new Date().toISOString();
const failures = [];
const warnings = [];

const requiredFiles = [
  "docs/community-health-signals.md",
  "supabase/README.md",
  "docs/vote-reminder-runbook.md",
  "docs/member-workflow-production-qa-runbook.md",
  "docs/reaper-pending-verification-containment.md",
  "docs/mochi-social-alpha-codex-ops.md",
  "reports/full-stack-release-evidence.md",
];

const requiredTerms = [
  "aggregate",
  "no Discord message content",
  "no private conversations",
  "service-role",
  "RLS",
  "member_profiles",
  "discord_sync_log",
  "discord_resources",
  "gallery_submissions",
  "vote_confirmations",
  "vote_reminder_sends",
  "spotlight_poll_cycles",
  "spotlight_poll_candidates",
  "spotlight_poll_results",
  "discord_managed_permission_overwrites",
  "Mochi Social",
  "configured-preview-stub",
  "no real value",
  "funded-chain",
  "no provider mutation",
  "no public shaming",
  "redacted",
];

const requiredSources = [
  "support.discord.com/hc/en-us/articles/360032807371-Server-Insights-FAQ",
  "support.discord.com/hc/en-us/articles/11074987197975-Community-Onboarding-FAQ",
  "support.discord.com/hc/en-us/articles/1500000466882-Rules-Screening-FAQ",
  "support.discord.com/hc/en-us/articles/10989121220631-How-to-Protect-Your-Server-from-Raids-101",
  "supabase.com/docs/guides/database/postgres/row-level-security",
  "supabase.com/docs/guides/getting-started/api-keys",
  "supabase.com/docs/guides/functions/secrets",
  "w3.org/WAI/WCAG22/Understanding/status-messages.html",
];

const signals = [
  {
    id: "onboarding_completion",
    tables: ["member_profiles", "discord_sync_log"],
    stopLines: ["No raw Discord IDs", "no OAuth tokens"],
  },
  {
    id: "verified_conversion",
    tables: ["member_profiles", "discord_sync_log", "discord_managed_permission_overwrites"],
    stopLines: ["No public shaming", "no Discord apply from reporting"],
  },
  {
    id: "profile_setup",
    tables: ["member_profiles"],
    stopLines: ["No private profile media URLs"],
  },
  {
    id: "gallery_participation",
    tables: ["gallery_submissions", "gallery_moderation_events"],
    stopLines: ["No signed URLs", "no private Storage paths"],
  },
  {
    id: "event_heartbeat",
    tables: ["discord_resources", "discord_sync_log"],
    stopLines: ["No event mutation from report generation"],
  },
  {
    id: "vote_reminder_engagement",
    tables: ["vote_reminder_sends", "vote_confirmations"],
    stopLines: ["No vote-site automation", "no CAPTCHA bypass"],
  },
  {
    id: "spotlight_participation",
    tables: ["spotlight_poll_cycles", "spotlight_poll_candidates", "spotlight_poll_results"],
    stopLines: ["No raw vote totals publicly", "no candidate list publicly"],
  },
  {
    id: "discord_resource_hygiene",
    tables: ["discord_resources", "discord_sync_log"],
    stopLines: ["No webhook URLs", "no unrestricted message content"],
  },
  {
    id: "moderation_throughput",
    tables: ["gallery_submissions"],
    stopLines: ["No screenshots with private member data", "no private signed previews"],
  },
  {
    id: "mochi_social_alpha_health",
    tables: [],
    stopLines: ["configured-preview-stub", "no real value", "no funded-chain gate clearing"],
  },
];

const doc = readRequired("docs/community-health-signals.md");
const packageJson = readJson("package.json");
const checkAll = readRequired("scripts/check-all.mjs");

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) failures.push(`missing required context file: ${file}`);
}

for (const term of requiredTerms) {
  if (!doc.includes(term)) failures.push(`community health doc missing required term: ${term}`);
}

for (const source of requiredSources) {
  if (!doc.includes(source)) failures.push(`community health doc missing official source: ${source}`);
}

for (const signal of signals) {
  assertIncludes("community health doc", doc, `| ${signal.id} |`);
  for (const table of signal.tables) assertIncludes(signal.id, doc, table);
  for (const stopLine of signal.stopLines) assertIncludes(signal.id, doc, stopLine);
}

if (!packageJson?.scripts?.["check:community-health-signals"]) {
  failures.push("package.json missing check:community-health-signals script.");
}

if (!checkAll.includes('["check:community-health-signals", ["node", "scripts/check-community-health-signals.mjs"]]')) {
  failures.push("scripts/check-all.mjs does not run check:community-health-signals.");
}

if (/provider mutation from this matrix/i.test(doc) && !/does not authorize schema changes/i.test(doc)) {
  warnings.push("community health doc names provider mutation but does not also state the concrete non-authorization list.");
}

const report = {
  ok: failures.length === 0,
  checkedAt,
  scope:
    "Mochirii community health signal matrix. This no-secret report validates aggregate-only, no-message-content, no-provider-mutation boundaries for future operator dashboards.",
  docs: {
    matrix: pathForReport(docPath),
    requiredFiles: requiredFiles.map((file) => ({
      file,
      present: existsSync(resolve(root, file)),
    })),
  },
  signals: signals.map((signal) => ({
    id: signal.id,
    sourceTables: signal.tables,
    stopLineCount: signal.stopLines.length,
  })),
  sourceCount: requiredSources.length,
  requiredTermCount: requiredTerms.length,
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
  console.error("Community health signals validation failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Community health signals validation OK.");
console.log(`- Signals: ${signals.length}`);
console.log(`- Official sources: ${requiredSources.length}`);
console.log(`- Required context files: ${requiredFiles.length}`);
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
  const signalRows = data.signals
    .map((signal) => `| ${signal.id} | ${signal.sourceTables.join(", ") || "operator/runtime"} | ${signal.stopLineCount} |`)
    .join("\n");
  const warningsText = data.warnings.length ? data.warnings.map((warning) => `- ${warning}`).join("\n") : "- None";
  const failuresText = data.failures.length ? data.failures.map((failure) => `- ${failure}`).join("\n") : "- None";

  return `# Community Health Signals Report

Generated: ${data.checkedAt}

This file is intentionally no-secret. It validates that the community health matrix stays aggregate-only, redacted, and non-mutating.

## Result

- OK: ${data.ok ? "yes" : "no"}
- Matrix: ${data.docs.matrix}
- Signals: ${data.signals.length}
- Official source links: ${data.sourceCount}
- Required terms: ${data.requiredTermCount}

## Required Context Files

| File | State |
| --- | --- |
${fileRows}

## Signal Coverage

| Signal | Source tables | Stop lines |
| --- | --- | ---: |
${signalRows}

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
      label: "Discord bot token assignment",
      pattern: /\bDISCORD_BOT_TOKEN\s*[:=]\s*["']?(?!<|REDACTED|redacted|not read|placeholder)[^\s"',]+/i,
    },
    {
      label: "Enjin token assignment",
      pattern: /\bENJIN_PLATFORM_TOKEN\s*[:=]\s*["']?(?!<|REDACTED|redacted|not read|placeholder)[^\s"',]+/i,
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
