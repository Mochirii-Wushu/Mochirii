import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { resolveMochiSocialGameRepoPath } from "./mochi-social-game-repo-path.mjs";

const root = process.cwd();
const gameRepoPath = resolveMochiSocialGameRepoPath(root);
const credsDir = resolve(process.env.MOCHI_SOCIAL_CREDS_DIR || defaultCredsDir());
const previewEnvPath = resolve(credsDir, process.env.MOCHI_SOCIAL_PREVIEW_ENV_FILE || "mochi-social-alpha-vercel-preview.local.txt");
const previewEnv = readPreviewEnvFile(previewEnvPath);
const reportPath = resolve(root, process.env.MOCHI_SOCIAL_SITE_PREVIEW_READY_JSON || "reports/mochi-social-preview-ready.json");
const reportMdPath = resolve(root, process.env.MOCHI_SOCIAL_SITE_PREVIEW_READY_MD || "reports/mochi-social-preview-ready.md");
const handoffPath = resolve(credsDir, "mochirii-mochi-social-preview-ready.md");
const browserGateReportPath = resolve(root, process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_JSON || "reports/mochi-social-browser-gates.json");
const reportHygienePath = resolve(root, process.env.MOCHI_SOCIAL_SITE_REPORT_HYGIENE_JSON || "reports/mochi-social-report-hygiene.json");
const hostedChecksAllowed = process.env.MOCHI_SOCIAL_SITE_PREVIEW_READY_ALLOW_HOSTED === "true";
const skipNestedSelfTestCommands = process.env.MOCHI_SOCIAL_SITE_PREVIEW_READY_SKIP_SELF_TEST_COMMANDS === "true";
const browserGateMode = normalizeBrowserGateMode(process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_ACCESS_MODE || process.env.MOCHI_SOCIAL_ALPHA_ACCESS_MODE || "supabase");
const gameUrl = normalizeUrl(process.env.MOCHI_SOCIAL_GAME_CONTRACT_URL || process.env.NEXT_PUBLIC_MOCHI_SOCIAL_URL || previewEnv.gameUrl || "https://mochi-social-game.fly.dev");
const siteOrigin = normalizeOrigin(process.env.MOCHI_SOCIAL_SITE_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || previewEnv.sitePreviewUrl || "https://mochirii-git-codex-mochi-social-alpha-rc-mochirii.vercel.app");
const functionsUrl = normalizeUrl(process.env.MOCHI_SOCIAL_ALPHA_EDGE_URL || "https://dnxumaiooljdnbjvzbdc.supabase.co/functions/v1");
const authUrl = normalizeUrl(process.env.MOCHI_SOCIAL_ALPHA_AUTH_URL || inferSupabaseAuthUrl(functionsUrl));
const supabaseProjectRef = inferSupabaseProjectRef(functionsUrl);
const publishableKey = loadPublishableKey();
const publishableKeyPresent = Boolean(publishableKey.value);
const manualBrowserGateChecks = browserGateEnvForMode(browserGateMode);
const requirements = [];

addCommandRequirement("site.static-alpha", "Mochi Social static alpha checks pass.", "node", ["scripts/check-mochi-social-alpha.mjs"], {});
addCommandRequirement("site.clean-room", "Mochi Social site clean-room scan passes before preview gates.", "node", ["scripts/check-mochi-social-clean-room.mjs"], {});
addCommandRequirement("site.bridge-state", "Mochi Social parent bridge state self-test passes before manual browser gates.", "node", ["scripts/check-mochi-social-bridge-state.mjs"], {});
addCommandRequirement("site.auth-bridge", "Mochi Social auth bridge static guard keeps iframe auth access-token-only.", "node", ["scripts/check-mochi-social-auth-bridge.mjs"], {});
addCommandRequirement("site.edge-authority", "Mochi Social Edge authority guard passes before hosted Supabase smoke.", "node", ["scripts/check-mochi-social-edge-authority.mjs"], {});
if (!skipNestedSelfTestCommands) {
  addCommandRequirement("site.preview-key-loader", "Mochi Social preview publishable-key loader self-test passes without leaking key values.", "node", ["scripts/check-mochi-social-preview-key-loader.mjs"], {});
  addCommandRequirement("site.discord-oauth-detector", "Mochi Social Discord OAuth detector self-test passes before hosted provider checks.", "node", ["scripts/check-mochi-social-discord-oauth-self-test.mjs"], {});
}
addBranchSyncRequirement("site.branch-sync", root, "Local Mochirii site branch");
addOperatorChecklistRequirement();
addReportHygieneRequirement();
addGamePreviewReadyRequirement();
addGameContractRequirement();
addEdgeSmokeRequirement();
await addDiscordOAuthProviderRequirement();
addManualBrowserGateRequirement();

