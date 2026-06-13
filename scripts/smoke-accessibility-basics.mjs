import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const baseUrl = parseBaseUrl();
const timeoutMs = 30000;

const viewports = [
  { label: "mobile", width: 390, height: 844 },
  { label: "desktop", width: 1280, height: 900 },
];

const routeChecks = [
  { path: "/", label: "Home", h1: /M[oō]chir[īi][īi]/i, statusExpected: true },
  { path: "/join", label: "Join", h1: /Join/i },
  { path: "/events", label: "Events", h1: /Events/i, statusExpected: true },
  { path: "/gallery", label: "Gallery", h1: /Gallery|Guild Album/i, statusExpected: true, galleryLightbox: true },
  { path: "/auth", label: "Auth", h1: /Login|Website Sign-In|Sign-In|Auth/i, signedOutGate: /Login with Discord|Use Discord to sign in/i, statusExpected: true, alertExpected: true },
  { path: "/account", label: "Account", h1: /Account/i, signedOutGate: /Login with Discord|Sign In Required/i, statusExpected: true },
  { path: "/gallery-submit", label: "Gallery Submit", h1: /Gallery Submit|Submit/i, signedOutGate: /Login Required|Access Check|Login with Discord/i, statusExpected: true },
  { path: "/leader-dashboard", label: "Leader Dashboard", h1: /Leader Dashboard|Gallery Moderation/i, signedOutGate: /Login with Discord|Sign In Required|Access Denied/i, statusExpected: true },
  { path: "/games/mochi-social", label: "Mochi Social", h1: /Mochi Social/i, signedOutGate: /Tester|password|Alpha/i },
];

const ignoredConsoleFragments = [
  "Failed to load resource: net::ERR_FAILED",
  "favicon",
  "ResizeObserver loop completed",
];

let chromium;
try {
  ({ chromium } = await importPlaywright());
} catch (error) {
  console.error("Playwright is required for this optional accessibility smoke.");
  console.error("Install Playwright for the repo or set PLAYWRIGHT_PACKAGE_PATH to a playwright index module.");
  console.error(`Detail: ${error?.message || error}`);
  process.exit(1);
}

let browser;
try {
  browser = await chromium.launch(browserLaunchOptions());
} catch (error) {
  console.error("Unable to launch Chromium for the accessibility smoke.");
  console.error("Install Playwright browsers, or set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH/CHROMIUM_EXECUTABLE_PATH to a local Chrome/Chromium executable.");
  console.error(`Detail: ${error?.message || error}`);
  process.exit(1);
}

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    wirePageErrors(page, errors);
    if (isLocalBaseUrl()) await stubLocalVercelScripts(page);

    for (const route of routeChecks) {
      await inspectRoute(page, route, viewport, errors);
    }

    await page.close();
  }

  console.log(`Accessibility basics smoke OK (${viewports.length} viewports, ${routeChecks.length} routes).`);
} catch (error) {
  console.error(`Accessibility basics smoke failed: ${error?.message || error}`);
  process.exit(1);
} finally {
  await browser.close();
}

function parseBaseUrl() {
  const arg = args.find((value) => value.startsWith("--base-url="))?.split("=").slice(1).join("=");
  const positional = args.find((value) => /^https?:\/\//i.test(value));
  const raw = arg || process.env.ACCESSIBILITY_SMOKE_BASE_URL || process.env.SMOKE_BASE_URL || positional || "https://mochirii.com";
  const parsed = new URL(raw);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(`base URL must be http or https: ${raw}`);
  return parsed.origin;
}

async function importPlaywright() {
  const explicitPath = process.env.PLAYWRIGHT_PACKAGE_PATH;
  if (explicitPath) {
    const requireFromPackage = createRequire(pathToFileURL(resolve(explicitPath)).href);
    return requireFromPackage("playwright");
  }

  const moduleDir = process.env.PLAYWRIGHT_NODE_MODULES;
  if (moduleDir) {
    const candidate = join(resolve(moduleDir), "playwright", "package.json");
    if (existsSync(candidate)) {
      const requireFromPackage = createRequire(pathToFileURL(candidate).href);
      return requireFromPackage("playwright");
    }
  }

  return import("playwright");
}

function wirePageErrors(page, errors) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (ignoredConsoleFragments.some((fragment) => text.includes(fragment))) return;
    errors.push(text);
  });
}

function browserLaunchOptions() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || process.env.CHROMIUM_EXECUTABLE_PATH || "";
  return executablePath ? { headless: true, executablePath } : { headless: true };
}

