import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has("--write") || process.env.JOIN_ONBOARDING_FUNNEL_WRITE === "true";
const rootDataPath = resolve(root, "data/join.json");
const nextDataPath = resolve(root, "apps/web/public/data/join.json");
const guidePath = resolve(root, "docs/join-guide.md");
const reportJsonPath = resolve(root, "reports/join-onboarding-funnel.json");
const reportMdPath = resolve(root, "reports/join-onboarding-funnel.md");
const checkedAt = new Date().toISOString();
const failures = [];
const warnings = [];

const requiredConcepts = [
  { id: "discord", label: "Discord join path", patterns: [/discord/i] },
  { id: "rules", label: "server rules", patterns: [/rules?/i] },
  { id: "onboarding", label: "onboarding prompts", patterns: [/onboarding/i] },
  { id: "verification", label: "verification", patterns: [/verif/i] },
  { id: "identity", label: "in-game identity", patterns: [/\bign\b/i, /in-game name/i, /\buid\b/i] },
  { id: "codex", label: "Codex review", patterns: [/codex/i] },
  { id: "profile", label: "website account or profile", patterns: [/account/i, /profile/i] },
  { id: "event", label: "first event", patterns: [/event/i, /\brsvp\b/i] },
  { id: "help", label: "help path", patterns: [/help/i, /ask/i, /\bmod\b/i, /leader/i] },
];

const requiredLinks = [
  { label: "Discord invite", href: "https://discord.com/invite/dPafqMwWPK" },
  { label: "Codex", href: "./codex.html" },
  { label: "Account", href: "./account.html" },
  { label: "Events", href: "./events.html" },
];

const join = readJson(rootDataPath, "root Join data");
const nextJoin = readJson(nextDataPath, "Next mirrored Join data");
const guide = readText(guidePath, "Join guide");

const rootDataText = existsSync(rootDataPath) ? readFileSync(rootDataPath, "utf8") : "";
const nextDataText = existsSync(nextDataPath) ? readFileSync(nextDataPath, "utf8") : "";
if (rootDataText && nextDataText && rootDataText !== nextDataText) {
  failures.push("apps/web/public/data/join.json is not synchronized with data/join.json.");
}

const allCopy = collectText(join);
const steps = Array.isArray(join?.steps?.items) ? join.steps.items : [];
const checklist = Array.isArray(join?.checklist?.items) ? join.checklist.items : [];
const quickLinks = Array.isArray(join?.quickStart?.links) ? join.quickStart.links : [];
const checklistLinks = checklist.filter((item) => item?.href && item?.label);
const allLinks = [...quickLinks, ...checklistLinks];

const conceptChecks = requiredConcepts.map((concept) => {
  const present = concept.patterns.some((pattern) => pattern.test(allCopy));
  if (!present) failures.push(`Join onboarding funnel missing concept: ${concept.label}.`);
  return { ...concept, present };
});

const linkChecks = requiredLinks.map((link) => {
  const present = allLinks.some((item) => item?.href === link.href);
  if (!present) failures.push(`Join onboarding funnel missing link: ${link.label} (${link.href}).`);
  return { ...link, present };
});

const schemaChecks = {
  hero: hasObject(join?.hero),
  steps: hasObject(join?.steps) && steps.length >= 5,
  quickStart: hasObject(join?.quickStart) && quickLinks.length >= 3,
  checklist: hasObject(join?.checklist) && checklist.length >= 7,
  culture: hasObject(join?.culture),
  notes: hasObject(join?.notes),
};

for (const [section, passed] of Object.entries(schemaChecks)) {
  if (!passed) failures.push(`Join data section is missing or too thin: ${section}.`);
}

validateKeys("steps.items", steps, ["number", "title", "description"]);
validateKeys("checklist.items", checklist, ["title", "text", "href", "label"]);
validateKeys("quickStart.links", quickLinks, ["label", "href"]);

if (/Where Winds Meet/i.test(allCopy)) {
  failures.push("Join visible body copy must not mention the exact game name.");
}

for (const phrase of ["server rules", "onboarding prompts", "verification", "Account", "Events"]) {
  if (!guide.includes(phrase)) failures.push(`docs/join-guide.md missing current funnel phrase: ${phrase}.`);
}

