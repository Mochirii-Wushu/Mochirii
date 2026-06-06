import { cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const pairs = [
  ["assets", "apps/web/public/assets"],
  ["data", "apps/web/public/data"],
];

for (const [sourceRel, targetRel] of pairs) {
  const source = path.join(root, sourceRel);
  const target = path.join(root, targetRel);

  if (!target.startsWith(path.join(root, "apps/web/public"))) {
    throw new Error(`Refusing to sync outside apps/web/public: ${target}`);
  }

  rmSync(target, { recursive: true, force: true });
  mkdirSync(path.dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true, force: true });
  console.log(`Synced ${sourceRel} -> ${targetRel}`);
}