function isLocalBaseUrl() {
  const hostname = new URL(baseUrl).hostname;
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

async function stubLocalVercelScripts(page) {
  await page.route("**/_vercel/**/script.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "",
    }),
  );
}

async function inspectRoute(page, route, viewport, errors) {
  errors.length = 0;
  await page.goto(new URL(route.path, baseUrl).href, { waitUntil: "domcontentloaded", timeout: timeoutMs });
  await page.waitForSelector("#main", { timeout: timeoutMs });
  await page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => {});

  const snapshot = await page.evaluate(() => {
    const visible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (element.hidden || element.closest("[hidden], [aria-hidden='true']")) return false;
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") return false;
      return element.getClientRects().length > 0;
    };

    const text = (element) => String(element?.textContent || "").replace(/\s+/g, " ").trim();
    const byIdText = (id) => text(document.getElementById(id));
    const labelText = (element) => {
      if (!(element instanceof HTMLElement)) return "";
      const descendantImageAlt = [...element.querySelectorAll("img[alt]")]
        .map((image) => image.getAttribute("alt") || "")
        .filter(Boolean)
        .join(" ");
      const direct = [
        element.getAttribute("aria-label"),
        element.getAttribute("title"),
        element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement
          ? element.labels && element.labels.length
            ? [...element.labels].map(text).join(" ")
            : ""
          : "",
        element.getAttribute("aria-labelledby")
          ?.split(/\s+/)
          .map(byIdText)
          .filter(Boolean)
          .join(" "),
        descendantImageAlt,
        text(element),
        element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ? element.getAttribute("placeholder") : "",
        element instanceof HTMLImageElement ? element.getAttribute("alt") : "",
      ];
      return direct.find((value) => String(value || "").trim()) || "";
    };

    const focusableSelector = [
      "a[href]",
      "button",
      "input",
      "select",
      "textarea",
      "[role='button']",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const focusables = [...document.querySelectorAll(focusableSelector)].filter(visible);
    const emptyNames = focusables
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        id: element.id || "",
        className: element.className || "",
        href: element.getAttribute("href") || "",
        text: text(element).slice(0, 80),
        name: labelText(element).trim(),
      }))
      .filter((item) => !item.name);

    const formFields = [...document.querySelectorAll("input, select, textarea")].filter(visible);
    const unlabeledFields = formFields
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        id: element.id || "",
        name: labelText(element).trim(),
        type: element.getAttribute("type") || "",
      }))
      .filter((item) => item.type !== "hidden" && !item.name);

    const smallTargets = focusables
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const isInlineTextLink = element.tagName.toLowerCase() === "a" && rect.height < 24 && text(element).length > 12;
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id || "",
          className: element.className || "",
          name: labelText(element).trim().slice(0, 80),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          skipped: isInlineTextLink,
        };
      })
      .filter((item) => !item.skipped && (item.width < 24 || item.height < 24));

    return {
      title: document.title,
      body: text(document.body),
      h1: [...document.querySelectorAll("h1")].filter(visible).map(text),
      skipHref: document.querySelector(".skip-link")?.getAttribute("href") || "",
      mainPresent: Boolean(document.querySelector("#main")),
      focusVisibleRules: [...document.styleSheets].length > 0 && Boolean([...document.querySelectorAll("style, link[rel='stylesheet']")].length),
      liveRegions: document.querySelectorAll("[aria-live], [role='status']").length,
      alerts: document.querySelectorAll("[role='alert']").length,
      iframes: [...document.querySelectorAll("iframe")].map((iframe) => ({
        title: iframe.getAttribute("title") || "",
        hidden: !visible(iframe),
      })),
      emptyNames,
      unlabeledFields,
      smallTargets,
      invalidSupabase: /Invalid supabaseUrl/i.test(document.body.textContent || ""),
    };
  });

  assert(snapshot.mainPresent, `${route.label} ${viewport.label}: missing #main.`);
  assert(snapshot.skipHref === "#main", `${route.label} ${viewport.label}: skip link does not target #main.`);
  assert(snapshot.h1.length === 1, `${route.label} ${viewport.label}: expected exactly one visible h1, got ${snapshot.h1.length}.`);
  assert(route.h1.test(snapshot.h1[0]), `${route.label} ${viewport.label}: unexpected h1 "${snapshot.h1[0]}".`);
  assert(!snapshot.invalidSupabase, `${route.label} ${viewport.label}: rendered Invalid supabaseUrl.`);
  assert(!snapshot.emptyNames.length, `${route.label} ${viewport.label}: visible focusable controls without names: ${JSON.stringify(snapshot.emptyNames)}`);
  assert(!snapshot.unlabeledFields.length, `${route.label} ${viewport.label}: visible fields without labels: ${JSON.stringify(snapshot.unlabeledFields)}`);
  assert(!snapshot.smallTargets.length, `${route.label} ${viewport.label}: visible target below 24px minimum: ${JSON.stringify(snapshot.smallTargets)}`);
  assert(snapshot.iframes.every((iframe) => iframe.hidden || iframe.title), `${route.label} ${viewport.label}: visible iframe without title.`);
  if (route.statusExpected) assert(snapshot.liveRegions > 0, `${route.label} ${viewport.label}: expected status/live region.`);
  if (route.alertExpected) assert(snapshot.alerts > 0, `${route.label} ${viewport.label}: expected alert region.`);
  if (route.signedOutGate) assert(route.signedOutGate.test(snapshot.body), `${route.label} ${viewport.label}: signed-out gate text not found.`);
  if (errors.length) throw new Error(`${route.label} ${viewport.label}: browser errors: ${errors.join(" | ")}`);

  if (viewport.label === "mobile" && route.path === "/") await checkMobileMenu(page);
  if (viewport.label === "desktop" && route.galleryLightbox) await checkGalleryLightbox(page);
}

