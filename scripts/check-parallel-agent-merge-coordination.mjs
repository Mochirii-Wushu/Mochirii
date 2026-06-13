import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const root = process.cwd();
const checkedAt = new Date().toISOString();
const args = new Set(process.argv.slice(2));
const writeReports =
  args.has("--write") || process.env.PARALLEL_AGENT_MERGE_COORDINATION_WRITE === "true";
const jsonReportPath = resolve(root, "reports/parallel-agent-merge-coordination.json");
const markdownReportPath = resolve(root, "reports/parallel-agent-merge-coordination.md");

const failures = [];
const warnings = [];
const skipped = ["provider reads disabled by design"];

const requiredSnippets = [
  {
    file: "AGENTS.md",
    snippets: [
      "Use one scoped branch per task",
      "Do not rerun paid/quota-bearing Actions",
      "the game repo owns RPGJS art, HUD, maps, and runtime manifests",
    ],
  },
  {
    file: "docs/mochi-social-alpha-codex-ops.md",
    snippets: [
      "Use Mochirii for website, Supabase, allowlist, terms, feedback, and admin changes; use Mochi Social for runtime/game changes.",
      "Provider boundary",
      "Cost boundary",
      "configured-preview-stub",
    ],
  },
  {
    file: "docs/mochi-social-alpha.md",
    snippets: ["Mochi Social game repo", "Fly", "Enjin Canary", "configured-preview-stub"],
  },
  {
    file: "docs/parallel-agent-merge-coordination.md",
    snippets: [
      "Workspace Ownership",
      "Branch Discipline",
      "Merge-Prep Checklist",
      "Provider Activation Boundary",
      "Conflict Handling",
      "No-Secret Evidence",
      "Shared contract changes need both sides named",
      "This coordination guard authorizes no live provider mutation.",
    ],
  },
  {
    file: "scripts/check-parallel-agent-merge-coordination.mjs",
    snippets: [
      "provider reads disabled by design",
      "providerMutationsAuthorized: false",
      "fundedChainActionsAuthorized: false",
      "scanText",
    ],
  },
];

const report = {
  ok: false,
  checkedAt,
  scope:
    "Mochirii parallel-agent merge coordination. This is a local, no-secret, provider-read-free guard for website/game branch ownership and merge evidence.",
  git: readGitState(root),
  branchPolicy: {
    scopedCodexBranch: null,
    currentBranchIsMain: null,
    requiresCurrentOriginMainBeforeNewWork: true,
    failOnMain: false,
  },
  ownership: {
    mochirii:
      "website, Vercel/Next, Supabase, Discord/Reaper, allowlist, terms, feedback, admin, tester doorway",
    mochiSocial:
      "RPGJS runtime, maps, sprites, HUD, manifests, game art, asset ledger, Fly runtime, Enjin runtime/finality",
    sharedContracts: [
      "NEXT_PUBLIC_MOCHI_SOCIAL_URL",
      "iframe bridge messages",
      "/integration/game-manifest.json",
      "/integration/alpha/status",
      "Supabase Edge request and response shapes",
      "configured-preview-stub readiness claims",
    ],
  },
  providerMutationsAuthorized: false,
  fundedChainActionsAuthorized: false,
  liveProviderReads: false,
  validations: [],
  packageScriptPresent: false,
  checkAllIncludesScript: false,
  warnings,
  skipped,
  failures,
};

report.branchPolicy.scopedCodexBranch = /^codex\//.test(report.git.branch);
report.branchPolicy.currentBranchIsMain = report.git.branch === "main";
if (!report.branchPolicy.scopedCodexBranch && !report.branchPolicy.currentBranchIsMain) {
  warnings.push(`current branch ${report.git.branch || "(unknown)"} is not main or codex/*`);
}

checkPackageScripts();
checkRequiredSnippets();
checkPolicyClaims();

const markdown = renderMarkdown(report);
const json = `${JSON.stringify(report, null, 2)}\n`;
scanRenderedArtifact("json", json);
scanRenderedArtifact("markdown", markdown);

report.ok = failures.length === 0;

