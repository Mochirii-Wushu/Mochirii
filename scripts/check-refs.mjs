import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoreDirs = new Set([".git", "node_modules", "assets"]);
const sourceExt = new Set([".html", ".css", ".js", ".json"]);
const refs = [];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (sourceExt.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function cleanRef(ref) {
  return String(ref || "")
    .trim()
    .replace(/^url\(/, "")
    .replace(/^["'`]+|["'`)>,;]+$/g, "")
    .split(/[?#]/)[0];
}

function addRef(file, lineNumber, raw) {
  const ref = cleanRef(raw);
  if (!ref || ref === "." || ref === "..") return;
  if (/^(https?:)?\/\//i.test(ref)) return;
  if (/^(mailto|tel):/i.test(ref)) return;
  if (ref.startsWith("#")) return;
  if (ref.startsWith("./assets/") || ref.startsWith("assets/") || ref.startsWith("./data/") || ref.startsWith("data/")) {
    refs.push({ file, lineNumber, ref: ref.replace(/^\.\//, "") });
  }
}

const attrPattern = /\b(?:src|href|poster|content)=["']([^"']+)["']/gi;
const localStringPattern = /["'`]((?:\.\/)?(?:assets|data)\/[^"'`()\s<>]+)["'`]/g;
const cssUrlPattern = /url\(([^)]+)\)/gi;

for (const file of walk(root)) {
  const relFile = path.relative(root, file).split(path.sep).join("/");
  const lines = readFileSync(file, "utf8").split(/\n/);
  lines.forEach((line, index) => {
    for (const pattern of [attrPattern, localStringPattern, cssUrlPattern]) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line))) addRef(relFile, index + 1, match[1]);
    }
  });
}

const missing = [];
const seen = new Set();

for (const item of refs) {
  const key = `${item.file}:${item.lineNumber}:${item.ref}`;
  if (seen.has(key)) continue;
  seen.add(key);
  if (!existsSync(path.join(root, item.ref))) missing.push(item);
}

if (missing.length) {
  console.error(`Missing local references: ${missing.length}`);
  for (const item of missing) console.error(`${item.file}:${item.lineNumber} -> ${item.ref}`);
  process.exit(1);
}

console.log(`Local references OK (${seen.size} refs checked).`);

