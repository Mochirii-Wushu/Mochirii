import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = process.cwd();
const checkedAt = new Date().toISOString();
const args = new Set(process.argv.slice(2));
const providerReads =
  args.has("--providers") || process.env.FULL_STACK_RELEASE_EVIDENCE_PROVIDERS === "true";
const writeReports =
  args.has("--write") || process.env.FULL_STACK_RELEASE_EVIDENCE_WRITE === "true";
const strictProviders =
  args.has("--strict-provider") || process.env.FULL_STACK_RELEASE_EVIDENCE_STRICT_PROVIDER === "true";
const productionUrl = process.env.FULL_STACK_RELEASE_EVIDENCE_URL || "https://mochirii.com";
const vercelProject = process.env.FULL_STACK_RELEASE_EVIDENCE_VERCEL_PROJECT || "mochirii";
const supabaseProjectRef =
  process.env.FULL_STACK_RELEASE_EVIDENCE_SUPABASE_PROJECT_REF || "deyvmtncimmcinldjyqe";
const jsonReportPath = resolve(root, "reports/full-stack-release-evidence.json");
const markdownReportPath = resolve(root, "reports/full-stack-release-evidence.md");

const failures = [];
const warnings = [];
const skipped = [];

const report = {
  ok: false,
  checkedAt,
  scope:
    "Mochirii full-stack release evidence. This report is read-only and intentionally redacted; it records provider status, script coverage, and release gates without secret values.",
  productionUrl,
  providerReadsEnabled: providerReads,
  strictProviders,
  git: readGitState(root),
  local: {},
  vercel: providerReads ? inspectVercel() : skippedSection("provider reads disabled"),
  supabase: providerReads ? inspectSupabase() : inspectSupabaseLocalOnly(),
  discordReaper: inspectDiscordReaper(),
  mochiSocial: inspectMochiSocial(),
  enjin: inspectEnjin(),
  codexAgents: inspectCodexAgents(),
  warnings,
  skipped,
  failures,
};

report.local = inspectLocalReleaseSurface();
report.ok = failures.length === 0;

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
  console.error("Full-stack release evidence failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  if (writeReports) console.error(`Report: ${pathForReport(jsonReportPath)}`);
  process.exit(1);
}

console.log("Full-stack release evidence OK.");
console.log(`- Provider reads: ${providerReads ? "enabled" : "disabled"}`);
console.log(`- Required local scripts: ${report.local.requiredScripts.present}/${report.local.requiredScripts.total}`);
console.log(`- Supabase local migrations: ${report.supabase.localMigrations?.total ?? "not checked"}`);
console.log(`- Supabase Edge functions in config: ${report.supabase.localFunctions?.total ?? "not checked"}`);
console.log(`- Vercel production state: ${report.vercel.production?.readyState || report.vercel.status}`);
if (writeReports) {
  console.log(`- JSON report: ${pathForReport(jsonReportPath)}`);
  console.log(`- Markdown report: ${pathForReport(markdownReportPath)}`);
} else {
  console.log("- Report writing disabled. Re-run with -- --write to persist redacted reports.");
}

