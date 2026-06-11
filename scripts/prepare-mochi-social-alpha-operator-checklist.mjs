import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = process.cwd();
const gameRepoPath = resolve(root, process.env.MOCHI_SOCIAL_GAME_REPO_PATH || "../Local RPG");
const credsDir = resolve(process.env.MOCHI_SOCIAL_CREDS_DIR || defaultCredsDir());
const outputPath = resolve(credsDir, process.env.MOCHI_SOCIAL_SITE_OPERATOR_CHECKLIST || "mochirii-mochi-social-alpha-operator-next-steps.md");
const supabaseProjectRef = process.env.MOCHI_SOCIAL_SUPABASE_PROJECT_REF || "dnxumaiooljdnbjvzbdc";
const functionsUrl = process.env.MOCHI_SOCIAL_ALPHA_EDGE_URL || `https://${supabaseProjectRef}.supabase.co/functions/v1`;
const gameUrl = process.env.MOCHI_SOCIAL_GAME_URL || process.env.NEXT_PUBLIC_MOCHI_SOCIAL_URL || "https://mochi-social-game.fly.dev";
const sitePreviewUrl = process.env.MOCHI_SOCIAL_SITE_PREVIEW_URL || process.env.NEXT_PUBLIC_SITE_URL || "<vercel-preview-host>";
const generatedAt = new Date().toISOString();

const externalGateReport = readJson(resolve(gameRepoPath, "reports/alpha-external-gates.json"));
const gamePr = readPr("xartaiusx/mochi-social", "1");
const sitePr = readPr("Mochirii-Wushu/Mochirii", "258");
const credentialFiles = listCredentialFiles();
const gitState = readGitState();

await mkdir(credsDir, { recursive: true });
await writeFile(outputPath, renderChecklist(), "utf8");
console.log(`Wrote no-secret Mochirii Mochi Social alpha operator checklist: ${outputPath}`);

function defaultCredsDir() {
  if (process.env.USERPROFILE) return join(process.env.USERPROFILE, "Desktop", "Creds");
  if (process.env.HOME) return join(process.env.HOME, "Desktop", "Creds");
  return join(root, ".local", "creds");
}

function listCredentialFiles() {
  if (!existsSync(credsDir)) return [];
  return readdirSync(credsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^mochi-social-alpha|^mochirii-mochi-social-alpha|^supabase-preview-|^enjin-|^fly-/i.test(name))
    .sort((a, b) => a.localeCompare(b));
}

function readJson(file) {
  if (!existsSync(file)) return { ok: false, message: "not found", path: file };
  try {
    return { ok: true, path: file, data: JSON.parse(readFileSync(file, "utf8")) };
  } catch {
    return { ok: false, message: "could not parse", path: file };
  }
}

