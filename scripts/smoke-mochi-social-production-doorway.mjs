import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const appDir = join(root, "apps", "web");
const buildIdPath = join(appDir, ".next", "BUILD_ID");
const port = Number(process.env.MOCHI_SOCIAL_DOORWAY_SMOKE_PORT || 0) || randomPort();
const baseUrl = `http://127.0.0.1:${port}`;
const testerPassword = `local-doorway-smoke-${Date.now()}`;
const gameOrigin = "http://127.0.0.1:1";

if (!existsSync(buildIdPath)) {
  console.error("Mochi Social production doorway smoke needs a built Next app. Run: cd apps/web && npm run build");
  process.exit(1);
}

const server = startNextServer();
try {
  await waitForReady();

  const locked = await fetchText(`${baseUrl}/games/mochi-social`);
  assert.equal(locked.status, 200, "locked page should render");
  assertIncludes(locked.text, "Tester password", "locked page should show tester password field");
  assertIncludes(locked.text, "Unlock playtest", "locked page should show unlock button");
  assertIncludes(locked.text, "Closed Mochirii playtest", "locked page should describe the closed alpha");
  assertNoIframe(locked.text, "locked page");
  assertRobotsNoindex(locked.text, "locked page");
  assertPublicCopySafe(locked.text, "locked page");

  const invalid = await postPassword("wrong-password");
  assert.equal(invalid.status, 303, "invalid password should redirect");
  assert(invalid.location.endsWith("/games/mochi-social?tester_error=invalid"), "invalid password should redirect with tester_error=invalid");
  assert(!invalid.setCookie.includes("mochi_social_tester_access="), "invalid password must not set tester cookie");

  const invalidPage = await fetchText(`${baseUrl}/games/mochi-social?tester_error=invalid`);
  assertIncludes(invalidPage.text, "That password did not work.", "invalid page should show accessible error copy");
  assertNoIframe(invalidPage.text, "invalid password page");
  assertRobotsNoindex(invalidPage.text, "invalid password page");

  const valid = await postPassword(testerPassword);
  assert.equal(valid.status, 303, "valid password should redirect");
  assert(valid.location.endsWith("/games/mochi-social"), "valid password should redirect to the game page");
  assertIncludes(valid.setCookie, "mochi_social_tester_access=", "valid password should set tester cookie");
  assertIncludes(valid.setCookie.toLowerCase(), "httponly", "tester cookie should be HttpOnly");
  assertIncludes(valid.setCookie.toLowerCase(), "samesite=lax", "tester cookie should use SameSite=Lax");
  assertIncludes(valid.setCookie, "Path=/games/mochi-social", "tester cookie should be scoped to the game path");

  const cookie = valid.setCookie.split(";")[0];
  const unlocked = await fetchText(`${baseUrl}/games/mochi-social`, { headers: { cookie } });
  assert.equal(unlocked.status, 200, "unlocked shell should render");
  assertIncludes(unlocked.text, "Checking alpha access", "unlocked shell should require member access before saved play");
  assert(!unlocked.text.includes("Unlock playtest"), "unlocked shell should not show tester-password form");
  assertNoIframe(unlocked.text, "unlocked shell before member access");
  assertRobotsNoindex(unlocked.text, "unlocked shell");
  assertPublicCopySafe(unlocked.text, "unlocked shell");

  const logout = await fetch(`${baseUrl}/games/mochi-social/tester-logout`, {
    method: "POST",
    headers: { cookie },
    redirect: "manual",
  });
  assert.equal(logout.status, 303, "logout should redirect");
  assertIncludes(logout.headers.get("set-cookie") || "", "Max-Age=0", "logout should expire tester cookie");

  console.log(`Mochi Social production doorway smoke passed for ${baseUrl}/games/mochi-social`);
} finally {
  server.kill();
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
      const response = await fetch(`${baseUrl}/games/mochi-social`, { signal: AbortSignal.timeout(1000) });
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
  const response = await fetch(`${baseUrl}/games/mochi-social/tester-login`, {
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
