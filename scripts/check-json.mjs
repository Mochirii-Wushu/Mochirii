import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const jsonDirs = ["data", "assets/lottie"];
let checked = 0;
let failed = false;

for (const dir of jsonDirs) {
  const fullDir = path.join(root, dir);
  for (const entry of readdirSync(fullDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const file = path.join(fullDir, entry.name);
    checked += 1;
    try {
      JSON.parse(readFileSync(file, "utf8"));
    } catch (error) {
      failed = true;
      console.error(`${path.relative(root, file)}: ${error.message}`);
    }
  }
}

if (failed) {
  console.error("JSON validation failed.");
  process.exit(1);
}

console.log(`JSON OK (${checked} files).`);

