import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { MOCHI_PETS_DEFAULT_ORIGIN } from "./lib/public-urls.mjs";

const root = process.cwd();
const tempDir = mkdtempSync(join(tmpdir(), "mochirii-mochi-pets-browser-gates-"));
const checker = "scripts/check-mochi-pets-preview-ready.mjs";

const requiredGateEnv = {
  MOCHI_PETS_SITE_BROWSER_SIGNED_OUT_BLOCKED_OK: "true",
  MOCHI_PETS_SITE_BROWSER_NON_TESTER_BLOCKED_OK: "true",
  MOCHI_PETS_SITE_BROWSER_TERMS_GATE_OK: "true",
  MOCHI_PETS_SITE_BROWSER_IFRAME_LOADS_OK: "true",
  MOCHI_PETS_SITE_BROWSER_AUTH_BRIDGE_OK: "true",
  MOCHI_PETS_SITE_BROWSER_FEEDBACK_AUDIT_OK: "true",
  MOCHI_PETS_SITE_BROWSER_NO_REAL_VALUE_OK: "true",
  MOCHI_PETS_SITE_BROWSER_ADMIN_GRANT_REVOKE_OK: "true",
};

const testerPasswordGateEnv = {
  MOCHI_PETS_SITE_BROWSER_PASSWORD_LOCKED_OK: "true",
  MOCHI_PETS_SITE_BROWSER_PASSWORD_IFRAME_ABSENT_OK: "true",
  MOCHI_PETS_SITE_BROWSER_PASSWORD_INVALID_ERROR_OK: "true",
  MOCHI_PETS_SITE_BROWSER_SIGNED_OUT_BLOCKED_OK: "true",
  MOCHI_PETS_SITE_BROWSER_NON_TESTER_BLOCKED_OK: "true",
  MOCHI_PETS_SITE_BROWSER_TERMS_GATE_OK: "true",
  MOCHI_PETS_SITE_BROWSER_IFRAME_LOADS_OK: "true",
  MOCHI_PETS_SITE_BROWSER_AUTH_BRIDGE_OK: "true",
  MOCHI_PETS_SITE_BROWSER_FEEDBACK_AUDIT_OK: "true",
  MOCHI_PETS_SITE_BROWSER_NO_REAL_VALUE_OK: "true",
  MOCHI_PETS_SITE_BROWSER_GAME_PRESENCE_OK: "true",
  MOCHI_PETS_SITE_BROWSER_ADMIN_GRANT_REVOKE_OK: "true",
};

function cleanBrowserGateEnv(extra = {}) {
  const env = { ...process.env };
  for (const name of Object.keys(env)) {
    if (name.startsWith("MOCHI_PETS_SITE_BROWSER_")) {
      delete env[name];
    }
  }
  return { ...env, ...extra };
}

