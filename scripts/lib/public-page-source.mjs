import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function readPublicPageExport(root, exportName, failures = []) {
  const barrelFile = "apps/web/components/public-pages/pages.tsx";
  const barrelPath = resolve(root, barrelFile);
  const barrelSource = readSource(barrelPath, barrelFile, failures);
  const direct = extractExportedFunction(barrelSource, exportName);
  if (direct) return { file: barrelFile, text: direct };

  const exportPattern = new RegExp(
    `export\\s*\\{\\s*${escapeRegExp(exportName)}\\s*\\}\\s*from\\s*["']([^"']+)["'];?`,
  );
  const exportMatch = barrelSource.match(exportPattern);
  if (!exportMatch) {
    failures.push(`${barrelFile}: expected exported function or re-export ${exportName}.`);
    return { file: barrelFile, text: "" };
  }

  const moduleFile = normalizeModuleFile(root, dirname(barrelPath), exportMatch[1]);
  const moduleSource = readSource(resolve(root, moduleFile), moduleFile, failures);
  const moduleFunction = extractExportedFunction(moduleSource, exportName);
  if (!moduleFunction) {
    failures.push(`${moduleFile}: expected exported function ${exportName}.`);
    return { file: moduleFile, text: "" };
  }

  return { file: moduleFile, text: moduleFunction };
}

export function extractExportedFunction(source, functionName) {
  const start = String(source || "").indexOf(`export function ${functionName}`);
  if (start < 0) return "";
  const bodyStart = source.indexOf("{", start);
  if (bodyStart < 0) return "";
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return "";
}

function readSource(fullPath, label, failures) {
  if (!existsSync(fullPath)) {
    failures.push(`${label}: missing required public page source file.`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function normalizeModuleFile(root, barrelDir, moduleSpecifier) {
  const fullPath = resolve(barrelDir, moduleSpecifier.endsWith(".tsx") ? moduleSpecifier : `${moduleSpecifier}.tsx`);
  return fullPath.replace(resolve(root), "").replace(/^[/\\]/, "").replace(/\\/g, "/");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