function inspectLocalReleaseSurface() {
  const packageJsonPath = resolve(root, "package.json");
  const packageJson = readJson(packageJsonPath);
  const scripts = packageJson?.scripts || {};
  const requiredScripts = [
    "check",
    "check:full-stack-release-evidence",
    "check:production",
    "check:security-hardening",
    "check:supabase-edge-types",
    "check:discord-native-safety-audit",
    "check:discord-reaper-parity",
    "check:reaper-discord-interactions",
    "check:reaper-pending-verification",
    "check:mochi-social-alpha",
    "check:mochi-social-bridge-state",
    "check:mochi-social-edge-authority",
    "check:mochi-social-report-hygiene",
    "smoke:vercel-production",
    "smoke:supabase-edge-functions",
    "register:reaper-pending-verification-command",
    "rollback:reaper-pending-verification",
  ];
  const missingScripts = requiredScripts.filter((script) => !scripts[script]);
  if (missingScripts.length) failures.push(`package.json missing release script(s): ${missingScripts.join(", ")}`);

  const requiredFiles = [
    "AGENTS.md",
    "docs/deployment.md",
    "docs/current-live-state.md",
    "docs/discord-native-safety-audit.md",
    "docs/dns-cutover-readiness-and-rollback.md",
    "docs/member-profiles-and-rank-roles.md",
    "docs/mochi-social-visual-polish.md",
    "supabase/config.toml",
    ".github/workflows/validate-static-site.yml",
    ".github/workflows/validate-next-app.yml",
  ];
  const missingFiles = requiredFiles.filter((file) => !existsSync(resolve(root, file)));
  if (missingFiles.length) failures.push(`missing release source-of-truth file(s): ${missingFiles.join(", ")}`);

  const workflowWhitespace = checkWorkflowWhitespaceGate();
  if (!workflowWhitespace.present) {
    failures.push("GitHub validation workflow is missing the committed whitespace check.");
  }

  return {
    packageName: packageJson?.name || "",
    requiredScripts: {
      total: requiredScripts.length,
      present: requiredScripts.length - missingScripts.length,
      missing: missingScripts,
    },
    requiredFiles: {
      total: requiredFiles.length,
      present: requiredFiles.length - missingFiles.length,
      missing: missingFiles,
    },
    workflowWhitespace,
  };
}

function inspectVercel() {
  const section = {
    status: "skipped",
    cli: commandVersion("vercel"),
    production: null,
    environmentNames: {
      production: null,
      preview: null,
    },
  };

  if (!section.cli.available) {
    return skipProvider(section, "vercel CLI unavailable");
  }

  const inspect = run("vercel", ["inspect", productionUrl, "--format=json", "--timeout", "3m"], {
    timeout: 180000,
  });
  if (!inspect.ok) return skipProvider(section, "vercel inspect failed", inspect);

  const deployment = parseJson(inspect.stdout);
  if (!deployment) return skipProvider(section, "vercel inspect did not return JSON");

  const aliases = uniqueStrings([
    ...(Array.isArray(deployment.alias) ? deployment.alias : []),
    ...(Array.isArray(deployment.aliases) ? deployment.aliases : []),
  ]).filter((alias) => alias.includes("mochirii"));

  const readyState = String(deployment.readyState || deployment.state || deployment.status || "unknown").toUpperCase();
  section.status = "checked";
  section.production = {
    name: deployment.name || vercelProject,
    target: deployment.target || "production",
    readyState,
    url: safeUrl(deployment.url || productionUrl),
    aliases,
    createdAt: deployment.createdAt || deployment.created || "",
  };

  if (readyState !== "READY") {
    failures.push(`Vercel production deployment is ${readyState}; expected READY.`);
  }

  section.environmentNames.production = readVercelEnvNames("production");
  section.environmentNames.preview = readVercelEnvNames("preview");

  return section;
}

