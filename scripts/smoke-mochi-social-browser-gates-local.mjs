import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const siteUrl = normalizeBaseUrl(process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_LOCAL_URL || process.env.MOCHI_SOCIAL_TESTER_PASSWORD_LOCAL_BASE_URL || "http://127.0.0.1:3000");
const gameUrl = normalizeBaseUrl(process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_GAME_URL || process.env.MOCHI_SOCIAL_TESTER_PASSWORD_LOCAL_GAME_URL || process.env.NEXT_PUBLIC_MOCHI_SOCIAL_URL || "http://127.0.0.1:3001");
const testerPassword = process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_TESTER_PASSWORD || process.env.MOCHI_SOCIAL_TESTER_PASSWORD_LOCAL_VALUE || process.env.MOCHI_SOCIAL_TESTER_PASSWORD || "";
const shouldStampReport = process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_STAMP_REPORT !== "false";
const runRoot = resolve(root, process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_LOCAL_RUN_DIR || `.local/mochi-social-browser-gates/run-${timestampId()}`);
const evidenceDir = join(runRoot, "browser-evidence");
const browserLabel = process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER || "local Chromium browser smoke";
const reviewer = process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER || "Mochi Social local browser smoke";
const chromeExecutable = process.env.MOCHI_SOCIAL_BROWSER_EXECUTABLE || firstExisting([
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  `${process.env.LOCALAPPDATA || ""}/Google/Chrome/Application/chrome.exe`,
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
]);

const records = [];
const failures = [];

if (!testerPassword) {
  failures.push("A local tester password is required via MOCHI_SOCIAL_SITE_BROWSER_GATES_TESTER_PASSWORD or MOCHI_SOCIAL_TESTER_PASSWORD_LOCAL_VALUE.");
}

await mkdir(evidenceDir, { recursive: true });

let browser;
try {
  const { chromium, source } = await loadChromium();
  const launchOptions = { headless: true };
  if (source === "playwright-core" && chromeExecutable) launchOptions.executablePath = chromeExecutable;
  browser = await chromium.launch(launchOptions);
  await verifyBrowserGates(browser);
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
} finally {
  if (browser) await browser.close();
}

const report = {
  ok: failures.length === 0 && records.every((record) => record.ok),
  checkedAt: new Date().toISOString(),
  scope: "Localhost-only Mochi Social tester-password browser gate smoke. This verifies the closed preview page and game iframe without hosted providers or secret output.",
  accessMode: "tester-password",
  siteUrl,
  gameUrl,
  passwordMaterialStored: false,
  stampReport: shouldStampReport,
  evidenceDir: pathForReport(evidenceDir),
  records,
  failures,
  git: readGitState(root),
};

const reportPath = join(evidenceDir, "browser-gates-local.json");
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (report.ok && shouldStampReport) {
  stampBrowserGateReport(reportPath);
}