try {
  assertNoConfirmationFails();
  assertPartialConfirmationListsMissingGate();
  assertHostedBrowserUrlRequiresHostedApproval();
  assertWrongBrowserGateUrlPathFails();
  assertLocalhostBrowserEvidenceCanPassManualGateOnly();
  assertTesterPasswordBrowserEvidenceCanPassManualGateOnly();
  assertStoredBrowserGateReportCanPassManualGateOnly();
  assertStoredTesterPasswordBrowserGateReportCanPassManualGateOnly();
  assertStoredSupabaseReportCannotSatisfyTesterPasswordMode();
  assertStoredWrongUrlPathCannotSatisfyManualGate();
  console.log("Mochi Pets browser gate self-test OK.");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

function assertNoConfirmationFails() {
  runAndAssertManualGate("no-confirmation", {}, (gate) => {
    assert(gate.status === "fail", "Manual gate should fail when no browser confirmation env is set.");
    assert(gate.message.includes("manual browser gates have not been confirmed"), "Manual gate should explain missing confirmation.");
    assert(gate.evidence.requiredGates.every((entry) => entry.ok === false), "No required gate should be marked ok by default.");
    assertReviewContext(gate.evidence.reviewContext, { testerPassword: true, hosted: false, hostedAllowed: false });
  });
}

function assertPartialConfirmationListsMissingGate() {
  const env = {
    MOCHI_PETS_SITE_BROWSER_GATES_CONFIRMED: "true",
    MOCHI_PETS_SITE_BROWSER_GATES_REVIEWER: "self-test",
    MOCHI_PETS_SITE_BROWSER_GATES_BROWSER: "local-test-browser",
    MOCHI_PETS_SITE_BROWSER_GATES_URL: "http://localhost:3000/games/mochi-pets",
    ...testerPasswordGateEnv,
  };
  delete env.MOCHI_PETS_SITE_BROWSER_FEEDBACK_AUDIT_OK;

  runAndAssertManualGate("partial-confirmation", env, (gate) => {
    assert(gate.status === "fail", "Manual gate should fail when one required browser gate is missing.");
    assert(gate.message.includes("MOCHI_PETS_SITE_BROWSER_FEEDBACK_AUDIT_OK"), "Manual gate should name the missing browser gate env var.");
    const feedbackGate = gate.evidence.requiredGates.find((entry) => entry.envName === "MOCHI_PETS_SITE_BROWSER_FEEDBACK_AUDIT_OK");
    assert(feedbackGate?.ok === false, "Missing feedback audit gate should be recorded as false.");
    assertReviewContext(gate.evidence.reviewContext, { testerPassword: true, hosted: false, hostedAllowed: false });
  });
}

function assertHostedBrowserUrlRequiresHostedApproval() {
  runAndAssertManualGate("hosted-url-no-approval", {
    MOCHI_PETS_SITE_BROWSER_GATES_CONFIRMED: "true",
    MOCHI_PETS_SITE_BROWSER_GATES_REVIEWER: "self-test",
    MOCHI_PETS_SITE_BROWSER_GATES_BROWSER: "local-test-browser",
    MOCHI_PETS_SITE_BROWSER_GATES_URL: "https://preview.example/games/mochi-pets",
    ...testerPasswordGateEnv,
  }, (gate) => {
    assert(gate.status === "fail", "Hosted browser evidence should fail without hosted-check approval.");
    assert(gate.message.includes("hosted browser gate confirmation requires"), "Manual gate should require hosted approval for hosted browser evidence.");
    assert(gate.evidence.hostedChecksAllowed === false, "Hosted checks should be false in this self-test case.");
    assertReviewContext(gate.evidence.reviewContext, { testerPassword: true, hosted: true, hostedAllowed: false });
  });
}

function assertWrongBrowserGateUrlPathFails() {
  runAndAssertManualGate("wrong-url-path", {
    MOCHI_PETS_SITE_BROWSER_GATES_CONFIRMED: "true",
    MOCHI_PETS_SITE_BROWSER_GATES_REVIEWER: "self-test",
    MOCHI_PETS_SITE_BROWSER_GATES_BROWSER: "local-test-browser",
    MOCHI_PETS_SITE_BROWSER_GATES_URL: "http://localhost:3000/account",
    ...testerPasswordGateEnv,
  }, (gate) => {
    assert(gate.status === "fail", "Manual browser evidence should fail when the URL path is not /games/mochi-pets.");
    assert(gate.message.includes("manual browser gate URL must target /games/mochi-pets"), "Manual gate should name the required review route.");
  });
}

function assertLocalhostBrowserEvidenceCanPassManualGateOnly() {
  runAndAssertManualGate("localhost-confirmed", {
    MOCHI_PETS_SITE_BROWSER_GATES_ACCESS_MODE: "supabase",
    MOCHI_PETS_SITE_BROWSER_GATES_CONFIRMED: "true",
    MOCHI_PETS_SITE_BROWSER_GATES_REVIEWER: "self-test",
    MOCHI_PETS_SITE_BROWSER_GATES_BROWSER: "local-test-browser",
    MOCHI_PETS_SITE_BROWSER_GATES_URL: "http://localhost:3000/games/mochi-pets",
    ...requiredGateEnv,
  }, (gate, report) => {
    assert(gate.status === "pass", "Localhost browser evidence should satisfy only the manual browser gate.");
    assert(gate.evidence.requiredGates.every((entry) => entry.ok === true), "All required browser gates should be recorded as true.");
    assertReviewContext(gate.evidence.reviewContext, { testerPassword: false, hosted: false, hostedAllowed: false });
    assert(report.ok === false, "Preview Ready should still remain red in this self-test because branch/hosted gates are not proven.");
  });
}

function assertTesterPasswordBrowserEvidenceCanPassManualGateOnly() {
  runAndAssertManualGate("tester-password-confirmed", {
    MOCHI_PETS_SITE_BROWSER_GATES_ACCESS_MODE: "tester-password",
    MOCHI_PETS_SITE_BROWSER_GATES_CONFIRMED: "true",
    MOCHI_PETS_SITE_BROWSER_GATES_REVIEWER: "self-test",
    MOCHI_PETS_SITE_BROWSER_GATES_BROWSER: "local-test-browser",
    MOCHI_PETS_SITE_BROWSER_GATES_URL: "http://localhost:3000/games/mochi-pets",
    ...testerPasswordGateEnv,
  }, (gate, report) => {
    assert(gate.status === "pass", "Tester-password browser evidence should satisfy the manual browser gate.");
    assert(gate.evidence.accessMode === "tester-password", "Tester-password gate should record its access mode.");
    assert(gate.evidence.requiredGates.every((entry) => entry.ok === true), "All tester-password required browser gates should be recorded as true.");
    assertReviewContext(gate.evidence.reviewContext, { testerPassword: true, hosted: false, hostedAllowed: false });
    assert(report.ok === false, "Preview Ready should still remain red in this self-test because branch/hosted gates are not proven.");
  });
}

function assertStoredBrowserGateReportCanPassManualGateOnly() {
  const storedJson = join(tempDir, "stored-browser-gates.json");
  const storedMd = join(tempDir, "stored-browser-gates.md");
  const fakeToken = `ghp_${"fakePreviewBrowserGateToken"}${"1234567890"}`;
  const writer = spawnSync(process.execPath, ["scripts/write-mochi-pets-browser-gates.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: cleanBrowserGateEnv({
      MOCHI_PETS_CREDS_DIR: tempDir,
      MOCHI_PETS_SITE_BROWSER_GATES_JSON: storedJson,
      MOCHI_PETS_SITE_BROWSER_GATES_MD: storedMd,
      MOCHI_PETS_SITE_BROWSER_GATES_HANDOFF: "stored-browser-gates-handoff.md",
      MOCHI_PETS_SITE_BROWSER_GATES_CONFIRMED: "true",
      MOCHI_PETS_SITE_BROWSER_GATES_REVIEWER: "self-test",
      MOCHI_PETS_SITE_BROWSER_GATES_BROWSER: "local-test-browser",
      MOCHI_PETS_SITE_BROWSER_GATES_URL: "http://localhost:3000/games/mochi-pets",
      MOCHI_PETS_SITE_BROWSER_GATES_NOTES: `No-secret note with ${fakeToken} to verify redaction.`,
      ...testerPasswordGateEnv,
    }),
  });
  assert(writer.status === 0, `stored report writer should pass: ${writer.stderr || writer.stdout}`);
  const storedReportText = readFileSync(storedJson, "utf8");
  const storedMarkdown = readFileSync(storedMd, "utf8");
  const storedReport = JSON.parse(storedReportText);
  assert(!storedReportText.includes(fakeToken), "Stored browser gate report must redact fake tokens.");
  assert(!storedMarkdown.includes(fakeToken), "Stored browser gate Markdown must redact fake tokens.");
  assertReviewContext(storedReport.reviewContext, { testerPassword: true, hosted: false, hostedAllowed: false });
  assert(storedMarkdown.includes("## Review Context"), "Stored browser gate Markdown should include review context.");
  assert(storedMarkdown.includes("This review cannot be completed by:"), "Stored browser gate Markdown should explain insufficient evidence.");

  const result = spawnSync(process.execPath, [checker], {
    cwd: root,
    encoding: "utf8",
    env: cleanBrowserGateEnv({
      MOCHI_PETS_CREDS_DIR: tempDir,
      MOCHI_PETS_SITE_BROWSER_GATES_JSON: storedJson,
      MOCHI_PETS_SITE_PREVIEW_READY_JSON: reportJsonPath("stored-report"),
      MOCHI_PETS_SITE_PREVIEW_READY_MD: reportMdPath("stored-report"),
      MOCHI_PETS_GAME_REPO_PATH: join(tempDir, "missing-game-repo"),
      MOCHI_PETS_GAME_CONTRACT_URL: MOCHI_PETS_DEFAULT_ORIGIN,
      MOCHI_PETS_SITE_ORIGIN: "https://mochirii-git-mochi-pets-alpha-preview-mochirii.vercel.app",
      MOCHI_PETS_ALPHA_EDGE_URL: "https://dnxumaiooljdnbjvzbdc.supabase.co/functions/v1",
    }),
  });
  assert(result.status !== 0, "Stored report should keep Preview Ready red while branch/hosted gates are not proven.");
  const report = readReport("stored-report");
  const gate = report.requirements.find((entry) => entry.id === "site.manual-browser-gates");
  assert(gate, "Stored report case did not include site.manual-browser-gates.");
  assert(gate.status === "pass", "Stored report should satisfy the manual browser gate.");
  assert(gate.evidence.source === storedJson, "Manual gate evidence should point at the stored browser gate report.");
  assert(gate.evidence.requiredGates.every((entry) => entry.ok === true), "Stored report should preserve every required browser gate as true.");
  assertReviewContext(gate.evidence.reviewContext, { testerPassword: true, hosted: false, hostedAllowed: false });
}

