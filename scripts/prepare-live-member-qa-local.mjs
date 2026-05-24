import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const localEnvFile = ".env.live-member-qa";
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const selfTest = args.includes("--self-test");

const template = `# Local-only live member workflow QA readiness values.
# Keep this file ignored. Never commit it.
# Store real credentials in the operator password manager, not here.

QA_TEST_MEMBER_EMAIL_OR_LABEL=qa-member
QA_TEST_UNVERIFIED_DISCORD_LABEL=qa-unverified-discord
QA_TEST_VERIFIED_MEMBER_LABEL=qa-active-member
QA_TEST_MODERATOR_LABEL=qa-moderator
QA_TEST_IMAGE_PATH_LOCAL=
QA_TEST_TITLE_PREFIX=Mochirii QA Test
QA_TEST_CAPTION_MARKER=Mochirii QA Test disposable upload
QA_ALLOW_LIVE_MUTATION=false
`;

function fail(message) {
  throw new Error(message);
}

function git(args, cwd = root) {
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });
}

function ensureIgnored(cwd = root) {
  const result = git(["check-ignore", "-q", localEnvFile], cwd);
  if (result.status !== 0) fail(`${localEnvFile} is not ignored by Git.`);
}

function ensureUntracked(cwd = root) {
  const result = git(["ls-files", "--error-unmatch", localEnvFile], cwd);
  if (result.status === 0) fail(`${localEnvFile} is tracked in Git.`);
}

function prepare(cwd = root) {
  ensureIgnored(cwd);
  ensureUntracked(cwd);

  const target = path.join(cwd, localEnvFile);
  if (existsSync(target) && !force) {
    fail(`${localEnvFile} already exists. Use --force only after reviewing local-only QA values.`);
  }

  if (!dryRun) writeFileSync(target, template, { encoding: "utf8", mode: 0o600 });
}

function runSelfTest() {
  const temp = mkdtempSync(path.join(os.tmpdir(), "mochirii-live-member-qa-local-"));
  try {
    const gitInit = git(["init", "-q"], temp);
    if (gitInit.status !== 0) fail("Self-test could not initialize temporary git repository.");

    writeFileSync(path.join(temp, ".gitignore"), ".env.*\n", "utf8");
    prepare(temp);

    const text = readFileSync(path.join(temp, localEnvFile), "utf8");
    if (!/QA_ALLOW_LIVE_MUTATION=false/.test(text)) fail("Self-test expected mutation to default false.");
    if (!/QA_TEST_MEMBER_EMAIL_OR_LABEL=qa-member/.test(text)) fail("Self-test expected safe label placeholders.");

    let refusedOverwrite = false;
    try {
      prepare(temp);
    } catch {
      refusedOverwrite = true;
    }
    if (!refusedOverwrite) fail("Self-test expected overwrite refusal.");

    console.log("Live member QA local preparation self-test OK (values redacted).");
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

try {
  if (selfTest) {
    runSelfTest();
    process.exit(0);
  }

  prepare();

  console.log("Live member QA local preparation OK (values redacted).");
  console.log(dryRun ? "Mode: dry run; no local QA file written." : `Mode: ${localEnvFile} written as ignored local-only state.`);
  console.log("Review placeholders locally before strict D02/D03 preflight. Real credentials must stay in the operator password manager.");
} catch (error) {
  console.error(`Live member QA local preparation failed: ${error?.message || error}`);
  console.error("No file contents, secrets, account names, or local paths were printed.");
  process.exit(1);
}
