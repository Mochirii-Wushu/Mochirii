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

try {
  assertNoConfirmationFails();
  assertPartialConfirmationListsMissingGate();
  assertHostedBrowserUrlRequiresHostedApproval();
  assertLocalhostBrowserEvidenceCanPassManualGateOnly();
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
      MOCHI_SOCIAL_GAME_REPO_PATH: join(tempDir, "missing-game-repo"),
      MOCHI_SOCIAL_GAME_CONTRACT_URL: "https://mochi-social-game.fly.dev",
      MOCHI_SOCIAL_SITE_ORIGIN: "https://mochirii-git-codex-mochi-social-alpha-rc-mochirii.vercel.app",
      MOCHI_SOCIAL_ALPHA_EDGE_URL: "https://dnxumaiooljdnbjvzbdc.supabase.co/functions/v1",
    },
  });
  assert(result.status !== 0, `${label} should keep Preview Ready red while self-testing browser gate evidence.`);
  const report = readReport(label);
  const gate = report.requirements.find((entry) => entry.id === "site.manual-browser-gates");
  assert(gate, `${label} report did not include site.manual-browser-gates.`);
  assertGate(gate, report);
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