function assertStoredTesterPasswordBrowserGateReportCanPassManualGateOnly() {
  const storedJson = join(tempDir, "stored-tester-password-browser-gates.json");
  const storedMd = join(tempDir, "stored-tester-password-browser-gates.md");
  const writer = spawnSync(process.execPath, ["scripts/write-mochi-pets-browser-gates.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: cleanBrowserGateEnv({
      MOCHI_PETS_CREDS_DIR: tempDir,
      MOCHI_PETS_SITE_BROWSER_GATES_JSON: storedJson,
      MOCHI_PETS_SITE_BROWSER_GATES_MD: storedMd,
      MOCHI_PETS_SITE_BROWSER_GATES_HANDOFF: "stored-tester-password-browser-gates-handoff.md",
      MOCHI_PETS_SITE_BROWSER_GATES_ACCESS_MODE: "tester-password",
      MOCHI_PETS_SITE_BROWSER_GATES_CONFIRMED: "true",
      MOCHI_PETS_SITE_BROWSER_GATES_REVIEWER: "self-test",
      MOCHI_PETS_SITE_BROWSER_GATES_BROWSER: "local-test-browser",
      MOCHI_PETS_SITE_BROWSER_GATES_URL: "http://localhost:3000/games/mochi-pets",
      ...testerPasswordGateEnv,
    }),
  });
  assert(writer.status === 0, `stored tester-password report writer should pass: ${writer.stderr || writer.stdout}`);
  const storedReport = JSON.parse(readFileSync(storedJson, "utf8"));
  assertReviewContext(storedReport.reviewContext, { testerPassword: true, hosted: false, hostedAllowed: false });

  const result = spawnSync(process.execPath, [checker], {
    cwd: root,
    encoding: "utf8",
    env: cleanBrowserGateEnv({
      MOCHI_PETS_CREDS_DIR: tempDir,
      MOCHI_PETS_SITE_BROWSER_GATES_JSON: storedJson,
      MOCHI_PETS_SITE_PREVIEW_READY_JSON: reportJsonPath("stored-tester-password-report"),
      MOCHI_PETS_SITE_PREVIEW_READY_MD: reportMdPath("stored-tester-password-report"),
      MOCHI_PETS_GAME_REPO_PATH: join(tempDir, "missing-game-repo"),
      MOCHI_PETS_GAME_CONTRACT_URL: MOCHI_PETS_DEFAULT_ORIGIN,
      MOCHI_PETS_SITE_ORIGIN: "https://mochirii-git-mochi-pets-alpha-preview-mochirii.vercel.app",
      MOCHI_PETS_ALPHA_EDGE_URL: "https://dnxumaiooljdnbjvzbdc.supabase.co/functions/v1",
    }),
  });
  assert(result.status !== 0, "Stored tester-password report should keep Preview Ready red while branch/hosted gates are not proven.");
  const report = readReport("stored-tester-password-report");
  const gate = report.requirements.find((entry) => entry.id === "site.manual-browser-gates");
  assert(gate, "Stored tester-password report case did not include site.manual-browser-gates.");
  assert(gate.status === "pass", "Stored tester-password report should satisfy the manual browser gate.");
  assert(gate.evidence.accessMode === "tester-password", "Stored tester-password report should preserve access mode.");
  assert(gate.evidence.requiredGates.every((entry) => entry.ok === true), "Stored tester-password report should preserve every required browser gate as true.");
  assertReviewContext(gate.evidence.reviewContext, { testerPassword: true, hosted: false, hostedAllowed: false });
}

