import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has("--write");

const reportMarkdownPath = path.join(root, "reports/rollback-surface-drift-audit.md");
const reportJsonPath = path.join(root, "reports/rollback-surface-drift-audit.json");

const legacyPages = [
  { html: "index.html", script: "home.js", redirect: ["/index.html", "/"], data: "home.json" },
  { html: "join.html", script: "join.js", redirect: ["/join.html", "/join"], data: "join.json" },
  { html: "gallery.html", script: "gallery.js", redirect: ["/gallery.html", "/gallery"], data: "gallery.json" },
  { html: "leaders.html", script: "leaders.js", redirect: ["/leaders.html", "/leaders"], data: "leaders.json" },
  { html: "ranks.html", script: "ranks.js", redirect: ["/ranks.html", "/ranks"], data: "ranks.json" },
  { html: "codex.html", script: "codex.js", redirect: ["/codex.html", "/codex"], data: "codex.json" },
  { html: "events.html", script: "events.js", redirect: ["/events.html", "/events"], data: "events.json" },
  { html: "announcements.html", script: "announcements.js", redirect: ["/announcements.html", "/announcements"], data: "announcements.json" },
  { html: "raffles.html", script: "raffles.js", redirect: ["/raffles.html", "/raffles"], data: "raffles.json" },
  { html: "recruitment.html", script: "recruitment.js", redirect: ["/recruitment.html", "/recruitment"], data: "recruitment.json" },
  { html: "auth.html", script: "auth.js", redirect: ["/auth.html", "/auth"] },
  { html: "account.html", script: "account.js", redirect: ["/account.html", "/account"] },
  { html: "gallery-submit.html", script: "gallery-submit.js", redirect: ["/gallery-submit.html", "/gallery-submit"] },
  { html: "spotify.html", script: "spotify.js", redirect: ["/spotify.html", "/spotify"], data: "spotify.json" },
  { html: "spotlight.html", script: "spotlight.js", redirect: ["/spotlight.html", "/spotlight"], data: "spotlight.json" },
  { html: "twills.html", script: "twills.js", redirect: ["/twills.html", "/twills"], data: "twills.json" },
  { html: "leader-dashboard.html", script: "leader-dashboard.js", redirect: ["/leader-dashboard.html", "/leader-dashboard"] },
];

const sharedRollbackFiles = [
  "CNAME",
  "styles.css",
  "site.js",
  "utils.js",
  "supabase.js",
  "header.html",
  "footer.html",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
  ".well-known/security.txt",
];

const docs = [
  "README.md",
  "apps/web/README.md",
  "docs/deployment.md",
  "docs/current-live-state.md",
  "docs/dns-cutover-readiness-and-rollback.md",
];

const checks = [];

function relPath(...parts) {
  return path.join(root, ...parts);
}

function read(rel) {
  return readFileSync(relPath(...rel.split("/")), "utf8");
}

function digest(rel) {
  return createHash("sha256").update(readFileSync(relPath(...rel.split("/")))).digest("hex");
}

