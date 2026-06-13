import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has("--write") || process.env.OPERATOR_INDEX_WRITE === "true";
const indexPath = resolve(root, "docs/operator-index.md");
const jsonReportPath = resolve(root, "reports/operator-index-audit.json");
const mdReportPath = resolve(root, "reports/operator-index-audit.md");
const checkedAt = new Date().toISOString();
const failures = [];
const warnings = [];

const requiredPaths = [
  { path: "AGENTS.md", category: "repository guidance" },
  { path: "docs/current-live-state.md", category: "live state" },
  { path: "docs/deployment.md", category: "release" },
  { path: "apps/web/README.md", category: "vercel-next" },
  { path: "docs/dns-cutover-readiness-and-rollback.md", category: "rollback" },
  { path: "docs/dns-cutover-approval-packet.md", category: "rollback" },
  { path: "reports/full-stack-release-evidence.md", category: "release" },
  { path: "reports/live-site-verification-2026-06-07.md", category: "release" },
  { path: "supabase/README.md", category: "supabase" },
  { path: "docs/member-profiles-and-rank-roles.md", category: "supabase" },
  { path: "docs/member-workflow-production-qa-runbook.md", category: "supabase" },
  { path: "docs/supabase-cost-usage-runbook.md", category: "supabase" },
  { path: "reports/supabase-manual-parity-runbook.md", category: "supabase" },
  { path: "docs/reaper-runtime-health-checklist.md", category: "discord-reaper" },
  { path: "docs/reaper-event-sync-runbook.md", category: "discord-reaper" },
  { path: "docs/reaper-rank-role-sync.md", category: "discord-reaper" },
  { path: "docs/reaper-pending-verification-containment.md", category: "discord-reaper" },
  { path: "docs/reaper-pending-verification-activation-packet.md", category: "discord-reaper" },
  { path: "docs/vote-reminder-runbook.md", category: "discord-reaper" },
  { path: "reports/discord-reaper-parity-2026-06-10.md", category: "discord-reaper" },
  { path: "docs/gallery-guide.md", category: "gallery" },
  { path: "docs/member-gallery-moderation-runbook.md", category: "gallery" },
  { path: "docs/member-gallery-cleanup-plan.md", category: "gallery" },
  { path: "docs/instagram-gallery-publishing-deployment-runbook.md", category: "gallery" },
  { path: "docs/mochi-social-alpha.md", category: "mochi-social" },
  { path: "docs/mochi-social-alpha-codex-ops.md", category: "mochi-social" },
  { path: "docs/mochi-social-visual-polish.md", category: "mochi-social" },
  { path: "reports/mochi-social-preview-ready.md", category: "mochi-social", optionalGenerated: true },
  { path: "reports/mochi-social-report-hygiene.md", category: "mochi-social", optionalGenerated: true },
  { path: "reports/mochi-social-browser-gates.md", category: "mochi-social", optionalGenerated: true },
  { path: "reports/accessibility-route-matrix.md", category: "accessibility-performance-security" },
  { path: "reports/csp-inline-hardening-inventory.md", category: "accessibility-performance-security" },
  { path: "docs/content-guide.md", category: "content" },
  { path: "docs/home-shell-guide.md", category: "content" },
  { path: "docs/join-guide.md", category: "content" },
  { path: "docs/events-guide.md", category: "content" },
  { path: "docs/ranks-guide.md", category: "content" },
  { path: "docs/leaders-guide.md", category: "content" },
  { path: "docs/codex-guide.md", category: "content" },
  { path: "docs/recruitment-guide.md", category: "content" },
  { path: "docs/side-pages-guide.md", category: "content" },
  { path: "docs/twills-guide.md", category: "content" },
  { path: "docs/roadmap.md", category: "content" },
];

const requiredPhrases = [
  "https://mochirii.com",
  "apps/web",
  "root static",
  "Supabase",
  "Discord/Reaper",
  "Mochi Social",
  "Fly",
  "Enjin",
  "no live provider mutation",
  "no secrets",
  "service-role",
  "funded-chain",
  "reports/full-stack-release-evidence.md",
];

const indexText = readIndex();
const pathChecks = requiredPaths.map(checkPath);
const phraseChecks = requiredPhrases.map(checkPhrase);
const categorySummary = summarizeCategories(pathChecks);
const report = {
  ok: false,
  checkedAt,
  scope:
    "No-secret Mochirii operator index audit for live-domain runbook coverage, provider boundaries, and release/rollback source-of-truth links.",
  indexPath: pathForReport(indexPath),
  pathChecks,
  phraseChecks,
  categorySummary,
  warnings,
  failures,
};

report.ok = failures.length === 0;
const json = `${JSON.stringify(report, null, 2)}\n`;
const markdown = renderMarkdown(report);
scanRenderedArtifact("json", json);
scanRenderedArtifact("markdown", markdown);
report.ok = failures.length === 0;

