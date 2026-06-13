import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has("--write");
const reportMarkdownPath = path.join(root, "reports/supabase-security-definer-audit.md");
const reportJsonPath = path.join(root, "reports/supabase-security-definer-audit.json");

const allowedPublicSecurityDefiners = {
  "public.handle_new_member_profile": {
    migration: "supabase/migrations/20260513081523_create_discord_role_gated_gallery_uploads.sql",
    reason:
      "Auth trigger helper inserts the initial public.member_profiles row from auth.users and auth.identities.",
    requiredSnippets: [
      "set search_path = public, auth, pg_temp",
      "revoke all on function public.handle_new_member_profile() from public, anon, authenticated;",
      "drop trigger if exists on_auth_user_created_member_profile on auth.users;",
      "create trigger on_auth_user_created_member_profile",
      "after insert on auth.users",
      "execute function public.handle_new_member_profile();",
    ],
    followUp:
      "Move to an unexposed schema with fully qualified relation references after an approved database migration window.",
  },
};

const sourceBasis = [
  {
    label: "Supabase Database Functions",
    url: "https://supabase.com/docs/guides/database/functions",
    note: "Security invoker is preferred; if security definer is needed, set search_path.",
  },
  {
    label: "Supabase Securing your API",
    url: "https://supabase.com/docs/guides/api/securing-your-api",
    note: "Data API access is governed by grants plus RLS, and function EXECUTE grants should be explicit.",
  },
  {
    label: "Supabase Row Level Security",
    url: "https://supabase.com/docs/guides/database/postgres/row-level-security",
    note: "RLS must be enabled for tables in exposed schemas such as public.",
  },
  {
    label: "Supabase Database Advisors",
    url: "https://supabase.com/docs/guides/database/database-advisors",
    note: "Security advisors include executable security-definer function findings.",
  },
  {
    label: "Supabase security-definer troubleshooting",
    url: "https://supabase.com/docs/guides/troubleshooting/do-i-need-to-expose-security-definer-functions-in-row-level-security-policies-iI0uOw",
    note: "Security-definer helpers do not need to be exposed to PostgREST when referenced with schema-qualified names.",
  },
];

const checks = [];

function relPath(rel) {
  return path.join(root, ...rel.split("/"));
}

function read(rel) {
  return readFileSync(relPath(rel), "utf8");
}

function addCheck(area, name, status, detail, evidence = {}) {
  checks.push({ area, name, status, detail, evidence });
}

function pass(area, name, detail, evidence) {
  addCheck(area, name, "pass", detail, evidence);
}

function warn(area, name, detail, evidence) {
  addCheck(area, name, "warn", detail, evidence);
}

