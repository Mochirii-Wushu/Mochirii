import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { SITE_ORIGIN, SOCIAL_HOST } from "./lib/public-urls.mjs";

const root = process.cwd();
const failures = [];

const expected = {
  subtitle: "Asia Pacific • Where Winds Meet Guild",
  description: "Join Mōchirīī, an Asia Pacific Where Winds Meet guild full of yummy cupcakes for everyone & pretty people to share them all with.",
  spotlight: "Pretty guild member who's always so lovely, beautiful & keeping the guild a wonderful place for everyone.",
  gatheringTitle: "Monthly Guild Gathering",
  gatheringDescription: "A monthly gathering where every member can discuss anything they'd like with the guild.",
  footer: "An Asia Pacific Where Winds Meet guild, with events scheduled in Singapore Time (UTC+8).",
  join: "Mōchirīī welcomes all pretty new members across Asia Pacific or anywhere else in the world if you don't mind the ping.",
  displayTimezone: "Singapore Time (UTC+8)",
  brandSubtitle: "Asia Pacific Guild",
};

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function assertIncludes(label, source, snippet) {
  assert(source.includes(snippet), `${label}: missing ${JSON.stringify(snippet)}.`);
}

function assertCompactOccurrenceCount(label, source, snippet, expectedCount) {
  const compactSource = source.replace(/\s+/g, " ");
  const actualCount = compactSource.split(snippet).length - 1;
  assert(
    actualCount === expectedCount,
    `${label}: expected ${expectedCount} occurrences of ${JSON.stringify(snippet)}, found ${actualCount}.`,
  );
}

function decodeHtmlAttribute(value) {
  return String(value || "").replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'");
}

function metaContent(source, property, value) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`<meta\\s+${property}="${escaped}"\\s+content="([^"]*)"\\s*/?>`, "i"));
  return decodeHtmlAttribute(match?.[1]);
}

const home = readJson("data/home.json");
const schedule = readJson("data/guild-schedule.json");
const join = readJson("data/join.json");
const events = readJson("data/events.json");
const raffles = readJson("data/raffles.json");

assert(home.hero?.subtitle === expected.subtitle, "home.hero.subtitle must match the approved APAC subtitle.");
assert(home.copy?.spotlightIntro === expected.spotlight, "home Spotlight text must match the approved copy.");
assert(schedule.timezone?.label === "UTC+8", "the Discord-facing schedule label must remain UTC+8.");
assert(schedule.timezone?.offsetMinutes === 480, "the schedule offset must remain 480 minutes.");
assert(schedule.timezone?.ianaZone === "Asia/Singapore", "the schedule IANA zone must be Asia/Singapore.");
assert(schedule.timezone?.displayLabel === expected.displayTimezone, "the website timezone label must remain Singapore Time (UTC+8).");
assert(schedule.monthly?.gathering?.title === expected.gatheringTitle, "the gathering title must match the approved copy.");
assert(schedule.monthly?.gathering?.description === expected.gatheringDescription, "the gathering description must match the approved copy.");

const homeGathering = home.bulletins?.find((item) => item.scheduleId === "monthly-gathering");
assert(homeGathering?.title === schedule.monthly?.gathering?.title, "the Home gathering fallback must exactly match the canonical schedule title.");
assert(join.hero?.intro === expected.join, "the Join line must match the approved copy.");
assert(join.hero?.timezone === expected.displayTimezone, "the Join page must use the website timezone label.");
assert(events.meta?.timezoneLabel === expected.displayTimezone, "the Events page must use the website timezone label.");
for (const item of events.upcoming || []) {
  assert(item.timezone === expected.displayTimezone, `events.${item.scheduleId || "unknown"}.timezone must use the website label.`);
}
assert(raffles.meta?.timezoneLabel === expected.displayTimezone, "the Raffles page must use the website timezone label.");
assert(raffles.thisMonth?.timezone === expected.displayTimezone, "the current raffle must use the website timezone label.");

const index = read("index.html");
assert(metaContent(index, "name", "description") === expected.description, "static Home description must match the approved copy.");
assert(metaContent(index, "property", "og:description") === expected.description, "static Open Graph description must match the approved copy.");
assert(metaContent(index, "name", "twitter:description") === expected.description, "static Twitter description must match the approved copy.");
assertIncludes("static Home", index, 'id="homeSubtitle"');

