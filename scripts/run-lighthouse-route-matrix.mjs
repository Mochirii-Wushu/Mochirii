import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { lighthouseAuditTargets } from "./lighthouse-route-matrix.mjs";

const args = process.argv.slice(2);
const baseUrl = valueFor("--base-url") || process.env.LIGHTHOUSE_BASE_URL || "https://mochirii.com";
const outDir = valueFor("--out-dir") || "reports/lighthouse";
const root = process.cwd();
const absoluteOutDir = path.resolve(root, outDir);
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const targets = lighthouseAuditTargets(baseUrl);
const results = [];

function valueFor(name) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.split("=").slice(1).join("=");
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1] || "";
  return "";
}

function score(category) {
  return typeof category?.score === "number" ? Math.round(category.score * 100) : null;
}

mkdirSync(absoluteOutDir, { recursive: true });

for (const target of targets) {
  const outputPath = path.join(absoluteOutDir, target.outputId);
  const lighthouseArgs = [
    "--yes",
    "lighthouse@latest",
    target.url,
    "--output=html",
    "--output=json",
    `--output-path=${outputPath}`,
    "--chrome-flags=--headless --no-sandbox",
  ];

  if (target.profile === "desktop") lighthouseArgs.push("--preset=desktop");

  console.log(`\n== Lighthouse ${target.outputId} ==`);
  console.log(`${target.url} (${target.profile})`);

  const result = spawnSync(npxCommand, lighthouseArgs, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`Lighthouse failed for ${target.outputId} with exit code ${result.status}.`);
    process.exit(result.status || 1);
  }

  const jsonPath = `${outputPath}.report.json`;
  const report = JSON.parse(readFileSync(jsonPath, "utf8"));
  results.push({
    id: target.id,
    label: target.label,
    workflow: target.workflow,
    path: target.path,
    url: target.url,
    profile: target.profile,
    output_id: target.outputId,
    html_report: `${target.outputId}.report.html`,
    json_report: `${target.outputId}.report.json`,
    scores: {
      performance: score(report.categories?.performance),
      accessibility: score(report.categories?.accessibility),
      best_practices: score(report.categories?.["best-practices"]),
      seo: score(report.categories?.seo),
    },
    metrics: {
      largest_contentful_paint_ms: report.audits?.["largest-contentful-paint"]?.numericValue ?? null,
      cumulative_layout_shift: report.audits?.["cumulative-layout-shift"]?.numericValue ?? null,
      total_blocking_time_ms: report.audits?.["total-blocking-time"]?.numericValue ?? null,
    },
  });
}

writeFileSync(
  path.join(absoluteOutDir, "summary.json"),
  `${JSON.stringify({ generated_at: new Date().toISOString(), base_url: baseUrl, results }, null, 2)}\n`,
);

console.log(`\nWrote Lighthouse summary for ${results.length} audits.`);
