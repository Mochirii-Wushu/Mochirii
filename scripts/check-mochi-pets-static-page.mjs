import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];

const paths = {
  page: "apps/web/app/games/mochi-pets/page.tsx",
  layout: "apps/web/app/games/mochi-pets/layout.tsx",
  css: "apps/web/app/styles/mochi-pets.css",
  artwork: "apps/web/public/assets/img/mochi-pets/gate-arrival.webp",
  nextConfig: "apps/web/next.config.ts",
  publicUrls: "apps/web/config/public-urls.json",
  webEnv: "apps/web/.env.example",
  dashboard: "apps/web/components/member-workflow/LeaderDashboard.tsx",
  dashboardParts: "apps/web/components/member-workflow/LeaderDashboardParts.tsx",
  navigation: "apps/web/lib/site-navigation.ts",
  futurePlan: "docs/mochi-pets-future-project.md",
};

const retiredFiles = [
  "apps/web/app/games/mochi-pets/tester-login/route.ts",
  "apps/web/app/games/mochi-pets/tester-logout/route.ts",
  "apps/web/components/mochi-pets/MochiPetsAlphaClient.tsx",
  "apps/web/components/mochi-pets/MochiPetsTesterPasswordGate.tsx",
  "apps/web/lib/mochi-pets/alpha.ts",
  "apps/web/lib/mochi-pets/bridge.ts",
  "apps/web/lib/mochi-pets/tester-password.ts",
];

for (const [label, file] of Object.entries(paths)) {
  if (!existsSync(resolve(root, file))) failures.push(`${label}: required file is missing: ${file}`);
}
for (const file of retiredFiles) {
  if (existsSync(resolve(root, file))) failures.push(`${file}: retired game integration file must stay absent`);
}

const page = read(paths.page);
for (const snippet of [
  'canonical: "/games/mochi-pets"',
  "index: false",
  "follow: false",
  'id="main"',
  "<h1",
  "/assets/img/brand/emblem.webp",
  "fresh",
  "Unity project",
  "No playable build",
]) {
  assertIncludes("static page", page, snippet);
}

for (const [label, pattern] of [
  ["client component directive", /["']use client["']/],
  ["dynamic rendering opt-in", /force-dynamic/],
  ["runtime environment access", /process\.env/],
  ["network fetch", /\bfetch\s*\(/],
  ["cookie access", /\bcookies\s*\(/],
  ["iframe", /<iframe\b/i],
  ["form", /<form\b/i],
  ["password control", /type=["']password["']/i],
  ["tester endpoint", /tester-(?:login|logout)/i],
  ["cross-document bridge", /postMessage/i],
  ["Supabase call", /supabase/i],
  ["Fly runtime", /(?:fly\.dev|Fly\.io)/i],
  ["active alpha claim", /\b(?:closed\s+)?alpha\b/i],
]) {
  if (pattern.test(page)) failures.push(`static page: ${label} is forbidden`);
}

const activeConfig = [
  read(paths.nextConfig),
  read(paths.publicUrls),
  read(paths.webEnv),
].join("\n");
for (const [label, pattern] of [
  ["retired game origin", /mochi-pets-game\.fly\.dev/i],
  ["retired public game URL", /NEXT_PUBLIC_MOCHI_PETS_URL/],
  ["retired tester configuration", /MOCHI_PETS_(?:ALPHA|TESTER|GAME)/],
]) {
  if (pattern.test(activeConfig)) failures.push(`active configuration: ${label} must stay absent`);
}

const dashboard = `${read(paths.dashboard)}\n${read(paths.dashboardParts)}`;
if (/MochiPets|mochiAlpha|Mochi Pets alpha|mochi-pets-alpha/i.test(dashboard)) {
  failures.push("leader dashboard: retired game access and audit controls must stay absent");
}

const navigation = read(paths.navigation);
assertIncludes(
  "site navigation",
  navigation,
  'href: "/games/mochi-pets", label: "Mochi Pets", nav: "games/mochi-pets"',
);
if (/href: "\/games\/mochi-pets"[^\n]*auth:/.test(navigation)) {
  failures.push("site navigation: static project page must not require member authentication");
}

const nextConfig = read(paths.nextConfig);
if (/games\/mochi-social/.test(nextConfig)) {
  failures.push("next config: retired /games/mochi-social route must not be redirected");
}
if (existsSync(resolve(root, "apps/web/app/games/mochi-social"))) {
  failures.push("retired /games/mochi-social route must stay absent");
}

if (failures.length) {
  console.error("Mochi Pets static page contract failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Mochi Pets static page contract OK.");
console.log("- Stable noindex route and project-status content are present.");
console.log("- Game runtime, tester access, browser bridge, and website backend dependency are absent.");

function read(file) {
  const absolute = resolve(root, file);
  if (!existsSync(absolute)) return "";
  return readFileSync(absolute, "utf8");
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) failures.push(`${label}: expected snippet is missing: ${snippet}`);
}
