import { readFileSync } from "node:fs";
import path from "node:path";
import { readAppCss } from "./lib/app-css.mjs";
import { readPublicPageExport } from "./lib/public-page-source.mjs";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message) {
  failures.push(message);
}

function assertIncludes(label, source, snippet) {
  if (!source.includes(snippet)) fail(`${label}: missing ${snippet}`);
}

function assertNotIncludes(label, source, snippet) {
  if (source.includes(snippet)) fail(`${label}: unexpected ${snippet}`);
}

const eventsSource = readPublicPageExport(root, "EventsPage", failures).text;
const boardSource = read("apps/web/components/public-pages/EventsBoard.tsx");
const cssSource = readAppCss().replace(/\r\n/g, "\n");
const scheduleSource = read("apps/web/lib/guild-schedule.ts");
const schedule = JSON.parse(read("data/guild-schedule.json"));

if (!eventsSource) fail("EventsPage source block not found.");
assertIncludes("EventsPage", eventsSource, "websiteEventCardsFromSchedule(guildScheduleData)");
assertNotIncludes("EventsPage", eventsSource, "records(data.upcoming)");
assertNotIncludes("EventsPage", eventsSource, "eventBoardItemsFromSchedule");

assertIncludes("guild schedule helper", scheduleSource, "export function websiteEventCardsFromSchedule");
assertIncludes("guild schedule helper", scheduleSource, "image: item.discordCoverImage || \"\"");
assertIncludes("guild schedule helper", scheduleSource, "image: occurrence.discordCoverImage || \"\"");
assertIncludes("guild schedule helper", scheduleSource, "item.id === \"monthly-raffle\" ? \"/raffles\"");

assertIncludes("EventsBoard", boardSource, "parseIso(item.startIso)");
assertIncludes("EventsBoard", boardSource, "parseIso(item.endIso)");
assertIncludes("EventsBoard", boardSource, "item.timeText || item.time");
assertIncludes("EventsPage", eventsSource, "events-board-card");
assertIncludes("EventsBoard", boardSource, "aria-label=\"Event Board results\"");
assertIncludes("EventsBoard", boardSource, "tabIndex={0}");
assertIncludes("Events CSS", cssSource, "body[data-page=\"events\"] .events-board-card");
assertIncludes("Events CSS", cssSource, "box-sizing:border-box");
assertIncludes("Events CSS", cssSource, "max-height:clamp(560px, 74vh, 820px)");
assertIncludes("Events CSS", cssSource, "overflow-y:auto");
assertIncludes("Events CSS", cssSource, "overscroll-behavior:contain");
assertIncludes("Events CSS", cssSource, ".events-upcoming:focus-visible");
assertIncludes("Events CSS", cssSource, ".events-featured__img,\n.events-list__image{\n  display:block;\n  width:100%;\n  max-width:100%;\n  height:auto;");
assertIncludes("EventsPage", eventsSource, 'className="events-featured__img"');
assertIncludes("EventsBoard", boardSource, 'className="events-list__image"');
assertNotIncludes("EventsPage", eventsSource, "style={{ width: \"100%\", height: \"auto\"");
assertNotIncludes("EventsBoard", boardSource, "style={{ width: \"100%\", height: \"auto\"");

const monthlyEvents = Object.values(schedule.monthly || {});
const weeklyEvents = (schedule.weekly || []).filter((item) => item.discord === true);
const websiteEventCount = monthlyEvents.length + weeklyEvents.length;
if (websiteEventCount !== 8) fail(`expected 8 schedule-derived website event cards, received ${websiteEventCount}.`);

const coverImages = [...monthlyEvents, ...weeklyEvents].map((item) => String(item.discordCoverImage || ""));
for (const cover of coverImages) {
  if (!cover) fail("schedule-derived event card is missing discordCoverImage.");
  if (!cover.includes("/discord-events/")) fail(`schedule-derived event card must use a Discord cover image: ${cover}`);
  if (cover.includes("upcoming-01.webp")) fail("schedule-derived event card still uses stale upcoming-01.webp.");
}

if (new Set(coverImages).size !== coverImages.length) {
  fail("schedule-derived event cards must use unique Discord cover images.");
}

function parseTime(value) {
  const match = String(value || "00:00").match(/^(\d{2}):(\d{2})$/);
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : { hour: 0, minute: 0 };
}

function localToUtcIso(dateKey, time) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const { hour, minute } = parseTime(time);
  const offsetMinutes = Number(schedule.timezone?.offsetMinutes) || 480;
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes * 60 * 1000).toISOString();
}

function endDate(startDate, startTime, endTime) {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;
  if (endMinutes > startMinutes) return startDate;
  const [year, month, day] = startDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day) + 24 * 60 * 60 * 1000);
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

const heroRealm = weeklyEvents.find((item) => item.id === "guild-heros-realm");
const unitedResolve = weeklyEvents.find((item) => item.id === "united-resolve");
if (!heroRealm || !unitedResolve) {
  fail("Hero's Realm and United Resolve are required for Friday sort validation.");
} else {
  const friday = "2026-06-12";
  const heroStart = localToUtcIso(friday, heroRealm.startTime);
  const unitedStart = localToUtcIso(friday, unitedResolve.startTime);
  const unitedEnd = localToUtcIso(endDate(friday, unitedResolve.startTime, unitedResolve.endTime), unitedResolve.endTime);

  if (!(heroStart < unitedStart)) fail("Friday events must sort by startIso, with Hero's Realm before United Resolve.");
  if (unitedEnd !== "2026-06-12T16:00:00.000Z") {
    fail(`United Resolve midnight-crossing endIso mismatch: ${unitedEnd}`);
  }
}

if (failures.length) {
  console.error("Events page schedule sync validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Events page schedule sync validation OK.");
