import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { SITE_ORIGIN } from "./lib/public-urls.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const argSet = new Set(args);
const getArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const writeReport = argSet.has("--write") || process.env.BROWSER_ROUTE_MATRIX_WRITE === "true";
const baseUrl = getArg("--base-url", process.env.BROWSER_ROUTE_MATRIX_BASE_URL || SITE_ORIGIN).replace(/\/$/, "");
const reportJsonPath = resolve(root, "reports/browser-route-matrix.json");
const reportMdPath = resolve(root, "reports/browser-route-matrix.md");
const checkedAt = new Date().toISOString();
const failures = [];
const warnings = [];

const routes = [
  { route: "/", label: "Home", expectMain: true, expectLiveRegion: true },
  { route: "/join", label: "Join", expectMain: true },
  { route: "/gallery", label: "Gallery", expectMain: true, expectLiveRegion: true },
  { route: "/auth", label: "Auth", expectMain: true, expectLiveRegion: true, expectAlert: true },
  { route: "/account", label: "Account", expectMain: true, expectLiveRegion: true, expectAlert: true },
  { route: "/social", label: "Social", expectMain: true, expectLiveRegion: true, expectAlert: true },
  { route: "/leader-dashboard", label: "Leader Dashboard", expectMain: true, expectLiveRegion: true, expectAlert: true },
  { route: "/games/mochi-pets", label: "Mochi Pets", expectMain: true, expectAlert: true },
];