const summary = summarize(requirements);
const report = {
  ok: summary.failed === 0 && summary.unverified === 0,
  checkedAt: new Date().toISOString(),
  scope: "Mochirii Mochi Social Alpha Preview Ready audit. This no-secret report checks the website tester-entry lane only and does not authorize provider mutations.",
  hostedChecksAllowed,
  browserGateMode,
  gameUrl,
  siteOrigin,
  functionsUrl,
  authUrl,
  previewEnv,
  publishableKeyPresent,
  publishableKeySource: publishableKey.source,
  git: readGitState(root),
  gameGit: existsSync(gameRepoPath) ? readGitState(gameRepoPath) : null,
  summary,
  requirements,
};

const markdown = renderMarkdown(report);
await mkdir(dirname(reportPath), { recursive: true });
await mkdir(dirname(handoffPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(reportMdPath, markdown, "utf8");
await writeFile(handoffPath, markdown, "utf8");

if (!report.ok) {
  console.error("Mochirii Mochi Social Alpha Preview Ready audit is not ready:");
  for (const item of requirements.filter((entry) => entry.status !== "pass")) {
    console.error(`- ${item.id}: ${item.status} - ${item.message}`);
  }
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log(`Mochirii Mochi Social Alpha Preview Ready audit passed. Report: ${reportPath}`);
console.log(`Markdown: ${reportMdPath}`);

function addOperatorChecklistRequirement() {
  const checklist = resolve(credsDir, "mochirii-mochi-social-alpha-operator-next-steps.md");
  if (!existsSync(checklist)) {
    add("site.operator-checklist", "fail", `Website operator checklist is missing: ${checklist}`, { path: checklist });
    return;
  }
  const text = readFileSync(checklist, "utf8");
  const gitState = readGitState(root);
  const failures = [];
  for (const snippet of [
    "This file is intentionally no-secret",
    "Alpha Preview Ready Lane",
    "NEXT_PUBLIC_MOCHI_SOCIAL_URL",
    "MOCHI_SOCIAL_ALPHA_EDGE_URL",
    gitState.localHead,
  ]) {
    if (!snippet || !text.includes(snippet)) failures.push(`operator checklist missing ${snippet || "<current head>"}`);
  }
  add("site.operator-checklist", failures.length ? "fail" : "pass", failures.length ? failures.join("; ") : "Website operator checklist is present and current.", {
    path: checklist,
  });
}

function addReportHygieneRequirement() {
  const report = readJson(reportHygienePath);
  if (!report.ok) {
    add("site.report-hygiene", "fail", `Mochi Social site report hygiene is missing or invalid: ${report.message}. Run npm run check:mochi-social-report-hygiene after generating site reports and handoff files.`, {
      path: reportHygienePath,
    });
    return;
  }

  const failures = currentGitStateFailures(report.data?.git, root, "site report hygiene");
  if (report.data?.ok !== true) failures.push("site report hygiene report is not ok");
  if (!Array.isArray(report.data?.scanned) || report.data.scanned.length === 0) failures.push("site report hygiene must scan at least one no-secret artifact");
  add("site.report-hygiene", failures.length ? "fail" : "pass", failures.length ? failures.join("; ") : "Site no-secret report hygiene is current and green.", {
    path: reportHygienePath,
    scanned: Array.isArray(report.data?.scanned) ? report.data.scanned.length : 0,
  });
}

function addGamePreviewReadyRequirement() {
  const gameReport = readJson(resolve(gameRepoPath, "reports/alpha-preview-ready.json"));
  if (!gameReport.ok) {
    add("site.game-preview-ready", "fail", `Game Preview Ready report is missing or invalid: ${gameReport.message}.`, {
      path: resolve(gameRepoPath, "reports/alpha-preview-ready.json"),
    });
    return;
  }
  const failures = currentGitStateFailures(gameReport.data?.git, gameRepoPath, "game preview-ready report");
  if (gameReport.data?.ok !== true) {
    const failing = (gameReport.data?.requirements || [])
      .filter((item) => item.status !== "pass")
      .map((item) => item.id)
      .join(", ");
    failures.push(`game preview-ready report is not ok${failing ? `: ${failing}` : ""}`);
  }
  add("site.game-preview-ready", failures.length ? "fail" : "pass", failures.length ? failures.join("; ") : "Game Preview Ready report is green and current.", {
    path: resolve(gameRepoPath, "reports/alpha-preview-ready.json"),
  });
}

function addGameContractRequirement() {
  const failures = [];
  if (!gameUrl) failures.push("Mochi Social game URL is required");
  if (!siteOrigin) failures.push("Mochirii site origin is required");
  if ((isHostedUrl(gameUrl) || isHostedUrl(siteOrigin)) && !hostedChecksAllowed) {
    failures.push("hosted game/site contract check requires MOCHI_SOCIAL_SITE_PREVIEW_READY_ALLOW_HOSTED=true after explicit approval");
  }
  if (failures.length) {
    add("site.game-contract", "fail", failures.join("; "), { gameUrl, siteOrigin, hostedChecksAllowed });
    return;
  }
  addCommandRequirement("site.game-contract", "Game contract check passes for the configured site origin.", "node", ["scripts/check-mochi-social-game-contract.mjs"], {
    env: {
      MOCHI_SOCIAL_GAME_CONTRACT_URL: gameUrl,
      MOCHI_SOCIAL_SITE_ORIGIN: siteOrigin,
    },
  });
}

function addEdgeSmokeRequirement() {
  const failures = [];
  if (!functionsUrl) failures.push("Supabase Edge functions URL is required");
  if (!publishableKeyPresent) failures.push("MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY is required locally for preview smoke");
  if (isHostedUrl(functionsUrl) && !hostedChecksAllowed) {
    failures.push("hosted Supabase Edge smoke requires MOCHI_SOCIAL_SITE_PREVIEW_READY_ALLOW_HOSTED=true after explicit approval");
  }
  if (failures.length) {
    add("site.edge-smoke", "fail", failures.join("; "), {
      functionsUrl,
      publishableKeyPresent,
      publishableKeySource: publishableKey.source,
      hostedChecksAllowed,
    });
    return;
  }
  addCommandRequirement("site.edge-smoke", "Supabase Edge alpha smoke passes for the preview branch.", "node", ["scripts/smoke-mochi-social-alpha-edge.mjs"], {
    env: {
      MOCHI_SOCIAL_ALPHA_EDGE_URL: functionsUrl,
      MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY: publishableKey.value,
    },
  });
}

async function addDiscordOAuthProviderRequirement() {
  const failures = [];
  if (!authUrl) failures.push("Supabase Auth URL is required");
  if (!siteOrigin) failures.push("Mochirii site origin is required");
  if (isHostedUrl(authUrl) && !hostedChecksAllowed) {
    failures.push("hosted Discord OAuth provider check requires MOCHI_SOCIAL_SITE_PREVIEW_READY_ALLOW_HOSTED=true after explicit approval");
  }
  if (failures.length) {
    add("site.discord-oauth", "fail", failures.join("; "), {
      authUrl,
      siteOrigin,
      hostedChecksAllowed,
    });
    return;
  }

  const redirectTo = `${siteOrigin}/account`;
  const authorizeUrl = `${authUrl}/authorize?provider=discord&redirect_to=${encodeURIComponent(redirectTo)}&scopes=${encodeURIComponent("identify email")}`;
  try {
    const response = await fetch(authorizeUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    const location = response.headers.get("location") || "";
    const text = await response.text();
    const unsupportedProvider = /provider is not enabled|Unsupported provider/i.test(text);
    const redirectsToDiscord = response.status >= 300 && response.status < 400 && /discord(?:app)?\.com/i.test(location);
    const ok = redirectsToDiscord && !unsupportedProvider;
    add("site.discord-oauth", ok ? "pass" : "fail", ok ? "Supabase preview Discord OAuth provider begins the OAuth redirect flow." : "Supabase preview Discord OAuth provider is not enabled or did not begin the OAuth redirect flow.", {
      authUrl,
      redirectTo,
      status: response.status,
      locationHost: safeUrlHost(location),
      unsupportedProvider,
      expectedDiscordCallbackUrl: `${new URL(authUrl).origin}/auth/v1/callback`,
    });
  } catch (error) {
    add("site.discord-oauth", "fail", "Supabase preview Discord OAuth provider check failed.", {
      authUrl,
      redirectTo,
      error: sanitize(error instanceof Error ? error.message : String(error)),
    });
  }
}

function addManualBrowserGateRequirement() {
  const envEvidenceRequested = process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_CONFIRMED === "true" || process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_ACCESS_MODE || manualBrowserGateChecks.some(([envName]) => process.env[envName] === "true");
  if (!envEvidenceRequested && existsSync(browserGateReportPath)) {
    addStoredManualBrowserGateRequirement();
    return;
  }

  const confirmed = process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_CONFIRMED === "true";
  const reviewer = sanitize(process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER || "");
  const browser = sanitize(process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER || "");
  const reviewUrl = sanitize(process.env.MOCHI_SOCIAL_SITE_BROWSER_GATES_URL || "");
  const gateResults = manualBrowserGateChecks.map(([envName, label]) => ({
    envName,
    label,
    ok: process.env[envName] === "true",
  }));
  const missingGates = gateResults.filter((gate) => !gate.ok);
  const failures = [];
  if (!confirmed) failures.push("manual browser gates have not been confirmed");
  if (confirmed && !reviewer) failures.push("MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER is required");
  if (confirmed && !browser) failures.push("MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER is required");
  if (confirmed && !reviewUrl) failures.push("MOCHI_SOCIAL_SITE_BROWSER_GATES_URL is required");
  if (confirmed && missingGates.length) {
    failures.push(`manual browser gates missing confirmations: ${missingGates.map((gate) => gate.envName).join(", ")}`);
  }
  if (reviewUrl && isHostedUrl(reviewUrl) && !hostedChecksAllowed) {
    failures.push("hosted browser gate confirmation requires MOCHI_SOCIAL_SITE_PREVIEW_READY_ALLOW_HOSTED=true after explicit approval");
  }
  add("site.manual-browser-gates", failures.length ? "fail" : "pass", failures.length ? failures.join("; ") : "Manual website browser gates are confirmed.", {
    source: "environment",
    accessMode: browserGateMode,
    reviewer: reviewer || null,
    browser: browser || null,
    url: reviewUrl || null,
    hostedChecksAllowed,
    requiredGates: gateResults,
  });
}

function addStoredManualBrowserGateRequirement() {
  const stored = readJson(browserGateReportPath);
  if (!stored.ok) {
    add("site.manual-browser-gates", "fail", `Stored browser gate report is missing or invalid: ${stored.message}. Run npm run prepare:mochi-social-browser-gates after the approved Chrome pass.`, {
      source: browserGateReportPath,
    });
    return;
  }

  const data = stored.data;
  const storedAccessMode = normalizeBrowserGateMode(data.accessMode || browserGateMode);
  const expectedGateChecks = browserGateEnvForMode(storedAccessMode);
  const failures = currentGitStateFailures(data.git, root, "stored browser gate report");
  const gateResults = Array.isArray(data.requiredGates) ? data.requiredGates : [];
  const missingNames = expectedGateChecks
    .filter(([envName]) => !gateResults.some((gate) => gate.envName === envName && gate.ok === true))
    .map(([envName]) => envName);
  if (data.ok !== true) failures.push("stored browser gate report is not ok");
  if (missingNames.length) failures.push(`stored browser gate report is missing confirmations: ${missingNames.join(", ")}`);
  const reviewUrl = sanitize(data.url || "");
  if (!data.reviewer) failures.push("stored browser gate report reviewer is required");
  if (!data.browser) failures.push("stored browser gate report browser is required");
  if (!reviewUrl) failures.push("stored browser gate report URL is required");
  if (reviewUrl && isHostedUrl(reviewUrl) && !hostedChecksAllowed) {
    failures.push("stored hosted browser gate evidence requires MOCHI_SOCIAL_SITE_PREVIEW_READY_ALLOW_HOSTED=true after explicit approval");
  }
  if (reviewUrl && isHostedUrl(reviewUrl) && data.hostedChecksAllowed !== true) {
    failures.push("stored hosted browser gate report must be stamped with hosted approval");
  }

  add("site.manual-browser-gates", failures.length ? "fail" : "pass", failures.length ? failures.join("; ") : "Stored manual website browser gates are confirmed.", {
    source: browserGateReportPath,
    accessMode: storedAccessMode,
    reviewer: data.reviewer || null,
    browser: data.browser || null,
    url: reviewUrl || null,
    storedHostedChecksAllowed: data.hostedChecksAllowed === true,
    hostedChecksAllowed,
    requiredGates: gateResults.map((gate) => ({
      envName: gate.envName,
      label: gate.label,
      ok: gate.ok === true,
    })),
  });
}

function addCommandRequirement(id, passMessage, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    env: options.env ? { ...process.env, ...options.env } : process.env,
  });
  const ok = result.status === 0;
  add(id, ok ? "pass" : "fail", ok ? passMessage : `${command} ${args.join(" ")} failed with exit code ${result.status}.`, {
    command: `${command} ${args.join(" ")}`,
    stdout: sanitize(result.stdout || ""),
    stderr: sanitize(result.stderr || result.error?.message || ""),
  });
}

function addBranchSyncRequirement(id, repoPath, label) {
  const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], repoPath);
  const counts = git(["rev-list", "--left-right", "--count", "HEAD...@{u}"], repoPath);
  const status = git(["status", "--porcelain"], repoPath);
  const failures = [];
  let ahead = 0;
  let behind = 0;
  if (!upstream.ok) failures.push(`${label} has no upstream branch.`);
  if (counts.ok) {
    const [aheadText, behindText] = firstLine(counts.stdout).split(/\s+/);
    ahead = Number(aheadText || 0);
    behind = Number(behindText || 0);
    if (ahead !== 0 || behind !== 0) failures.push(`${label} is ahead ${ahead} / behind ${behind} relative to upstream.`);
  } else {
    failures.push(`${label} ahead/behind state could not be read.`);
  }
  const dirty = status.ok ? status.stdout.split(/\r?\n/).filter(Boolean) : ["git status unavailable"];
  if (dirty.length) failures.push(`${label} worktree is dirty.`);
  add(id, failures.length ? "fail" : "pass", failures.length ? failures.join("; ") : `${label} is clean and synced to upstream.`, {
    path: repoPath,
    upstream: firstLine(upstream.stdout),
    ahead,
    behind,
    dirty,
  });
}