function assertStoredSupabaseReportCannotSatisfyTesterPasswordMode() {
  const storedJson = join(tempDir, "stored-supabase-browser-gates.json");
  const storedMd = join(tempDir, "stored-supabase-browser-gates.md");
  const writer = spawnSync(process.execPath, ["scripts/write-mochi-pets-browser-gates.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: cleanBrowserGateEnv({
      MOCHI_PETS_CREDS_DIR: tempDir,
      MOCHI_PETS_SITE_BROWSER_GATES_JSON: storedJson,
      MOCHI_PETS_SITE_BROWSER_GATES_MD: storedMd,
      MOCHI_PETS_SITE_BROWSER_GATES_HANDOFF: "stored-supabase-browser-gates-handoff.md",
      MOCHI_PETS_SITE_BROWSER_GATES_ACCESS_MODE: "supabase",
      MOCHI_PETS_SITE_BROWSER_GATES_CONFIRMED: "true",
      MOCHI_PETS_SITE_BROWSER_GATES_REVIEWER: "self-test",
      MOCHI_PETS_SITE_BROWSER_GATES_BROWSER: "local-test-browser",
      MOCHI_PETS_SITE_BROWSER_GATES_URL: "http://localhost:3000/games/mochi-pets",
      ...requiredGateEnv,
    }),
  });
  assert(writer.status === 0, `stored Supabase report writer should pass: ${writer.stderr || writer.stdout}`);
  const storedReport = JSON.parse(readFileSync(storedJson, "utf8"));
  assert(storedReport.accessMode === "supabase", "Stored Supabase report should record Supabase access mode.");
  assertReviewContext(storedReport.reviewContext, { testerPassword: false, hosted: false, hostedAllowed: false });

  const result = spawnSync(process.execPath, [checker], {
    cwd: root,
    encoding: "utf8",
    env: cleanBrowserGateEnv({
      MOCHI_PETS_CREDS_DIR: tempDir,
      MOCHI_PETS_SITE_BROWSER_GATES_JSON: storedJson,
      MOCHI_PETS_SITE_PREVIEW_READY_JSON: reportJsonPath("stored-supabase-report-tester-password-target"),
      MOCHI_PETS_SITE_PREVIEW_READY_MD: reportMdPath("stored-supabase-report-tester-password-target"),
      MOCHI_PETS_GAME_REPO_PATH: join(tempDir, "missing-game-repo"),
      MOCHI_PETS_GAME_CONTRACT_URL: MOCHI_PETS_DEFAULT_ORIGIN,
      MOCHI_PETS_SITE_ORIGIN: "https://mochirii-git-mochi-pets-alpha-preview-mochirii.vercel.app",
      MOCHI_PETS_ALPHA_EDGE_URL: "https://dnxumaiooljdnbjvzbdc.supabase.co/functions/v1",
    }),
  });
  assert(result.status !== 0, "Stored Supabase report should keep Preview Ready red for a tester-password target.");
  const report = readReport("stored-supabase-report-tester-password-target");
  const gate = report.requirements.find((entry) => entry.id === "site.manual-browser-gates");
  assert(gate, "Stored Supabase report mismatch case did not include site.manual-browser-gates.");
  assert(gate.status === "fail", "Stored Supabase report should fail the tester-password manual browser gate.");
  assert(gate.message.includes("access mode supabase does not match current browser gate mode tester-password"), "Mismatch failure should name both access modes.");
}