const viewports = [
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-375x812", width: 375, height: 812 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "mobile-390x900", width: 390, height: 900 },
  { name: "mobile-414x896", width: 414, height: 896 },
  { name: "mobile-430x932", width: 430, height: 932 },
  { name: "desktop-1280x720", width: 1280, height: 720 },
  { name: "desktop-1366x768", width: 1366, height: 768 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "desktop-1440x1100", width: 1440, height: 1100 },
  { name: "desktop-1536x864", width: 1536, height: 864 },
  { name: "desktop-1920x1080", width: 1920, height: 1080 },
];

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
const matrix = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: "reduce",
      colorScheme: "dark",
      ignoreHTTPSErrors: false,
    });
    for (const route of routes) {
      const result = await inspectRoute(context, route, viewport);
      matrix.push(result);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const summary = {
  routeCount: routes.length,
  viewportCount: viewports.length,
  checks: matrix.length,
  statusOk: matrix.filter((entry) => entry.statusOk).length,
  noOverflow: matrix.filter((entry) => !entry.horizontalOverflow).length,
  focusVisible: matrix.filter((entry) => entry.focus.visible).length,
  reducedMotionMatched: matrix.filter((entry) => entry.reducedMotion.matches).length,
  iframeTitlePass: matrix.filter((entry) => entry.iframes.total === entry.iframes.titled).length,
};

const report = {
  ok: failures.length === 0,
  checkedAt,
  scope:
    "No-secret Playwright browser route matrix for Mochirii route readiness. Runs in clean browser contexts with reduced motion enabled and records route, layout, focus, iframe, form, live-region, alert, and console evidence without cookies or headers. Viewports include common current mobile and desktop widths from StatCounter plus the existing tall evidence sizes.",
  baseUrl,
  browser: "playwright chromium",
  viewports,
  routes: routes.map(({ route, label }) => ({ route, label })),
  summary,
  matrix,
  warnings,
  failures,
};

const json = `${JSON.stringify(report, null, 2)}\n`;
const markdown = renderMarkdown(report);
scanRenderedArtifact("json", json);
scanRenderedArtifact("markdown", markdown);
report.ok = failures.length === 0;

if (writeReport) {
  mkdirSync(dirname(reportJsonPath), { recursive: true });
  writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(reportMdPath, renderMarkdown(report), "utf8");
}

if (!report.ok) {
  console.error("Browser route matrix failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Browser route matrix OK.");
console.log(`- Base URL: ${baseUrl}`);
console.log(`- Checks: ${summary.checks}`);
console.log(`- No horizontal overflow: ${summary.noOverflow}/${summary.checks}`);
console.log(`- Visible focus reached: ${summary.focusVisible}/${summary.checks}`);
console.log(`- Reduced motion matched: ${summary.reducedMotionMatched}/${summary.checks}`);
if (warnings.length) console.log(`- Warnings documented: ${warnings.length}`);
if (writeReport) {
  console.log(`- JSON report: ${pathForReport(reportJsonPath)}`);
  console.log(`- Markdown report: ${pathForReport(reportMdPath)}`);
}

async function inspectRoute(context, route, viewport) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(safeText(message.text()));
  });
  page.on("pageerror", (error) => pageErrors.push(safeText(error.message)));

  const url = `${baseUrl}${route.route}`;
  let response = null;
  let gotoError = "";
  try {
    response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => null);
    await page.waitForSelector("body", { timeout: 10000 });
  } catch (error) {
    gotoError = safeText(error?.message || String(error));
  }

  const status = response?.status() || 0;
  const statusOk = status >= 200 && status < 400 && !gotoError;
  const browserState = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const all = [...document.querySelectorAll("body *")];
    const animated = all
      .slice(0, 120)
      .map((element) => {
        const style = getComputedStyle(element);
        return {
          tag: element.tagName.toLowerCase(),
          animationName: style.animationName,
          animationDuration: style.animationDuration,
          transitionDuration: style.transitionDuration,
        };
      })
      .filter((entry) => {
        const hasAnimation = entry.animationName && entry.animationName !== "none" && !/^0(?:s|ms)?(?:,\s*0(?:s|ms)?)*$/.test(entry.animationDuration);
        const hasTransition = entry.transitionDuration && !/^(?:0s|0ms|1e-06s)(?:,\s*(?:0s|0ms|1e-06s))*$/.test(entry.transitionDuration);
        return hasAnimation || hasTransition;
      })
      .slice(0, 12);
    const iframes = [...document.querySelectorAll("iframe")];
    const inputs = [...document.querySelectorAll("input, textarea, select")];
    return {
      title: document.title,
      h1: document.querySelector("h1")?.textContent?.trim() || "",
      main: Boolean(document.querySelector("#main")),
      liveRegions: document.querySelectorAll("[aria-live]").length,
      alerts: document.querySelectorAll('[role="alert"]').length,
      forms: document.querySelectorAll("form").length,
      inputCount: inputs.length,
      labeledInputs: inputs.filter((input) => Boolean(input.id && document.querySelector(`label[for="${CSS.escape(input.id)}"]`)) || Boolean(input.closest("label")) || Boolean(input.getAttribute("aria-label")) || Boolean(input.getAttribute("aria-labelledby"))).length,
      iframes: { total: iframes.length, titled: iframes.filter((iframe) => Boolean(iframe.getAttribute("title")?.trim())).length },
      horizontalOverflow: Math.ceil(doc.scrollWidth) > Math.ceil(doc.clientWidth) + 1 || Math.ceil(body.scrollWidth) > Math.ceil(body.clientWidth) + 1,
      documentWidth: doc.scrollWidth,
      viewportWidth: doc.clientWidth,
      reducedMotion: { matches: window.matchMedia("(prefers-reduced-motion: reduce)").matches, animated },
    };
  }).catch((error) => ({ evaluationError: safeText(error?.message || String(error)) }));

  const focus = await inspectFocus(page);
  const trap = await inspectKeyboardTrap(page);

  await page.close();

  const result = {
    route: route.route,
    label: route.label,
    viewport: viewport.name,
    size: `${viewport.width}x${viewport.height}`,
    url,
    status,
    statusOk,
    title: safeText(browserState.title || ""),
    h1: safeText(browserState.h1 || ""),
    main: Boolean(browserState.main),
    liveRegions: browserState.liveRegions || 0,
    alerts: browserState.alerts || 0,
    forms: browserState.forms || 0,
    inputs: { total: browserState.inputCount || 0, labeled: browserState.labeledInputs || 0 },
    iframes: browserState.iframes || { total: 0, titled: 0 },
    horizontalOverflow: Boolean(browserState.horizontalOverflow),
    widths: { document: browserState.documentWidth || 0, viewport: browserState.viewportWidth || viewport.width },
    reducedMotion: browserState.reducedMotion || { matches: false, animated: [] },
    focus,
    keyboardTrap: trap,
    consoleErrors: consoleErrors.slice(0, 8),
    pageErrors: pageErrors.slice(0, 8),
    gotoError,
  };

  validateResult(route, result);
  return result;
}

async function inspectFocus(page) {
  for (let index = 0; index < 10; index += 1) {
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body || element === document.documentElement) return null;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const outlineWidth = Number.parseFloat(style.outlineWidth || "0") || 0;
      const visible = (outlineWidth > 0 && style.outlineStyle !== "none") || (style.boxShadow && style.boxShadow !== "none");
      return {
        tag: element.tagName.toLowerCase(),
        id: element.id || "",
        role: element.getAttribute("role") || "",
        ariaLabel: element.getAttribute("aria-label") || "",
        text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow === "none" ? "none" : "present",
        visible,
        inViewport: rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.right >= 0 && rect.top <= window.innerHeight && rect.left <= window.innerWidth,
      };
    });
    if (focus?.visible && focus?.inViewport) return focus;
  }
  return { visible: false, inViewport: false, tag: "", id: "", text: "" };
}

async function inspectKeyboardTrap(page) {
  const seen = [];
  for (let index = 0; index < 18; index += 1) {
    await page.keyboard.press("Tab");
    const key = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element) return "none";
      return [element.tagName.toLowerCase(), element.id || "", element.getAttribute("aria-label") || "", (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40)].join("#");
    });
    seen.push(key);
  }
  await page.keyboard.press("Escape").catch(() => null);
  const unique = new Set(seen.filter((entry) => entry && entry !== "body###"));
  return { checkedTabs: seen.length, uniqueFocusStops: unique.size, likelyTrap: unique.size <= 1 };
}

