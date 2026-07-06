import { spawnSync } from "node:child_process";

export function runCheckSuite(checks) {
  let failed = false;

  for (const [label, command] of checks) {
    console.log(`\n== ${label} ==`);
    const result = spawnSync(command[0], command.slice(1), { stdio: "inherit" });
    if (result.status !== 0) failed = true;
  }

  return !failed;
}