function assertStoredWrongUrlPathCannotSatisfyManualGate() {
  const storedJson = join(tempDir, "stored-wrong-path-browser-gates.json");
  const storedMd = join(tempDir, "stored-wrong-path-browser-gates.md");
  const writer = spawnSync(process.execPath, ["scripts/write-mochi-pets-browser-gates.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: cleanBrowserGateEnv({
      MOCHI_PETS_CREDS_DIR: tempDir,
      MOCHI_PETS_SITE_BROWSER_GATES_JSON: storedJson,
      MOCHI_PETS_SITE_BROWSER_GATES_MD: storedMd,
      MOCHI_PETS_SITE_BROWSER_GATES_HANDOFF: "stored-wrong-path-browser-gates-handoff.md",
      MOCHI_PETS_SITE_BROWSER_GATES_ACCESS_MODE: "tester-password",
      MOCHI_PETS_SITE_BROWSER_GATES_CONFIRMED: "true",
      MOCHI_PETS_SITE_BROWSER_GATES_REVIEWER: "self-test",
      MOCHI_PETS_SITE_BROWSER_GATES_BROWSER: "local-test-browser",
      MOCHI_PETS_SITE_BROWSER_GATES_URL: "http://localhost:3000/games/mochi-pets",
      ...testerPasswordGateEnv,
    }),
  });
  assert(writer.status === 0, `stored wrong-path setup writer should pass: ${writer.stderr || writer.stdout}`);
  const storedReport = JSON.parse(readFileSync(storedJson, "utf8"));
  storedReport.url = "http://localhost:3000/account";
  writeFileSync(storedJson, `${JSON.stringify(storedReport, null, 2)}\n`, "utf8");

  const result = spawnSync(process.execPath, [checker], {
    cwd: root,
    encoding: "utf8",
    env: cleanBrowserGateEnv({
      MOCHI_PETS_CREDS_DIR: tempDir,
      MOCHI_PETS_SITE_BROWSER_GATES_JSON: storedJson,
      MOCHI_PETS_SITE_PREVIEW_READY_JSON: reportJsonPath("stored-wrong-path-report"),
      MOCHI_PETS_SITE_PREVIEW_READY_MD: reportMdPath("stored-wrong-path-report"),
      MOCHI_PETS_GAME_REPO_PATH: join(tempDir, "missing-game-repo"),
      MOCHI_PETS_GAME_CONTRACT_URL: MOCHI_PETS_DEFAULT_ORIGIN,
      MOCHI_PETS_SITE_ORIGIN: "https://mochirii-git-mochi-pets-alpha-preview-mochirii.vercel.app",
      MOCHI_PETS_ALPHA_EDGE_URL: "https://dnxumaiooljdnbjvzbdc.supabase.co/functions/v1",
    }),
  });
  assert(result.status !== 0, "Stored wrong-path report should keep Preview Ready red.");
  const report = readReport("stored-wrong-path-report");
  const gate = report.requirements.find((entry) => entry.id === "site.manual-browser-gates");
  assert(gate, "Stored wrong-path report case did not include site.manual-browser-gates.");
  assert(gate.status === "fail", "Stored wrong-path report should fail the manual browser gate.");
  assert(gate.message.includes("stored browser gate report URL must target /games/mochi-pets"), "Stored wrong-path failure should name the required review route.");
}

