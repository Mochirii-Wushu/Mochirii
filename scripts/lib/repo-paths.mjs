import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

export const repoRoot = process.cwd();

export function fromRoot(...parts) {
  return resolve(repoRoot, ...parts);
}

export function toRepoPath(file) {
  return relative(repoRoot, file).split(sep).join("/");
}

export function readText(path) {
  return readFileSync(fromRoot(path), "utf8");
}

export function collectRepoFiles(paths, options = {}) {
  const extensions = new Set(options.extensions || []);
  const ignoredSegments = new Set(options.ignoredSegments || ["node_modules", ".git"]);
  const files = [];

  for (const path of paths) {
    const fullPath = fromRoot(path);
    if (!existsSync(fullPath)) continue;
    collect(fullPath);
  }

  return files;

  function collect(fullPath) {
    const stats = statSync(fullPath);
    const repoPath = toRepoPath(fullPath);
    if ([...ignoredSegments].some((segment) => repoPath.split("/").includes(segment))) return;

    if (stats.isDirectory()) {
      for (const entry of readdirSync(fullPath)) collect(resolve(fullPath, entry));
      return;
    }

    if (!stats.isFile()) return;
    if (extensions.size && !extensions.has(fullPath.split(".").pop()?.toLowerCase())) return;
    files.push(repoPath);
  }
}
