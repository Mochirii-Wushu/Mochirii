import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const testDirectory = resolve(root, "supabase/tests");
const tests = readdirSync(testDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith("_test.sql"))
  .map((entry) => `supabase/tests/${entry.name}`)
  .sort();

if (tests.length === 0) {
  throw new Error("No top-level Supabase pgTAP test files were found.");
}

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  throw new Error("npm_execpath is required for the Supabase pgTAP suite.");
}

const result = spawnSync(
  process.execPath,
  [npmCli, "exec", "--", "supabase", "test", "db", "--local", ...tests],
  { cwd: root, stdio: "inherit" },
);

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

console.log(`Supabase pgTAP suite OK (${tests.length} files).`);
