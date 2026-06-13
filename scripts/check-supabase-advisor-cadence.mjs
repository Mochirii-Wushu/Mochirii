import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const files = {
  packageJson: "package.json",
  checkAll: "scripts/check-all.mjs",
  runbook: "docs/supabase-advisor-cadence.md",
  deployment: "docs/deployment.md",
  currentLiveState: "docs/current-live-state.md",
  supabaseReadme: "supabase/README.md",
  fullStackEvidence: "scripts/check-full-stack-release-evidence.mjs",
};

function read(relativePath) {
  const file = path.join(root, relativePath);
  if (!existsSync(file)) {
    failures.push(`${relativePath}: missing required Supabase advisor cadence file.`);
    return "";
  }
  return readFileSync(file, "utf8");
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) failures.push(`${label}: missing ${snippet}`);
}

function assertNotIncludes(label, text, snippet) {
  if (text.includes(snippet)) failures.push(`${label}: must not include ${snippet}`);
}

function scanSecretLikeText(label, text) {
  const patterns = [
    { name: "GitHub token", pattern: /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/ },
    { name: "Supabase secret key", pattern: /\bsb_secret_[A-Za-z0-9_-]{12,}\b/ },
    { name: "JWT-like token", pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/ },
    { name: "Discord bot token", pattern: /\b[A-Za-z0-9_-]{23,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{27,}\b/ },
    { name: "connection password", pattern: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/i },
    { name: "raw cookie header", pattern: /\bCookie:\s*[^;\s]+=/i },
  ];

  for (const [index, line] of String(text || "").split(/\r?\n/).entries()) {
    for (const { name, pattern } of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) failures.push(`${label}: line ${index + 1} contains ${name}.`);
    }
  }
}

const packageJson = read(files.packageJson);
const checkAll = read(files.checkAll);
const runbook = read(files.runbook);
const deployment = read(files.deployment);
const currentLiveState = read(files.currentLiveState);
const supabaseReadme = read(files.supabaseReadme);
const fullStackEvidence = read(files.fullStackEvidence);

assertIncludes("package.json", packageJson, '"check:supabase-advisor-cadence"');
assertIncludes("check-all", checkAll, "check:supabase-advisor-cadence");
assertIncludes("full-stack evidence", fullStackEvidence, "check:supabase-advisor-cadence");
assertIncludes("full-stack evidence", fullStackEvidence, "docs/supabase-advisor-cadence.md");

[
  "https://supabase.com/docs/guides/database/database-advisors",
  "https://supabase.com/docs/reference/cli/introduction",
  "https://supabase.com/docs/guides/deployment/database-migrations",
  "https://supabase.com/docs/guides/deployment/managing-environments",
  "https://supabase.com/docs/guides/deployment/shared-responsibility-model",
  "Run this review monthly",
  "This cadence is read-only evidence.",
  "supabase db lint --local --schema public,storage,auth,extensions --fail-on error",
  "supabase db lint --linked --schema public,storage,auth,extensions --fail-on error",
  "Security Advisor reviewed",
  "Performance Advisor reviewed",
  "Never record:",
  "service-role keys",
  "full connection strings",
  "supabase db push",
  "supabase functions deploy",
  "supabase secrets set",
  "Project ref: deyvmtncimmcinldjyqe",
].forEach((snippet) => assertIncludes("Supabase advisor cadence runbook", runbook, snippet));

[
  "docs/supabase-advisor-cadence.md",
  "npm run check:supabase-advisor-cadence",
].forEach((snippet) => assertIncludes("deployment docs", deployment, snippet));

[
  "docs/supabase-advisor-cadence.md",
  "monthly Supabase advisor/lint cadence",
].forEach((snippet) => assertIncludes("current live state", currentLiveState, snippet));

assertIncludes("supabase README", supabaseReadme, "docs/supabase-advisor-cadence.md");
assertIncludes("supabase README", supabaseReadme, "Dashboard Security Advisor and Performance Advisor");

[
  "SUPABASE_SERVICE_ROLE_KEY=",
  "SERVICE_ROLE_KEY=",
  "DISCORD_BOT_TOKEN=",
  "ENJIN_PLATFORM_TOKEN=",
].forEach((snippet) => assertNotIncludes("Supabase advisor cadence runbook", runbook, snippet));

scanSecretLikeText("Supabase advisor cadence runbook", runbook);

if (failures.length) {
  console.error("Supabase advisor cadence validation failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Supabase advisor cadence validation OK.");
