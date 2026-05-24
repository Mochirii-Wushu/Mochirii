import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const DEFAULT_PR = "181";
const DEFAULT_PROJECT = "mochirii";

function argValue(name, fallback = "") {
  const match = args.find((value) => value.startsWith(`${name}=`));
  return match ? match.split("=").slice(1).join("=") : fallback;
}

function runJson(command, commandArgs) {
  const output = execFileSync(command, commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(output);
}

function shortSha(sha) {
  return String(sha || "").slice(0, 7);
}

function findVercelRollup(statusCheckRollup = []) {
  return statusCheckRollup.find((entry) => entry.context === "Vercel" || entry.name === "Vercel");
}

function normalizeGithubVercelStatus(entry) {
  if (!entry) return { state: "missing", description: "No Vercel status context found.", targetUrl: "" };

  if (entry.__typename === "StatusContext") {
    return {
      state: String(entry.state || "unknown").toLowerCase(),
      description: entry.description || "",
      targetUrl: entry.targetUrl || "",
    };
  }

  return {
    state: String(entry.conclusion || entry.status || "unknown").toLowerCase(),
    description: entry.name || "",
    targetUrl: entry.detailsUrl || "",
  };
}

function latestDeploymentForSha(project, sha) {
  const data = runJson("npm", [
    "exec",
    "--",
    "vercel",
    "list",
    project,
    "--format",
    "json",
    "-m",
    `githubCommitSha=${sha}`,
  ]);

  const deployments = Array.isArray(data.deployments) ? data.deployments : [];
  return deployments.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0] || null;
}

function deploymentSafeSummary(deployment) {
  if (!deployment) return null;

  return {
    url: deployment.url || "",
    state: deployment.state || "unknown",
    target: deployment.target || "preview",
    branchAlias: deployment.meta?.branchAlias || "",
  };
}

function fail(message) {
  throw new Error(message);
}

const pr = argValue("--pr", process.env.VERCEL_PR_PREVIEW_PR || DEFAULT_PR);
const project = argValue("--project", process.env.VERCEL_PR_PREVIEW_PROJECT || DEFAULT_PROJECT);

try {
  const prData = runJson("gh", [
    "pr",
    "view",
    pr,
    "--json",
    "number,headRefName,headRefOid,statusCheckRollup,url",
  ]);

  const sha = prData.headRefOid;
  if (!sha) fail(`PR #${pr} has no head SHA.`);

  const rollupStatus = normalizeGithubVercelStatus(findVercelRollup(prData.statusCheckRollup));
  const commitStatus = runJson("gh", [
    "api",
    `repos/Mochirii-Wushu/Mochirii/commits/${sha}/status`,
  ]);
  const latestVercelStatus = (commitStatus.statuses || []).find((status) => status.context === "Vercel");
  const deploymentSummary = deploymentSafeSummary(latestDeploymentForSha(project, sha));

  console.log("Vercel PR preview readiness:");
  console.log(`- PR: #${prData.number}`);
  console.log(`- Branch: ${prData.headRefName}`);
  console.log(`- Head: ${shortSha(sha)}`);
  console.log(`- GitHub Vercel rollup: ${rollupStatus.state}`);
  if (latestVercelStatus) {
    console.log(`- GitHub Vercel commit status: ${latestVercelStatus.state}`);
    console.log(`- GitHub Vercel status updated: ${latestVercelStatus.updated_at}`);
  } else {
    console.log("- GitHub Vercel commit status: missing");
  }

  if (!deploymentSummary) {
    fail(`No Vercel deployment found for PR #${pr} head ${shortSha(sha)}.`);
  }

  console.log(`- Vercel deployment: ${deploymentSummary.url}`);
  console.log(`- Vercel deployment state: ${deploymentSummary.state}`);
  console.log(`- Vercel deployment target: ${deploymentSummary.target}`);
  if (deploymentSummary.branchAlias) console.log(`- Vercel branch alias: ${deploymentSummary.branchAlias}`);

  if (rollupStatus.state !== "success") {
    fail(`GitHub Vercel rollup is ${rollupStatus.state}; expected success.`);
  }

  if (!latestVercelStatus || latestVercelStatus.state !== "success") {
    fail(`GitHub Vercel commit status is ${latestVercelStatus?.state || "missing"}; expected success.`);
  }

  if (String(deploymentSummary.state).toUpperCase() !== "READY") {
    fail(`Vercel deployment state is ${deploymentSummary.state}; expected READY.`);
  }

  console.log("Vercel PR preview readiness OK (read-only; no deployment mutation performed).");
} catch (error) {
  console.error(`Vercel PR preview readiness failed: ${error?.message || error}`);
  console.error("No secrets or raw env values were printed. This helper is read-only and performs no provider mutation.");
  process.exit(1);
}