if (!report.ok) {
  console.error("Mochi Social local browser gate smoke failed.");
  for (const failure of [...failures, ...records.filter((record) => !record.ok).map((record) => `${record.id}: ${record.detail}`)]) {
    console.error(`- ${failure}`);
  }
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log(`Mochi Social local browser gate smoke OK. Report: ${reportPath}`);

async function verifyBrowserGates(chromiumBrowser) {
  const context = await chromiumBrowser.newContext({ viewport: { width: 1366, height: 768 } });
  const pageOne = await context.newPage();
  await installMessageCapture(pageOne);

  await pageOne.goto(`${siteUrl}/games/mochi-social`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const lockedText = await pageOne.locator("body").innerText();
  const lockedIframeCount = await pageOne.locator("iframe").count();
  record("tester-password-locked-page", lockedText.includes("Tester password required") && lockedIframeCount === 0, "Locked page renders tester password gate and no iframe.", { lockedIframeCount });
  await screenshot(pageOne, "01-locked-page.png");

  const badLogin = await context.request.post(`${siteUrl}/games/mochi-social/tester-login`, {
    form: { testerPassword: `wrong-local-preview-password-${randomUUID()}` },
    maxRedirects: 0,
  });
  const badCookies = await context.cookies(`${siteUrl}/games/mochi-social`);
  await pageOne.goto(`${siteUrl}/games/mochi-social?tester_error=invalid`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const invalidText = await pageOne.locator("body").innerText();
  const invalidCookie = badCookies.some((cookie) => cookie.name === "mochi_social_tester_access");
  record("tester-password-invalid-error", badLogin.status() === 303 && !invalidCookie && /That password did not work/.test(invalidText), "Invalid tester password route redirects without tester cookie and visible page shows accessible inline error.", {
    status: badLogin.status(),
    invalidCookie,
    url: pageOne.url(),
  });
  await screenshot(pageOne, "02-invalid-password.png");

  const goodLogin = await context.request.post(`${siteUrl}/games/mochi-social/tester-login`, {
    form: { testerPassword },
    maxRedirects: 0,
  });
  const goodCookies = await context.cookies(`${siteUrl}/games/mochi-social`);
  const sessionCookie = goodCookies.find((cookie) => cookie.name === "mochi_social_tester_access");
  await pageOne.goto(`${siteUrl}/games/mochi-social`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await pageOne.waitForSelector('iframe[title="Mochi Social"]', { timeout: 30000 });
  const unlockedText = await pageOne.locator("body").innerText();
  const iframeCount = await pageOne.locator('iframe[title="Mochi Social"]').count();
  const iframeSrc = await pageOne.locator('iframe[title="Mochi Social"]').first().getAttribute("src");
  record("tester-password-iframe-loads", goodLogin.status() === 303 && Boolean(sessionCookie) && unlockedText.includes("Mochi Social unlocked") && iframeCount === 1, "Valid tester password route sets scoped session cookie, unlocks page, and renders one game iframe.", {
    status: goodLogin.status(),
    hasSessionCookie: Boolean(sessionCookie),
    cookiePath: sessionCookie?.path,
    httpOnly: sessionCookie?.httpOnly,
    sameSite: sessionCookie?.sameSite,
    iframeCount,
    iframeSrc,
    url: pageOne.url(),
  });
  const frameOne = await gameFrame(pageOne);
  const frameOneInitial = await waitForFrameText(frameOne, /Canary preview stub - no real value/i);
  await screenshot(pageOne, "03-unlocked-iframe.png");

  await pageOne.waitForFunction(() => document.querySelector("[data-mochi-bridge-state]")?.textContent?.trim() === "guest", null, { timeout: 30000 });
  const bridgeState = await pageOne.locator("[data-mochi-bridge-state]").innerText({ timeout: 30000 });
  const messages = await pageOne.evaluate(() => window.__mochiBridgeMessages || []);
  const hasReady = messages.some((entry) => entry.origin === gameUrl && entry.data?.type === "MOCHI_SOCIAL_READY");
  const hasGuest = messages.some((entry) => entry.origin === gameUrl && entry.data?.type === "MOCHI_SOCIAL_AUTH_STATE" && entry.data?.payload?.state === "guest");
  const frameStorage = await frameOne.evaluate(() => ({ accessToken: localStorage.getItem("mochiSocial.accessToken") || null }));
  record("guest-auth-bridge", bridgeState.trim() === "guest" && hasReady && hasGuest && frameStorage.accessToken === null, "Parent/iframe bridge reaches guest state without a local access token.", {
    bridgeState,
    hasReady,
    hasGuest,
    frameStorage,
  });

  record("canary-chain-stub", /configured-preview-stub/i.test(unlockedText) && /Canary preview stub - no real value/i.test(frameOneInitial), "Unlocked page and game iframe both show Canary configured-preview-stub/no-real-value safety copy.");

  const pageTwo = await context.newPage();
  await installMessageCapture(pageTwo);
  await pageTwo.goto(`${siteUrl}/games/mochi-social`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await pageTwo.waitForSelector('iframe[title="Mochi Social"]', { timeout: 30000 });
  const frameTwo = await gameFrame(pageTwo);
  await waitForFrameText(frameTwo, /Canary preview stub - no real value/i);

  let presenceOne = "";
  let presenceTwo = "";
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    presenceOne = await frameBodyText(frameOne);
    presenceTwo = await frameBodyText(frameTwo);
    if (/Nearby:\s*2 testers/i.test(presenceOne) && /Nearby:\s*2 testers/i.test(presenceTwo)) break;
    await pageOne.waitForTimeout(1000);
  }
  record("two-tab-game-presence", /Nearby:\s*2 testers/i.test(presenceOne) && /Nearby:\s*2 testers/i.test(presenceTwo), "Two unlocked site pages load local game iframes and show Nearby: 2 testers in both iframes.", {
    pageOneNearby: (presenceOne.match(/Nearby:[^\n]+/) || [""])[0],
    pageTwoNearby: (presenceTwo.match(/Nearby:[^\n]+/) || [""])[0],
  });
  await screenshot(pageOne, "04-presence-page-one.png");
  await screenshot(pageTwo, "05-presence-page-two.png");

  await context.close();
}

async function loadChromium() {
  for (const packageName of ["playwright", "playwright-core"]) {
    try {
      const loaded = await import(packageName);
      return { chromium: loaded.chromium, source: packageName };
    } catch {
      // Try configured module directories below.
    }
  }

  const candidateDirs = [
    process.env.MOCHI_SOCIAL_PLAYWRIGHT_MODULE_DIR,
    resolve(root, "../Local RPG/node_modules"),
  ].filter(Boolean);
  for (const dir of candidateDirs) {
    for (const packageName of ["playwright", "playwright-core"]) {
      try {
        const requireFromDir = createRequire(join(dir, "package.json"));
        return { chromium: requireFromDir(packageName).chromium, source: packageName };
      } catch {
        // Keep trying.
      }
    }
  }

  throw new Error("Playwright or playwright-core is required. Install it for this optional smoke, or set MOCHI_SOCIAL_PLAYWRIGHT_MODULE_DIR to a node_modules directory that contains it.");
}

async function installMessageCapture(page) {
  await page.addInitScript(() => {
    window.__mochiBridgeMessages = [];
    window.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (typeof data.type !== "string" || !data.type.startsWith("MOCHI_SOCIAL_")) return;
      window.__mochiBridgeMessages.push({ origin: event.origin, data, at: Date.now() });
    });
  });
}

async function gameFrame(page) {
  let frameUrls = [];
  for (let i = 0; i < 80; i += 1) {
    frameUrls = page.frames().map((candidate) => candidate.url()).filter(Boolean);
    const frame = page.frames().find((candidate) => candidate.url().startsWith(`${gameUrl}/embed`));
    if (frame) return frame;
    await page.waitForTimeout(250);
  }
  throw new Error(`Game iframe did not attach to the configured local /embed URL. Expected ${gameUrl}/embed. Frames seen: ${frameUrls.join(", ") || "none"}. Rebuild or start the local site with NEXT_PUBLIC_MOCHI_SOCIAL_URL=${gameUrl}.`);
}

async function frameBodyText(frame) {
  return frame.evaluate(() => document.body.innerText);
}

async function waitForFrameText(frame, pattern, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let text = "";
  while (Date.now() < deadline) {
    text = await frameBodyText(frame);
    if (pattern.test(text)) return text;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  throw new Error(`Game iframe text did not match ${pattern}; last text: ${text.slice(0, 500)}`);
}

function record(id, ok, detail, extra = {}) {
  records.push({ id, ok, detail, ...extra });
}

async function screenshot(page, name) {
  const file = join(evidenceDir, name);
  await page.screenshot({ path: file, fullPage: false });
  return { file: pathForReport(file), sha256: sha256(file) };
}

function stampBrowserGateReport(reportPathForNotes) {
  const result = spawnSync(process.execPath, ["scripts/write-mochi-social-browser-gates.mjs"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
    env: {
      ...process.env,
      MOCHI_SOCIAL_SITE_BROWSER_GATES_ACCESS_MODE: "tester-password",
      MOCHI_SOCIAL_SITE_BROWSER_GATES_CONFIRMED: "true",
      MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER: reviewer,
      MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER: browserLabel,
      MOCHI_SOCIAL_SITE_BROWSER_GATES_URL: `${siteUrl}/games/mochi-social`,
      MOCHI_SOCIAL_SITE_BROWSER_GATES_NOTES: `Local browser smoke passed against ${siteUrl}/games/mochi-social and ${gameUrl}/embed. Evidence: ${pathForReport(reportPathForNotes)}. No hosted/provider action.`,
      MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_LOCKED_OK: "true",
      MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_IFRAME_ABSENT_OK: "true",
      MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_INVALID_ERROR_OK: "true",
      MOCHI_SOCIAL_SITE_BROWSER_IFRAME_LOADS_OK: "true",
      MOCHI_SOCIAL_SITE_BROWSER_AUTH_BRIDGE_OK: "true",
      MOCHI_SOCIAL_SITE_BROWSER_CHAIN_STUB_OK: "true",
      MOCHI_SOCIAL_SITE_BROWSER_GAME_PRESENCE_OK: "true",
    },
  });
  if (result.status !== 0) {
    throw new Error(`Browser gate report writer failed: ${result.stderr || result.stdout || result.error?.message || "unknown error"}`);
  }
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function firstExisting(paths) {
  return paths.find((candidate) => candidate && existsSync(candidate)) || "";
}

function timestampId() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function pathForReport(absolutePath) {
  const normalized = String(absolutePath || "").replace(/\\/g, "/");
  const normalizedRoot = root.replace(/\\/g, "/");
  if (normalized.startsWith(`${normalizedRoot}/`)) return normalized.slice(normalizedRoot.length + 1);
  return normalized;
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
