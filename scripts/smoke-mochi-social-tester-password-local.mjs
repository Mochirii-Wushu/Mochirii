import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const checkedAt = new Date().toISOString();
const reportPath = resolve(root, process.env.MOCHI_SOCIAL_TESTER_PASSWORD_LOCAL_JSON || "reports/mochi-social-tester-password-local.json");
const markdownPath = resolve(root, process.env.MOCHI_SOCIAL_TESTER_PASSWORD_LOCAL_MD || "reports/mochi-social-tester-password-local.md");
const providedBaseUrl = normalizeBaseUrl(process.env.MOCHI_SOCIAL_TESTER_PASSWORD_LOCAL_BASE_URL || "");
const localPassword = process.env.MOCHI_SOCIAL_TESTER_PASSWORD_LOCAL_VALUE || `local-mochi-preview-${randomUUID()}`;
const gamePort = await freePort();
const gameUrl = normalizeBaseUrl(process.env.MOCHI_SOCIAL_TESTER_PASSWORD_LOCAL_GAME_URL || `http://127.0.0.1:${gamePort}`);
const steps = [];
const failures = [];
let serverProcess = null;
let baseUrl = providedBaseUrl;

try {
  if (!baseUrl) {
    const sitePort = await freePort();
    baseUrl = `http://127.0.0.1:${sitePort}`;
    serverProcess = spawnLocalNextServer({ sitePort, gameUrl, localPassword });
  }

  await waitForRoute(baseUrl);
  await checkLockedPage(baseUrl);
  await checkInvalidPassword(baseUrl);
  const sessionCookie = await checkValidPassword(baseUrl);
  await checkUnlockedPage(baseUrl, sessionCookie);
  await checkLogout(baseUrl, sessionCookie);
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
} finally {
  if (serverProcess) await stopProcess(serverProcess);
}

const report = {
  ok: failures.length === 0,
  checkedAt,
  scope: "Localhost-only Mochi Social tester-password smoke. This starts or checks a local site route, verifies the closed-preview password gate, and does not contact hosted providers.",
  accessMode: "tester-password",
  baseUrl,
  gameUrl,
  spawnedLocalServer: Boolean(serverProcess),
  passwordMaterialStored: false,
  steps,
  failures,
  git: readGitState(root),
};

