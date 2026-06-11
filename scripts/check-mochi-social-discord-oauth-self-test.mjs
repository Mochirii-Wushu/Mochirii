import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";

const root = process.cwd();
const tempDir = mkdtempSync(join(tmpdir(), "mochirii-mochi-social-discord-oauth-"));
const checker = "scripts/check-mochi-social-preview-ready.mjs";
const serverFile = join(tempDir, "mock-supabase-auth.mjs");

writeFileSync(serverFile, `
import http from "node:http";

const mode = process.argv[2] || "success";
const server = http.createServer((req, res) => {
  if (!req.url?.startsWith("/authorize")) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
    return;
  }

  if (mode === "success") {
    res.writeHead(302, { location: "https://discord.com/oauth2/authorize?client_id=self-test" });
    res.end();
    return;
  }

  res.writeHead(400, { "content-type": "application/json" });
  res.end(JSON.stringify({ code: 400, error_code: "validation_failed", msg: "Unsupported provider: provider is not enabled" }));
});

server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  process.stdout.write(String(address.port) + "\\n");
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
`, "utf8");

try {
  await assertDiscordRedirectPasses();
  await assertUnsupportedProviderFails();
  console.log("Mochi Social Discord OAuth provider self-test OK.");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

async function assertDiscordRedirectPasses() {
  await withMockAuthServer("success", (authUrl) => {
    const result = runChecker("discord-redirect", authUrl);
    const report = readReport("discord-redirect");
    const gate = discordGate(report);

    assert(result.status !== 0, "Preview Ready should remain red while branch/hosted/manual gates are unproven.");
    assert(gate.status === "pass", "Discord OAuth gate should pass when Supabase starts a Discord redirect.");
    assert(gate.message.includes("begins the OAuth redirect flow"), "Discord OAuth gate should describe the redirect flow.");
    assert(gate.evidence.status === 302, "Discord OAuth gate should record the redirect HTTP status.");
    assert(gate.evidence.locationHost === "discord.com", "Discord OAuth gate should record only the Discord location host.");
    assert(gate.evidence.unsupportedProvider === false, "Discord OAuth gate should not flag unsupportedProvider for redirects.");
  });
}

async function assertUnsupportedProviderFails() {
  await withMockAuthServer("unsupported", (authUrl) => {
    const result = runChecker("unsupported-provider", authUrl);
    const report = readReport("unsupported-provider");
    const gate = discordGate(report);

    assert(result.status !== 0, "Preview Ready should remain red while branch/hosted/manual gates are unproven.");
    assert(gate.status === "fail", "Discord OAuth gate should fail when Supabase reports an unsupported provider.");
    assert(gate.message.includes("not enabled") || gate.message.includes("did not begin"), "Discord OAuth gate should explain provider readiness failure.");
    assert(gate.evidence.status === 400, "Discord OAuth gate should record the failure HTTP status.");
    assert(gate.evidence.unsupportedProvider === true, "Discord OAuth gate should flag unsupportedProvider for the known Supabase failure.");
  });
}

function withMockAuthServer(mode, fn) {
  const child = spawn(process.execPath, [serverFile, mode], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return waitForPort(child)
    .then((port) => {
      try {
        return fn(`http://127.0.0.1:${port}`);
      } finally {
        child.kill("SIGTERM");
      }
    });
}

async function waitForPort(child) {
  const [chunk] = await once(child.stdout, "data");
  const port = Number(String(chunk).trim());
  assert(Number.isInteger(port) && port > 0, "Mock auth server did not report a usable port.");
  return port;
}

function runChecker(label, authUrl) {
  const result = spawnSync(process.execPath, [checker], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      MOCHI_SOCIAL_CREDS_DIR: tempDir,
      MOCHI_SOCIAL_SITE_PREVIEW_READY_JSON: reportJsonPath(label),
      MOCHI_SOCIAL_SITE_PREVIEW_READY_MD: reportMdPath(label),
      MOCHI_SOCIAL_ALPHA_AUTH_URL: authUrl,
      MOCHI_SOCIAL_ALPHA_EDGE_URL: authUrl.replace("/auth/v1", "/functions/v1"),
      MOCHI_SOCIAL_SITE_ORIGIN: "http://localhost:3000",
      MOCHI_SOCIAL_GAME_CONTRACT_URL: "http://localhost:3100",
    },
  });
  assert(!`${result.stdout || ""}${result.stderr || ""}`.includes("client_secret"), `${label} output should not mention OAuth client secrets.`);
  return result;
}

function readReport(label) {
  return JSON.parse(readFileSync(reportJsonPath(label), "utf8"));
}

function discordGate(report) {
  const gate = report.requirements.find((entry) => entry.id === "site.discord-oauth");
  assert(gate, "Preview Ready report did not include site.discord-oauth.");
  return gate;
}

function reportJsonPath(label) {
  return join(tempDir, `${label}.json`);
}

function reportMdPath(label) {
  return join(tempDir, `${label}.md`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
