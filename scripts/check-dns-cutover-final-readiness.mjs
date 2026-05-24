import { spawn, spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const skipAutomatedChecks = args.includes("--skip-automated-checks");
const localSmokeBaseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:8765";

function argValue(name, fallback = "") {
  const match = args.find((value) => value.startsWith(`${name}=`));
  return match ? match.split("=").slice(1).join("=") : fallback;
}

const liveMemberPacket =
  argValue("--live-member-packet") || process.env.LIVE_MEMBER_WORKFLOW_RESULT_PACKET || "";
const approvalPacket =
  argValue("--approval-packet") || process.env.DNS_CUTOVER_APPROVAL_PACKET || "";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const automatedChecks = [
  { label: "operator workstation preflight", command: npmCommand, args: ["run", "check:dns-cutover-workstation"] },
  { label: "standard validation", command: npmCommand, args: ["run", "check"] },
  { label: "workspace whitespace check", command: "git", args: ["diff", "--check"] },
  { label: "production route smoke", command: npmCommand, args: ["run", "check:production"] },
  { label: "Vercel PR preview readiness", command: npmCommand, args: ["run", "check:vercel-pr-preview"] },
  { label: "Supabase Edge Function smoke", command: npmCommand, args: ["run", "smoke:supabase-edge-functions"] },
  {
    label: "signed-out Supabase auth boundary smoke",
    command: npmCommand,
    args: ["run", "smoke:supabase-auth-boundary"],
    env: { SMOKE_BASE_URL: localSmokeBaseUrl },
    retries: 1,
  },
  {
    label: "approved gallery feed smoke",
    command: npmCommand,
    args: ["run", "smoke:gallery-approved-feed"],
    env: { SMOKE_BASE_URL: localSmokeBaseUrl },
    retries: 1,
  },
  { label: "DNS cutover rehearsal", command: npmCommand, args: ["run", "check:dns-cutover-rehearsal"] },
];

const privatePacketChecks = [
  {
    label: "live-member workflow result packet",
    envName: "LIVE_MEMBER_WORKFLOW_RESULT_PACKET",
    value: liveMemberPacket,
    command: npmCommand,
    args: ["run", "check:live-member-workflow-result-packet", "--", `--packet=${liveMemberPacket}`],
    missing:
      "D02/D03 live-member QA has not been proven to this checkout. Provide a private completed result packet path with --live-member-packet=... or LIVE_MEMBER_WORKFLOW_RESULT_PACKET.",
  },
  {
    label: "DNS cutover approval packet",
    envName: "DNS_CUTOVER_APPROVAL_PACKET",
    value: approvalPacket,
    command: npmCommand,
    args: ["run", "check:dns-cutover-approval-packet", "--", `--packet=${approvalPacket}`],
    missing:
      "Final GO/NO-GO approval has not been proven to this checkout. Provide a private completed approval packet path with --approval-packet=... or DNS_CUTOVER_APPROVAL_PACKET.",
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function localServerReady() {
  try {
    const response = await fetch(localSmokeBaseUrl, {
      signal: AbortSignal.timeout(1500),
    });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

async function ensureLocalStaticServer() {
  if (process.env.SMOKE_BASE_URL) {
    console.log(`Using supplied SMOKE_BASE_URL for browser smokes: ${localSmokeBaseUrl}`);
    return null;
  }

  if (await localServerReady()) {
    console.log(`Using existing local static server for browser smokes: ${localSmokeBaseUrl}`);
    return null;
  }

  console.log(`Starting temporary local static server for browser smokes: ${localSmokeBaseUrl}`);
  const server = spawn("python3", ["-m", "http.server", "8765", "--bind", "127.0.0.1"], {
    cwd: process.cwd(),
    stdio: ["ignore", "ignore", "ignore"],
  });

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await localServerReady()) return server;
    if (server.exitCode !== null) {
      throw new Error("temporary local static server exited early.");
    }
    await sleep(250);
  }

  server.kill("SIGTERM");
  throw new Error("temporary local static server did not become ready.");
}

function runCheck(label, command, commandArgs, extraEnv = {}, retries = 0) {
  let lastStatus = 0;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const suffix = attempt > 0 ? ` (retry ${attempt}/${retries})` : "";
    console.log(`\n== ${label}${suffix} ==`);
    const result = spawnSync(command, commandArgs, {
      env: { ...process.env, ...extraEnv },
      stdio: "inherit",
    });

    if (result.error) {
      throw result.error;
    }

    lastStatus = result.status || 0;
    if (lastStatus === 0) return;

    if (attempt < retries) {
      console.warn(`${label} failed with exit code ${lastStatus}; retrying once.`);
    }
  }

  throw new Error(`${label} failed with exit code ${lastStatus}.`);
}

const failures = [];
let temporaryServer = null;

try {
  console.log("DNS cutover final readiness gate (read-only).");
  console.log("No DNS, provider dashboard, database, upload, moderation, alias, or deployment mutation is performed.");

  if (skipAutomatedChecks) {
    console.log("\nSKIP automated checks (--skip-automated-checks).");
  } else {
    temporaryServer = await ensureLocalStaticServer();

    for (const check of automatedChecks) {
      runCheck(check.label, check.command, check.args, check.env, check.retries || 0);
    }
  }

  for (const check of privatePacketChecks) {
    if (!check.value) {
      failures.push(check.missing);
      continue;
    }

    runCheck(check.label, check.command, check.args);
  }

  if (failures.length) {
    console.error("\nDNS cutover final readiness is not complete.");
    failures.forEach((failure) => console.error(`- ${failure}`));
    console.error("No private packet values were printed. Keep completed packets private and untracked.");
    process.exitCode = 1;
  } else {
    console.log("\nDNS cutover final readiness OK (read-only; final human cutover approval still required).");
  }
} catch (error) {
  console.error(`\nDNS cutover final readiness failed: ${error?.message || error}`);
  console.error("No secrets or raw env values were printed. This helper is read-only and performs no provider mutation.");
  process.exitCode = 1;
} finally {
  if (temporaryServer) temporaryServer.kill("SIGTERM");
}