await mkdir(dirname(reportPath), { recursive: true });
await mkdir(dirname(markdownPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(markdownPath, renderMarkdown(report), "utf8");

if (!report.ok) {
  console.error("Mochi Social tester password local smoke failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("No tester password, cookies, or secrets were printed.");
  console.error("Report written to the configured local JSON report path.");
  process.exit(1);
}

console.log(`Mochi Social tester password local smoke OK (${steps.length} checks).`);
console.log("Report written to the configured local JSON report path.");

async function checkLockedPage(siteUrl) {
  const result = await request(siteUrl, "/games/mochi-social");
  assert(result.status === 200, `locked page should return 200, got ${result.status}`);
  assertIncludes(result.text, "Tester password required", "locked page tester password heading");
  assertIncludes(result.text, "Closed Mochirii playtest", "locked page closed preview copy");
  assertIncludes(result.text, "No real money", "locked page no-real-money copy");
  assert(!result.text.includes("<iframe"), "locked page must not render a game iframe");
  steps.push({ id: "locked-page", ok: true, status: result.status, detail: "Tester password gate renders without iframe." });
}

async function checkInvalidPassword(siteUrl) {
  const result = await postPassword(siteUrl, "wrong-local-preview-password");
  assert(result.status === 303, `invalid password should redirect with 303, got ${result.status}`);
  assertIncludes(result.location, "tester_error=invalid", "invalid password redirect");
  const sessionCookie = result.setCookies.find((cookie) => cookie.startsWith("mochi_social_tester_access="));
  assert(!sessionCookie, "invalid password must not set the tester session cookie");
  steps.push({ id: "invalid-password", ok: true, status: result.status, detail: "Invalid password redirects without session cookie." });
}

async function checkValidPassword(siteUrl) {
  const result = await postPassword(siteUrl, localPassword);
  assert(result.status === 303, `valid password should redirect with 303, got ${result.status}`);
  assert(result.location.endsWith("/games/mochi-social"), `valid password redirect should return to /games/mochi-social, got ${result.location}`);
  const sessionCookie = result.setCookies.find((cookie) => cookie.startsWith("mochi_social_tester_access="));
  assert(sessionCookie, "valid password must set the tester session cookie");
  assertIncludes(sessionCookie, "HttpOnly", "tester session cookie HttpOnly flag");
  assertIncludes(sessionCookie, "Path=/games/mochi-social", "tester session cookie path");
  assert(/SameSite=Lax/i.test(sessionCookie), "tester session cookie SameSite flag missing expected value: SameSite=Lax");
  steps.push({ id: "valid-password", ok: true, status: result.status, detail: "Valid password sets scoped HttpOnly tester cookie." });
  return sessionCookie.split(";")[0];
}

async function checkUnlockedPage(siteUrl, cookieHeader) {
  const result = await request(siteUrl, "/games/mochi-social", { headers: { Cookie: cookieHeader } });
  assert(result.status === 200, `unlocked page should return 200, got ${result.status}`);
  assertIncludes(result.text, "Mochi Social unlocked", "unlocked page heading");
  assertIncludes(result.text, "<iframe", "unlocked page iframe markup");
  assertIncludes(result.text, `${gameUrl}/embed`, "unlocked page iframe source");
  assertIncludes(result.text, "No real value", "unlocked page no-real-value copy");
  assertIncludes(result.text, "configured-preview-stub", "unlocked page Canary preview-stub copy");
  steps.push({ id: "unlocked-page", ok: true, status: result.status, detail: "Unlocked page renders iframe shell and no-real-value Canary copy." });
}

async function checkLogout(siteUrl, cookieHeader) {
  const result = await request(siteUrl, "/games/mochi-social/tester-logout", {
    method: "POST",
    headers: { Cookie: cookieHeader },
  });
  assert(result.status === 303, `logout should redirect with 303, got ${result.status}`);
  const clearedCookie = result.setCookies.find((cookie) => cookie.startsWith("mochi_social_tester_access="));
  assert(clearedCookie, "logout must clear the tester session cookie");
  assertIncludes(clearedCookie, "Max-Age=0", "logout cookie max age");
  assertIncludes(clearedCookie, "Path=/games/mochi-social", "logout cookie path");
  steps.push({ id: "logout", ok: true, status: result.status, detail: "Logout clears the scoped tester cookie." });
}

async function postPassword(siteUrl, password) {
  return request(siteUrl, "/games/mochi-social/tester-login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ testerPassword: password }),
  });
}

async function request(siteUrl, pathname, options = {}) {
  const response = await fetch(new URL(pathname, siteUrl), { redirect: "manual", ...options });
  return {
    status: response.status,
    location: response.headers.get("location") || "",
    setCookies: getSetCookies(response),
    text: await response.text(),
  };
}

async function waitForRoute(siteUrl) {
  const deadline = Date.now() + Number(process.env.MOCHI_SOCIAL_TESTER_PASSWORD_LOCAL_TIMEOUT_MS || 90000);
  let lastError = "";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(new URL("/games/mochi-social", siteUrl), { redirect: "manual" });
      await response.arrayBuffer();
      if (response.status === 200) {
        steps.push({ id: "server-ready", ok: true, status: response.status, detail: "Local site route responded." });
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(1000);
  }

  throw new Error(`local site route did not become ready at ${siteUrl}/games/mochi-social (${lastError || "timeout"})`);
}

function spawnLocalNextServer({ sitePort, gameUrl: nextGameUrl, localPassword: password }) {
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", `npm --prefix apps/web run dev -- --hostname 127.0.0.1 --port ${sitePort}`]
    : ["--prefix", "apps/web", "run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(sitePort)];
  const child = spawn(command, args, {
    cwd: root,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${sitePort}`,
      NEXT_PUBLIC_MOCHI_SOCIAL_URL: nextGameUrl,
      MOCHI_SOCIAL_ALPHA_ACCESS_MODE: "tester-password",
      MOCHI_SOCIAL_TESTER_PASSWORD: password,
    },
    stdio: ["ignore", "ignore", "ignore"],
    shell: false,
  });

  child.mochiSocialStopping = false;
  child.once("exit", (code, signal) => {
    if (child.mochiSocialStopping) return;
    if (code !== null && code !== 0) {
      failures.push(`local Next dev server exited early with code ${code}`);
    } else if (signal) {
      failures.push(`local Next dev server exited early from signal ${signal}`);
    }
  });

  return child;
}

async function stopProcess(child) {
  if (child.exitCode !== null || child.killed) return;
  child.mochiSocialStopping = true;
  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", shell: false });
    await sleep(500);
    return;
  }
  child.kill();
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    sleep(5000),
  ]);
}

function getSetCookies(response) {
  if (typeof response.headers.getSetCookie === "function") return response.headers.getSetCookie();
  const cookie = response.headers.get("set-cookie");
  return cookie ? [cookie] : [];
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  if (!String(text || "").includes(snippet)) throw new Error(`${label} missing expected text: ${snippet}`);
}

function renderMarkdown(reportData) {
  const stepRows = reportData.steps
    .map((step) => `| ${step.id} | ${step.ok ? "pass" : "fail"} | ${step.status ?? "n/a"} | ${step.detail} |`)
    .join("\n") || "| none | n/a | n/a | none |";
  const failureLines = reportData.failures.length
    ? reportData.failures.map((failure) => `- ${failure}`).join("\n")
    : "- None";
  return `# Mochi Social Tester Password Local Smoke

Generated: ${reportData.checkedAt}

This file is intentionally no-secret. It proves the localhost tester-password gate without recording the tester password, cookies, tokens, or hosted-provider evidence.

## Result

- OK: ${reportData.ok ? "yes" : "no"}
- Access mode: ${reportData.accessMode}
- Spawned local server: ${reportData.spawnedLocalServer ? "yes" : "no"}
- Password material stored: no

## Steps

| Step | Result | HTTP | Detail |
| --- | --- | --- | --- |
${stepRows}

## Failures

${failureLines}
`;
}

function readGitState(repoPath) {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], repoPath);
  const localHead = git(["rev-parse", "HEAD"], repoPath);
  const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], repoPath);
  const dirty = git(["status", "--porcelain"], repoPath);
  return {
    branch: firstLine(branch.stdout),
    localHead: firstLine(localHead.stdout),
    upstream: firstLine(upstream.stdout),
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
  return String(text || "").split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "";
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
