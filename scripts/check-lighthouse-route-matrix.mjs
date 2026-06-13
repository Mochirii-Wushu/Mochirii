import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { lighthouseAuditTargets, lighthouseRouteMatrix } from "./lighthouse-route-matrix.mjs";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has("--write");
const reportJsonPath = path.join(root, "reports/lighthouse-route-matrix.json");
const reportMdPath = path.join(root, "reports/lighthouse-route-matrix.md");
const workflowPath = ".github/workflows/manual-lighthouse.yml";
const checks = [];

const sourceBasis = [
  {
    label: "Chrome Lighthouse",
    url: "https://developer.chrome.com/docs/lighthouse/overview",
    note: "Lighthouse audits page quality across performance, accessibility, SEO, and related categories.",
  },
  {
    label: "web.dev Web Vitals",
    url: "https://web.dev/articles/vitals",
    note: "Core Web Vitals keep LCP, CLS, and INP visible as current user-experience signals.",
  },
  {
    label: "web.dev Lighthouse CI",
    url: "https://web.dev/articles/lighthouse-ci",
    note: "Repeatable Lighthouse evidence is useful for tracking changes over time without making this a required score gate.",
  },
  {
    label: "GitHub Actions artifacts",
    url: "https://docs.github.com/en/actions/tutorials/store-and-share-data",
    note: "Manual workflow artifacts keep bulky Lighthouse HTML/JSON output out of Git.",
  },
];

function read(rel) {
  return readFileSync(path.join(root, ...rel.split("/")), "utf8");
}

function addCheck(area, name, status, detail, evidence = {}) {
  checks.push({ area, name, status, detail, evidence });
}

function pass(area, name, detail, evidence) {
  addCheck(area, name, "pass", detail, evidence);
}

function fail(area, name, detail, evidence) {
  addCheck(area, name, "fail", detail, evidence);
}

function assertIncludes(label, text, snippet) {
  if (text.includes(snippet)) pass("static wiring", label, `includes ${snippet}`);
  else fail("static wiring", label, `missing ${snippet}`, { expected: snippet });
}

const packageJson = read("package.json");
const checkAll = read("scripts/check-all.mjs");
const workflow = read(workflowPath);
const deployment = read("docs/deployment.md");
const currentLiveState = read("docs/current-live-state.md");

const targets = lighthouseAuditTargets();
const requiredRoutes = [
  "/",
  "/join",
  "/events",
  "/gallery",
  "/recruitment",
  "/auth",
  "/account",
  "/members",
  "/gallery-submit",
  "/leader-dashboard",
  "/games/mochi-social",
];

assertIncludes("package script", packageJson, '"check:lighthouse-route-matrix": "node scripts/check-lighthouse-route-matrix.mjs"');
assertIncludes("check-all", checkAll, '["check:lighthouse-route-matrix", ["node", "scripts/check-lighthouse-route-matrix.mjs"]]');
assertIncludes("manual workflow runner", workflow, "node scripts/run-lighthouse-route-matrix.mjs");
assertIncludes("manual workflow base URL", workflow, "--base-url=https://mochirii.com");
assertIncludes("manual workflow artifact", workflow, "path: reports/lighthouse/");
assertIncludes("deployment docs", deployment, "npm run check:lighthouse-route-matrix -- --write");
assertIncludes("live-state docs", currentLiveState, "npm run check:lighthouse-route-matrix");

for (const route of requiredRoutes) {
  const matrixRoute = lighthouseRouteMatrix.find((item) => item.path === route);
  if (matrixRoute) pass("route coverage", route, `${matrixRoute.label} is included in the Lighthouse route matrix.`);
  else fail("route coverage", route, "missing from Lighthouse route matrix.");
}