async function checkMobileMenu(page) {
  const trigger = page.locator("button[aria-controls='mobile-menu']").first();
  await trigger.click();
  await page.waitForFunction(() => {
    const menu = document.querySelector("#mobile-menu");
    return menu && !menu.hasAttribute("hidden") && menu.getAttribute("data-open") === "true";
  });

  const openState = await page.evaluate(() => ({
    expanded: document.querySelector("button[aria-controls='mobile-menu']")?.getAttribute("aria-expanded"),
    activeName:
      document.activeElement?.getAttribute("aria-label") ||
      document.activeElement?.textContent?.replace(/\s+/g, " ").trim() ||
      "",
  }));
  assert(openState.expanded === "true", `mobile menu: expected aria-expanded true, got ${openState.expanded}.`);
  assert(/close menu/i.test(openState.activeName), `mobile menu: expected focus on Close menu, got "${openState.activeName}".`);

  await page.keyboard.press("Tab");
  const afterTabInside = await page.evaluate(() => Boolean(document.activeElement?.closest("#mobile-menu")));
  assert(afterTabInside, "mobile menu: focus escaped after Tab.");

  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.querySelector("button[aria-controls='mobile-menu']")?.getAttribute("aria-expanded") === "false");
  await page.waitForFunction(() => document.activeElement === document.querySelector("button[aria-controls='mobile-menu']"));
  const closedState = await page.evaluate(() => ({
    hidden: document.querySelector("#mobile-menu")?.hasAttribute("hidden"),
    dataOpen: document.querySelector("#mobile-menu")?.getAttribute("data-open"),
    focusReturned: document.activeElement === document.querySelector("button[aria-controls='mobile-menu']"),
  }));
  assert(closedState.hidden === true, "mobile menu: expected hidden attribute after close.");
  assert(closedState.dataOpen === "false", `mobile menu: expected data-open false, got ${closedState.dataOpen}.`);
  assert(closedState.focusReturned, "mobile menu: focus did not return to menu button.");
}

async function checkGalleryLightbox(page) {
  const trigger = page.locator("#galleryGrid .gallery-thumb").first();
  await trigger.waitFor({ state: "visible", timeout: timeoutMs });
  await trigger.click();
  await page.waitForSelector("#lightbox[aria-hidden='false']");
  const openState = await page.evaluate(() => ({
    role: document.querySelector("#lightbox")?.getAttribute("role") || "",
    modal: document.querySelector("#lightbox")?.getAttribute("aria-modal") || "",
    focusId: document.activeElement?.id || "",
    closeName: document.querySelector("#lightboxClose")?.getAttribute("aria-label") || "",
  }));
  assert(openState.role === "dialog", `gallery lightbox: expected dialog role, got ${openState.role}.`);
  assert(openState.modal === "true", `gallery lightbox: expected aria-modal true, got ${openState.modal}.`);
  assert(openState.focusId === "lightboxClose", `gallery lightbox: expected focus on close button, got ${openState.focusId}.`);
  assert(/close/i.test(openState.closeName), `gallery lightbox: close button needs accessible name, got ${openState.closeName}.`);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.querySelector("#lightbox")?.getAttribute("aria-hidden") === "true");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
