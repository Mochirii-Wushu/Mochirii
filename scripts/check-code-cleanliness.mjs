import { existsSync, readFileSync } from "node:fs";
import { collectRepoFiles, fromRoot, readText } from "./lib/repo-paths.mjs";
import { appCssFiles } from "./lib/app-css.mjs";
import {
  MOCHI_PETS_DEFAULT_ORIGIN,
  SITE_ORIGIN,
  SOCIAL_HOST,
  SUPABASE_PROJECT_REF,
} from "./lib/public-urls.mjs";

const sourceLineBudgets = [
  { path: "apps/web/app/styles/public-home-visual.css", warnAt: 800, reason: "home visual-system styles should stay focused" },
  { path: "apps/web/app/styles/public-gallery.css", warnAt: 700, reason: "gallery styles should stay focused" },
  { path: "apps/web/app/styles/public-profiles.css", warnAt: 850, reason: "profile and recruitment styles should stay focused" },
  { path: "apps/web/app/styles/public-side-pages.css", warnAt: 600, reason: "supporting page styles should stay focused" },
  { path: "apps/web/app/styles/member-workflow.css", warnAt: 500, reason: "shared member workflow styles should stay focused" },
  { path: "apps/web/app/styles/member-leader-dashboard.css", warnAt: 400, reason: "leader dashboard workflow styles should stay focused" },
  { path: "apps/web/app/styles/shell-header-nav.css", warnAt: 450, reason: "header and navigation styles should stay separately reviewable" },
  { path: "apps/web/app/styles/shell-mobile-menu.css", warnAt: 250, reason: "mobile menu styles should stay separately reviewable" },
  { path: "apps/web/app/styles/shell-footer.css", warnAt: 350, reason: "footer styles should stay separately reviewable" },
  { path: "apps/web/components/public-pages/pages.tsx", warnAt: 900, reason: "public page render helpers should stay reviewable" },
  { path: "apps/web/components/member-workflow/LeaderDashboard.tsx", warnAt: 900, reason: "moderation panels should split by workflow" },
  { path: "apps/web/components/SiteHeader.tsx", warnAt: 450, reason: "navigation data and interaction logic should stay separable" },
  { path: "supabase/functions/reaper-discord-interactions/index.ts", warnAt: 1200, reason: "Edge Function request routing should extract pure helpers" },
  { path: "supabase/functions/verify-member-access/index.ts", warnAt: 700, reason: "auth and policy checks should be easy to isolate" },
  { path: "supabase/functions/submit-discord-gallery-image/index.ts", warnAt: 700, reason: "upload validation and Discord calls should remain focused" },
];

const publicLiteralValues = [
  SITE_ORIGIN,
  SOCIAL_HOST,
  MOCHI_PETS_DEFAULT_ORIGIN,
  SUPABASE_PROJECT_REF,
];

const literalAllowedFiles = new Set([
  "apps/web/config/public-urls.json",
  "apps/web/lib/public-urls.ts",
  "scripts/lib/public-urls.mjs",
  "scripts/check-code-cleanliness.mjs",
  "supabase/functions/_shared/public-origins.ts",
]);

const literalAllowedPrefixes = [
  "apps/web/public/",
  "docs/",
  "reports/",
  "supabase/migrations/",
];

const warnings = [];
const failures = [];

for (const file of appCssFiles) {
  const fullPath = fromRoot(file);
  if (!existsSync(fullPath)) continue;
  const bytes = readFileSync(fullPath);
  const hasUtf8Bom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const startsWithByteOrderMark = readFileSync(fullPath, "utf8").charCodeAt(0) === 0xfeff;
  if (hasUtf8Bom || startsWithByteOrderMark) {
    failures.push(`${file}: imported app CSS must not start with a UTF-8 BOM or leading U+FEFF because it can invalidate the first selector.`);
  }
}

for (const budget of sourceLineBudgets) {
  const fullPath = fromRoot(budget.path);
  if (!existsSync(fullPath)) continue;
  const lineCount = readFileSync(fullPath, "utf8").split(/\r?\n/).length;
  if (lineCount > budget.warnAt) {
    warnings.push(`${budget.path}: ${lineCount} lines exceeds warning budget ${budget.warnAt}; ${budget.reason}.`);
  }
}

const files = collectRepoFiles(["apps/web", "scripts", "supabase/functions"], {
  extensions: ["js", "mjs", "ts", "tsx", "json", "toml"],
  ignoredSegments: ["node_modules", ".next", ".git"],
});

const serviceRoleResolverPath = "supabase/functions/_shared/supabase-service-role.ts";
const serviceRoleResolverDefinition = /\b(?:export\s+)?function\s+getServiceRoleKey\s*\(/g;
const directServiceRoleReads = [
  'Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")',
  'Deno.env.get("SUPABASE_SECRET_KEYS")',
];

for (const file of files.filter((entry) => entry.startsWith("supabase/functions/") && entry.endsWith(".ts"))) {
  const text = readText(file);
  const definitionCount = (text.match(serviceRoleResolverDefinition) || []).length;

  if (file === serviceRoleResolverPath) {
    if (definitionCount !== 1) {
      failures.push(`${file}: the canonical service-role resolver must define getServiceRoleKey exactly once.`);
    }
    for (const requiredRead of directServiceRoleReads) {
      if (!text.includes(requiredRead)) {
        failures.push(`${file}: the canonical service-role resolver must retain ${requiredRead}.`);
      }
    }
    continue;
  }

  if (definitionCount) {
    failures.push(`${file}: Edge Functions must import the canonical service-role resolver instead of defining it locally.`);
  }
  for (const forbiddenRead of directServiceRoleReads) {
    if (text.includes(forbiddenRead)) {
      failures.push(`${file}: Edge Functions must not read service-role environment values outside the canonical resolver.`);
    }
  }
}

for (const file of files) {
  if (literalAllowedFiles.has(file) || literalAllowedPrefixes.some((prefix) => file.startsWith(prefix))) continue;
  const text = readText(file);
  const found = publicLiteralValues.filter((value) => text.includes(value));
  if (found.length) {
    warnings.push(`${file}: public URL/project literal should prefer apps/web/config/public-urls.json (${found.join(", ")}).`);
  }
}

console.log("Code cleanliness guard completed.");
if (failures.length) {
  console.error(`- Failure findings: ${failures.length}`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

if (!warnings.length) {
  console.log("- No warning-budget findings.");
  process.exit(0);
}

console.log(`- Warning findings: ${warnings.length}`);
for (const warning of warnings.slice(0, 40)) console.log(`  - ${warning}`);
if (warnings.length > 40) console.log(`  - ... ${warnings.length - 40} more warning findings not shown.`);
console.log("- These findings are warnings only; future cleanup PRs can tighten them after the current refactors land.");
