import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const isWindows = process.platform === "win32";
const bin = (name, cwd = root) => join(cwd, "node_modules", ".bin", isWindows ? `${name}.cmd` : name);
const dockerBin = isWindows ? "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe" : "docker";
const docker = isWindows && existsSync(dockerBin) ? dockerBin : "docker";

const checks = [];

function command(label, command, args = [], options = {}) {
  const commandLine = [command, ...args].map((part) => `"${String(part).replaceAll('"', '""')}"`).join(" ");
  const result = isWindows
    ? spawnSync(commandLine, { encoding: "utf8", shell: true, ...options })
    : spawnSync(command, args, { encoding: "utf8", ...options });
  checks.push({
    label,
    ok: result.status === 0,
    output: `${result.stdout || ""}${result.stderr || ""}${result.error?.message || ""}`.trim(),
  });
}

function requireVersion(label, actual, ok, hint) {
  checks.push({ label, ok, output: `${actual}${ok ? "" : `\n${hint}`}` });
}

const nodeVersion = process.versions.node;
requireVersion("Node.js", nodeVersion, nodeVersion.startsWith("22."), "Run `fnm use 22.23.1` from the repo root.");

const npmVersion = process.env.npm_config_user_agent?.match(/npm\/([^\s]+)/)?.[1] || "";
checks.push({
  label: "npm",
  ok: /^10\./.test(npmVersion),
  output: npmVersion || "Unknown npm version. Run through `npm run toolchain:check`.",
});

for (const name of ["git", "gh", "deno", "magick", "fnm", "jq"]) {
  command(name, name, ["--version"]);
}

command("docker", docker, ["--version"]);
command("Docker daemon", docker, ["info", "--format", "{{.ServerVersion}}"]);

const supabaseBin = bin("supabase");
checks.push({ label: "local Supabase CLI", ok: existsSync(supabaseBin), output: supabaseBin });
if (existsSync(supabaseBin)) command("Supabase CLI version", supabaseBin, ["--version"]);

const lighthouseBin = bin("lighthouse");
checks.push({ label: "local Lighthouse CLI", ok: existsSync(lighthouseBin), output: lighthouseBin });
if (existsSync(lighthouseBin)) command("Lighthouse version", lighthouseBin, ["--version"]);

try {
  await import("playwright");
  checks.push({ label: "Playwright package", ok: true, output: "installed" });
} catch (error) {
  checks.push({ label: "Playwright package", ok: false, output: error.message });
}

const webRoot = join(root, "apps", "web");
const vercelBin = bin("vercel", webRoot);
checks.push({ label: "local Vercel CLI", ok: existsSync(vercelBin), output: vercelBin });
if (existsSync(vercelBin)) command("Vercel CLI version", vercelBin, ["--version"], { cwd: webRoot });

let failed = false;
for (const check of checks) {
  const icon = check.ok ? "OK" : "FAIL";
  console.log(`${icon} ${check.label}${check.output ? `: ${check.output}` : ""}`);
  if (!check.ok) failed = true;
}

if (failed) {
  console.error("\nLocal website toolchain check failed.");
  process.exit(1);
}

console.log("\nLocal website toolchain check OK.");
