import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "playwright";
import { redactRuntimeDiagnosticText } from "./lib/runtime-diagnostic-redaction.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const socialRoot = path.join(repositoryRoot, "services", "social");
const webRoot = path.join(repositoryRoot, "apps", "web");
const viewports = [
  { label: "320 portrait", width: 320, height: 568 },
  { label: "320 landscape", width: 568, height: 320 },
  { label: "360 portrait", width: 360, height: 800 },
  { label: "360 landscape", width: 800, height: 360 },
  { label: "390 portrait", width: 390, height: 844 },
  { label: "390 landscape", width: 844, height: 390 },
];
const engines = [
  ["Chromium", chromium],
  ["Firefox", firefox],
  ["WebKit", webkit],
];
const requestedEngine = String(process.env.MOCHIRII_SOCIAL_SMOKE_ENGINE || "").trim().toLowerCase();
const activeEngines = requestedEngine
  ? engines.filter(([name]) => name.toLowerCase() === requestedEngine)
  : engines;
if (!activeEngines.length) throw new Error(`Unknown MOCHIRII_SOCIAL_SMOKE_ENGINE: ${requestedEngine}`);
const allowedAnalyticsPaths = new Set([
  "/v1/script.js",
  "/v1/script.debug.js",
  "/v1/speed-insights/script.js",
  "/v1/speed-insights/script.debug.js",
]);

