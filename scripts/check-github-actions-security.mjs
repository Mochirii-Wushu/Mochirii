import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const workflowsDir = resolve(".github", "workflows");
const workflowFiles = readdirSync(workflowsDir)
  .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  .sort();

const failures = [];
const fullSha = /^[0-9a-f]{40}$/;
const alwaysReportingWorkflows = new Map([
  ["validate-shopify-theme.yml", "validate-theme"],
  ["validate-social.yml", "validate-social"],
]);

function stepBlock(lines, usesIndex) {
  let end = lines.length;
  for (let index = usesIndex + 1; index < lines.length; index += 1) {
    if (/^      - /.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(usesIndex, end).join("\n");
}

for (const name of workflowFiles) {
  const file = `.github/workflows/${name}`;
  const text = readFileSync(resolve(workflowsDir, name), "utf8").replaceAll("\r\n", "\n");
  const lines = text.split("\n");

  if (!text.includes("permissions:\n  contents: read")) {
    failures.push(`${file}: workflow must declare top-level contents: read permissions.`);
  }

  const requiredContext = alwaysReportingWorkflows.get(name);
  if (requiredContext) {
    const triggerBlock = text.split(/^permissions:/m, 1)[0];
    if (/^\s+paths(?:-ignore)?:/m.test(triggerBlock)) {
      failures.push(`${file}: required checks must not use event-level path filters.`);
    }
    if (!new RegExp(`^  ${requiredContext}:\\n    name: ${requiredContext}$`, "m").test(text)) {
      failures.push(`${file}: must report the stable ${requiredContext} job name.`);
    }
    if (!/^\s+id:\s*changes\s*$/m.test(text) ||
        !text.includes("github.event.pull_request.base.sha || github.event.before") ||
        !text.includes("git diff --quiet") ||
        !text.includes("steps.changes.outputs.changed == 'true'")) {
      failures.push(`${file}: must detect owned-path changes inside an always-reporting job.`);
    }
  }

  lines.forEach((line, index) => {
    const match = line.match(/^\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/);
    if (!match || match[1].startsWith("./")) return;

    const [action, ref] = match[1].split("@");
    if (!action || !fullSha.test(ref || "")) {
      failures.push(`${file}:${index + 1}: external actions must use a full 40-character commit SHA.`);
      return;
    }

    const block = stepBlock(lines, index);
    if (action === "actions/checkout" && !/^\s+persist-credentials:\s*false\s*$/m.test(block)) {
      failures.push(`${file}:${index + 1}: checkout must disable persisted credentials.`);
    }
    if (action === "actions/setup-node" && !/^\s+node-version-file:\s*\.node-version\s*$/m.test(block)) {
      failures.push(`${file}:${index + 1}: setup-node must use the repository .node-version file.`);
    }
    if (action === "denoland/setup-deno" && !/^\s+deno-version:\s*2\.9\.2\s*$/m.test(block)) {
      failures.push(`${file}:${index + 1}: setup-deno must install exact Deno 2.9.2.`);
    }
  });
}

if (failures.length) {
  console.error("GitHub Actions security validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`GitHub Actions security validation OK (${workflowFiles.length} workflows).`);
