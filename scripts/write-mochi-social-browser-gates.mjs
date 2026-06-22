import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const credsDir = resolve(process.env.MOCHI_SOCIAL_CREDS_DIR || defaultCredsDir());
const reportPath = resolve(root, process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_JSON || "reports/mochi-social-browser-gates.json");
const reportMdPath = resolve(root, process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_MD || "reports/mochi-social-browser-gates.md");
const handoffPath = resolve(credsDir, process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_HANDOFF || "mochirii-mochi-social-browser-gates.md");
const hostedChecksAllowed = process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_ALLOW_HOSTED === "true" || process.env.MOCHI_SOCIAL_SITE_PREVIEW_READY_ALLOW_HOSTED === "true";
const accessMode = normalizeBrowserGateMode(process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_ACCESS_MODE || process.env.MOCHI_SOCIAL_ALPHA_ACCESS_MODE || "supabase");
const requiredGateEnv = browserGateEnvForMode(accessMode);

const confirmed = process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_CONFIRMED === "true";
const reviewer = sanitize(process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER || "");
const browser = sanitize(process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER || "");
const reviewUrl = sanitize(process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_URL || "");
const notes = sanitize(process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_NOTES || "");
const requiredGates = requiredGateEnv.map(([envName, label]) => ({
  envName,
  label,
  ok: process.env[envName] === "true",
}));

const failures = [];
if (!confirmed) failures.push("manual browser gates have not been confirmed");
if (confirmed && !reviewer) failures.push("MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER is required");
if (confirmed && !browser) failures.push("MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER is required");
if (confirmed && !reviewUrl) failures.push("MOCHI_SOCIAL_SITE_BROWSER_GATES_URL is required");
const missingGates = requiredGates.filter((gate) => !gate.ok);
if (confirmed && missingGates.length) {
  failures.push(`manual browser gates missing confirmations: ${missingGates.map((gate) => gate.envName).join(", ")}`);
}
if (reviewUrl && isHostedUrl(reviewUrl) && !hostedChecksAllowed) {
  failures.push("hosted browser gate evidence requires MOCHI_SOCIAL_SITE_BROWSER_GATES_ALLOW_HOSTED=true or MOCHI_SOCIAL_SITE_PREVIEW_READY_ALLOW_HOSTED=true after explicit approval");
}

const report = {
  ok: failures.length === 0,
  checkedAt: new Date().toISOString(),
  scope: "Mochirii Mochi Social no-secret manual browser gate evidence. This report records only pass/fail browser-gate metadata and never stores tokens, cookies, emails, raw headers, provider secrets, or screenshots.",
  accessMode,
  hostedChecksAllowed,
  reviewer: reviewer || null,
  browser: browser || null,
  url: reviewUrl || null,
  notes: notes || null,
  requiredGates,
  failures,
  git: readGitState(root),
};

const markdown = renderMarkdown(report);
assertNoForbiddenMaterial(JSON.stringify(report), "browser gate JSON report");
assertNoForbiddenMaterial(markdown, "browser gate Markdown report");