function currentGitStateFailures(state, repoPath, label) {
  const failures = [];
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], repoPath);
  const localHead = git(["rev-parse", "HEAD"], repoPath);
  const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], repoPath);
  const dirty = git(["status", "--porcelain"], repoPath);
  if (!state) failures.push(`${label} must include git state`);
  if (!branch.ok) failures.push(`${label} current branch could not be read`);
  if (!localHead.ok) failures.push(`${label} current HEAD could not be read`);
  if (!dirty.ok) failures.push(`${label} current worktree status could not be read`);
  if (!state || !branch.ok || !localHead.ok || !dirty.ok) return failures;

  const currentDirty = dirty.stdout.split(/\r?\n/).filter(Boolean);
  if (state.branch !== firstLine(branch.stdout)) failures.push(`${label} branch does not match current branch`);
  if (state.localHead !== firstLine(localHead.stdout)) failures.push(`${label} localHead does not match current HEAD`);
  if (upstream.ok) {
    if (state.upstream !== firstLine(upstream.stdout)) failures.push(`${label} upstream does not match current upstream`);
  } else if (state.upstream) {
    failures.push(`${label} recorded an upstream but current upstream could not be read`);
  }
  if (!Array.isArray(state.dirty) || state.dirty.length !== currentDirty.length) failures.push(`${label} dirty state does not match current worktree`);
  return failures;
}

