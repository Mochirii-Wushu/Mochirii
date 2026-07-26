import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SITE_ORIGIN } from "./lib/public-urls.mjs";

const root = process.cwd();
const failures = [];

const files = {
  page: "apps/web/app/raffle/page.tsx",
  rules: "apps/web/app/raffle/rules/page.tsx",
  component: "apps/web/components/public-pages/route-pages/RafflePage.tsx",
  data: "apps/web/public/data/raffles.json",
  metadata: "apps/web/components/public-pages/metadata.ts",
  navigation: "apps/web/lib/site-navigation.ts",
  footer: "apps/web/components/SiteFooter.tsx",
  home: "apps/web/public/data/home.json",
  tome: "apps/web/public/data/tome.json",
  scheduleHelper: "apps/web/lib/guild-schedule.ts",
  nextConfig: "apps/web/next.config.ts",
  sitemap: "apps/web/public/sitemap.xml",
};

const forbiddenSurfaces = [
  "apps/web/app/api/raffle",
  "apps/web/app/raffle/claim",
  "apps/web/app/leader-dashboard/raffle",
  "apps/web/app/raffles/page.tsx",
  "apps/web/components/prize-draw",
  "apps/web/lib/prize-draw.ts",
  "apps/web/lib/prize-draw-rules.ts",
  "apps/web/lib/supabase/prize-draw.ts",
  "services/reward-relay",
  "supabase/migrations/20260719130111_monthly_prize_draw.sql",
  "supabase/functions/get-current-raffle",
  "supabase/functions/manage-raffle-entry",
  "supabase/functions/manage-raffle-claim",
  "supabase/functions/moderate-raffle",
  "supabase/functions/run-raffle-fulfillment",
  "supabase/functions/run-raffle-schedule",
  "supabase/functions/reward-provider-webhook",
  "scripts/register-reaper-raffle-commands.mjs",
  "scripts/check-reaper-raffle-commands.mjs",
  "scripts/check-reward-relay.mjs",
];

for (const [label, file] of Object.entries(files)) {
  if (!existsSync(resolve(root, file))) failures.push(`${label}: required file is missing: ${file}`);
}

for (const file of forbiddenSurfaces) {
  if (existsSync(resolve(root, file))) failures.push(`${file}: operational raffle surface must stay absent from the public closed-state change`);
}

const data = JSON.parse(read(files.data) || "{}");
const exactKeys = ["availabilityState", "currentStatus", "howToConfirm", "memberSafety", "meta", "programName", "rulesStatus"];
if (JSON.stringify(Object.keys(data).sort()) !== JSON.stringify(exactKeys)) {
  failures.push(`raffle data: expected only ${exactKeys.join(", ")}`);
}

assert(data.programName === "Mochirii Monthly Raffle", "raffle data: programName must use Mochirii branding");
assert(data.availabilityState === "closed", "raffle data: availabilityState must remain closed");
assert(data.meta?.statusLabel === "ENTRIES CLOSED", "raffle data: status label must be ENTRIES CLOSED");
for (const notice of ["Entries closed", "No active promotion", "No purchase necessary"]) {
  assert(data.meta?.badges?.includes(notice), `raffle data: missing required badge ${notice}`);
}

const forbiddenDataKeys = /^(?:sponsor|sponsorDisplayName|countries|eligibleCountries|officialRules|entryUrl|entryAction|claimUrl|provider|prizeProvider)$/i;
walkKeys(data, "raffles", (key, path) => {
  if (forbiddenDataKeys.test(key)) failures.push(`raffle data: forbidden closed-state field ${path}`);
});

const metadataSource = read(files.metadata);
const raffleMetadataStart = metadataSource.indexOf("raffle: {");
const raffleMetadataEnd = metadataSource.indexOf("gallery:", raffleMetadataStart);
const raffleMetadataSource = raffleMetadataStart >= 0 && raffleMetadataEnd > raffleMetadataStart
  ? metadataSource.slice(raffleMetadataStart, raffleMetadataEnd)
  : "";
const publicSource = [read(files.page), read(files.rules), read(files.component), read(files.data), raffleMetadataSource].join("\n");
for (const [label, pattern] of [
  ["client component", /["']use client["']/i],
  ["form", /<form\b/i],
  ["entry button", /<button\b/i],
  ["network request", /\bfetch\s*\(/i],
  ["Supabase client", /supabase/i],
  ["runtime secret", /process\.env/i],
  ["reward relay", /reward[- ]relay/i],
  ["prize provider name", /tremendous/i],
  ["Discord entry path", /discord/i],
  ["external URL", /https?:\/\//i],
  ["future implementation promise", /\b(?:will|planned|future|coming soon|tbd)\b|open drawing|working entry|before entries are accepted|not currently available/i],
  ["unpublished promotion detail", /\b(?:dates?|eligibility|rewards?)\b/i],
  ["internal implementation language", /prelaunch|preparation|launch requirements|legal review|implementation|backend|integration|provider|migration|funding|fulfillment/i],
]) {
  if (pattern.test(publicSource)) failures.push(`public raffle source: ${label} is forbidden`);
}

for (const phrase of ["No current drawing", "Entries closed", "no active promotion", "No purchase necessary", "No official raffle rules are currently in effect"]) {
  assert(publicSource.toLowerCase().includes(phrase.toLowerCase()), `public raffle source: missing ${phrase}`);
}
assertIncludes("public raffle closed state", publicSource, "Entries closed");
assertIncludes("public raffle rules state", publicSource, "No current rules");

const nextConfig = read(files.nextConfig);
assertIncludes("Next redirects", nextConfig, '["/raffles", "/raffle"]');
assertIncludes("Next redirects", nextConfig, '["/raffles.html", "/raffle"]');
assertIncludes("navigation", read(files.navigation), 'href: "/raffle", label: "Raffle", nav: "raffle"');
assertIncludes("footer", read(files.footer), '{ href: "/raffle", label: "Raffle" }');
assertIncludes("home bulletin", read(files.home), '"href": "/raffle"');
assertIncludes("Tome raffle guidance", read(files.tome), "the current raffle status stays public & clearly labeled");
assertIncludes("website event cards", read(files.scheduleHelper), '.filter((item) => item.id !== "monthly-raffle")');
assertIncludes("metadata", read(files.metadata), 'path: "/raffle"');
assertIncludes("metadata", read(files.metadata), 'path: "/raffle/rules"');
assertIncludes("sitemap", read(files.sitemap), `${SITE_ORIGIN}/raffle</loc>`);
assertIncludes("sitemap", read(files.sitemap), `${SITE_ORIGIN}/raffle/rules</loc>`);

if (failures.length) {
  console.error(`Raffle closed-state contract failed (${failures.length} issue${failures.length === 1 ? "" : "s"}).`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Raffle closed-state contract OK.");
console.log("- /raffle and /raffle/rules are static, Mochirii-only, and fail closed.");
console.log("- Entry, claim, administration, backend, reward, schedule, and provider surfaces are absent.");

function read(file) {
  const absolute = resolve(root, file);
  return existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertIncludes(label, source, snippet) {
  if (!source.includes(snippet)) failures.push(`${label}: missing ${snippet}`);
}

function walkKeys(value, path, visit) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkKeys(item, `${path}.${index}`, visit));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    visit(key, nextPath);
    walkKeys(item, nextPath, visit);
  }
}
