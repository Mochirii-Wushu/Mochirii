import { execFileSync, spawn } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { resolve } from "node:path";
import { chromium, firefox, webkit } from "playwright";

const root = process.cwd();
const webRoot = resolve(root, "apps/web");
const nextBin = resolve(webRoot, "node_modules/next/dist/bin/next");
const port = await reserveLoopbackPort();
const baseUrl = `http://127.0.0.1:${port}`;
const syntheticAuthOrigin = baseUrl;
const expectedProviders = [
  ["Continue with Apple", "apple-logo.generated.svg"],
  ["Continue with Facebook", "facebook-login-mark.svg"],
  ["Continue with Google", "google-sign-in-dark-square.generated.svg"],
  ["Sign in with Discord", "discord-symbol-white.svg"],
  ["Log in with Twitch", "twitch-glitch-white.svg"],
  ["Log in with Spotify", "spotify-primary-logo-green.svg"],
];
const viewports = [
  { name: "compact phone", width: 320, height: 568 },
  { name: "current phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];
const engines = [
  ["Chromium", chromium],
  ["Firefox", firefox],
  ["WebKit", webkit],
];
const requestedEngine = String(process.env.MOCHIRII_AUTH_PROVIDER_SMOKE_ENGINE || "").trim().toLowerCase();
const activeEngines = requestedEngine
  ? engines.filter(([name]) => name.toLowerCase() === requestedEngine)
  : engines;
if (!activeEngines.length) throw new Error(`Unknown MOCHIRII_AUTH_PROVIDER_SMOKE_ENGINE: ${requestedEngine}`);
const environment = {
  ...process.env,
  NODE_ENV: "production",
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PUBLIC_SUPABASE_URL: syntheticAuthOrigin,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_browser_smoke_only",
  NEXT_PUBLIC_SITE_URL: baseUrl,
  NEXT_PUBLIC_AUTH_PROVIDER_IDS: "apple,facebook,google,discord,twitch,spotify",
  NEXT_PUBLIC_AUTH_IDENTITY_LINK_PROVIDER_IDS: "discord,google,twitch,apple",
  NEXT_PUBLIC_AUTH_PROVIDER_PLACEHOLDER_IDS: "",
  NEXT_PUBLIC_PHONE_AUTH_READY: "false",
  NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED: "false",
};

let server = null;
let serverOutput = "";

try {
  await runChild(
    process.execPath,
    [nextBin, "build"],
    { cwd: webRoot, env: environment, stdio: "inherit" },
    "authentication chooser production build",
    5 * 60_000,
  );
  server = spawn(process.execPath, [nextBin, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: webRoot,
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => { serverOutput = boundedOutput(serverOutput, chunk); });
  server.stderr.on("data", (chunk) => { serverOutput = boundedOutput(serverOutput, chunk); });
  await waitUntilReady(server, `${baseUrl}/auth`);

  for (const [engineName, browserType] of activeEngines) {
    const browser = await browserType.launch({ headless: true });
    try {
      for (const viewport of viewports) {
        await verifyChooser(browser, engineName, viewport);
      }
    } finally {
      await browser.close();
    }
  }

  console.log(`Authentication provider chooser smoke passed: ${activeEngines.length * viewports.length} responsive browser cases and ${activeEngines.length} synthetic Facebook handoffs.`);
} finally {
  await stopChild(server);
}

async function verifyChooser(browser, engineName, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: "reduce",
    bypassCSP: true,
  });
  const failures = [];
  const externalRequests = [];
  const syntheticRequests = [];
  const browserErrors = [];
  const page = await context.newPage();

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const locationUrl = message.location().url || "";
    if (locationUrl.startsWith(syntheticAuthOrigin) || isAnalyticsUrl(locationUrl)) return;
    browserErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => browserErrors.push(`page: ${error.message}`));

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === syntheticAuthOrigin && url.pathname.startsWith("/auth/v1/")) {
      syntheticRequests.push(url.href);
      return;
    }
    if (url.origin !== baseUrl) externalRequests.push(url.href);
  });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === syntheticAuthOrigin && url.pathname.startsWith("/auth/v1/")) {
      if (url.pathname === "/auth/v1/authorize") {
        await route.fulfill({
          status: 200,
          contentType: "text/html; charset=utf-8",
          headers: { "Cache-Control": "no-store" },
          body: "<!doctype html><title>Synthetic authorization boundary</title>",
        });
        return;
      }
      await route.fulfill({
        status: 401,
        contentType: "application/json; charset=utf-8",
        headers: { "Cache-Control": "no-store" },
        body: JSON.stringify({ message: "Auth session missing" }),
      });
      return;
    }
    if (
      isAnalyticsUrl(url.href)
      || (url.origin === baseUrl && ["/_vercel/insights/script.js", "/_vercel/speed-insights/script.js"].includes(url.pathname))
    ) {
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    if (url.origin === baseUrl && route.request().resourceType() === "document") {
      const response = await route.fetch();
      const headers = response.headers();
      const policy = headers["content-security-policy"];
      if (policy) {
        headers["content-security-policy"] = policy
          .split(";")
          .map((directive) => directive.trim())
          .filter((directive) => directive.toLowerCase() !== "upgrade-insecure-requests")
          .join("; ");
      }
      await route.fulfill({ response, headers });
      return;
    }
    await route.fallback();
  });

  try {
    const response = await page.goto(`${baseUrl}/auth`, { waitUntil: "domcontentloaded" });
    if (!response || response.status() !== 200) failures.push(`expected /auth 200, received ${response?.status() ?? "no response"}`);
    try {
      await page.getByRole("heading", { name: "Website Sign-In", exact: true }).waitFor();
    } catch {
      const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 600);
      throw new Error(`${engineName} ${viewport.name}: /auth did not render the sign-in heading at ${page.url()}. Browser errors: ${browserErrors.join(" | ") || "none"}. Body: ${bodyText}`);
    }
    try {
      await page.locator(".provider-grid .provider-button:not([disabled])").first().waitFor({ state: "visible" });
    } catch {
      const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 600);
      throw new Error(`${engineName} ${viewport.name}: provider controls did not hydrate. Browser errors: ${browserErrors.join(" | ") || "none"}. Body: ${bodyText}`);
    }

    for (const [label, assetName] of expectedProviders) {
      const button = page.getByRole("button").filter({ hasText: label });
      if (await button.count() !== 1) {
        failures.push(`${label}: expected one enabled button`);
        continue;
      }
      if (await button.isDisabled()) failures.push(`${label}: unexpectedly disabled`);
      const image = button.locator("img");
      const src = await image.getAttribute("src");
      if (!src?.endsWith(`/assets/auth-providers/${assetName}`)) failures.push(`${label}: unexpected logo source ${src || "missing"}`);
      const imageBox = await image.boundingBox();
      if (!imageBox || imageBox.width <= 0 || imageBox.height <= 0) failures.push(`${label}: logo has no rendered geometry`);
      const buttonBox = await button.boundingBox();
      if (!buttonBox || buttonBox.height < 44) failures.push(`${label}: button is below the 44px touch target`);
      if (buttonBox && (buttonBox.x < -0.5 || buttonBox.x + buttonBox.width > viewport.width + 0.5)) {
        failures.push(`${label}: button escapes the ${viewport.width}px viewport`);
      }
    }

    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      facebookAccessibleName: document.querySelector(".provider-logo--facebook")?.closest("button")?.innerText || "",
    }));
    if (layout.scrollWidth > layout.viewportWidth + 1) failures.push(`horizontal overflow ${layout.scrollWidth}px > ${layout.viewportWidth}px`);
    if (!layout.facebookAccessibleName.includes("Continue with Facebook")) failures.push("Facebook label is not present in the button name content");

    if (viewport.name === "desktop") {
      const facebook = page.getByRole("button").filter({ hasText: "Continue with Facebook" });
      await Promise.all([
        page.waitForURL((url) => url.origin === syntheticAuthOrigin && url.pathname === "/auth/v1/authorize"),
        facebook.click(),
      ]);
      const handoff = new URL(page.url());
      if (handoff.searchParams.get("provider") !== "facebook") failures.push("synthetic handoff did not select Facebook");
      if (!handoff.searchParams.get("redirect_to")?.startsWith(`${baseUrl}/auth/callback`)) {
        failures.push("synthetic handoff did not preserve the reviewed same-origin callback");
      }
      const authorizeRequests = syntheticRequests.filter((value) => new URL(value).pathname === "/auth/v1/authorize");
      if (authorizeRequests.length !== 1) failures.push(`expected one synthetic authorize navigation, received ${authorizeRequests.length}`);
    }

    const forbiddenProviderRequests = externalRequests.filter((value) => /(^|\.)facebook\.com$|(^|\.)fbcdn\.net$|(^|\.)meta\.com$/i.test(new URL(value).hostname));
    if (forbiddenProviderRequests.length) failures.push("a real Meta or Facebook request escaped the synthetic boundary");
    if (browserErrors.length) failures.push(`unexpected browser errors: ${browserErrors.join(" | ")}`);
  } finally {
    await context.close();
  }

  if (failures.length) {
    throw new Error(`${engineName} ${viewport.name} (${viewport.width}x${viewport.height}) failed:\n- ${failures.join("\n- ")}`);
  }
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
      // The local server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`Next.js did not become ready.\n${serverOutput}`);
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32" && child.pid) {
    execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  child.kill("SIGTERM");
}

function runChild(command, args, options, label, timeoutMs) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, options);
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      void stopChild(child);
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

function isAnalyticsUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === "https://va.vercel-scripts.com"
      && ["/v1/script.js", "/v1/script.debug.js", "/v1/speed-insights/script.js", "/v1/speed-insights/script.debug.js"].includes(url.pathname);
  } catch {
    return false;
  }
}

function boundedOutput(current, chunk) {
  return `${current}${String(chunk)}`.slice(-20_000);
}