const staticJsonLdMatch = index.match(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/i);
assert(Boolean(staticJsonLdMatch), "static Home must contain JSON-LD.");
if (staticJsonLdMatch) {
  try {
    const jsonLd = JSON.parse(staticJsonLdMatch[1]);
    const graph = Array.isArray(jsonLd?.["@graph"]) ? jsonLd["@graph"] : [];
    const website = graph.find((item) => item?.["@type"] === "WebSite");
    const organization = graph.find((item) => item?.["@type"] === "Organization");
    assert(website?.["@id"] === `${SITE_ORIGIN}/#website`, "WebSite JSON-LD must use its canonical ID.");
    assert(website?.alternateName === "Mochirii", "WebSite JSON-LD must include the approved alternate name.");
    assert(website?.description === expected.description, "WebSite JSON-LD must use the approved description.");
    assert(website?.inLanguage === "en-SG", "WebSite JSON-LD must declare en-SG.");
    assert(organization?.["@id"] === `${SITE_ORIGIN}/#organization`, "Organization JSON-LD must use its canonical ID.");
    assert(organization?.areaServed === "Asia Pacific", "Organization JSON-LD must serve Asia Pacific.");
    assert(JSON.stringify(organization?.sameAs) === JSON.stringify([SOCIAL_HOST]), "Organization JSON-LD must include only the verified social profile.");
  } catch (error) {
    fail(`static Home JSON-LD must parse: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const htmlFiles = readdirSync(root)
  .filter((file) => file.endsWith(".html") && read(file).includes("<!doctype html>"))
  .sort();
for (const file of htmlFiles) {
  const source = read(file);
  assertIncludes(file, source, '<html lang="en-SG">');
  assert(metaContent(source, "property", "og:locale") === "en_SG", `${file}: Open Graph locale must be en_SG.`);
  assert(!/hreflang\s*=|languages\s*:/i.test(source), `${file}: translated alternates are not approved.`);
}

const siteMetadata = read("apps/web/lib/site-metadata.ts");
assertIncludes("site metadata", siteMetadata, `SITE_DESCRIPTION =\n  ${JSON.stringify(expected.description)}`);
assertIncludes("site metadata", siteMetadata, 'SITE_LANGUAGE = "en-SG"');
assertIncludes("site metadata", siteMetadata, 'SITE_OG_LOCALE = "en_SG"');

const layout = read("apps/web/app/layout.tsx");
assertIncludes("Next layout", layout, "description: SITE_DESCRIPTION");
assertIncludes("Next layout", layout, "locale: SITE_OG_LOCALE");
assertIncludes("Next layout", layout, "<html lang={SITE_LANGUAGE}");

const pageMetadata = read("apps/web/components/public-pages/metadata.ts");
assertIncludes("page metadata", pageMetadata, "locale: SITE_OG_LOCALE");

const directMetadataFiles = [
  "apps/web/app/account/page.tsx",
  "apps/web/app/auth/page.tsx",
  "apps/web/app/gallery-submit/page.tsx",
  "apps/web/app/leader-dashboard/page.tsx",
];
for (const file of directMetadataFiles) {
  const source = read(file);
  assertIncludes(file, source, 'import { SITE_OG_LOCALE } from "@/lib/site-metadata"');
  assertIncludes(file, source, "locale: SITE_OG_LOCALE");
}

const homePage = read("apps/web/app/page.tsx");
assertIncludes("Next Home", homePage, "homeData.hero.subtitle");
assertIncludes("Next Home", homePage, 'id="home-structured-data"');
assertIncludes("Next Home", homePage, '"@type": "WebSite"');
assertIncludes("Next Home", homePage, '"@type": "Organization"');
assertIncludes("Next Home", homePage, 'sameAs: [SOCIAL_HOST]');
assertIncludes("Next Home", homePage, 'replace(/</g, "\\\\u003c")');

const homeScript = read("home.js");
assertIncludes("static Home renderer", homeScript, 'const subtitle = $("#homeSubtitle")');
assertIncludes("static Home renderer", homeScript, 'setText(subtitle, hero?.subtitle ?? "")');

const footerComponent = read("apps/web/components/SiteFooter.tsx");
const footerStatic = read("footer.html");
assertIncludes("Next footer", footerComponent, expected.footer);
assertIncludes("static footer", footerStatic, expected.footer);

const headerComponent = read("apps/web/components/SiteHeader.tsx");
const headerStatic = read("header.html");
const nextBrandLockup = `<span className="brand-text"> <span className="brand-name">Mōchirīī</span> <span className="brand-sub">${expected.brandSubtitle}</span>`;
const staticBrandLockup = `<span class="brand-text"> <span class="brand-name">Mōchirīī</span> <span class="brand-sub">${expected.brandSubtitle}</span>`;
assertCompactOccurrenceCount("Next header brand lockups", headerComponent, nextBrandLockup, 2);
assertCompactOccurrenceCount("Next footer brand lockup", footerComponent, nextBrandLockup, 1);
assertCompactOccurrenceCount("static header brand lockups", headerStatic, staticBrandLockup, 2);
assertCompactOccurrenceCount("static footer brand lockup", footerStatic, staticBrandLockup, 1);
assert(!headerComponent.includes("Where Winds Meet Guild"), "the Next header brand must use the concise regional label.");
assert(!headerStatic.includes("Where Winds Meet Guild"), "the static header brand must use the concise regional label.");

const scheduleHelper = read("apps/web/lib/guild-schedule.ts");
assertIncludes("schedule helper", scheduleHelper, 'new Intl.DateTimeFormat("en-SG"');
assertIncludes("schedule helper", scheduleHelper, "timeZone: scheduleIanaZone(schedule)");
assertIncludes("schedule helper", scheduleHelper, "schedule.timezone?.displayLabel || schedule.timezone?.label");
assertIncludes("schedule helper", scheduleHelper, "timezone,");

if (failures.length) {
  console.error("APAC content contract failed:\n");
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`APAC content contract passed for ${htmlFiles.length} static pages and the Next surface.`);
