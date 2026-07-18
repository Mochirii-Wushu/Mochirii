import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];

const currentRoute = "/games/mochi-pets";
const oldKebab = ["mochi", "social"].join("-");
const oldSnake = ["mochi", "social"].join("_");
const oldEnv = ["MOCHI", "SOCIAL"].join("_");
const oldPascal = ["Mochi", "Social"].join("");
const oldCamel = ["mochi", "Social"].join("");
const oldName = ["Mochi", "Social"].join(" ");
const retiredRoute = `/games/${oldKebab}`;
const currentPublicName = "Mochi Pets";
const historicalAllowlist = new Set([
  "docs/mochi-pets-rename-manifest.md",
  `supabase/migrations/20260610090000_add_${oldSnake}_alpha.sql`,
  `supabase/migrations/20260621120000_add_${oldSnake}_unity_room.sql`,
  `supabase/migrations/20260622204823_add_${oldSnake}_alpha_explicit_grants.sql`,
  `supabase/migrations/20260702043644_harden_${oldSnake}_advisor_findings.sql`,
  "supabase/migrations/20260704120856_rename_mochi_pets_internal_prefix.sql",
]);

const allowedPrefixes = [
  "reports/",
  "docs/operations/",
];

const oldResidues = [
  oldName,
  retiredRoute,
  oldSnake,
  oldEnv,
  oldKebab,
  oldPascal,
  oldCamel,
];

const requiredFiles = [
  "apps/web/app/games/mochi-pets/page.tsx",
  "apps/web/components/mochi-pets/MochiPetsAlphaClient.tsx",
  "apps/web/components/mochi-pets/MochiPetsTesterPasswordGate.tsx",
  "apps/web/lib/mochi-pets/alpha.ts",
  "apps/web/lib/mochi-pets/bridge.ts",
  "apps/web/lib/mochi-pets/tester-password.ts",
  "docs/mochi-pets-alpha.md",
  "docs/mochi-pets-playtest-guide.md",
  "docs/mochi-pets-rename-manifest.md",
  "supabase/migrations/20260704120856_rename_mochi_pets_internal_prefix.sql",
];

const retiredFiles = [
  `apps/web/app/games/${oldKebab}/page.tsx`,
  `apps/web/components/${oldKebab}/${oldPascal}AlphaClient.tsx`,
  `apps/web/lib/${oldKebab}/alpha.ts`,
];

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) failures.push(`${file}: required Mochi Pets file is missing.`);
}

for (const file of retiredFiles) {
  if (existsSync(resolve(root, file))) failures.push(`${file}: retired game file must stay removed.`);
}

const packageJson = read("package.json");
const checkAll = read("scripts/check-all.mjs");
const nextConfig = read("apps/web/next.config.ts");
const siteHeader = read("apps/web/components/SiteHeader.tsx");
const siteNavigation = read("apps/web/lib/site-navigation.ts");
const routePage = read("apps/web/app/games/mochi-pets/page.tsx");
const smoke = read("scripts/smoke-vercel-production.mjs");
const observability = read("scripts/check-observability-metadata-smoke.mjs");
const supabaseConfig = read("supabase/config.toml");
const migration = read("supabase/migrations/20260704120856_rename_mochi_pets_internal_prefix.sql");
const gameContract = read("scripts/check-mochi-pets-game-contract.mjs");

[
  "check:mochi-pets-alpha",
  "check:mochi-pets-game-contract",
  "check:mochi-pets-rename-manifest",
  "test:mochi-pets-alpha",
].forEach((snippet) => assertIncludes("package.json", packageJson, snippet));

assertIncludes("check-all", checkAll, "check:mochi-pets-rename-manifest");
assertIncludes("site navigation", siteNavigation, `href: "${currentRoute}", label: "${currentPublicName}"`);
assertIncludes("site navigation", siteNavigation, `"@/lib/public-urls"`);
assertIncludes("site navigation", siteNavigation, `label: "Social"`);
assertIncludes("SiteHeader", siteHeader, "navGroups.map");
assertIncludes("route metadata", routePage, `canonical: "${currentRoute}"`);
assertIncludes("route metadata", routePage, "index: false");
assertIncludes("production smoke active route", smoke, `"${currentRoute}"`);
assertIncludes("production smoke retired route", smoke, "retiredGameRoute");
assertIncludes("observability retired route", observability, "retiredGameSlug");
assertNotIncludes("Next redirects", nextConfig, retiredRoute);
assertNotIncludes("Next redirects", nextConfig, `/${oldKebab}.html`);

[
  "mochi-pets-alpha-session",
  "mochi-pets-unity-auth",
  "mochi-pets-alpha-action",
  "mochi-pets-alpha-progress",
  "mochi-pets-alpha-admin",
  "submit-mochi-pets-feedback",
].forEach((snippet) => assertIncludes("Supabase config", supabaseConfig, snippet));

[
  `('${oldSnake}_alpha_testers', 'mochi_pets_alpha_testers')`,
  `('${oldSnake}_spirits', 'mochi_pets_spirits')`,
  `('${oldSnake}_pets', 'mochi_pets_pets')`,
  "alter table public.%I rename to %I",
  "alter index public.%I rename to %I",
  "alter policy %I on public.%I rename to %I",
  "grant %s on table public.%I to %I",
].forEach((snippet) => assertIncludes("rename migration", migration, snippet));

[
  'health.name === "Mochi Pets"',
  'manifest.name === "Mochi Pets"',
  'manifest.slug === "mochi-pets"',
  'manifest.bridge?.namespace === "MOCHI_PETS"',
  'assertIncludes(manifest.bridge?.parentToGame, "MOCHI_PETS_AUTH"',
].forEach((snippet) => assertIncludes("game runtime manifest check", gameContract, snippet));

scanTrackedFiles();

if (failures.length) {
  console.error("Mochi Pets rename manifest check failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Mochi Pets rename manifest OK.");
console.log("- Current game route: /games/mochi-pets");
console.log("- Retired game route: 404/no redirect");
console.log("- Mochirii Social remains the separate social platform.");

function read(file) {
  const full = resolve(root, file);
  if (!existsSync(full)) {
    failures.push(`${file}: missing required file.`);
    return "";
  }
  return readFileSync(full, "utf8");
}

function scanTrackedFiles() {
  const result = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    failures.push("Unable to list tracked files with git ls-files.");
    return;
  }

  const files = result.stdout
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean)
    .filter((file) => existsSync(resolve(root, file)))
    .filter((file) => isTextFile(file));

  for (const file of files) {
    const normalized = file.replace(/\\/g, "/");
    if (isAllowedHistoricalFile(normalized)) continue;

    const text = readFileSync(resolve(root, normalized), "utf8");
    for (const residue of oldResidues) {
      if (text.includes(residue)) {
        failures.push(`${normalized}: old game residue found: ${residue}`);
      }
    }
  }
}

function isAllowedHistoricalFile(file) {
  if (historicalAllowlist.has(file)) return true;
  return allowedPrefixes.some((prefix) => file.startsWith(prefix));
}

function isTextFile(file) {
  return /\.(?:css|csv|html|js|json|jsonc|md|mjs|sql|svg|toml|ts|tsx|txt|xml|yml|yaml)$/i.test(file)
    || file === "README.md"
    || file === "AGENTS.md"
    || file === ".env.example";
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) failures.push(`${label}: expected snippet not found: ${snippet}`);
}

function assertNotIncludes(label, text, snippet) {
  if (text.includes(snippet)) failures.push(`${label}: unexpected snippet found: ${snippet}`);
}
