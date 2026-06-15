import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const tempDir = mkdtempSync(join(tmpdir(), "mochirii-mochi-social-browser-gates-"));
const checker = "scripts/check-mochi-social-preview-ready.mjs";

const requiredGateEnv = {
  MOCHI_SOCIAL_SITE_BROWSER_SIGNED_OUT_BLOCKED_OK: "true",
  MOCHI_SOCIAL_SITE_BROWSER_NON_TESTER_BLOCKED_OK: "true",
  MOCHI_SOCIAL_SITE_BROWSER_TERMS_GATE_OK: "true",
  MOCHI_SOCIAL_SITE_BROWSER_IFRAME_LOADS_OK: "true",
  MOCHI_SOCIAL_SITE_BROWSER_AUTH_BRIDGE_OK: "true",
  MOCHI_SOCIAL_SITE_BROWSER_FEEDBACK_AUDIT_OK: "true",
  MOCHI_SOCIAL_SITE_BROWSER_CHAIN_STUB_OK: "true",
  MOCHI_SOCIAL_SITE_BROWSER_ADMIN_GRANT_REVOKE_OK: "true",
};

const testerPasswordGateEnv = {
  MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_LOCKED_OK: "true",
  MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_IFRAME_ABSENT_OK: "true",
  MOCHI_SOCIAL_SITE_BROWSER_PASSWORD_INVALID_ERROR_OK: "true",
  MOCHI_SOCIAL_SITE_BROWSER_IFRAME_LOADS_OK: "true",
  MOCHI_SOCIAL_SITE_BROWSER_AUTH_BRIDGE_OK: "true",
  MOCHI_SOCIAL_SITE_BROWSER_CHAIN_STUB_OK: "true",
  MOCHI_SOCIAL_SITE_BROWSER_GAME_PRESENCE_OK: "true",
  MOCHI_SOCIAL_SITE_BROWSER_TESTER_ROUTE_SHEET_OK: "true",
  MOCHI_SOCIAL_SITE_BROWSER_TESTER_FEEDBACK_DRAFT_OK: "true",
};

