import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { configuredMochiPetsOrigin, SITE_ORIGIN, SOCIAL_HOST } from "./lib/public-urls.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const argSet = new Set(args);
const getArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const baseUrl = getArg("--base-url", process.env.CORS_PROOF_BASE_URL || SITE_ORIGIN).replace(/\/+$/, "");
const writeReport = argSet.has("--write") || process.env.CORS_PROOF_WRITE === "true";
const skipBrowserProof = argSet.has("--skip-browser") || process.env.CORS_PROOF_SKIP_BROWSER === "true";
const reportJsonPath = resolve(root, process.env.CORS_PROOF_JSON || "reports/cors-proof.json");
const reportMdPath = resolve(root, process.env.CORS_PROOF_MD || "reports/cors-proof.md");
const expectedCorsOrigin = SITE_ORIGIN;
const mochiPetsOrigin = configuredMochiPetsOrigin();
const checkedAt = new Date().toISOString();
const failures = [];
const warnings = [];

const routeProbes = [
  {
    id: "home",
    method: "GET",
    path: "/",
    surface: "public page",
    expectedStatus: [200],
    futureCorsNeed: "none observed; same-origin page load",
    requiredHeader: true,
  },
  {
    id: "auth",
    method: "GET",
    path: "/auth",
    surface: "public auth page",
    expectedStatus: [200],
    futureCorsNeed: "none observed; Supabase Auth is reached from client code, not by cross-origin reads of this route",
    requiredHeader: true,
  },
  {
    id: "account",
    method: "GET",
    path: "/account",
    surface: "member workflow page",
    expectedStatus: [200],
    futureCorsNeed: "none observed; browser access is same-origin",
    requiredHeader: true,
  },
  {
    id: "social",
    method: "GET",
    path: "/social",
    surface: "social handoff page",
    expectedStatus: [200],
    futureCorsNeed: "none observed; handoff is navigation to social.mochirii.com",
    requiredHeader: true,
  },
  {
    id: "oauth-consent",
    method: "GET",
    path: "/oauth/consent",
    surface: "Supabase OAuth consent UI",
    expectedStatus: [200],
    futureCorsNeed: "none observed; Pixelfed/Supabase reach this through browser navigation",
    requiredHeader: true,
  },
  {
    id: "oauth-decision",
    method: "POST",
    path: "/api/oauth/decision",
    surface: "OAuth decision API",
    expectedStatus: [400, 401, 403],
    body: "{}",
    contentType: "application/json",
    futureCorsNeed: "possible future scoped candidate only if cross-origin browser callers are introduced",
    requiredHeader: true,
  },
  {
    id: "mochi-pets",
    method: "GET",
    path: "/games/mochi-pets",
    surface: "Mochi Pets iframe host page",
    expectedStatus: [200],
    futureCorsNeed: "none observed; iframe uses frame-src and postMessage origin checks instead of CORS",
    requiredHeader: true,
  },
  {
    id: "favicon",
    method: "GET",
    path: "/favicon.ico",
    surface: "public static asset",
    expectedStatus: [200],
    futureCorsNeed: "none observed; static assets do not need CORS for the current first-party flows",
    requiredHeader: false,
  },
];

const staticProofChecks = [
  {
    id: "next-global-cors",
    file: "apps/web/next.config.ts",
    snippets: ['source: "/(.*)"', '"Access-Control-Allow-Origin"', "publicUrls.siteOrigin"],
    claim: "Current Next.js headers apply the configured Access-Control-Allow-Origin value globally.",
  },
  {
    id: "oauth-consent-page",
    file: "apps/web/app/oauth/consent/page.tsx",
    snippets: ["OAuthConsentPanel", "robots:", "index: false"],
    claim: "OAuth consent is a noindex website page used for browser authorization review.",
  },
  {
    id: "oauth-decision-api",
    file: "apps/web/app/api/oauth/decision/route.ts",
    snippets: ["export async function POST", "private, no-store", "submitAuthorizationDecision", "/oauth/authorizations/"],
    claim: "The OAuth decision endpoint is a POST-only same-origin API that forwards the consent decision to Supabase.",
  },
  {
    id: "pixelfed-first-login",
    file: "docs/pixelfed-first-login-testing.md",
    snippets: [SOCIAL_HOST, "/oauth/consent", "/api/oauth/decision"],
    claim: "Pixelfed first-login docs route the browser through the consent page and same-origin decision API.",
  },
  {
    id: "mochi-pets-postmessage",
    file: "apps/web/components/mochi-pets/MochiPetsAlphaClient.tsx",
    snippets: ["postMessage", "event.origin !== gameOrigin", "src={embedUrl}", "functionsUrl"],
    claim: "Mochi Pets uses an iframe plus strict postMessage origin checks, not permissive CORS.",
  },
];

