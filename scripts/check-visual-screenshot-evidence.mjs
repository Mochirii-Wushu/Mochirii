import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, relative, resolve } from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReports = args.has("--write") || process.env.VISUAL_SCREENSHOT_EVIDENCE_WRITE === "true";
const checkedAt = new Date().toISOString();
const reportJsonPath = resolve(root, "reports/visual-screenshot-evidence.json");
const reportMdPath = resolve(root, "reports/visual-screenshot-evidence.md");
const failures = [];
const warnings = [];

const sourceLinks = [
  "https://playwright.dev/docs/screenshots",
  "https://playwright.dev/docs/test-snapshots",
  "https://www.w3.org/TR/WCAG22/",
  "https://www.w3.org/WAI/WCAG22/Understanding/reflow.html",
  "https://web.dev/articles/vitals",
];

const viewports = [
  { width: 360, height: 800, label: "tight mobile" },
  { width: 390, height: 844, label: "common mobile" },
  { width: 768, height: 1024, label: "tablet portrait" },
  { width: 1024, height: 768, label: "compact desktop" },
  { width: 1440, height: 1000, label: "wide desktop" },
];

const publicRoutes = [
  "/",
  "/join",
  "/events",
  "/gallery",
  "/ranks",
  "/leaders",
  "/codex",
  "/recruitment",
  "/announcements",
  "/raffles",
  "/spotify",
  "/spotlight",
  "/twills",
];

const protectedRoutes = [
  "/auth",
  "/account",
  "/gallery-submit",
  "/leader-dashboard",
  "/members",
  "/members/[slug]",
  "/games/mochi-social",
];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function assertIncludes(label, text, snippet) {
  assert(text.includes(snippet), `${label}: expected snippet not found: ${snippet}`);
}

function read(relativePath) {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) {
    fail(`missing file: ${relativePath}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function pathForReport(file) {
  return relative(root, resolve(file)).replace(/\\/g, "/");
}

function routeFile(route) {
  if (route === "/") return "apps/web/app/page.tsx";
  if (route === "/members/[slug]") return "apps/web/app/members/[slug]/page.tsx";
  return `apps/web/app${route}/page.tsx`;
}

function checkDoc() {
  const doc = read("docs/visual-screenshot-evidence.md");

  for (const link of sourceLinks) assertIncludes("visual screenshot evidence doc", doc, link);
  for (const viewport of viewports) assertIncludes("visual screenshot evidence doc", doc, `\`${viewport.width}x${viewport.height}\``);
  for (const route of [...publicRoutes, ...protectedRoutes]) assertIncludes("visual screenshot evidence doc", doc, route);

  assertIncludes("visual screenshot evidence doc", doc, "Commit no screenshot image files by default.");
  assertIncludes("visual screenshot evidence doc", doc, "This command is local-only and does not capture images");
  assertIncludes("visual screenshot evidence doc", doc, "screenshots from logged-in member or moderator pages");
  assertIncludes("visual screenshot evidence doc", doc, "If screenshot evidence is needed for a protected workflow");
}

