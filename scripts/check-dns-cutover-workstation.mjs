import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const ghCommand = process.platform === "win32" ? "gh.exe" : "gh";

function denoBinary() {
  if (process.env.DENO_BIN) return process.env.DENO_BIN;

  const localInstall = path.join(os.homedir(), ".deno", "bin", process.platform === "win32" ? "deno.exe" : "deno");
  if (existsSync(localInstall)) return localInstall;

  return "deno";
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, CI: "1", ...(options.env || {}) },
    encoding: "utf8",
    stdio: "pipe",
    timeout: options.timeout || 15000,
  });
}

function firstLine(output) {
  return String(output || "").split(/\r?\n/).find(Boolean) || "";
}

function versionText(result) {
  return firstLine(result.stdout) || firstLine(result.stderr) || "version detected";
}

function checkCommand({ label, command, args = ["--version"], timeout }) {
  const result = run(command, args, { timeout });
  if (result.error) {
    return { ok: false, label, detail: `${label} is unavailable or timed out.` };
  }
  if (result.status !== 0) {
    return { ok: false, label, detail: `${label} command returned exit ${result.status}.` };
  }
  return { ok: true, label, detail: versionText(result) };
}

function checkPlaywrightBrowser() {
  const script = `
    import("playwright")
      .then(async ({ chromium }) => {
        const browser = await chromium.launch({ headless: true });
        await browser.close();
      })
      .catch(() => process.exit(1));
  `;
  const result = run(process.execPath, ["--input-type=module", "-e", script], { timeout: 30000 });
  if (result.error) {
    return { ok: false, label: "Playwright browser smoke", detail: "Playwright browser launch is unavailable or timed out." };
  }
  if (result.status !== 0) {
    return {
      ok: false,
      label: "Playwright browser smoke",
      detail: "Playwright import or headless Chromium launch failed.",
    };
  }
  return { ok: true, label: "Playwright browser smoke", detail: "headless Chromium launch OK" };
}

function checkAuth({ label, command, args }) {
  const result = run(command, args, { timeout: 20000 });
  if (result.error) {
    return { ok: false, label, detail: `${label} check is unavailable or timed out.` };
  }
  if (result.status !== 0) {
    return { ok: false, label, detail: `${label} is not ready; run the matching CLI auth/status command locally.` };
  }
  return { ok: true, label, detail: "authenticated; identity redacted" };
}

const checks = [
  checkCommand({ label: "Node.js", command: process.execPath, args: ["--version"] }),
  checkCommand({ label: "npm", command: npmCommand, args: ["--version"] }),
  checkCommand({ label: "Git", command: "git", args: ["--version"] }),
  checkCommand({ label: "Deno", command: denoBinary(), args: ["--version"] }),
];

if (process.env.SMOKE_BASE_URL) {
  checks.push({ ok: true, label: "Browser smoke base URL", detail: "SMOKE_BASE_URL supplied; local Python server not required" });
} else {
  checks.push(checkCommand({ label: "Python 3", command: "python3", args: ["--version"] }));
}

checks.push(
  checkPlaywrightBrowser(),
  checkCommand({ label: "GitHub CLI", command: ghCommand, args: ["--version"] }),
  checkAuth({ label: "GitHub CLI auth", command: ghCommand, args: ["auth", "status", "--hostname", "github.com"] }),
  checkCommand({ label: "Vercel CLI", command: npmCommand, args: ["exec", "--", "vercel", "--version"] }),
  checkAuth({ label: "Vercel CLI auth", command: npmCommand, args: ["exec", "--", "vercel", "whoami"] }),
);

const failures = checks.filter((check) => !check.ok);

console.log("DNS cutover workstation preflight (read-only).");
console.log("No account names, tokens, env values, or private packet values are printed.");

checks.forEach((check) => {
  const prefix = check.ok ? "OK" : "FAIL";
  console.log(`${prefix} ${check.label}: ${check.detail}`);
});

if (failures.length) {
  console.error("\nDNS cutover workstation preflight failed.");
  failures.forEach((failure) => console.error(`- ${failure.detail}`));
  console.error("Fix the local workstation prerequisites before running the same-window final readiness gate.");
  process.exit(1);
}

console.log("\nDNS cutover workstation preflight OK.");
