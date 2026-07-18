import { readdirSync } from "node:fs";
import path from "node:path";
import { readJsonFile } from "./lib/json.mjs";
import { fromRoot, toRepoPath } from "./lib/repo-paths.mjs";

const jsonDirs = ["apps/web/public/data", "apps/web/public/assets/lottie"];
let checked = 0;
let failed = false;

for (const dir of jsonDirs) {
  const fullDir = fromRoot(dir);
  for (const entry of readdirSync(fullDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const file = path.join(fullDir, entry.name);
    const repoPath = toRepoPath(file);
    checked += 1;
    try {
      readJsonFile(repoPath);
    } catch (error) {
      failed = true;
      console.error(error.message);
    }
  }
}

if (failed) {
  console.error("JSON validation failed.");
  process.exit(1);
}

console.log(`JSON OK (${checked} files).`);
