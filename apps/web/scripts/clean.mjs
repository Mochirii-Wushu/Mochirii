import { rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const targets = [join(root, ".next"), join(root, ".vercel", "output")];

for (const target of targets) {
  const resolved = resolve(target);
  if (!resolved.startsWith(root)) {
    throw new Error(`Refusing to remove outside app root: ${resolved}`);
  }
  rmSync(resolved, { recursive: true, force: true });
  console.log(`Removed ${resolved}`);
}
