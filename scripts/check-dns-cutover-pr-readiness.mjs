import { execFileSync, spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const DEFAULT_PR = "181";
const DEFAULT_BRANCH = "dns-cutover-readiness-and-rollback-plan";
const DEFAULT_BASE = "main";
const DEFAULT_REMOTE_BASE = "origin/main";

function argValue(name, fallback = "") {
  const match = args.find((value) => value.startsWith(`${name}=`));
  return match ? match.split("=").slice(1).join("=") : fallback;
}

const pr = argValue("--pr", process.env.DNS_CUTOVER_PR || DEFAULT_PR);
const expectedBranch = argValue("--branch", process.env.DNS_CUTOVER_BRANCH || DEFAULT_BRANCH);
const expectedBase = argValue("--base", process.env.DNS_CUTOVER_BASE || DEFAULT_BASE);
const remoteBase = argValue("--remote-base", process.env.DNS_CUTOVER_REMOTE_BASE || DEFAULT_REMOTE_BASE);
const skipVercelPreview = args.includes("--skip-vercel-preview");

function fail(message) {
  throw new Error(message);
}

function runText(command, commandArgs) {
  return execFileSync(command, commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function runJson(command, commandArgs) {
  return JSON.parse(runText(command, commandArgs));
}

function shortSha(value) {
  return String(value || "").slice(0, 7);
}

function statusName(entry) {
  return entry.context || entry.name || "unknown";
}

function statusState(entry) {
  if (entry.__typename === "StatusContext") return String(entry.state || "unknown").toUpperCase();
  if (entry.status && entry.status !== "COMPLETED") return String(entry.status).toUpperCase();
  return String(entry.conclusion || entry.status || "unknown").toUpperCase();
}

function findStatus(statuses, name) {
  return statuses.find((entry) => statusName(entry) === name);
}

function requireStatus(statuses, name, allowedStates) {
  const entry = findStatus(statuses, name);
  if (!entry) fail(`PR #${pr} is missing required status: ${name}.`);

  const state = statusState(entry);
  if (!allowedStates.includes(state)) {
    fail(`PR #${pr} status ${name} is ${state}; expected ${allowedStates.join(" or ")}.`);
  }

  return state;
}

function runVercelPreviewCheck() {
  if (skipVercelPreview) {
    console.log("- Vercel PR preview check: skipped by flag");
    return;
  }

  console.log("\n== Vercel PR Preview ==");
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmCommand, ["run", "check:vercel-pr-preview", "--", `--pr=${pr}`], {
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) fail(`Vercel PR preview readiness failed with exit code ${result.status}.`);
}

try {
  const localBranch = runText("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  const localHead = runText("git", ["rev-parse", "HEAD"]);
  const [behind = "?", ahead = "?"] = runText("git", [
    "rev-list",
    "--left-right",
    "--count",
    `${remoteBase}...HEAD`,
  ]).split(/\s+/);

  const prData = runJson("gh", [
    "pr",
    "view",
    pr,
    "--json",
    "number,isDraft,baseRefName,headRefName,headRefOid,mergeStateStatus,statusCheckRollup,url",
  ]);

  const statuses = Array.isArray(prData.statusCheckRollup) ? prData.statusCheckRollup : [];
  const validateState = requireStatus(statuses, "validate", ["SUCCESS"]);
  const vercelState = requireStatus(statuses, "Vercel", ["SUCCESS"]);
  const vercelCommentState = requireStatus(statuses, "Vercel Preview Comments", ["SUCCESS"]);
  const supabasePreview = findStatus(statuses, "Supabase Preview");
  const supabasePreviewState = supabasePreview ? statusState(supabasePreview) : "MISSING";

  if (localBranch !== expectedBranch) fail(`Local branch is ${localBranch}; expected ${expectedBranch}.`);
  if (prData.headRefName !== expectedBranch) fail(`PR #${pr} head branch is ${prData.headRefName}; expected ${expectedBranch}.`);
  if (prData.baseRefName !== expectedBase) fail(`PR #${pr} base branch is ${prData.baseRefName}; expected ${expectedBase}.`);
  if (localHead !== prData.headRefOid) {
    fail(`Local HEAD ${shortSha(localHead)} does not match PR #${pr} head ${shortSha(prData.headRefOid)}.`);
  }
  if (!prData.isDraft) fail(`PR #${pr} is not draft. Keep the DNS cutover PR draft until explicit approval.`);
  if (prData.mergeStateStatus !== "CLEAN") {
    fail(`PR #${pr} merge state is ${prData.mergeStateStatus}; expected CLEAN.`);
  }
  if (supabasePreview && !["SKIPPED", "SUCCESS"].includes(supabasePreviewState)) {
    fail(`PR #${pr} Supabase Preview status is ${supabasePreviewState}; expected SKIPPED or SUCCESS.`);
  }

  console.log("DNS cutover PR readiness:");
  console.log(`- PR: #${prData.number}`);
  console.log(`- URL: ${prData.url}`);
  console.log(`- Draft: ${prData.isDraft ? "yes" : "no"}`);
  console.log(`- Base: ${prData.baseRefName}`);
  console.log(`- Branch: ${prData.headRefName}`);
  console.log(`- Local head: ${shortSha(localHead)}`);
  console.log(`- Branch comparison: ${behind} behind / ${ahead} ahead vs ${remoteBase}`);
  console.log(`- Merge state: ${prData.mergeStateStatus}`);
  console.log(`- GitHub validate: ${validateState}`);
  console.log(`- Vercel: ${vercelState}`);
  console.log(`- Vercel Preview Comments: ${vercelCommentState}`);
  console.log(`- Supabase Preview: ${supabasePreviewState}`);

  runVercelPreviewCheck();

  console.log("\nDNS cutover PR readiness OK (read-only; no DNS/provider mutation performed).");
} catch (error) {
  console.error(`DNS cutover PR readiness failed: ${error?.message || error}`);
  console.error("No secrets, raw env values, private packet values, or account names were printed.");
  process.exit(1);
}