function readPr(repo, number) {
  const result = spawnSync("gh", ["pr", "view", number, "--repo", repo, "--json", "url,headRefOid,mergeStateStatus,statusCheckRollup"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    return {
      repo,
      number,
      ok: false,
      message: sanitize(result.stderr || result.error?.message || "GitHub PR state could not be read."),
    };
  }
  try {
    const data = JSON.parse(result.stdout);
    const checks = Array.isArray(data.statusCheckRollup) ? data.statusCheckRollup : [];
    const failing = checks
      .filter((check) => !["SUCCESS", "PASS"].includes(String(check.conclusion || check.state || "").toUpperCase()))
      .map((check) => check.name || check.context)
      .filter(Boolean);
    return {
      repo,
      number,
      ok: data.mergeStateStatus === "CLEAN" && failing.length === 0,
      url: data.url,
      headRefOid: data.headRefOid,
      mergeStateStatus: data.mergeStateStatus,
      checks: checks.map((check) => check.name || check.context).filter(Boolean),
      failing,
    };
  } catch {
    return { repo, number, ok: false, message: "GitHub PR JSON could not be parsed." };
  }
}

function renderChecklist() {
  const files = credentialFiles.length
    ? credentialFiles.map((file) => `- ${file}`).join("\n")
    : "- No matching local credential checklist files were found.";
  const externalFailures = externalGateReport.ok && Array.isArray(externalGateReport.data.checks)
    ? externalGateReport.data.checks
      .filter((check) => check.status === "fail")
      .map((check) => `- ${check.name}: ${check.message}`)
      .join("\n") || "- No failing game external gates were recorded."
    : `- Game external gate report ${externalGateReport.message}: ${externalGateReport.path}`;
  const siteOrigin = normalizePreviewOrigin(sitePreviewUrl);

  return `# Mochirii Mochi Social Alpha Operator Next Steps

Generated: ${generatedAt}

This file is intentionally no-secret. It is for website-side Vercel, Supabase, allowlist, terms, and preview acceptance steps. Do not paste API tokens, service-role keys, Discord secrets, Enjin tokens, wallet seed material, payment details, or one-time codes into Codex chat, Git, PR comments, screenshots, or reports.

## Local Credential Files

${files}

## PR State

- Game PR: ${formatPr(gamePr)}
- Site PR: ${formatPr(sitePr)}

## Local Branch Sync

- Branch: ${gitState.branch || "unknown"}
- Upstream: ${gitState.upstream || "unknown"}
- Local HEAD: ${gitState.localHead || "unknown"}
- Upstream HEAD: ${gitState.upstreamHead || "unknown"}
- Ahead: ${gitState.ahead}
- Behind: ${gitState.behind}
- Dirty tracked files: ${gitState.dirty.length}

If this branch is ahead or dirty, remote PR checks do not prove the local source. Push only after explicit approval:

\`\`\`text
I approve pushing C:\\Users\\xtyty\\Documents\\Mochirii branch ${gitState.branch || "<branch>"} to ${gitState.upstream || "origin/<branch>"} and allow GitHub Actions/PR checks to run for Mochirii.
\`\`\`

## Game External Gate Summary

${externalFailures}

## Alpha Preview Ready Lane

- Alpha Preview Ready: Vercel Preview route, Fly game iframe, Supabase allowlist, terms, feedback, short-lived MOCHI_SOCIAL_AUTH, no-real-value labels, and Enjin visible as configured-preview-stub.
- Funded-chain gates: real cENJ, Enjin collection ID, Fuel Tank ID, Wallet Daemon signing, and finalized proof smoke.
- Do not set dummy ENJIN_COLLECTION_ID, dummy ENJIN_FUEL_TANK_ID, or fake readiness flags to make funded-chain gates pass.
- For Preview Ready, chain request rows may be audit-only preview rows and must not credit inventory, settle trades, or settle listings.

## Vercel Preview Gate

Required preview env names:

- NEXT_PUBLIC_MOCHI_SOCIAL_URL=${gameUrl}
- NEXT_PUBLIC_SUPABASE_URL=<preview-supabase-url>
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<preview-supabase-publishable-key>
- NEXT_PUBLIC_SITE_URL=${siteOrigin}

Use the Vercel dashboard or CLI for the Mochirii preview branch only. Do not change production env for Alpha RC unless a later production plan approves it.

After the Fly game URL exists, run from this repo:

\`\`\`powershell
$env:MOCHI_SOCIAL_GAME_CONTRACT_URL="${gameUrl}"
$env:MOCHI_SOCIAL_SITE_ORIGIN="${siteOrigin}"
npm run check:mochi-social-game-contract
\`\`\`

## Supabase Preview Gate

Preview project ref: ${supabaseProjectRef}

Required Edge Function secret names:

- MOCHI_SOCIAL_GAME_SERVER_TOKEN
- MOCHI_SOCIAL_ALPHA_TERMS_VERSION

Required Edge smoke inputs stay local:

- MOCHI_SOCIAL_ALPHA_EDGE_URL=${functionsUrl}
- MOCHI_SOCIAL_ALPHA_AUTH_URL=https://${supabaseProjectRef}.supabase.co/auth/v1
- MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY=<preview-supabase-publishable-key>
- MOCHI_SOCIAL_GAME_SERVER_TOKEN=<same-scoped-token-as-fly>

Required Discord OAuth setup:

- Supabase preview Auth provider "Discord" is enabled for project ref ${supabaseProjectRef}.
- Discord Developer Portal OAuth2 redirect URI includes https://${supabaseProjectRef}.supabase.co/auth/v1/callback.
- Supabase preview redirect URLs allow ${siteOrigin}/account.
- Codex may verify only provider enabled/status and callback shape. The user enters Discord client secret values privately.

\`\`\`powershell
$env:MOCHI_SOCIAL_ALPHA_EDGE_URL="${functionsUrl}"
$env:MOCHI_SOCIAL_ALPHA_AUTH_URL="https://${supabaseProjectRef}.supabase.co/auth/v1"
$env:MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY="<preview-supabase-publishable-key>"
$env:MOCHI_SOCIAL_GAME_SERVER_TOKEN="<same-scoped-token-as-fly>"
npm run smoke:mochi-social-alpha-edge
npm run check:mochi-social-preview-ready # Verifies site.discord-oauth after hosted verification approval.
\`\`\`

## Manual Website Gates

Before inviting testers, verify in the Vercel preview:

1. Signed-out users are sent to sign in before entering /games/mochi-social.
2. Signed-in non-testers see the alpha allowlist block.
3. Allowlisted testers are blocked until alpha terms are acknowledged.
4. The iframe loads only after terms are accepted.
5. The parent page sends MOCHI_SOCIAL_AUTH with a short-lived Supabase access token only.
6. Feedback submission writes to Supabase and appears in the leader audit panel.
7. Leader dashboard can grant and revoke alpha access by Supabase user id.
8. For Alpha Preview Ready, chain request rows show Canary, no-real-value status, request id, and configured-preview-stub/audit-only state.
9. For Alpha RC Ready only, funded-chain rows show transaction UUID, optional listing id, and finality state.

### Manual Browser Evidence Protocol

Use Chrome only after hosted browser verification is explicitly approved. Record reviewer, browser/version, preview URL, timestamp, and pass/fail notes only.

- Do not copy or screenshot Supabase access tokens, refresh tokens, cookies, Authorization headers, service-role keys, Discord OAuth client secrets, Discord bot tokens, Enjin tokens, wallet seeds, Wallet Daemon passphrases, MFA codes, payment details, or private account details.
- For the MOCHI_SOCIAL_AUTH gate, verify the shape of the bridge message only: the parent sends MOCHI_SOCIAL_AUTH with a short-lived access-token field and does not send refresh tokens or provider secrets.
- Feedback/admin evidence should use counts, row ids, route names, and non-secret status notes. Avoid account emails or private user data in reports.

After the browser pass, stamp the site audit with no-secret metadata only:

\`\`\`powershell
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_CONFIRMED="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER="<operator name>"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER="<browser/version>"
$env:MOCHI_SOCIAL_SITE_BROWSER_GATES_URL="${siteOrigin}/games/mochi-social"
$env:MOCHI_SOCIAL_SITE_BROWSER_SIGNED_OUT_BLOCKED_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_NON_TESTER_BLOCKED_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_TERMS_GATE_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_IFRAME_LOADS_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_AUTH_BRIDGE_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_FEEDBACK_AUDIT_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_CHAIN_STUB_OK="true"
$env:MOCHI_SOCIAL_SITE_BROWSER_ADMIN_GRANT_REVOKE_OK="true"
\`\`\`

## Full Local Verification

\`\`\`powershell
npm run check:mochi-social-alpha
npm run check:mochi-social-game-contract
npm run smoke:mochi-social-alpha-edge
npm run check:supabase-edge-types
npm run check
cd apps/web
npm run lint
npm run build
\`\`\`

Stop at Alpha Preview Ready before inviting closed testers, then stop again at Alpha RC Ready after funded-chain evidence exists. Do not switch this checklist to production, Enjin mainnet, paid assets, cashout, public UGC, or service-role keys in browser/game code.
`;
}

function normalizePreviewOrigin(value) {
  const normalized = String(value || "").trim().replace(/\/+$/, "");
  if (!normalized || normalized === "<vercel-preview-host>") return "https://<vercel-preview-host>";
  return normalized.startsWith("http://") || normalized.startsWith("https://") ? normalized : `https://${normalized}`;
}

function formatPr(pr) {
  if (!pr.ok) return `${pr.repo}#${pr.number} not verified (${pr.message || "unknown"})`;
  return `${pr.url} ${pr.mergeStateStatus} ${pr.headRefOid} checks=${pr.checks.join(", ") || "none"}`;
}

function readGitState() {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const localHead = git(["rev-parse", "HEAD"]);
  const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
  const upstreamHead = upstream.ok ? git(["rev-parse", upstream.stdout.trim()]) : { ok: false, stdout: "", stderr: upstream.stderr };
  const counts = upstream.ok ? git(["rev-list", "--left-right", "--count", `${upstream.stdout.trim()}...HEAD`]) : { ok: false, stdout: "", stderr: upstream.stderr };
  const worktree = git(["status", "--porcelain"]);
  const [behindText = "0", aheadText = "0"] = firstLine(counts.stdout).split(/\s+/);
  return {
    branch: firstLine(branch.stdout),
    localHead: firstLine(localHead.stdout),
    upstream: firstLine(upstream.stdout),
    upstreamHead: firstLine(upstreamHead.stdout),
    ahead: Number.parseInt(aheadText, 10) || 0,
    behind: Number.parseInt(behindText, 10) || 0,
    dirty: worktree.ok ? worktree.stdout.split(/\r?\n/).filter(Boolean).map((line) => sanitize(line)) : ["git status unavailable"],
    errors: [branch, localHead, upstream, upstreamHead, counts, worktree]
      .filter((result) => !result.ok)
      .map((result) => sanitize(result.stderr || result.error || "git command failed")),
  };
}

function git(args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || "",
  };
}

function firstLine(value) {
  return String(value || "").split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "";
}

function sanitize(value) {
  return String(value || "")
    .replace(/\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/g, "<redacted-github-token>")
    .replace(/\bsb_secret_[A-Za-z0-9_-]{8,}\b/g, "<redacted-supabase-secret>")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "<redacted-jwt>")
    .slice(0, 1000);
}