try {
  assertNoConfirmationFails();
  assertPartialConfirmationListsMissingGate();
  assertHostedBrowserUrlRequiresHostedApproval();
  assertLocalhostBrowserEvidenceCanPassManualGateOnly();
  assertTesterPasswordBrowserEvidenceCanPassManualGateOnly();
  assertStoredBrowserGateReportCanPassManualGateOnly();
  assertStoredTesterPasswordBrowserGateReportCanPassManualGateOnly();
  console.log("Mochi Social browser gate self-test OK.");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

function assertNoConfirmationFails() {
  runAndAssertManualGate("no-confirmation", {}, (gate) => {
    assert(gate.status === "fail", "Manual gate should fail when no browser confirmation env is set.");
    assert(gate.message.includes("manual browser gates have not been confirmed"), "Manual gate should explain missing confirmation.");
    assert(gate.evidence.requiredGates.every((entry) => entry.ok === false), "No required gate should be marked ok by default.");
  });
}

function assertPartialConfirmationListsMissingGate() {
  const env = {
    MOCHI_SOCIAL_SITE_BROWSER_GATES_CONFIRMED: "true",
    MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER: "self-test",
    MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER: "local-test-browser",
    MOCHI_SOCIAL_SITE_BROWSER_GATES_URL: "http://localhost:3000/games/mochi-social",
    ...requiredGateEnv,
  };
  delete env.MOCHI_SOCIAL_SITE_BROWSER_FEEDBACK_AUDIT_OK;

  runAndAssertManualGate("partial-confirmation", env, (gate) => {
    assert(gate.status === "fail", "Manual gate should fail when one required browser gate is missing.");
    assert(gate.message.includes("MOCHI_SOCIAL_SITE_BROWSER_FEEDBACK_AUDIT_OK"), "Manual gate should name the missing browser gate env var.");
    const feedbackGate = gate.evidence.requiredGates.find((entry) => entry.envName === "MOCHI_SOCIAL_SITE_BROWSER_FEEDBACK_AUDIT_OK");
    assert(feedbackGate?.ok === false, "Missing feedback audit gate should be recorded as false.");
  });
}

function assertHostedBrowserUrlRequiresHostedApproval() {
  runAndAssertManualGate("hosted-url-no-approval", {
    MOCHI_SOCIAL_SITE_BROWSER_GATES_CONFIRMED: "true",
    MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER: "self-test",
    MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER: "local-test-browser",
    MOCHI_SOCIAL_SITE_BROWSER_GATES_URL: "https://preview.example/games/mochi-social",
    ...requiredGateEnv,
  }, (gate) => {
    assert(gate.status === "fail", "Hosted browser evidence should fail without hosted-check approval.");
    assert(gate.message.includes("hosted browser gate confirmation requires"), "Manual gate should require hosted approval for hosted browser evidence.");
    assert(gate.evidence.hostedChecksAllowed === false, "Hosted checks should be false in this self-test case.");
  });
}

function assertLocalhostBrowserEvidenceCanPassManualGateOnly() {
  runAndAssertManualGate("localhost-confirmed", {
    MOCHI_SOCIAL_SITE_BROWSER_GATES_CONFIRMED: "true",
    MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER: "self-test",
    MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER: "local-test-browser",
    MOCHI_SOCIAL_SITE_BROWSER_GATES_URL: "http://localhost:3000/games/mochi-social",
    ...requiredGateEnv,
  }, (gate, report) => {
    assert(gate.status === "pass", "Localhost browser evidence should satisfy only the manual browser gate.");
    assert(gate.evidence.requiredGates.every((entry) => entry.ok === true), "All required browser gates should be recorded as true.");
    assert(report.ok === false, "Preview Ready should still remain red in this self-test because branch/hosted gates are not proven.");
  });
}

function assertTesterPasswordBrowserEvidenceCanPassManualGateOnly() {
  runAndAssertManualGate("tester-password-confirmed", {
    MOCHI_SOCIAL_SITE_BROWSER_GATES_ACCESS_MODE: "tester-password",
    MOCHI_SOCIAL_SITE_BROWSER_GATES_CONFIRMED: "true",
    MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER: "self-test",
    MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER: "local-test-browser",
    MOCHI_SOCIAL_SITE_BROWSER_GATES_URL: "http://localhost:3000/games/mochi-social",
    ...testerPasswordGateEnv,
  }, (gate, report) => {
    assert(gate.status === "pass", "Tester-password browser evidence should satisfy the manual browser gate.");
    assert(gate.evidence.accessMode === "tester-password", "Tester-password gate should record its access mode.");
    assert(gate.evidence.requiredGates.every((entry) => entry.ok === true), "All tester-password required browser gates should be recorded as true.");
    assert(report.ok === false, "Preview Ready should still remain red in this self-test because branch/hosted gates are not proven.");
  });
}

function assertStoredBrowserGateReportCanPassManualGateOnly() {
  const storedJson = join(tempDir, "stored-browser-gates.json");
  const storedMd = join(tempDir, "stored-browser-gates.md");
  const fakeToken = `ghp_${"fakePreviewBrowserGateToken"}${"1234567890"}`;
  const writer = spawnSync(process.execPath, ["scripts/write-mochi-social-browser-gates.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      MOCHI_SOCIAL_CREDS_DIR: tempDir,
      MOCHI_SOCIAL_SITE_BROWSER_GATES_JSON: storedJson,
      MOCHI_SOCIAL_SITE_BROWSER_GATES_MD: storedMd,
      MOCHI_SOCIAL_SITE_BROWSER_GATES_HANDOFF: "stored-browser-gates-handoff.md",
      MOCHI_SOCIAL_SITE_BROWSER_GATES_CONFIRMED: "true",
      MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER: "self-test",
      MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER: "local-test-browser",
      MOCHI_SOCIAL_SITE_BROWSER_GATES_URL: "http://localhost:3000/games/mochi-social",
      MOCHI_SOCIAL_SITE_BROWSER_GATES_NOTES: `No-secret note with ${fakeToken} to verify redaction.`,
      ...requiredGateEnv,
    },
  });
  assert(writer.status === 0, `stored report writer should pass: ${writer.stderr || writer.stdout}`);
  const storedReportText = readFileSync(storedJson, "utf8");
  const storedMarkdown = readFileSync(storedMd, "utf8");
  assert(!storedReportText.includes(fakeToken), "Stored browser gate report must redact fake tokens.");
  assert(!storedMarkdown.includes(fakeToken), "Stored browser gate Markdown must redact fake tokens.");

  const result = spawnSync(process.execPath, [checker], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      MOCHI_SOCIAL_CREDS_DIR: tempDir,
      MOCHI_SOCIAL_SITE_BROWSER_GATES_JSON: storedJson,
      MOCHI_SOCIAL_SITE_PREVIEW_READY_JSON: reportJsonPath("stored-report"),
      MOCHI_SOCIAL_SITE_PREVIEW_READY_MD: reportMdPath("stored-report"),
      MOCHI_SOCIAL_GAME_REPO_PATH: join(tempDir, "missing-game-repo"),
      MOCHI_SOCIAL_GAME_CONTRACT_URL: "https://mochi-social-game.fly.dev",
      MOCHI_SOCIAL_SITE_ORIGIN: "https://mochirii-git-codex-mochi-social-alpha-rc-mochirii.vercel.app",
      MOCHI_SOCIAL_ALPHA_EDGE_URL: "https://dnxumaiooljdnbjvzbdc.supabase.co/functions/v1",
    },
  });
  assert(result.status !== 0, "Stored report should keep Preview Ready red while branch/hosted gates are not proven.");
  const report = readReport("stored-report");
  const gate = report.requirements.find((entry) => entry.id === "site.manual-browser-gates");
  assert(gate, "Stored report case did not include site.manual-browser-gates.");
  assert(gate.status === "pass", "Stored report should satisfy the manual browser gate.");
  assert(gate.evidence.source === storedJson, "Manual gate evidence should point at the stored browser gate report.");
  assert(gate.evidence.requiredGates.every((entry) => entry.ok === true), "Stored report should preserve every required browser gate as true.");
}