function fail(area, name, detail, evidence) {
  addCheck(area, name, "fail", detail, evidence);
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function findSecurityDefinerFunctions() {
  const migrationsDir = relPath("supabase/migrations");
  const migrationFiles = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const functions = [];

  for (const fileName of migrationFiles) {
    const rel = `supabase/migrations/${fileName}`;
    const sql = read(rel);
    const pattern = /\bsecurity\s+definer\b/gi;
    let match;

    while ((match = pattern.exec(sql))) {
      const before = sql.slice(0, match.index);
      const functionMatch = [...before.matchAll(/create\s+(?:or\s+replace\s+)?function\s+([a-z_][\w]*)\.([a-z_][\w]*)\s*\(/gi)].pop();
      const schema = functionMatch?.[1] || "unknown";
      const name = functionMatch?.[2] || "unknown";
      const startIndex = functionMatch?.index ?? Math.max(0, match.index - 500);
      const endIndex = sql.indexOf("\n$$;", match.index);
      const functionBlock = sql.slice(startIndex, endIndex > -1 ? endIndex + 5 : match.index + 500);
      const trailingBlock = sql.slice(startIndex, Math.min(sql.length, (endIndex > -1 ? endIndex + 5 : match.index) + 900));
      const searchPathMatch = functionBlock.match(/\bset\s+search_path\s*=\s*([^\n]+)/i);

      functions.push({
        id: `${schema}.${name}`,
        schema,
        name,
        rel,
        line: lineNumber(sql, match.index),
        searchPath: searchPathMatch?.[1]?.trim() || "",
        functionBlock,
        trailingBlock,
      });
    }
  }

  return functions;
}

const functions = findSecurityDefinerFunctions();
const failures = () => checks.filter((check) => check.status === "fail");

if (functions.length === 0) {
  pass("inventory", "security definer functions", "No security-definer functions found in local migrations.");
} else {
  pass("inventory", "security definer functions", `${functions.length} security-definer function(s) found in local migrations.`, {
    functions: functions.map((fn) => ({ id: fn.id, file: fn.rel, line: fn.line })),
  });
}

for (const fn of functions) {
  const allowed = allowedPublicSecurityDefiners[fn.id];

  if (!allowed) {
    fail("allowlist", fn.id, "security-definer function is not documented in the local allowlist.", {
      file: fn.rel,
      line: fn.line,
    });
    continue;
  }

  if (fn.rel === allowed.migration) {
    pass("allowlist", fn.id, "matches the documented current exception.", { file: fn.rel, line: fn.line });
  } else {
    fail("allowlist", fn.id, "exists outside its documented migration.", {
      expected: allowed.migration,
      actual: fn.rel,
    });
  }

  if (fn.schema === "public") {
    warn(
      "hardening target",
      fn.id,
      "currently lives in the exposed public schema; keep as an explicit exception until the approved private-schema migration.",
      { followUp: allowed.followUp },
    );
  }

  if (fn.searchPath) {
    pass("search_path", fn.id, `has fixed search_path: ${fn.searchPath}`);
  } else {
    fail("search_path", fn.id, "security-definer function is missing a fixed search_path.");
  }

  for (const snippet of allowed.requiredSnippets) {
    if (fn.trailingBlock.includes(snippet)) {
      pass("required SQL", `${fn.id}: ${snippet}`, "present");
    } else {
      fail("required SQL", `${fn.id}: ${snippet}`, "missing from migration context");
    }
  }
}

const docsToCheck = [
  {
    file: "supabase/README.md",
    snippets: [
      "public.handle_new_member_profile()",
      "security definer",
      "check:supabase-security-definer-audit",
      "docs/supabase-security-definer-hardening.md",
    ],
  },
  {
    file: "docs/supabase-security-definer-hardening.md",
    snippets: [
      "public.handle_new_member_profile()",
      "private schema",
      "supabase db advisors --local",
      "supabase migration new",
      "No live database mutation is authorized by this document.",
    ],
  },
  {
    file: "package.json",
    snippets: ['"check:supabase-security-definer-audit": "node scripts/check-supabase-security-definer-audit.mjs"'],
  },
  {
    file: "scripts/check-all.mjs",
    snippets: ['["check:supabase-security-definer-audit", ["node", "scripts/check-supabase-security-definer-audit.mjs"]]'],
  },
];

for (const doc of docsToCheck) {
  const text = read(doc.file);
  for (const snippet of doc.snippets) {
    if (text.includes(snippet)) pass("docs", `${doc.file}: ${snippet}`, "present");
    else fail("docs", `${doc.file}: ${snippet}`, "missing");
  }
}

const report = {
  generated_at: new Date().toISOString(),
  status: failures().length ? "fail" : "pass",
  summary: {
    security_definer_functions: functions.length,
    public_security_definer_functions: functions.filter((fn) => fn.schema === "public").length,
    allowed_public_exceptions: Object.keys(allowedPublicSecurityDefiners).length,
    passed: checks.filter((check) => check.status === "pass").length,
    warnings: checks.filter((check) => check.status === "warn").length,
    failed: failures().length,
  },
  source_basis: sourceBasis,
  current_decision: {
    posture: "report-first",
    live_mutation: "none",
    migration_target:
      "Move public.handle_new_member_profile() to an unexposed schema in a separate approved migration window if local and linked advisors stay clean.",
  },
  functions: functions.map((fn) => ({
    id: fn.id,
    schema: fn.schema,
    file: fn.rel,
    line: fn.line,
    search_path: fn.searchPath,
    allowed_exception: Boolean(allowedPublicSecurityDefiners[fn.id]),
  })),
  checks,
};

function markdownEscape(value) {
  return String(value).replace(/\r?\n/g, " ").replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

function makeMarkdown() {
  const functionRows = report.functions.length
    ? report.functions
        .map(
          (fn) =>
            `| ${[
              markdownEscape(fn.id),
              markdownEscape(fn.schema),
              markdownEscape(fn.file),
              markdownEscape(fn.line),
              markdownEscape(fn.search_path || "missing"),
              markdownEscape(fn.allowed_exception ? "yes" : "no"),
            ].join(" | ")} |`,
        )
        .join("\n")
    : "| none | n/a | n/a | n/a | n/a | n/a |";

  const sourceRows = sourceBasis
    .map((source) => `| [${markdownEscape(source.label)}](${source.url}) | ${markdownEscape(source.note)} |`)
    .join("\n");

  const checkRows = checks
    .map(
      (check) =>
        `| ${[
          markdownEscape(check.status.toUpperCase()),
          markdownEscape(check.area),
          markdownEscape(check.name),
          markdownEscape(check.detail),
        ].join(" | ")} |`,
    )
    .join("\n");

  return `# Supabase Security-Definer Audit

Generated: ${report.generated_at}

This no-secret audit inventories local Supabase migrations for \`security definer\` functions and keeps the current \`public.handle_new_member_profile()\` exception explicit while a private-schema migration remains a separate approval-gated hardening task.

## Summary

- Status: ${report.status.toUpperCase()}
- Security-definer functions found: ${report.summary.security_definer_functions}
- Public security-definer functions found: ${report.summary.public_security_definer_functions}
- Allowed public exceptions: ${report.summary.allowed_public_exceptions}
- Passed checks: ${report.summary.passed}
- Warnings: ${report.summary.warnings}
- Failed checks: ${report.summary.failed}
- Live database mutation: none

## Source Basis

| Source | Why It Matters |
| --- | --- |
${sourceRows}

## Function Inventory

| Function | Schema | File | Line | Search Path | Allowed Exception |
| --- | --- | --- | ---: | --- | --- |
${functionRows}

## Current Decision

Keep \`public.handle_new_member_profile()\` as a documented current exception because it is revoked from \`public\`, \`anon\`, and \`authenticated\`, has a fixed search path, and is invoked by an \`auth.users\` trigger rather than browser code. Treat it as a hardening target, not as an emergency blocker.

The next implementation step is an approved database migration window that moves the helper to an unexposed schema with fully qualified relation references, then verifies local and linked advisors.

## Findings

| Status | Area | Check | Detail |
| --- | --- | --- | --- |
${checkRows}

## Operator Notes

- This report does not run \`supabase db push\`, deploy Edge Functions, read secrets, query production, or mutate live data.
- Run \`npm run check:supabase-security-definer-audit -- --write\` after changing Supabase migrations or the hardening runbook.
- Run Supabase CLI advisor/lint commands only in an operator-approved local or linked verification window.
`;
}

if (writeReport) {
  mkdirSync(path.dirname(reportMarkdownPath), { recursive: true });
  writeFileSync(reportMarkdownPath, makeMarkdown());
  writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log("Wrote Supabase security-definer audit reports.");
}

if (failures().length) {
  console.error(`Supabase security-definer audit failed (${failures().length} failures).`);
  for (const check of failures()) console.error(`- ${check.area}: ${check.name}: ${check.detail}`);
  process.exit(1);
}

console.log(
  `Supabase security-definer audit OK (${report.summary.passed} pass, ${report.summary.warnings} warning).`,
);
