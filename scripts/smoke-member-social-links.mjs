import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer as createNetServer } from "node:net";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium, firefox, webkit } from "playwright";

const root = process.cwd();
const webRoot = resolve(root, "apps/web");
const nextBin = resolve(webRoot, "node_modules/next/dist/bin/next");
const supabaseCli = resolve(root, "node_modules/supabase/dist/supabase.js");
const axePath = resolve(root, "node_modules/axe-core/axe.min.js");
const port = await reserveLoopbackPort();
const baseUrl = `http://127.0.0.1:${port}`;
const local = readLocalSupabaseStatus();
const publishableKey = local.PUBLISHABLE_KEY || local.ANON_KEY;
const environment = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  NEXT_PUBLIC_SITE_URL: baseUrl,
};
const admin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const email = `profile-links-smoke-${Date.now()}@example.invalid`;
const password = `${randomUUID()}Aa1!`;
let userId = "";
let server = null;
let serverOutput = "";

try {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Profile Links Smoke" },
  });
  if (created.error || !created.data.user) throw created.error || new Error("Could not create the local smoke user.");
  userId = created.data.user.id;

  const profileUpdate = await admin
    .from("member_profiles")
    .update({
      member_status: "active",
      has_required_discord_roles: true,
      discord_verified_at: new Date().toISOString(),
      discord_checked_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (profileUpdate.error) throw profileUpdate.error;

  await verifyConcurrentLinkLimit();

  if (process.env.MEMBER_SOCIAL_LINKS_SMOKE_SKIP_BUILD !== "1") {
    await runChild(process.execPath, [nextBin, "build"], {
      cwd: webRoot,
      env: environment,
      stdio: "inherit",
    }, "member profile-link production build", 5 * 60_000);
  }

  server = spawn(process.execPath, [nextBin, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: webRoot,
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => { serverOutput = boundedOutput(serverOutput, chunk); });
  server.stderr.on("data", (chunk) => { serverOutput = boundedOutput(serverOutput, chunk); });
  await waitUntilReady(server, `${baseUrl}/account`);

  for (const [browserName, browserType] of [["Chromium", chromium], ["Firefox", firefox], ["WebKit", webkit]]) {
    await clearMemberLinks();
    const authClient = createClient(local.API_URL, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const signedIn = await authClient.auth.signInWithPassword({ email, password });
    if (signedIn.error || !signedIn.data.session) throw signedIn.error || new Error(`${browserName}: local sign-in failed.`);
    await runBrowser(browserName, browserType, signedIn.data.session, browserName === "Firefox" ? "clipboard" : "share");
    await authClient.auth.signOut({ scope: "local" });
    await clearMemberLinks();
  }

  console.log("Member profile-link browser smoke passed in Chromium, Firefox, and WebKit.");
} finally {
  await stopChild(server);
  if (userId) {
    await clearMemberLinks();
    const deleted = await admin.auth.admin.deleteUser(userId, false);
    if (deleted.error) throw new Error("Local member profile-link smoke user cleanup failed.");
  }
}

async function runBrowser(browserName, browserType, session, shareMode) {
  const browser = await browserType.launch({
    headless: true,
    ...(browserName === "Chromium"
      ? { args: ["--disable-features=LocalNetworkAccessChecks"] }
      : {}),
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const providerRequests = [];
  await context.route(`${local.API_URL}/**`, async (route) => {
    try {
      const response = await route.fetch({ timeout: 15_000 });
      await route.fulfill({
        response,
        headers: {
          ...response.headers(),
          "access-control-allow-origin": baseUrl,
          "access-control-allow-credentials": "true",
          "access-control-allow-private-network": "true",
        },
      });
    } catch {
      await route.abort("failed").catch(() => {});
    }
  });
  await context.route(`${local.API_URL}/functions/v1/verify-member-access`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: corsFixtureHeaders(),
    body: JSON.stringify({ ok: true, data: { accessGranted: true, identities: [] } }),
  }).catch(() => {}));
  await context.route(`${local.API_URL}/functions/v1/list-gallery-review-queue`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: corsFixtureHeaders(),
    body: JSON.stringify({ ok: true, data: { hasAccess: false } }),
  }).catch(() => {}));
  await context.route(`${baseUrl}/**`, async (route) => {
    try {
      const response = await route.fetch();
      const headers = { ...response.headers() };
      delete headers["content-security-policy"];
      delete headers["content-security-policy-report-only"];
      await route.fulfill({ response, headers });
    } catch {
      await route.abort("failed").catch(() => {});
    }
  });
  await context.route(`${baseUrl}/_vercel/**`, (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: "",
  }).catch(() => {}));
  context.on("request", (request) => {
    const hostname = new URL(request.url()).hostname.toLowerCase();
    if (["instagram.com", "www.instagram.com", "example.org"].includes(hostname)) providerRequests.push(hostname);
  });
  await context.addInitScript((mode) => {
    if (mode === "share") {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async (payload) => { window.__memberLinkShare = payload; },
      });
      return;
    }
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (value) => { window.__memberLinkClipboard = value; } },
    });
  }, shareMode);
  await context.addInitScript(({ storageKey, sessionValue }) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(sessionValue));
    } catch {
      // The script also runs for initial opaque documents where storage is unavailable.
    }
  }, {
    storageKey: `sb-${new URL(local.API_URL).hostname.split(".")[0]}-auth-token`,
    sessionValue: session,
  });

  try {
    const page = await context.newPage();
    const authResponses = [];
    const browserErrors = [];
    const failedRequests = [];
    const httpErrors = [];
    page.on("pageerror", (error) => browserErrors.push(sanitizeDiagnostic(error.message).slice(0, 300)));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(sanitizeDiagnostic(message.text()).slice(0, 300));
    });
    page.on("requestfailed", (request) => {
      const url = new URL(request.url());
      const failure = request.failure()?.errorText || "failed";
      const responsiveImageWasSuperseded = url.origin === baseUrl
        && url.pathname === "/_next/image"
        && ["net::ERR_ABORTED", "NS_BINDING_ABORTED"].includes(failure);
      if (responsiveImageWasSuperseded) return;
      failedRequests.push(`${url.origin}${url.pathname}: ${sanitizeDiagnostic(failure)}`);
    });
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (response.status() >= 400) httpErrors.push(`${url.origin}${url.pathname}: ${response.status()}`);
      if (url.origin === new URL(local.API_URL).origin && url.pathname.startsWith("/auth/")) {
        authResponses.push({ path: url.pathname, status: response.status() });
      }
    });
    await page.goto(`${baseUrl}/account`, { waitUntil: "domcontentloaded" });
    try {
      await page.getByRole("heading", { name: "Connected Profiles" }).waitFor();
      await page.waitForLoadState("load");
    } catch {
      const state = await page.evaluate((storageKey) => {
        let sessionShape = null;
        try {
          const session = JSON.parse(window.localStorage.getItem(storageKey) || "null");
          sessionShape = session ? {
            hasAccessToken: typeof session.access_token === "string" && session.access_token.length > 0,
            hasRefreshToken: typeof session.refresh_token === "string" && session.refresh_token.length > 0,
            expiresAt: session.expires_at || null,
            now: Math.floor(Date.now() / 1000),
            hasUser: Boolean(session.user?.id),
          } : null;
        } catch {
          sessionShape = { invalidJson: true };
        }
        return {
          path: window.location.pathname,
          storageKeys: Object.keys(window.localStorage),
          sessionShape,
          body: (document.body.innerText || "").replace(/\s+/g, " ").slice(0, 300),
        };
      }, `sb-${new URL(local.API_URL).hostname.split(".")[0]}-auth-token`);
      state.authResponses = authResponses;
      state.browserErrors = browserErrors;
      throw new Error(`${browserName}: Account did not reach the signed-in profile-link panel: ${JSON.stringify(state)}.`);
    }

    const form = page.locator(".member-social-links__form");
    await form.getByLabel("HTTPS profile link").fill("https://instagram.com/mochirii");
    await form.getByRole("button", { name: "Add profile link" }).click();
    await page.getByRole("status").filter({ hasText: "Profile link added." }).waitFor();
    await expectText(page.locator(".member-social-link").first(), "Private", `${browserName}: new links must stay private.`);

    await form.getByLabel("Profile type").selectOption("custom");
    await form.getByLabel("Profile label").fill("Guild portfolio");
    await form.getByLabel("HTTPS profile link").fill("https://example.org/mochirii");
    await form.getByRole("button", { name: "Add profile link" }).click();
    await page.getByRole("status").filter({ hasText: "Profile link added." }).waitFor();

    const rows = page.locator(".member-social-link");
    if (await rows.count() !== 2) throw new Error(`${browserName}: expected two saved profile links.`);
    await rows.nth(1).getByRole("button", { name: /Move .* up/ }).click();
    await page.getByRole("status").filter({ hasText: "Profile-link order saved." }).waitFor();

    const instagramRow = rows.filter({ hasText: "Instagram" });
    await instagramRow.getByRole("button", { name: "Share with guild" }).click();
    await page.getByRole("status").filter({ hasText: "Profile link shared with verified guild members." }).waitFor();
    await page.getByRole("button", { name: "Share my guild profile links" }).click();
    if (shareMode === "share") {
      await page.waitForFunction((expected) => window.__memberLinkShare?.url === expected, `${baseUrl}/account?profile-links=${userId}`);
    } else {
      await page.waitForFunction((expected) => window.__memberLinkClipboard === expected, `${baseUrl}/account?profile-links=${userId}`);
    }
    await instagramRow.getByRole("button", { name: "Share link" }).click();
    if (shareMode === "share") {
      await page.waitForFunction(() => window.__memberLinkShare?.url === "https://instagram.com/mochirii");
    } else {
      await page.waitForFunction(() => window.__memberLinkClipboard === "https://instagram.com/mochirii");
    }

    await page.goto(`${baseUrl}/account?profile-links=${userId}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.getByRole("heading", { name: "Shared profile links" }).waitFor();
    await page.getByLabel("Shared profile links").getByRole("link", { name: "Instagram", exact: true }).waitFor();

    const customRow = rows.filter({ hasText: "Guild portfolio" });
    const removeButton = customRow.getByRole("button", { name: "Remove" });
    await removeButton.focus();
    await page.keyboard.press("Enter");
    const confirmButton = customRow.getByRole("button", { name: "Confirm removal" });
    if (!await confirmButton.evaluate((button) => button === document.activeElement)) {
      throw new Error(`${browserName}: removal confirmation did not retain keyboard focus.`);
    }
    await page.keyboard.press("Enter");
    await page.getByRole("status").filter({ hasText: "Profile link removed." }).waitFor();
    if (!await page.locator(".member-social-links__list").evaluate((list) => list === document.activeElement)) {
      throw new Error(`${browserName}: focus did not return to the saved-links region after removal.`);
    }

    for (const viewport of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await assertNoHorizontalOverflow(page, `${browserName} ${viewport.width}x${viewport.height}`);
      await assertControlsInsideViewport(page, `${browserName} ${viewport.width}x${viewport.height}`);
    }

    await page.setViewportSize({ width: 320, height: 568 });
    await page.addStyleTag({ content: "html{font-size:200%!important}" });
    await assertNoHorizontalOverflow(page, `${browserName} 320x568 at 200% text`);
    await assertControlsInsideViewport(page, `${browserName} 320x568 at 200% text`);

    if (existsSync(axePath)) {
      await page.addScriptTag({ path: axePath });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(document.querySelector(".member-social-links"), {
          resultTypes: ["violations"],
        });
        return result.violations
          .filter((violation) => ["critical", "serious"].includes(violation.impact || ""))
          .map((violation) => violation.id);
      });
      if (violations.length) throw new Error(`${browserName}: serious accessibility findings: ${violations.join(", ")}.`);
    }

    if (providerRequests.length) throw new Error(`${browserName}: saved profiles caused an external provider request.`);
    if (browserErrors.length) throw new Error(`${browserName}: browser errors: ${browserErrors.join(" | ")}.`);
    if (failedRequests.length) throw new Error(`${browserName}: failed requests: ${failedRequests.join(" | ")}.`);
    if (httpErrors.length) throw new Error(`${browserName}: HTTP errors: ${httpErrors.join(" | ")}.`);
  } finally {
    await context.unrouteAll({ behavior: "ignoreErrors" });
    await context.close();
    await browser.close();
  }
}

async function verifyConcurrentLinkLimit() {
  const clients = [0, 1].map(() => createClient(local.API_URL, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }));
  const sessions = await Promise.all(clients.map((client) => client.auth.signInWithPassword({ email, password })));
  if (sessions.some((result) => result.error || !result.data.session)) {
    throw new Error("Concurrent profile-link clients could not sign in to the local test stack.");
  }

  try {
    for (let round = 0; round < 5; round += 1) {
      await clearMemberLinks();
      const seeded = await admin.from("member_social_links").insert(
        Array.from({ length: 19 }, (_, index) => ({
          user_id: userId,
          provider: "custom",
          display_label: `Seed ${index + 1}`,
          profile_url: `https://example.org/member/${round}/seed-${index + 1}`,
          sort_order: index,
          is_visible: false,
        })),
      );
      if (seeded.error) throw new Error("Concurrent profile-link test setup failed.");

      const attempts = await Promise.all(clients.map((client, index) => client.rpc("create_member_social_link", {
        link_provider: "custom",
        link_display_label: `Concurrent ${index + 1}`,
        link_profile_url: `https://example.org/member/${round}/concurrent-${index + 1}`,
        link_is_visible: false,
      })));
      const successCount = attempts.filter(({ error }) => !error).length;
      const counted = await admin.from("member_social_links").select("id", { count: "exact", head: true }).eq("user_id", userId);
      if (counted.error || successCount !== 1 || counted.count !== 20) {
        throw new Error(`Concurrent profile-link limit failed in round ${round + 1}.`);
      }
    }
  } finally {
    await clearMemberLinks();
    await Promise.all(clients.map((client) => client.auth.signOut({ scope: "local" })));
  }
}