function validateResult(route, result) {
  const label = `${route.route} ${result.viewport}`;
  if (!result.statusOk) failures.push(`${label}: expected a successful route load, got status ${result.status}${result.gotoError ? ` (${result.gotoError})` : ""}.`);
  if (route.expectMain && !result.main) failures.push(`${label}: missing #main skip-link target.`);
  if (result.horizontalOverflow) failures.push(`${label}: horizontal overflow (${result.widths.document}px document vs ${result.widths.viewport}px viewport).`);
  if (!result.focus.visible) failures.push(`${label}: keyboard tabbing did not reach a visible focus state.`);
  if (result.keyboardTrap.likelyTrap) failures.push(`${label}: keyboard tabbing appears trapped on one focus stop.`);
  if (result.iframes.total !== result.iframes.titled) failures.push(`${label}: iframe title coverage ${result.iframes.titled}/${result.iframes.total}.`);
  if (result.inputs.total > 0 && result.inputs.labeled < result.inputs.total) failures.push(`${label}: form input label coverage ${result.inputs.labeled}/${result.inputs.total}.`);
  if (route.expectLiveRegion && result.liveRegions === 0) failures.push(`${label}: expected at least one live region.`);
  if (route.expectAlert && result.alerts === 0) warnings.push(`${label}: no alert region observed in signed-out/default browser state; confirm error state remains covered statically.`);
  if (!result.reducedMotion.matches) failures.push(`${label}: reduced-motion media query did not match in Playwright context.`);
  if (result.reducedMotion.animated.length) warnings.push(`${label}: reduced-motion context still reported ${result.reducedMotion.animated.length} animated or transitioning sampled elements.`);
  for (const error of result.pageErrors) failures.push(`${label}: page error: ${error}`);
  for (const error of result.consoleErrors) warnings.push(`${label}: console error observed: ${error}`);
}

function renderMarkdown(report) {
  const rows = report.matrix
    .map((entry) => `| ${entry.route} | ${entry.viewport} | ${entry.status} | ${entry.main ? "yes" : "no"} | ${entry.horizontalOverflow ? "yes" : "no"} | ${entry.focus.visible ? "yes" : "no"} | ${entry.iframes.titled}/${entry.iframes.total} | ${entry.reducedMotion.matches ? "yes" : "no"} | ${entry.keyboardTrap.likelyTrap ? "yes" : "no"} |`)
    .join("\n");
  const warningsText = report.warnings.length ? report.warnings.map((warning) => `- ${warning}`).join("\n") : "- None";
  const failuresText = report.failures.length ? report.failures.map((failure) => `- ${failure}`).join("\n") : "- None";
  return `# Browser Route Matrix\n\nGenerated: ${report.checkedAt}\n\nThis file is intentionally no-secret. It records clean-context Playwright browser evidence for key Mochirii routes without cookies, request headers, raw response headers, screenshots, or private form values.\n\n## Result\n\n- OK: ${report.ok ? "yes" : "no"}\n- Base URL: ${report.baseUrl}\n- Browser: ${report.browser}\n- Checks: ${report.summary.checks}\n- Viewports: ${report.viewports.map((viewport) => `${viewport.name} ${viewport.width}x${viewport.height}`).join(", ")}\n\n## Matrix\n\n| Route | Viewport | Status | Main | Overflow | Visible focus | Iframes titled | Reduced motion | Trap |\n| --- | --- | ---: | --- | --- | --- | ---: | --- | --- |\n${rows}\n\n## Warnings\n\n${warningsText}\n\n## Failures\n\n${failuresText}\n`;
}

function scanRenderedArtifact(label, text) {
  const patterns = [
    { label: "GitHub token", pattern: /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/ },
    { label: "Supabase PAT", pattern: /\bsbp_[A-Za-z0-9_-]{20,}\b/ },
    { label: "Supabase secret key", pattern: /\bsb_secret_[A-Za-z0-9_-]{12,}\b/ },
    { label: "JWT-like token", pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/ },
    { label: "Discord webhook URL", pattern: /https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/ },
    { label: "raw cookie header", pattern: /\bCookie:\s*[^;\s]+=/i },
  ];
  String(text || "")
    .split(/\r?\n/)
    .forEach((line, index) => {
      for (const { label: patternLabel, pattern } of patterns) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) failures.push(`rendered ${label} report line ${index + 1}: ${patternLabel}`);
      }
    });
}

function safeText(value) {
  return String(value || "").replace(/\s+/g, " ").slice(0, 500);
}

function pathForReport(file) {
  return relative(root, resolve(root, file)).replace(/\\/g, "/");
}
