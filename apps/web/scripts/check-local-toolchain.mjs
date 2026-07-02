import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const isWindows = process.platform === "win32";
const bin = (name) => join(root, "node_modules", ".bin", isWindows ? `${name}.cmd` : name);
const checks = [];

function command(label, command, args = []) {
  const commandLine = [command, ...args].map((part) => `"${String(part).replaceAll('"', '""')}"`).join(" ");
  const result = isWindows
    ? spawnSync(commandLine, { encoding: "utf8", shell: true })
    : spawnSync(command, args, { encoding: "utf8" });
  checks.push({
    label,
    ok: result.status === 0,
    output: `${result.stdout || ""}${result.stderr || ""}${result.error?.message || ""}`.trim(),
  });
}

const nodeVersion = process.versions.node;
checks.push({
  label: "Node.js",
  ok: nodeVersion.startsWith("22."),
  output: `${nodeVersion}${nodeVersion.startsWith("22.") ? "" : "\nRun `fnm use 22.23.1`."}`,
});

const npmVersion = process.env.npm_config_user_agent?.match(/npm\/([^\s]+)/)?.[1] || "";
checks.push({
  label: "npm",
  ok: /^10\./.test(npmVersion),
  output: npmVersion || "Unknown npm version. Run through `npm run toolchain:check`.",
});

const vercelBin = bin("vercel");
checks.push({ label: "local Vercel CLI", ok: existsSync(vercelBin), output: vercelBin });
if (existsSync(vercelBin)) command("Vercel CLI version", vercelBin, ["--version"]);

let failed = false;
for (const check of checks) {
  console.log(`${check.ok ? "OK" : "FAIL"} ${check.label}${check.output ? `: ${check.output}` : ""}`);
  if (!check.ok) failed = true;
}

if (failed) {
  console.error("\nNext app local toolchain check failed.");
  process.exit(1);
}

console.log("\nNext app local toolchain check OK.");