const browserViewports = [
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

const browserRouteProbes = [
  { id: "home", path: "/", expectedStatus: [200] },
  { id: "auth", path: "/auth", expectedStatus: [200] },
  { id: "account", path: "/account", expectedStatus: [200] },
  { id: "social", path: "/social", expectedStatus: [200], requireSocialHandoff: true },
  { id: "oauth-consent", path: "/oauth/consent", expectedStatus: [200], probeOauthDecision: true },
  { id: "mochi-pets", path: "/games/mochi-pets", expectedStatus: [200], inspectMochiPetsFrame: true },
];

const selectedHeaders = [
  "access-control-allow-origin",
  "access-control-allow-methods",
  "access-control-allow-headers",
  "content-security-policy",
  "cross-origin-opener-policy",
  "x-frame-options",
  "content-type",
  "server",
  "cache-control",
];

function absoluteUrl(path) {
  return new URL(path, `${baseUrl}/`).href;
}

function safeHeaderValue(value) {
  return String(value || "").replace(/\s+/g, " ").slice(0, 500);
}

function selectedResponseHeaders(response) {
  const headers = {};
  for (const name of selectedHeaders) {
    const value = response.headers.get(name);
    if (value) headers[name] = safeHeaderValue(value);
  }
  return headers;
}

async function fetchProbe(probe) {
  const response = await fetch(absoluteUrl(probe.path), {
    method: probe.method,
    redirect: "manual",
    headers: {
      Accept: probe.contentType || "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.7",
      "Cache-Control": "no-cache",
      "User-Agent": "MochiriiCorsProof/1.0",
      ...(probe.contentType ? { "Content-Type": probe.contentType } : {}),
    },
    body: probe.body,
    signal: AbortSignal.timeout(30000),
  });

  const headers = selectedResponseHeaders(response);
  const corsOrigin = headers["access-control-allow-origin"] || "";
  const statusOk = probe.expectedStatus.includes(response.status);
  const corsOk = corsOrigin === expectedCorsOrigin;
  const entry = {
    id: probe.id,
    method: probe.method,
    path: probe.path,
    url: absoluteUrl(probe.path),
    surface: probe.surface,
    status: response.status,
    statusOk,
    corsOrigin,
    corsOk,
    requiredHeader: probe.requiredHeader,
    futureCorsNeed: probe.futureCorsNeed,
    headers,
  };

  if (!statusOk) {
    failures.push(`${probe.id}: expected status ${probe.expectedStatus.join(" or ")}, got ${response.status}.`);
  }
  if (probe.requiredHeader && !corsOk) {
    failures.push(`${probe.id}: expected current global CORS origin ${expectedCorsOrigin}, got ${corsOrigin || "missing"}.`);
  }
  if (!probe.requiredHeader && !corsOk) {
    warnings.push(`${probe.id}: static asset CORS origin was ${corsOrigin || "missing"}; no current flow requires this header.`);
  }

  return entry;
}

function readProjectFile(file) {
  return readFileSync(resolve(root, file), "utf8");
}

function inspectStaticProof(proof) {
  const source = readProjectFile(proof.file);
  const missing = proof.snippets.filter((snippet) => !source.includes(snippet));
  if (missing.length) {
    failures.push(`${proof.id}: ${proof.file} is missing expected snippet(s): ${missing.join(", ")}.`);
  }
  return {
    id: proof.id,
    file: proof.file,
    ok: missing.length === 0,
    claim: proof.claim,
    checkedSnippets: proof.snippets.length,
  };
}

function isCorsConsoleError(message) {
  return /(?:\bcors\b|cross-origin|access-control-allow-origin|preflight)/i.test(String(message || ""));
}

function safeText(value) {
  return String(value || "").replace(/\s+/g, " ").slice(0, 500);
}

async function inspectBrowserProof() {
  if (skipBrowserProof) {
    warnings.push("browser proof skipped by --skip-browser/CORS_PROOF_SKIP_BROWSER; do not narrow CORS from fetch/static proof alone.");
    return {
      enabled: false,
      skipped: true,
      browser: "playwright chromium",
      viewports: browserViewports,
      routes: [],
      summary: {
        checks: 0,
        statusOk: 0,
        noCorsConsoleErrors: 0,
        sameOriginApiChecks: 0,
        socialHandoffChecks: 0,
        mochiPetsFrameChecks: 0,
        narrowingBlockers: 1,
      },
      narrowingBlockers: ["Browser proof was skipped."],
    };
  }

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const narrowingBlockers = [];

  try {
    for (const viewport of browserViewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: "dark",
        reducedMotion: "reduce",
        ignoreHTTPSErrors: false,
      });

      for (const probe of browserRouteProbes) {
        results.push(await inspectBrowserRoute(context, probe, viewport, narrowingBlockers));
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  const summary = {
    checks: results.length,
    statusOk: results.filter((entry) => entry.statusOk).length,
    noCorsConsoleErrors: results.filter((entry) => entry.corsConsoleErrors.length === 0).length,
    sameOriginApiChecks: results.filter((entry) => entry.oauthDecision?.ok).length,
    socialHandoffChecks: results.filter((entry) => entry.socialHandoff?.ok).length,
    mochiPetsFrameChecks: results.filter((entry) => entry.mochiPetsFrame?.ok).length,
    narrowingBlockers: narrowingBlockers.length,
  };

  return {
    enabled: true,
    skipped: false,
    browser: "playwright chromium",
    viewports: browserViewports,
    routes: results,
    summary,
    narrowingBlockers,
  };
}

async function inspectBrowserRoute(context, probe, viewport, narrowingBlockers) {
  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", (message) => consoleMessages.push({ type: message.type(), text: safeText(message.text()) }));
  page.on("pageerror", (error) => pageErrors.push(safeText(error?.message || String(error))));

  const url = absoluteUrl(probe.path);
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
  const statusOk = probe.expectedStatus.includes(status) && !gotoError;
  const corsConsoleErrors = consoleMessages.filter((entry) => entry.type === "error" && isCorsConsoleError(entry.text));
  const browserState = await page.evaluate(() => ({
    origin: window.location.origin,
    title: document.title,
    h1: document.querySelector("h1")?.textContent?.trim() || "",
    socialLinks: [...document.querySelectorAll("a[href]")].map((anchor) => anchor.href),
    iframeSrcs: [...document.querySelectorAll("iframe[src]")].map((iframe) => iframe.src),
  })).catch((error) => ({ evaluationError: safeText(error?.message || String(error)) }));

  let oauthDecision = null;
  if (probe.probeOauthDecision && statusOk) {
    oauthDecision = await page.evaluate(async () => {
      const url = new URL("/api/oauth/decision", window.location.href);
      const response = await fetch(url.href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        credentials: "same-origin",
      });
      return {
        status: response.status,
        requestOrigin: url.origin,
        pageOrigin: window.location.origin,
        ok: [400, 401, 403].includes(response.status) && url.origin === window.location.origin,
      };
    }).catch((error) => ({ ok: false, error: safeText(error?.message || String(error)) }));
  }

  let socialHandoff = null;
  if (probe.requireSocialHandoff) {
    const links = Array.isArray(browserState.socialLinks) ? browserState.socialLinks : [];
    const matchingLinks = links.filter((href) => href === SOCIAL_HOST || href.startsWith(`${SOCIAL_HOST}/`));
    socialHandoff = { ok: matchingLinks.length > 0, linkCount: matchingLinks.length };
  }

  let mochiPetsFrame = null;
  if (probe.inspectMochiPetsFrame) {
    const iframeSrcs = Array.isArray(browserState.iframeSrcs) ? browserState.iframeSrcs : [];
    const frameOrigins = iframeSrcs.map((src) => {
      try {
        return new URL(src).origin;
      } catch {
        return "";
      }
    });
    const hasFrame = frameOrigins.length > 0;
    mochiPetsFrame = {
      ok: hasFrame ? frameOrigins.every((origin) => origin === mochiPetsOrigin) : true,
      state: hasFrame ? "rendered" : "not-rendered-in-signed-out-proof",
      frameCount: frameOrigins.length,
      frameOrigins,
      expectedOrigin: mochiPetsOrigin,
    };
    if (!hasFrame) {
      const blocker = `${probe.id} ${viewport.name}: iframe is not rendered in signed-out/default proof; signed-in preview proof is still required before CORS narrowing.`;
      narrowingBlockers.push(blocker);
      warnings.push(blocker);
    }
  }

  await page.close();

  const result = {
    id: probe.id,
    path: probe.path,
    url,
    viewport: viewport.name,
    status,
    statusOk,
    origin: browserState.origin || "",
    title: safeText(browserState.title || ""),
    h1: safeText(browserState.h1 || ""),
    corsConsoleErrors,
    pageErrors,
    gotoError,
    oauthDecision,
    socialHandoff,
    mochiPetsFrame,
  };

  validateBrowserResult(probe, result);
  return result;
}

function validateBrowserResult(probe, result) {
  const label = `${probe.id} ${result.viewport}`;
  if (!result.statusOk) failures.push(`${label}: browser route expected status ${probe.expectedStatus.join(" or ")}, got ${result.status}${result.gotoError ? ` (${result.gotoError})` : ""}.`);
  if (result.origin !== baseUrl) failures.push(`${label}: expected browser origin ${baseUrl}, got ${result.origin || "missing"}.`);
  if (result.corsConsoleErrors.length) failures.push(`${label}: browser console reported CORS error(s): ${result.corsConsoleErrors.map((entry) => entry.text).join(" | ")}`);
  for (const error of result.pageErrors) failures.push(`${label}: page error: ${error}`);
  if (probe.probeOauthDecision && !result.oauthDecision?.ok) {
    failures.push(`${label}: same-origin /api/oauth/decision browser fetch did not fail closed as expected.`);
  }
  if (probe.requireSocialHandoff && !result.socialHandoff?.ok) {
    failures.push(`${label}: no same-tab social handoff link to ${SOCIAL_HOST} was found.`);
  }
  if (probe.inspectMochiPetsFrame && !result.mochiPetsFrame?.ok) {
    failures.push(`${label}: Mochi Pets iframe origin did not match ${mochiPetsOrigin}.`);
  }
}

function futureScopeRecommendation(routeEvidence) {
  const currentHeaderOnEveryRequiredRoute = routeEvidence
    .filter((entry) => entry.requiredHeader)
    .every((entry) => entry.corsOrigin === expectedCorsOrigin);

  return {
    currentGlobalHeader: currentHeaderOnEveryRequiredRoute,
    currentHeaderSource: "apps/web/next.config.ts source /(.*)",
    smallestFuturePattern:
      "/api/:path* is the narrowest candidate if future browser evidence proves any cross-origin JSON route needs CORS; current OAuth, social handoff, and Mochi Pets evidence does not prove public pages or static assets need it.",
    keepUntilBrowserProof:
      "Do not narrow the global header until OAuth consent approve/deny, Pixelfed OIDC return, and Mochi Pets iframe/postMessage are browser-tested on a Vercel preview.",
  };
}

function renderMarkdown(report) {
  const routes = report.routes
    .map((entry) => `| ${entry.id} | ${entry.method} ${entry.path} | ${entry.status} | ${entry.corsOrigin || "missing"} | ${entry.futureCorsNeed} |`)
    .join("\n");
  const staticRows = report.staticProofs
    .map((entry) => `| ${entry.id} | ${entry.file} | ${entry.ok ? "yes" : "no"} | ${entry.claim} |`)
    .join("\n");
  const browserRows = report.browserProof.routes.length
    ? report.browserProof.routes
      .map((entry) => {
        const oauth = entry.oauthDecision ? `${entry.oauthDecision.status}/${entry.oauthDecision.ok ? "ok" : "fail"}` : "n/a";
        const social = entry.socialHandoff ? `${entry.socialHandoff.linkCount}/${entry.socialHandoff.ok ? "ok" : "fail"}` : "n/a";
        const frame = entry.mochiPetsFrame ? `${entry.mochiPetsFrame.state}/${entry.mochiPetsFrame.ok ? "ok" : "fail"}` : "n/a";
        return `| ${entry.id} | ${entry.viewport} | ${entry.status} | ${entry.corsConsoleErrors.length} | ${oauth} | ${social} | ${frame} |`;
      })
      .join("\n")
    : "| skipped | n/a | n/a | n/a | n/a | n/a | n/a |";
  const blockersText = report.browserProof.narrowingBlockers.length
    ? report.browserProof.narrowingBlockers.map((blocker) => `- ${blocker}`).join("\n")
    : "- None";
  const warningsText = report.warnings.length ? report.warnings.map((warning) => `- ${warning}`).join("\n") : "- None";
  const failuresText = report.failures.length ? report.failures.map((failure) => `- ${failure}`).join("\n") : "- None";

  return `# Mochirii CORS Proof\n\nGenerated: ${report.checkedAt}\n\nThis file is intentionally no-secret. It records current website CORS behavior and static/browser handoff evidence only; it does not approve or perform header narrowing.\n\n## Result\n\n- OK: ${report.ok ? "yes" : "no"}\n- Base URL: ${report.baseUrl}\n- Expected CORS origin: ${report.expectedCorsOrigin}\n- Social host: ${report.socialHost}\n- Mochi Pets origin: ${report.mochiPetsOrigin}\n\n## Route Evidence\n\n| Surface | Route | Status | Access-Control-Allow-Origin | Future CORS need |\n| --- | --- | ---: | --- | --- |\n${routes}\n\n## Static Handoff Evidence\n\n| Check | File | OK | Claim |\n| --- | --- | --- | --- |\n${staticRows}\n\n## Browser Proof\n\n- Enabled: ${report.browserProof.enabled ? "yes" : "no"}\n- Browser: ${report.browserProof.browser}\n- Checks: ${report.browserProof.summary.checks}\n- Routes without CORS console errors: ${report.browserProof.summary.noCorsConsoleErrors}/${report.browserProof.summary.checks}\n- Same-origin OAuth decision checks: ${report.browserProof.summary.sameOriginApiChecks}\n- Social handoff checks: ${report.browserProof.summary.socialHandoffChecks}\n- Mochi Pets frame checks: ${report.browserProof.summary.mochiPetsFrameChecks}\n\n| Surface | Viewport | Status | CORS console errors | OAuth decision | Social handoff | Mochi Pets frame |\n| --- | --- | ---: | ---: | --- | --- | --- |\n${browserRows}\n\n## Future Scope Recommendation\n\n- Current global header source: ${report.recommendation.currentHeaderSource}\n- Current required-route global header observed: ${report.recommendation.currentGlobalHeader ? "yes" : "no"}\n- Smallest future candidate: ${report.recommendation.smallestFuturePattern}\n- Guardrail: ${report.recommendation.keepUntilBrowserProof}\n\n## CORS Narrowing Blockers\n\n${blockersText}\n\n## Warnings\n\n${warningsText}\n\n## Failures\n\n${failuresText}\n`;
}

function scanRenderedArtifact(label, text) {
  const patterns = [
    { label: "GitHub token", pattern: /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/ },
    { label: "Supabase PAT", pattern: /\bsbp_[A-Za-z0-9_-]{20,}\b/ },
    { label: "Supabase secret key", pattern: /\bsb_secret_[A-Za-z0-9_-]{12,}\b/ },
    { label: "JWT-like token", pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/ },
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

const routes = [];
for (const probe of routeProbes) {
  try {
    routes.push(await fetchProbe(probe));
  } catch (error) {
    failures.push(`${probe.id}: ${error?.message || String(error)}`);
    routes.push({
      id: probe.id,
      method: probe.method,
      path: probe.path,
      url: absoluteUrl(probe.path),
      surface: probe.surface,
      status: 0,
      statusOk: false,
      corsOrigin: "",
      corsOk: false,
      requiredHeader: probe.requiredHeader,
      futureCorsNeed: probe.futureCorsNeed,
      headers: {},
    });
  }
}

const staticProofs = staticProofChecks.map(inspectStaticProof);
const browserProof = await inspectBrowserProof();
const recommendation = futureScopeRecommendation(routes);

const report = {
  ok: failures.length === 0,
  checkedAt,
  baseUrl,
  expectedCorsOrigin,
  socialHost: SOCIAL_HOST,
  mochiPetsOrigin,
  routes,
  staticProofs,
  browserProof,
  recommendation,
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
  console.error("CORS proof failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CORS proof OK.");
console.log(`- Base URL: ${baseUrl}`);
console.log(`- Required routes with current CORS origin: ${routes.filter((entry) => entry.requiredHeader && entry.corsOk).length}/${routes.filter((entry) => entry.requiredHeader).length}`);
console.log(`- Static proofs: ${staticProofs.filter((entry) => entry.ok).length}/${staticProofs.length}`);
console.log(`- Browser proof checks without CORS console errors: ${browserProof.summary.noCorsConsoleErrors}/${browserProof.summary.checks}`);
if (browserProof.summary.narrowingBlockers) console.log(`- CORS narrowing blockers documented: ${browserProof.summary.narrowingBlockers}`);
if (warnings.length) console.log(`- Warnings documented: ${warnings.length}`);
if (writeReport) {
  console.log(`- JSON report: ${relative(root, reportJsonPath).replace(/\\/g, "/")}`);
  console.log(`- Markdown report: ${relative(root, reportMdPath).replace(/\\/g, "/")}`);
}