function inspectSupabase() {
  const section = {
    status: "skipped",
    cli: commandVersion("supabase"),
    projectRef: supabaseProjectRef,
    localMigrations: readLocalMigrations(),
    localFunctions: readLocalFunctionConfig(),
    remoteMigrations: null,
    remoteFunctions: null,
    secrets: "not read by this no-secret evidence command",
  };

  if (!section.cli.available) {
    return skipProvider(section, "supabase CLI unavailable");
  }

  const migrations = run("supabase", ["migration", "list", "--linked"], { timeout: 120000 });
  if (!migrations.ok) {
    if (strictProviders) failures.push("Supabase linked migration list failed.");
    return skipProvider(section, "supabase linked migration list failed", migrations);
  }

  section.status = "checked";
  section.remoteMigrations = parseMigrationList(migrations.stdout);
  const migrationMismatch = compareMigrationVersions(section.localMigrations.versions, section.remoteMigrations.versions);
  section.remoteMigrations.mismatch = migrationMismatch;
  if (migrationMismatch.localOnly.length || migrationMismatch.remoteOnly.length) {
    failures.push(
      `Supabase migration mismatch: local-only ${migrationMismatch.localOnly.length}, remote-only ${migrationMismatch.remoteOnly.length}.`,
    );
  }

  const functions = run(
    "supabase",
    ["functions", "list", "--project-ref", supabaseProjectRef, "--output-format", "json"],
    { timeout: 120000 },
  );
  if (!functions.ok) {
    if (strictProviders) failures.push("Supabase functions list failed.");
    section.remoteFunctions = skippedSection("supabase functions list failed");
    return section;
  }

  const parsedFunctions = parseJson(functions.stdout);
  const remoteFunctions = Array.isArray(parsedFunctions) ? parsedFunctions : [];
  const safeFunctions = remoteFunctions
    .map((entry) => ({
      name: entry.slug || entry.name || entry.id || "",
      status: String(entry.status || "unknown").toUpperCase(),
      verifyJwt: typeof entry.verify_jwt === "boolean" ? entry.verify_jwt : entry.verifyJwt,
    }))
    .filter((entry) => entry.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  section.remoteFunctions = {
    total: safeFunctions.length,
    active: safeFunctions.filter((entry) => entry.status === "ACTIVE").length,
    names: safeFunctions.map((entry) => entry.name),
    inactive: safeFunctions.filter((entry) => entry.status !== "ACTIVE").map((entry) => entry.name),
  };

  const missingRemote = section.localFunctions.names.filter((name) => !section.remoteFunctions.names.includes(name));
  section.remoteFunctions.localConfiguredMissingRemote = missingRemote;
  if (section.remoteFunctions.inactive.length) {
    failures.push(`Supabase Edge Function(s) not active: ${section.remoteFunctions.inactive.join(", ")}`);
  }
  if (missingRemote.length) {
    failures.push(`Supabase configured function(s) missing from remote list: ${missingRemote.join(", ")}`);
  }

  return section;
}

function inspectSupabaseLocalOnly() {
  skipped.push("supabase provider reads disabled");
  return {
    status: "local-only",
    projectRef: supabaseProjectRef,
    cli: { available: false, version: "not checked" },
    localMigrations: readLocalMigrations(),
    localFunctions: readLocalFunctionConfig(),
    remoteMigrations: null,
    remoteFunctions: null,
    secrets: "not read by this no-secret evidence command",
  };
}

function inspectDiscordReaper() {
  const packageJson = readJson(resolve(root, "package.json")) || {};
  const scripts = packageJson.scripts || {};
  const commandScript = existsSync(resolve(root, "scripts/register-reaper-pending-verification-command.mjs"));
  const rollbackScript = existsSync(resolve(root, "scripts/rollback-reaper-pending-verification-overwrites.mjs"));
  const docs = [
    "docs/discord-reaper-parity.md",
    "docs/reaper-pending-verification-activation.md",
    "docs/vote-reminder-runbook.md",
  ].filter((file) => existsSync(resolve(root, file)));

  return {
    status: "static-checked",
    slashCommandRepairPath: {
      registerScript: commandScript,
      rollbackScript,
      packageScripts: {
        register: Boolean(scripts["register:reaper-pending-verification-command"]),
        rollback: Boolean(scripts["rollback:reaper-pending-verification"]),
        parity: Boolean(scripts["check:discord-reaper-parity"]),
        containment: Boolean(scripts["check:reaper-pending-verification"]),
      },
    },
    gatewayAutomation: {
      expectedSecondGate: true,
      directDiscordMutationExpectedHere: false,
    },
    discordNativeSafetyAudit: existsSync(resolve(root, "docs/discord-native-safety-audit.md")),
    docs,
  };
}

function inspectMochiSocial() {
  const previewReport = readJson(resolve(root, "reports/mochi-social-preview-ready.json"));
  const reportSummary = previewReport
    ? {
        ok: Boolean(previewReport.ok),
        hostedChecksAllowed: Boolean(previewReport.hostedChecksAllowed),
        browserGateMode: previewReport.browserGateMode || "",
        gameUrlPresent: Boolean(previewReport.gameUrl),
        siteOriginPresent: Boolean(previewReport.siteOrigin),
        summary: previewReport.summary || null,
      }
    : null;
  return {
    status: previewReport ? "report-read" : "static-checked",
    previewReadyReportPresent: Boolean(previewReport),
    previewReadyReport: reportSummary,
    packageScripts: {
      alpha: hasPackageScript("check:mochi-social-alpha"),
      bridgeState: hasPackageScript("check:mochi-social-bridge-state"),
      edgeAuthority: hasPackageScript("check:mochi-social-edge-authority"),
      reportHygiene: hasPackageScript("check:mochi-social-report-hygiene"),
      gameContract: hasPackageScript("check:mochi-social-game-contract"),
    },
    hostedFlyDeployRequiresSeparateApproval: true,
  };
}

function inspectEnjin() {
  const files = [
    "docs/mochi-social-visual-polish.md",
    "scripts/check-mochi-social-alpha.mjs",
    "scripts/check-mochi-social-edge-authority.mjs",
  ];
  const mentions = files
    .filter((file) => existsSync(resolve(root, file)))
    .map((file) => ({
      file,
      configuredPreviewStub: /configured-preview-stub/i.test(readFileSync(resolve(root, file), "utf8")),
      fundedChainGate: /funded-chain|Fuel Tank|Wallet Daemon|cENJ/i.test(readFileSync(resolve(root, file), "utf8")),
    }));

  return {
    status: "static-checked",
    previewOnlyExpected: true,
    fundedChainActionsAuthorized: false,
    evidence: mentions,
  };
}

function inspectCodexAgents() {
  return {
    status: "static-checked",
    agentsGuidancePresent: existsSync(resolve(root, "AGENTS.md")),
    codexGuidePresent: existsSync(resolve(root, "docs/codex-guide.md")),
    scopedBranchExpected: true,
    noSecretReportsExpected: true,
  };
}

function readVercelEnvNames(target) {
  const result = run("vercel", ["env", "ls", target, "--format=json"], { timeout: 60000 });
  if (!result.ok) return skippedSection(`vercel env ls ${target} failed`);
  const parsed = parseJson(result.stdout);
  const envs = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.envs) ? parsed.envs : [];
  return {
    status: "checked",
    target,
    names: uniqueStrings(envs.map((entry) => entry.key || entry.name || "")).sort(),
    count: envs.length,
  };
}

