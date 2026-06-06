import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const pairs = [
  ["assets", "apps/web/public/assets"],
  ["data", "apps/web/public/data"],
];

function listFiles(dir) {
  const files = [];

  function walk(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) files.push(path.relative(dir, full).split(path.sep).join("/"));
    }
  }

  walk(dir);
  return files.sort();
}

function digest(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

let failed = false;

for (const [sourceRel, targetRel] of pairs) {
  const sourceDir = path.join(root, sourceRel);
  const targetDir = path.join(root, targetRel);
  const sourceFiles = listFiles(sourceDir);
  const targetFiles = listFiles(targetDir);
  const allFiles = new Set([...sourceFiles, ...targetFiles]);

  for (const file of [...allFiles].sort()) {
    const sourceFile = path.join(sourceDir, file);
    const targetFile = path.join(targetDir, file);
    const inSource = sourceFiles.includes(file);
    const inTarget = targetFiles.includes(file);

    if (!inSource || !inTarget) {
      failed = true;
      console.error(`${targetRel} drift: ${file} is ${inSource ? "missing from target" : "extra in target"}`);
      continue;
    }

    const sourceStat = statSync(sourceFile);
    const targetStat = statSync(targetFile);
    if (sourceStat.size !== targetStat.size || digest(sourceFile) !== digest(targetFile)) {
      failed = true;
      console.error(`${targetRel} drift: ${file} differs from ${sourceRel}`);
    }
  }
}

if (failed) {
  console.error("Next public asset/data sync check failed. Run npm run sync:next-public.");
  process.exit(1);
}

console.log("Next public asset/data copies are in sync.");

