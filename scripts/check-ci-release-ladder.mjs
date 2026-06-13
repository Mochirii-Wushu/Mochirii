import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) {
    throw new Error(`${label} is missing required snippet: ${snippet}`);
  }
}

function assertMatches(label, text, pattern) {
  if (!pattern.test(text)) {
    throw new Error(`${label} is missing required pattern: ${pattern}`);
  }
}

const staticWorkflow = read(".github/workflows/validate-static-site.yml");
const nextWorkflow = read(".github/workflows/validate-next-app.yml");
const productionSmokeWorkflow = read(".github/workflows/production-smoke.yml");
const packageJson = read("package.json");
const checkAll = read("scripts/check-all.mjs");
const deploymentDocs = read("docs/deployment.md");

assertIncludes("package.json", packageJson, '"check:ci-release-ladder": "node scripts/check-ci-release-ladder.mjs"');
assertIncludes("check-all", checkAll, '["check:ci-release-ladder", ["node", "scripts/check-ci-release-ladder.mjs"]]');

assertIncludes("static validation workflow", staticWorkflow, "pull_request:");
assertIncludes("static validation workflow", staticWorkflow, "branches:");
assertIncludes("static validation workflow", staticWorkflow, "- main");
assertIncludes("static validation workflow", staticWorkflow, "uses: actions/setup-node@v6");
assertIncludes("static validation workflow", staticWorkflow, "node-version: 22");
assertIncludes("static validation workflow", staticWorkflow, "uses: denoland/setup-deno@v2");
assertIncludes("static validation workflow", staticWorkflow, "deno-version: v2.x");
assertIncludes("static validation workflow", staticWorkflow, "npm run check");
assertIncludes("static validation workflow", staticWorkflow, "git diff --check");
assertIncludes("static validation workflow", staticWorkflow, "BASE_SHA");
assertIncludes("static validation workflow", staticWorkflow, "HEAD_SHA");

assertIncludes("Next validation workflow", nextWorkflow, "pull_request:");
assertIncludes("Next validation workflow", nextWorkflow, "working-directory: apps/web");
assertIncludes("Next validation workflow", nextWorkflow, "uses: actions/setup-node@v6");
assertIncludes("Next validation workflow", nextWorkflow, "node-version: 22");
assertIncludes("Next validation workflow", nextWorkflow, "cache-dependency-path: apps/web/package-lock.json");
assertIncludes("Next validation workflow", nextWorkflow, "npm ci");
assertIncludes("Next validation workflow", nextWorkflow, "npm run lint");
assertIncludes("Next validation workflow", nextWorkflow, "npm run build");

assertIncludes("production smoke workflow", productionSmokeWorkflow, "workflow_dispatch:");
assertIncludes("production smoke workflow", productionSmokeWorkflow, "schedule:");
assertIncludes("production smoke workflow", productionSmokeWorkflow, 'cron: "30 9 * * 1"');
assertIncludes("production smoke workflow", productionSmokeWorkflow, "npm run check:production");
assertIncludes("production smoke workflow", productionSmokeWorkflow, "npm run smoke:vercel-production -- --base-url=https://mochirii.com");
assertIncludes("production smoke workflow", productionSmokeWorkflow, "npm run smoke:supabase-edge-functions");
assertIncludes(
  "production smoke workflow",
  productionSmokeWorkflow,
  "npm run smoke:dns-cutover-post -- --base-url=https://mochirii.com --www-mode=redirect",
);

assertMatches("deployment docs", deploymentDocs, /scheduled\/manual production smoke workflow/i);
assertIncludes("deployment docs", deploymentDocs, "npm run check:ci-release-ladder");

console.log("CI release ladder validation OK.");