await mkdir(dirname(reportPath), { recursive: true });
await mkdir(dirname(reportMdPath), { recursive: true });
await mkdir(dirname(handoffPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(reportMdPath, markdown, "utf8");
await writeFile(handoffPath, markdown, "utf8");

if (!report.ok) {
  console.error(`Mochi Social browser gate evidence is incomplete: ${failures.join("; ")}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log(`Mochi Social browser gate evidence passed. Report: ${reportPath}`);
console.log(`Markdown: ${reportMdPath}`);

function renderMarkdown(reportData) {
  const lines = [
    "# Mochi Social Browser Gate Evidence",
    "",
    "This file is intentionally no-secret. It records manual browser gate status only.",
    "",
    `- Status: ${reportData.ok ? "pass" : "pending"}`,
    `- Checked at: ${reportData.checkedAt}`,
    `- Reviewer: ${reportData.reviewer || "not recorded"}`,
    `- Browser: ${reportData.browser || "not recorded"}`,
    `- URL: ${reportData.url || "not recorded"}`,
    `- Access mode: ${reportData.accessMode || "supabase"}`,
    `- Hosted approval flag: ${reportData.hostedChecksAllowed ? "true" : "false"}`,
    `- Git branch: ${reportData.git.branch || "unknown"}`,
    `- Git HEAD: ${reportData.git.localHead || "unknown"}`,
    "",
    "## Required Gates",
    "",
    ...reportData.requiredGates.map((gate) => `- ${gate.ok ? "[x]" : "[ ]"} ${gate.label} (${gate.envName})`),
  ];
  if (reportData.notes) {
    lines.push("", "## No-Secret Notes", "", reportData.notes);
  }
  if (reportData.failures.length) {
    lines.push("", "## Pending", "", ...reportData.failures.map((failure) => `- ${failure}`));
  }
  lines.push("", "Do not add screenshots, access tokens, cookies, request headers, service-role keys, Discord secrets, Enjin secrets, wallet seed material, or account emails to this file.", "");
  return `${lines.join("\n")}`;
}

function readGitState(repoPath) {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], repoPath);
  const localHead = git(["rev-parse", "HEAD"], repoPath);
  const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], repoPath);
  const dirty = git(["status", "--porcelain"], repoPath);
  return {
    branch: branch.ok ? firstLine(branch.stdout) : "",
    localHead: localHead.ok ? firstLine(localHead.stdout) : "",
    upstream: upstream.ok ? firstLine(upstream.stdout) : "",
    dirty: dirty.ok ? dirty.stdout.split(/\r?\n/).filter(Boolean) : ["git status unavailable"],
    errors: [branch, localHead, upstream, dirty].filter((result) => !result.ok).map((result) => result.stderr || result.error || "git command failed"),
  };
}

function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", shell: false });
  return {
    ok: result.status === 0,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    error: result.error?.message || "",
  };
}

function firstLine(text) {
  return (text || "").split(/\r?\n/).find(Boolean) || "";
}

function sanitize(value) {
  return String(value || "")
    .replace(/\b(?:eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9._-]{20,}|gh[pousr]_[a-zA-Z0-9_]{20,}|sk_[a-zA-Z0-9_]{20,}|xox[baprs]-[a-zA-Z0-9-]{20,})\b/g, "[redacted-secret]")
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[redacted-email]")
    .slice(0, 2000);
}

function normalizeBrowserGateMode(value) {
  return value === "tester-password" ? "tester-password" : "supabase";
}

function browserGateEnvForMode(mode) {
  if (mode === "tester-password") {
    return [
      ["MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_LOCKED_OK", "tester-password locked page visible"],
      ["MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_IFRAME_ABSENT_OK", "iframe absent before tester-password unlock"],
      ["MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_INVALID_ERROR_OK", "invalid tester password shows accessible inline error"],
      ["MOCHI_SOCIAL_SITE_BROWSER_IFRAME_LOADS_OK", "iframe loads after tester-password unlock"],
      ["MOCHI_SOCIAL_SITE_BROWSER_AUTH_BRIDGE_OK", "guest bridge sends sign-out/no access token only"],
      ["MOCHI_SOCIAL_SITE_BROWSER_NO_REAL_VALUE_OK", "no-real-value alpha copy is visible"],
      ["MOCHI_SOCIAL_SITE_BROWSER_GAME_PRESENCE_OK", "two hosted game tabs show nearby tester presence"],
    ];
  }

  return [
    ["MOCHI_SOCIAL_SITE_BROWSER_SIGNED_OUT_BLOCKED_OK", "signed-out blocked"],
    ["MOCHI_SOCIAL_SITE_BROWSER_NON_TESTER_BLOCKED_OK", "signed-in non-tester blocked"],
    ["MOCHI_SOCIAL_SITE_BROWSER_TERMS_GATE_OK", "terms gate"],
    ["MOCHI_SOCIAL_SITE_BROWSER_IFRAME_LOADS_OK", "iframe loads after acknowledgement"],
    ["MOCHI_SOCIAL_SITE_BROWSER_AUTH_BRIDGE_OK", "MOCHI_SOCIAL_AUTH sends access token only"],
    ["MOCHI_SOCIAL_SITE_BROWSER_FEEDBACK_AUDIT_OK", "feedback appears in admin/audit"],
    ["MOCHI_SOCIAL_SITE_BROWSER_NO_REAL_VALUE_OK", "no-real-value alpha copy is visible"],
    ["MOCHI_SOCIAL_SITE_BROWSER_ADMIN_GRANT_REVOKE_OK", "admin grant/revoke works and intended tester state is restored"],
  ];
}

function assertNoForbiddenMaterial(text, label) {
  const forbidden = [
    /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9._-]{20,}/,
    /gh[pousr]_[a-zA-Z0-9_]{20,}/,
    /sk_[a-zA-Z0-9_]{20,}/,
    /xox[baprs]-[a-zA-Z0-9-]{20,}/,
    /SUPABASE_SERVICE_ROLE_KEY\s*=/i,
    /DISCORD_(?:CLIENT_SECRET|BOT_TOKEN)\s*=/i,
    /ENJIN_PLATFORM_TOKEN\s*=/i,
    /KEY_PASS\s*=/i,
    /PLATFORM_KEY\s*=/i,
    /wallet\.seed/i,
  ];
  const hit = forbidden.find((pattern) => pattern.test(text));
  if (hit) throw new Error(`${label} appears to contain forbidden secret material: ${hit}`);
}

function isHostedUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function defaultCredsDir() {
  const home = process.env.USERPROFILE || process.env.HOME || ".";
  return resolve(home, "Desktop", "Creds");
}
