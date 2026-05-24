import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const selfTest = args.includes("--self-test");

function argValue(name) {
  const match = args.find((value) => value.startsWith(`${name}=`));
  return match ? match.split("=").slice(1).join("=") : "";
}

const outArg = argValue("--out") || process.env.DNS_CUTOVER_PRIVATE_PACKET_DIR || "";

const files = [
  {
    name: "README.md",
    content: () => `# Mochirii DNS Cutover Private Packet Workspace

This local folder is private operator working state. It is not approval, does not authorize DNS changes, and must remain outside the repository.

Use these draft files only as private handoff templates:

- \`draft-live-member-workflow-result-packet.md\`
- \`draft-live-member-cleanup-note.md\`
- \`draft-dns-cutover-approval-packet.md\`

Keep real dashboard values, private account labels, rollback contacts, screenshots, submission IDs, Storage paths, signed URLs, cookies, tokens, and credentials out of public docs, PRs, issues, and chat.

Recommended order:

1. Run \`npm run check:dns-cutover-workstation\`.
2. Run \`npm run check:dns-cutover-pr-readiness\`.
3. Complete D02 live OAuth/account QA.
4. If D03 is approved, fill the cleanup note before upload; otherwise record the D03 deferral owner.
5. Complete D03 upload/moderation QA only after explicit approval, or defer it with a rollback owner.
6. Fill the live-member result packet.
7. Validate it with \`npm run check:live-member-workflow-result-packet -- --packet=/absolute/private/path/draft-live-member-workflow-result-packet.md\`.
8. Fill the DNS cutover approval packet.
9. Validate it with \`npm run check:dns-cutover-approval-packet -- --packet=/absolute/private/path/draft-dns-cutover-approval-packet.md\`.
10. Run \`npm run check:dns-cutover-final-readiness -- --live-member-packet=/absolute/private/path/draft-live-member-workflow-result-packet.md --approval-packet=/absolute/private/path/draft-dns-cutover-approval-packet.md\`.

Passing local validators still does not perform or authorize cutover. A human GO decision is required before any provider dashboard or DNS change.
`,
  },
  {
    name: "draft-live-member-workflow-result-packet.md",
    source: "docs/live-member-workflow-result-packet.md",
  },
  {
    name: "draft-live-member-cleanup-note.md",
    source: "docs/live-member-cleanup-note.md",
  },
  {
    name: "draft-dns-cutover-approval-packet.md",
    source: "docs/dns-cutover-approval-packet.md",
  },
];

function fail(message) {
  throw new Error(message);
}

function insideRepo(absolutePath) {
  const relative = path.relative(root, absolutePath);
  return Boolean(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function validateOutputDirectory(value) {
  if (!value) fail("Provide --out=/absolute/private/directory or DNS_CUTOVER_PRIVATE_PACKET_DIR outside the repository.");
  if (!path.isAbsolute(value)) fail("Private packet workspace requires an absolute --out path outside the repository.");

  const absolute = path.resolve(value);
  if (insideRepo(absolute) || absolute === root) {
    fail("Private packet workspace must be outside the repository.");
  }

  return absolute;
}

function draftHeader(sourceLabel) {
  return `<!--
DRAFT PRIVATE PACKET
Source: ${sourceLabel}
This file is private operator working state, not cutover approval.
Keep completed packets outside the repository unless every sensitive value is redacted.
-->

`;
}

function plannedWrites(outDir) {
  return files.map((file) => ({
    name: file.name,
    target: path.join(outDir, file.name),
    body: file.source
      ? `${draftHeader(file.source)}${readFileSync(path.join(root, file.source), "utf8")}`
      : file.content(),
  }));
}

function prepareWorkspace(outDir) {
  const writes = plannedWrites(outDir);
  const existing = writes.filter((write) => existsSync(write.target)).map((write) => write.name);

  if (existing.length && !force) {
    fail(`Private packet workspace already has draft files: ${existing.join(", ")}. Use --force only after reviewing private notes.`);
  }

  if (dryRun) return writes;

  mkdirSync(outDir, { recursive: true, mode: 0o700 });
  writes.forEach((write) => writeFileSync(write.target, write.body, { encoding: "utf8", mode: 0o600 }));
  return writes;
}

function runSelfTest() {
  const temp = mkdtempSync(path.join(os.tmpdir(), "mochirii-private-packet-workspace-"));
  try {
    const writes = prepareWorkspace(temp);
    const missing = writes.filter((write) => !existsSync(write.target)).map((write) => write.name);
    if (missing.length) fail(`Self-test missing files: ${missing.join(", ")}`);

    let refusedOverwrite = false;
    try {
      prepareWorkspace(temp);
    } catch {
      refusedOverwrite = true;
    }
    if (!refusedOverwrite) fail("Self-test expected overwrite refusal.");

    let refusedRepoPath = false;
    try {
      validateOutputDirectory(path.join(root, "private-packet-self-test"));
    } catch {
      refusedRepoPath = true;
    }
    if (!refusedRepoPath) fail("Self-test expected repo-local output refusal.");

    console.log("Private packet workspace preparation self-test OK (paths redacted).");
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

try {
  if (selfTest) {
    runSelfTest();
    process.exit(0);
  }

  const outDir = validateOutputDirectory(outArg);
  const writes = prepareWorkspace(outDir);

  console.log("Private packet workspace preparation OK (paths redacted).");
  console.log(dryRun ? "Mode: dry run; no files written." : "Mode: files written outside the repository.");
  writes.forEach((write) => console.log(`- ${write.name}`));
  console.log("Keep completed packet details private and untracked.");
} catch (error) {
  console.error(`Private packet workspace preparation failed: ${error?.message || error}`);
  console.error("No absolute paths, secrets, account names, or packet values were printed.");
  process.exit(1);
}