if (writeReport) {
  mkdirSync(dirname(jsonReportPath), { recursive: true });
  writeFileSync(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(mdReportPath, renderMarkdown(report), "utf8");
}

if (!report.ok) {
  console.error("Operator index audit failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Operator index audit OK.");
console.log(`- Linked runbooks: ${pathChecks.filter((entry) => entry.exists && entry.linked).length}/${pathChecks.length}`);
console.log(`- Required phrases: ${phraseChecks.filter((entry) => entry.present).length}/${phraseChecks.length}`);
console.log(`- Categories: ${Object.keys(categorySummary).length}`);
if (writeReport) {
  console.log(`- JSON report: ${pathForReport(jsonReportPath)}`);
  console.log(`- Markdown report: ${pathForReport(mdReportPath)}`);
}

function readIndex() {
  if (!existsSync(indexPath)) {
    failures.push("docs/operator-index.md is missing.");
    return "";
  }
  return readFileSync(indexPath, "utf8");
}

function checkPath(entry) {
  const full = resolve(root, entry.path);
  const exists = existsSync(full);
  const linked = indexText.includes(entry.path);
  if (!exists && entry.optionalGenerated) {
    warnings.push(`${entry.path}: optional generated evidence file is not present in this checkout.`);
  } else if (!exists) {
    failures.push(`${entry.path}: referenced source file is missing.`);
  }
  if (!linked) failures.push(`${entry.path}: missing from docs/operator-index.md.`);
  return { ...entry, exists, linked };
}

function checkPhrase(phrase) {
  const present = indexText.includes(phrase);
  if (!present) failures.push(`docs/operator-index.md missing required phrase: ${phrase}`);
  return { phrase, present };
}

function summarizeCategories(entries) {
  return entries.reduce((summary, entry) => {
    summary[entry.category] ||= { total: 0, linked: 0, missing: 0 };
    summary[entry.category].total += 1;
    if (entry.linked) summary[entry.category].linked += 1;
    if (!entry.exists) summary[entry.category].missing += 1;
    return summary;
  }, {});
}

function renderMarkdown(data) {
  const categoryRows = Object.entries(data.categorySummary)
    .map(
      ([category, value]) =>
        `| ${escapeCell(category)} | ${value.linked}/${value.total} | ${value.missing} |`,
    )
    .join("\n");
  const missingRows = data.pathChecks
    .filter((entry) => !entry.exists || !entry.linked)
    .map(
      (entry) =>
        `| ${escapeCell(entry.path)} | ${escapeCell(entry.category)} | ${entry.exists ? "yes" : "no"} | ${entry.linked ? "yes" : "no"} |`,
    )
    .join("\n");
  const phraseRows = data.phraseChecks
    .map((entry) => `| ${escapeCell(entry.phrase)} | ${entry.present ? "yes" : "no"} |`)
    .join("\n");
  const failuresText = data.failures.length ? data.failures.map((failure) => `- ${failure}`).join("\n") : "- None";
  const warningsText = data.warnings.length ? data.warnings.map((warning) => `- ${warning}`).join("\n") : "- None";

  return `# Operator Index Audit

Generated: ${data.checkedAt}

This file is intentionally no-secret. It verifies that \`docs/operator-index.md\` still links the active Mochirii operator runbooks and names the release boundaries without recording tokens, service-role keys, webhook URLs, cookies, private message content, payment details, or wallet material.

## Result

- OK: ${data.ok ? "yes" : "no"}
- Index: ${data.indexPath}
- Runbook links present: ${data.pathChecks.filter((entry) => entry.exists && entry.linked).length}/${data.pathChecks.length}
- Required phrases present: ${data.phraseChecks.filter((entry) => entry.present).length}/${data.phraseChecks.length}

## Category Coverage

| Category | Linked | Missing files |
| --- | ---: | ---: |
${categoryRows}

## Missing Or Unlinked Paths

| Path | Category | Exists | Linked |
| --- | --- | --- | --- |
${missingRows || "| None | n/a | yes | yes |"}

## Required Phrase Coverage

| Phrase | Present |
| --- | --- |
${phraseRows}

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
    { label: "raw cookie header", pattern: /\bCookie:\s*[^;\s]+=/i },
    {
      label: "service-role assignment",
      pattern: /\b(?:SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY)\s*[:=]\s*["']?(?!<|REDACTED|redacted|placeholder)[^\s"',]+/i,
    },
    {
      label: "Discord bot token assignment",
      pattern: /\bDISCORD_BOT_TOKEN\s*[:=]\s*["']?(?!<|REDACTED|redacted|placeholder)[^\s"',]+/i,
    },
    {
      label: "Enjin token assignment",
      pattern: /\bENJIN_PLATFORM_TOKEN\s*[:=]\s*["']?(?!<|REDACTED|redacted|placeholder)[^\s"',]+/i,
    },
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

function escapeCell(value) {
  return String(value || "")
    .replace(/\r?\n/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|");
}

function pathForReport(file) {
  return relative(root, resolve(root, file)).replace(/\\/g, "/");
}