function readLocalMigrations() {
  const dir = resolve(root, "supabase/migrations");
  if (!existsSync(dir)) return { total: 0, versions: [], files: [] };
  const files = readdirSync(dir)
    .filter((file) => /^\d{14}_.+\.sql$/.test(file))
    .sort();
  return {
    total: files.length,
    versions: files.map((file) => file.slice(0, 14)),
    files,
  };
}

function readLocalFunctionConfig() {
  const configPath = resolve(root, "supabase/config.toml");
  if (!existsSync(configPath)) return { total: 0, names: [], verifyJwt: {} };
  const text = readFileSync(configPath, "utf8");
  const names = [];
  const verifyJwt = {};
  const blockPattern = /\[functions\.([^\]]+)\]([\s\S]*?)(?=\n\[|$)/g;
  let match;
  while ((match = blockPattern.exec(text))) {
    const name = match[1].replace(/^"|"$/g, "");
    names.push(name);
    const verifyMatch = match[2].match(/verify_jwt\s*=\s*(true|false)/);
    if (verifyMatch) verifyJwt[name] = verifyMatch[1] === "true";
  }
  return {
    total: names.length,
    names: names.sort(),
    verifyJwt,
  };
}

function parseMigrationList(text) {
  const rows = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    const match = line.match(/^\s*(\d{14}|)\s*\|\s*(\d{14}|)\s*\|/);
    if (!match) continue;
    const local = match[1] || "";
    const remote = match[2] || "";
    if (local || remote) rows.push({ local, remote });
  }
  const versions = uniqueStrings(rows.flatMap((row) => [row.local, row.remote]).filter(Boolean)).sort();
  return {
    totalRows: rows.length,
    versions,
    rows,
  };
}

function compareMigrationVersions(localVersions, remoteVersions) {
  const local = new Set(localVersions || []);
  const remote = new Set(remoteVersions || []);
  return {
    localOnly: [...local].filter((version) => !remote.has(version)).sort(),
    remoteOnly: [...remote].filter((version) => !local.has(version)).sort(),
  };
}

