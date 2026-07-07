import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  packageJson: "package.json",
  checkAll: "scripts/check-all.mjs",
  agents: "AGENTS.md",
  config: "supabase/config.toml",
  envExample: "supabase/functions/.env.example",
  migration: "supabase/migrations/20260609090000_add_discord_vote_reminders.sql",
  helper: "supabase/functions/_shared/vote-reminders.ts",
  helperTest: "supabase/functions/_shared/vote-reminders_test.ts",
  sender: "supabase/functions/send-vote-reminder/index.ts",
  senderImportMap: "supabase/functions/send-vote-reminder/deno.json",
  reaper: "supabase/functions/reaper-discord-interactions/index.ts",
  interactionHelpers: "supabase/functions/_shared/discord-interaction-helpers.ts",
  reaperVoteInteractions: "supabase/functions/_shared/reaper-vote-interactions.ts",
  readme: "supabase/README.md",
  runbook: "docs/vote-reminder-runbook.md",
  skill: ".agents/skills/discord-vote-reminder/SKILL.md",
};

const failures = [];

function read(file) {
  const fullPath = path.join(root, file);
  if (!existsSync(fullPath)) {
    failures.push(`${file}: missing required vote reminder file.`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) failures.push(`${label}: expected snippet not found: ${snippet}`);
}

function assertMatches(label, text, pattern, message) {
  if (!pattern.test(text)) failures.push(`${label}: ${message}`);
}

function assertNotMatches(label, text, pattern, message) {
  if (pattern.test(text)) failures.push(`${label}: ${message}`);
}

const packageJson = read(files.packageJson);
const checkAll = read(files.checkAll);
const agents = read(files.agents);
const config = read(files.config);
const envExample = read(files.envExample);
const migration = read(files.migration);
const helper = read(files.helper);
const helperTest = read(files.helperTest);
const sender = read(files.sender);
const senderImportMap = read(files.senderImportMap);
const reaper = [read(files.reaper), read(files.interactionHelpers), read(files.reaperVoteInteractions)].join("\n");
const readme = read(files.readme);
const runbook = read(files.runbook);
const skill = read(files.skill);

[
  '"check:vote-reminder"',
  '"test:vote-reminder"',
].forEach((snippet) => assertIncludes("package.json", packageJson, snippet));
assertIncludes("check-all", checkAll, "check:vote-reminder");

[
  "[functions.send-vote-reminder]",
  "verify_jwt = false",
  'import_map = "./functions/send-vote-reminder/deno.json"',
  'entrypoint = "./functions/send-vote-reminder/index.ts"',
].forEach((snippet) => assertIncludes("supabase config", config, snippet));

[
  '"@supabase/functions-js/edge-runtime.d.ts": "jsr:@supabase/functions-js/edge-runtime.d.ts"',
  '"@supabase/supabase-js": "npm:@supabase/supabase-js@2"',
].forEach((snippet) => assertIncludes("send-vote-reminder import map", senderImportMap, snippet));

[
  "DISCORD_VOTE_CHANNEL_ID=1082802012095266866",
  "VOTE_REMINDER_TIME_ZONE=America/Los_Angeles",
  "VOTE_REMINDER_CRON_SECRET=",
  "DISCORD_VOTE_LINKS_JSON",
].forEach((snippet) => assertIncludes("supabase functions .env.example", envExample, snippet));

[
  "create table if not exists public.vote_confirmations",
  "create table if not exists public.vote_reminder_sends",
  "constraint vote_confirmations_user_date_key unique (discord_user_id, vote_date)",
  "discord_channel_id = '1082802012095266866'",
  "grant all on table public.vote_confirmations to service_role",
  "grant all on table public.vote_reminder_sends to service_role",
  "revoke all on table public.vote_confirmations from anon",
  "revoke all on table public.vote_reminder_sends from authenticated",
  "manual-vote-reminder",
  "'text_channel'",
].forEach((snippet) => assertIncludes("vote reminder migration", migration, snippet));

assertNotMatches(
  "vote reminder migration",
  migration,
  /grant\s+(select|insert|update|delete|all)[\s\S]+public\.vote_(confirmations|reminder_sends)[\s\S]+to\s+(anon|authenticated)/i,
  "vote tables must not grant browser roles direct access.",
);

[
  'export const EXPECTED_DISCORD_VOTE_CHANNEL_ID = "1082802012095266866";',
  'export const VOTE_LINKS_MARKER = "[vote-links]";',
  'export const VOTE_DONE_CUSTOM_ID_PREFIX = "vote_done:";',
  "export function parseVoteLinksFromText",
  "export function parseVoteLinksJson",
  "export function currentStreak",
  "allowed_mentions",
  "custom_id: customIdForVoteDate(voteDate)",
].forEach((snippet) => assertIncludes("vote reminder helper", helper, snippet));

[
  "parseVoteLinksFromText reads marked markdown and plain HTTPS links",
  "parseVoteLinksJson accepts configured link arrays",
  "currentStreak counts backward from today",
].forEach((snippet) => assertIncludes("vote reminder tests", helperTest, snippet));

[
  "VOTE_REMINDER_CRON_SECRET",
  "x-mochirii-vote-reminder-secret",
  "DISCORD_VOTE_CHANNEL_ID",
  "EXPECTED_DISCORD_VOTE_CHANNEL_ID",
  "loadVoteLinks",
  "buildVoteReminderPayload",
  "vote_reminder_sends",
  "status: \"pending\"",
  "duplicate: true",
].forEach((snippet) => assertIncludes("send-vote-reminder", sender, snippet));

[
  "INTERACTION_TYPE_MESSAGE_COMPONENT",
  "voteDateFromCustomId",
  "recordVoteConfirmation",
  "vote_confirmations",
  "vote-status",
  "vote-leaderboard",
  "vote-reminder-preview",
  "allowed_mentions",
  "voteReminderPreviewMessage",
].forEach((snippet) => assertIncludes("reaper-discord-interactions", reaper, snippet));

assertMatches(
  "reaper-discord-interactions",
  reaper,
  /const rawBody = await req\.text\(\);[\s\S]*verifyDiscordSignature\(req, rawBody, publicKey\)[\s\S]*JSON\.parse\(rawBody\)/,
  "Discord signature must still be verified against the raw body before JSON parsing.",
);

assertNotMatches(
  "vote reminder source files",
  [sender, reaper, helper].join("\n"),
  /(puppeteer|playwright|chromium|captcha|upvote.*fetch|document\.querySelector|\.click\()/i,
  "vote reminder code must not automate browser voting or CAPTCHA/vote-site interactions.",
);

[
  "docs/vote-reminder-runbook.md",
  "Never automate third-party upvotes",
  "manual `Done voting` confirmations",
  "Discord bot tokens",
].forEach((snippet) => assertIncludes("AGENTS.md", agents, snippet));

[
  "Discord Vote Reminder Runbook",
  "never automate third-party upvotes",
  "Guild: 1078630751077142608",
  "Vote channel: 1082802012095266866",
  "DISCORD_VOTE_LINKS_JSON",
  "/vote-reminder-preview",
  "npm run check:vote-reminder",
  "Supabase scheduled Edge Functions",
].forEach((snippet) => assertIncludes("vote reminder runbook", runbook, snippet));

[
  "send-vote-reminder",
  "vote_confirmations",
  "vote_reminder_sends",
  "DISCORD_VOTE_CHANNEL_ID=1082802012095266866",
  "supabase functions deploy send-vote-reminder",
  "/vote-status",
  "/vote-leaderboard",
  "/vote-reminder-preview",
].forEach((snippet) => assertIncludes("supabase README", readme, snippet));

[
  "Discord Vote Reminder",
  "Never automate third-party upvotes",
  "docs/vote-reminder-runbook.md",
  "npm run check:vote-reminder",
].forEach((snippet) => assertIncludes("repo-local skill", skill, snippet));

if (failures.length) {
  console.error("Vote reminder validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Vote reminder validation OK.");