function readGitState(repoPath) {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], repoPath);
  const localHead = git(["rev-parse", "HEAD"], repoPath);
  const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], repoPath);
  const dirty = git(["status", "--porcelain"], repoPath);
  return {
    branch: firstLine(branch.stdout),
    localHead: firstLine(localHead.stdout),
    upstream: firstLine(upstream.stdout),
    dirty: dirty.ok ? dirty.stdout.split(/\r?\n/).filter(Boolean).map((line) => sanitize(line)) : ["git status unavailable"],
    errors: [branch, localHead, upstream, dirty]
      .filter((result) => !result.ok)
      .map((result) => sanitize(result.stderr || result.error || "git command failed")),
  };
}

function normalizeBrowserGateMode(value) {
  return value === "tester-password" ? "tester-password" : "supabase";
}

function browserGateEnvForMode(mode) {
  if (mode === "tester-password") {
    return [
      ["MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_LOCKED_OK", "tester-password locked page visible"],
      ["MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_IFRAME_ABSENT_OK", "iframe absent before tester-password unlock"],
      ["MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_INVALID_ERROR_OK", "invalid tester password shows accessible inline error"],
      ["MOCHI_SOCIAL_SITE_BROWSER_IFRAME_LOADS_OK", "iframe loads after tester-password unlock"],
      ["MOCHI_SOCIAL_SITE_BROWSER_AUTH_BRIDGE_OK", "guest bridge sends sign-out/no access token only"],
      ["MOCHI_SOCIAL_SITE_BROWSER_CHAIN_STUB_OK", "chain request remains configured-preview-stub/no-real-value"],
      ["MOCHI_SOCIAL_SITE_BROWSER_GAME_PRESENCE_OK", "two hosted game tabs show nearby tester presence"],
    ];
  }

  return [
    ["MOCHI_SOCIAL_SITE_BROWSER_SIGNED_OUT_BLOCKED_OK", "signed-out blocked"],
    ["MOCHI_SOCIAL_SITE_BROWSER_NON_TESTER_BLOCKED_OK", "signed-in non-tester blocked"],
    ["MOCHI_SOCIAL_SITE_BROWSER_TERMS_GATE_OK", "terms gate"],
    ["MOCHI_SOCIAL_SITE_BROWSER_IFRAME_LOADS_OK", "iframe loads after acknowledgement"],
    ["MOCHI_SOCIAL_SITE_BROWSER_AUTH_BRIDGE_OK", "MOCHI_SOCIAL_AUTH sends access token only"],
    ["MOCHI_SOCIAL_SITE_BROWSER_FEEDBACK_AUDIT_OK", "feedback appears in admin/audit"],
    ["MOCHI_SOCIAL_SITE_BROWSER_CHAIN_STUB_OK", "chain request remains configured-preview-stub/no-real-value"],
    ["MOCHI_SOCIAL_SITE_BROWSER_ADMIN_GRANT_REVOKE_OK", "admin grant/revoke works and intended tester state is restored"],
  ];
}

