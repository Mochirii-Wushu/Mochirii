import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const tempDir = mkdtempSync(join(tmpdir(), "mochirii-mochi-social-preview-url-"));
const previewUrlFile = join(tempDir, "mochi-social-alpha-vercel-preview.local.txt");
const reportPath = join(tempDir, "mochi-social-preview-ready.json");
const markdownPath = join(tempDir, "mochi-social-preview-ready.md");
const fakeToken = ["ghp", "previewurlselftest123456789012345678"].join("_");
const gameUrl = "https://mochi-social-game.example.test";
const siteUrl = "https://mochirii-preview.example.test";

try {
  writePreviewUrlFile();
  assertOperatorChecklistReadsPreviewUrls();
  assertPreviewReadyReadsPreviewUrls();
  console.log("Mochi Social preview URL self-test OK.");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

function assertOperatorChecklistReadsPreviewUrls() {
  const result = spawnSync(process.execPath, ["scripts/prepare-mochi-social-alpha-operator-checklist.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      MOCHI_SOCIAL_CREDS_DIR: tempDir,
    },
  });
  assert(result.status === 0, `operator checklist command failed: ${result.stderr || result.stdout}`);
  const checklist = readFileSync(join(tempDir, "mochirii-mochi-social-alpha-operator-next-steps.md"), "utf8");
  assert(checklist.includes("Local no-secret preview URL file"), "operator checklist should include local preview URL section.");
  assert(checklist.includes(gameUrl), "operator checklist should include the sanitized game URL.");
  assert(checklist.includes(siteUrl), "operator checklist should include the sanitized site preview URL.");
  assertNoLeak("operator checklist", checklist);
}

function assertPreviewReadyReadsPreviewUrls() {
  const result = spawnSync(process.execPath, ["scripts/check-mochi-social-preview-ready.mjs"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      MOCHI_SOCIAL_CREDS_DIR: tempDir,
      MOCHI_SOCIAL_SITE_PREVIEW_READY_SKIP_SELF_TEST_COMMANDS: "true",
      MOCHI_SOCIAL_SITE_PREVIEW_READY_JSON: reportPath,
      MOCHI_SOCIAL_SITE_PREVIEW_READY_MD: markdownPath,
      MOCHI_SOCIAL_GAME_REPO_PATH: join(tempDir, "missing-game-repo"),
    },
  });
  assert(result.status !== 0, "Preview Ready should stay red while branch/hosted/manual gates are unproven.");
  assert(existsSync(reportPath), "Preview Ready JSON report was not written.");
  assert(existsSync(markdownPath), "Preview Ready markdown report was not written.");

  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const markdown = readFileSync(markdownPath, "utf8");
  assert(report.gameUrl === gameUrl, "Preview Ready should use the game URL from the local URL file.");
  assert(report.siteOrigin === siteUrl, "Preview Ready should use the site URL from the local URL file.");
  assert(report.previewEnv?.present === true, "Preview Ready should record the local URL file as present.");
  assert(report.previewEnv?.gameUrl === gameUrl, "Preview Ready should record the sanitized game URL.");
  assert(report.previewEnv?.sitePreviewUrl === siteUrl, "Preview Ready should record the sanitized site URL.");
  assert(markdown.includes("## Local Preview URL File"), "Preview Ready markdown should include local preview URL section.");
  assert(markdown.includes(gameUrl), "Preview Ready markdown should include the sanitized game URL.");
  assert(markdown.includes(siteUrl), "Preview Ready markdown should include the sanitized site preview URL.");
  assertNoLeak("Preview Ready output", `${result.stdout || ""}${result.stderr || ""}`);
  assertNoLeak("Preview Ready JSON", JSON.stringify(report));
  assertNoLeak("Preview Ready markdown", markdown);
}

function writePreviewUrlFile() {
  writeFileSync(previewUrlFile, [
    "# self-test URL file",
    `MOCHI_SOCIAL_GAME_URL=${gameUrl}`,
    `MOCHI_SOCIAL_SITE_PREVIEW_URL=${siteUrl}`,
    `IGNORED_FAKE_TOKEN=${fakeToken}`,
    "",
  ].join("\n"), "utf8");
}

function assertNoLeak(label, text) {
  assert(!String(text || "").includes(fakeToken), `${label} leaked non-URL file content.`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
