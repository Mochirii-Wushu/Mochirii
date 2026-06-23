import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const root = process.cwd();
const appDir = join(root, "apps", "web");
const buildIdPath = join(appDir, ".next", "BUILD_ID");
const reportPath = resolve(root, process.env.MOCHI_SOCIAL_PRODUCTION_DOORWAY_JSON || "reports/mochi-social-production-doorway.json");
const reportMdPath = resolve(root, process.env.MOCHI_SOCIAL_PRODUCTION_DOORWAY_MD || "reports/mochi-social-production-doorway.md");
const port = Number(process.env.MOCHI_SOCIAL_DOORWAY_SMOKE_PORT || 0) || randomPort();
const baseUrl = `http://127.0.0.1:${port}`;
const route = "/games/mochi-social";
const testerPassword = `local-doorway-smoke-${Date.now()}`;
const gameOrigin = "http://127.0.0.1:1";
const cases = [];

if (!existsSync(buildIdPath)) {
  const message = "Mochi Social production doorway smoke needs a built Next app. Run: cd apps/web && npm run build";
  await writeReport({ ok: false, failure: message });
  console.error(message);
  process.exit(1);
}

const server = startNextServer();
try {
  await waitForReady();

  const locked = await fetchText(`${baseUrl}${route}`);
  assert.equal(locked.status, 200, "locked page should render");
  assertIncludes(locked.text, "Tester password", "locked page should show tester password field");
  assertIncludes(locked.text, "Unlock playtest", "locked page should show unlock button");
  assertIncludes(locked.text, "Closed Mochirii playtest", "locked page should describe the closed alpha");
  assertNoIframe(locked.text, "locked page");
  assertRobotsNoindex(locked.text, "locked page");
  assertPublicCopySafe(locked.text, "locked page");
  passCase("locked-page", "Password wall renders, stays noindex, and does not load the game iframe.");

  const invalid = await postPassword("wrong-password");
  assert.equal(invalid.status, 303, "invalid password should redirect");
  assert(invalid.location.endsWith(`${route}?tester_error=invalid`), "invalid password should redirect with tester_error=invalid");
  assert(!invalid.setCookie.includes("mochi_social_tester_access="), "invalid password must not set tester cookie");
  passCase("invalid-password-redirect", "Invalid tester password redirects without setting access.");

  const invalidPage = await fetchText(`${baseUrl}${route}?tester_error=invalid`);
  assertIncludes(invalidPage.text, "That password did not work.", "invalid page should show accessible error copy");
  assertNoIframe(invalidPage.text, "invalid password page");
  assertRobotsNoindex(invalidPage.text, "invalid password page");
  passCase("invalid-password-copy", "Invalid tester password page shows accessible error copy.");

  const valid = await postPassword(testerPassword);
  assert.equal(valid.status, 303, "valid password should redirect");
  assert(valid.location.endsWith(route), "valid password should redirect to the game page");
  assertIncludes(valid.setCookie, "mochi_social_tester_access=", "valid password should set tester cookie");
  assertIncludes(valid.setCookie.toLowerCase(), "httponly", "tester cookie should be HttpOnly");
  assertIncludes(valid.setCookie.toLowerCase(), "samesite=lax", "tester cookie should use SameSite=Lax");
  assertIncludes(valid.setCookie, `Path=${route}`, "tester cookie should be scoped to the game path");
  passCase("valid-password-cookie", "Valid tester password sets a path-scoped HttpOnly cookie.");

  const cookie = valid.setCookie.split(";")[0];
  const unlocked = await fetchText(`${baseUrl}${route}`, { headers: { cookie } });
  assert.equal(unlocked.status, 200, "unlocked shell should render");
  assertIncludes(unlocked.text, "Checking alpha access", "unlocked shell should require member access before saved play");
  assert(!unlocked.text.includes("Unlock playtest"), "unlocked shell should not show tester-password form");
  assertNoIframe(unlocked.text, "unlocked shell before member access");
  assertRobotsNoindex(unlocked.text, "unlocked shell");
  assertPublicCopySafe(unlocked.text, "unlocked shell");
  passCase("unlocked-member-gate", "Unlocked shell requires member access before loading the game iframe.");

  const logout = await fetch(`${baseUrl}${route}/tester-logout`, {
    method: "POST",
    headers: { cookie },
    redirect: "manual",
  });
  assert.equal(logout.status, 303, "logout should redirect");
  assertIncludes(logout.headers.get("set-cookie") || "", "Max-Age=0", "logout should expire tester cookie");
  passCase("tester-logout", "Tester logout expires the password-wall cookie.");

  await writeReport({ ok: true });
  console.log(`Mochi Social production doorway smoke passed for ${baseUrl}${route}`);
} catch (error) {
  await writeReport({ ok: false, failure: error instanceof Error ? error.message : String(error) });
  throw error;
} finally {
  if (!server.killed) server.kill();
}