function assertStoredTesterPasswordBrowserGateReportCanPassManualGateOnly() {
  const storedJson = join(tempDir, "stored-tester-password-browser-gates.json");
  const storedMd = join(tempDir, "stored-tester-password-browser-gates.md");
  const writer = spawnSync(process.execPath, ["scripts/write-mochi-social-browser-gates.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      MOCHI_SOCIAL_CREDS_DIR: tempDir,
      MOCHI_SOCIAL_SITE_BROWSER_GATES_JSON: storedJson,
      MOCHI_SOCIAL_SITE_BROWSER_GATES_MD: storedMd,
      MOCHI_SOCIAL_SITE_BROWSER_GATES_HANDOFF: "stored-tester-password-browser-gates-handoff.md",
      MOCHI_SOCIAL_SITE_BROWSER_GATES_ACCESS_MODE: "tester-password",
      MOCHI_SOCIAL_SITE_BROWSER_GATES_CONFIRMED: "true",
      MOCHI_SOCIAL_SITE_BROWSER_GATES_REVIEWER: "self-test",
      MOCHI_SOCIAL_SITE_BROWSER_GATES_BROWSER: "local-test-browser",
      MOCHI_SOCIAL_SITE_BROWSER_GATES_URL: "http://localhost:3000/games/mochi-social",
      ...testerPasswordGateEnv,
    },
  });
  assert(writer.status === 0, `stored tester-password report writer should pass: ${writer.stderr || writer.stdout}`);

  const result = spawnSync(process.execPath, [checker], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      MOCHI_SOCIAL_CREDS_DIR: tempDir,
      MOCHI_SOCIAL_SITE_BROWSER_GATES_JSON: storedJson,
      MOCHI_SOCIAL_SITE_PREVIEW_READY_JSON: reportJsonPath("stored-tester-password-report"),
      MOCHI_SOCIAL_SITE_PREVIEW_READY_MD: reportMdPath("stored-tester-password-report"),
      MOCHI_SOCIAL_GAME_REPO_PATH: join(tempDir, "missing-game-repo"),
      MOCHI_SOCIAL_GAME_CONTRACT_URL: "https://mochi-social-game.fly.dev",
      MOCHI_SOCIAL_SITE_ORIGIN: "https://mochirii-git-codex-mochi-social-alpha-rc-mochirii.vercel.app",
      MOCHI_SOCIAL_ALPHA_EDGE_URL: "https://dnxumaiooljdnbjvzbdc.supabase.co/functions/v1",
    },
  });
  assert(result.status !== 0, "Stored tester-password report should keep Preview Ready red while branch/hosted gates are not proven.");
  const report = readReport("stored-tester-password-report");
  const gate = report.requirements.find((entry) => entry.id === "site.manual-browser-gates");
  assert(gate, "Stored tester-password report case did not include site.manual-browser-gates.");
  assert(gate.status === "pass", "Stored tester-password report should satisfy the manual browser gate.");
  assert(gate.evidence.accessMode === "tester-password", "Stored tester-password report should preserve access mode.");
  assert(gate.evidence.requiredGates.every((entry) => entry.ok === true), "Stored tester-password report should preserve every required browser gate as true.");
}