function checkWorkflowWhitespaceGate() {
  const workflow = resolve(root, ".github/workflows/validate-static-site.yml");
  if (!existsSync(workflow)) return { present: false, command: "" };
  const text = readFileSync(workflow, "utf8");
  const hasDiffCheck = /git\s+diff\s+--check/.test(text);
  const hasRangeCheck = /BASE_SHA/.test(text) && /HEAD_SHA/.test(text);
  return {
    present: hasDiffCheck && hasRangeCheck,
    command: hasDiffCheck && hasRangeCheck ? "git diff --check BASE_SHA..HEAD_SHA" : "",
  };
}

function hasPackageScript(name) {
  const packageJson = readJson(resolve(root, "package.json")) || {};
  return Boolean(packageJson.scripts?.[name]);
}

function skippedSection(reason) {
  const section = { status: "skipped", reason };
  skipped.push(reason);
  if (strictProviders) failures.push(`provider evidence skipped: ${reason}`);
  return section;
}

function skipProvider(section, reason, result = null) {
  skipped.push(reason);
  section.status = "skipped";
  section.reason = reason;
  if (result?.stderr) section.error = summarizeCommandError(result.stderr);
  if (strictProviders) failures.push(`provider evidence skipped: ${reason}`);
  return section;
}

function commandVersion(command) {
  const result = run(command, ["--version"], { timeout: 15000 });
  return {
    available: result.ok,
    version: result.ok ? firstLine(result.stdout || result.stderr) : "",
  };
}