function startNextServer() {
  const nextBin = join(appDir, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextBin, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: appDir,
    env: {
      ...stringEnv(process.env),
      NODE_ENV: "production",
      MOCHI_SOCIAL_ALPHA_ACCESS_MODE: "tester-password",
      MOCHI_SOCIAL_TESTER_PASSWORD: testerPassword,
      NEXT_PUBLIC_MOCHI_SOCIAL_URL: gameOrigin,
      NEXT_PUBLIC_SITE_URL: baseUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.output = "";
  child.stdout.on("data", (chunk) => {
    child.output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    child.output += chunk;
  });
  return child;
}

async function waitForReady() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next server exited early with code ${server.exitCode}.\n${server.output}`);
    }
    try {
      const response = await fetch(`${baseUrl}${route}`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {
      // Retry until the built server is listening.
    }
    await sleep(500);
  }
  throw new Error(`Next server did not become ready on ${baseUrl}.\n${server.output}`);
}

async function fetchText(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  });
  return {
    status: response.status,
    text: await response.text(),
    headers: response.headers,
  };
}

async function postPassword(password) {
  const response = await fetch(`${baseUrl}${route}/tester-login`, {
    method: "POST",
    body: new URLSearchParams({ testerPassword: password }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  });
  return {
    status: response.status,
    location: response.headers.get("location") || "",
    setCookie: response.headers.get("set-cookie") || "",
  };
}

function assertIncludes(text, snippet, message) {
  assert(String(text).includes(snippet), message);
}

function assertNoIframe(html, label) {
  assert(!/<iframe\b/i.test(html), `${label} must not render the game iframe before member access`);
}

function assertRobotsNoindex(html, label) {
  assert(/<meta\s+name="robots"\s+content="noindex,\s*nofollow"/i.test(html), `${label} must include noindex,nofollow robots meta`);
}

function assertPublicCopySafe(html, label) {
  const forbidden = [
    /\bconfigured-preview-stub\b/i,
    /\bEnjin\b/i,
    /\bCanary\b/i,
    /\bmarket\b/i,
    /\b(?:buying|selling)\b/i,
    /\btrad(?:e|es|ing)\b/i,
    /\bcashout\b/i,
    /\bfunded-chain\b/i,
    /\bpublic[- ](?:launch|release)\b/i,
    /\bwider release\b/i,
    /\b(?:Distributed Authority|Cloud Save|Edge Function|Unity Custom ID)\b/i,
    /\b(?:Codex|OpenAI|LLM|AI|agent|tooling)\b/i,
  ];
  const hit = forbidden.find((pattern) => pattern.test(html));
  assert(!hit, `${label} contains public forbidden wording: ${hit}`);
}

function passCase(id, message) {
  cases.push({ id, status: "pass", message });
}

async function writeReport({ ok, failure = "" }) {
  const report = {
    ok,
    checkedAt: new Date().toISOString(),
    scope: "Mochirii Mochi Social production doorway smoke. This local no-secret report verifies the tester password gate and member sign-in shell without provider mutation or hosted checks.",
    route,
    baseUrl,
    accessMode: "tester-password",
    gameOrigin: "local-unreachable-placeholder",
    providerActions: "none",
    testerPassword: "throwaway-redacted",
    cases,
    failure: failure ? sanitize(failure) : null,
    git: readGitState(root),
  };
  await mkdir(dirname(reportPath), { recursive: true });
  await mkdir(dirname(reportMdPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(reportMdPath, renderMarkdown(report), "utf8");
}

function renderMarkdown(report) {
  const rows = report.cases
    .map((item) => `| ${item.id} | ${item.status} | ${item.message.replace(/\|/g, "/")} |`)
    .join("\n") || "| none | none | Not run |";
  return `# Mochi Social Production Doorway Smoke

Generated: ${report.checkedAt}

This file is intentionally no-secret. It verifies the local production build of the Mochi Social tester doorway only. It does not approve provider mutations, hosted checks, deployment, Enjin funding, or public launch work.

## Result

- OK: ${report.ok ? "yes" : "no"}
- Route: ${report.route}
- Access mode: ${report.accessMode}
- Provider actions: ${report.providerActions}
- Game origin: ${report.gameOrigin}

## Cases

| Case | Status | Message |
| --- | --- | --- |
${rows}

## Failure

${report.failure ? `- ${report.failure}` : "- None"}
`;
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
    dirty: dirty.ok ? dirty.stdout.split(/\r?\n/).filter(Boolean).map((line) => sanitize(line)) : ["git status unavailable"],
    errors: [branch, localHead, upstream, dirty]
      .filter((result) => !result.ok)
      .map((result) => sanitize(result.stderr || result.error || "git command failed")),
  };
}

function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", shell: false });
  return {
    ok: result.status === 0,
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || "",
  };
}

function firstLine(value) {
  return String(value || "").split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "";
}

function sanitize(value) {
  return String(value || "")
    .replace(/\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/g, "<redacted-github-token>")
    .replace(/\bsb_secret_[A-Za-z0-9_-]{8,}\b/g, "<redacted-supabase-secret>")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "<redacted-jwt>")
    .slice(0, 1000);
}

function randomPort() {
  return 43000 + Math.floor(Math.random() * 10000);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stringEnv(env) {
  return Object.fromEntries(
    Object.entries(env)
      .filter((entry) => typeof entry[1] === "string")
      .map(([key, value]) => [key, value])
  );
}