if (writeReports) {
  mkdirSync(dirname(jsonReportPath), { recursive: true });
  writeFileSync(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(markdownReportPath, renderMarkdown(report), "utf8");
}

if (!report.ok) {
  console.error("Parallel-agent merge coordination failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  if (writeReports) console.error(`Report: ${pathForReport(jsonReportPath)}`);
  process.exit(1);
}

console.log("Parallel-agent merge coordination OK.");
console.log(`- Branch: ${report.git.branch || "(unknown)"}`);
console.log(`- Head: ${report.git.head || "(unknown)"}`);
console.log(`- Dirty entries: ${report.git.dirty.length}`);
console.log("- Provider mutations authorized: no");
if (writeReports) {
  console.log(`- JSON report: ${pathForReport(jsonReportPath)}`);
  console.log(`- Markdown report: ${pathForReport(markdownReportPath)}`);
} else {
  console.log("- Report writing disabled. Re-run with -- --write to persist redacted reports.");
}

function checkPackageScripts() {
  const packageJson = readJson(resolve(root, "package.json"));
  const scripts = packageJson?.scripts || {};
  report.packageScriptPresent = Boolean(scripts["check:parallel-agent-merge-coordination"]);
  if (!report.packageScriptPresent) {
    failures.push("package.json missing check:parallel-agent-merge-coordination script.");
  }

  const checkAll = readText("scripts/check-all.mjs");
  report.checkAllIncludesScript = checkAll.includes("check:parallel-agent-merge-coordination");
  if (!report.checkAllIncludesScript) {
    failures.push("scripts/check-all.mjs does not run check:parallel-agent-merge-coordination.");
  }
}

function checkRequiredSnippets() {
  for (const check of requiredSnippets) {
    const absolute = resolve(root, check.file);
    if (!existsSync(absolute)) {
      failures.push(`${check.file} is missing.`);
      report.validations.push({ file: check.file, present: false, missing: check.snippets });
      continue;
    }

    const text = readText(check.file);
    const missing = check.snippets.filter((snippet) => !text.includes(snippet));
    report.validations.push({
      file: check.file,
      present: true,
      required: check.snippets.length,
      missing,
    });
    if (missing.length) failures.push(`${check.file} missing required merge-coordination text: ${missing.join(", ")}`);

    for (const hit of scanText(text)) failures.push(`${check.file} contains forbidden secret-like material: ${hit}`);
  }
}

function checkPolicyClaims() {
  const doc = readText("docs/parallel-agent-merge-coordination.md");
  const forbiddenClaims = [
    {
      label: "provider mutation authorization",
      pattern: /\b(provider mutations? authorized|live provider mutation)\s*[:=]?\s*(?:true|yes|allowed)\b/i,
    },
    {
      label: "funded-chain authorization",
      pattern: /\b(funded-chain actions? authorized|funded chain actions? authorized)\s*[:=]?\s*(?:true|yes|allowed)\b/i,
    },
    {
      label: "dummy Enjin readiness",
      pattern: /\bset dummy (?:ENJIN_|Enjin|collection|Fuel Tank).*\b(?:ready|clear|green)\b/i,
    },
    {
      label: "hosted provider mutation from coordination pass",
      pattern: /\bcoordination guard authorizes\b.*\b(?:deploy|db push|command apply|Fuel Tank|cENJ)\b/i,
    },
  ];

  for (const { label, pattern } of forbiddenClaims) {
    pattern.lastIndex = 0;
    if (pattern.test(doc)) failures.push(`coordination doc claims forbidden ${label}.`);
  }
}

function readGitState(repoPath) {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], repoPath);
  const head = git(["rev-parse", "HEAD"], repoPath);
  const originMainAheadBehind = git(["rev-list", "--left-right", "--count", "origin/main...HEAD"], repoPath);
  const dirty = git(["status", "--porcelain"], repoPath);
  const [originMainBehind = "", originMainAhead = ""] = firstLine(originMainAheadBehind.stdout).split(/\s+/);
  return {
    branch: firstLine(branch.stdout),
    head: firstLine(head.stdout).slice(0, 12),
    originMainAhead: originMainAheadBehind.ok ? Number(originMainAhead) || 0 : null,
    originMainBehind: originMainAheadBehind.ok ? Number(originMainBehind) || 0 : null,
    dirty: dirty.ok ? dirty.stdout.split(/\r?\n/).filter(Boolean) : ["git status unavailable"],
    errors: [branch, head, originMainAheadBehind, dirty]
      .filter((result) => !result.ok)
      .map((result) => summarizeCommandError(result.stderr || result.error || "git command failed")),
  };
}

