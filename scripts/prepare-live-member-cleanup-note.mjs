import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const selfTest = args.includes("--self-test");
const templatePath = path.join(root, "docs/live-member-cleanup-note.md");

function argValue(name) {
  const match = args.find((value) => value.startsWith(`${name}=`));
  return match ? match.split("=").slice(1).join("=") : "";
}

const outArg = argValue("--out") || process.env.LIVE_MEMBER_CLEANUP_NOTE_PATH || "";

function fail(message) {
  throw new Error(message);
}

function insideRepo(absolutePath) {
  const relative = path.relative(root, absolutePath);
  return Boolean(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function validateTarget(value) {
  if (!value) fail("Provide --out=/absolute/private/live-member-cleanup-note.md or LIVE_MEMBER_CLEANUP_NOTE_PATH.");
  if (!path.isAbsolute(value)) fail("Live-member cleanup note path must be absolute and outside the repository.");

  const absolute = path.resolve(value);
  if (insideRepo(absolute) || absolute === root) fail("Live-member cleanup note must stay outside the repository.");
  if (path.extname(absolute).toLowerCase() !== ".md") fail("Live-member cleanup note helper writes Markdown files; use a .md target.");
  if (existsSync(absolute) && !force) fail("Live-member cleanup note target already exists. Use --force only after reviewing private cleanup state.");

  return absolute;
}

function noteTemplate() {
  return readFileSync(templatePath, "utf8");
}

function prepare(target) {
  if (dryRun) return noteTemplate();

  mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  const body = noteTemplate();
  writeFileSync(target, body, { encoding: "utf8", mode: 0o600 });
  return body;
}

function runSelfTest() {
  const temp = mkdtempSync(path.join(os.tmpdir(), "mochirii-live-member-cleanup-note-"));
  try {
    const target = path.join(temp, "live-member-cleanup-note.md");
    prepare(target);

    const stats = statSync(target);
    if (!stats.isFile()) fail("Self-test expected a cleanup note file.");

    const text = readFileSync(target, "utf8");
    for (const expected of [
      "## D03 Artifact Identifiers",
      "## Cleanup Action",
      "## Public Status To Copy Elsewhere",
      "does not authorize DNS cutover",
    ]) {
      if (!text.includes(expected)) fail(`Self-test expected cleanup note section: ${expected}`);
    }

    let refusedOverwrite = false;
    try {
      validateTarget(target);
    } catch {
      refusedOverwrite = true;
    }
    if (!refusedOverwrite) fail("Self-test expected overwrite refusal.");

    let refusedRepoPath = false;
    try {
      validateTarget(path.join(root, "live-member-cleanup-note.md"));
    } catch {
      refusedRepoPath = true;
    }
    if (!refusedRepoPath) fail("Self-test expected repo-local output refusal.");

    console.log("Live member cleanup note preparation self-test OK (paths and values redacted).");
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

try {
  if (selfTest) {
    runSelfTest();
    process.exit(0);
  }

  const target = validateTarget(outArg);
  const body = prepare(target);

  console.log("Live member cleanup note preparation OK (path redacted).");
  console.log(dryRun ? "Mode: dry run; no cleanup note written." : "Mode: cleanup note written outside the repository.");
  console.log(`Template size: ${Buffer.byteLength(body, "utf8")} bytes.`);
  console.log("Record submission IDs and Storage paths only in the private note. This helper does not authorize upload, moderation, cleanup deferral, or cutover.");
} catch (error) {
  console.error(`Live member cleanup note preparation failed: ${error?.message || error}`);
  console.error("No absolute paths, credentials, account names, submission IDs, Storage paths, or cleanup values were printed.");
  process.exit(1);
}