const port = await reservePort();
const baseUrl = `http://127.0.0.1:${port}`;
const serverOutput = [];
const server = spawn(
  "php",
  ["artisan", "serve", "--no-reload", "--host=127.0.0.1", `--port=${port}`],
  {
    cwd: socialRoot,
    env: {
      ...process.env,
      APP_ENV: "testing",
      APP_DEBUG: "false",
      APP_NAME: "Mochirii Social",
      APP_URL: baseUrl,
      APP_DOMAIN: "127.0.0.1",
      ADMIN_DOMAIN: "127.0.0.1",
      SESSION_DOMAIN: "127.0.0.1",
      CACHE_DRIVER: "array",
      SESSION_DRIVER: "array",
      OPEN_REGISTRATION: "false",
      PF_OIDC_ENABLED: "true",
      ACTIVITY_PUB: "false",
      AP_INBOX: "false",
      AP_OUTBOX: "false",
      AP_SHAREDINBOX: "false",
      ATOM_FEEDS: "false",
      NODEINFO: "false",
      WEBFINGER: "false",
      PF_NETWORK_TIMELINE: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);

for (const stream of [server.stdout, server.stderr]) {
  stream?.on("data", (chunk) => {
    const safe = redactRuntimeDiagnosticText(chunk);
    serverOutput.push(safe.trim());
    if (serverOutput.length > 20) serverOutput.shift();
  });
}

try {
  await waitForServer(`${baseUrl}/login`);

  let passed = 0;
  for (const [browserName, engine] of activeEngines) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const viewport of viewports) {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        const failures = [];

        page.on("console", (message) => {
          if (message.type() === "error") failures.push(`console: ${message.text()}`);
        });
        page.on("pageerror", (error) => failures.push(`page: ${error.message}`));
        page.on("requestfailed", (request) => failures.push(`request: ${request.url()} ${request.failure()?.errorText || "failed"}`));
        page.on("response", (response) => {
          if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${response.url()}`);
        });

        const response = await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
        assert(response?.status() === 200, `${browserName} ${viewport.label}: login returned ${response?.status()}`);

        const geometry = await page.evaluate(() => {
          const card = document.querySelector(".mochirii-social-card");
          const primary = document.querySelector(".mochirii-social-primary");
          const navFooterText = [...document.querySelectorAll("nav, footer")]
            .map((element) => element.textContent || "")
            .join(" ");
          const rect = card?.getBoundingClientRect();
          const buttonRect = primary?.getBoundingClientRect();
          const interactive = [...document.querySelectorAll("a, button, input")].map((element) => {
            const item = element.getBoundingClientRect();
            return { left: item.left, right: item.right, width: item.width, text: element.textContent || "" };
          });
          return {
            card: rect ? { left: rect.left, right: rect.right, width: rect.width, height: rect.height } : null,
            button: buttonRect ? { width: buttonRect.width, height: buttonRect.height } : null,
            clientWidth: document.documentElement.clientWidth,
            documentWidth: document.documentElement.scrollWidth,
            bodyWidth: document.body.scrollWidth,
            bodyText: document.body.innerText,
            navFooterText,
            hasCsrf: Boolean(document.querySelector('meta[name="csrf-token"][content]')),
            viewportMeta: document.querySelector('meta[name="viewport"]')?.getAttribute("content") || "",
            hasPasswordForm: Boolean(document.querySelector('form[action$="/login"]')),
            interactive,
          };
        });

        assert(geometry.card && geometry.card.width > 0 && geometry.card.height > 0, `${browserName} ${viewport.label}: login card is missing`);
        assert(geometry.documentWidth <= geometry.clientWidth + 1, `${browserName} ${viewport.label}: document overflows horizontally`);
        assert(geometry.bodyWidth <= geometry.clientWidth + 1, `${browserName} ${viewport.label}: body overflows horizontally`);
        assert(geometry.card.left >= -1 && geometry.card.right <= viewport.width + 1, `${browserName} ${viewport.label}: card escapes viewport`);
        assert(geometry.button && geometry.button.height >= 44, `${browserName} ${viewport.label}: primary control is shorter than 44px`);
        assert(geometry.hasCsrf, `${browserName} ${viewport.label}: CSRF metadata is missing`);
        assert(!/maximum-scale|user-scalable\s*=\s*no/i.test(geometry.viewportMeta), `${browserName} ${viewport.label}: zoom is restricted`);
        assert(!geometry.hasPasswordForm, `${browserName} ${viewport.label}: direct password form is visible`);
        assert(
          geometry.bodyText.includes("Internal guild social platform for profiles, photos & staying connected. Only verified members can access here & everything is private with no data sharing outside."),
          `${browserName} ${viewport.label}: exact public description is missing`,
        );
        assert(!/(pixelfed|fediverse|mastodon)/i.test(geometry.navFooterText), `${browserName} ${viewport.label}: public navigation exposes upstream branding`);
        for (const item of geometry.interactive) {
          if (item.width === 0) continue;
          assert(item.left >= -1 && item.right <= viewport.width + 1, `${browserName} ${viewport.label}: interactive control escapes viewport`);
        }
        assert(failures.length === 0, `${browserName} ${viewport.label}: ${failures.join(" | ")}`);

        await context.close();
        passed += 1;
      }
    } finally {
      await browser.close();
    }
  }

  console.log(`Mochirii Social login smoke passed ${passed}/${activeEngines.length * viewports.length} browser-viewport cases.`);
  await verifyConsentAuthorizationIdRoundTrip();
} catch (error) {
  if (serverOutput.length) console.error(serverOutput.join("\n"));
  throw error;
} finally {
  stopServer(server);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function reservePort() {
  return await new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const address = socket.address();
      const selected = typeof address === "object" && address ? address.port : 0;
      socket.close((error) => error ? reject(error) : resolve(selected));
    });
  });
}

async function waitForServer(url, child = server) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Local test server exited with code ${child.exitCode}`);
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status === 200) return;
    } catch {
      // The local server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Social test server did not become ready within 30 seconds");
}

function stopServer(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  child.kill("SIGTERM");
}

async function verifyConsentAuthorizationIdRoundTrip() {
  const webPort = await reservePort();
  const webBaseUrl = `http://localhost:${webPort}`;
  const nextCli = path.join(webRoot, "node_modules", "next", "dist", "bin", "next");
  const output = [];
  const webServer = spawn(
    process.execPath,
    [nextCli, "start", "--hostname", "127.0.0.1", "--port", String(webPort)],
    {
      cwd: webRoot,
      env: { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  for (const stream of [webServer.stdout, webServer.stderr]) {
    stream?.on("data", (chunk) => {
      const safe = redactRuntimeDiagnosticText(String(chunk));
      output.push(safe.trim());
      if (output.length > 20) output.shift();
    });
  }

  try {
    await waitForServer(`${webBaseUrl}/auth`, webServer);
    const authorizationId = "oauth-request_01HZYQ6R6D6M4M3Z9V5W8W3K7R";
    let passed = 0;

    for (const [browserName, engine] of activeEngines) {
      const browser = await engine.launch({ headless: true });
      try {
        // The production CSP upgrades insecure requests. Bypass it only for this
        // loopback HTTP harness; production CSP is validated separately.
        const context = await browser.newContext({
          viewport: { width: 390, height: 844 },
          bypassCSP: true,
        });
        const page = await context.newPage();
        const failures = [];

        await page.route("**/*", async (route) => {
          const url = new URL(route.request().url());
          if (
            (url.origin === webBaseUrl && ["/_vercel/insights/script.js", "/_vercel/speed-insights/script.js"].includes(url.pathname))
            || isAllowedAnalyticsUrl(url.href)
          ) {
            await route.fulfill({ status: 204, body: "" });
            return;
          }
          if (url.origin === webBaseUrl && route.request().resourceType() === "document") {
            const response = await route.fetch();
            const headers = { ...response.headers() };
            const policy = headers["content-security-policy"] || "";
            headers["content-security-policy"] = policy
              .split(";")
              .map((directive) => directive.trim())
              .filter((directive) => directive && directive.toLowerCase() !== "upgrade-insecure-requests")
              .join("; ");
            await route.fulfill({ response, headers });
            return;
          }
          await route.continue();
        });

        page.on("console", (message) => {
          if (message.type() === "error" && !isAllowedAnalyticsDiagnostic(message.text())) {
            failures.push(`console: ${redactRuntimeDiagnosticText(message.text())}`);
          }
        });
        page.on("pageerror", (error) => failures.push(`page: ${redactRuntimeDiagnosticText(error.message)}`));
        page.on("requestfailed", (request) => {
          if (!isAllowedAnalyticsUrl(request.url())) {
            failures.push(`request: ${redactRuntimeDiagnosticText(request.url())} ${request.failure()?.errorText || "failed"}`);
          }
        });
        page.on("response", (response) => {
          if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${redactRuntimeDiagnosticText(response.url())}`);
        });

        const response = await page.goto(
          `${webBaseUrl}/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`,
          { waitUntil: "networkidle" },
        );
        assert(response?.status() === 200, `${browserName}: consent returned ${response?.status()}`);

        const panel = page.locator("section.auth-panel");
        try {
          await panel.waitFor({ state: "visible" });
          await page.waitForFunction(() => document.querySelector("section.auth-panel")?.getAttribute("aria-busy") === "false");
        } catch (error) {
          throw new Error(`${browserName}: consent hydration failed${failures.length ? `: ${failures.join(" | ")}` : ""}`, { cause: error });
        }
        const links = await panel.locator("a").evaluateAll((anchors) => anchors.map((anchor) => ({
          href: anchor.getAttribute("href") || "",
          label: (anchor.textContent || "").trim(),
        })));
        const href = links.find((item) => item.href.startsWith("/auth?redirect=") && /^Login(?: again)?$/.test(item.label))?.href || "";
        assert(Boolean(href), `${browserName}: consent login link is missing`);

        const loginUrl = new URL(String(href), webBaseUrl);
        const redirect = loginUrl.searchParams.get("redirect");
        assert(loginUrl.pathname === "/auth", `${browserName}: consent login link targets the wrong route`);
        assert(Boolean(redirect), `${browserName}: consent login link drops the return route`);

        const consentUrl = new URL(String(redirect), webBaseUrl);
        assert(consentUrl.pathname === "/oauth/consent", `${browserName}: nested return route is not consent`);
        assert(
          consentUrl.searchParams.get("authorization_id") === authorizationId,
          `${browserName}: browser login round trip changes the authorization id`,
        );
        assert(!/(pixelfed|fediverse|mastodon)/i.test(await page.locator("nav, footer").allTextContents().then((parts) => parts.join(" "))), `${browserName}: Website navigation exposes upstream branding`);
        assert(failures.length === 0, `${browserName}: ${failures.join(" | ")}`);

        await context.close();
        passed += 1;
      } finally {
        await browser.close();
      }
    }

    console.log(`Mochirii OAuth consent browser round trip passed ${passed}/${activeEngines.length} browser engines.`);
  } catch (error) {
    if (output.length) console.error(output.join("\n"));
    throw error;
  } finally {
    stopServer(webServer);
  }
}

function isAllowedAnalyticsUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === "https://va.vercel-scripts.com" && allowedAnalyticsPaths.has(url.pathname);
  } catch {
    return false;
  }
}

function isAllowedAnalyticsDiagnostic(value) {
  return [...allowedAnalyticsPaths].some((pathname) => value.includes(`https://va.vercel-scripts.com${pathname}`));
}
