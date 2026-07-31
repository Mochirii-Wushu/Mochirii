import {
  closeSync,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readdirSync,
  readSync,
} from "node:fs";
import { extname, join, relative } from "node:path";
import process from "node:process";
import * as acorn from "acorn";
import "./check-public-css-semantics.mjs";

const publicDir = join(process.cwd(), "public");
const publicJsDir = join(publicDir, "js");
const maximumJavaScriptBytes = 16 * 1024 * 1024;
const maximumTreeEntries = 25_000;
const maximumTreeDepth = 64;
const maximumJavaScriptFiles = 4_096;
const decoder = new TextDecoder("utf-8", { fatal: true });
const failures = [];

function displayPath(file) {
  return relative(process.cwd(), file).replaceAll("\\", "/");
}

function collectJavaScriptFiles(directory, { recursive, state, depth = 0 }) {
  if (depth > maximumTreeDepth) throw new Error(`${displayPath(directory)} exceeds the ${maximumTreeDepth}-level tree-depth bound`);
  if (!existsSync(directory)) throw new Error(`${displayPath(directory)} does not exist`);
  if (lstatSync(directory).isSymbolicLink()) {
    throw new Error(`${displayPath(directory)} is a symbolic link`);
  }

  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    state.entries += 1;
    if (state.entries > maximumTreeEntries) throw new Error(`public JavaScript trees exceed the ${maximumTreeEntries}-entry traversal bound`);
    const fullPath = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`${displayPath(fullPath)} is a symbolic link`);
    if (entry.isDirectory()) {
      if (recursive) found.push(...collectJavaScriptFiles(fullPath, { recursive: true, state, depth: depth + 1 }));
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === ".js") {
      found.push(fullPath);
    } else if (!entry.isFile() && !entry.isDirectory()) {
      throw new Error(`${displayPath(fullPath)} is not a regular file or directory`);
    }
  }
  return found;
}

function readBoundedUtf8(file) {
  const handle = openSync(file, "r");
  try {
    const before = fstatSync(handle);
    if (!before.isFile()) throw new Error("not a regular file");
    if (before.size === 0 || before.size > maximumJavaScriptBytes) {
      throw new Error(`file length ${before.size} is outside the ${maximumJavaScriptBytes}-byte bound`);
    }

    const buffer = Buffer.allocUnsafe(before.size);
    let offset = 0;
    while (offset < buffer.length) {
      const count = readSync(handle, buffer, offset, buffer.length - offset, offset);
      if (count === 0) throw new Error("file ended during bounded read");
      offset += count;
    }

    const after = fstatSync(handle);
    if (after.size !== before.size || after.mtimeMs !== before.mtimeMs) {
      throw new Error("file changed during validation");
    }
    return decoder.decode(buffer);
  } finally {
    closeSync(handle);
  }
}

let files = [];
try {
  const traversalState = { entries: 0 };
  files = [
    ...collectJavaScriptFiles(publicJsDir, { recursive: true, state: traversalState }),
    ...collectJavaScriptFiles(publicDir, { recursive: false, state: traversalState }),
  ].sort((left, right) => left.localeCompare(right));
  if (files.length === 0) throw new Error("no generated public JavaScript files were found");
  if (files.length > maximumJavaScriptFiles) throw new Error(`public JavaScript trees exceed the ${maximumJavaScriptFiles}-file parse bound`);
} catch (error) {
  failures.push({ file: "public", message: error instanceof Error ? error.message : String(error) });
}

for (const filePath of files) {
  let source;
  try {
    source = readBoundedUtf8(filePath);
    acorn.parse(source, {
      allowHashBang: true,
      ecmaVersion: "latest",
      sourceType: "script",
    });
  } catch (error) {
    const position = Number.isInteger(error?.pos) ? error.pos : 0;
    const start = Math.max(0, position - 80);
    const end = Math.min(source?.length ?? 0, position + 80);
    failures.push({
      file: displayPath(filePath),
      message: error instanceof Error ? error.message : String(error),
      line: error?.loc?.line,
      column: error?.loc?.column,
      context: source?.slice(start, end),
    });
  }
}

if (failures.length > 0) {
  console.error("Generated public JS syntax check failed:");
  for (const failure of failures) {
    const location = failure.line == null ? "" : `:${failure.line}:${failure.column}`;
    console.error(`- ${failure.file}${location} ${failure.message}`);
    if (failure.context) console.error(`  ${failure.context}`);
  }
  process.exit(1);
}

console.log(`Generated public JS syntax check passed (${files.length} files, including public root workers/embeds).`);
