import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const requiredFiles = [
  "docs/supabase-metrics-observability.md",
  "docs/supabase-cost-usage-runbook.md",
  "docs/deployment.md",
  "docs/current-live-state.md",
  "supabase/README.md",
  "apps/web/README.md",
  "package.json",
  "scripts/check-all.mjs",
  "scripts/check-mochi-social-report-hygiene.mjs",
];

const docs = new Map(requiredFiles.map((file) => [file, read(file)]));

const mainDoc = docs.get("docs/supabase-metrics-observability.md");
const costRunbook = docs.get("docs/supabase-cost-usage-runbook.md");
const deployment = docs.get("docs/deployment.md");
const currentLiveState = docs.get("docs/current-live-state.md");
const supabaseReadme = docs.get("supabase/README.md");
const appReadme = docs.get("apps/web/README.md");
const packageJson = docs.get("package.json");
const checkAll = docs.get("scripts/check-all.mjs");
const reportHygiene = docs.get("scripts/check-mochi-social-report-hygiene.mjs");

assertIncludes("metrics runbook", mainDoc, "Supabase Metrics API");
assertIncludes("metrics runbook", mainDoc, "currently in beta");
assertIncludes("metrics runbook", mainDoc, "hosted Supabase projects");
assertIncludes("metrics runbook", mainDoc, "Prometheus-compatible");
assertIncludes("metrics runbook", mainDoc, "HTTP Basic Auth");
assertIncludes("metrics runbook", mainDoc, "/customer/v1/privileged/metrics");
assertIncludes("metrics runbook", mainDoc, "https://deyvmtncimmcinldjyqe.supabase.co/customer/v1/privileged/metrics");
assertIncludes("metrics runbook", mainDoc, "60 seconds");
assertIncludes("metrics runbook", mainDoc, "scrape_interval: 60s");
assertIncludes("metrics runbook", mainDoc, "username: service_role");
assertIncludes("metrics runbook", mainDoc, "Basic Auth username");
assertIncludes("metrics runbook", mainDoc, "dedicated Supabase Secret API key");
assertIncludes("metrics runbook", mainDoc, "sb_secret_...");
assertIncludes("metrics runbook", mainDoc, "NEXT_PUBLIC_*");
assertIncludes("metrics runbook", mainDoc, "Mochi Social game runtime");
assertIncludes("metrics runbook", mainDoc, "Grafana Cloud");
assertIncludes("metrics runbook", mainDoc, "self-hosted");
assertIncludes("metrics runbook", mainDoc, "Vendor-neutral");
assertIncludes("metrics runbook", mainDoc, "Log drains");
assertIncludes("metrics runbook", mainDoc, "SUPABASE_METRICS_ALLOW_LIVE=1");
assertIncludes("metrics runbook", mainDoc, "must not print response bodies");

assertIncludes("cost runbook", costRunbook, "Supabase Metrics API Boundary");
assertIncludes("cost runbook", costRunbook, "https://deyvmtncimmcinldjyqe.supabase.co/customer/v1/privileged/metrics");
assertIncludes("cost runbook", costRunbook, "service_role");
assertIncludes("cost runbook", costRunbook, "60 seconds");
assertIncludes("cost runbook", costRunbook, "Mochi Social game runtime env");
assertIncludes("cost runbook", costRunbook, "Log drains are separate");

assertIncludes("deployment docs", deployment, "npm run check:supabase-metrics-observability");
assertIncludes("deployment docs", deployment, "does not contact Supabase or configure providers");

assertIncludes("current live state", currentLiveState, "Supabase Metrics Observability");
assertIncludes("current live state", currentLiveState, "npm run check:supabase-metrics-observability");

assertIncludes("Supabase README", supabaseReadme, "Metrics API Secret API keys");
assertIncludes("Supabase README", supabaseReadme, "docs/supabase-metrics-observability.md");

assertIncludes("app README", appReadme, "Supabase Metrics API monitoring is separate from Vercel observability");
assertIncludes("app README", appReadme, "Do not add Supabase Metrics API Secret API keys to this app");

assertIncludes("package scripts", packageJson, "\"check:supabase-metrics-observability\"");
assertIncludes("check-all", checkAll, "check:supabase-metrics-observability");

assertIncludes("report hygiene", reportHygiene, "supabase-metrics-operator-checklist.md");
assertIncludes("report hygiene", reportHygiene, "Grafana service account token");
assertIncludes("report hygiene", reportHygiene, "Supabase metrics key assignment");

scanForSecrets({
  "metrics runbook": mainDoc,
  "cost runbook": costRunbook,
  "deployment docs": deployment,
  "current live state": currentLiveState,
  "Supabase README": supabaseReadme,
  "app README": appReadme,
});

if (failures.length) {
  console.error("Supabase metrics observability validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Supabase metrics observability validation OK.");

function read(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!existsSync(absolute)) {
    failures.push(`${relativePath}: missing file`);
    return "";
  }
  return readFileSync(absolute, "utf8");
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) {
    failures.push(`${label}: expected snippet not found: ${snippet}`);
  }
}

function scanForSecrets(entries) {
  const forbiddenPatterns = [
    { label: "real Supabase Secret API key", pattern: /\bsb_secret_[A-Za-z0-9_-]{12,}\b/ },
    { label: "Supabase service-role assignment", pattern: /\bSUPABASE_SERVICE_ROLE_KEY\s*=\s*["']?(?!<|REDACTED|redacted|placeholder)[^\s"']+/i },
    { label: "Supabase metrics key assignment", pattern: /\bSUPABASE_METRICS_(?:SECRET_API_KEY|API_KEY|PASSWORD)\s*=\s*["']?(?!<|REDACTED|redacted|placeholder)[^\s"']+/i },
    { label: "Grafana service account token", pattern: /\bgl(?:c|sa)_[A-Za-z0-9_=-]{20,}\b/i },
    { label: "Prometheus basic auth password", pattern: /\bpassword:\s*["']?(?!<|REDACTED|redacted|placeholder)[A-Za-z0-9_-]{20,}\b/i },
  ];

  for (const [label, text] of Object.entries(entries)) {
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const { label: patternLabel, pattern } of forbiddenPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          failures.push(`${label}: line ${index + 1}: ${patternLabel}`);
        }
      }
    });
  }
}