function runAndAssertManualGate(label, env, assertGate) {
  const result = spawnSync(process.execPath, [checker], {
    cwd: root,
    encoding: "utf8",
    env: cleanBrowserGateEnv({
      ...env,
      MOCHI_PETS_CREDS_DIR: tempDir,
      MOCHI_PETS_SITE_PREVIEW_READY_JSON: reportJsonPath(label),
      MOCHI_PETS_SITE_PREVIEW_READY_MD: reportMdPath(label),
      MOCHI_PETS_SITE_BROWSER_GATES_JSON: join(tempDir, `${label}-browser-gates.json`),
      MOCHI_PETS_GAME_REPO_PATH: join(tempDir, "missing-game-repo"),
      MOCHI_PETS_GAME_CONTRACT_URL: MOCHI_PETS_DEFAULT_ORIGIN,
      MOCHI_PETS_SITE_ORIGIN: "https://mochirii-git-mochi-pets-alpha-preview-mochirii.vercel.app",
      MOCHI_PETS_ALPHA_EDGE_URL: "https://dnxumaiooljdnbjvzbdc.supabase.co/functions/v1",
    }),
  });
  assert(result.status !== 0, `${label} should keep Preview Ready red while self-testing browser gate evidence.`);
  const report = readReport(label);
  const bridgeGate = report.requirements.find((entry) => entry.id === "site.bridge-state");
  assert(bridgeGate, `${label} report did not include site.bridge-state.`);
  assert(bridgeGate.status === "pass", `${label} site.bridge-state should pass before hosted/manual gates.`);
  assert(
    bridgeGate.evidence?.command === "node scripts/check-mochi-pets-bridge-state.mjs",
    `${label} site.bridge-state should be backed by the local bridge state checker.`,
  );
  assertPassingCommandGate(label, report, "site.auth-bridge", "node scripts/check-mochi-pets-auth-bridge.mjs");
  const authorityGate = report.requirements.find((entry) => entry.id === "site.edge-authority");
  assert(authorityGate, `${label} report did not include site.edge-authority.`);
  assert(authorityGate.status === "pass", `${label} site.edge-authority should pass before hosted/manual gates.`);
  assert(
    authorityGate.evidence?.command === "node scripts/check-mochi-pets-edge-authority.mjs",
    `${label} site.edge-authority should be backed by the local Edge authority checker.`,
  );
  assertPassingCommandGate(label, report, "site.preview-key-loader", "node scripts/check-mochi-pets-preview-key-loader.mjs");
  assertPassingCommandGate(label, report, "site.discord-oauth-detector", "node scripts/check-mochi-pets-discord-oauth-self-test.mjs");
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

function assertReviewContext(context, { testerPassword, hosted, hostedAllowed }) {
  assert(context && typeof context === "object", "Browser gate evidence should include review context.");
  assert(context.requiresTesterPasswordWall === testerPassword, "Review context should record whether tester password wall review is required.");
  assert(context.requiresMemberSignIn === true, "Review context should require Mochirii member sign-in.");
  assert(context.requiresMemberAuthorityPath === true, "Review context should require member authority gates.");
  assert(context.requiresUnityBridgePath === true, "Review context should require Unity iframe/auth bridge review.");
  assert(context.passwordOnlyIsInsufficient === testerPassword, "Review context should mark password-only access insufficient in tester-password mode.");
  assert(context.hostedUrl === hosted, "Review context should record whether the reviewed URL is hosted.");
  assert(context.hostedAllowed === hostedAllowed, "Review context should record hosted approval state.");

  const preconditions = Array.isArray(context.completionPreconditions) ? context.completionPreconditions.join("\n") : "";
  assert(preconditions.includes("Mochirii member path"), "Review context should require member-path authentication.");
  assert(preconditions.includes("signed-out, non-tester, and terms-required"), "Review context should require blocked-state review.");
  assert(preconditions.includes("MOCHI_PETS_AUTH"), "Review context should require auth bridge review.");
  assert(preconditions.includes("feedback/admin audit"), "Review context should require feedback/admin audit review.");

  const insufficient = Array.isArray(context.cannotBeCompletedBy) ? context.cannotBeCompletedBy.join("\n") : "";
  assert(insufficient.includes("tester password wall alone"), "Review context should reject password-wall-only evidence.");
  assert(insufficient.includes("static screenshots alone"), "Review context should reject screenshot-only evidence.");
  assert(insufficient.includes("environment variables without a browser review"), "Review context should reject env-only evidence.");
  assert(insufficient.includes("legacy runtime"), "Review context should reject legacy runtime evidence.");
  assert(insufficient.includes("hosted URL without explicit hosted-preview approval"), "Review context should reject unapproved hosted evidence.");
  assert(insufficient.includes("dummy tester"), "Review context should reject dummy account/provider data.");
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