function runAndAssertManualGate(label, env, assertGate) {
  const result = spawnSync(process.execPath, [checker], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
      MOCHI_SOCIAL_CREDS_DIR: tempDir,
      MOCHI_SOCIAL_SITE_PREVIEW_READY_JSON: reportJsonPath(label),
      MOCHI_SOCIAL_SITE_PREVIEW_READY_MD: reportMdPath(label),
      MOCHI_SOCIAL_SITE_BROWSER_GATES_JSON: join(tempDir, `${label}-browser-gates.json`),
      MOCHI_SOCIAL_GAME_REPO_PATH: join(tempDir, "missing-game-repo"),
      MOCHI_SOCIAL_GAME_CONTRACT_URL: "https://mochi-social-game.fly.dev",
      MOCHI_SOCIAL_SITE_ORIGIN: "https://mochirii-git-codex-mochi-social-alpha-rc-mochirii.vercel.app",
      MOCHI_SOCIAL_ALPHA_EDGE_URL: "https://dnxumaiooljdnbjvzbdc.supabase.co/functions/v1",
    },
  });
  assert(result.status !== 0, `${label} should keep Preview Ready red while self-testing browser gate evidence.`);
  const report = readReport(label);
  const bridgeGate = report.requirements.find((entry) => entry.id === "site.bridge-state");
  assert(bridgeGate, `${label} report did not include site.bridge-state.`);
  assert(bridgeGate.status === "pass", `${label} site.bridge-state should pass before hosted/manual gates.`);
  assert(
    bridgeGate.evidence?.command === "node scripts/check-mochi-social-bridge-state.mjs",
    `${label} site.bridge-state should be backed by the local bridge state checker.`,
  );
  assertPassingCommandGate(label, report, "site.auth-bridge", "node scripts/check-mochi-social-auth-bridge.mjs");
  const authorityGate = report.requirements.find((entry) => entry.id === "site.edge-authority");
  assert(authorityGate, `${label} report did not include site.edge-authority.`);
  assert(authorityGate.status === "pass", `${label} site.edge-authority should pass before hosted/manual gates.`);
  assert(
    authorityGate.evidence?.command === "node scripts/check-mochi-social-edge-authority.mjs",
    `${label} site.edge-authority should be backed by the local Edge authority checker.`,
  );
  assertPassingCommandGate(label, report, "site.preview-key-loader", "node scripts/check-mochi-social-preview-key-loader.mjs");
  assertPassingCommandGate(label, report, "site.discord-oauth-detector", "node scripts/check-mochi-social-discord-oauth-self-test.mjs");
  const gate = report.requirements.find((entry) => entry.id === "site.manual-browser-gates");
  assert(gate, `${label} report did not include site.manual-browser-gates.`);
  assertGate(gate, report);
}

function assertPassingCommandGate(label, report, id, command) {
  const gate = report.requirements.find((entry) => entry.id === id);
  assert(gate, `${label} report did not include ${id}.`);
  assert(gate.status === "pass", `${label} ${id} should pass before hosted/manual gates.`);
  assert(gate.evidence?.command === command, `${label} ${id} should be backed by ${command}.`);
}

function readReport(label) {
  const file = reportJsonPath(label);
  assert(existsSync(file), `${label} report JSON was not written.`);
  return JSON.parse(readFileSync(file, "utf8"));
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
