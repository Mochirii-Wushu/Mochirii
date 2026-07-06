import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SITE_ORIGIN } from "./lib/public-urls.mjs";

const root = process.cwd();
const failures = [];
const notes = [];

const expectedEventTypes = [
  "monthly-gathering",
  "monthly-raffle",
  "guild-party",
  "breaking-army",
  "showdown",
  "guild-wars",
  "guild-heros-realm",
  "united-resolve",
];
const expectedManagedEventCount = 17;
const expectedGuildId = "1078630751077142608";

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function fail(message) {
  failures.push(message);
}

function note(message) {
  notes.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function assertIncludes(label, text, snippet) {
  assert(text.includes(snippet), `${label}: expected snippet not found: ${snippet}`);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeAssetPath(value) {
  return String(value || "").replace(/^\.?\//, "");
}

function localEventInstances(schedule) {
  const instances = [];
  const monthly = asObject(schedule.monthly);

  for (const value of Object.values(monthly)) {
    const item = asObject(value);
    const id = String(item.id || "");
    if (!id) continue;
    instances.push({
      key: id,
      typeId: id,
      title: String(item.title || ""),
      startTime: String(item.startTime || ""),
      endTime: String(item.endTime || ""),
      location: String(item.discordLocation || item.location || ""),
      cover: String(item.discordCoverImage || ""),
      recurrenceRule: item.discordRecurrenceRule || null,
      duplicateEventIds: asArray(item.discordDuplicateEventIds),
      canonicalEventId: item.discordEventId || null,
    });
  }

  for (const value of asArray(schedule.weekly)) {
    const item = asObject(value);
    if (item.discord !== true) continue;
    const id = String(item.id || "");
    for (const day of asArray(item.days)) {
      instances.push({
        key: `${id}-${day}`,
        typeId: id,
        title: String(item.title || ""),
        startTime: String(item.startTime || ""),
        endTime: String(item.endTime || ""),
        location: String(item.discordLocation || item.location || ""),
        cover: String(item.discordCoverImage || ""),
        recurrenceRule: null,
        duplicateEventIds: [],
        canonicalEventId: null,
      });
    }
  }

  return instances;
}

async function liveDiscordRead(scheduleInstances) {
  if (process.env.DISCORD_REAPER_PARITY_LIVE !== "1") {
    note("Live Discord read skipped; set DISCORD_REAPER_PARITY_LIVE=1 with a local bot token for read-only provider parity.");
    return;
  }

  const token = process.env.DISCORD_BOT_TOKEN || "";
  const guildId = process.env.DISCORD_GUILD_ID || expectedGuildId;
  if (!token) {
    fail("Live Discord read requested but DISCORD_BOT_TOKEN is missing from the local environment.");
    return;
  }

  const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/scheduled-events`, {
    headers: {
      Authorization: `Bot ${token}`,
      "User-Agent": `Mochirii-Reaper-ParityCheck/1.0 (${SITE_ORIGIN})`,
    },
  });

  if (!response.ok) {
    fail(`Live Discord scheduled event read failed with HTTP ${response.status}.`);
    return;
  }

  const events = await response.json();
  const activeEvents = asArray(events).filter((event) => [1, 2].includes(Number(event.status)));
  const expectedTitles = new Set(scheduleInstances.map((event) => event.title));
  const matching = activeEvents.filter((event) => expectedTitles.has(String(event.name || "")));
  const titleCounts = new Map();
  matching.forEach((event) => titleCounts.set(event.name, (titleCounts.get(event.name) || 0) + 1));

  for (const title of expectedTitles) {
    if (!matching.some((event) => event.name === title)) fail(`Live Discord read did not find scheduled event title: ${title}`);
  }

  const raffleCount = titleCounts.get("Monthly Guild Raffle") || 0;
  if (raffleCount !== 1) fail(`Expected exactly one live Monthly Guild Raffle, found ${raffleCount}.`);

  console.log(`Live Discord scheduled event read OK (${matching.length} matching active managed-title events; values redacted).`);
}

const schedule = readJson("data/guild-schedule.json");
const publicSchedule = readJson("apps/web/public/data/guild-schedule.json");
const reaper = read("supabase/functions/reaper-discord-interactions/index.ts");
const runbook = read("docs/reaper-event-sync-runbook.md");
const runtimeChecklist = read("docs/reaper-runtime-health-checklist.md");
const currentState = read("docs/current-live-state.md");

assert(JSON.stringify(schedule) === JSON.stringify(publicSchedule), "data/guild-schedule.json must match apps/web/public/data/guild-schedule.json.");
assert(schedule.timezone?.label === "UTC+8", "Guild schedule timezone label must remain UTC+8.");
assert(schedule.timezone?.offsetMinutes === 480, "Guild schedule offset must remain 480 minutes.");
assert(typeof schedule.discordCoverVersion === "string" && schedule.discordCoverVersion.length > 0, "Schedule must include a Discord cover cache-bust version.");

const instances = localEventInstances(schedule);
const typeIds = new Set(instances.map((event) => event.typeId));
assert(instances.length === expectedManagedEventCount, `Expected ${expectedManagedEventCount} managed Discord event instances, found ${instances.length}.`);
assert(typeIds.size === expectedEventTypes.length, `Expected ${expectedEventTypes.length} managed event types, found ${typeIds.size}.`);
expectedEventTypes.forEach((id) => assert(typeIds.has(id), `Missing managed event type: ${id}.`));

const keys = instances.map((event) => event.key);
assert(keys.length === new Set(keys).size, "Managed event instance keys must be unique.");

instances.forEach((event) => {
  assert(event.title, `${event.key}: title is required.`);
  assert(/^\d{2}:\d{2}$/.test(event.startTime), `${event.key}: startTime must be HH:mm.`);
  assert(/^\d{2}:\d{2}$/.test(event.endTime), `${event.key}: endTime must be HH:mm.`);
  assert(event.location, `${event.key}: location is required.`);
  assert(event.cover, `${event.key}: discordCoverImage is required.`);
  const coverPath = normalizeAssetPath(event.cover);
  assert(coverPath.startsWith("assets/img/discord-events/"), `${event.key}: cover must stay under assets/img/discord-events/.`);
  assert(existsSync(path.join(root, coverPath)), `${event.key}: root cover asset missing: ${coverPath}.`);
  assert(existsSync(path.join(root, "apps/web/public", coverPath)), `${event.key}: Next public cover asset missing: ${coverPath}.`);
});

const raffle = instances.find((event) => event.key === "monthly-raffle");
assert(raffle?.startTime === "21:30", "Monthly raffle must start at 21:30 UTC+8.");
assert(raffle?.endTime === "22:00", "Monthly raffle must end at 22:00 UTC+8.");
assert(raffle?.location === "Guild Base Pool", "Monthly raffle Discord location must stay Guild Base Pool.");
assert(raffle?.canonicalEventId === "1479507429598302268", "Monthly raffle canonical Discord event ID must stay recorded.");
assert(raffle?.duplicateEventIds?.includes("1513742240760070144"), "Monthly raffle duplicate event ID must stay explicitly listed until retired.");
assert(raffle?.recurrenceRule?.frequency === 1, "Monthly raffle recurrence frequency must be monthly.");
assert(raffle?.recurrenceRule?.interval === 1, "Monthly raffle recurrence interval must be 1.");
assert(raffle?.recurrenceRule?.by_n_weekday?.[0]?.n === 1, "Monthly raffle recurrence must target first weekday instance.");
assert(raffle?.recurrenceRule?.by_n_weekday?.[0]?.day === 5, "Monthly raffle recurrence must target Saturday in Discord's recurrence enum.");

[
  "MANAGE_EVENTS_PERMISSION",
  "CREATE_EVENTS_PERMISSION",
  "Retry-After",
  "retry_after",
  "managedBy: \"reaper-event-sync\"",
  "Duplicate scheduled event was removed",
  "Event sync preview. No Discord scheduled events were changed.",
  "Run /sync-events mode:apply confirm:true after reviewing preview.",
  "allowed_mentions",
  "parse: []",
].forEach((snippet) => assertIncludes("reaper event sync", reaper, snippet));

[
  "/sync-events mode:<preview|apply> confirm:<true|false>",
  "Preview first",
  "Do not run `apply` if preview shows duplicate creates",
  "Duplicate removal is intentionally limited to IDs listed in `discordDuplicateEventIds`.",
].forEach((snippet) => assertIncludes("event sync runbook", runbook, snippet));

[
  "Supabase Edge Function `reaper-discord-interactions` handles slash commands",
  "Reaper Gateway worker handles `guildMemberAdd` welcome DMs and, after the second release is approved, redacted pending-verification member-event forwarding.",
  "Server Members Intent",
  "Bot does not have `Administrator`.",
  "Discord signatures are validated before JSON parsing.",
  "Reaper manages 8 event types and 17 scheduled event instances.",
  "Last token rotation date, recorded as a date only.",
].forEach((snippet) => assertIncludes("reaper runtime checklist", runtimeChecklist, snippet));

[
  "Discord event schedule source is `data/guild-schedule.json`",
  "Event sync is preview-first",
  "owner-approved provider mutation",
].forEach((snippet) => assertIncludes("current live state", currentState, snippet));

await liveDiscordRead(instances);

if (failures.length) {
  console.error("Discord/Reaper parity validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

notes.forEach((message) => console.log(`NOTE ${message}`));
console.log(`Discord/Reaper parity validation OK (${instances.length} event instances, ${typeIds.size} event types).`);