function listFiles(relDir) {
  const dir = relPath(...relDir.split("/"));
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

function addCheck(area, name, status, detail, evidence = {}) {
  checks.push({ area, name, status, detail, evidence });
}

function pass(area, name, detail, evidence) {
  addCheck(area, name, "pass", detail, evidence);
}

function fail(area, name, detail, evidence) {
  addCheck(area, name, "fail", detail, evidence);
}

function fileExists(rel) {
  return existsSync(relPath(...rel.split("/")));
}

function assertFile(area, rel) {
  if (fileExists(rel)) pass(area, rel, "present");
  else fail(area, rel, "missing");
}

function assertIncludes(area, rel, snippet, detail = `${rel} includes ${snippet}`) {
  if (!fileExists(rel)) {
    fail(area, rel, "missing", { expectedSnippet: snippet });
    return;
  }

  const text = read(rel);
  if (text.includes(snippet)) pass(area, rel, detail, { snippet });
  else fail(area, rel, `${detail} is missing`, { expectedSnippet: snippet });
}

function compareMirroredTrees(sourceRel, targetRel) {
  const sourceFiles = listFiles(sourceRel);
  const targetFiles = listFiles(targetRel);
  const allFiles = new Set([...sourceFiles, ...targetFiles]);
  const drift = [];

  for (const file of [...allFiles].sort()) {
    const sourceFile = `${sourceRel}/${file}`;
    const targetFile = `${targetRel}/${file}`;
    const inSource = sourceFiles.includes(file);
    const inTarget = targetFiles.includes(file);

    if (!inSource || !inTarget) {
      drift.push(`${file}: ${inSource ? "missing from target" : "extra in target"}`);
      continue;
    }

    const sourceStat = statSync(relPath(...sourceFile.split("/")));
    const targetStat = statSync(relPath(...targetFile.split("/")));
    if (sourceStat.size !== targetStat.size || digest(sourceFile) !== digest(targetFile)) {
      drift.push(`${file}: content differs`);
    }
  }

  if (drift.length) {
    fail("public sync", `${sourceRel} -> ${targetRel}`, `${drift.length} mirrored files drifted`, {
      drift: drift.slice(0, 25),
      truncated: drift.length > 25,
    });
  } else {
    pass("public sync", `${sourceRel} -> ${targetRel}`, `${sourceFiles.length} files match`);
  }
}

function nextRedirectPresent(source, destination, nextConfig) {
  const escapedSource = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedDestination = destination.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\[\\s*["']${escapedSource}["']\\s*,\\s*["']${escapedDestination}["']\\s*\\]`).test(nextConfig);
}

for (const rel of sharedRollbackFiles) assertFile("rollback files", rel);

for (const page of legacyPages) {
  assertFile("legacy pages", page.html);
  assertFile("legacy scripts", page.script);

  if (page.data) assertFile("legacy data", `data/${page.data}`);

  if (fileExists(page.html)) {
    const html = read(page.html);
    if (html.includes("./utils.js") && html.includes("./supabase.js") && html.includes("./site.js")) {
      pass("legacy page wiring", page.html, "loads shared rollback scripts");
    } else {
      fail("legacy page wiring", page.html, "does not load utils.js, supabase.js, and site.js");
    }

    if (html.includes(`./${page.script}`)) {
      pass("legacy page wiring", `${page.html} -> ${page.script}`, "loads matching page script");
    } else {
      fail("legacy page wiring", `${page.html} -> ${page.script}`, "matching page script reference is missing");
    }
  }
}

const nextConfig = read("apps/web/next.config.ts");
for (const page of legacyPages) {
  const [source, destination] = page.redirect;
  if (nextRedirectPresent(source, destination, nextConfig)) {
    pass("legacy redirects", `${source} -> ${destination}`, "configured in apps/web/next.config.ts");
  } else {
    fail("legacy redirects", `${source} -> ${destination}`, "missing from apps/web/next.config.ts");
  }
}

compareMirroredTrees("assets", "apps/web/public/assets");
compareMirroredTrees("data", "apps/web/public/data");

if (fileExists(".well-known/security.txt") && fileExists("apps/web/public/.well-known/security.txt")) {
  if (digest(".well-known/security.txt") === digest("apps/web/public/.well-known/security.txt")) {
    pass("security.txt", "RFC 9116 mirror", "root and Next public copies match");
  } else {
    fail("security.txt", "RFC 9116 mirror", "root and Next public copies differ");
  }
}

for (const doc of docs) {
  assertIncludes("docs", doc, "root static", `${doc} names the retained root static surface`);
  assertIncludes("docs", doc, "rollback/reference", `${doc} names rollback/reference status`);
}

assertIncludes(
  "docs",
  "docs/deployment.md",
  "until a later stabilization task explicitly retires them",
  "deployment source of truth keeps retirement approval boundary",
);
assertIncludes(
  "docs",
  "docs/current-live-state.md",
  "until a later stabilization task retires them",
  "live-state index keeps retirement boundary",
);
assertIncludes(
  "docs",
  "docs/dns-cutover-readiness-and-rollback.md",
  "Removing root static files or legacy workflow files",
  "rollback runbook marks removal as approval-gated",
);

const failed = checks.filter((check) => check.status === "fail");
const passed = checks.filter((check) => check.status === "pass");

const report = {
  generated_at: new Date().toISOString(),
  status: failed.length ? "fail" : "pass",
  summary: {
    passed: passed.length,
    failed: failed.length,
    legacy_pages: legacyPages.length,
  },
  decision: {
    current_state: "retain-root-static-rollback-reference",
    next_review: "Revisit retirement only after a separate stabilization-window approval packet.",
    guardrail: "This audit does not authorize deleting root static files, changing GitHub Pages, changing DNS, or changing provider settings.",
  },
  checks,
};

function markdownEscape(value) {
  return String(value).replace(/\r?\n/g, " ").replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

function makeMarkdown() {
  const rows = checks
    .map((check) =>
      `| ${[
        markdownEscape(check.status.toUpperCase()),
        markdownEscape(check.area),
        markdownEscape(check.name),
        markdownEscape(check.detail),
      ].join(" | ")} |`,
    )
    .join("\n");

  return `# Rollback Surface Drift Audit

Generated: ${report.generated_at}

This no-secret audit verifies that the retained root static GitHub Pages surface is still coherent as rollback/reference material while the live production app remains the Vercel/Next.js app in \`apps/web\`.

## Summary

- Status: ${report.status.toUpperCase()}
- Passed checks: ${passed.length}
- Failed checks: ${failed.length}
- Legacy root pages covered: ${legacyPages.length}
- Current decision: retain root static rollback/reference material.
- Retirement boundary: delete, archive, or GitHub Pages-setting changes require a separate approved stabilization task.

## Findings

| Status | Area | Check | Detail |
| --- | --- | --- | --- |
${rows}

## Operator Notes

- This report does not perform provider mutations.
- It does not authorize DNS, Vercel, Supabase, Discord, GitHub Pages, or data changes.
- If this audit fails because root \`assets/\` or \`data/\` drifted from \`apps/web/public/\`, run \`npm run sync:next-public\` and rerun the audit.
- If a root static page is intentionally retired later, update the root files, \`apps/web/next.config.ts\` legacy redirects, deployment docs, and this audit in the same scoped PR.
`;
}

if (writeReport) {
  mkdirSync(path.dirname(reportMarkdownPath), { recursive: true });
  writeFileSync(reportMarkdownPath, makeMarkdown());
  writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log("Wrote rollback surface drift audit reports.");
}

if (failed.length) {
  console.error(`Rollback surface drift audit failed (${failed.length} failures).`);
  for (const check of failed) console.error(`- ${check.area}: ${check.name}: ${check.detail}`);
  process.exit(1);
}

console.log(`Rollback surface drift audit OK (${passed.length} checks).`);