function checkRouteFiles() {
  for (const route of [...publicRoutes, ...protectedRoutes]) {
    const file = routeFile(route);
    assert(existsSync(resolve(root, file)), `${route}: expected route file at ${file}`);
  }

  for (const route of protectedRoutes) {
    const source = read(routeFile(route));
    assert(/robots:\s*\{[\s\S]*index:\s*false/.test(source), `${route}: protected/member route must stay noindex.`);
  }
}

function checkNoCommittedScreenshotArtifacts() {
  const git = spawnSync("git", ["ls-files"], { cwd: root, encoding: "utf8" });
  if (git.status !== 0) {
    warn("git ls-files unavailable; skipped committed screenshot artifact inventory.");
    return [];
  }

  const tracked = git.stdout.split(/\r?\n/).filter(Boolean);
  const screenshotArtifacts = tracked.filter((file) => {
    const normalized = file.replace(/\\/g, "/");
    if (!/\.(?:png|jpe?g|webp|gif)$/i.test(normalized)) return false;
    if (/^reports\/(?:visual-screenshot|visual-screenshots|screenshots?)(?:\/|-)/i.test(normalized)) return true;
    if (/^reports\/.*screenshot.*\.(?:png|jpe?g|webp|gif)$/i.test(normalized)) return true;
    return false;
  });

  for (const file of screenshotArtifacts) fail(`committed screenshot artifact must stay private or explicitly reviewed: ${file}`);
  return screenshotArtifacts;
}

function checkExistingGuards() {
  const rehearsal = read("scripts/check-dns-cutover-rehearsal.mjs");
  assert(/screenshots?\?/.test(rehearsal), "DNS cutover rehearsal should keep screenshot artifact filename guards.");
  assert(/private|operator|evidence/i.test(rehearsal), "DNS cutover rehearsal should protect private/operator evidence paths.");

  const accessibility = read("scripts/check-accessibility-route-matrix.mjs");
  assertIncludes("accessibility matrix", accessibility, "360");
  assertIncludes("accessibility matrix", accessibility, "390");
  assertIncludes("accessibility matrix", accessibility, "1024");
  assertIncludes("accessibility matrix", accessibility, "1440");
}

function buildReport(screenshotArtifacts) {
  return {
    ok: failures.length === 0,
    checkedAt,
    scope:
      "Mochirii visual screenshot evidence matrix. This is a local-only, no-secret guardrail for deciding when and how screenshot evidence should be captured after UI changes.",
    sources: sourceLinks,
    viewports,
    publicRoutes: publicRoutes.map((route) => ({
      route,
      file: routeFile(route),
      screenshotPolicy: "public signed-out screenshots allowed only when useful and reviewed",
    })),
    protectedRoutes: protectedRoutes.map((route) => ({
      route,
      file: routeFile(route),
      screenshotPolicy: "do not commit; use DOM metrics or private operator evidence",
      noindexExpected: true,
    })),
    capturePolicy: {
      defaultCommittedScreenshots: "none",
      publicReportsPrefer: ["route matrix", "DOM measurements", "pass/fail notes", "redacted Markdown/JSON"],
      privateEvidenceOnlyFor: ["logged-in member workflows", "moderator queues", "provider dashboards", "real Discord channel state"],
      stableBaselineRequirement: "generate and compare screenshot baselines in one stable CI/browser environment before making them blocking",
    },
    committedScreenshotArtifacts: screenshotArtifacts,
    warnings,
    failures,
  };
}

function renderMarkdown(report) {
  const sourceRows = report.sources.map((source) => `- ${source}`).join("\n");
  const viewportRows = report.viewports.map((viewport) => `| ${viewport.width}x${viewport.height} | ${viewport.label} |`).join("\n");
  const publicRows = report.publicRoutes
    .map((route) => `| \`${route.route}\` | ${route.file} | ${route.screenshotPolicy} |`)
    .join("\n");
  const protectedRows = report.protectedRoutes
    .map((route) => `| \`${route.route}\` | ${route.file} | ${route.screenshotPolicy} |`)
    .join("\n");
  const artifactRows = report.committedScreenshotArtifacts.length
    ? report.committedScreenshotArtifacts.map((file) => `- ${file}`).join("\n")
    : "- None";
  const warningRows = report.warnings.length ? report.warnings.map((warning) => `- ${warning}`).join("\n") : "- None";
  const failureRows = report.failures.length ? report.failures.map((failure) => `- ${failure}`).join("\n") : "- None";

  return `# Visual Screenshot Evidence Report

Generated: ${report.checkedAt}

This report is intentionally no-secret. It records screenshot evidence policy and route coverage only; it does not capture screenshots or call providers.

## Result

- OK: ${report.ok ? "yes" : "no"}
- Public routes: ${report.publicRoutes.length}
- Protected routes: ${report.protectedRoutes.length}
- Default committed screenshots: ${report.capturePolicy.defaultCommittedScreenshots}

## Source Basis

${sourceRows}

## Viewports

| Viewport | Purpose |
| --- | --- |
${viewportRows}

## Public Route Screenshot Candidates

| Route | File | Policy |
| --- | --- | --- |
${publicRows}

## Protected Route Policy

| Route | File | Policy |
| --- | --- | --- |
${protectedRows}

## Committed Screenshot Artifacts

${artifactRows}

## Warnings

${warningRows}

## Failures

${failureRows}
`;
}

function scanNoSecretArtifact(label, text) {
  const forbiddenPatterns = [
    { label: "GitHub token", pattern: /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/ },
    { label: "Supabase secret key", pattern: /\bsb_secret_[A-Za-z0-9_-]{12,}\b/ },
    { label: "JWT-like token", pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/ },
    { label: "Discord bot token", pattern: /\b[A-Za-z0-9_-]{23,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{27,}\b/ },
    {
      label: "Discord webhook URL",
      pattern: /https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/,
    },
    { label: "private key block", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/ },
    {
      label: "service-role assignment",
      pattern: /\b(?:SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY)\s*[:=]\s*["']?(?!<|REDACTED|redacted|not read|placeholder)[^\s"',]+/i,
    },
    {
      label: "raw cookie header",
      pattern: /\bCookie:\s*[^;\s]+=/i,
    },
  ];

  String(text || "")
    .split(/\r?\n/)
    .forEach((line, index) => {
      for (const { label: patternLabel, pattern } of forbiddenPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) fail(`${label}: line ${index + 1} contains forbidden ${patternLabel}.`);
      }
    });
}

checkDoc();
checkRouteFiles();
checkExistingGuards();
const screenshotArtifacts = checkNoCommittedScreenshotArtifacts();

const report = buildReport(screenshotArtifacts);
const renderedJson = `${JSON.stringify(report, null, 2)}\n`;
const renderedMarkdown = renderMarkdown(report);
scanNoSecretArtifact("rendered visual screenshot evidence JSON", renderedJson);
scanNoSecretArtifact("rendered visual screenshot evidence markdown", renderedMarkdown);
report.ok = failures.length === 0;

if (writeReports) {
  mkdirSync(dirname(reportJsonPath), { recursive: true });
  writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(reportMdPath, renderMarkdown(report), "utf8");
}

for (const file of [resolve(root, "docs/visual-screenshot-evidence.md"), reportJsonPath, reportMdPath]) {
  if (existsSync(file)) scanNoSecretArtifact(pathForReport(file), readFileSync(file, "utf8"));
}

if (failures.length) {
  console.error("Visual screenshot evidence validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

for (const warning of warnings) console.log(`NOTE ${warning}`);
console.log(`Visual screenshot evidence validation OK (${publicRoutes.length} public routes, ${protectedRoutes.length} protected routes).`);
if (writeReports) {
  console.log(`- JSON report: ${pathForReport(reportJsonPath)}`);
  console.log(`- Markdown report: ${pathForReport(reportMdPath)}`);
}