function git(argsForGit, cwd) {
  const result = spawnSync("git", argsForGit, { cwd, encoding: "utf8", shell: false });
  return {
    ok: result.status === 0,
    stdout: sanitizeText(result.stdout || ""),
    stderr: sanitizeText(result.stderr || ""),
    error: result.error?.message || "",
  };
}

function readText(file) {
  const absolute = resolve(root, file);
  if (!existsSync(absolute)) return "";
  return readFileSync(absolute, "utf8");
}

function readJson(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(`${pathForReport(file)} is not valid JSON: ${error?.message || error}`);
    return null;
  }
}

function renderMarkdown(data) {
  const validationRows =
    data.validations
      .map((entry) => `| ${entry.file} | ${entry.present ? "yes" : "no"} | ${entry.missing?.length || 0} |`)
      .join("\n") || "| none | no | 0 |";
  const dirtyLines = data.git.dirty.length ? data.git.dirty.map((entry) => `- ${entry}`).join("\n") : "- None";
  const warningLines = data.warnings.length ? data.warnings.map((warning) => `- ${warning}`).join("\n") : "- None";
  const skippedLines = data.skipped.length ? data.skipped.map((reason) => `- ${reason}`).join("\n") : "- None";
  const failureLines = data.failures.length ? data.failures.map((failure) => `- ${failure}`).join("\n") : "- None";

  return `# Parallel Agent Merge Coordination

Generated: ${data.checkedAt}

This file is intentionally no-secret. It records branch, ownership, and merge-prep status only. It does not read provider dashboards, print secrets, or authorize live mutations.

## Result

- OK: ${data.ok ? "yes" : "no"}
- Git branch: ${data.git.branch}
- Git head: ${data.git.head}
- Ahead of origin/main: ${data.git.originMainAhead ?? "unknown"}
- Behind origin/main: ${data.git.originMainBehind ?? "unknown"}
- Current branch is main: ${data.branchPolicy.currentBranchIsMain ? "yes" : "no"}
- Scoped codex branch: ${data.branchPolicy.scopedCodexBranch ? "yes" : "no"}
- Provider mutations authorized: ${data.providerMutationsAuthorized ? "yes" : "no"}
- Funded-chain actions authorized: ${data.fundedChainActionsAuthorized ? "yes" : "no"}

## Workspace Ownership

- Mochirii: ${data.ownership.mochirii}
- Mochi Social: ${data.ownership.mochiSocial}
- Shared contracts: ${data.ownership.sharedContracts.join(", ")}

## Static Validations

| File | Present | Missing snippets |
| --- | --- | --- |
${validationRows}

## Dirty Entries

${dirtyLines}

## Warnings

${warningLines}

## Skipped

${skippedLines}

## Failures

${failureLines}
`;
}

function scanRenderedArtifact(label, text) {
  for (const hit of scanText(text)) failures.push(`rendered ${label} report contains forbidden secret-like material: ${hit}`);
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
    { label: "raw cookie header", pattern: /\bCookie:\s*[^;\s]+=/i },
  ];
  const hits = [];
  String(text || "")
    .split(/\r?\n/)
    .forEach((line, index) => {
      for (const { label, pattern } of forbiddenPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) hits.push(`line ${index + 1}: ${label}`);
      }
    });
  return hits;
}

function sanitizeText(text) {
  let value = String(text || "");
  value = value.replace(/\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/g, "[redacted-github-token]");
  value = value.replace(/\bsb_secret_[A-Za-z0-9_-]{12,}\b/g, "[redacted-supabase-secret]");
  value = value.replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g, "[redacted-jwt]");
  value = value.replace(/\b[A-Za-z0-9_-]{23,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{27,}\b/g, "[redacted-discord-token]");
  value = value.replace(
    /https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g,
    "[redacted-discord-webhook]",
  );
  return value;
}

function summarizeCommandError(text) {
  return sanitizeText(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
}

function firstLine(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "";
}

function pathForReport(file) {
  const normalized = resolve(file).replace(/\\/g, "/");
  const normalizedRoot = root.replace(/\\/g, "/");
  if (normalized.startsWith(`${normalizedRoot}/`)) return relative(root, file).replace(/\\/g, "/");
  return normalized;
}
