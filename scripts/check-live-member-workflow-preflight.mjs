import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const localEnvFile = ".env.live-member-qa";
const templateFile = "reports/live-member-qa-local-template.md";
const strictMode = process.argv.includes("--strict") || process.env.QA_LIVE_MEMBER_WORKFLOW_STRICT === "1";
const requireMutationApproval =
  process.argv.includes("--require-mutation-approval") ||
  process.env.QA_LIVE_MEMBER_REQUIRE_MUTATION_APPROVAL === "1";

const requiredVars = [
  "QA_TEST_MEMBER_EMAIL_OR_LABEL",
  "QA_TEST_UNVERIFIED_DISCORD_LABEL",
  "QA_TEST_VERIFIED_MEMBER_LABEL",
  "QA_TEST_MODERATOR_LABEL",
  "QA_TEST_IMAGE_PATH_LOCAL",
  "QA_TEST_TITLE_PREFIX",
  "QA_TEST_CAPTION_MARKER",
  "QA_ALLOW_LIVE_MUTATION",
];

const forbiddenTrackedPatterns = [
  /^\.env\.live-member-qa(?:$|\.)/,
  /^live-member-qa\.env$/,
  /^\.auth\//,
  /^playwright\/\.auth\//,
  /(?:^|\/)(?:auth-state|storage-state|cookies)\.json$/,
];

const failures = [];
const warnings = [];
const notes = [];

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function addFailure(message) {
  failures.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function addNote(message) {
  notes.push(message);
}

function fileText(file) {
  return readFileSync(path.join(root, file), "utf8");
}

function gitCheckIgnore(file) {
  const result = spawnSync("git", ["check-ignore", "-q", file], { cwd: root });
  return result.status === 0;
}

function listTrackedFiles() {
  const output = git(["ls-files"]);
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

function parseEnvText(text) {
  const values = new Map();

  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const match = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) return;

    const key = match[1];
    const rawValue = match[2].trim().replace(/^["']|["']$/g, "");
    values.set(key, rawValue);
  });

  return values;
}

function boolValue(value) {
  return String(value || "").trim().toLowerCase() === "true";
}

function checkIgnoredLocalFile() {
  if (gitCheckIgnore(localEnvFile)) {
    addNote(`${localEnvFile} is ignored by Git.`);
  } else {
    addFailure(`${localEnvFile} is not ignored; update .gitignore before storing local QA values.`);
  }
}

function checkNoTrackedCredentialFiles() {
  const trackedFiles = listTrackedFiles();
  const matches = trackedFiles.filter((file) => forbiddenTrackedPatterns.some((pattern) => pattern.test(file)));

  if (matches.length) {
    matches.forEach((file) => addFailure(`${file} is tracked but should remain local-only credential state.`));
    return;
  }

  addNote("No live member QA credential files are tracked.");
}

function checkTemplate() {
  if (!existsSync(path.join(root, templateFile))) {
    addFailure(`${templateFile} is missing; local QA variable names are no longer documented.`);
    return;
  }

  const text = fileText(templateFile);
  const missingVars = requiredVars.filter((key) => !text.includes(key));

  if (missingVars.length) {
    addFailure(`${templateFile} is missing required variable names: ${missingVars.join(", ")}.`);
  } else {
    addNote(`${templateFile} documents all required local QA variable names.`);
  }

  if (!/QA_ALLOW_LIVE_MUTATION\s*=\s*false/.test(text)) {
    addFailure(`${templateFile} must show QA_ALLOW_LIVE_MUTATION=false as the default.`);
  } else {
    addNote("QA_ALLOW_LIVE_MUTATION defaults to false in the committed template.");
  }
}

function checkLocalReadiness() {
  const absolute = path.join(root, localEnvFile);

  if (!existsSync(absolute)) {
    addNote(`${localEnvFile} not found; live member workflow QA is not configured.`);
    if (strictMode) addFailure(`strict mode requires local ${localEnvFile}.`);
    return;
  }

  const values = parseEnvText(readFileSync(absolute, "utf8"));
  const missingKeys = requiredVars.filter((key) => !values.has(key));
  const emptyKeys = requiredVars.filter((key) => values.has(key) && !String(values.get(key) || "").trim());
  const configuredCount = requiredVars.length - missingKeys.length - emptyKeys.length;

  addNote(`${localEnvFile} found locally; ${configuredCount}/${requiredVars.length} required fields are configured.`);

  if (missingKeys.length) {
    const message = `${localEnvFile} is missing required keys: ${missingKeys.join(", ")}.`;
    strictMode ? addFailure(message) : addWarning(message);
  }

  if (emptyKeys.length) {
    const message = `${localEnvFile} has empty required keys: ${emptyKeys.join(", ")}.`;
    strictMode ? addFailure(message) : addWarning(message);
  }

  const mutationValue = values.get("QA_ALLOW_LIVE_MUTATION");
  const mutationEnabled = boolValue(mutationValue);

  if (mutationEnabled) {
    addWarning("Local mutation flag is true. This does not authorize D03 by itself; explicit human approval is still required.");
  }

  if (requireMutationApproval && !mutationEnabled) {
    addFailure("mutation-approval mode requires QA_ALLOW_LIVE_MUTATION=true in the local ignored QA file.");
  }
}

checkIgnoredLocalFile();
checkNoTrackedCredentialFiles();
checkTemplate();
checkLocalReadiness();

console.log("Live member workflow preflight:");
notes.forEach((note) => console.log(`- ${note}`));
warnings.forEach((warning) => console.warn(`WARN ${warning}`));

if (failures.length) {
  console.error("Live member workflow preflight failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error("No secret values were printed. Keep credentials local and ignored.");
  process.exit(1);
}

const modeLabel = strictMode ? "strict" : "normal";
console.log(`Live member workflow preflight OK (${modeLabel} mode).`);