function run(command, commandArgs, options = {}) {
  const commandToRun = commandName(command);
  const useShell = process.platform === "win32" && /\.cmd$/i.test(commandToRun);
  const result = spawnSync(commandToRun, commandArgs, {
    cwd: root,
    encoding: "utf8",
    shell: useShell,
    timeout: options.timeout || 60000,
    env: process.env,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: sanitizeText(result.stdout || ""),
    stderr: sanitizeText(result.stderr || ""),
    error: result.error?.message || "",
  };
}

function commandName(command) {
  if (process.platform !== "win32") return command;
  if (command === "vercel" || command === "npm" || command === "npx") return `${command}.cmd`;
  return command;
}

function readGitState(repoPath) {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], repoPath);
  const head = git(["rev-parse", "HEAD"], repoPath);
  const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], repoPath);
  const dirty = git(["status", "--porcelain"], repoPath);
  const aheadBehind = git(["rev-list", "--left-right", "--count", "@{u}...HEAD"], repoPath);
  const noUpstream = /no upstream configured/i.test(`${upstream.stderr} ${aheadBehind.stderr}`);
  const [behind = "", ahead = ""] = firstLine(aheadBehind.stdout).split(/\s+/);
  return {
    branch: firstLine(branch.stdout),
    head: firstLine(head.stdout).slice(0, 12),
    upstream: firstLine(upstream.stdout),
    upstreamStatus: upstream.ok ? "configured" : noUpstream ? "none" : "unavailable",
    ahead: aheadBehind.ok ? Number(ahead) || 0 : 0,
    behind: aheadBehind.ok ? Number(behind) || 0 : 0,
    dirty: dirty.ok ? dirty.stdout.split(/\r?\n/).filter(Boolean) : ["git status unavailable"],
    errors: [branch, head, dirty, ...(upstream.ok || noUpstream ? [] : [upstream]), ...(aheadBehind.ok || noUpstream ? [] : [aheadBehind])]
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

function readJson(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(`${pathForReport(file)} is not valid JSON: ${error?.message || error}`);
    return null;
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function renderMarkdown(data) {
  const failureLines = data.failures.length ? data.failures.map((failure) => `- ${failure}`).join("\n") : "- None";
  const warningLines = data.warnings.length ? data.warnings.map((warning) => `- ${warning}`).join("\n") : "- None";
  const skippedLines = data.skipped.length ? data.skipped.map((reason) => `- ${reason}`).join("\n") : "- None";
  const scripts = data.local.requiredScripts;
  const files = data.local.requiredFiles;
  const migrations = data.supabase.remoteMigrations?.mismatch;

  return `# Mochirii Full-Stack Release Evidence

Generated: ${data.checkedAt}

This file is intentionally no-secret. It records release-readiness evidence only and omits raw tokens, service-role keys, webhook URLs, secret digests, private message content, cookies, and raw headers.

## Result

- OK: ${data.ok ? "yes" : "no"}
- Production URL: ${data.productionUrl}
- Provider reads: ${data.providerReadsEnabled ? "enabled" : "disabled"}
- Git branch: ${data.git.branch}
- Git head: ${data.git.head}
- Git dirty entries: ${data.git.dirty.length}

## Local Release Surface

- Required scripts present: ${scripts.present}/${scripts.total}
- Required files present: ${files.present}/${files.total}
- CI whitespace gate: ${data.local.workflowWhitespace.present ? data.local.workflowWhitespace.command : "missing"}

## Vercel

- Status: ${data.vercel.status}
- Production state: ${data.vercel.production?.readyState || "not checked"}
- Production aliases: ${(data.vercel.production?.aliases || []).join(", ") || "not checked"}
- Production env names: ${(data.vercel.environmentNames?.production?.names || []).join(", ") || "not checked"}
- Preview env names: ${(data.vercel.environmentNames?.preview?.names || []).join(", ") || "not checked"}

## Supabase

- Status: ${data.supabase.status}
- CLI version: ${data.supabase.cli?.version || "not checked"}
- Local migrations: ${data.supabase.localMigrations?.total ?? "not checked"}
- Remote migrations: ${data.supabase.remoteMigrations?.versions?.length ?? "not checked"}
- Migration local-only: ${(migrations?.localOnly || []).join(", ") || "none/not checked"}
- Migration remote-only: ${(migrations?.remoteOnly || []).join(", ") || "none/not checked"}
- Local function config count: ${data.supabase.localFunctions?.total ?? "not checked"}
- Remote function count: ${data.supabase.remoteFunctions?.total ?? "not checked"}
- Inactive remote functions: ${(data.supabase.remoteFunctions?.inactive || []).join(", ") || "none/not checked"}
- Secrets: ${data.supabase.secrets || "not read"}

## Discord And Reaper

- Slash-command registration script: ${data.discordReaper.slashCommandRepairPath.registerScript ? "present" : "missing"}
- Rollback script: ${data.discordReaper.slashCommandRepairPath.rollbackScript ? "present" : "missing"}
- Discord-native safety audit: ${data.discordReaper.discordNativeSafetyAudit ? "present" : "missing"}
- Gateway direct permission mutation expected here: ${data.discordReaper.gatewayAutomation.directDiscordMutationExpectedHere ? "yes" : "no"}

## Mochi Social, Fly, And Enjin

- Mochi Social preview report present: ${data.mochiSocial.previewReadyReportPresent ? "yes" : "no"}
- Mochi Social hosted checks allowed in last report: ${data.mochiSocial.previewReadyReport?.hostedChecksAllowed ? "yes" : "no/not checked"}
- Fly deployment requires separate approval: ${data.mochiSocial.hostedFlyDeployRequiresSeparateApproval ? "yes" : "no"}
- Enjin preview-only expected: ${data.enjin.previewOnlyExpected ? "yes" : "no"}
- Enjin funded-chain actions authorized: ${data.enjin.fundedChainActionsAuthorized ? "yes" : "no"}

## Warnings

${warningLines}

## Skipped

${skippedLines}

## Failures

${failureLines}
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
    { label: "secret digest", pattern: /\b(?:digest|secretDigest|secret_digest|keyDigest|key_digest)\b/i },
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
  value = value.replace(/\b(?:digest|secretDigest|secret_digest|keyDigest|key_digest)\b\s*[:=]\s*["']?[^,\s"'}]+/gi, "[redacted-digest]");
  return value;
}

function summarizeCommandError(text) {
  return sanitizeText(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 2).join(" ");
}

function safeUrl(value) {
  const url = String(value || "");
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function firstLine(text) {
  return String(text || "").split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "";
}

function pathForReport(file) {
  const normalized = resolve(file).replace(/\\/g, "/");
  const normalizedRoot = root.replace(/\\/g, "/");
  if (normalized.startsWith(`${normalizedRoot}/`)) return relative(root, file).replace(/\\/g, "/");
  return normalized;
}