function readJson(file) {
  if (!existsSync(file)) return { ok: false, message: "not found" };
  try {
    return { ok: true, data: JSON.parse(readFileSync(file, "utf8")) };
  } catch {
    return { ok: false, message: "parse failed" };
  }
}

function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", shell: false });
  return {
    ok: result.status === 0,
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || "",
  };
}

function add(id, status, message, evidence = {}) {
  requirements.push({ id, status, message, evidence });
}

function summarize(items) {
  return {
    total: items.length,
    passed: items.filter((item) => item.status === "pass").length,
    failed: items.filter((item) => item.status === "fail").length,
    unverified: items.filter((item) => item.status === "unverified").length,
  };
}

function renderMarkdown(summaryReport) {
  const rows = summaryReport.requirements
    .map((item) => `| ${item.id} | ${item.status} | ${item.message.replace(/\|/g, "/")} |`)
    .join("\n");
  const failures = summaryReport.requirements
    .filter((item) => item.status !== "pass")
    .map((item) => `- ${item.id}: ${item.message}`)
    .join("\n") || "- None";
  const previewEnvGame = summaryReport.previewEnv.gameUrl || "not recorded";
  const previewEnvSite = summaryReport.previewEnv.sitePreviewUrl || "not recorded";

  return `# Mochirii Mochi Social Alpha Preview Ready Audit

Generated: ${summaryReport.checkedAt}

This file is intentionally no-secret. It verifies the website tester-entry lane and does not approve provider mutations, production deploys, Enjin funding, or mainnet work.

## Result

- Ready: ${summaryReport.ok ? "yes" : "no"}
- Passed: ${summaryReport.summary.passed}/${summaryReport.summary.total}
- Hosted checks allowed: ${summaryReport.hostedChecksAllowed ? "yes" : "no"}
- Game URL: ${summaryReport.gameUrl}
- Site origin: ${summaryReport.siteOrigin}
- Supabase Edge URL: ${summaryReport.functionsUrl}
- Supabase Auth URL: ${summaryReport.authUrl}
- Publishable key present: ${summaryReport.publishableKeyPresent ? "yes" : "no"}
- Publishable key source: ${summaryReport.publishableKeySource}

## Local Preview URL File

- File: ${summaryReport.previewEnv.path}
- Present: ${summaryReport.previewEnv.present ? "yes" : "no"}
- Game URL: ${previewEnvGame}
- Site preview URL: ${previewEnvSite}
- URL fields read: ${summaryReport.previewEnv.urlFieldsRead.length ? summaryReport.previewEnv.urlFieldsRead.join(", ") : "none"}

This file is no-secret and may only contain preview URLs. Hosted Fly/Vercel/Supabase checks still require explicit approval.

## Requirements

| Requirement | Status | Message |
| --- | --- | --- |
${rows}

## Remaining Site Preview Work

${failures}

## Approval Prompt

\`\`\`text
I approve the Mochirii hosted Preview Ready verification using MOCHI_SOCIAL_SITE_PREVIEW_READY_ALLOW_HOSTED=true against the configured Fly game URL, Vercel Preview origin, and Supabase Preview Edge URL. I understand this may hit Fly/Vercel/Supabase preview resources and add usage.
\`\`\`
`;
}

function normalizeUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizeOrigin(value) {
  const normalized = normalizeUrl(value);
  if (!normalized) return "";
  try {
    return new URL(normalized).origin;
  } catch {
    return normalized;
  }
}

function inferSupabaseAuthUrl(value) {
  const normalized = normalizeUrl(value);
  if (!normalized) return "";
  return normalized.replace(/\/functions\/v1$/i, "/auth/v1");
}

function inferSupabaseProjectRef(value) {
  try {
    const host = new URL(value).hostname;
    const [first] = host.split(".");
    return first || "";
  } catch {
    return "";
  }
}

function loadPublishableKey() {
  const envKey = process.env.MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY || "";
  if (envKey) return { value: envKey, source: "env:MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY" };

  const explicitFile = process.env.MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY_FILE || "";
  const defaultFile = supabaseProjectRef ? join(credsDir, `supabase-preview-${supabaseProjectRef}-api-keys.local.json`) : "";
  if (!explicitFile && !hostedChecksAllowed) {
    return { value: "", source: "not-loaded-awaiting-hosted-approval" };
  }

  const file = explicitFile || defaultFile;
  if (!file) return { value: "", source: "missing-file-path" };
  const resolved = resolve(file);
  const source = `file:${basename(resolved)}`;
  if (!existsSync(resolved)) return { value: "", source: `${source}:not-found` };

  try {
    const parsed = JSON.parse(readFileSync(resolved, "utf8").replace(/^\uFEFF/, ""));
    const value = selectPublishableKey(parsed);
    return { value, source: value ? source : `${source}:publishable-key-not-found` };
  } catch {
    return { value: "", source: `${source}:parse-failed` };
  }
}