const report = {
  ok: false,
  checkedAt,
  scope:
    "No-secret static audit for the Join page website-to-Discord onboarding funnel, checklist coverage, supported data shape, and Next public data sync.",
  sourceFiles: [pathForReport(rootDataPath), pathForReport(nextDataPath), pathForReport(guidePath)],
  counts: {
    steps: steps.length,
    checklistItems: checklist.length,
    quickStartLinks: quickLinks.length,
    checklistLinks: checklistLinks.length,
  },
  schemaChecks,
  conceptChecks: conceptChecks.map(({ id, label, present }) => ({ id, label, present })),
  linkChecks,
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
  mkdirSync(dirname(reportJsonPath), { recursive: true });
  writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(reportMdPath, renderMarkdown(report), "utf8");
}

if (!report.ok) {
  console.error("Join onboarding funnel audit failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Join onboarding funnel audit OK.");
console.log(`- Steps: ${steps.length}`);
console.log(`- Checklist items: ${checklist.length}`);
console.log(`- Required concepts: ${conceptChecks.filter((entry) => entry.present).length}/${conceptChecks.length}`);
console.log(`- Required links: ${linkChecks.filter((entry) => entry.present).length}/${linkChecks.length}`);
if (writeReport) {
  console.log(`- JSON report: ${pathForReport(reportJsonPath)}`);
  console.log(`- Markdown report: ${pathForReport(reportMdPath)}`);
}

function readJson(file, label) {
  if (!existsSync(file)) {
    failures.push(`${label} is missing: ${pathForReport(file)}.`);
    return {};
  }
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(`${label} is not valid JSON: ${error?.message || error}`);
    return {};
  }
}

function readText(file, label) {
  if (!existsSync(file)) {
    failures.push(`${label} is missing: ${pathForReport(file)}.`);
    return "";
  }
  return readFileSync(file, "utf8");
}

function hasObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function validateKeys(label, rows, allowedKeys) {
  rows.forEach((row, index) => {
    if (!hasObject(row)) {
      failures.push(`${label}[${index}] must be an object.`);
      return;
    }
    const extras = Object.keys(row).filter((key) => !allowedKeys.includes(key));
    if (extras.length) failures.push(`${label}[${index}] has unsupported key(s): ${extras.join(", ")}.`);
  });
}

function collectText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(collectText).join("\n");
  if (typeof value === "object") return Object.values(value).map(collectText).join("\n");
  return "";
}

function renderMarkdown(data) {
  const schemaRows = Object.entries(data.schemaChecks)
    .map(([name, passed]) => `| ${escapeCell(name)} | ${passed ? "pass" : "fail"} |`)
    .join("\n");
  const conceptRows = data.conceptChecks
    .map((entry) => `| ${escapeCell(entry.label)} | ${entry.present ? "yes" : "no"} |`)
    .join("\n");
  const linkRows = data.linkChecks
    .map((entry) => `| ${escapeCell(entry.label)} | ${escapeCell(entry.href)} | ${entry.present ? "yes" : "no"} |`)
    .join("\n");
  const failuresText = data.failures.length ? data.failures.map((failure) => `- ${failure}`).join("\n") : "- None";
  const warningsText = data.warnings.length ? data.warnings.map((warning) => `- ${warning}`).join("\n") : "- None";

  return `# Join Onboarding Funnel Audit

Generated: ${data.checkedAt}

This file is intentionally no-secret. It verifies that the Join page keeps a practical website-to-Discord funnel without recording tokens, cookies, private account data, private message content, or provider secrets.

## Result

- OK: ${data.ok ? "yes" : "no"}
- Steps: ${data.counts.steps}
- Checklist items: ${data.counts.checklistItems}
- Quick-start links: ${data.counts.quickStartLinks}
- Checklist links: ${data.counts.checklistLinks}

## Schema Coverage

| Section | Result |
| --- | --- |
${schemaRows}

## Funnel Concepts

| Concept | Present |
| --- | --- |
${conceptRows}

## Required Links

| Link | Href | Present |
| --- | --- | --- |
${linkRows}

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
