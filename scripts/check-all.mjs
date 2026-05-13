import { spawnSync } from "node:child_process";

const checks = [
  ["check:js", ["node", "scripts/check-js.mjs"]],
  ["check:json", ["node", "scripts/check-json.mjs"]],
  ["check:gallery-timestamps", ["node", "scripts/check-gallery-timestamps.mjs"]],
  ["check:refs", ["node", "scripts/check-refs.mjs"]],
  ["check:assets", ["node", "scripts/check-assets.mjs"]],
];

let failed = false;

for (const [label, command] of checks) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(command[0], command.slice(1), { stdio: "inherit" });
  if (result.status !== 0) failed = true;
}

if (failed) {
  console.error("\nValidation failed.");
  process.exit(1);
}

console.log("\nAll validation checks completed.");