function selectPublishableKey(parsed) {
  const entries = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.keys) ? parsed.keys : [parsed];
  const usable = entries
    .filter((entry) => entry && typeof entry === "object" && typeof entry.api_key === "string")
    .filter((entry) => {
      const text = `${entry.name || ""} ${entry.type || ""} ${entry.description || ""}`.toLowerCase();
      return !/service[_ -]?role|secret/.test(text);
    });
  const publishable = usable.find((entry) => String(entry.type || "").toLowerCase() === "publishable");
  const anon = usable.find((entry) => String(entry.name || "").toLowerCase() === "anon");
  return (publishable || anon || usable[0])?.api_key || "";
}

function readPreviewEnvFile(file) {
  const base = {
    path: pathForReport(file),
    present: false,
    gameUrl: "",
    sitePreviewUrl: "",
    urlFieldsRead: [],
  };
  if (!existsSync(file)) return base;

  const text = readFileSync(file, "utf8");
  const gameUrl = readNamedUrl(text, ["MOCHI_SOCIAL_GAME_URL", "NEXT_PUBLIC_MOCHI_SOCIAL_URL"]);
  const sitePreviewUrl = readNamedUrl(text, ["MOCHI_SOCIAL_SITE_PREVIEW_URL", "NEXT_PUBLIC_SITE_URL"]);
  return {
    ...base,
    present: true,
    gameUrl,
    sitePreviewUrl,
    urlFieldsRead: [
      gameUrl ? "MOCHI_SOCIAL_GAME_URL/NEXT_PUBLIC_MOCHI_SOCIAL_URL" : "",
      sitePreviewUrl ? "MOCHI_SOCIAL_SITE_PREVIEW_URL/NEXT_PUBLIC_SITE_URL" : "",
    ].filter(Boolean),
  };
}

