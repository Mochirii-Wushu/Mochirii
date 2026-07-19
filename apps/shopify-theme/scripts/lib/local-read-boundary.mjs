import { lstatSync, realpathSync } from "node:fs";
import path from "node:path";

const WINDOWS_RESERVED_NAME_PATTERN = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;
const WINDOWS_INVALID_CHARACTER_PATTERN = /[<>:"|?*\[\]\u0000-\u001f]/u;

function isInside(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export function resolveContainedRegularFile(root, relativePath) {
  if (typeof root !== "string" || typeof relativePath !== "string" ||
      relativePath.length === 0 || relativePath.includes("\\") ||
      path.posix.isAbsolute(relativePath) || path.posix.normalize(relativePath) !== relativePath ||
      relativePath.split("/").some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    return null;
  }
  try {
    const namedRoot = path.resolve(root);
    const rootStats = lstatSync(namedRoot);
    if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) return null;
    const realRoot = realpathSync(namedRoot);
    let cursor = realRoot;
    const segments = relativePath.split("/");
    for (const [index, segment] of segments.entries()) {
      cursor = path.join(cursor, segment);
      const stats = lstatSync(cursor);
      if (stats.isSymbolicLink()) return null;
      if (index < segments.length - 1 ? !stats.isDirectory() : !stats.isFile()) return null;
    }
    const real = realpathSync(cursor);
    return isInside(real, realRoot) ? real : null;
  } catch {
    return null;
  }
}

export function safePrivateOperationsPath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0 ||
      relativePath.includes("\\") || path.posix.isAbsolute(relativePath) ||
      path.posix.normalize(relativePath) !== relativePath ||
      !relativePath.startsWith(".artifacts/operations/")) return false;
  return relativePath.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== ".." &&
    segment.trim() === segment && !segment.endsWith(".") && !segment.endsWith(" ") &&
    !WINDOWS_INVALID_CHARACTER_PATTERN.test(segment) && !WINDOWS_RESERVED_NAME_PATTERN.test(segment));
}