async function clearMemberLinks() {
  const removed = await admin.from("member_social_links").delete().eq("user_id", userId);
  if (removed.error) throw new Error("Local member profile-link cleanup failed.");
  const counted = await admin.from("member_social_links").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (counted.error || counted.count !== 0) throw new Error("Local member profile-link cleanup did not finish.");
}

function sanitizeDiagnostic(value) {
  return String(value || "")
    .replace(/Bearer\s+[^\s"']+/gi, "Bearer [redacted]")
    .replace(/\b[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g, "[redacted-token]");
}

function corsFixtureHeaders() {
  return {
    "access-control-allow-origin": baseUrl,
    "access-control-allow-credentials": "true",
    "access-control-allow-private-network": "true",
  };
}

async function expectText(locator, expected, message) {
  const text = await locator.innerText();
  if (!text.includes(expected)) throw new Error(message);
}

async function assertNoHorizontalOverflow(page, label) {
  const geometry = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  if (geometry.documentWidth > geometry.viewportWidth + 1) {
    throw new Error(`${label}: document overflowed horizontally.`);
  }
}

async function assertControlsInsideViewport(page, label) {
  const escaped = await page.locator(".member-social-links").evaluate((root) => {
    const viewportWidth = document.documentElement.clientWidth;
    return [...root.querySelectorAll("button,input,select,a")].some((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left < -1 || rect.right > viewportWidth + 1 || rect.width <= 0 || rect.height <= 0;
    });
  });
  if (escaped) throw new Error(`${label}: an interactive profile-link control escaped the viewport.`);
}

function readLocalSupabaseStatus() {
  if (!existsSync(supabaseCli)) throw new Error("The repository-local Supabase CLI is required.");
  const result = spawnSync(process.execPath, [supabaseCli, "status", "--output", "json"], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error("The local Supabase stack must be running before this smoke test.");
  const start = result.stdout.indexOf("{");
  const end = result.stdout.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Could not read local Supabase status.");
  return JSON.parse(result.stdout.slice(start, end + 1));
}

function reserveLoopbackPort() {
  return new Promise((resolvePort, reject) => {
    const socket = createNetServer();
    socket.unref();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const address = socket.address();
      if (!address || typeof address === "string") {
        socket.close(() => reject(new Error("Could not reserve a loopback port.")));
        return;
      }
      socket.close((error) => error ? reject(error) : resolvePort(address.port));
    });
  });
}

async function waitUntilReady(child, url) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Next.js exited before readiness.\n${serverOutput}`);
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status === 200) return;
    } catch {
      // The local production server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`Next.js did not become ready.\n${serverOutput}`);
}

function runChild(command, args, options, label, timeoutMs) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, options);
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      stopChild(child);
      reject(new Error(`${label} exceeded ${timeoutMs}ms.`));
    }, timeoutMs);
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      code === 0 ? resolveRun() : reject(new Error(`${label} failed with exit code ${code}.`));
    });
  });
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32" && child.pid) {
    execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  child.kill("SIGTERM");
}

function boundedOutput(current, chunk) {
  return `${current}${String(chunk)}`.slice(-20_000);
}
