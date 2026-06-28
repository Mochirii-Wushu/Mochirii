import { spawnSync } from "node:child_process";

const steps = [
  ["root toolchain", "npm", ["run", "toolchain:check"]],
  ["root checks", "npm", ["run", "check"]],
  ["root whitespace", "git", ["diff", "--check"]],
  ["Next toolchain", "npm", ["--prefix", "apps/web", "run", "toolchain:check"]],
  ["Next lint", "npm", ["--prefix", "apps/web", "run", "lint"]],
  ["Next build", "npm", ["--prefix", "apps/web", "run", "build"]],
];

for (const [label, command, args] of steps) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    console.error(`\n${label} failed.`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nWebsite local verification OK.");
