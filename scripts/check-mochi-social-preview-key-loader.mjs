import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const tempDir = mkdtempSync(join(tmpdir(), "mochirii-mochi-social-key-loader-"));
const checker = "scripts/check-mochi-social-preview-ready.mjs";
const publishableValue = "self-test-publishable-key";
const serviceValue = "self-test-service-key";
const secretValue = "self-test-secret-key";

try {
  assertDoesNotAutoLoadWithoutApproval();
  assertLoadsExplicitPublishableKeyFile();
  console.log("Mochi Social preview publishable-key loader self-test OK (values redacted).");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

function assertDoesNotAutoLoadWithoutApproval() {
  const result = runChecker("no-auto-load", {});
  const report = readReport("no-auto-load");
  assert(result.status !== 0, "Preview Ready self-test should stay red without external approvals.");
  assert(report.publishableKeyPresent === false, "Preview Ready should not auto-load a publishable key before hosted approval.");
  assert(report.publishableKeySource === "not-loaded-awaiting-hosted-approval", `Unexpected key source: ${report.publishableKeySource}`);
}

function assertLoadsExplicitPublishableKeyFile() {
  const keyFile = join(tempDir, "supabase-preview-self-test-api-keys.local.json");
  writeFileSync(keyFile, `\uFEFF${JSON.stringify([
    { name: "service_role", type: "legacy", description: "Legacy service_role API key", api_key: serviceValue },
    { name: "default", type: "secret", description: "", api_key: secretValue },
    { name: "anon", type: "legacy", description: "Legacy anon API key", api_key: "self-test-anon-key" },
    { name: "default", type: "publishable", description: "", api_key: publishableValue },
  ], null, 2)}\n`, "utf8");

  const result = runChecker("explicit-file", {
    MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY_FILE: keyFile,
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  const reportPath = reportJsonPath("explicit-file");
  const report = readReport("explicit-file");
  const reportJson = readFileSync(reportPath, "utf8");
  const reportMd = readFileSync(reportMdPath("explicit-file"), "utf8");
  const handoff = readFileSync(join(tempDir, "mochirii-mochi-social-preview-ready.md"), "utf8");

  assert(result.status !== 0, "Preview Ready self-test should remain red until branch sync, hosted, and browser gates pass.");
  assert(report.publishableKeyPresent === true, "Explicit key file should make publishableKeyPresent true.");
  assert(report.publishableKeySource === `file:${basename(keyFile)}`, `Unexpected key source: ${report.publishableKeySource}`);
  for (const value of [publishableValue, serviceValue, secretValue]) {
    assertNoLeak("checker output", output, value);
    assertNoLeak("JSON report", reportJson, value);
    assertNoLeak("markdown report", reportMd, value);
    assertNoLeak("handoff report", handoff, value);
  }
}

function runChecker(label, env) {
  const childEnv = { ...process.env };
  delete childEnv.MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY;
  delete childEnv.MOCHI_SOCIAL_ALPHA_EDGE_PUBLISHABLE_KEY_FILE;
  delete childEnv.MOCHI_SOCIAL_SITE_PREVIEW_READY_ALLOW_HOSTED;

  return spawnSync(process.execPath, [checker], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...childEnv,
      ...env,
      MOCHI_SOCIAL_SITE_PREVIEW_READY_SKIP_SELF_TEST_COMMANDS: "true",
      MOCHI_SOCIAL_CREDS_DIR: tempDir,
      MOCHI_SOCIAL_SITE_PREVIEW_READY_JSON: reportJsonPath(label),
      MOCHI_SOCIAL_SITE_PREVIEW_READY_MD: reportMdPath(label),
    },
  });
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

function assertNoLeak(label, text, value) {
  assert(!String(text || "").includes(value), `${label} leaked a private self-test value.`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