for (const route of lighthouseRouteMatrix) {
  if (!/^[a-z0-9-]+$/.test(route.id)) fail("route ids", route.id, "route id must be URL/file safe.");
  else pass("route ids", route.id, "route id is URL/file safe.");

  if (route.profiles.length < 1) fail("route profiles", route.id, "at least one Lighthouse profile is required.");
  for (const profile of route.profiles) {
    if (profile === "mobile" || profile === "desktop") pass("route profiles", `${route.id}:${profile}`, "supported profile.");
    else fail("route profiles", `${route.id}:${profile}`, "unsupported profile.");
  }
}

if (targets.length >= requiredRoutes.length) {
  pass("audit target count", "targets", `${targets.length} Lighthouse audits are configured.`);
} else {
  fail("audit target count", "targets", `${targets.length} audits configured for ${requiredRoutes.length} required routes.`);
}

const failures = checks.filter((check) => check.status === "fail");
const report = {
  generated_at: new Date().toISOString(),
  status: failures.length ? "fail" : "pass",
  source_basis: sourceBasis,
  summary: {
    routes: lighthouseRouteMatrix.length,
    audit_targets: targets.length,
    required_routes: requiredRoutes.length,
    failures: failures.length,
  },
  routes: lighthouseRouteMatrix,
  audit_targets: targets.map((target) => ({
    id: target.id,
    output_id: target.outputId,
    label: target.label,
    path: target.path,
    profile: target.profile,
    workflow: target.workflow,
  })),
  checks,
};

function markdownEscape(value) {
  return String(value).replace(/\r?\n/g, " ").replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

function makeMarkdown() {
  const sourceRows = sourceBasis
    .map((source) => `| [${markdownEscape(source.label)}](${source.url}) | ${markdownEscape(source.note)} |`)
    .join("\n");
  const targetRows = report.audit_targets
    .map(
      (target) =>
        `| ${[
          markdownEscape(target.output_id),
          markdownEscape(target.path),
          markdownEscape(target.profile),
          markdownEscape(target.workflow),
        ].join(" | ")} |`,
    )
    .join("\n");
  const checkRows = checks
    .map(
      (check) =>
        `| ${[
          markdownEscape(check.status.toUpperCase()),
          markdownEscape(check.area),
          markdownEscape(check.name),
          markdownEscape(check.detail),
        ].join(" | ")} |`,
    )
    .join("\n");

  return `# Lighthouse Route Matrix

Generated: ${report.generated_at}

This no-secret report defines the optional manual Lighthouse audit matrix for the live Vercel/Next production domain. It keeps route coverage explicit while avoiding required score gates in ordinary PR validation.

## Summary

- Status: ${report.status.toUpperCase()}
- Routes covered: ${report.summary.routes}
- Lighthouse audit targets: ${report.summary.audit_targets}
- Required backlog routes: ${report.summary.required_routes}
- Failures: ${report.summary.failures}
- Live mutation: none

## Source Basis

| Source | Why It Matters |
| --- | --- |
${sourceRows}

## Audit Targets

| Output ID | Route | Profile | Workflow |
| --- | --- | --- | --- |
${targetRows}

## Findings

| Status | Area | Check | Detail |
| --- | --- | --- | --- |
${checkRows}

## Operator Notes

- Run the GitHub Actions workflow **Manual Lighthouse audit** when production evidence is needed.
- The workflow uploads raw Lighthouse HTML/JSON artifacts; do not commit those bulky generated artifacts.
- This route matrix is evidence only. It does not create required Lighthouse score gates.
`;
}

if (writeReport) {
  mkdirSync(path.dirname(reportMdPath), { recursive: true });
  writeFileSync(reportMdPath, makeMarkdown());
  writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log("Wrote Lighthouse route matrix reports.");
}

if (failures.length) {
  console.error(`Lighthouse route matrix check failed (${failures.length} failures).`);
  for (const failure of failures) console.error(`- ${failure.area}: ${failure.name}: ${failure.detail}`);
  process.exit(1);
}

console.log(`Lighthouse route matrix OK (${targets.length} audit targets across ${lighthouseRouteMatrix.length} routes).`);
