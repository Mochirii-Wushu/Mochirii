import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has("--write") || process.env.SUPABASE_ADVISOR_LINT_CADENCE_WRITE === "true";
const docPath = resolve(root, "docs/supabase-advisor-lint-cadence.md");
const reportJsonPath = resolve(root, "reports/supabase-advisor-lint-cadence.json");
const reportMdPath = resolve(root, "reports/supabase-advisor-lint-cadence.md");
const checkedAt = new Date().toISOString();
const failures = [];
const warnings = [];

const requiredFiles = [
  "docs/supabase-advisor-lint-cadence.md",
  "supabase/README.md",
  "reports/supabase-production-security-review.md",
  "reports/supabase-ci-and-parity-review.md",
  "reports/supabase-manual-parity-runbook.md",
];

const requiredSources = [
  "supabase.com/docs/reference/cli/introduction",
  "supabase.com/docs/reference/cli/supabase-db-lint",
  "supabase.com/docs/guides/database/database-advisors",
  "supabase.com/docs/guides/database/inspect",
  "supabase.com/docs/guides/database/postgres/row-level-security",
  "supabase.com/docs/guides/getting-started/api-keys",
  "supabase.com/docs/guides/database/secure-data",
  "supabase.com/docs/guides/functions/secrets",
];

const requiredCommands = [
  "supabase --version",
  "supabase db lint --help",
  "supabase db advisors --help",
  "supabase inspect db --help",
  "supabase db lint --local --schema public --level warning --fail-on none",
  "supabase db advisors --local --type all --level info --fail-on none",
  "supabase migration list --linked",
  "supabase db lint --linked --schema public --level warning --fail-on none",
  "supabase db advisors --linked --type all --level info --fail-on none",
];

const requiredTerms = [
  "monthly read-only",
  "no provider mutation",
  "RLS",
  "service-role",
  "security definer",
  "public.handle_new_member_profile()",
  "Dashboard Security Advisor",
  "Dashboard Performance Advisor",
  "Performance Advisor",
  "Security Advisor",
  "no-real-value",
  "configured-preview-stub",
  "No Discord message content",
  "private Storage paths",
  "signed URLs",
  "database password",
  "service-role key",
  "secret key",
  "read-only inspection",
];

const forbiddenMutatingCommandPatterns = [
  /\bsupabase\s+db\s+push\b(?!`)/i,
  /\bsupabase\s+functions\s+deploy\b(?!`)/i,
  /\bsupabase\s+secrets\s+set\b(?!`)/i,
  /\bdelete\s+from\b/i,
  /\btruncate\s+table\b/i,
  /\bdrop\s+table\b/i,
];

const doc = readRequired("docs/supabase-advisor-lint-cadence.md");
const packageJson = readJson("package.json");
const checkAll = readRequired("scripts/check-all.mjs");

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) failures.push(`missing required context file: ${file}`);
}

for (const source of requiredSources) {
  assertIncludes("Supabase advisor cadence doc", doc, source);
}

for (const command of requiredCommands) {
  assertIncludes("Supabase advisor cadence doc", doc, command);
}

for (const term of requiredTerms) {
  assertIncludes("Supabase advisor cadence doc", doc, term);
}

for (const { line, number } of docLines(doc)) {
  const allowedStopLine =
    line.includes("requires `supabase db push`") ||
    line.includes("requires `supabase db push`,") ||
    line.includes("does not authorize `supabase db push`") ||
    line.includes("This runbook does not authorize `supabase db push`");
  for (const pattern of forbiddenMutatingCommandPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(line) && !allowedStopLine) {
      failures.push(`line ${number}: mutating Supabase command must appear only as a stop condition, not an instruction.`);
    }
  }
}

if (!packageJson?.scripts?.["check:supabase-advisor-lint-cadence"]) {
  failures.push("package.json missing check:supabase-advisor-lint-cadence script.");
}

if (!checkAll.includes('["check:supabase-advisor-lint-cadence", ["node", "scripts/check-supabase-advisor-lint-cadence.mjs"]]')) {
  failures.push("scripts/check-all.mjs does not run check:supabase-advisor-lint-cadence.");
}

const report = {
  ok: failures.length === 0,
  checkedAt,
  scope:
    "Mochirii Supabase advisor and lint cadence static report. This report is no-secret and validates read-only monthly database hygiene guidance without contacting Supabase.",
  docs: {
    runbook: pathForReport(docPath),
    requiredFiles: requiredFiles.map((file) => ({
      file,
      present: existsSync(resolve(root, file)),
    })),
  },
  commands: requiredCommands,
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
  console.error("Supabase advisor/lint cadence validation failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Supabase advisor/lint cadence validation OK.");
console.log(`- Official sources: ${requiredSources.length}`);
console.log(`- Read-only commands: ${requiredCommands.length}`);
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

function docLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line, index) => ({ line, number: index + 1 }));
}

function renderMarkdown(data) {
  const fileRows = data.docs.requiredFiles
    .map((entry) => `| ${entry.file} | ${entry.present ? "present" : "missing"} |`)
    .join("\n");
  const commandRows = data.commands.map((command) => `| \`${command}\` | read-only/inspection |`).join("\n");
  const warningsText = data.warnings.length ? data.warnings.map((warning) => `- ${warning}`).join("\n") : "- None";
  const failuresText = data.failures.length ? data.failures.map((failure) => `- ${failure}`).join("\n") : "- None";

  return `# Supabase Advisor And Lint Cadence Report

Generated: ${data.checkedAt}

This file is intentionally no-secret. It validates the monthly Supabase advisor/lint runbook and records only static command coverage, source coverage, and context-file presence.

## Result

- OK: ${data.ok ? "yes" : "no"}
- Runbook: ${data.docs.runbook}
- Official source links: ${data.sourceCount}
- Required terms: ${data.requiredTermCount}
- Read-only commands: ${data.commands.length}

## Required Context Files

| File | State |
| --- | --- |
${fileRows}

## Command Coverage

| Command | Purpose |
| --- | --- |
${commandRows}

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