function readNamedUrl(text, names) {
  for (const name of names) {
    const pattern = new RegExp(`^\\s*${name}\\s*=\\s*(.+?)\\s*$`, "m");
    const match = text.match(pattern);
    if (!match) continue;
    const value = sanitizeUrl(match[1]);
    if (value) return value;
  }
  return "";
}

function sanitizeUrl(value) {
  const trimmed = String(value || "").trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
  if (!/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[^\s]*)?$/.test(trimmed)) return "";
  return sanitize(trimmed);
}

function pathForReport(absolutePath) {
  const normalized = String(absolutePath || "").replace(/\\/g, "/");
  const normalizedRoot = root.replace(/\\/g, "/");
  const normalizedCreds = credsDir.replace(/\\/g, "/");
  if (normalized.startsWith(`${normalizedRoot}/`)) return normalized.slice(normalizedRoot.length + 1);
  if (normalized.startsWith(`${normalizedCreds}/`)) return normalized.slice(normalizedCreds.length + 1);
  return sanitize(absolutePath);
}

function isHostedUrl(value) {
  try {
    const parsed = new URL(value);
    return !["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function safeUrlHost(value) {
  if (!value) return "";
  try {
    return new URL(value).host;
  } catch {
    return sanitize(value);
  }
}

function firstLine(value) {
  return String(value || "").split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "";
}

function sanitize(value) {
  return String(value || "")
    .replace(/\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/g, "<redacted-github-token>")
    .replace(/\bsb_secret_[A-Za-z0-9_-]{8,}\b/g, "<redacted-supabase-secret>")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "<redacted-jwt>")
    .replace(/\bMOCHI_SOCIAL_GAME_SERVER_TOKEN\s*=\s*["']?[^ \r\n"']+/gi, "MOCHI_SOCIAL_GAME_SERVER_TOKEN=<redacted>")
    .slice(0, 1000);
}

function defaultCredsDir() {
  if (process.env.USERPROFILE) return join(process.env.USERPROFILE, "Desktop", "Creds");
  if (process.env.HOME) return join(process.env.HOME, "Desktop", "Creds");
  return join(root, ".local", "creds");
}
